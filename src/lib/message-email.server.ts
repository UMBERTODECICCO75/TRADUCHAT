import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const APP_ORIGIN = "https://traduchat.app";

/** Someone counts as away when they have not opened the chat for this long. */
const AWAY_AFTER_MS = 2 * 60 * 1000;
/** At most one email per person and conversation in this window. */
const NOTIFY_EVERY_MS = 15 * 60 * 1000;

function clip(value: string, max = 200) {
  const text = value.trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/**
 * Emails the participants who are not currently in the chat, so a message is
 * never missed. Suppressed recipients and send failures never block the message.
 */
export async function notifyAwayMembers(params: {
  roomId: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  messageId: string;
  original: string;
  translation: string | null;
}): Promise<void> {
  try {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const now = Date.now();
    const awayBefore = new Date(now - AWAY_AFTER_MS).toISOString();
    const notifyBefore = new Date(now - NOTIFY_EVERY_MS).toISOString();

    const { data: members } = await db
      .from("room_members")
      .select("user_id, last_seen_at, last_notified_at")
      .eq("room_id", params.roomId)
      .neq("user_id", params.senderId)
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
        await sendTemplateEmail("new-message", to, {
          templateData: {
            senderName: params.senderName,
            preview: clip(params.original),
            translation: params.translation ? clip(params.translation) : "",
            chatUrl: `${APP_ORIGIN}/stanza/${params.roomCode}`,
          },
          idempotencyKey: `new-message-${params.messageId}-${target.user_id}`,
        });
      } catch (error) {
        console.error("[message-email] send failed", error);
      }
      await db
        .from("room_members")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("room_id", params.roomId)
        .eq("user_id", target.user_id);
    }
  } catch (error) {
    console.error("[message-email] notify failed", error);
  }
}
