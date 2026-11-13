import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TranscribeInput = z.object({
  /** base64 of a complete WAV file (16 kHz mono is plenty). */
  audio: z.string().min(100).max(8_000_000),
  language: z.string().min(2).max(40).optional(),
  ticket: z.string().min(10).max(400),
});

function clientKey() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeInput.parse(input))
  .handler(async ({ data }) => {
    const { verifyTicket, withinQuota } = await import("./translate-ticket.server");

    const ticketId = await verifyTicket(data.ticket);
    if (!ticketId) throw new Error("Sessione scaduta, ricarica la pagina.");

    const ok =
      (await withinQuota(`v:${ticketId}`, 30, 600)) &&
      (await withinQuota(`vr:${clientKey()}`, 120, 3600));
    if (!ok) throw new Error("Hai raggiunto il limite dei messaggi vocali, riprova più tardi.");

    const { transcribeWav, LANGUAGE_CODES } = await import("./speech.server");
    return transcribeWav({
      base64: data.audio,
      language: data.language ? LANGUAGE_CODES[data.language] : undefined,
    });
  });
