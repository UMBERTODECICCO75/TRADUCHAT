import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Radio, Square, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  endCommunityStream,
  getLiveStream,
  listStreamSegments,
  publishStreamSegment,
  startCommunityStream,
} from "@/lib/streaming.functions";
import { playBeep } from "@/lib/message-alerts";

const SEGMENT_MS = 4000;
const POLL_MS = 4000;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("lettura fallita"));
    reader.readAsDataURL(blob);
  });
}

/** Live video for a community: the owner broadcasts, members watch. */
export function CommunityStream({ code, mine }: { code: string; mine: boolean }) {
  const checkLive = useServerFn(getLiveStream);
  const [live, setLive] = useState<{ streamId: string; mine: boolean } | null>(null);
  const [mode, setMode] = useState<"idle" | "broadcast" | "watch">("idle");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const result = await checkLive({ data: { code } });
        if (!cancelled) setLive(result.live);
      } catch {
        /* silenzioso: il sondaggio riprova al giro successivo */
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, checkLive]);

  const ringingId = live && !live.mine && mode === "idle" ? live.streamId : null;
  const [silenced, setSilenced] = useState<string | null>(null);
  useEffect(() => {
    if (!ringingId || silenced === ringingId) return;
    const bipBip = () => { playBeep(); setTimeout(playBeep, 400); };
    bipBip();
    let count = 1;
    const timer = setInterval(() => {
      bipBip();
      if (++count >= 15) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [ringingId, silenced]);

  if (mode === "broadcast" && live) {
    return (
      <Broadcaster
        streamId={live.streamId}
        onEnded={() => {
          setMode("idle");
          setLive(null);
        }}
      />
    );
  }
  if (mode === "watch" && live) {
    return <Viewer streamId={live.streamId} onClose={() => setMode("idle")} />;
  }

  if (mine) {
    return (
      <Button
        variant="outline"
        className="h-11 w-full"
        onClick={async () => {
          try {
            const result = await startCommunityStream({ data: { code } });
            setLive({ streamId: result.streamId, mine: true });
            setMode("broadcast");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Non riesco ad avviare la diretta.");
          }
        }}
      >
        <Video className="size-4" /> Avvia diretta video
      </Button>
    );
  }

  if (live) {
    return (
      <Button className="h-11 w-full" onClick={() => { setSilenced(live.streamId); setMode("watch"); }}>
        <Radio className="size-4 animate-pulse text-red-500" /> Diretta in corso — Guarda
      </Button>
    );
  }

  return null;
}

function Broadcaster({ streamId, onEnded }: { streamId: string; onEnded: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);
  const endStream = useServerFn(endCommunityStream);
  const publish = useServerFn(publishStreamSegment);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let seq = 0;
    let stopped = false;
    let segmentTimer: ReturnType<typeof setInterval> | null = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setError("Non riesco ad aprire fotocamera e microfono. Controlla i permessi del browser.");
        return;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        void videoRef.current.play().catch(() => undefined);
      }
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

      const startSegment = () => {
        if (stopped || !stream) return;
        const current = seq;
        recorder = new MediaRecorder(stream, { mimeType: mime });
        recorder.ondataavailable = (event) => {
          if (event.data.size === 0) return;
          void (async () => {
            try {
              const videoBase64 = await blobToBase64(event.data);
              await publish({ data: { streamId, seq: current, videoBase64 } });
            } catch {
              /* un segmento perso non ferma la diretta */
            }
          })();
        };
        recorder.start();
        seq += 1;
      };

      startSegment();
      segmentTimer = setInterval(() => {
        if (recorder && recorder.state !== "inactive") recorder.stop();
        startSegment();
      }, SEGMENT_MS);
    }

    void start();
    return () => {
      stopped = true;
      if (segmentTimer) clearInterval(segmentTimer);
      if (recorder && recorder.state !== "inactive") recorder.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  async function stop() {
    if (stopping) return;
    setStopping(true);
    try {
      await endStream({ data: { streamId } });
      toast.success("Diretta terminata.");
    } catch {
      toast.error("Non riesco a chiudere la diretta.");
    } finally {
      onEnded();
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <p>{error}</p>
        <Button variant="ghost" className="mt-2 h-11 w-full" onClick={onEnded}>
          Chiudi
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <video ref={videoRef} playsInline className="aspect-video w-full object-cover" />
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          <Radio className="size-3 animate-pulse" /> DIRETTA
        </span>
      </div>
      <Button variant="destructive" className="h-11" onClick={() => void stop()} disabled={stopping}>
        {stopping ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
        Termina la diretta
      </Button>
    </div>
  );
}

function Viewer({ streamId, onClose }: { streamId: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const [ended, setEnded] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const fetchSegments = useServerFn(listStreamSegments);

  useEffect(() => {
    let cancelled = false;
    let lastSeq = -1;
    let endedSeen = false;

    const playNext = () => {
      const video = videoRef.current;
      const next = queueRef.current.shift();
      if (!video || !next) {
        playingRef.current = false;
        return;
      }
      playingRef.current = true;
      setWaiting(false);
      video.src = next;
      void video.play().catch(() => {
        playingRef.current = false;
      });
    };

    async function poll() {
      try {
        const result = await fetchSegments({ data: { streamId, afterSeq: lastSeq } });
        if (cancelled) return;
        for (const seg of result.segments) {
          queueRef.current.push(seg.url);
          lastSeq = Math.max(lastSeq, seg.seq);
        }
        if (result.status === "ended") endedSeen = true;
        if (!playingRef.current && queueRef.current.length > 0) playNext();
        if (endedSeen && queueRef.current.length === 0 && !playingRef.current) {
          setEnded(true);
          setWaiting(false);
        }
      } catch {
        /* riprova al prossimo giro */
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      queueRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-black">
        <video
          ref={videoRef}
          playsInline
          controls
          className="aspect-video w-full object-cover"
          onEnded={() => {
            const next = queueRef.current.shift();
            const video = videoRef.current;
            if (video && next) {
              video.src = next;
              void video.play().catch(() => undefined);
            } else {
              playingRef.current = false;
              setWaiting(true);
            }
          }}
        />
        {!ended && (
          <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
            <Radio className="size-3 animate-pulse" /> DIRETTA
          </span>
        )}
        {waiting && !ended && (
          <p className="absolute inset-x-0 bottom-2 text-center text-xs text-white/80">
            In attesa del video…
          </p>
        )}
      </div>
      {ended && <p className="text-center text-sm text-muted-foreground">La diretta è terminata.</p>}
      <Button variant="ghost" className="h-11" onClick={onClose}>
        Chiudi
      </Button>
    </div>
  );
}
