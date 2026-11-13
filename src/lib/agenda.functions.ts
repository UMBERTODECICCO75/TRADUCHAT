import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Stores explicitly selected email reminders; legacy call requests are rejected. */
export const scheduleAgendaEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; text: string; remindAt: string; call?: boolean; email?: boolean }) =>
    z
      .object({ id: z.string().uuid(), text: z.string().trim().min(1).max(300), remindAt: z.string().datetime(), call: z.boolean().optional(), email: z.boolean().optional() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (new Date(data.remindAt).getTime() <= Date.now()) throw new Error("Scegli una data e un'ora future.");
    if (data.call) {
      throw new Error("Gli avvisi telefonici Da ricordare sono stati rimossi. Puoi condividere l'appunto su WhatsApp.");
    }
    const { error } = await context.supabase.from("agenda_reminders").insert({
      id: data.id,
      user_id: context.userId,
      text: data.text,
      remind_at: data.remindAt,
      send_sms: false,
      send_call: false,
      send_email: data.email === true,
    });
    if (error) throw new Error("Non riesco a programmare l'avviso.");
    return { ok: true };
  });

export const cancelAgendaEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("agenda_reminders").delete().eq("id", data.id);
    return { ok: true };
  });
