import { useEffect, useRef, useState } from 'react';
import type { Room, LocalParticipant, RemoteParticipant, LocalAudioTrack, LocalVideoTrack, RemoteAudioTrack, RemoteVideoTrack } from 'twilio-video';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, MicOff, Phone, Video, VideoOff } from 'lucide-react';

type MediaTrack = LocalAudioTrack | LocalVideoTrack | RemoteAudioTrack | RemoteVideoTrack;
export function VideoRoom({ token, roomName, name, leave }: { token: string; roomName: string; name: string; leave: () => void }) {
  const roomRef = useRef<Room | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Connessione…');
  const [count, setCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const [video, setVideo] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const cleanups: (() => void)[] = [];
    const run = async () => {
      try {
        const { connect, createLocalTracks } = await import('twilio-video');
        const tracks = await createLocalTracks({ audio: true, video: { width: 640 } });
        if (!active) { tracks.forEach(t => { if (t.kind !== 'data') t.stop(); }); return; }
        cleanups.push(() => tracks.forEach(t => { if (t.kind !== 'data') t.stop(); }));
        const room = await connect(token, { name: roomName, tracks, dominantSpeaker: true, bandwidthProfile: { video: { mode: 'collaboration' } } });
        if (!active) { room.disconnect(); return; }
        roomRef.current = room; setStatus('Connessa');
        const addParticipant = (participant: LocalParticipant | RemoteParticipant, local: boolean) => {
          const tile = document.createElement('section'); tile.className = 'relative flex min-h-40 flex-col overflow-hidden rounded-lg bg-secondary';
          const label = document.createElement('p'); label.className = 'p-2 text-center text-sm text-secondary-foreground'; label.textContent = local ? 'Tu' : 'Partecipante';
          tile.append(label); grid.current?.append(tile);
          const attach = (track: MediaTrack) => {
            const element = track.attach(); element.autoplay = true;
            if (element instanceof HTMLVideoElement) { element.playsInline = true; element.className = 'min-h-0 w-full flex-1 object-contain'; if (local) element.muted = true; }
            tile.append(element);
          };
          const detach = (track: MediaTrack) => track.detach().forEach(el => el.remove());
          participant.tracks.forEach(publication => { if (publication.track && (publication.track.kind === 'audio' || publication.track.kind === 'video')) attach(publication.track); });
          participant.on('trackSubscribed', attach); participant.on('trackUnsubscribed', detach);
          cleanups.push(() => { participant.off('trackSubscribed', attach); participant.off('trackUnsubscribed', detach); tile.remove(); });
          return tile;
        };
        const tiles = new Map<string, HTMLElement>();
        addParticipant(room.localParticipant, true);
        const refreshCount = () => setCount(room.participants.size + 1);
        room.participants.forEach(p => tiles.set(p.sid, addParticipant(p, false)));
        room.on('participantConnected', p => { tiles.set(p.sid, addParticipant(p, false)); refreshCount(); });
        room.on('participantDisconnected', p => { tiles.get(p.sid)?.remove(); tiles.delete(p.sid); refreshCount(); });
        room.on('reconnecting', () => setStatus('Riconnessione…'));
        room.on('reconnected', () => setStatus('Connessa'));
        room.on('disconnected', () => { if (active) setStatus('Disconnessa'); });
        refreshCount();
      } catch (e) {
        if (active) {
          setStatus('Connessione non riuscita');
          const message = e instanceof Error ? e.message : 'Controlla microfono, fotocamera e connessione';
          setError(message.includes('Legacy room type') ? 'Twilio richiede stanze Group: aggiorna il tipo di stanza nelle impostazioni Video.' : message);
          cleanups.forEach(fn => fn());
        }
      }
    };
    void run();
    return () => { active = false; roomRef.current?.disconnect(); roomRef.current = null; cleanups.forEach(fn => fn()); };
  }, [token, roomName]);
  return <div role="dialog" aria-label="Stanza privata" className="presentation-call fixed inset-0 z-[75] flex flex-col bg-aurora text-secondary-foreground">
    <header className="flex items-start gap-3 px-4 py-4"><Button variant="secondary" size="icon" title="Torna indietro" aria-label="Torna indietro" className="shrink-0" onClick={leave}><ArrowLeft /></Button><div className="min-w-0 flex-1 pr-12 text-center"><h2 className="break-words font-display text-xl font-bold">{name}</h2><p role="status" className="text-sm">{status} · {count} partecipanti</p></div></header>
    {error && <p role="alert" className="px-4 text-center text-sm text-destructive">{error}</p>}
    <div ref={grid} className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2 overflow-y-auto p-3 lg:grid-cols-3" />
    <footer className="presentation-call-controls flex justify-center gap-4 px-4 py-5">
      <Button variant="secondary" size="icon" title="Microfono" aria-label="Microfono stanza" aria-pressed={!muted} disabled={!roomRef.current} onClick={() => { roomRef.current?.localParticipant.audioTracks.forEach(p => { if (muted) p.track.enable(); else p.track.disable(); }); setMuted(m => !m); }}>{muted ? <MicOff /> : <Mic />}</Button>
      <Button variant="secondary" size="icon" title="Video" aria-label="Video stanza" aria-pressed={video} disabled={!roomRef.current} onClick={() => { roomRef.current?.localParticipant.videoTracks.forEach(p => { if (video) p.track.disable(); else p.track.enable(); }); setVideo(v => !v); }}>{video ? <Video /> : <VideoOff />}</Button>
      <Button variant="destructive" size="icon" title="Esci dalla stanza" aria-label="Esci dalla stanza" onClick={leave}><Phone className="rotate-[135deg]" /></Button>
    </footer>
  </div>;
}
