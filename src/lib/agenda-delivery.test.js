import { expect, test } from "bun:test";
import { AgendaPhoneRejected, deliverClaimedReminder } from "./agenda-delivery";

test("a rejected call releases its claim so the next run can send it", async () => {
  let claimed = false;
  let attempts = 0;
  const options = {
    claim: async () => { if (claimed) return false; claimed = true; return true; },
    send: async () => { attempts++; if (attempts === 1) throw new AgendaPhoneRejected(429, "rate limited"); return true; },
    release: async () => { claimed = false; },
    canRetry: error => error instanceof AgendaPhoneRejected && error.status < 500,
  };
  await expect(deliverClaimedReminder(options)).rejects.toThrow("429");
  expect(claimed).toBe(false);
  expect(await deliverClaimedReminder(options)).toBe(true);
  expect(attempts).toBe(2);
  expect(await deliverClaimedReminder(options)).toBe(false);
  expect(attempts).toBe(2);
});

test("an uncertain call outcome is not retried to avoid duplicate charges", async () => {
  let released = false;
  await expect(deliverClaimedReminder({
    claim: async () => true,
    send: async () => { throw new Error("connection lost"); },
    release: async () => { released = true; },
    canRetry: error => error instanceof AgendaPhoneRejected && error.status < 500,
  })).rejects.toThrow("connection lost");
  expect(released).toBe(false);
});

test("a failed idempotent email releases its claim", async () => {
  let released = false;
  await expect(deliverClaimedReminder({
    claim: async () => true,
    send: async () => { throw new Error("email failed"); },
    release: async () => { released = true; },
    canRetry: () => true,
  })).rejects.toThrow("email failed");
  expect(released).toBe(true);
});