import { describe, expect, it, vi } from "vitest";
import { freshIncoming, playMessageBeep, soundPreferenceKey } from "@/lib/message-beep";

const row = { id: "new", sender_id: "other", recipient_id: "me", created_at: "2026-11-11T01:00:01Z" };
const since = Date.parse("2026-11-11T01:00:00Z");
describe("Optional message beep", () => {
  it("detects messages from any chat and each supported format", () => {
    const seen = new Set<string>();
    for (const source of ["chat_messages", "chat_photos", "camera_translations"]) {
      expect(freshIncoming([row], "me", since, seen, source)).toBe(1);
    }
  });
  it("never repeats the beep for a previously received message", () => {
    const seen = new Set<string>();
    expect(freshIncoming([row], "me", since, seen, "chat_messages")).toBe(1);
    expect(freshIncoming([row], "me", since, seen, "chat_messages")).toBe(0);
  });
  it("ignores history and messages sent by the current user", () => {
    expect(freshIncoming([{ ...row, created_at: "2026-11-11T00:00:00Z" }, { ...row, id: "mine", sender_id: "me" }], "me", since, new Set(), "chat_messages")).toBe(0);
  });
  it("does not share the preference between accounts", () => {
    expect(soundPreferenceKey("first")).not.toBe(soundPreferenceKey("second"));
  });
  it("produces the requested normal 850 Hz beep for 120 ms", () => {
    const oscillator = { type: "", frequency: { value: 0 }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
    const gain = { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
    const context = { state: "running", currentTime: 10, createOscillator: () => oscillator, createGain: () => gain, destination: {} };
    playMessageBeep(context as unknown as AudioContext);
    expect(oscillator.type).toBe("sine");
    expect(oscillator.frequency.value).toBe(850);
    expect(oscillator.stop).toHaveBeenCalledWith(10.12);
  });
});