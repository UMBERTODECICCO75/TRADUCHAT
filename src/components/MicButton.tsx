import { useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { transcribeVoice } from "@/lib/speech.functions";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { useTranslationTicket } from "@/lib/useTranslationTicket";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Records the voice, turns it into text and hands the text back. */
export function MicButton({
  language,
  onText,
  className,
  label = "Parla",
}: {
  language: string;
  onText: (text: string) => void;
  className?: string;
  label?: string;
}) {
  const { recording, start, stop } = useVoiceRecorder();
  const transcribe = useServerFn(transcribeVoice);
  const ensureTicket = useTranslationTicket();
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
      const ticket = await ensureTicket();
      const result = await transcribe({ data: { audio, language, ticket } });
      if (!result.text) {
        toast.error("Non ho capito nulla: riprova a parlare più vicino al microfono.");
        return;
      }
      onText(result.text);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trascrizione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={recording ? "destructive" : "secondary"}
      onClick={() => void toggle()}
      disabled={busy}
      aria-label={recording ? "Ferma la registrazione" : `${label} in ${language}`}
      className={cn("gap-2", className)}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : recording ? (
        <Square className="size-4" />
      ) : (
        <Mic className="size-4" />
      )}
      {busy ? "Trascrivo…" : recording ? "Ferma" : label}
    </Button>
  );
}
