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

function randomCode(length = 10) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Emails whoever is not reading the conversation right now. */
async function notifyRoom(
  room: { id: string; code: string },
  senderId: string,
  messageId: string,
  original: string,
  translation: string | null,
) {
  const db = await admin();
  const { data: senderProfile } = await db
    .from("profiles")
    .select("display_name, nickname, email")
    .eq("id", senderId)
    .maybeSingle();
  const { fallbackName } = await import("./avatars.server");
  const { notifyAwayMembers } = await import("./message-email.server");
  await notifyAwayMembers({
    roomId: room.id,
    roomCode: room.code,
    senderId,
    senderName: fallbackName(
      senderProfile?.nickname ?? senderProfile?.display_name ?? null,
      senderProfile?.email ?? null,
    ),
    messageId,
    original,
    translation,
  });
}

async function roomByCode(code: string) {
  const db = await admin();
  const { data, error } = await db
    .from("rooms")
    .select(
      "id, code, lang_a, lang_b, invite_only, owner_id, name, is_group, photo_path, cover_path, theme, topic",
    )
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error("Non riesco a leggere la conversazione.");
  return data;
}

async function isMember(roomId: string, userId: string) {
  const db = await admin();
  const { data } = await db
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Joining also records presence: the chat refreshes often, so `last_seen_at`
 * tells us who is actually reading and who should be emailed instead.
 */
async function joinRoom(roomId: string, userId: string, opts?: { silent?: boolean }) {
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
  // A genuinely new participant is announced to everyone else in the room.
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

/**
 * A conversation belongs to one company workspace: colleagues of that workspace
 * share it, outsiders need an explicit invitation. Invite-only rooms stay limited
 * to the owner and invited members.
 */
async function assertAccess(
  room: { id: string; invite_only: boolean; owner_id: string | null },
  userId: string,
) {
  if (room.owner_id === userId) return;
  if (await isMember(room.id, userId)) return;
  if (room.invite_only) throw new Error("Questa conversazione è solo su invito.");
  // Anyone with the code may enter an open room; joinRoom records them explicitly.
  return;
}

export const createRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ langA: Lang, langB: Lang, inviteOnly: z.boolean().optional() })
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
          lang_a: data.langA,
          lang_b: data.langB,
          owner_id: context.userId,
          invite_only: data.inviteOnly ?? false,
        })
        .select("id")
        .maybeSingle();
      if (!error && room) {
        await joinRoom(room.id, context.userId, { silent: true });
        return { code };
      }
      if (error && error.code !== "23505") {
        throw new Error("Non riesco a creare la conversazione.");
      }
    }
    throw new Error("Non riesco a creare la conversazione, riprova.");
  });

export const getRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) return { room: null };
    await assertAccess(room, context.userId);
    return {
      room: {
        code: room.code,
        lang_a: room.lang_a,
        lang_b: room.lang_b,
        invite_only: room.invite_only,
      },
    };
  });

  /** Conversations owned by or explicitly shared with the signed-in user. */
export const listMyRooms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: members, error } = await db
      .from("room_members")
      .select(
        "room_id, joined_at, rooms(code, lang_a, lang_b, invite_only, owner_id, created_at)",
      )
      .eq("user_id", context.userId)
      .order("joined_at", { ascending: false })
      .limit(30);
    if (error) throw new Error("Non riesco a leggere le tue conversazioni.");

    const rows = (members ?? [])
      .map((m) => m.rooms)
      .filter((r): r is NonNullable<typeof r> => Boolean(r));

    const seen = new Set<string>();
    const rooms = rows
      .filter((r) => {
        if (seen.has(r.code)) return false;
        seen.add(r.code);
        return true;
      })
      .map((r) => ({
        code: r.code,
        langA: r.lang_a,
        langB: r.lang_b,
        inviteOnly: r.invite_only,
        mine: r.owner_id === context.userId,
      }));
    return { rooms };
  });

export type HomeMessage = {
  id: string;
  roomCode: string;
  senderName: string;
  senderAvatarUrl: string | null;
  text: string;
  isVoice: boolean;
  createdAt: string;
};

/** Latest messages received by the signed-in person, for the app home screen. */
export const listHomeMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: memberships, error: membershipsError } = await db
      .from("room_members")
      .select("room_id, rooms(code)")
      .eq("user_id", context.userId)
      .limit(100);
    if (membershipsError) throw new Error("Non riesco a leggere i messaggi ricevuti.");

    const roomIds = (memberships ?? []).map((membership) => membership.room_id);
    if (roomIds.length === 0) {
      return { me: context.userId, messages: [] as HomeMessage[] };
    }

    const codeByRoom = new Map(
      (memberships ?? []).map((membership) => [membership.room_id, membership.rooms?.code ?? ""]),
    );
    const { data: rows, error } = await db
      .from("room_messages")
      .select("id, room_id, sender_id, original, translation, file_kind, audio_path, created_at")
      .in("room_id", roomIds)
      .neq("sender_id", context.userId)
      .or("file_kind.is.null,file_kind.neq.system")
      .order("created_at", { ascending: false })
      .limit(12);
    if (error) throw new Error("Non riesco a leggere i messaggi ricevuti.");
    // Messages this user deleted from their own view disappear from the inbox.
    const { data: hiddenRows, error: hiddenError } = await context.supabase
      .from("chat_hidden_messages")
      .select("message_id");
    if (hiddenError) throw new Error("Non riesco a leggere i messaggi ricevuti.");
    const hiddenIds = new Set((hiddenRows ?? []).map((row) => row.message_id));

    const senderIds = [...new Set((rows ?? []).map((row) => row.sender_id))];
    const { data: profiles } = senderIds.length > 0
      ? await db
          .from("profiles")
          .select("id, display_name, nickname, email, avatar_url")
          .in("id", senderIds)
      : { data: [] };
    const { signAvatarPaths, fallbackName } = await import("./avatars.server");
    const signed = await signAvatarPaths(
      (profiles ?? []).map((profile) => profile.avatar_url).filter((path): path is string => Boolean(path)),
    );
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const messages: HomeMessage[] = (rows ?? []).filter((row) => !hiddenIds.has(row.id)).map((row) => {
      const profile = profileById.get(row.sender_id);
      return {
        id: row.id,
        roomCode: codeByRoom.get(row.room_id) ?? "",
        senderName: fallbackName(
          profile?.nickname ?? profile?.display_name ?? null,
          profile?.email ?? null,
        ),
        senderAvatarUrl: profile?.avatar_url ? (signed[profile.avatar_url] ?? null) : null,
        text: row.translation?.trim() || row.original,
        isVoice: Boolean(row.audio_path),
        createdAt: row.created_at,
      };
    });

    return { me: context.userId, messages };
  });

/**
 * Personal QR connect: opens the private conversation between the signed-in
 * user and the QR owner, creating it the first time. Reuses the existing
 * two-person invite-only room when one already exists.
 */
export const connectWithUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) {
      throw new Error("Questo è il tuo codice: fallo inquadrare all'altra persona.");
    }
    const db = await admin();

    // Rooms where the signed-in user is a member.
    const { data: mine } = await db
      .from("room_members")
      .select("room_id")
      .eq("user_id", context.userId);
    const myRoomIds = (mine ?? []).map((m) => m.room_id);

    if (myRoomIds.length > 0) {
      // Of those, rooms where the QR owner is also a member.
      const { data: shared } = await db
        .from("room_members")
        .select("room_id")
        .eq("user_id", data.userId)
        .in("room_id", myRoomIds);
      for (const candidate of shared ?? []) {
        const { count } = await db
          .from("room_members")
          .select("user_id", { count: "exact", head: true })
          .eq("room_id", candidate.room_id);
        if (count === 2) {
          const { data: room } = await db
            .from("rooms")
            .select("code")
            .eq("id", candidate.room_id)
            .maybeSingle();
          if (room) {
            await joinRoom(candidate.room_id, context.userId);
            return { code: room.code };
          }
        }
      }
    }

    // First connection: the other person must accept before the chat opens.
    // Create the private room with only the requester inside, then send a
    // pending invitation; respondToInvite adds the invitee on acceptance.
    const { data: targetProfile } = await db
      .from("profiles")
      .select("id, email")
      .eq("id", data.userId)
      .maybeSingle();
    if (!targetProfile) throw new Error("Questo account non esiste più.");

    const { data: pendingInvite } = await db
      .from("room_invites")
      .select("id")
      .eq("inviter_id", context.userId)
      .eq("invitee_user_id", data.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (pendingInvite) return { code: null, pending: true };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = randomCode();
      const { data: room, error } = await db
        .from("rooms")
        .insert({ code, lang_a: "Italiano", lang_b: "Inglese", owner_id: context.userId, invite_only: true })
        .select("id")
        .maybeSingle();
      if (!error && room) {
        await joinRoom(room.id, context.userId, { silent: true });
        const { error: inviteError } = await db.from("room_invites").insert({
          room_id: room.id,
          inviter_id: context.userId,
          invitee_email: targetProfile.email ?? "",
          invitee_user_id: data.userId,
          status: "pending",
        });
        if (inviteError) {
          console.error("[connect] invite insert failed", inviteError);
          throw new Error("Non riesco a inviare la richiesta di connessione.");
        }
        return { code: null, pending: true };
      }
      if (error && error.code !== "23505") {
        throw new Error("Non riesco ad aprire la conversazione.");
      }
    }
    throw new Error("Non riesco ad aprire la conversazione, riprova.");
  });

export type Participant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  status: string | null;
  statusImageUrl: string | null;
  showStatus: boolean;
  lastSeenAt: string | null;
  /** Global presence: last activity anywhere in the app. */
  globalLastSeenAt: string | null;
};

/** Name, photo and current status of everyone who joined a conversation. */
async function roomParticipants(roomId: string): Promise<Participant[]> {
  const db = await admin();
  const { data: members } = await db
    .from("room_members")
    .select("user_id, joined_at, last_seen_at")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true })
    .limit(50);
  const ids = (members ?? []).map((m) => m.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await db
    .from("profiles")
    .select("id, display_name, nickname, email, avatar_url, phone, status, status_image_path, show_status, last_seen_at")
    .in("id", ids);
  const { signAvatarPaths, fallbackName } = await import("./avatars.server");
  const signed = await signAvatarPaths(
    (profiles ?? []).map((p) => p.avatar_url).filter((p): p is string => Boolean(p)),
  );
  const { signStatusPaths } = await import("./status-photos.server");
  const signedStatus = await signStatusPaths(
    (profiles ?? []).map((p) => p.status_image_path).filter((p): p is string => Boolean(p)),
  );
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  const memberById = new Map((members ?? []).map((m) => [m.user_id, m]));
  return ids
    .map((id) => {
      const profile = byId.get(id);
      const member = memberById.get(id);
      return {
        userId: id,
        name: fallbackName(profile?.nickname ?? profile?.display_name ?? null, profile?.email ?? null),
        avatarUrl: profile?.avatar_url ? (signed[profile.avatar_url] ?? null) : null,
        phone: profile?.phone ?? null,
        status: profile?.status ?? null,
        statusImageUrl: profile?.status_image_path
          ? (signedStatus[profile.status_image_path] ?? null)
          : null,
        showStatus: profile?.show_status ?? true,
        lastSeenAt: member?.last_seen_at ?? null,
        globalLastSeenAt: profile?.last_seen_at ?? null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
}

export type GlobalParticipant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  status: string | null;
  statusImageUrl: string | null;
  roomCode: string;
  langA: string;
  langB: string;
};

/** All people the current user shares a conversation with, sorted by name. */
export const listMyParticipants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data: memberships, error } = await db
      .from("room_members")
      .select("room_id, joined_at, rooms(code, lang_a, lang_b)")
      .eq("user_id", context.userId)
      .order("joined_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Non riesco a leggere le tue conversazioni.");

    const roomInfo = (memberships ?? [])
      .map((m) => ({
        roomId: m.room_id,
        code: m.rooms?.code ?? "",
        langA: m.rooms?.lang_a ?? "Italiano",
        langB: m.rooms?.lang_b ?? "Inglese",
        joinedAt: new Date(m.joined_at).getTime(),
      }))
      .filter((r) => r.code);
    if (roomInfo.length === 0) return { participants: [] as GlobalParticipant[] };

    const roomIds = roomInfo.map((r) => r.roomId);
    const { data: members } = await db
      .from("room_members")
      .select("room_id, user_id")
      .in("room_id", roomIds)
      .neq("user_id", context.userId)
      .limit(200);

    const roomOrder = new Map(roomInfo.map((r) => [r.roomId, r.joinedAt]));
    const codeByRoom = new Map(roomInfo.map((r) => [r.roomId, r.code]));
    const langAByCode = new Map(roomInfo.map((r) => [r.code, r.langA]));
    const langBByCode = new Map(roomInfo.map((r) => [r.code, r.langB]));
    const sortedMembers = (members ?? [])
      .slice()
      .sort((a, b) => (roomOrder.get(b.room_id) ?? 0) - (roomOrder.get(a.room_id) ?? 0));

    const userToRoom = new Map<string, string>();
    for (const m of sortedMembers) {
      if (!userToRoom.has(m.user_id)) {
        userToRoom.set(m.user_id, codeByRoom.get(m.room_id) ?? "");
      }
    }

    const ids = [...userToRoom.keys()];
    if (ids.length === 0) return { participants: [] as GlobalParticipant[] };

    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, nickname, email, avatar_url, phone, status, status_image_path")
      .in("id", ids);

    const { signAvatarPaths, fallbackName } = await import("./avatars.server");
    const signed = await signAvatarPaths(
      (profiles ?? []).map((p) => p.avatar_url).filter((p): p is string => Boolean(p)),
    );
    const { signStatusPaths } = await import("./status-photos.server");
    const signedStatus = await signStatusPaths(
      (profiles ?? []).map((p) => p.status_image_path).filter((p): p is string => Boolean(p)),
    );
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const participants = ids
      .map((id) => {
      const profile = byId.get(id);
      const roomCode = userToRoom.get(id) ?? "";
      return {
        userId: id,
        name: fallbackName(profile?.nickname ?? profile?.display_name ?? null, profile?.email ?? null),
        avatarUrl: profile?.avatar_url ? (signed[profile.avatar_url] ?? null) : null,
        phone: profile?.phone ?? null,
        status: profile?.status ?? null,
        statusImageUrl: profile?.status_image_path
          ? (signedStatus[profile.status_image_path] ?? null)
          : null,
        roomCode,
        langA: langAByCode.get(roomCode) ?? "Italiano",
        langB: langBByCode.get(roomCode) ?? "Inglese",
      };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));

    return { participants };
  });

/**
 * Deleting a contact also leaves every conversation shared with that person.
 * Only the caller's membership rows are removed: the other person and the rest
 * of each conversation keep their memberships, messages and files untouched.
 */
export const removeContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Non puoi cancellare te stesso.");
    const db = await admin();
    const { data: mine, error: mineError } = await db
      .from("room_members")
      .select("room_id")
      .eq("user_id", context.userId);
    if (mineError) throw new Error("Non riesco a leggere le tue conversazioni.");
    const myRoomIds = (mine ?? []).map((m) => m.room_id);

    if (myRoomIds.length > 0) {
      const { data: shared, error: sharedError } = await db
        .from("room_members")
        .select("room_id")
        .eq("user_id", data.userId)
        .in("room_id", myRoomIds);
      if (sharedError) throw new Error("Non riesco a leggere le conversazioni condivise.");
      const roomIds = [...new Set((shared ?? []).map((m) => m.room_id))];
      if (roomIds.length > 0) {
        const { error } = await db
          .from("room_members")
          .delete()
          .eq("user_id", context.userId)
          .in("room_id", roomIds);
        if (error) throw new Error("Non riesco a cancellare il contatto.");
      }
    }

    // Pending invitations between the two people are cleared too.
    const { error: invitesError } = await db
      .from("room_invites")
      .delete()
      .eq("status", "pending")
      .or(
        `and(inviter_id.eq.${context.userId},invitee_user_id.eq.${data.userId}),and(inviter_id.eq.${data.userId},invitee_user_id.eq.${context.userId})`,
      );
    if (invitesError) throw new Error("Non riesco a cancellare il contatto.");
    return { ok: true };
  });

export const listRoomMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) {
      return {
        room: null,
        messages: [],
        me: context.userId,
        isOwner: false,
        participants: [] as Participant[],
      };
    }
    await assertAccess(room, context.userId);
    await joinRoom(room.id, context.userId);
    const db = await admin();
    const { data: messages, error } = await db
      .from("room_messages")
      .select(
        "id, sender_id, original, translation, from_lang, to_lang, image_path, file_path, file_name, file_kind, audio_path",
      )
      .eq("room_id", room.id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error("Non riesco a leggere i messaggi.");
    // Messages this user deleted from their own view stay hidden.
    const { data: hiddenRows, error: hiddenError } = await context.supabase
      .from("chat_hidden_messages")
      .select("message_id");
    if (hiddenError) throw new Error("Non riesco a leggere i messaggi.");
    const hiddenIds = new Set((hiddenRows ?? []).map((row) => row.message_id));
    const { signChatImagePaths } = await import("./chat-images.server");
    const signedImages = await signChatImagePaths(
      (messages ?? []).map((m) => m.image_path).filter((p): p is string => Boolean(p)),
    );
    const { signChatFilePaths } = await import("./chat-files.server");
    const signedFiles = await signChatFilePaths([
      ...(messages ?? []).map((m) => m.file_path),
      ...(messages ?? []).map((m) => m.audio_path),
    ].filter((p): p is string => Boolean(p)));
    const { signAvatarPaths: signRoomImages } = await import("./avatars.server");
    const roomImages = await signRoomImages(
      [room.photo_path, room.cover_path].filter((p): p is string => Boolean(p)),
    );
    return {
      room: {
        id: room.id,
        code: room.code,
        lang_a: room.lang_a,
        lang_b: room.lang_b,
        invite_only: room.invite_only,
        name: room.name,
        is_group: room.is_group,
        theme: room.theme,
        topic: room.topic,
        photoUrl: room.photo_path ? (roomImages[room.photo_path] ?? null) : null,
        coverUrl: room.cover_path ? (roomImages[room.cover_path] ?? null) : null,
      },
      messages: (messages ?? []).filter((m) => !hiddenIds.has(m.id)).map((m) => ({
        ...m,
        imageUrl: m.image_path ? (signedImages[m.image_path] ?? null) : null,
        fileUrl: m.file_path ? (signedFiles[m.file_path] ?? null) : null,
        audioUrl: m.audio_path ? (signedFiles[m.audio_path] ?? null) : null,
      })),
      me: context.userId,
      isOwner: room.owner_id === context.userId,
      participants: await roomParticipants(room.id),
    };
  });

export const sendRoomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: Code,
        text: z.string().trim().min(1).max(5000),
        from: Lang,
        to: Lang,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);

    const pair = [room.lang_a, room.lang_b];
    if (!pair.includes(data.from) || !pair.includes(data.to)) {
      throw new Error("Le lingue non corrispondono a questa conversazione.");
    }

    await joinRoom(room.id, context.userId);

    const { translateText } = await import("./translate.server");
    const { withTranslationCredit } = await import("./usage-credits.server");
    const translation = data.from === data.to
      ? await translateText({ text: data.text, from: data.from, to: data.to })
      : await withTranslationCredit(context.userId, "chat", () => translateText({ text: data.text, from: data.from, to: data.to }));

    const db = await admin();
    const { data: inserted, error } = await db
      .from("room_messages")
      .insert({
        room_id: room.id,
        sender_id: context.userId,
        user_id: context.userId,
        original: data.text,
        translation,
        from_lang: data.from,
        to_lang: data.to,
      })
      .select("id, sender_id, original, translation, from_lang, to_lang")
      .single();
    if (error || !inserted) throw new Error("Messaggio non inviato, riprova.");

    // Whoever is not in the chat right now gets an email, so no message is missed.
    const { data: senderProfile } = await db
      .from("profiles")
      .select("display_name, nickname, email")
      .eq("id", context.userId)
      .maybeSingle();
    const { fallbackName } = await import("./avatars.server");
    const { notifyAwayMembers } = await import("./message-email.server");
    await notifyAwayMembers({
      roomId: room.id,
      roomCode: room.code,
      senderId: context.userId,
      senderName: fallbackName(
        senderProfile?.nickname ?? senderProfile?.display_name ?? null,
        senderProfile?.email ?? null,
      ),
      messageId: inserted.id,
      original: inserted.original,
      translation: inserted.translation,
    });

    return { message: inserted };
  });

/** Only the author may correct a text message; its translation is regenerated. */
export const editRoomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: Code, messageId: z.string().uuid(), text: z.string().trim().min(1).max(5000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);
    const db = await admin();
    const { data: message, error: readError } = await db
      .from("room_messages")
      .select("id, sender_id, original, from_lang, to_lang, image_path, file_path, audio_path, file_kind")
      .eq("id", data.messageId)
      .eq("room_id", room.id)
      .maybeSingle();
    if (readError || !message) throw new Error("Messaggio non trovato.");
    if (message.sender_id !== context.userId) throw new Error("Puoi modificare solo i tuoi messaggi.");
    if (message.file_kind === "system" || message.image_path || message.file_path || message.audio_path) {
      throw new Error("Puoi modificare solo i messaggi di testo.");
    }
    if (message.original === data.text) return { original: message.original, translation: null, unchanged: true };
    const { translateText } = await import("./translate.server");
    const translation = await translateText({ text: data.text, from: message.from_lang, to: message.to_lang });
    const { data: updated, error } = await db
      .from("room_messages")
      .update({ original: data.text, translation })
      .eq("id", message.id)
      .eq("room_id", room.id)
      .eq("original", message.original)
      .select("original, translation")
      .maybeSingle();
    if (error) throw new Error("Non riesco a modificare il messaggio.");
    if (!updated) throw new Error("Il messaggio è cambiato. Ricarica la conversazione e riprova.");
    return { ...updated, unchanged: false };
  });

/** Only the person who created the conversation can delete it, for everyone. */
export const deleteRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) return { ok: true };
    if (room.owner_id !== context.userId) {
      throw new Error("Solo chi ha creato la conversazione può cancellarla.");
    }
    const db = await admin();
    const { error } = await db.from("rooms").delete().eq("id", room.id);
    if (error) throw new Error("Non riesco a cancellare la conversazione.");
    return { ok: true };
  });

/**
 * A message can be removed by whoever wrote it, or by the person who created
 * the conversation. Attachments are removed from storage too.
 */
export const deleteRoomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: Code, messageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);

    const db = await admin();
    const { data: message } = await db
      .from("room_messages")
      .select("id, sender_id, image_path, file_path, audio_path, file_kind")
      .eq("id", data.messageId)
      .eq("room_id", room.id)
      .maybeSingle();
    if (!message) return { ok: true };
    if (message.file_kind === "system") {
      throw new Error("Gli avvisi di sistema non si possono cancellare.");
    }
    const canDelete = message.sender_id === context.userId || room.owner_id === context.userId;
    if (!canDelete) {
      throw new Error("Puoi cancellare solo i messaggi che hai inviato.");
    }

    if (message.image_path) {
      await db.storage.from("chat-images").remove([message.image_path]);
    }
    const files = [message.file_path, message.audio_path].filter((p): p is string => Boolean(p));
    if (files.length > 0) {
      await db.storage.from("chat-files").remove(files);
    }

    const { error } = await db.from("room_messages").delete().eq("id", message.id);
    if (error) throw new Error("Non riesco a cancellare il messaggio.");
    return { ok: true };
  });

/**
 * A received message can be deleted only from the reader's own view: the
 * conversation keeps it for everyone else and no storage file is touched.
 */
export const hideRoomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: Code, messageId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);
    const db = await admin();
    const { data: message } = await db
      .from("room_messages")
      .select("id, file_kind")
      .eq("id", data.messageId)
      .eq("room_id", room.id)
      .maybeSingle();
    if (!message) return { ok: true };
    if (message.file_kind === "system") {
      throw new Error("Gli avvisi di sistema non si possono cancellare.");
    }
    const { error } = await context.supabase.from("chat_hidden_messages").insert({
      user_id: context.userId,
      message_id: message.id,
    });
    if (error && error.code !== "23505") {
      throw new Error("Non riesco a cancellare il messaggio per te.");
    }
    return { ok: true };
  });

export const setRoomLanguages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: Code, langA: Lang, langB: Lang }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);
    if (!room.owner_id || room.owner_id !== context.userId) {
      throw new Error("Solo chi ha creato la conversazione può cambiare le lingue.");
    }
    const db = await admin();
    const { error } = await db
      .from("rooms")
      .update({ lang_a: data.langA, lang_b: data.langB })
      .eq("id", room.id);
    if (error) throw new Error("Non riesco ad aggiornare le lingue.");
    return { ok: true };
  });

/** Sends a photo in the conversation, with an optional caption that gets translated. */
export const sendRoomImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: Code,
        image: z.string().min(16).max(9_000_000),
        mimeType: z.enum(["image/jpeg", "image/png"]),
        caption: z.string().trim().max(2000).optional(),
        from: Lang,
        to: Lang,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);

    const pair = [room.lang_a, room.lang_b];
    if (!pair.includes(data.from) || !pair.includes(data.to)) {
      throw new Error("Le lingue non corrispondono a questa conversazione.");
    }
    await joinRoom(room.id, context.userId);

    const { uploadChatImage, signChatImagePaths } = await import("./chat-images.server");
    const path = await uploadChatImage({
      roomId: room.id,
      userId: context.userId,
      base64: data.image,
      mimeType: data.mimeType,
    });

    const caption = data.caption?.trim() ?? "";
    let translation: string | null = null;
    if (caption) {
      const { translateText } = await import("./translate.server");
      translation = await translateText({ text: caption, from: data.from, to: data.to });
    }

    const db = await admin();
    const { data: inserted, error } = await db
      .from("room_messages")
      .insert({
        room_id: room.id,
        sender_id: context.userId,
        user_id: context.userId,
        original: caption || "📷 Foto",
        translation: caption ? translation : "📷 Foto",
        from_lang: data.from,
        to_lang: data.to,
        image_path: path,
      })
      .select("id, sender_id, original, translation, from_lang, to_lang, image_path")
      .single();
    if (error || !inserted) throw new Error("Foto non inviata, riprova.");

    const { data: senderProfile } = await db
      .from("profiles")
      .select("display_name, nickname, email")
      .eq("id", context.userId)
      .maybeSingle();
    const { fallbackName } = await import("./avatars.server");
    const { notifyAwayMembers } = await import("./message-email.server");
    // The email only announces the photo: user-written captions never leave the app.
    await notifyAwayMembers({
      roomId: room.id,
      roomCode: room.code,
      senderId: context.userId,
      senderName: fallbackName(
        senderProfile?.nickname ?? senderProfile?.display_name ?? null,
        senderProfile?.email ?? null,
      ),
      messageId: inserted.id,
      original: "📷 Foto",
      translation: "📷 Foto",
    });

    const signed = await signChatImagePaths([path]);
    return { message: { ...inserted, imageUrl: signed[path] ?? null } };
  });

/** Sends a PDF in the conversation, with an optional caption that gets translated. */
export const sendRoomPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: Code,
        file: z.string().min(16).max(26_000_000),
        fileName: z.string().trim().min(1).max(200),
        caption: z.string().trim().max(2000).optional(),
        from: Lang,
        to: Lang,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);
    const pair = [room.lang_a, room.lang_b];
    if (!pair.includes(data.from) || !pair.includes(data.to)) {
      throw new Error("Le lingue non corrispondono a questa conversazione.");
    }
    await joinRoom(room.id, context.userId);

    const { uploadChatFile, signChatFilePaths } = await import("./chat-files.server");
    const path = await uploadChatFile({
      roomId: room.id,
      userId: context.userId,
      base64: data.file,
      mimeType: "application/pdf",
      extension: "pdf",
    });

    const caption = data.caption?.trim() ?? "";
    let translation: string | null = null;
    if (caption) {
      const { translateText } = await import("./translate.server");
      translation = await translateText({ text: caption, from: data.from, to: data.to });
    }

    const db = await admin();
    const label = `📄 ${data.fileName}`;
    const { data: inserted, error } = await db
      .from("room_messages")
      .insert({
        room_id: room.id,
        sender_id: context.userId,
        user_id: context.userId,
        original: caption || label,
        translation: caption ? translation : label,
        from_lang: data.from,
        to_lang: data.to,
        file_path: path,
        file_name: data.fileName,
        file_kind: "pdf",
      })
      .select(
        "id, sender_id, original, translation, from_lang, to_lang, file_path, file_name, file_kind",
      )
      .single();
    if (error || !inserted) throw new Error("Documento non inviato, riprova.");

    await notifyRoom(room, context.userId, inserted.id, inserted.original, inserted.translation);

    const signed = await signChatFilePaths([path]);
    return { message: { ...inserted, fileUrl: signed[path] ?? null } };
  });

/** Sends a voice message: the clip is stored, transcribed and translated. */
export const sendRoomVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: Code,
        audio: z.string().min(64).max(12_000_000),
        from: Lang,
        to: Lang,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const room = await roomByCode(data.code);
    if (!room) throw new Error("Conversazione non trovata.");
    await assertAccess(room, context.userId);
    const pair = [room.lang_a, room.lang_b];
    const { voiceLanguagesOk } = await import("./chat-translation");
    if (!voiceLanguagesOk(Boolean(room.is_group), pair, data.from, data.to, LANGUAGES)) {
      throw new Error("Le lingue non corrispondono a questa conversazione.");
    }
    await joinRoom(room.id, context.userId);

    const { transcribeWav, LANGUAGE_CODES } = await import("./speech.server");
    const spoken = await transcribeWav({
      base64: data.audio,
      language: LANGUAGE_CODES[data.from],
    });
    const text = spoken.text.trim();

    const { uploadChatFile, signChatFilePaths } = await import("./chat-files.server");
    const path = await uploadChatFile({
      roomId: room.id,
      userId: context.userId,
      base64: data.audio,
      mimeType: "audio/wav",
      extension: "wav",
    });

    let translation: string | null = "🎤 Messaggio vocale";
    if (text) {
      const { translateText } = await import("./translate.server");
      const { withTranslationCredit } = await import("./usage-credits.server");
      translation = data.from === data.to
        ? await translateText({ text, from: data.from, to: data.to })
        : await withTranslationCredit(context.userId, "voice", () => translateText({ text, from: data.from, to: data.to }));
    }

    const db = await admin();
    const { data: inserted, error } = await db
      .from("room_messages")
      .insert({
        room_id: room.id,
        sender_id: context.userId,
        user_id: context.userId,
        original: text || "🎤 Messaggio vocale",
        translation,
        from_lang: data.from,
        to_lang: data.to,
        audio_path: path,
      })
      .select("id, sender_id, original, translation, from_lang, to_lang, audio_path")
      .single();
    if (error || !inserted) throw new Error("Messaggio vocale non inviato, riprova.");

    await notifyRoom(room, context.userId, inserted.id, inserted.original, inserted.translation);

    const signed = await signChatFilePaths([path]);
    return { message: { ...inserted, audioUrl: signed[path] ?? null } };
  });
