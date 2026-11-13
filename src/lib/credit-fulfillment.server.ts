import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PaddleEnv } from "./paddle.server";
import { transactionCredits } from "./credit-catalog";

async function loadTransaction(id: string, env: PaddleEnv) {
  const { gatewayFetch } = await import("./paddle.server");
  const response = await gatewayFetch(env, `/transactions/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error("Verifica pagamento temporaneamente non disponibile.");
  return (await response.json()).data;
}

export async function fulfillCompletedTransaction(db: SupabaseClient<Database>, transaction: any, env: PaddleEnv, fetchTransaction = loadTransaction) {
  const transactionId = transaction?.id;
  if (!transactionId || transaction.status !== "completed") throw new Error("Pagamento non completato.");
  // Signed transaction events omit import_meta. Resolve the catalog through the
  // authenticated provider read, never infer credits from amounts or browser data.
  if (!(transaction.items?.length) || transaction.items.some((i: any) => !(i.price?.importMeta?.externalId ?? i.price?.import_meta?.external_id))) {
    transaction = await fetchTransaction(transactionId, env);
    if (transaction?.id !== transactionId || transaction.status !== "completed") throw new Error("Pagamento non completato.");
  }
  const custom = transaction.customData ?? transaction.custom_data;
  const normalizedItems = (transaction.items ?? []).map((i: any) => ({ ...i, price: { ...i.price, importMeta: i.price?.importMeta ?? { externalId: i.price?.import_meta?.external_id } } }));
  const items = transactionCredits(normalizedItems);
  const first = items[0];
  if (!first) throw new Error("Articoli mancanti.");
  const query = db.from("ai_checkout_orders").select("id,user_id,price_id,paddle_transaction_id").eq("environment",env).eq("paddle_transaction_id",transactionId);
  const { data: order, error } = await query.single();
  if (error || !order || (custom?.userId && custom.userId !== order.user_id) || (custom?.orderId && custom.orderId !== order.id) || items.some(i => i.priceId !== order.price_id) || order.paddle_transaction_id !== transactionId) throw new Error("Ordine non riconosciuto.");
  const { error: grantError } = await db.rpc("fulfill_credit_order",{p_order_id:order.id,p_transaction_id:transaction.id,p_environment:env,p_items:items,p_credits:items.reduce((n,i)=>n+i.credits,0),p_price_id:first.priceId});
  if (grantError) throw grantError;
}

export async function recoverCompletedOrders(db: SupabaseClient<Database>, userId: string, env: PaddleEnv) {
  const { gatewayFetch } = await import("./paddle.server");
  let offset=0;
  while(true) {
    const { data: orders,error } = await db.from("ai_checkout_orders").select("id,paddle_transaction_id").eq("user_id",userId).eq("environment",env).not("paddle_transaction_id","is",null).order("id").range(offset,offset+49);
    if(error) throw error;
    for (const order of orders ?? []) {
      const id=order.paddle_transaction_id;
      if(!id) continue;
      const {data: known,error: purchaseError}=await db.from("ai_credit_purchases").select("id").eq("paddle_transaction_id",id).maybeSingle();
      if(purchaseError) throw purchaseError;
      if(known) continue;
      const response=await gatewayFetch(env,`/transactions/${encodeURIComponent(id)}`);
      if(!response.ok) throw new Error("Verifica pagamento temporaneamente non disponibile.");
      const transaction=(await response.json()).data;
      if(transaction?.status==="completed") await fulfillCompletedTransaction(db,transaction,env);
    }
    if(!orders || orders.length<50) break;
    offset+=50;
  }
}