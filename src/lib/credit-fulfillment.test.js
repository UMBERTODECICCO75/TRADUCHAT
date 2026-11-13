import { expect, test } from "bun:test";
import { fulfillCompletedTransaction } from "./credit-fulfillment.server";

const order = { id: "order", user_id: "user", price_id: "ai_credits_50_eur", paddle_transaction_id: "txn_paid" };
const event = { id: "txn_paid", status: "completed", items: [{ price: { id: "pri_50" }, quantity: 1 }] };
const completed = { ...event, custom_data: { userId: "user" }, items: [{ price: { id: "pri_50", import_meta: { external_id: "ai_credits_50_eur" } }, quantity: 1 }] };
function database(boundOrder = order) {
  const calls = [];
  const filters = [];
  let balance = 10;
  const seen = new Set();
  const query = { select: () => query, eq: (key,value) => { filters.push([key,value]); return query; }, single: async () => ({ data: boundOrder, error: null }) };
  return { calls, filters, from: () => query, rpc: async (name,args) => {
    calls.push({ name, args });
    if (!seen.has(args.p_transaction_id)) { balance += args.p_credits; seen.add(args.p_transaction_id); }
    return { data: balance, error: null };
  } };
}
test("signed completion without metadata resolves provider catalog and grants 50 once", async () => {
  const db = database();
  const fetched = [];
  const load = async (id, env) => { fetched.push([id,env]); return completed; };
  await fulfillCompletedTransaction(db,event,"live",load);
  await fulfillCompletedTransaction(db,event,"live",load);
  expect(fetched).toEqual([["txn_paid","live"],["txn_paid","live"]]);
  expect(db.calls[0].args.p_credits).toBe(50);
  expect(db.calls[0].args.p_items).toEqual([{priceId:"ai_credits_50_eur",quantity:1,credits:50}]);
  expect(db.filters).toContainEqual(["paddle_transaction_id","txn_paid"]);
  expect((await db.rpc("fulfill_credit_order",db.calls[0].args)).data).toBe(60);
});
test("an unpaid provider transaction never grants credits", async () => {
  const db = database();
  await expect(fulfillCompletedTransaction(db,event,"live",async () => ({...completed,status:"ready"}))).rejects.toThrow();
  expect(db.calls).toHaveLength(0);
});
test("an unbound payment cannot use custom data to grant credits", async () => {
  const db = database(null);
  await expect(fulfillCompletedTransaction(db,completed,"live")).rejects.toThrow();
  expect(db.calls).toHaveLength(0);
});
test("a mismatched account or catalog never grants credits", async () => {
  for (const data of [{...completed,custom_data:{userId:"other"}}, {...completed,items:[{price:{import_meta:{external_id:"ai_credits_200_eur"}},quantity:1}]}]) {
    const db = database();
    await expect(fulfillCompletedTransaction(db,data,"live")).rejects.toThrow();
    expect(db.calls).toHaveLength(0);
  }
});