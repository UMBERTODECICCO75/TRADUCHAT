/**
 * Browser alerts (notification + short beep) for incoming chat messages
 * while the app is open. No server push involved.
 */

export type AlertPermission = "unsupported" | "iframe" | "default" | "granted" | "denied";

const STORAGE_KEY = "traduchat.alerts.enabled";

export function alertsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function setAlertsEnabled(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
}

export function alertPermission(): AlertPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  // Browsers silently reject the prompt inside a cross-origin preview frame.
  if (window.top !== window.self) return "iframe";
  return "default";
}

/** Must be called from a click handler: browsers ignore prompts without a gesture. */
export async function requestAlertPermission(): Promise<AlertPermission> {
  const state = alertPermission();
  if (state !== "default") return state;
  try {
    const result = await Notification.requestPermission();
    return result === "granted" ? "granted" : result === "denied" ? "denied" : "default";
  } catch {
    return "iframe";
  }
}

let audioCtx: AudioContext | null = null;

/** Unlock audio on a real user gesture without asking for notification permission. */
export function unlockAlertAudio(): void {
  if (typeof window === "undefined") return;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return;
  try { audioCtx ??= new Ctor(); void audioCtx.resume().catch(() => undefined); } catch { /* optional audio */ }
}

/** Short soft beep, built in code so there is no audio file to load. */
export function playBeep(): void {
  if (typeof window === "undefined") return;
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx ??= new Ctor();
    void audioCtx.resume().catch(() => undefined);
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1180, now + 0.09);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Audio is a nice-to-have; never break the chat over it.
  }
}

export function showMessageNotification(title: string, body: string): void {
  if (alertPermission() !== "granted") return;
  try {
    const n = new Notification(title, { body, tag: "traduchat-message", icon: "/favicon.ico" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some browsers require a service worker; the beep still fires.
  }
}
