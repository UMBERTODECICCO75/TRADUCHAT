import { sendTemplateEmail } from "@/lib/email-templates/send-email";

/**
 * Sends the invitation notice by email through Lovable's managed email API.
 * A suppressed recipient (bounce, complaint, unsubscribe) is a normal outcome:
 * the invite still exists inside the app.
 */
export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  code: string;
  langA: string;
  langB: string;
  joinUrl: string;
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    const result = await sendTemplateEmail("room-invite", params.to, {
      templateData: {
        inviterName: params.inviterName,
        langA: params.langA,
        langB: params.langB,
        joinUrl: params.joinUrl,
      },
      idempotencyKey: `room-invite-${params.code}-${params.to.toLowerCase()}`,
    });
    return result.sent ? { sent: true } : { sent: false, reason: result.reason };
  } catch (error) {
    console.error("[invite-email] send failed", error);
    return { sent: false, reason: "send_failed" };
  }
}
