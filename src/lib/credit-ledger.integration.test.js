import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
test.skipIf(!url || !key)("ledger: concurrency, first purchase, replay, isolation, refunds and failed answers", async () => {
  const db = createClient(url,key,{ auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init) => {
    const h=new Headers(init?.headers);
    if(key.startsWith("sb_") && h.get("Authorization")===`Bearer ${key}`) h.delete("Authorization");
    h.set("apikey",key); return fetch(input,{...init,headers:h});
  }}});
  const email=`ledger-${crypto.randomUUID()}@example.com`; const password=crypto.randomUUID();
  const created = await db.auth.admin.createUser({ email, password,email_confirm:true });
  if(created.error || !created.data.user) throw new Error("Unable to create isolated ledger test account");
  const userId=created.data.user.id;
  async function rpc(name,args) { const r=await db.rpc(name,args); if(r.error) throw r.error; return r.data; }
  try {
    const profile=await db.from("profiles").upsert({id:userId}); if(profile.error) throw profile.error;
    const authClient=createClient(url,process.env.SUPABASE_PUBLISHABLE_KEY ?? key,{auth:{persistSession:false}});
    const signed=await authClient.auth.signInWithPassword({email,password}); if(signed.error) throw signed.error;
    const publicKey=process.env.SUPABASE_PUBLISHABLE_KEY;
    if(publicKey){
      const userDb=createClient(url,publicKey,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${signed.data.session.access_token}`}}});
      expect((await userDb.rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).error).not.toBeNull();
      expect((await userDb.from("ai_credit_balances").insert({user_id:userId,environment:"sandbox",balance:999})).error).not.toBeNull();
      expect((await userDb.from("user_roles").insert({user_id:userId,role:"admin"})).error).not.toBeNull();
      const privateIdentity=await db.from("phone_login_identities").insert({phone:`+999${Date.now()}`,user_id:userId}); if(privateIdentity.error) throw privateIdentity.error;
      const hidden=await userDb.from("phone_login_identities").select("*").eq("user_id",userId);
      expect(hidden.data ?? []).toHaveLength(0);
      expect((await userDb.from("account_deletion_requests").insert({user_id:userId,status:"completed"})).error).not.toBeNull();
      expect((await userDb.from("account_deletion_requests").insert({user_id:crypto.randomUUID()})).error).not.toBeNull();
      const request=await userDb.from("account_deletion_requests").insert({user_id:userId}).select("id,status").single();
      expect(request.error).toBeNull(); expect(request.data.status).toBe("requested");
      expect((await userDb.from("account_deletion_requests").insert({user_id:userId})).error).not.toBeNull();
      const support=await userDb.from("account_support_requests").insert({user_id:userId,category:"privacy",message:"Richiesta di prova"}).select("id").single(); expect(support.error).toBeNull();
    }
    const order=await db.from("ai_checkout_orders").insert({user_id:userId,environment:"sandbox",price_id:"ai_credits_50_eur",paddle_transaction_id:`test_${crypto.randomUUID()}`}).select("*").single(); if(order.error) throw order.error;
    const args={p_order_id:order.data.id,p_transaction_id:order.data.paddle_transaction_id,p_environment:"sandbox",p_items:[{priceId:"ai_credits_50_eur",credits:50,quantity:1}],p_credits:50,p_price_id:"ai_credits_50_eur"};
    const fulfilled=await Promise.all(Array.from({length:5},()=>rpc("fulfill_credit_order",args)));
    expect(fulfilled).toEqual([60,60,60,60,60]);
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"live"})).toBe(10);
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).toBe(60);
    const bad=await db.rpc("fulfill_credit_order",{...args,p_environment:"live"}); expect(bad.error).not.toBeNull();
    const requestId=crypto.randomUUID();
    const reserveArgs={p_request_id:requestId,p_user_id:userId,p_environment:"sandbox",p_question:"hello"};
    const reserved=await Promise.all([rpc("reserve_answer_credit",reserveArgs),rpc("reserve_answer_credit",reserveArgs)]);
    expect(reserved.filter(r=>r.reserved)).toHaveLength(1);
    expect(await rpc("settle_answer_credit",{p_request_id:requestId,p_user_id:userId})).toBe(60);
    expect(await rpc("settle_answer_credit",{p_request_id:requestId,p_user_id:userId})).toBe(60);
    const successId=crypto.randomUUID();
    expect((await rpc("reserve_answer_credit",{...reserveArgs,p_request_id:successId})).balance).toBe(59);
    expect(await rpc("settle_answer_credit",{p_request_id:successId,p_user_id:userId,p_answer:"Ciao"})).toBe(59);
    expect((await rpc("reserve_answer_credit",{...reserveArgs,p_request_id:successId})).answer).toBe("Ciao");
    const staleId=crypto.randomUUID();
    await rpc("reserve_answer_credit",{...reserveArgs,p_request_id:staleId});
    await db.from("ai_answer_requests").update({created_at:new Date(Date.now()-360000).toISOString()}).eq("id",staleId);
    expect(await rpc("recover_answer_credits",{p_user_id:userId,p_environment:"sandbox"})).toBe(1);
    expect(await rpc("recover_answer_credits",{p_user_id:userId,p_environment:"sandbox"})).toBe(0);
    const purchase=await db.from("ai_credit_purchases").select("id").eq("user_id",userId).single(); if(purchase.error) throw purchase.error;
    const refund={p_adjustment_id:`test_${crypto.randomUUID()}`,p_purchase_id:purchase.data.id,p_credits:25};
    const deductions=await Promise.all([rpc("apply_credit_adjustment",refund),rpc("apply_credit_adjustment",refund)]);
    expect(deductions.reduce((a,b)=>a+b,0)).toBe(25);
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).toBe(34);
    await rpc("apply_credit_adjustment",{...refund,p_adjustment_id:`test_${crypto.randomUUID()}`,p_credits:100});
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).toBe(9);
    const extra=await db.from("ai_credit_purchases").insert({user_id:userId,paddle_transaction_id:`test_${crypto.randomUUID()}`,price_id:"ai_credits_50_eur",credits:50,environment:"sandbox"}).select("id").single(); if(extra.error) throw extra.error;
    await rpc("apply_credit_adjustment",{p_adjustment_id:`test_${crypto.randomUUID()}`,p_purchase_id:extra.data.id,p_credits:50});
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).toBe(0);
    expect((await db.rpc("reserve_answer_credit",{...reserveArgs,p_request_id:crypto.randomUUID()})).error).not.toBeNull();
    const snap=["refund1"];
    expect(await rpc("reconcile_purchase_adjustments",{p_purchase_id:extra.data.id,p_snapshot:snap,p_target:50})).toBe(0);
    expect(await rpc("reconcile_purchase_adjustments",{p_purchase_id:extra.data.id,p_snapshot:[...snap,"reversal1"],p_target:0})).toBe(-50);
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).toBe(9);
    expect(await rpc("reconcile_purchase_adjustments",{p_purchase_id:extra.data.id,p_snapshot:snap,p_target:50})).toBe(0);
    const uncertainId=crypto.randomUUID();
    await rpc("reserve_answer_credit",{...reserveArgs,p_request_id:uncertainId});
    await rpc("reconcile_purchase_adjustments",{p_purchase_id:extra.data.id,p_snapshot:[...snap,"reversal1","refund2"],p_target:50});
    await rpc("settle_answer_credit",{p_user_id:userId,p_request_id:uncertainId});
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"sandbox"})).toBe(0);
    expect(await rpc("ensure_credit_balance",{p_user_id:userId,p_environment:"live"})).toBe(10);
  } finally {
    const purchases=await db.from("ai_credit_purchases").select("id").eq("user_id",userId);
    if(purchases.data?.length) await db.from("ai_credit_adjustments").delete().in("purchase_id",purchases.data.map(p=>p.id));
    await db.from("ai_credit_purchases").delete().eq("user_id",userId);
    await db.from("ai_checkout_orders").delete().eq("user_id",userId);
    await db.from("account_deletion_requests").delete().eq("user_id",userId);
    await db.from("account_support_requests").delete().eq("user_id",userId);
    await db.from("phone_login_identities").delete().eq("user_id",userId);
    await db.from("profiles").delete().eq("id",userId);
    await db.auth.admin.deleteUser(userId);
  }
},60000);