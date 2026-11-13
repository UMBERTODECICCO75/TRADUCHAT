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
const CommunityName = z.string().trim().min(1, "Serve un nome.").max(60);

function randomCode(length = 8) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function communityByCode(code: string) {
  const db = await admin();
  const { data, error } = await db
    .from("rooms")
    .select("id, code, name, owner_id, is_group, invite_only")
    .eq("code", code)
    .eq("is_group", true)
    .eq("invite_only", false)
    .maybeSingle();
  if (error) throw new Error("Non riesco a leggere la community.");
  return data;
}

async function joinCommunityRoom(roomId: string, userId: string, opts?: { silent?: boolean }) {
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

export type CommunitySummary = {
  code: string;
  name: string;
  langA: string;
  langB: string;
  mine: boolean;
  memberCount: number;
  lastMessage: string | null;
  photoUrl: string | null;
  coverUrl: string | null;
  theme: string | null;
  topic: string | null;
};

/** Create an open community (anyone can join with the code). */
export const createCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ name: CommunityName, langA: Lang, langB: Lang })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode();
      const { data: room, error } = await db
        .from("rooms")
        .insert({
          code,
          name: data.name,
          is_group: true,
          invite_only: false,   // <-- open: anyone with the code can join
          lang_a: data.langA,
          lang_b: data.langB,
          owner_id: context.userId,
        })
        .select("id")
        .maybeSingle();
      if (!error && room) {
        await joinCommunityRoom(room.id, context.userId, { silent: true });
        return { code };
      }
      if (error && error.code !== "23505") throw new Error("Non riesco a creare la community.");
    }
    throw new Error("Non riesco a creare la community, riprova.");
  });

/** Join an open community by its code — no invitation needed. */
export const joinCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const community = await communityByCode(data.code);
    if (!community) throw new Error("Community non trovata. Controlla il codice.");
    await joinCommunityRoom(community.id, context.userId);
    return { code: community.code, name: community.name };
  });

/** All communities the signed-in user has joined. */
export const listMyCommunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: memberships, error } = await db
      .from("room_members")
      .select("room_id, joined_at, rooms(code, name, lang_a, lang_b, owner_id, is_group, invite_only, photo_path, cover_path, theme, topic)")
      .eq("user_id", context.userId)
      .order("joined_at", { ascending: false })
      .limit(60);
    if (error) throw new Error("Non riesco a caricare le tue community.");

    const communities = (memberships ?? [])
      .filter((m) => m.rooms?.is_group && !m.rooms?.invite_only)
      .map((m) => ({ roomId: m.room_id, room: m.rooms! }));

    if (communities.length === 0) return { communities: [] as CommunitySummary[] };

    const roomIds = communities.map((c) => c.roomId);

    const { data: memberCounts } = await db
      .from("room_members")
      .select("room_id")
      .in("room_id", roomIds);

    const countByRoom = new Map<string, number>();
    for (const m of memberCounts ?? []) {
      countByRoom.set(m.room_id, (countByRoom.get(m.room_id) ?? 0) + 1);
    }

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

    const { signAvatarPaths } = await import("./avatars.server");
    const photos = await signAvatarPaths(
      communities.flatMap((c) => [c.room.photo_path, c.room.cover_path]).filter((p): p is string => Boolean(p)),
    );

    const result: CommunitySummary[] = communities.map((c) => ({
      code: c.room.code,
      name: c.room.name ?? "Community",
      langA: c.room.lang_a,
      langB: c.room.lang_b,
      mine: c.room.owner_id === context.userId,
      memberCount: countByRoom.get(c.roomId) ?? 1,
      lastMessage: lastByRoom.get(c.roomId) ?? null,
      photoUrl: c.room.photo_path ? (photos[c.room.photo_path] ?? null) : null,
      coverUrl: c.room.cover_path ? (photos[c.room.cover_path] ?? null) : null,
      theme: c.room.theme ?? null,
      topic: c.room.topic ?? null,
    }));

    return { communities: result };
  });

/** Leave a community. */
export const leaveCommunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const community = await communityByCode(data.code);
    if (!community) throw new Error("Community non trovata.");
    const db = await admin();
    await db
      .from("room_members")
      .delete()
      .eq("room_id", community.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** Owner updates the community profile: photo, theme and topic. */
export const updateCommunityProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: Code,
        theme: z.string().trim().max(60),
        topic: z.string().trim().max(300),
        photoBase64: z.string().max(7_000_000).optional(),
        photoType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
        coverBase64: z.string().max(7_000_000).optional(),
        coverType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const community = await communityByCode(data.code);
    if (!community) throw new Error("Community non trovata.");
    if (community.owner_id !== context.userId)
      throw new Error("Solo chi ha creato la community può modificarne il profilo.");
    const db = await admin();
    const patch: { theme: string | null; topic: string | null; photo_path?: string; cover_path?: string } = {
      theme: data.theme || null,
      topic: data.topic || null,
    };
    if (data.photoBase64 && data.photoType) {
      const bytes = Uint8Array.from(atob(data.photoBase64), (c) => c.charCodeAt(0));
      if (bytes.length > 5_000_000) throw new Error("Foto troppo grande (max 5 MB).");
      const ext = data.photoType.split("/")[1];
      const path = `communities/${community.id}/${Date.now()}.${ext}`;
      const { error } = await db.storage
        .from("avatars")
        .upload(path, bytes, { contentType: data.photoType, upsert: true });
      if (error) throw new Error("Non riesco a caricare la foto.");
      patch.photo_path = path;
    }
    if (data.coverBase64 && data.coverType) {
      const bytes = Uint8Array.from(atob(data.coverBase64), (c) => c.charCodeAt(0));
      if (bytes.length > 5_000_000) throw new Error("Copertina troppo grande (max 5 MB).");
      const path = `communities/${community.id}/cover-${Date.now()}.${data.coverType.split("/")[1]}`;
      const { error: upErr } = await db.storage
        .from("avatars")
        .upload(path, bytes, { contentType: data.coverType, upsert: true });
      if (upErr) throw new Error("Non riesco a caricare la copertina.");
      patch.cover_path = path;
    }
    const { error } = await db.from("rooms").update(patch).eq("id", community.id);
    if (error) throw new Error("Non riesco a salvare il profilo.");
    return { ok: true };
  });

export type CommunityMember = {
  userId: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
  isMe: boolean;
  isOwner: boolean;
  online: boolean;
  statusVisible: boolean;
};

/** Members of a community the caller belongs to. */
export const listCommunityMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const community = await communityByCode(data.code);
    if (!community) throw new Error("Community non trovata.");
    const db = await admin();
    const { data: me } = await db
      .from("room_members")
      .select("user_id")
      .eq("room_id", community.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!me) throw new Error("Non fai parte di questa community.");

    const { data: rows, error } = await db
      .from("room_members")
      .select("user_id")
      .eq("room_id", community.id)
      .limit(200);
    if (error) throw new Error("Non riesco a leggere i partecipanti.");
    const ids = (rows ?? []).map((r) => r.user_id);
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, nickname, avatar_url, show_status, last_seen_at")
      .in("id", ids);
    const { signAvatarPaths } = await import("./avatars.server");
    const photos = await signAvatarPaths(
      (profiles ?? []).map((p) => p.avatar_url).filter((p): p is string => Boolean(p)),
    );
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const members: CommunityMember[] = ids.map((id) => {
      const p = byId.get(id);
      return {
        userId: id,
        name: p?.nickname || p?.display_name || "Partecipante",
        nickname: p?.nickname ?? null,
        avatarUrl: p?.avatar_url ? (photos[p.avatar_url] ?? null) : null,
        isMe: id === context.userId,
        isOwner: id === community.owner_id,
        statusVisible: p?.show_status ?? false,
        online:
          Boolean(p?.show_status && p.last_seen_at) &&
          Date.now() - new Date(p!.last_seen_at!).getTime() < 3 * 60_000,
      };
    });
    return { members };
  });
