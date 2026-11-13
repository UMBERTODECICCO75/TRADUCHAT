import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type Peer from "simple-peer";
import { Camera, CameraOff, Loader2, Maximize, Minimize, PhoneOff, Users, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactMicButton } from "@/components/ContactMicButton";
import { getGroupIceServers, updateGroupVideoCall } from "@/lib/group-video-calls.functions";
import { initiatesGroupPeer, ownsGroupDevice, type GroupUpdate } from "@/lib/group-video-calls";
import { playCallMuteBeep, stopCallMedia } from "@/lib/video-calls";
import { useRoomTopOffset } from "@/lib/useRoomTopOffset";
import { LANGUAGES } from "@/lib/languages";
import { getPreferredLanguage } from "@/lib/preferred-language";

type Props = { roomId: string; roomCode: string; langA: string; langB: string; me: string; participants: { userId: string; name: string }[] };
type Edge = { peer: Peer.Instance; device: string };
const empty: GroupUpdate = { call: null, members: [], events: [] };

function VideoTile({ media, name, muted }: { media: MediaStream | null; name: string; muted: boolean }) {
  const node = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    if (!node.current) return;
    node.current.srcObject = media; node.current.muted = muted;
    if (media) void node.current.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  }, [media, muted]);
  return <div className="relative aspect-video min-w-0 overflow-hidden rounded-lg bg-demo-stage">
    <video ref={node} aria-label={`Video di ${name}`} autoPlay playsInline muted={muted} className="h-full w-full object-contain" />
    {!media && <span className="absolute inset-0 flex items-center justify-center text-xs text-demo-foreground">Collegamento…</span>}
    <span translate="no" className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-demo-caption/90 px-2 py-1 text-xs text-demo-foreground">{name}</span>
    {blocked && !muted && <Button variant="secondary" size="sm" className="absolute right-1 top-1" onClick={() => void node.current?.play().then(() => setBlocked(false))}><Volume2 className="size-4" />Attiva audio</Button>}
  </div>;
}

export function GroupVideoCall({ roomId, roomCode, langA, langB, me, participants }: Props) {
  const update = useServerFn(updateGroupVideoCall); const getIce = useServerFn(getGroupIceServers);
  const [state, setState] = useState<GroupUpdate>(empty); const current = useRef(empty);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [local, setLocal] = useState<MediaStream | null>(null); const stream = useRef<MediaStream | null>(null);
  const [remotes, setRemotes] = useState<Record<string, MediaStream>>({});
  const [muted, setMuted] = useState(false); const [camera, setCamera] = useState(true); const [full, setFull] = useState(false);
  const device = useRef(""); const after = useRef(0); const alive = useRef(true); const generation = useRef(0);
  const peers = useRef(new Map<string, Edge>()); const pending = useRef<GroupUpdate["events"]>([]);
  const configuring = useRef(false); const revision = useRef(0); const [retry, setRetry] = useState(0);
  // Spoken language for voice messages sent from the call; any supported
  // language works in a group, defaulting to the preferred one.
  const [micLang, setMicLang] = useState(() => getPreferredLanguage() ?? langA);
  useRoomTopOffset();
  const mine = ownsGroupDevice(state.members, me, device.current);
  const joinedElsewhere = state.members.some((member) => member.user_id === me) && !mine;

  const cleanup = useCallback(() => {
    generation.current++; configuring.current = false;
    for (const edge of peers.current.values()) edge.peer.destroy();
    peers.current.clear(); pending.current = []; after.current = 0;
    stopCallMedia(stream.current); stream.current = null;
    if (alive.current) { setLocal(null); setRemotes({}); setFull(false); setMuted(false); setCamera(true); }
  }, []);

  const leave = useCallback(async () => {
    const call = current.current.call; cleanup();
    current.current = empty; if (alive.current) setState(empty);
    if (!call) return;
    try { await update({ data: { roomId, callId: call.id, device: device.current, action: "leave" } }); }
    catch { if (alive.current) setError("Chiamata chiusa sul dispositivo; sincronizzazione non disponibile."); }
  }, [cleanup, roomId, update]);

  const apply = useCallback((result: GroupUpdate) => {
    if (!alive.current) return;
    if (current.current.call?.id !== result.call?.id) { if (current.current.call) cleanup(); after.current = 0; pending.current = []; }
    current.current = result; setState(result); revision.current++;
    if (!result.call || !ownsGroupDevice(result.members, me, device.current)) {
      if (stream.current) cleanup(); return;
    }
    for (const [id, edge] of peers.current) {
      if (!result.members.some((member) => member.user_id === id && member.device === edge.device)) {
        peers.current.delete(id); edge.peer.destroy();
        setRemotes((old) => { const next = { ...old }; delete next[id]; return next; });
      }
    }
    for (const event of result.events) {
      if (event.id <= after.current) continue; after.current = event.id;
      const edge = peers.current.get(event.sender_id);
      if (edge) { try { edge.peer.signal(JSON.parse(event.payload)); } catch { setError("Collegamento interrotto. Esci e rientra nella chiamata."); } }
      else pending.current.push(event);
    }
  }, [cleanup, me]);

  useEffect(() => {
    alive.current = true; device.current = crypto.randomUUID(); let running = false; let stopped = false;
    const poll = async () => {
      if (running || stopped) return; running = true;
      const version = revision.current;
      try {
        const value = current.current;
        const result = await update({ data: { roomId, device: device.current, action: ownsGroupDevice(value.members, me, device.current) ? "heartbeat" : "poll", callId: value.call?.id, after: after.current } });
        if (!stopped && version === revision.current) apply(result);
      } catch (reason) {
        if (!stopped) { setError(reason instanceof Error ? reason.message : "Connessione interrotta."); if (reason instanceof Error && reason.message.includes("Crediti esauriti")) void leave(); }
      } finally { running = false; }
    };
    void poll(); const timer = window.setInterval(() => void poll(), 2000);
    const pagehide = () => { if (stream.current) void leave(); };
    window.addEventListener("pagehide", pagehide);
    return () => {
      stopped = true; alive.current = false; window.clearInterval(timer); window.removeEventListener("pagehide", pagehide);
      const value = current.current;
      if (value.call && ownsGroupDevice(value.members, me, device.current)) void update({ data: { roomId, device: device.current, callId: value.call.id, action: "leave" } }).catch(() => undefined);
      cleanup(); current.current = empty;
    };
  }, [apply, cleanup, leave, me, roomId, update]);

  async function begin() {
    if (busy) return; setBusy(true); setError(""); revision.current++;
    const token = generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: { width: { ideal: 640 }, height: { ideal: 480 } } });
      if (!alive.current || token !== generation.current) { stopCallMedia(media); return; }
      stream.current = media; setLocal(media);
      const result = await update({ data: { roomId, device: device.current, action: current.current.call ? "join" : "start", callId: current.current.call?.id } });
      if (!alive.current || token !== generation.current) { if (result.call) void update({ data: { roomId, device: device.current, action: "leave", callId: result.call.id } }); return; }
      apply(result);
    } catch (reason) { cleanup(); setError(reason instanceof DOMException ? "Consenti l’accesso a fotocamera e microfono." : reason instanceof Error ? reason.message : "Chiamata non disponibile."); }
    finally { if (alive.current) setBusy(false); }
  }

  useEffect(() => {
    if (!mine || !state.call || !stream.current || configuring.current) return;
    const missing = state.members.filter((member) => member.user_id !== me && !peers.current.has(member.user_id));
    if (!missing.length) return;
    configuring.current = true; const token = generation.current; const callId = state.call.id;
    void (async () => {
      try {
        const [config, module] = await Promise.all([getIce({ data: { roomId, callId, device: device.current } }), import("simple-peer/simplepeer.min.js")]);
        if (!alive.current || token !== generation.current || !stream.current || current.current.call?.id !== callId) return;
        for (const member of current.current.members) {
          if (member.user_id === me || peers.current.has(member.user_id)) continue;
          const peer = new module.default({ initiator: initiatesGroupPeer(me, member.user_id), stream: stream.current, trickle: true, config });
          const edge = { peer, device: member.device }; peers.current.set(member.user_id, edge);
          let chain = Promise.resolve();
          peer.on("signal", (payload: Peer.SignalData) => {
            chain = chain.then(async () => {
              if (peers.current.get(member.user_id) !== edge || peer.destroyed) return;
              await update({ data: { roomId, device: device.current, action: "signal", callId, target: member.user_id, payload: payload as unknown as Record<string, unknown> } });
            }).catch(() => { if (alive.current) setError("Collegamento interrotto. Esci e rientra nella chiamata."); });
          });
          peer.on("stream", (media: MediaStream) => { if (alive.current && peers.current.get(member.user_id) === edge) setRemotes((old) => ({ ...old, [member.user_id]: media })); });
          peer.on("error", () => { if (alive.current && peers.current.get(member.user_id) === edge) setError("Un partecipante non è raggiungibile. Esci e rientra per riprovare."); });
          const queued = pending.current.filter((event) => event.sender_id === member.user_id);
          pending.current = pending.current.filter((event) => event.sender_id !== member.user_id);
          for (const event of queued) peer.signal(JSON.parse(event.payload));
        }
      } catch (reason) { if (alive.current && token === generation.current) { setError(reason instanceof Error ? reason.message : "Collegamento non disponibile."); void leave(); } }
      finally { if (token === generation.current) { configuring.current = false; setRetry((n) => n + 1); } }
    })();
  }, [getIce, leave, me, mine, retry, roomId, state.call, state.members, update]);

  useEffect(() => {
    if (!full) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFull(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [full]);

  return <section id="videochiamata" aria-label="Videochiamata di gruppo" className="my-2 shrink-0 border-y border-border py-2">
    {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
    {!mine ? <div className="flex flex-wrap items-center gap-2">
      <Users className="size-4 text-primary" /><span className="text-sm">Videochiamata di gruppo{state.call ? ` · ${state.members.length}/6` : ""}</span>
      <Button size="sm" disabled={busy || joinedElsewhere || participants.length < 2 || Boolean(state.call && state.members.length >= 6)} onClick={() => void begin()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}{state.call ? "Partecipa" : "Chiama il gruppo"}</Button>
      {joinedElsewhere && <span className="text-xs text-muted-foreground">Chiamata aperta su un altro dispositivo</span>}
    </div> : <div className={full ? "fixed inset-0 z-50 flex h-dvh flex-col gap-3 overflow-y-auto bg-background p-3" : "space-y-2"}>
      <div role="status" className="flex items-center gap-2 text-sm"><Users className="size-4 text-primary" />Videochiamata di gruppo · {state.members.length}/6{state.members.length === 1 && <span className="text-xs text-muted-foreground">In attesa dei partecipanti…</span>}</div>
      <div className={full ? "grid flex-1 content-center grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" : "grid grid-cols-2 gap-2 sm:grid-cols-3"}>
        <VideoTile media={local} name="Tu" muted />
        {state.members.filter((member) => member.user_id !== me).map((member) => <VideoTile key={`${member.user_id}:${member.device}`} media={remotes[member.user_id] ?? null} name={participants.find((person) => person.userId === member.user_id)?.name ?? "Partecipante"} muted={muted} />)}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="icon" aria-label={camera ? "Disattiva fotocamera" : "Attiva fotocamera"} title={camera ? "Disattiva fotocamera" : "Attiva fotocamera"} onClick={() => { const enabled = !camera; stream.current?.getVideoTracks().forEach((track) => { track.enabled = enabled; }); setCamera(enabled); }}>{camera ? <Camera className="size-4" /> : <CameraOff className="size-4" />}</Button>
        <Button variant={muted ? "secondary" : "outline"} size="icon" aria-pressed={muted} aria-label={muted ? "Riattiva audio della chiamata" : "Silenzia audio della chiamata"} title="Audio della chiamata" onClick={() => { void playCallMuteBeep(); setMuted((value) => !value); }}>{muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</Button>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Parlo in
          <select
            aria-label="Lingua parlata nei vocali del gruppo"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            value={micLang}
            onChange={(event) => setMicLang(event.target.value)}
          >
            {LANGUAGES.map((language) => <option key={language} value={language}>{language}</option>)}
          </select>
        </label>
        <ContactMicButton name="il gruppo" roomCode={roomCode} langA={langA} langB={langB} direct fromLang={micLang} />
        <Button variant="outline" size="icon" aria-label={full ? "Riduci la videochiamata" : "Schermo intero"} title={full ? "Riduci la videochiamata" : "Schermo intero"} onClick={() => setFull((value) => !value)}>{full ? <Minimize className="size-4" /> : <Maximize className="size-4" />}</Button>
        <Button variant="destructive" onClick={() => void leave()}><PhoneOff className="size-4" />{state.call?.caller_id === me ? "Termina per tutti" : "Esci dalla chiamata"}</Button>
      </div>
    </div>}
  </section>;
}