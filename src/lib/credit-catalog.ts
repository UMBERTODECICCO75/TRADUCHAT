export const CREDIT_PACKS = [
  { priceId: "ai_credits_50_eur", credits: 50, amount: 299 },
  { priceId: "ai_credits_200_eur", credits: 200, amount: 999 },
  { priceId: "ai_credits_1000_eur", credits: 1000, amount: 3999 },
] as const;
export const FREE_AI_CREDITS = 10;
export const REFUND_DAYS = 30;
export const AI_CREDIT_PACKS: Record<string, number> = Object.fromEntries(CREDIT_PACKS.map(p => [p.priceId, p.credits]));
export const formatCreditPrice = (amount: number) => new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(amount / 100);
export function billingEnvironment(): "sandbox" | "live" {
  const token = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"];
  if (!token) throw new Error("Pagamenti temporaneamente non disponibili.");
  return token.startsWith("test_") ? "sandbox" : "live";
}
export function isBillingEmail(email: string | undefined | null): email is string {
  return Boolean(email && !email.toLowerCase().endsWith("@telefono.traduchat.app"));
}
export function transactionCredits(items: Array<{ price?: { importMeta?: { externalId?: string } }; quantity?: number }>) {
  return items.map(item => {
    const priceId = item.price?.importMeta?.externalId;
    const credits = priceId ? AI_CREDIT_PACKS[priceId] : undefined;
    const quantity = item.quantity;
    if (!priceId || !credits || !Number.isInteger(quantity) || !quantity || quantity < 1 || quantity > 100) throw new Error("Articolo non valido.");
    return { priceId, quantity, credits: credits * quantity };
  });
}
export function refundedCredits(purchase: { credits: number; items: unknown }, adjustment: any, transaction: any): number {
  return cumulativeRefundedCredits(purchase,[adjustment],transaction);
}
export function cumulativeRefundedCredits(purchase: { credits: number; items: unknown }, adjustments: any[], transaction: any): number {
  const stored = Array.isArray(purchase.items) ? purchase.items : [];
  const lines = transaction.details?.line_items ?? transaction.details?.lineItems ?? [];
  const fractions = new Map<string, number>();
  for (const adjustment of adjustments) {
  if (adjustment.status !== "approved" || !["refund", "chargeback", "chargeback_reverse"].includes(adjustment.action)) continue;
  for (const refund of adjustment.items ?? []) {
    const line = lines.find((l: any) => l.id === (refund.item_id ?? refund.itemId));
    if (!line) throw new Error("Dettagli del rimborso non disponibili.");
    const priceId = line.price_id ?? line.priceId;
    const index = (transaction.items ?? []).findIndex((i: any) => i.price?.id === priceId);
    const pack = stored[index];
    if (!pack) throw new Error("Articolo rimborsato non riconosciuto.");
    const adjustedTotal = refund.totals?.total;
    if (refund.type !== "full" && (adjustedTotal == null || !Number(line.totals?.total))) throw new Error("Importo rimborso non disponibile.");
    const fraction = refund.type === "full" ? 1 : Number(adjustedTotal) / Number(line.totals.total);
    if (!Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new Error("Importo rimborso non valido.");
    fractions.set(line.id,(fractions.get(line.id) ?? 0) + (adjustment.action === "chargeback_reverse" ? -fraction : fraction));
  }
  if (!(adjustment.items?.length)) throw new Error("Articoli del rimborso mancanti.");
  }
  const total = lines.reduce((sum: number,line: any) => {
    const index = (transaction.items ?? []).findIndex((i: any) => i.price?.id === (line.price_id ?? line.priceId));
    return sum + (stored[index]?.credits ?? 0) * Math.min(1,Math.max(0,fractions.get(line.id) ?? 0));
  },0);
  return Math.min(purchase.credits, Math.round(total));
}