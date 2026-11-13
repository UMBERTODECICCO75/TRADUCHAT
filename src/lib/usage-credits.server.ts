// Pay-per-use translation credits on the existing atomic credit ledger.
// Chat/voice: 1 credit per translated message. Calls: 1 credit per started minute, paid by the participant with the most credits.
import { billingEnvironment } from "./credit-catalog";

export const NO_CREDITS = "Crediti esauriti: ricarica per continuare a tradurre.";

/** Deterministic UUID so the same call minute is never charged twice. */
async function stableUuid(key: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))).slice(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Call minute that should be paid now: minute 1 at start, then one more each 60 s. */
export function dueCallMinute(startedAt: string, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000)) + 1;
}

async function reserve(userId: string, requestId: string, label: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const environment = billingEnvironment();
  const { data, error } = await supabaseAdmin.rpc("reserve_answer_credit", {
    p_request_id: requestId, p_user_id: userId, p_environment: environment, p_question: label,
  });
  if (error) throw new Error(error.message.includes("esauriti") ? NO_CREDITS : "Crediti non disponibili, riprova.");
  return { db: supabaseAdmin, reserved: (data as { reserved: boolean }).reserved };
}

/** Charges 1 credit around a translation; the credit is returned if the work fails. */
export async function withTranslationCredit<T>(userId: string, kind: "chat" | "voice", work: () => Promise<T>) {
  const requestId = crypto.randomUUID();
  const { db } = await reserve(userId, requestId, `[consumo] ${kind}`);
  try {
    const result = await work();
    await db.rpc("settle_answer_credit", { p_request_id: requestId, p_user_id: userId, p_answer: kind });
    return result;
  } catch (err) {
    await db.rpc("settle_answer_credit", { p_request_id: requestId, p_user_id: userId });
    throw err;
  }
}

/** Charges every started minute of an active call (idempotent per minute) to the participant with the most credits. */
export async function chargeCallMinutes(callId: string, participantIds: string[], startedAt: string) {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { callPayerOrder } = await import("./call-payer");
  const environment = billingEnvironment();
  const people = [...new Set(participantIds)];
  const due = dueCallMinute(startedAt);
  // Every started minute is checked, so skipped heartbeats are still charged exactly once.
  for (let minute = 1; minute <= due; minute++) {
    const requestId = await stableUuid(`call:${callId}:${minute}`);
    const paid = async () => !!(await db.from("ai_answer_requests").select("id").eq("id", requestId).maybeSingle()).data;
    if (await paid()) continue;
    for (const id of people) await db.rpc("ensure_credit_balance", { p_user_id: id, p_environment: environment });
    const { data: rows } = await db.from("ai_credit_balances").select("user_id,balance").eq("environment", environment).in("user_id", people);
    let charged = false;
    for (const payer of callPayerOrder(rows ?? [])) {
      const { data, error } = await db.rpc("reserve_answer_credit", {
        p_request_id: requestId, p_user_id: payer, p_environment: environment, p_question: `[consumo] videochiamata ${callId} min ${minute}`,
      });
      if (error) { if (await paid()) { charged = true; break; } continue; }
      if ((data as { reserved: boolean }).reserved) await db.rpc("settle_answer_credit", { p_request_id: requestId, p_user_id: payer, p_answer: "call_minute" });
      charged = true; break;
    }
    if (!charged && !(await paid())) throw new Error(NO_CREDITS);
  }
}
