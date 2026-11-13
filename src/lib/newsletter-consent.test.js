import { describe, expect, test } from "bun:test";
import { consentNotification } from "./newsletter-consent";

describe("newsletter consent notification", () => {
  test("acceptance notifies only the fixed administrator", () => {
    expect(consentNotification({ id: "event-1", accepted: true }).to).toBe("admin@traduchat.com");
  });
  test("notification links to the published site", () => {
    expect(consentNotification({ id: "event-1", accepted: true }).siteUrl).toBe("https://www.traduchat.app");
  });
  test("withdrawal sends no acceptance notice", () => {
    expect(consentNotification({ id: "event-2", accepted: false })).toBeNull();
  });
  test("retries deduplicate by persisted consent event", () => {
    const original = consentNotification({ id: "event-1", accepted: true });
    expect(consentNotification({ id: "event-1", accepted: true }).idempotencyKey).toBe(original.idempotencyKey);
    expect(consentNotification({ id: "event-3", accepted: true }).idempotencyKey).not.toBe(original.idempotencyKey);
  });
});