import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/** Formats seconds as m:ss. */
function fmt(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const total = Math.floor(value);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [1, 1.5, 2] as const;

/** Compact voice-message player with progress bar, time and speed control. */
export default function AudioPlayer({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = speed;
  }, [speed]);

  // A new source resets the player state.
  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setReady(false);
  }, [src]);

  function toggle() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.playbackRate = speed;
      void el.play();
    } else {
      el.pause();
    }
  }

  function seek(event: React.ChangeEvent<HTMLInputElement>) {
    const el = ref.current;
    const value = Number(event.target.value);
    setCurrent(value);
    if (el && Number.isFinite(value)) el.currentTime = value;
  }

  const max = duration > 0 ? duration : 0;
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;

  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-full bg-black/10 px-2 py-1.5 dark:bg-white/10",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Metti in pausa" : "Ascolta il messaggio vocale"}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-current/15 transition hover:bg-current/25"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-current/25">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-current"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={max || 1}
            step={0.01}
            value={current}
            onChange={seek}
            disabled={!ready || max === 0}
            aria-label="Posizione di ascolto"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] tabular-nums opacity-80">
          <span>{fmt(current)}</span>
          <span>{max > 0 ? fmt(max) : "--:--"}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          const next = SPEEDS[(SPEEDS.indexOf(speed as 1) + 1) % SPEEDS.length] ?? 1;
          setSpeed(next);
        }}
        aria-label="Cambia velocità di ascolto"
        className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums bg-current/15 transition hover:bg-current/25"
      >
        {speed}x
      </button>

      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          setDuration(Number.isFinite(d) ? d : 0);
          setReady(true);
        }}
        onDurationChange={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d)) setDuration(d);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
        className="hidden"
      />
    </div>
  );
}
