import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Phone, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listHomeMessages, type HomeMessage } from "@/lib/rooms.functions";
import { isRingingFor, markRoomRead, unseenMessages } from "@/lib/open-app-alerts";
import { playBeep, unlockAlertAudio } from "@/lib/message-alerts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { VideoCall } from "@/lib/video-calls";
import { getIncomingVideoCall } from "@/lib/video-calls.functions";

export function OpenAppAlerts({ me }: { me: string }) {
  const loadMessages = useServerFn(listHomeMessages);
  const loadIncoming = useServerFn(getIncomingVideoCall);
  const { pathname } = useLocation();
  const [messages, setMessages] = useState<HomeMessage[]>([]);
  const [read, setRead] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [incoming, setIncoming] = useState<(VideoCall & { code: string }) | null>(null);
  const key = `traduchat:message-read:${me}`;
  const previousCall = useRef<string | null>(null);

  useEffect(() => { setNotificationsOpen(false); }, [pathname]);

  useEffect(() => {
    try { setRead(JSON.parse(localStorage.getItem(key) ?? "{}")); } catch { setRead({}); }
    setSound(localStorage.getItem("traduchat:call-sound") !== "0");
    setReady(true);
    const unlock = () => unlockAlertAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, [key]);

  useEffect(() => {
    let active = true;
    let checking = false;
    let loadingMessages = false;
    const refreshMessages = async () => {
      if (loadingMessages) return;
      loadingMessages = true;
      try { const result = await loadMessages({ data: undefined }); if (active) setMessages(result.messages); } catch { /* retain last successful inbox */ }
      finally { loadingMessages = false; }
    };
    const refreshCalls = async () => {
      if (checking) return;
      checking = true;
      try {
        const call = await loadIncoming({ data: undefined });
        if (active) setIncoming(call && isRingingFor(call, me) ? call : null);
      } catch { /* next poll recovers temporary failures */ }
      finally { checking = false; }
    };
    void refreshMessages(); void refreshCalls();
    const channel = supabase.channel(`open-app-alerts-${me}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_messages" }, () => void refreshMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_hidden_messages", filter: `user_id=eq.${me}` }, () => void refreshMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "room_members", filter: `user_id=eq.${me}` }, () => void refreshMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "video_calls", filter: `callee_id=eq.${me}` }, () => void refreshCalls())
      .subscribe();
    const timer = window.setInterval(() => { void refreshCalls(); }, 2000);
    const inboxTimer = window.setInterval(() => { void refreshMessages(); }, 10000);
    const focus = () => { void refreshMessages(); void refreshCalls(); };
    window.addEventListener("focus", focus);
    return () => { active = false; window.clearInterval(timer); window.clearInterval(inboxTimer); window.removeEventListener("focus", focus); void supabase.removeChannel(channel); };
  }, [loadMessages, loadIncoming, me]);

  useEffect(() => {
    if (!ready) return;
    const code = pathname.startsWith("/stanza/") ? decodeURIComponent(pathname.split("/")[2] ?? "") : "";
    if (!code) return;
    setRead((current) => {
      const next = markRoomRead(messages, current, code);
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [pathname, messages, ready, key]);

  const ringingId = incoming?.id ?? null;
  useEffect(() => {
    if (!ringingId || !sound) { previousCall.current = null; return; }
    if (previousCall.current !== ringingId) { playBeep(); previousCall.current = ringingId; }
    const timer = window.setInterval(playBeep, 1800);
    return () => window.clearInterval(timer);
  }, [ringingId, sound]);

  const unseen = ready ? unseenMessages(messages, read) : [];
  return <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border px-4 py-2">
    {incoming && <div role="alert" className="mr-auto flex min-w-0 flex-wrap items-center gap-2 text-sm">
      <Phone className="size-4 text-primary" /><span>Videochiamata in arrivo</span>
      <Button asChild size="sm"><Link to="/stanza/$code" params={{ code: incoming.code }}>Apri chiamata</Link></Button>
    </div>}
    <Button variant="ghost" size="icon" aria-label={sound ? "Disattiva squillo bip" : "Attiva squillo bip"} title={sound ? "Disattiva squillo bip" : "Attiva squillo bip"} onClick={() => {
      const next = !sound; setSound(next); localStorage.setItem("traduchat:call-sound", next ? "1" : "0"); if (next) playBeep();
    }}>{sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</Button>
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}><PopoverTrigger asChild>
      <Button variant="outline" size="icon" className="relative" aria-label={`Notifiche: ${unseen.length} nuovi messaggi recenti`} title="Notifiche messaggi">
        <Bell className="size-5" />
        {unseen.length > 0 && <span translate="no" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold leading-none text-destructive-foreground">{unseen.length}</span>}
      </Button>
    </PopoverTrigger><PopoverContent align="end" className="max-h-96 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
      <h2 className="mb-2 font-semibold">Nuovi messaggi recenti</h2>
      {unseen.length === 0 ? <p className="text-sm text-muted-foreground">Nessun nuovo messaggio</p> : unseen.map((message) => <Link key={message.id} to="/stanza/$code" params={{ code: message.roomCode }} className="block border-t border-border py-3 text-sm">
        <span translate="no" className="block truncate font-semibold">{message.senderName}</span><span translate="no" className="line-clamp-2 break-words text-muted-foreground">{message.text}</span>
      </Link>)}
    </PopoverContent></Popover>
  </div>;
}