import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LANGUAGES } from "./languages";

const Input = z.object({
  received: z.string().trim().min(5).max(8000),
  notes: z.string().trim().max(1000).default(""),
  language: z.enum(LANGUAGES),
});

/** Prepares an AI reply draft for an email the user pasted. */
export const draftReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { withinQuota } = await import("./translate-ticket.server");
    if (!(await withinQuota(`mailreply:${context.userId}`, 20, 3600)))
      throw new Error("Hai raggiunto il limite di risposte, riprova più tardi.");
    const { draftEmailReply } = await import("./email-reply.server");
    return { reply: await draftEmailReply(data) };
  });

const SpeakInput = z.object({
  text: z.string().trim().min(2).max(700),
});

/** Reads a short reply out loud as a voice message (WAV, base64). */
export const speakReplyVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SpeakInput.parse(input))
  .handler(async ({ data, context }) => {
    const { withinQuota } = await import("./translate-ticket.server");
    // Burst cap first, then the hourly cap: both must allow the request.
    const [burst, hourly] = await Promise.all([
      withinQuota(`mailspeakb:${context.userId}`, 10, 600),
      withinQuota(`mailspeak:${context.userId}`, 30, 3600),
    ]);
    if (!burst || !hourly)
      throw new Error("Hai raggiunto il limite di messaggi vocali, riprova più tardi.");
    const { speakReply } = await import("./speak-reply.server");
    return speakReply(data.text);
  });
