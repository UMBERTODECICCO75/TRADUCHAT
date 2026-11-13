import { describe, expect, test } from "bun:test";
import { isRingingFor, markRoomRead, unseenMessages } from "./open-app-alerts";

describe("open-app alerts", () => {
  const messages = [
    { id: "1", roomCode: "A", createdAt: "2026-10-22T01:00:00Z" },
    { id: "2", roomCode: "B", createdAt: "2026-10-22T01:01:00Z" },
    { id: "3", roomCode: "A", createdAt: "2026-10-22T01:02:00Z" },
  ];
  test("red counter counts received messages until their chat is opened", () => {
    expect(unseenMessages(messages, {})).toHaveLength(3);
    const read = markRoomRead(messages, {}, "A");
    expect(unseenMessages(messages, read).map((m) => m.id)).toEqual(["2"]);
    expect(unseenMessages(messages, JSON.parse(JSON.stringify(read)))).toHaveLength(1);
  });
  test("a new message after reading increments the counter", () => {
    expect(unseenMessages([...messages, { id: "4", roomCode: "A", createdAt: "2026-10-22T01:03:00Z" }], markRoomRead(messages, {}, "A")).map((m) => m.id)).toEqual(["2", "4"]);
  });
  test("beep is only for incoming ringing, stops for acceptance, end or expiry", () => {
    const call = { status: "ringing", callee_id: "me", created_at: "2026-10-22T01:00:00Z" };
    const now = Date.parse("2026-10-22T01:00:10Z");
    expect(isRingingFor(call, "me", now)).toBe(true);
    expect(isRingingFor(call, "other", now)).toBe(false);
    expect(isRingingFor({ ...call, status: "active" }, "me", now)).toBe(false);
    expect(isRingingFor({ ...call, status: "ended" }, "me", now)).toBe(false);
    expect(isRingingFor(call, "me", now + 60_000)).toBe(false);
  });
});