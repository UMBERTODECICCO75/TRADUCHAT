import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AssistantImage, assistantReservationQuestion } from "./assistant-images";
import { assistantQuotaAllowed } from "./assistant-preflight";
import { LANGUAGES } from "./languages";

const AskInput = z.object({
  question: z.string().min(2).max(1000),
  ticket: z.string().min(10).max(400),
  requestId: z.string().uuid(),
  image: AssistantImage.optional(),
  tone: z.enum(["informale", "formale"]).default("informale"),
  language: z.enum(LANGUAGES).default("Italiano"),
});

function clientKey() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

/** Answers a free question from the home page bar. */
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data, context }) => {
    const { verifyTicket, withinQuota } = await import("./translate-ticket.server");

    const ticketId = await verifyTicket(data.ticket);
    if (!ticketId) throw new Error("Sessione scaduta, ricarica la pagina.");

    const ok = await assistantQuotaAllowed(withinQuota, ticketId, clientKey());
    if (!ok) throw new Error("Hai raggiunto il limite di domande, riprova più tardi.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { billingEnvironment } = await import("./credit-catalog");
    const { reconcileCredits } = await import("./credit-reconciliation.server");
    const environment = billingEnvironment();
    const [, reservationQuestion] = await Promise.all([
      reconcileCredits(supabaseAdmin, context.userId, environment),
      assistantReservationQuestion(data.question, data.image),
    ]);
    const { data: reservation, error } = await supabaseAdmin.rpc("reserve_answer_credit", { p_request_id: data.requestId, p_user_id: context.userId, p_environment: environment, p_question: reservationQuestion });
    if (error) throw new Error(error.message.includes("Crediti IA esauriti") ? "Crediti IA esauriti: ricarica per continuare." : "Richiesta non disponibile.");
    const saved = reservation as { reserved: boolean; status: string; answer?: string; balance: number };
    if (!saved.reserved) {
      if (saved.status === "completed" && saved.answer) return { answer: saved.answer, balance: saved.balance };
      throw new Error(saved.status === "pending" ? "La risposta è ancora in elaborazione." : "La risposta precedente non è riuscita. Invia una nuova domanda.");
    }
    try {
      const { answerQuestion } = await import("./assistant.server");
      const answer = await answerQuestion({ question: data.question, image: data.image, tone: data.tone, language: data.language });
      if (!answer.trim()) throw new Error("Risposta non disponibile.");
      const settled = await supabaseAdmin.rpc("settle_answer_credit", { p_request_id: data.requestId, p_user_id: context.userId, p_answer: answer });
      if (settled.error) throw settled.error;
      return { answer, balance: settled.data };
    } catch (err) {
      const released = await supabaseAdmin.rpc("settle_answer_credit", { p_request_id: data.requestId, p_user_id: context.userId });
      if (released.error) throw new Error("Risposta non riuscita; il credito è in verifica.");
      throw err;
    }
  });
