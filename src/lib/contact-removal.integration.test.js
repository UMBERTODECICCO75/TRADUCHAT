import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pub = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Rule: deleting a contact removes the caller's own membership from every
// conversation shared with that person — and nothing else. The other person
// keeps their membership, the messages stay, and no one can delete someone
// else's membership through the Data API.
test.skipIf(!url || !key || !pub)("contact removal leaves only the caller's memberships", async () => {
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers); headers.set("apikey", key);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    return fetch(input, { ...init, headers });
  } } });
  const users = []; const roomIds = [];
  try {
    for (let i = 0; i < 3; i++) {
      const email = `contact-${crypto.randomUUID()}@example.com`; const password = crypto.randomUUID();
      const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error("Test account unavailable");
      users.push({ id: created.data.user.id, email, password });
      const profile = await db.from("profiles").upsert({ id: created.data.user.id });
      if (profile.error) throw profile.error;
    }
    async function asUser(account) {
      const client = createClient(url, pub, { auth: { persistSession: false } });
      const signed = await client.auth.signInWithPassword({ email: account.email, password: account.password });
      if (signed.error) throw signed.error;
      return createClient(url, pub, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${signed.data.session.access_token}` } } });
    }
    const alice = users[0]; const bob = users[1]; const carla = users[2];
    alice.db = await asUser(alice); bob.db = await asUser(bob);

    // Private chat alice–bob and a group with all three.
    for (const [suffix, members] of [["P", [alice, bob]], ["G", [alice, bob, carla]]]) {
      const room = await db.from("rooms").insert({ code: `CNT${suffix}${crypto.randomUUID().slice(0, 6).toUpperCase()}` }).select("id").single();
      if (room.error) throw room.error;
      roomIds.push(room.data.id);
      const membership = await db.from("room_members").insert(members.map((u) => ({ room_id: room.data.id, user_id: u.id })));
      if (membership.error) throw membership.error;
    }
    const message = await db.from("room_messages").insert({
      room_id: roomIds[0], sender_id: bob.id, user_id: bob.id,
      original: "Ciao", translation: "Hello", from_lang: "Italiano", to_lang: "Inglese",
    }).select("id").single();
    if (message.error) throw message.error;

    // alice cannot delete bob's own membership through the Data API.
    const denied = await alice.db.from("room_members").delete().eq("user_id", bob.id).eq("room_id", roomIds[0]);
    expect(denied.error).not.toBeNull();

    // The removal the server function performs: alice leaves every room shared with bob.
    const { data: mine } = await db.from("room_members").select("room_id").eq("user_id", alice.id);
    const shared = await db.from("room_members").select("room_id").eq("user_id", bob.id).in("room_id", (mine ?? []).map((m) => m.room_id));
    const roomIdsShared = [...new Set((shared.data ?? []).map((m) => m.room_id))];
    expect(roomIdsShared.sort()).toEqual([...roomIds].sort());
    const removed = await db.from("room_members").delete().eq("user_id", alice.id).in("room_id", roomIdsShared);
    expect(removed.error).toBeNull();

    // alice is out of both rooms; bob and carla stay inside.
    expect((await db.from("room_members").select("user_id").eq("user_id", alice.id).in("room_id", roomIds)).data ?? []).toHaveLength(0);
    expect((await db.from("room_members").select("user_id").eq("room_id", roomIds[0])).data ?? []).toHaveLength(1);
    expect((await db.from("room_members").select("user_id").eq("room_id", roomIds[1])).data ?? []).toHaveLength(2);

    // The shared message survives.
    expect((await db.from("room_messages").select("id").eq("id", message.data.id)).data).toHaveLength(1);
  } finally {
    for (const id of roomIds) await db.from("rooms").delete().eq("id", id);
    for (const user of users) await db.auth.admin.deleteUser(user.id);
  }
}, 60000);
