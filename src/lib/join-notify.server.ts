import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const APP_ORIGIN = "https://traduchat.app";

/** Someone counts as away when they have not opened the chat for this long. */
const AWAY_AFTER_MS = 2 * 60 * 1000;
/** At most one email per person and conversation in this window. */
const NOTIFY_EVERY_MS = 15 * 60 * 1000;

/**
 * Announces a new participant to everyone else in the conversation:
 * a system notice inside the chat (visible to all) plus an email to whoever
 * is not reading right now. Failures never block the join itself.
 */
export async function announceMemberJoined(params: {
  roomId: string;
  roomCode: string;
  userId: string;
}): Promise<void> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const [{ data: room }, { data: profile }] = await Promise.all([
      db
        .from("rooms")
        .select("lang_a, name, is_group")
        .eq("id", params.roomId)
        .maybeSingle(),
      db.from("profiles").select("display_name, nickname, email").eq("id", params.userId).maybeSingle(),
    ]);
    if (!room) return;
    const { fallbackName } = await import("./avatars.server");
    const name = fallbackName(profile?.nickname ?? profile?.display_name ?? null, profile?.email ?? null);

    // In-chat notice: a system message everyone sees in the conversation.
    await db.from("room_messages").insert({
      room_id: params.roomId,
      sender_id: params.userId,
      user_id: params.userId,
      original: `${name} è entrato nella conversazione`,
      translation: null,
      from_lang: room.lang_a,
      to_lang: room.lang_a,
      file_kind: "system",
    });

    // Email the participants who are away, with the same throttle as messages.
    const now = Date.now();
    const awayBefore = new Date(now - AWAY_AFTER_MS).toISOString();
    const notifyBefore = new Date(now - NOTIFY_EVERY_MS).toISOString();
    const { data: members } = await db
      .from("room_members")
      .select("user_id, last_seen_at, last_notified_at")
      .eq("room_id", params.roomId)
      .neq("user_id", params.userId)
      .limit(50);
    const targets = (members ?? []).filter(
      (m) =>
        (m.last_seen_at ?? "") < awayBefore &&
        (!m.last_notified_at || m.last_notified_at < notifyBefore),
    );
    if (targets.length === 0) return;

    const { data: profiles } = await db
      .from("profiles")
      .select("id, email")
      .in(
        "id",
        targets.map((t) => t.user_id),
      );
    const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));

    for (const target of targets) {
      const to = emailById.get(target.user_id);
      if (!to) continue;
      try {
        await sendTemplateEmail("member-joined", to, {
          templateData: {
            memberName: name,
            roomName: room.is_group ? (room.name ?? "") : "",
            chatUrl: `${APP_ORIGIN}/stanza/${params.roomCode}`,
          },
          idempotencyKey: `member-joined-${params.roomId}-${params.userId}`,
        });
      } catch (error) {
        console.error("[join-notify] send failed", error);
      }
      await db
        .from("room_members")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("room_id", params.roomId)
        .eq("user_id", target.user_id);
    }
  } catch (error) {
    console.error("[join-notify] announce failed", error);
  }
}
