import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { consentNotification } from "./newsletter-consent";

export const getNewsletterConsent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("newsletter_consent_events")
      .select("accepted,created_at").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("Non riesco a leggere il consenso. Riprova.");
    return { accepted: data?.accepted ?? false };
  });

export const saveNewsletterConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ accepted: z.boolean() }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { data: event, error } = await context.supabase.rpc("set_newsletter_consent", { p_accepted: data.accepted });
    if (error || !event) throw new Error(error?.message === "Verified email required"
      ? "Per iscriverti serve un’email verificata nell’account."
      : "Non riesco a salvare il consenso. Riprova.");
    const notification = consentNotification(event);
    if (!notification) return { accepted: false, notification: "not_required" as const };
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    try {
      const result = await sendTemplateEmail("newsletter-consent", notification.to, {
        idempotencyKey: notification.idempotencyKey,
        templateData: { email: event.email, acceptedAt: event.created_at, version: event.consent_version },
      });
      return { accepted: true, notification: result.sent ? "sent" as const : "suppressed" as const };
    } catch {
      // Consent remains durable even when the owner notification fails.
      return { accepted: true, notification: "failed" as const };
    }
  });