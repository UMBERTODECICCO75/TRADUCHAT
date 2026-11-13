import { test, expect } from "bun:test";
import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pub = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

test.skipIf(!url || !key || !pub)("real calls restrict admission, signaling and acceptance to the two members and their devices", async () => {
  const db = createClient(url, key, { auth: { persistSession: false }, global: { fetch: (input, init) => {
    const headers = new Headers(init?.headers); headers.set("apikey", key);
    if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    return fetch(input, { ...init, headers });
  } } });
  const users = []; let roomId;
  try {
    for (let i = 0; i < 3; i++) {
      const email = `call-security-${crypto.randomUUID()}@example.com`; const password = crypto.randomUUID();
      const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error("Test account unavailable");
      users.push({ id: created.data.user.id });
      const client = createClient(url, pub, { auth: { persistSession: false } });
      const signed = await client.auth.signInWithPassword({ email, password });
      if (signed.error) throw signed.error;
      users[i].db = client;
    }
    const room = await db.from("rooms").insert({ code: `SEC${crypto.randomUUID().slice(0, 8).toUpperCase()}`, owner_id: users[0].id }).select("id").single();
    if (room.error) throw room.error;
    roomId = room.data.id;
    const membership = await db.from("room_members").insert(users.slice(0, 2).map((u) => ({ room_id: roomId, user_id: u.id })));
    if (membership.error) throw membership.error;
    const devices = [crypto.randomUUID(), crypto.randomUUID()];
    const action = (index, name, extras = {}) => users[index].db.rpc("video_call_action", { p_room: roomId, p_device: devices[index] ?? crypto.randomUUID(), p_action: name, ...extras });
    expect((await action(2, "poll")).error).not.toBeNull();
    expect((await action(0, "start", { p_target: users[2].id })).error).not.toBeNull();
    const started = await action(0, "start", { p_target: users[1].id });
    expect(started.error).toBeNull();
    const callId = started.data.call.id;
    expect((await action(0, "accept", { p_call: callId })).error).not.toBeNull();
    const accepted = await Promise.all([action(1, "accept", { p_call: callId }), action(1, "accept", { p_call: callId })]);
    expect(accepted.filter((r) => !r.error)).toHaveLength(1);
    expect((await action(0, "start", { p_target: users[1].id })).error).not.toBeNull();
    expect((await action(0, "signal", { p_call: callId, p_device: crypto.randomUUID(), p_payload: { type: "offer", sdp: "test" } })).error).not.toBeNull();
    expect((await action(0, "signal", { p_call: callId, p_payload: { type: "offer", sdp: "test" } })).error).toBeNull();
    const received = await action(1, "poll", { p_call: callId });
    expect(received.data.events).toHaveLength(1);
    expect(received.data.events[0].payload.sdp).toBe("test");
    expect((await users[2].db.from("video_calls").select("id").eq("id", callId)).data).toEqual([]);
    expect((await users[2].db.from("video_call_events").select("id")).data).toEqual([]);
    await users[1].db.from("video_calls").update({ caller_id: users[1].id }).eq("id", callId);
    expect((await db.from("video_calls").select("caller_id").eq("id", callId).single()).data.caller_id).toBe(users[0].id);
    expect((await action(1, "end", { p_call: callId })).error).toBeNull();
    expect((await db.from("video_call_events").select("id").eq("call_id", callId)).data).toEqual([]);
    expect((await action(0, "signal", { p_call: callId, p_payload: { type: "offer", sdp: "late" } })).error).not.toBeNull();
  } finally {
    if (roomId) await db.from("rooms").delete().eq("id", roomId);
    for (const user of users) await db.auth.admin.deleteUser(user.id);
  }
}, 60000);