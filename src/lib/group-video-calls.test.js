import { expect, test } from "bun:test";
import { groupBillingStart, initiatesGroupPeer, ownsGroupDevice } from "./group-video-calls";
test("group participation belongs to the joined device, not other members or devices", () => {
  const members = [{ user_id: "alice", device: "phone" }, { user_id: "bob", device: "tablet" }];
  expect(ownsGroupDevice(members, "alice", "phone")).toBe(true);
  expect(ownsGroupDevice(members, "alice", "tablet")).toBe(false);
  expect(ownsGroupDevice(members, "eve", "phone")).toBe(false);
});
test("each pair has exactly one initiator, including three-person groups", () => {
  for (const [a, b] of [["alice", "bob"], ["alice", "carol"], ["bob", "carol"]]) {
    expect(Number(initiatesGroupPeer(a, b)) + Number(initiatesGroupPeer(b, a))).toBe(1);
  }
});
test("group minutes start for every participant only after the first answer", () => {
  const call = { caller_id: "alice", status: "active", answered_at: null };
  expect(groupBillingStart(call, "alice")).toBeNull();
  call.answered_at = "2026-10-28T03:16:00Z";
  expect(groupBillingStart(call, "alice")).toBe("2026-10-28T03:16:00Z");
  expect(groupBillingStart({ ...call, answered_at: "2026-10-28T03:16:00Z" }, "bob")).toBe("2026-10-28T03:16:00Z");
  expect(groupBillingStart({ ...call, status: "ended" }, "alice")).toBeNull();
});