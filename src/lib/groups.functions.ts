import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LANGUAGES } from "./languages";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const Lang = z.enum(LANGUAGES);
const Code = z
  .string()
  .trim()
  .toUpperCase()
  .min(4)
  .max(16)
  .regex(/^[A-Z0-9]+$/, "Codice non valido.");
const GroupName = z.string().trim().min(1, "Serve un nome.").max(60);

function randomCode(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function groupByCode(code: string) {
  const db = await admin();
  const { data, error } = await db
    .from("rooms")
    .select("id, code, name, owner_id, is_group")
    .eq("code", code)
    .eq("is_group", true)
    .maybeSingle();
  if (error) throw new Error("Non riesco a leggere il gruppo.");
  return data;
}

async function assertGroupMember(groupId: string, userId: string) {
  const db = await admin();
  const { data } = await db
    .from("room_members")
    .select("user_id")
    .eq("room_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Non fai parte di questo gruppo.");
}

async function join(roomId: string, userId: string, opts?: { silent?: boolean }) {
  const db = await admin();
  const { data: existing } = await db
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  await db
    .from("room_members")
    .upsert({ room_id: roomId, user_id: userId, last_seen_at: new Date().toISOString() });
  // A genuinely new member is announced to everyone else in the group.
  if (!existing && !opts?.silent) {
    const { data: room } = await db
      .from("rooms")
      .select("code")
      .eq("id", roomId)
      .maybeSingle();
    if (room) {
      const { announceMemberJoined } = await import("./join-notify.server");
      await announceMemberJoined({ roomId, roomCode: room.code, userId });
    }
  }
}

/** People the signed-in user already shares a conversation with can be added. */
async function assertKnownPeople(userId: string, memberIds: string[]) {
  if (memberIds.length === 0) return;
  const db = await admin();
  const { data: mine } = await db.from("room_members").select("room_id").eq("user_id", userId);
  const roomIds = (mine ?? []).map((m) => m.room_id);
  if (roomIds.length === 0) throw new Error("Non hai ancora contatti da aggiungere.");
  const { data: known } = await db
    .from("room_members")
    .select("user_id")
    .in("room_id", roomIds)
    .in("user_id", memberIds);
  const allowed = new Set((known ?? []).map((m) => m.user_id));
  for (const id of memberIds) {
    if (!allowed.has(id)) throw new Error("Puoi aggiungere solo i tuoi contatti.");
  }
}

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: GroupName,
        langA: Lang,
        langB: Lang,
        memberIds: z.array(z.string().uuid()).max(50).default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const others = data.memberIds.filter((id) => id !== context.userId);
    await assertKnownPeople(context.userId, others);

    const db = await admin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode();
      const { data: room, error } = await db
        .from("rooms")
        .insert({
          code,
          name: data.name,
          is_group: true,
          invite_only: true,
          lang_a: data.langA,
          lang_b: data.langB,
          owner_id: context.userId,
        })
        .select("id")
        .maybeSingle();
      if (!error && room) {
        await join(room.id, context.userId, { silent: true });
        for (const id of others) await join(room.id, id);
        return { code };
      }
      if (error && error.code !== "23505") throw new Error("Non riesco a creare il gruppo.");
    }
    throw new Error("Non riesco a creare il gruppo, riprova.");
  });

export type GroupSummary = {
  code: string;
  name: string;
  langA: string;
  langB: string;
  mine: boolean;
  members: { userId: string; name: string; avatarUrl: string | null }[];
  lastMessage: string | null;
};

export const listMyGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: memberships, error } = await db
      .from("room_members")
      .select("room_id, joined_at, rooms(code, name, lang_a, lang_b, owner_id, is_group)")
      .eq("user_id", context.userId)
      .order("joined_at", { ascending: false })
      .limit(60);
    if (error) throw new Error("Non riesco a leggere i tuoi gruppi.");

    const groups = (memberships ?? [])
      .filter((m) => m.rooms?.is_group)
      .map((m) => ({ roomId: m.room_id, room: m.rooms! }));
    if (groups.length === 0) return { groups: [] as GroupSummary[] };

    const roomIds = groups.map((g) => g.roomId);
    const { data: members } = await db
      .from("room_members")
      .select("room_id, user_id")
      .in("room_id", roomIds)
      .limit(400);
    const ids = [...new Set((members ?? []).map((m) => m.user_id))];
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, nickname, email, avatar_url")
      .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const { signAvatarPaths, fallbackName } = await import("./avatars.server");
    const signed = await signAvatarPaths(
      (profiles ?? []).map((p) => p.avatar_url).filter((p): p is string => Boolean(p)),
    );
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const { data: lastMessages } = await db
      .from("room_messages")
      .select("room_id, original, created_at")
      .in("room_id", roomIds)
      .order("created_at", { ascending: false })
      .limit(200);
    const lastByRoom = new Map<string, string>();
    for (const m of lastMessages ?? []) {
      if (!lastByRoom.has(m.room_id)) lastByRoom.set(m.room_id, m.original);
    }

    const result: GroupSummary[] = groups.map((g) => ({
      code: g.room.code,
      name: g.room.name ?? "Gruppo",
      langA: g.room.lang_a,
      langB: g.room.lang_b,
      mine: g.room.owner_id === context.userId,
      lastMessage: lastByRoom.get(g.roomId) ?? null,
      members: (members ?? [])
        .filter((m) => m.room_id === g.roomId)
        .map((m) => {
          const profile = byId.get(m.user_id);
          return {
            userId: m.user_id,
            name: fallbackName(profile?.nickname ?? profile?.display_name ?? null, profile?.email ?? null),
            avatarUrl: profile?.avatar_url ? (signed[profile.avatar_url] ?? null) : null,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" })),
    }));

    return { groups: result };
  });

export const addGroupMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ code: Code, memberIds: z.array(z.string().uuid()).min(1).max(50) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const group = await groupByCode(data.code);
    if (!group) throw new Error("Gruppo non trovato.");
    await assertGroupMember(group.id, context.userId);
    const others = data.memberIds.filter((id) => id !== context.userId);
    await assertKnownPeople(context.userId, others);
    for (const id of others) await join(group.id, id);
    return { added: others.length };
  });

export const leaveGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const group = await groupByCode(data.code);
    if (!group) throw new Error("Gruppo non trovato.");
    await assertGroupMember(group.id, context.userId);
    const db = await admin();
    await db
      .from("room_members")
      .delete()
      .eq("room_id", group.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** The group owner invites any registered friend by nickname or email. */
export const inviteFriendToGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: Code, handle: z.string().trim().min(3).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const group = await groupByCode(data.code);
    if (!group) throw new Error("Gruppo non trovato.");
    if (group.owner_id !== context.userId) {
      throw new Error("Solo chi ha creato il gruppo può invitare nuovi amici.");
    }
    const db = await admin();
    const handle = data.handle.replace(/^@/, "");
    const isEmail = handle.includes("@");
    if (!isEmail && !/^[A-Za-z0-9_]{3,24}$/.test(handle)) throw new Error("Nickname non valido.");
    const { data: friend } = await db
      .from("profiles")
      .select("id")
      .ilike(isEmail ? "email" : "nickname", handle.replace(/[%_\\]/g, (c) => `\\${c}`))
      .maybeSingle();
    if (!friend) throw new Error("Nessun utente TraduChat trovato con questo nickname o email.");
    if (friend.id === context.userId) throw new Error("Sei già nel gruppo.");
    const { data: already } = await db
      .from("room_members")
      .select("user_id")
      .eq("room_id", group.id)
      .eq("user_id", friend.id)
      .maybeSingle();
    if (already) throw new Error("Questa persona è già nel gruppo.");
    await join(group.id, friend.id);
    return { ok: true };
  });
