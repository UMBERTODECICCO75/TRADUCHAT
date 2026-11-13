import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gatewayFetch } from "@/lib/paddle.server";
import { CREDIT_PACKS, billingEnvironment, isBillingEmail } from "./credit-catalog";
export { AI_CREDIT_PACKS, FREE_AI_CREDITS } from "./credit-catalog";

/** Crediti IA concessi da ogni pacchetto (id prezzo umano-leggibile → crediti). */
export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ priceId: z.enum(["ai_credits_50_eur", "ai_credits_200_eur", "ai_credits_1000_eur"]), environment: z.enum(["sandbox", "live"]) }).parse(input))
  .handler(async ({ data }) => {
    const response = await gatewayFetch(
      billingEnvironment(),
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    if (!response.ok) throw new Error("Prezzo temporaneamente non disponibile.");
    const result = await response.json();
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0].id as string;
  });

/** Saldo crediti IA dell'utente: alla prima lettura assegna i crediti gratuiti. */
export const getAiCreditBalance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const environment = billingEnvironment();
    const { reconcileCredits } = await import("./credit-reconciliation.server");
    await reconcileCredits(supabaseAdmin, context.userId, environment);
    const { data, error } = await supabaseAdmin.rpc("ensure_credit_balance", { p_user_id: context.userId, p_environment: environment });
    if (error) throw new Error("Saldo crediti non disponibile.");
    return { balance: data, environment };
  });

const ConsumeInput = z.object({}).optional();

/** Scala 1 credito prima di una risposta IA. Errore se il saldo è esaurito. */
export const consumeAiCredit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConsumeInput.parse(input))
  .handler(async () => { throw new Error("I crediti vengono utilizzati solo dalle risposte dell'assistente."); });

/** Storico delle ricariche dell'utente, dalla più recente. */
export const listAiCreditPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ offset: z.number().int().min(0).default(0), orderId: z.string().uuid().optional() }).default({ offset: 0 }).parse(input))
  .handler(async ({ data: input, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { reconcileCredits } = await import("./credit-reconciliation.server");
    const environment = billingEnvironment();
    await reconcileCredits(supabaseAdmin, context.userId, environment);
    let query = context.supabase
      .from("ai_credit_purchases")
      .select("id, price_id, credits, environment, refunded_at, refunded_credits, items, created_at")
      .eq("environment", environment).eq("user_id", context.userId)
      .order("created_at", { ascending: false }).order("id").range(input.offset, input.offset + 19);
    if (input.orderId) {
      const { data: order, error } = await context.supabase.from("ai_checkout_orders").select("paddle_transaction_id").eq("id", input.orderId).eq("user_id", context.userId).maybeSingle();
      if (error) throw error;
      if (!order?.paddle_transaction_id) return { purchases: [], hasMore: false, environment };
      query = query.eq("paddle_transaction_id", order.paddle_transaction_id);
    }
    const { data, error } = await query;
    if (error) throw new Error("Storico ricariche non disponibile.");
    return { purchases: data ?? [], hasMore: data?.length === 20, environment };
  });

/**
 * Controlla i rimborsi sul gestore dei pagamenti e scala i crediti corrispondenti.
 * Chiamata alla lettura del saldo: idempotente grazie a refunded_at.
 */
export const syncAiCreditRefunds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ environment: z.enum(["sandbox", "live"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { reconcileCredits } = await import("./credit-reconciliation.server");
    return reconcileCredits(supabaseAdmin, context.userId, billingEnvironment());
  });

export const createCreditCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ priceId: z.enum(["ai_credits_50_eur", "ai_credits_200_eur", "ai_credits_1000_eur"]), billingEmail: z.string().email().max(200).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const environment = billingEnvironment();
    const email = data.billingEmail || (context.claims["email"] as string | undefined);
    if (!isBillingEmail(email)) throw new Error("Inserisci un'email reale per ricevere la ricevuta.");
    const response = await gatewayFetch(environment, `/prices?external_id=${encodeURIComponent(data.priceId)}`);
    if (!response.ok) throw new Error("Prezzo non disponibile.");
    const price = (await response.json()).data?.[0];
    const pack = CREDIT_PACKS.find(p => p.priceId === data.priceId);
    if (!pack || !price || price.status !== "active" || price.billing_cycle || price.unit_price?.currency_code !== "EUR" || Number(price.unit_price?.amount) !== pack.amount) throw new Error("Il prezzo è in aggiornamento. Riprova più tardi.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error: quotaError } = await supabaseAdmin.rpc("bump_translation_usage", { _key: `checkout:${context.userId}`, _limit: 20, _window: "01:00:00" });
    if (quotaError || allowed !== true) throw new Error("Troppe richieste di pagamento. Riprova più tardi.");
    const { data: order, error } = await supabaseAdmin.from("ai_checkout_orders").insert({ user_id: context.userId, environment, price_id: data.priceId }).select("id").single();
    if (error) throw new Error("Non riesco a preparare la ricarica.");
    const transactionResponse = await gatewayFetch(environment, "/transactions", { method: "POST", body: JSON.stringify({ items: [{ price_id: price.id, quantity: 1 }], custom_data: { userId: context.userId, orderId: order.id }, collection_mode: "automatic" }) });
    if (!transactionResponse.ok) throw new Error(environment === "live" ? "I pagamenti reali non sono ancora disponibili: il venditore deve completare la verifica." : "Pagamento di prova non disponibile. Riprova.");
    const transaction = (await transactionResponse.json()).data;
    if (!transaction?.id) throw new Error("Pagamento non disponibile.");
    const { error: bindError } = await supabaseAdmin.from("ai_checkout_orders").update({ paddle_transaction_id: transaction.id }).eq("id", order.id);
    if (bindError) throw new Error("Non riesco a collegare la ricarica.");
    return { orderId: order.id, transactionId: transaction.id, email, environment };
  });
