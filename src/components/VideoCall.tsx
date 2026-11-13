import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type Peer from "simple-peer";
import { Camera, CameraOff, Loader2, Maximize, Minimize, Phone, PhoneOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactMicButton } from "@/components/ContactMicButton";
import { supabase } from "@/integrations/supabase/client";
import { getVideoIceServers, updateVideoCall } from "@/lib/video-calls.functions";
import { useRoomTopOffset } from "@/lib/useRoomTopOffset";
import { nextCallFullMode, ownsCallDevice, playCallMuteBeep, setCallPlaybackMuted, stopCallMedia, type CallFullMode, type VideoCall as Call, type CallUpdate } from "@/lib/video-calls";

type Props = { roomId: string; roomCode: string; langA: string; langB: string; me: string; participants: { userId: string; name: string }[] };

export function VideoCall({ roomId, roomCode, langA, langB, me, participants }: Props) {
  const update = useServerFn(updateVideoCall);
  const ice = useServerFn(getVideoIceServers);
  const [call, setCall] = useState<Call | null>(null);
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState("Collegamento…");
  const [cameraOn, setCameraOn] = useState(true);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [callAudioMuted, setCallAudioMuted] = useState(false);
  const callAudioMutedRef = useRef(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [fullMode, setFullMode] = useState<CallFullMode>(null);
  const [cameraHidden, setCameraHidden] = useState(false);
  const previewAsked = useRef(false);
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const peer = useRef<Peer.Instance | null>(null);
  const callRef = useRef<Call | null>(null);
  const device = useRef("");
  const after = useRef(0);
  const mounted = useRef(true);
  const creating = useRef(false);
  const generation = useRef(0);
  const pendingSignals = useRef<Record<string, unknown>[]>([]);
  const signalChain = useRef(Promise.resolve());
  const others = participants.filter((person) => person.userId !== me);
  const selected = others.some((person) => person.userId === target) ? target : others[0]?.userId ?? "";

  useRoomTopOffset();


  // Fotocamera e microfono si attivano appena la sezione chiamata si apre,
  // così l'anteprima è viva prima di chiamare.
  useEffect(() => {
    if (call || others.length === 0 || previewAsked.current) return;
    previewAsked.current = true;
    const token = generation.current;
    void (async () => {
      try {
        await acquireMedia();
        if (mounted.current && token === generation.current) { setPreviewReady(true); setPreviewError(""); }
      } catch (reason) {
        if (mounted.current && token === generation.current) {
          setPreviewReady(false);
          setPreviewError(reason instanceof DOMException ? "Consenti l’accesso a microfono e fotocamera per la videochiamata." : reason instanceof Error ? reason.message : "Fotocamera e microfono non disponibili.");
        }
      }
    })();
  }, [call, previewAttempt]);

  const cleanup = useCallback(() => {
    generation.current += 1;
    const instance = peer.current; peer.current = null;
    instance?.destroy();
    stopCallMedia(stream.current); stream.current = null;
    remoteStream.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    creating.current = false;
    pendingSignals.current = [];
    after.current = 0;
    previewAsked.current = false;
    setPreviewReady(false);
    callAudioMutedRef.current = false;
    setCallAudioMuted(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    setFullMode(null);
  }, []);

  const end = useCallback(async () => {
    const current = callRef.current;
    cleanup();
    callRef.current = null;
    setCall(null);
    if (!current) return;
    try { await update({ data: { roomId, device: device.current, action: "end", callId: current.id } }); }
    catch (reason) { if (mounted.current) setError(reason instanceof Error ? reason.message : "Chiamata chiusa sul dispositivo; sincronizzazione non disponibile."); }
  }, [cleanup, roomId, update]);

  const endRef = useRef(end);
  endRef.current = end;

  const apply = useCallback((result: CallUpdate) => {
    if (!mounted.current) return;
    const next = result.call;
    if (!next || next.status === "ended") {
      if (callRef.current) { cleanup(); setConnection("Chiamata terminata"); }
      callRef.current = null; setCall(null); return;
    }
    if (callRef.current?.id !== next.id) { after.current = 0; pendingSignals.current = []; }
    callRef.current = next; setCall(next);
    for (const event of result.events) {
      if (event.id <= after.current) continue;
      after.current = event.id;
      const payload = JSON.parse(event.payload) as Record<string, unknown>;
      if (peer.current) peer.current.signal(payload as Peer.SignalData);
      else pendingSignals.current.push(payload);
    }
  }, [cleanup]);

  useEffect(() => {
    mounted.current = true;
    device.current = crypto.randomUUID();
    let running = false;
    let stopped = false;
    const poll = async () => {
      if (running || stopped) return;
      running = true;
      try {
        const current = callRef.current;
        const action = current?.status === "active" && ownsCallDevice(current, me, device.current) ? "heartbeat" : "poll";
        const result = await update({ data: { roomId, device: device.current, action, callId: current?.id, after: after.current } });
        if (!stopped) apply(result);
      } catch (reason) {
        if (stopped) return;
        const message = reason instanceof Error ? reason.message : "Connessione interrotta.";
        setError(message);
        // Calls are paid per minute by the caller: an empty balance ends the call.
        if (message.includes("Crediti esauriti")) void endRef.current();
      } finally { running = false; }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    // Durable polling recovers missed events; Realtime only wakes the same read path.
    const channel = supabase.channel(`video-room-${roomId}-${device.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_calls", filter: `room_id=eq.${roomId}` }, (event) => {
        const next = event.new as Partial<Call>;
        if (next.id !== callRef.current?.id || next.status !== callRef.current?.status) void poll();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "video_call_events", filter: `recipient_id=eq.${me}` }, () => void poll())
      .subscribe();
    const leave = () => { cleanup(); };
    window.addEventListener("pagehide", leave);
    return () => {
      stopped = true; mounted.current = false;
      window.clearInterval(timer); window.removeEventListener("pagehide", leave);
      void supabase.removeChannel(channel);
      const current = callRef.current;
      cleanup(); callRef.current = null;
      if (current && ownsCallDevice(current, me, device.current)) {
        void update({ data: { roomId, device: device.current, action: "end", callId: current.id } }).catch(() => undefined);
      }
    };
  }, [apply, cleanup, me, roomId, update]);

  async function acquireMedia() {
    if (stream.current) { setCameraOn(true); setAudioBlocked(false); return stream.current; }
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microfono e fotocamera non disponibili. Apri TraduChat in un browser aggiornato con HTTPS.");
    const token = generation.current;
    const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } });
    if (!mounted.current || token !== generation.current) { stopCallMedia(media); throw new Error("Chiamata annullata."); }
    stream.current = media; setCameraOn(true); setAudioBlocked(false);
    return media;
  }

  async function begin(action: "start" | "accept") {
    if (busy) return;
    setBusy(true); setError(""); setConnection("Collegamento…");
    try {
      await acquireMedia();
      const result = await update({ data: { roomId, device: device.current, action, target: action === "start" ? selected : undefined, callId: action === "accept" ? callRef.current?.id : undefined } });
      if (!mounted.current) { cleanup(); if (result.call) void update({ data: { roomId, device: device.current, action: "end", callId: result.call.id } }); return; }
      apply(result);
    } catch (reason) {
      cleanup();
      setError(reason instanceof DOMException ? "Consenti l’accesso a microfono e fotocamera e verifica che non siano usati da altre app." : reason instanceof Error ? reason.message : "Non riesco ad avviare la chiamata.");
    } finally { if (mounted.current) setBusy(false); }
  }

  useEffect(() => {
    if (localVideo.current && stream.current) localVideo.current.srcObject = stream.current;
    if (!call || call.status !== "active" || !ownsCallDevice(call, me, device.current) || peer.current || creating.current) return;
    const current = call;
    const token = generation.current;
    creating.current = true;
    void (async () => {
      try {
        const [config, module] = await Promise.all([
          ice({ data: { callId: current.id, device: device.current } }),
          import("simple-peer/simplepeer.min.js"),
        ]);
        if (!mounted.current || generation.current !== token || !stream.current || callRef.current?.id !== current.id) return;
        const instance = new module.default({ initiator: current.caller_id === me, stream: stream.current, trickle: true, config: { iceServers: config.iceServers } });
        peer.current = instance;
        instance.on("signal", (payload: Peer.SignalData) => {
          // Preserve offer/answer/candidate order even when RPC responses are delayed.
          signalChain.current = signalChain.current.then(async () => {
            if (peer.current !== instance || instance.destroyed) return;
            await update({ data: { roomId, device: device.current, action: "signal", callId: current.id, payload: payload as unknown as Record<string, unknown> } });
          }).catch((reason) => { if (peer.current === instance) { setError(reason instanceof Error ? reason.message : "Collegamento interrotto."); void end(); } });
        });
        instance.on("connect", () => { setConnection("In chiamata"); setError(""); });
        instance.on("stream", (media: MediaStream) => {
          remoteStream.current = media;
          const video = remoteVideo.current;
          if (video) { video.srcObject = media; setCallPlaybackMuted(video, callAudioMutedRef.current); void video.play().catch(() => setAudioBlocked(true)); }
        });
        instance.on("error", () => { if (peer.current === instance) { setError("Collegamento audio-video interrotto. Puoi richiamare."); void end(); } });
        instance.on("close", () => { if (peer.current === instance) void end(); });
        for (const payload of pendingSignals.current.splice(0)) instance.signal(payload as Peer.SignalData);
      } catch (reason) {
        if (mounted.current && generation.current === token) { setError(reason instanceof Error ? reason.message : "Videochiamata non disponibile."); void end(); }
      } finally { if (generation.current === token) creating.current = false; }
    })();
  }, [call, end, ice, me, previewReady, roomId, update]);

  // Keep received media and listening settings when the fullscreen surface changes.
  useEffect(() => {
    const video = remoteVideo.current;
    if (!video) return;
    setCallPlaybackMuted(video, callAudioMuted);
    if (remoteStream.current && video.srcObject !== remoteStream.current) {
      video.srcObject = remoteStream.current;
      void video.play().catch(() => setAudioBlocked(true));
    }
  }, [callAudioMuted, fullMode, call?.id, call?.status]);

  function toggleCallAudio() {
    void playCallMuteBeep();
    const muted = !callAudioMutedRef.current;
    callAudioMutedRef.current = muted;
    setCallPlaybackMuted(remoteVideo.current, muted);
    setCallAudioMuted(muted);
    if (!muted) void remoteVideo.current?.play().then(() => setAudioBlocked(false)).catch(() => setAudioBlocked(true));
  }

  useEffect(() => {
    if (call?.status !== "active") return;
    const timer = window.setTimeout(() => {
      if (!peer.current?.connected) { setError("L’altra persona non è raggiungibile. Riprova."); void end(); }
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [call?.id, call?.status, end]);

  function toggleCamera() {
    const tracks = stream.current?.getVideoTracks();
    if (!tracks?.length) return;
    const enabled = !tracks[0]?.enabled;
    tracks.forEach((track) => { track.enabled = enabled; });
    setCameraOn(enabled);
  }

  function reactivatePreview() {
    setPreviewError("");
    previewAsked.current = false;
    setPreviewAttempt((n) => n + 1);
  }

  // Nasconde la sezione fotocamera: spegne davvero camera e microfono e libera
  // spazio per i messaggi, senza toccare alcuna chiamata in corso.
  function hideCamera() {
    setCameraHidden(true);
    generation.current += 1;
    stopCallMedia(stream.current); stream.current = null;
    if (localVideo.current) localVideo.current.srcObject = null;
    previewAsked.current = false;
    setPreviewReady(false);
    setCameraOn(true); setAudioBlocked(false);
  }

  function showCamera() {
    setCameraHidden(false);
    setPreviewAttempt((n) => n + 1);
  }

  // Il browser esce da solo dallo schermo intero (Esc, gesto del sistema): risincronizza l’interfaccia.
  useEffect(() => {
    const onChange = () => { if (!document.fullscreenElement) setFullMode((mode) => (mode === "native" ? null : mode)); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // In modalità «overlay» (iOS) la pagina dietro non deve scorrere e Esc deve chiudere.
  useEffect(() => {
    if (fullMode !== "overlay") return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFullMode(null); };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = previous; };
  }, [fullMode]);

  async function toggleFull() {
    if (fullMode) {
      if (document.fullscreenElement) { try { await document.exitFullscreen(); } catch { /* già uscito */ } }
      setFullMode(null);
      return;
    }
    const node = stage.current;
    const mode = nextCallFullMode(fullMode, typeof node?.requestFullscreen === "function");
    if (mode === "native" && node) {
      try { await node.requestFullscreen(); setFullMode("native"); return; }
      catch { setFullMode("overlay"); return; }
    }
    setFullMode(mode);
  }

  const mine = call && ownsCallDevice(call, me, device.current);
  const incoming = call?.status === "ringing" && call.callee_id === me;
  const remoteId = call?.caller_id === me ? call?.callee_id : call?.caller_id;
  const remoteName = participants.find((person) => person.userId === remoteId)?.name ?? "Partecipante";

  // Se arriva una chiamata mentre la fotocamera è nascosta, riaprila subito.
  useEffect(() => {
    if (incoming && cameraHidden) showCamera();
  }, [incoming, cameraHidden]);

  const callControls = <>
    <Button variant="outline" size="icon" aria-label={cameraOn ? "Disattiva fotocamera" : "Attiva fotocamera"} title={cameraOn ? "Disattiva fotocamera" : "Attiva fotocamera"} onClick={toggleCamera}>{cameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}</Button>
    <Button variant={callAudioMuted ? "secondary" : "outline"} size="icon" aria-pressed={callAudioMuted} aria-label={callAudioMuted ? "Riattiva audio della chiamata" : "Silenzia audio della chiamata"} title={callAudioMuted ? "Riattiva audio della chiamata" : "Silenzia la chiamata per ascoltare i messaggi vocali"} onClick={toggleCallAudio}>{callAudioMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</Button>
    <ContactMicButton name={remoteName} roomCode={roomCode} langA={langA} langB={langB} direct className="shrink-0" />
    <Button variant="outline" size="icon" aria-label={fullMode ? "Riduci la videochiamata" : "Schermo intero"} title={fullMode ? "Riduci la videochiamata" : "Schermo intero"} onClick={() => void toggleFull()}>{fullMode ? <Minimize className="size-4" /> : <Maximize className="size-4" />}</Button>
    {audioBlocked && !callAudioMuted && <Button variant="outline" size="sm" onClick={() => { void remoteVideo.current?.play().then(() => setAudioBlocked(false)).catch(() => setError("Tocca il video per consentire l’audio.")); }}><Volume2 className="size-4" />Attiva audio</Button>}
    <Button variant="destructive" size="default" className="w-full sm:w-auto" aria-label={call?.status === "ringing" ? "Annulla chiamata" : "Termina chiamata"} title="Interrompi la videochiamata" onClick={() => void end()}><PhoneOff className="size-5" />{call?.status === "ringing" ? "Annulla chiamata" : "Termina chiamata"}</Button>
  </>;

  return <section id="videochiamata" ref={section} aria-label="Videochiamata reale" className="my-2 shrink-0 scroll-mt-16 border-y border-border py-2">
    {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
    {!call ? cameraHidden ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
      <VideoOff className="size-4 text-muted-foreground" />
      <p className="min-w-0 flex-1 text-xs text-muted-foreground">Fotocamera nascosta: più spazio per i messaggi. Riaprila per effettuare o ricevere una videochiamata.</p>
      <Button size="sm" variant="outline" aria-label="Mostra di nuovo la fotocamera" title="Mostra di nuovo la fotocamera" onClick={showCamera}><Video className="size-4" />Mostra fotocamera</Button>
    </div> : <div className="space-y-2">
      {previewError ? <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">{previewError}</p>
        <Button size="sm" variant="outline" onClick={reactivatePreview}><Camera className="size-4" />Attiva fotocamera e microfono</Button>
      </div> : previewReady ? <div className="relative aspect-video w-40 overflow-hidden rounded-lg bg-demo-stage">
        <video ref={localVideo} aria-label="Il tuo video" autoPlay muted playsInline className="h-full w-full object-cover" />
        <span className="absolute bottom-1 left-1 rounded bg-demo-caption/90 px-2 py-0.5 text-xs text-demo-foreground">Fotocamera e microfono attivi</span>
      </div> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Per videochiamare un contatto: scegli la persona dal menu e tocca <span className="inline-flex items-center gap-1 align-middle"><Phone className="inline size-3" /> Chiama</span>. Fotocamera e microfono si attivano in automatico — quando l’altra persona accetta, audio e video partono subito, e la chat tradotta continua a funzionare durante la chiamata. Per concludere, tocca «Termina chiamata».
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {others.length > 1 && <Select value={selected} onValueChange={setTarget}><SelectTrigger aria-label="Partecipante da chiamare" className="w-40"><SelectValue /></SelectTrigger><SelectContent>{others.map((person) => <SelectItem key={person.userId} value={person.userId}>{person.name}</SelectItem>)}</SelectContent></Select>}
        <Button size="sm" disabled={!selected || busy} aria-label={selected ? `Chiama ${others.find((person) => person.userId === selected)?.name ?? "il contatto"}` : "Chiama un contatto"} title="Avvia una videochiamata con il contatto selezionato" onClick={() => void begin("start")}><Phone className="size-4" />{busy ? "Avvio…" : "Chiama"}</Button>
        <Button size="sm" variant="outline" aria-label="Nascondi la fotocamera" title="Nascondi la fotocamera: più spazio per i messaggi" onClick={hideCamera}><VideoOff className="size-4" />Nascondi fotocamera</Button>
        {!selected && <span className="text-xs text-muted-foreground">Nessun altro partecipante</span>}
      </div>
    </div> : incoming ? <div className="flex flex-wrap items-center gap-2" role="status">
      <Phone className="size-4 text-primary" /><span className="min-w-0 break-words text-sm">{remoteName} ti sta chiamando</span>
      <Button size="sm" disabled={busy} onClick={() => void begin("accept")}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}Accetta</Button>
      <Button size="sm" variant="destructive" disabled={busy} onClick={() => void end()}><PhoneOff className="size-4" />Rifiuta</Button>
    </div> : !mine ? <p className="text-sm text-muted-foreground">Chiamata aperta su un altro dispositivo</p> : <>
      <div className="mb-2 flex items-center justify-between gap-2 text-xs" role="status"><span className="min-w-0 truncate">{remoteName} · {call.status === "ringing" ? "In attesa di risposta…" : connection}</span></div>
      <div ref={stage} className={fullMode ? (fullMode === "overlay" ? "fixed inset-0 z-50 h-dvh w-screen overflow-hidden bg-demo-stage" : "relative h-full w-full overflow-hidden bg-demo-stage") : "grid grid-cols-2 gap-2"}>
        {fullMode ? <>
          <video ref={remoteVideo} aria-label="Video dell’altra persona" autoPlay muted={callAudioMuted} playsInline className="absolute inset-0 h-full w-full bg-demo-stage object-contain" />
          <span className="absolute left-3 top-3 max-w-[60%] truncate rounded bg-demo-caption/90 px-2 py-1 text-xs text-demo-foreground">{remoteName} · {call.status === "ringing" ? "In attesa di risposta…" : connection}</span>
          <Button variant="outline" size="icon" aria-label="Esci dallo schermo intero" title="Esci dallo schermo intero" onClick={() => void toggleFull()} className="absolute right-3 top-3 bg-demo-caption/80 text-demo-foreground"><Minimize className="size-4" /></Button>
          <div className="absolute bottom-24 right-3 h-28 w-20 overflow-hidden rounded-lg border border-border bg-demo-stage shadow-lg">
            <video ref={localVideo} aria-label="Il tuo video" autoPlay muted playsInline className="h-full w-full object-cover" />
            <span className="absolute bottom-0.5 left-1 rounded bg-demo-caption/90 px-1 py-0.5 text-[10px] leading-none text-demo-foreground">Tu</span>
          </div>
          <div className="absolute bottom-4 left-1/2 flex w-[min(92%,30rem)] -translate-x-1/2 flex-wrap justify-center gap-2">{callControls}</div>
        </> : <>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-demo-stage">
            <video ref={localVideo} aria-label="Il tuo video" autoPlay muted playsInline className="h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 rounded bg-demo-caption/90 px-2 py-0.5 text-xs text-demo-foreground">Tu{!cameraOn ? " · Video spento" : ""}</span>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-lg bg-demo-stage">
            <video ref={remoteVideo} aria-label="Video dell’altra persona" autoPlay muted={callAudioMuted} playsInline className="h-full w-full object-cover" />
            <span className="absolute bottom-1 left-1 max-w-full truncate rounded bg-demo-caption/90 px-2 py-0.5 text-xs text-demo-foreground">{remoteName}</span>
          </div>
        </>}
      </div>
      {!fullMode && <div className="mt-2 flex flex-wrap justify-center gap-2">{callControls}</div>}
    </>}
  </section>;
}