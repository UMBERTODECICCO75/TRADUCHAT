import { expect, test } from "bun:test";
import { assistantQuotaAllowed } from "./assistant-preflight";

test("both independent quotas start without waiting and retain their limits", async () => {
  const calls = [];
  const releases = [];
  const pending = assistantQuotaAllowed((...args) => {
    calls.push(args);
    return new Promise(resolve => releases.push(resolve));
  }, "ticket", "ip:client");
  expect(calls).toEqual([["ask:ticket", 20, 600], ["askr:ip:client", 60, 3600]]);
  releases.forEach(resolve => resolve(true));
  expect(await pending).toBe(true);
});

test("denial by either quota prevents assistant usage", async () => {
  for (const blocked of ["ask:ticket", "askr:ip:client"]) {
    expect(await assistantQuotaAllowed(async key => key !== blocked, "ticket", "ip:client")).toBe(false);
  }
});

test("a failed quota check fails closed", async () => {
  await expect(assistantQuotaAllowed(async () => { throw new Error("quota unavailable"); }, "ticket", "ip:client")).rejects.toThrow("quota unavailable");
});