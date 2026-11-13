export type VideoCall = {
  id: string;
  room_id: string;
  caller_id: string;
  callee_id: string;
  caller_device: string;
  callee_device: string | null;
  status: "ringing" | "active" | "ended";
  created_at: string;
};
export type CallUpdate = { call: VideoCall | null; events: { id: number; payload: string }[] };

export function ownsCallDevice(call: VideoCall, me: string, device: string) {
  return (call.caller_id === me && call.caller_device === device) ||
    (call.callee_id === me && call.callee_device === device);
}

export function stopCallMedia(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Silences only received call playback, not the microphone or voice notes. */
export function setCallPlaybackMuted(video: HTMLMediaElement | null, muted: boolean) {
  if (video) video.muted = muted;
}

/** Local feedback, independent of received call audio and voice-note playback. */
export async function playCallMuteBeep(createContext: () => AudioContext = () => {
  const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Audio();
}) {
  let context: AudioContext | undefined;
  try {
    context = createContext();
    if (context.state === "suspended") await context.resume();
    const tone = context.createOscillator();
    const volume = context.createGain();
    const now = context.currentTime;
    tone.frequency.setValueAtTime(880, now);
    volume.gain.setValueAtTime(0, now);
    volume.gain.linearRampToValueAtTime(0.08, now + 0.01);
    volume.gain.linearRampToValueAtTime(0, now + 0.12);
    tone.connect(volume);
    volume.connect(context.destination);
    const activeContext = context;
    tone.onended = () => { tone.disconnect(); volume.disconnect(); void activeContext.close().catch(() => undefined); };
    tone.start(now);
    tone.stop(now + 0.13);
  } catch {
    // A blocked sound must never prevent the listening toggle.
    if (context) await context.close().catch(() => undefined);
  }
}

export type CallFullMode = "native" | "overlay" | null;

/**
 * Dove mostrare la videochiamata a schermo intero: il fullscreen del browser
 * quando l'elemento può richiederlo (desktop e Android), altrimenti una
 * sovrapposizione a tutta pagina, perché iOS Safari non consente il fullscreen
 * di un elemento qualsiasi.
 */
export function nextCallFullMode(current: CallFullMode, canRequestNative: boolean): CallFullMode {
  if (current) return null;
  return canRequestNative ? "native" : "overlay";
}