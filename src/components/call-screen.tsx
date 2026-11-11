import { useEffect, useRef, useState } from "react";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Captions, Mic, MicOff, Phone, Square, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { translateVoice } from "@/lib/voice.functions";
import { recordWav, playWav } from "@/lib/record-wav";
import { Button } from "@/components/ui/button";

const LANGS: string[] = [...TRANSLATION_LANGUAGES];

export function CallScreen({ name, mode, myLang, end }: { name: string; mode: "audio" | "video"; myLang: string; end: () => void }) {
  const [video, setVideo] = useState(mode === "video");
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [subs, setSubs] = useState(false);
  const [target, setTarget] = useState(myLang === "Inglese" ? "Italiano" : "Inglese");
  const [secs, setSecs] = useState(0);
  const [rec, setRec] = useState<{ stop: () => Promise<string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<{ o: string; t: string }[]>([]);
  const [err, setErr] = useState("");
  const vidRef = useRef<HTMLVideoElement>(null);
  const recordingRef = useRef<{ stop: () => Promise<string> } | null>(null);
  const doVoice = useServerFn(translateVoice);

  useEffect(() => { const t = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => () => { void recordingRef.current?.stop().catch(() => {}); }, []);

  useEffect(() => {
    if (!video) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) { setErr("Fotocamera non disponibile"); return; }
    navigator.mediaDevices.getUserMedia({ video: true }).then((s) => {
      if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s; if (vidRef.current) vidRef.current.srcObject = s;
    }).catch(() => { if (!cancelled) setErr("Fotocamera non disponibile"); });
    return () => { cancelled = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, [video]);

  const talk = async () => {
    if (busy || muted) return;
    if (!rec) { try { setErr(""); const recording = await recordWav(); recordingRef.current = recording; setRec(recording); } catch { setErr("Microfono non disponibile"); } return; }
    const r0 = rec; recordingRef.current = null; setRec(null); setBusy(true);
    try {
      const r = await doVoice({ data: { audio: await r0.stop(), target, speak: speaker } });
      if (!r.ok) { setErr(r.error); return; }
      setLines((l) => [...l.slice(-2), { o: r.original, t: r.translation }]);
      if (r.audio && speaker) playWav(r.audio);
    } catch (e) { setErr(e instanceof Error ? e.message : "Traduzione non riuscita"); }
    finally { setBusy(false); }
  };

  const time = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const btn = "flex h-12 w-12 items-center justify-center rounded-full";

  return (
    <div className="presentation-call relative flex flex-1 flex-col overflow-hidden bg-aurora text-secondary-foreground">
      <Button variant="secondary" size="icon" title="Torna indietro" aria-label="Torna indietro" className="absolute left-4 top-4 z-20" onClick={end}><ArrowLeft /></Button>
      <div className="flex flex-1 flex-col items-center pt-16">
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary font-display text-4xl font-black text-primary-foreground">
          {name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </div>
        <h2 className="mt-4 font-display text-2xl font-black text-primary">{name.toUpperCase()}</h2>
        <p className="text-xs uppercase tracking-widest opacity-80">{video ? "Videochiamata" : "Chiamata"} · {time}</p>
        <p role="status" className="mt-2 text-center text-xs opacity-80">Anteprima locale · Nessun partecipante collegato</p>
      </div>

      {video && (
        <video ref={vidRef} autoPlay muted playsInline
          className="presentation-call-pip absolute right-4 top-12 h-36 w-24 rounded-xl bg-secondary object-cover shadow-xl [transform:scaleX(-1)]" />
      )}

      {subs && (
        <div className="mx-4 mb-3 rounded-3xl bg-card/95 p-3 text-card-foreground">
          <div className="mb-2 flex items-center gap-2 text-[11px]">
            <span className="font-bold uppercase text-secondary">Sottotitoli in</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Lingua sottotitoli" className="flex-1 bg-transparent font-semibold outline-none">
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          {lines.length === 0 && <p className="text-xs text-muted-foreground">Premi "Parla", dì la tua frase e premi di nuovo: verrà tradotta e letta ad alta voce.</p>}
          {lines.map((l, i) => (
            <div key={i} className="mb-1">
              <p className="text-sm font-semibold">{l.t}</p>
              <p className="text-[11px] italic text-muted-foreground">{l.o}</p>
            </div>
          ))}
          {err && <p className="text-[11px] font-semibold text-destructive">{err}</p>}
          <Button onClick={() => void talk()} disabled={busy || muted}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-bold ${rec ? "animate-pulse bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"} disabled:opacity-60`}>
            {rec ? <><Square size={16} /> Ferma e traduci</> : busy ? "Traduco…" : <><Mic size={16} /> Parla</>}
          </Button>
        </div>
      )}
      {!subs && err && <p className="mx-4 mb-2 text-center text-xs text-destructive">{err}</p>}

      <div className="presentation-call-controls flex flex-wrap justify-center gap-3 px-4 pb-8 pt-5">
        <Button variant="ghost" size="icon" title="Altoparlante" onClick={() => setSpeaker(!speaker)} aria-pressed={speaker} aria-label="Altoparlante" className={`${btn} bg-secondary-dark`}>{speaker ? <Volume2 /> : <VolumeX />}</Button>
        <Button variant="ghost" size="icon" title="Video" onClick={() => setVideo(!video)} aria-pressed={video} aria-label="Video" className={`${btn} bg-secondary-dark`}>{video ? <Video /> : <VideoOff />}</Button>
        <Button variant="ghost" size="icon" title="Microfono" disabled={!!rec} onClick={() => setMuted(!muted)} aria-pressed={!muted} aria-label="Microfono" className={`${btn} bg-secondary-dark`}>{muted ? <MicOff /> : <Mic />}</Button>
        <Button variant="ghost" size="icon" title="Sottotitoli tradotti" onClick={() => setSubs(!subs)} aria-pressed={subs} aria-label="Sottotitoli tradotti" className={`${btn} ${subs ? "bg-primary text-primary-foreground" : "bg-secondary-dark"}`}><Captions /></Button>
        <Button variant="destructive" size="icon" title="Termina" onClick={end} aria-label="Termina" className={btn}><Phone className="rotate-[135deg]" /></Button>
      </div>
    </div>
  );
}
