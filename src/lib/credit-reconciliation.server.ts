import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { gatewayFetch, type PaddleEnv } from "./paddle.server";
import { cumulativeRefundedCredits } from "./credit-catalog";
import { recoverCompletedOrders } from "./credit-fulfillment.server";

export async function reconcileCredits(db: SupabaseClient<Database>, userId: string, env: PaddleEnv) {
  const { error: recoveryError } = await db.rpc("recover_answer_credits", { p_user_id: userId, p_environment: env });
  if (recoveryError) throw new Error("Recupero crediti temporaneamente non disponibile.");
  await recoverCompletedOrders(db,userId,env);
  let offset = 0;
  let refunded = 0;
  while (true) {
    const { data: purchases, error } = await db.from("ai_credit_purchases").select("id,paddle_transaction_id,credits,items,refunded_credits")
      .eq("user_id", userId).eq("environment", env).order("id").range(offset, offset + 49);
    if (error) throw new Error("Controllo ricariche non disponibile.");
    for (const purchase of purchases ?? []) {
      const adjustments: any[] = [];
      let after = "";
      do {
        const response = await gatewayFetch(env, `/adjustments?transaction_id=${encodeURIComponent(purchase.paddle_transaction_id)}&per_page=100${after}`);
        if (!response.ok) throw new Error("Controllo rimborsi temporaneamente non disponibile.");
        const result = await response.json();
        adjustments.push(...(result.data ?? []).filter((a: any) => a.status === "approved" && ["refund","chargeback","chargeback_reverse"].includes(a.action)));
        const next = result.meta?.pagination?.has_more ? result.meta?.pagination?.next : null;
        const cursor = next ? new URL(next).searchParams.get("after") : null;
        after = cursor ? `&after=${encodeURIComponent(cursor)}` : "";
      } while (after);
      if (adjustments.length) {
        const transactionResponse = await gatewayFetch(env, `/transactions/${encodeURIComponent(purchase.paddle_transaction_id)}`);
        if (!transactionResponse.ok) throw new Error("Dettagli acquisto non disponibili.");
        const transaction = (await transactionResponse.json()).data;
        const credits = cumulativeRefundedCredits(purchase,adjustments,transaction);
        const { data, error: applyError } = await db.rpc("reconcile_purchase_adjustments", { p_purchase_id: purchase.id, p_snapshot: adjustments.map(a=>a.id).sort(), p_target: credits });
        if (applyError) throw applyError;
        refunded += data > 0 ? 1 : 0;
      }
    }
    if (!purchases || purchases.length < 50) break;
    offset += 50;
  }
  return { refunded };
}