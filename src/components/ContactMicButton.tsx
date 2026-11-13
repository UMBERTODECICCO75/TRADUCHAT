import { useState } from "react";
import { Loader2, Mic, Square, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { sendRoomVoice } from "@/lib/rooms.functions";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { getPreferredLanguage } from "@/lib/preferred-language";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Records a voice message and sends it straight to the conversation shared
 * with this contact, translated for them like a voice message in the room.
 */
export function ContactMicButton({
  name,
  roomCode,
  langA,
  langB,
  direct = false,
  fromLang,
  className,
}: {
  name: string;
  roomCode: string;
  langA: string;
  langB: string;
  direct?: boolean;
  /** Spoken language chosen by the sender (groups); overrides inference. */
  fromLang?: string | undefined;
  className?: string | undefined;
}) {
  const { recording, start, stop, cancel } = useVoiceRecorder();
  const sendVoice = useServerFn(sendRoomVoice);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    if (!recording) {
      try {
        await start();
      } catch {
        toast.error("Non riesco ad accedere al microfono: consenti l'accesso e riprova.");
      }
      return;
    }
    const audio = await stop();
    if (!audio) {
      toast.error("Registrazione troppo breve: tieni premuto e parla.");
      return;
    }
    setBusy(true);
    try {
      const preferred = getPreferredLanguage();
      const iAmA =
        direct || langA === langB || (preferred ? preferred === langA : true);
      const from = fromLang ?? (iAmA ? langA : langB);
      const to = from === langB ? langA : langB;
      await sendVoice({ data: { code: roomCode, audio, from, to } });
      toast.success(`Vocale inviato a ${name}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vocale non inviato, riprova.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={recording ? "destructive" : "secondary"}
        size="icon"
        className={cn("shrink-0", className)}
        onClick={() => void toggle()}
        disabled={busy}
        aria-label={
          busy
            ? `Invio il vocale a ${name}`
            : recording
              ? `Ferma la registrazione per ${name}`
              : `Registra un vocale per ${name}`
        }
        title={recording ? "Ferma e invia il vocale" : "Registra un vocale tradotto"}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : recording ? (
          <Square className="size-4" />
        ) : (
          <Mic className="size-4" />
        )}
      </Button>
      {recording && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("shrink-0", className)}
          onClick={() => cancel()}
          disabled={busy}
          aria-label={`Annulla il vocale per ${name}`}
          title="Annulla la registrazione"
        >
          <X className="size-4" />
        </Button>
      )}
    </>
  );
}
