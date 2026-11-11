import { getIceServers, FALLBACK_ICE } from '@/lib/ice-servers.functions';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { gatherDescription, isLiveCall, parseDescription, type CallMode } from '@/lib/peer-call';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, MicOff, Phone, Video, VideoOff, Volume2, VolumeX, X } from 'lucide-react';

type Session = Tables<'call_sessions'>;
type Person = { id: string; name: string; role: string };
type Calls = { people: Person[]; history: Session[]; userId: string; start: (name: string, mode: CallMode) => void };
const CallsContext = createContext<Calls>({ people: [], history: [], userId: '', start: () => {} });
export const usePeerCalls = () => useContext(CallsContext);

export function PeerCallsProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [history, setHistory] = useState<Session[]>([]);
  const [call, setCall] = useState<Session | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [relay, setRelay] = useState<'idle' | 'loading' | 'ok' | 'off'>('idle');
  const [link, setLink] = useState<RTCPeerConnectionState | 'idle'>('idle');
  const [muted, setMuted] = useState(false);
  const [video, setVideo] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [secs, setSecs] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const callRef = useRef<Session | null>(null);
  const pendingRef = useRef(false);
  const generation = useRef(0);
  const applyingAnswer = useRef(false);
  const [mediaVersion, setMediaVersion] = useState(0);
  const cleanup = () => {
    generation.current++;
    pcRef.current?.close(); pcRef.current = null;
    localRef.current?.getTracks().forEach(t => t.stop()); localRef.current = null;
    remoteRef.current = null; applyingAnswer.current = false; setConnected(false); setSecs(0); setMuted(false); setVideo(false);
    callRef.current = null; setCall(null); pendingRef.current = false; setPreparing(false);
  };
  const finish = async (decline = false) => {
    const current = callRef.current;
    cleanup();
    if (current) {
      const result = await supabase.rpc('finish_peer_call', { call_id: current.id, decline });
      if (result.error) setError('Chiamata chiusa sul dispositivo; verifica la connessione.');
    }
  };
  const updateCall = async (next: Session) => {
    if (!isLiveCall(next.status, next.expires_at)) {
      if (callRef.current?.id === next.id) { cleanup(); setError(next.status === 'rejected' ? 'Chiamata rifiutata' : 'Chiamata terminata o senza risposta'); }
      return;
    }
    if (!callRef.current) {
      if (pendingRef.current || next.callee_id !== userId || next.status !== 'ringing') return;
      callRef.current = next; setCall(next); setError(''); setVideo(next.mode === 'video');
    } else if (callRef.current.id !== next.id) return;
    callRef.current = next; setCall(next);
    const pc = pcRef.current;
    if (next.caller_id === userId && next.answer && pc && !pc.remoteDescription && !applyingAnswer.current) {
      applyingAnswer.current = true;
      try { await pc.setRemoteDescription(parseDescription(next.answer, 'answer')); }
      catch { setError('Connessione non riuscita'); void finish(); }
      finally { applyingAnswer.current = false; }
    }
  };
  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data }) => { if (alive) setUserId(data.user?.id ?? ''); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') setUserId(session?.user.id ?? '');
      if (event === 'SIGNED_OUT') { void finish(); setUserId(''); setPeople([]); setHistory([]); }
    });
    return () => { alive = false; data.subscription.unsubscribe(); const active = callRef.current; cleanup(); if (active) void supabase.rpc('finish_peer_call', { call_id: active.id }); };
  }, []);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    const refresh = async () => {
      const [directory, sessions] = await Promise.all([
        supabase.rpc('call_directory', { search_text: '' }),
        supabase.from('call_sessions').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      if (!active) return;
      if (directory.error || sessions.error) { setError('Impossibile caricare le chiamate. Riprova.'); return; }
      setPeople((directory.data ?? []).map(p => ({ id: p.id, name: p.username, role: 'TraduChat' })));
      setHistory(sessions.data ?? []);
      const current = callRef.current;
      const next = current ? sessions.data?.find(s => s.id === current.id) : sessions.data?.find(s => s.callee_id === userId && s.status === 'ringing' && isLiveCall(s.status, s.expires_at));
      if (next) await updateCall(next);
    };
    void refresh();
    const channel = supabase.channel(`peer-calls-${userId}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_sessions' }, () => { void refresh(); }).subscribe();
    const timer = setInterval(() => { void refresh(); }, 5000);
    const pageHide = () => { void finish(); };
    window.addEventListener('pagehide', pageHide);
    return () => { active = false; clearInterval(timer); window.removeEventListener('pagehide', pageHide); void supabase.removeChannel(channel); };
  }, [userId]);
  useEffect(() => {
    if (!call) return;
    const timer = setInterval(() => {
      const active = callRef.current;
      if (active && !isLiveCall(active.status, active.expires_at)) { setError('Chiamata scaduta'); void finish(); }
    }, 1000);
    const heartbeat = setInterval(() => { const active = callRef.current; if (active?.status === 'accepted') void supabase.rpc('keep_peer_call', { call_id: active.id }); }, 25000);
    return () => { clearInterval(timer); clearInterval(heartbeat); };
  }, [call?.id]);
  useEffect(() => {
    if (!connected) return;
    const timer = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [connected]);
  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localRef.current;
    if (remoteVideo.current) { remoteVideo.current.srcObject = remoteRef.current; void remoteVideo.current.play().catch(() => {}); }
  }, [mediaVersion, call?.id, preparing]);
  const prepare = async (mode: CallMode) => {
    const version = generation.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' });
    if (version !== generation.current) { stream.getTracks().forEach(t => t.stop()); throw new Error('Chiamata annullata'); }
    localRef.current = stream; setVideo(mode === 'video'); setSpeaker(true); setMuted(false);
    setRelay('loading'); setLink('idle');
    const { iceServers, relay: hasRelay } = await getIceServers().catch(() => ({ iceServers: FALLBACK_ICE, relay: false }));
    setRelay(hasRelay ? 'ok' : 'off');
    if (version !== generation.current) { stream.getTracks().forEach(t => t.stop()); throw new Error('Chiamata annullata'); }
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = event => {
      if (!remoteRef.current) remoteRef.current = new MediaStream();
      remoteRef.current.addTrack(event.track); setMediaVersion(v => v + 1);
    };
    pc.onconnectionstatechange = () => {
      if (pcRef.current !== pc) return;
      setConnected(pc.connectionState === 'connected'); setLink(pc.connectionState);
      if (pc.connectionState === 'failed') { setError(!hasRelay ? 'Collegamento non riuscito e servizio Twilio non disponibile. Passa al Wi-Fi o alla rete mobile e richiama.' : 'Collegamento Twilio non riuscito. Controlla la connessione internet di entrambi, consenti microfono e fotocamera, poi richiama.'); void finish(); }
    };
    setMediaVersion(v => v + 1);
    return pc;
  };
  const start = (name: string, mode: CallMode) => {
    if (callRef.current || pendingRef.current) { setError('Hai già una chiamata in corso'); return; }
    const person = people.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!person) { setError('Questo contatto non è un utente registrato disponibile'); return; }
    pendingRef.current = true; setPreparing(true); setError('');
    void (async () => {
      try {
        const pc = await prepare(mode);
        await pc.setLocalDescription(await pc.createOffer());
        const offer = await gatherDescription(pc);
        if (pcRef.current !== pc) return;
        const result = await supabase.rpc('start_peer_call', { peer_id: person.id, call_mode: mode, session_offer: offer });
        if (result.error) throw new Error(result.error.message);
        if (!result.data) throw new Error('Chiamata non disponibile');
        if (pcRef.current !== pc) { void supabase.rpc('finish_peer_call', { call_id: result.data.id }); return; }
        callRef.current = result.data; setCall(result.data); setPreparing(false); pendingRef.current = false;
      } catch (e) { cleanup(); setError(e instanceof Error ? e.message : 'Microfono o fotocamera non disponibili'); }
    })();
  };
  const answer = async () => {
    const current = callRef.current;
    if (!current || pendingRef.current) return;
    pendingRef.current = true; setPreparing(true); setError('');
    try {
      const pc = await prepare(current.mode as CallMode);
      await pc.setRemoteDescription(parseDescription(current.offer, 'offer'));
      await pc.setLocalDescription(await pc.createAnswer());
      const session_answer = await gatherDescription(pc);
      if (pcRef.current !== pc) return;
      const result = await supabase.rpc('answer_peer_call', { call_id: current.id, session_answer });
      if (result.error) throw new Error(result.error.message);
      if (pcRef.current !== pc) return;
      if (result.data) { callRef.current = result.data; setCall(result.data); }
      setPreparing(false); pendingRef.current = false;
    } catch { await finish(true); setError('Impossibile rispondere: controlla microfono, fotocamera e connessione.'); }
  };
  const incoming = call?.callee_id === userId && call.status === 'ringing' && !pcRef.current;
  const name = call ? (call.caller_id === userId ? call.callee_name : call.caller_name) : 'TraduChat';
  const time = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  return <CallsContext.Provider value={{ people, history, userId, start }}>
    {children}
    {error && <div role="alert" className="fixed left-1/2 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-lg bg-card p-3 text-sm text-card-foreground shadow-xl">{error}<Button variant="ghost" size="icon" aria-label="Chiudi avviso" onClick={() => setError('')}><X /></Button></div>}
    {(call || preparing) && <div role="dialog" aria-label="Chiamata TraduChat" className="presentation-call fixed inset-0 z-[70] flex flex-col overflow-hidden bg-aurora text-secondary-foreground">
      <Button variant="secondary" size="icon" title="Torna indietro" aria-label="Torna indietro" className="absolute left-4 top-4 z-30 rounded-full bg-call-control" onClick={() => void finish(Boolean(incoming))}><ArrowLeft /></Button>
      <video ref={remoteVideo} aria-label="Video del partecipante" autoPlay playsInline muted={!speaker} className={`absolute inset-0 h-full w-full object-contain ${call?.mode === 'video' && connected ? '' : 'invisible'}`} />
      <div className={`relative z-10 flex flex-1 flex-col items-center gap-3 px-4 ${call?.mode === 'video' && connected ? 'justify-start pb-4 pl-16 pr-32 pt-6 bg-call-overlay' : 'justify-center pb-8 pt-44'}`}>
        {!(call?.mode === 'video' && connected) && <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary font-display text-3xl font-bold text-primary-foreground">{name.slice(0, 2).toUpperCase()}</div>}
        <h2 className="max-w-full break-words text-center font-display text-2xl font-bold">{name}</h2>
        {!incoming && call && <LinkBadge relay={relay} link={link} />}
        <p role="status">{incoming ? `${call?.mode === 'video' ? 'Videochiamata' : 'Chiamata'} in arrivo` : preparing ? 'Preparazione chiamata…' : connected ? `Connessa · ${time}` : call?.status === 'ringing' ? 'In attesa di risposta…' : 'Connessione…'}</p>
      </div>
      <video ref={localVideo} aria-label="La tua fotocamera" autoPlay muted playsInline className={`absolute right-4 top-4 z-20 h-36 w-24 presentation-call-pip rounded-xl bg-secondary object-cover ${video && localRef.current ? '' : 'invisible'}`} />
      <div className="presentation-call-controls relative z-30 flex flex-wrap justify-center gap-3 px-4 pb-8 pt-5">
        {incoming ? <><Button disabled={preparing} onClick={() => void answer()}><Phone /> Rispondi</Button><Button variant="destructive" onClick={() => void finish(true)}><Phone /> Rifiuta</Button></> : <>
          <Button variant="secondary" size="icon" className="bg-call-control" title="Altoparlante" aria-label="Altoparlante" aria-pressed={speaker} onClick={() => setSpeaker(s => !s)}>{speaker ? <Volume2 /> : <VolumeX />}</Button>
          <Button variant="secondary" size="icon" className="bg-call-control" title="Microfono" aria-label="Microfono" aria-pressed={!muted} disabled={!localRef.current} onClick={() => { localRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(m => !m); }}>{muted ? <MicOff /> : <Mic />}</Button>
          {call?.mode === 'video' && <Button variant="secondary" size="icon" className="bg-call-control" title="Video" aria-label="Video" aria-pressed={video} onClick={() => { localRef.current?.getVideoTracks().forEach(t => { t.enabled = !video; }); setVideo(v => !v); }}>{video ? <Video /> : <VideoOff />}</Button>}
          <Button variant="destructive" size="icon" title="Termina" aria-label="Termina" onClick={() => void finish()}><Phone className="rotate-[135deg]" /></Button>
        </>}
      </div>
    </div>}
  </CallsContext.Provider>;
}

function LinkBadge({ relay, link }: { relay: 'idle' | 'loading' | 'ok' | 'off'; link: RTCPeerConnectionState | 'idle' }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => { setSlow(false); if (link === 'connected') return; const t = setTimeout(() => setSlow(true), 15000); return () => clearTimeout(t); }, [link]);
  let tone = 'bg-muted text-muted-foreground', text = 'Collegamento Twilio in corso…', hint = '';
  if (relay === 'loading') text = 'Preparazione collegamento Twilio…';
  else if (link === 'connected') { tone = 'bg-primary text-primary-foreground'; text = relay === 'ok' ? 'Collegamento Twilio riuscito' : 'Collegamento diretto riuscito'; }
  else if (link === 'failed' || link === 'disconnected') { tone = 'bg-destructive text-destructive-foreground'; text = link === 'failed' ? 'Collegamento non riuscito' : 'Collegamento interrotto'; hint = 'Controlla internet su entrambi i telefoni, poi richiama.'; }
  else if (relay === 'off') { text = 'Twilio non disponibile: provo il collegamento diretto…'; hint = 'Se non si collega, usa il Wi-Fi su entrambi i telefoni.'; }
  if (slow && link !== 'connected' && !hint) hint = 'Ci sta mettendo troppo: verifica la rete o chiudi e richiama.';
  return <div className="flex flex-col items-center gap-1 text-center"><span aria-live="polite" className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{text}</span>{hint && <span className="max-w-xs text-xs text-muted-foreground">{hint}</span>}</div>;
}
