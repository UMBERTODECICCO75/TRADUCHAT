import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { freshIncoming, playMessageBeep, soundPreferenceKey } from "@/lib/message-beep";
import { requestMessageNotices, shouldShowMessageNotice, showMessageNotice, type BrowserNoticeStatus } from "@/lib/browser-message-notifications";

export function useMessageBeep(userId: string | null) {
  const [enabled, setEnabled] = useState(false);
  const enabledRef = useRef(false);
  const audio = useRef<AudioContext | null>(null);
  const [browserStatus, setBrowserStatus] = useState<BrowserNoticeStatus>("idle");
  const closeNotice = useRef<(() => void) | undefined>(undefined);
  const identity = useRef(userId);
  identity.current = userId;

  function unlock() {
    try {
      audio.current ??= new AudioContext();
      if (audio.current.state === "suspended") void audio.current.resume().catch(() => {});
    } catch { /* Browsers without Web Audio remain silent. */ }
  }

  function toggle(value: boolean) {
    if (!userId) return;
    enabledRef.current = value;
    setEnabled(value);
    try { localStorage.setItem(soundPreferenceKey(userId), String(value)); } catch { /* Storage may be unavailable. */ }
    if (value) {
      unlock();
      void requestMessageNotices().then(status => {
        if (identity.current === userId && enabledRef.current) setBrowserStatus(status);
      });
    } else { closeNotice.current?.(); closeNotice.current = undefined; setBrowserStatus("idle"); }
  }

  useEffect(() => {
    enabledRef.current = false;
    setEnabled(false);
    closeNotice.current?.(); closeNotice.current = undefined;
    setBrowserStatus("idle");
    if (!userId) return;
    try {
      const saved = localStorage.getItem(soundPreferenceKey(userId)) === "true";
      enabledRef.current = saved;
      setEnabled(saved);
      if (saved && "Notification" in window && Notification.permission === "granted") setBrowserStatus("granted");
    } catch { /* Off by default. */ }
    const onInteraction = () => { if (enabledRef.current) unlock(); };
    window.addEventListener("pointerdown", onInteraction);
    window.addEventListener("keydown", onInteraction);
    let active = true;
    let pending = false;
    const since = Date.now();
    const seen = new Set<string>();
    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        const sources = ["chat_messages", "chat_photos", "camera_translations"] as const;
        const results = await Promise.all(sources.map(source => supabase.from(source)
          .select("id, sender_id, recipient_id, created_at").eq("recipient_id", userId)
          .gt("created_at", new Date(since).toISOString())));
        if (!active) return;
        let count = 0;
        results.forEach((result, i) => {
          const source = sources[i];
          if (source && !result.error) count += freshIncoming(result.data ?? [], userId, since, seen, source);
        });
        if (count > 0 && enabledRef.current) {
          if (audio.current) playMessageBeep(audio.current);
          const allowed = () => active && identity.current === userId && "Notification" in window &&
            shouldShowMessageNotice(enabledRef.current, document.visibilityState, Notification.permission);
          if (allowed()) {
            const close = await showMessageNotice(allowed);
            if (!allowed()) close?.();
            else { closeNotice.current = close; }
          }
        }
      } catch { /* Retry on the next poll without showing a configuration error. */ }
      finally { pending = false; }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("keydown", onInteraction);
      closeNotice.current?.(); closeNotice.current = undefined;
    };
  }, [userId]);

  useEffect(() => () => { void audio.current?.close().catch(() => {}); audio.current = null; }, []);
  return { enabled, toggle, browserStatus };
}