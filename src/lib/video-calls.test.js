import { expect, test } from "bun:test";
import { nextCallFullMode, ownsCallDevice, playCallMuteBeep, setCallPlaybackMuted, stopCallMedia } from "./video-calls";

const call = { caller_id: "alice", callee_id: "bob", caller_device: "phone", callee_device: "laptop" };
test("mute button feedback emits one short local beep and releases its audio context", async () => {
  const events = [];
  const tone = { frequency: { setValueAtTime: (hz) => events.push(hz) }, connect() {}, disconnect() {}, start: (time) => events.push(["start", time]), stop: (time) => events.push(["stop", time]) };
  const context = { state: "suspended", currentTime: 2, resume: async () => events.push("resume"), createOscillator: () => tone, createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }), close: async () => events.push("closed") };
  await playCallMuteBeep(() => context);
  expect(events).toEqual(["resume", 880, ["start", 2], ["stop", 2.13]]);
  tone.onended();
  expect(events.at(-1)).toBe("closed");
});
test("unavailable beep audio does not interrupt the mute control", async () => {
  await expect(playCallMuteBeep(() => { throw new Error("Audio unavailable"); })).resolves.toBeUndefined();
});
test("only the accepted participant device owns the real call", () => {
  expect(ownsCallDevice(call, "alice", "phone")).toBe(true);
  expect(ownsCallDevice(call, "bob", "laptop")).toBe(true);
  expect(ownsCallDevice(call, "bob", "other-phone")).toBe(false);
  expect(ownsCallDevice(call, "outsider", "phone")).toBe(false);
});
test("ending the call stops both audio and video tracks", () => {
  const stopped = [];
  stopCallMedia({ getTracks: () => [ { stop: () => stopped.push("audio") }, { stop: () => stopped.push("video") } ] });
  expect(stopped).toEqual(["audio", "video"]);
});
test("silencing call playback leaves voice-note playback and microphone enabled", () => {
  const microphone = { enabled: true };
  const voiceNote = { muted: false };
  const video = { muted: false, srcObject: { microphone } };
  setCallPlaybackMuted(video, true);
  expect(video.muted).toBe(true);
  expect(voiceNote.muted).toBe(false);
  expect(microphone.enabled).toBe(true);
  setCallPlaybackMuted(video, false);
  expect(video.muted).toBe(false);
  setCallPlaybackMuted(null, true);
});
test("fullscreen uses the browser surface when available and an overlay on iOS", () => {
  expect(nextCallFullMode(null, true)).toBe("native");
  expect(nextCallFullMode(null, false)).toBe("overlay");
  expect(nextCallFullMode("native", true)).toBeNull();
  expect(nextCallFullMode("overlay", false)).toBeNull();
});
