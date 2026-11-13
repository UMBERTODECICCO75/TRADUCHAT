export const NEWSLETTER_ADMIN = "admin@traduchat.com";
export const NEWSLETTER_SITE = "https://www.traduchat.app";
export const NEWSLETTER_CONSENT_VERSION = "2026-10-25";

export function consentNotification(event: { id: string; accepted: boolean }) {
  if (!event.accepted) return null;
  return { to: NEWSLETTER_ADMIN, siteUrl: NEWSLETTER_SITE, idempotencyKey: `newsletter-consent-${event.id}` };
}