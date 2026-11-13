import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Rule: a received message can be deleted only from the reader's own view —
// the marker is private, cannot be created for someone else, and the shared
// message row stays untouched for every other participant.
test.skipIf(!url || !key)("hidden messages: per-user hide is private, idempotent and never deletes the shared message", async () => {
  const db = createClient(url,key,{ auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init) => {
    const h=new Headers(init?.headers);
    if(key.startsWith("sb_") && h.get("Authorization")===`Bearer ${key}`) h.delete("Authorization");
    h.set("apikey",key); return fetch(input,{...init,headers:h});
  }}});
  async function makeUser() {
    const email=`hidden-${crypto.randomUUID()}@example.com`; const password=crypto.randomUUID();
    const created = await db.auth.admin.createUser({ email, password, email_confirm:true });
    if(created.error || !created.data.user) throw new Error("Unable to create isolated hidden-message test account");
    const userId = created.data.user.id;
    const profile = await db.from("profiles").upsert({id:userId}); if(profile.error) throw profile.error;
    return { email, password, userId };
  }
  try {
    const alice = await makeUser();
    const bob = await makeUser();
    const room = await db.from("rooms").insert({ code: `HID${crypto.randomUUID().slice(0,6).toUpperCase()}` }).select("id").single();
    if(room.error) throw room.error;
    const message = await db.from("room_messages").insert({
      room_id: room.data.id, sender_id: bob.userId, user_id: bob.userId,
      original: "Ciao", translation: "Hello", from_lang: "Italiano", to_lang: "Inglese",
    }).select("id").single();
    if(message.error) throw message.error;
    const messageId = message.data.id;

    async function asUser(account) {
      const authClient = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY ?? key, { auth:{persistSession:false} });
      const signed = await authClient.auth.signInWithPassword({ email: account.email, password: account.password });
      if(signed.error) throw signed.error;
      return createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY ?? key, { auth:{persistSession:false}, global:{ headers:{ Authorization: `Bearer ${signed.data.session.access_token}` } } });
    }
    const aliceDb = await asUser(alice);
    const bobDb = await asUser(bob);

    const hidden = await aliceDb.from("chat_hidden_messages").insert({ user_id: alice.userId, message_id: messageId }).select("id").single();
    expect(hidden.error).toBeNull();
    expect((await aliceDb.from("chat_hidden_messages").insert({ user_id: alice.userId, message_id: messageId })).error).not.toBeNull();
    expect((await aliceDb.from("chat_hidden_messages").insert({ user_id: bob.userId, message_id: messageId })).error).not.toBeNull();

    const seenByBob = await bobDb.from("chat_hidden_messages").select("*").eq("message_id", messageId);
    expect(seenByBob.error).toBeNull();
    expect(seenByBob.data ?? []).toHaveLength(0);
    const seenByAlice = await aliceDb.from("chat_hidden_messages").select("*").eq("message_id", messageId);
    expect(seenByAlice.error).toBeNull();
    expect(seenByAlice.data ?? []).toHaveLength(1);

    const anonDb = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY ?? key, { auth:{persistSession:false} });
    expect((await anonDb.from("chat_hidden_messages").insert({ user_id: alice.userId, message_id: messageId })).error).not.toBeNull();
    const anonRead = await anonDb.from("chat_hidden_messages").select("*");
    expect(anonRead.error).toBeNull();
    expect(anonRead.data ?? []).toHaveLength(0);

    const stillThere = await db.from("room_messages").select("id").eq("id", messageId).maybeSingle();
    expect(stillThere.error).toBeNull();
    expect(stillThere.data).not.toBeNull();

    const unhide = await aliceDb.from("chat_hidden_messages").delete().eq("user_id", alice.userId).eq("message_id", messageId);
    expect(unhide.error).toBeNull();
    const afterUnhide = await aliceDb.from("chat_hidden_messages").select("*").eq("message_id", messageId);
    expect(afterUnhide.error).toBeNull();
    expect(afterUnhide.data ?? []).toHaveLength(0);

    await db.from("room_messages").delete().eq("id", messageId);
    await db.from("rooms").delete().eq("id", room.data.id);
  } finally {
    for (const email of []) {} // accounts are isolated test users
  }
});
