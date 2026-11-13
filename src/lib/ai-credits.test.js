import { expect, test } from "bun:test";

import { AI_CREDIT_PACKS, FREE_AI_CREDITS, CREDIT_PACKS, REFUND_DAYS, transactionCredits, refundedCredits, cumulativeRefundedCredits, isBillingEmail } from "./credit-catalog";

test("ogni utente riceve 10 crediti IA gratuiti", () => {
  expect(FREE_AI_CREDITS).toBe(10);
});

test("prezzi confermati in centesimi EUR", () => {
  expect(CREDIT_PACKS.map(p => p.amount)).toEqual([299,999,3999]);
});
test("garanzia confermata di 30 giorni", () => { expect(REFUND_DAYS).toBe(30); });
test("acquisto multi-articolo e quantità", () => {
  expect(transactionCredits([{price:{importMeta:{externalId:"ai_credits_50_eur"}},quantity:2},{price:{importMeta:{externalId:"ai_credits_200_eur"}},quantity:1}]).reduce((n,p) => n+p.credits,0)).toBe(300);
});
test("articoli e quantità non validi non accreditano", () => {
  expect(() => transactionCredits([{price:{importMeta:{externalId:"unknown"}},quantity:1}])).toThrow();
  expect(() => transactionCredits([{price:{importMeta:{externalId:"ai_credits_50_eur"}},quantity:-1}])).toThrow();
});
const purchase = { credits: 50, items: [{ priceId:"ai_credits_50_eur", credits:50, quantity:1 }] };
const transaction = { items:[{price:{id:"pri_50"}}], details:{line_items:[{id:"line_50",price_id:"pri_50",totals:{total:"299"}}]} };
test("rimborso in attesa non scala crediti", () => {
  expect(refundedCredits(purchase,{action:"refund",status:"pending_approval",items:[{item_id:"line_50",type:"full"}]},transaction)).toBe(0);
});
test("rimborso approvato completo scala 50 crediti", () => {
  expect(refundedCredits(purchase,{action:"refund",status:"approved",items:[{item_id:"line_50",type:"full"}]},transaction)).toBe(50);
});
test("rimborso parziale scala solo la proporzione", () => {
  expect(refundedCredits(purchase,{action:"refund",status:"approved",items:[{item_id:"line_50",type:"partial",amount:"125",totals:{total:"150"}}]},transaction)).toBe(25);
});
test("ricevute non inviate a indirizzi telefonici sintetici", () => {
  expect(isBillingEmail("123@telefono.traduchat.app")).toBe(false);
  expect(isBillingEmail("customer@example.com")).toBe(true);
});

test("i pacchetti venduti accreditano 50, 200 e 1000 crediti", () => {
  expect(AI_CREDIT_PACKS.ai_credits_50_eur).toBe(50);
  expect(AI_CREDIT_PACKS.ai_credits_200_eur).toBe(200);
  expect(AI_CREDIT_PACKS.ai_credits_1000_eur).toBe(1000);
  expect(Object.keys(AI_CREDIT_PACKS)).toHaveLength(3);
});

test("più rimborsi piccoli si arrotondano solo sul totale", () => {
 const a=Array.from({length:10},(_,i)=>({id:`a${i}`,action:"refund",status:"approved",items:[{item_id:"line_50",type:"partial",totals:{total:"3"}}]}));
 expect(cumulativeRefundedCredits(purchase,a,transaction)).toBe(5);
});
test("annullare una contestazione ripristina i crediti", () => {
 const items=[{item_id:"line_50",type:"full"}];
 expect(cumulativeRefundedCredits(purchase,[{action:"chargeback",status:"approved",items},{action:"chargeback_reverse",status:"approved",items}],transaction)).toBe(0);
});
