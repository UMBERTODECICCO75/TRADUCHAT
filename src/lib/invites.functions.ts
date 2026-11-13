import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Code = z
  .string()
  .trim()
  .toUpperCase()
  .min(4)
  .max(16)
  .regex(/^[A-Z0-9]+$/, "Codice non valido.");

const Email = z.string().trim().toLowerCase().email("Email non valida.").max(200);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Finds a registered account by email (profile first, then the auth directory). */
async function findRegisteredUser(email: string) {
  const db = await admin();
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();
  if (profile) return profile.id;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  return null;
}

async function roomForMember(code: string, userId: string) {
  const db = await admin();
  const { data: room } = await db
    .from("rooms")
    .select("id, code, lang_a, lang_b, owner_id, invite_only")
    .eq("code", code)
    .maybeSingle();
  if (!room) throw new Error("Conversazione non trovata.");
  if (room.owner_id !== userId) {
    const { data: member } = await db
      .from("room_members")
      .select("user_id")
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Non fai parte di questa conversazione.");
  }
  return room;
}

function myEmail(claims: Record<string, unknown>) {
  return ((claims["email"] as string | undefined) ?? "").toLowerCase();
}

/** Email used to match invitations: only returned when Auth confirms the address is verified. */
async function myVerifiedEmail(userId: string): Promise<string> {
  const db = await admin();
  const { data } = await db.auth.admin.getUserById(userId);
  const user = data?.user;
  if (!user?.email || !user.email_confirmed_at) return "";
  return user.email.toLowerCase();
}

const APP_ORIGINS = new Set([
  "https://traduchat.app",
  "https://www.traduchat.app",
  "https://traduci-parla-italia.lovable.app",
  "https://id-preview--4be5ac0b-f294-46e3-ada6-d10daec21e46.lovable.app",
]);
function safeOrigin(origin: string) {
  try {
    const o = new URL(origin).origin;
    return APP_ORIGINS.has(o) ? o : "https://traduchat.app";
  } catch {
    return "https://traduchat.app";
  }
}

export const inviteToRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ code: Code, email: Email, appOrigin: z.string().url().max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.email === myEmail(context.claims)) {
      throw new Error("Non puoi invitare te stesso.");
    }
    const { withinQuota } = await import("./translate-ticket.server");
    if (!(await withinQuota(`invite:${context.userId}`, 10, 3600))) {
      throw new Error("Hai inviato troppi inviti, riprova tra un po'.");
    }
    const room = await roomForMember(data.code, context.userId);
    const inviteeId = await findRegisteredUser(data.email);
    if (!inviteeId) {
      throw new Error(
        "Questa email non ha ancora un account TraduChat: chiedi di registrarsi e riprova.",
      );
    }

    const db = await admin();
    const { data: existing } = await db
      .from("room_invites")
      .select("id")
      .eq("room_id", room.id)
      .ilike("invitee_email", data.email)
      .maybeSingle();

    const row = {
      room_id: room.id,
      inviter_id: context.userId,
      invitee_email: data.email,
      invitee_user_id: inviteeId,
      status: "pending",
      responded_at: null,
    };
    const { error } = existing
      ? await db.from("room_invites").update(row).eq("id", existing.id)
      : await db.from("room_invites").insert(row);
    if (error) {
      console.error("[invites] insert failed", error);
      throw new Error("Non riesco a inviare l'invito.");
    }

    const { sendInviteEmail } = await import("./invite-email.server");
    const result = await sendInviteEmail({
      to: data.email,
      inviterName: myEmail(context.claims) || "Un utente di TraduChat",
      code: room.code,
      langA: room.lang_a,
      langB: room.lang_b,
      joinUrl: `${safeOrigin(data.appOrigin)}/app`,
    });

    return { emailSent: result.sent };
  });

export const listRoomInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const room = await roomForMember(data.code, context.userId);
    const db = await admin();
    const { data: invites, error } = await db
      .from("room_invites")
      .select("id, invitee_email, status, created_at")
      .eq("room_id", room.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Non riesco a leggere gli inviti.");
    return { invites: invites ?? [] };
  });

/** Pending invitations addressed to the signed-in account. */
export const listMyInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const email = await myVerifiedEmail(context.userId);
    const filters = [`invitee_user_id.eq.${context.userId}`];
    if (email) filters.push(`invitee_email.eq.${email}`);
    const { data, error } = await db
      .from("room_invites")
      .select("id, status, created_at, rooms(code, lang_a, lang_b)")
      .or(filters.join(","))
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error("Non riesco a leggere i tuoi inviti.");
    const invites = (data ?? [])
      .filter((i) => Boolean(i.rooms))
      .map((i) => ({
        id: i.id,
        code: i.rooms!.code,
        langA: i.rooms!.lang_a,
        langB: i.rooms!.lang_b,
      }));
    return { invites };
  });

export const respondToInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const email = await myVerifiedEmail(context.userId);
    const { data: invite, error } = await db
      .from("room_invites")
      .select("id, room_id, invitee_email, invitee_user_id, status, rooms(code)")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !invite) throw new Error("Invito non trovato.");
    const mine =
      invite.invitee_user_id === context.userId ||
      (email && invite.invitee_email.toLowerCase() === email);
    if (!mine) throw new Error("Questo invito non è per te.");

    if (data.accept) {
      const { data: existing } = await db
        .from("room_members")
        .select("user_id")
        .eq("room_id", invite.room_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      await db
        .from("room_members")
        .upsert({ room_id: invite.room_id, user_id: context.userId });
      // Accepting an invite makes the user a new member: tell the others.
      if (!existing && invite.rooms?.code) {
        const { announceMemberJoined } = await import("./join-notify.server");
        await announceMemberJoined({
          roomId: invite.room_id,
          roomCode: invite.rooms.code,
          userId: context.userId,
        });
      }
    }
    await db
      .from("room_invites")
      .update({
        status: data.accept ? "accepted" : "declined",
        invitee_user_id: context.userId,
        responded_at: new Date().toISOString(),
      })
      .eq("id", invite.id);

    return { code: data.accept ? (invite.rooms?.code ?? null) : null };
  });
