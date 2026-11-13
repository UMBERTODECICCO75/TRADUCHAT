import { expect, test } from "bun:test";
import { chatSendFailure } from "./chat-connection";

test("exhausted credits are not treated as a lost connection", () => {
  expect(chatSendFailure(new Error("Crediti esauriti: ricarica per continuare a tradurre."))).toEqual({ retryable: false, message: "Crediti esauriti: ricarica per continuare a tradurre." });
});
test("expired authentication stops automatic sending", () => {
  expect(chatSendFailure({ status: 401 }).retryable).toBe(false);
});
test("failed network fetch remains retryable", () => {
  expect(chatSendFailure(new TypeError("Failed to fetch")).retryable).toBe(true);
});
test("permission and rate limit failures are not retried", () => {
  expect(chatSendFailure(new Error("Conversazione solo su invito")).retryable).toBe(false);
  expect(chatSendFailure({ status: 429 }).retryable).toBe(false);
});