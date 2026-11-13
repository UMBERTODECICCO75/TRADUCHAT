import { expect, test } from "bun:test";
import { queueSpeech } from "./speak";
import { ChatAudioInbox } from "./chat-audio";
const voice = { id: "v1", sender_id: "other", original: "Hello", translation: "Ciao", from_lang: "Inglese", to_lang: "Italiano", audio_path: "voice.wav" };
function inbox() { const value = new ChatAudioInbox(); value.collect([], "me", true, "Italiano", {}); return value; }
test("opening a chat does not play old voice notes", () => {
  expect(new ChatAudioInbox().collect([voice], "me", true, "Italiano", {})).toEqual([]);
});
test("new received voice translation plays once, even after refresh", () => {
  const value = inbox();
  expect(value.collect([voice], "me", true, "Italiano", {})).toEqual(["Ciao"]);
  expect(value.collect([voice], "me", true, "Italiano", {})).toEqual([]);
});
test("own voice notes and text messages never auto-play", () => {
  expect(inbox().collect([{ ...voice, sender_id: "me" }, { ...voice, id: "text", audio_path: null }], "me", true, "Italiano", {})).toEqual([]);
});
test("a missing translation waits for its real result", () => {
  const value = inbox();
  expect(value.collect([voice], "me", true, "Francese", {})).toEqual([]);
  expect(value.collect([voice], "me", true, "Francese", { "v1:Francese:Hello": "Bonjour" })).toEqual(["Bonjour"]);
});
test("disabling discards pending and missed recordings", () => {
  const value = inbox(); value.collect([voice], "me", true, "Francese", {});
  expect(value.collect([voice], "me", false, "Italiano", {})).toEqual([]);
  expect(value.collect([voice], "me", true, "Italiano", {})).toEqual([]);
});
test("consecutive voice notes retain arrival order", () => {
  expect(inbox().collect([voice, { ...voice, id: "v2", translation: "Come stai?" }], "me", true, "Italiano", {})).toEqual(["Ciao", "Come stai?"]);
});
test("automatic speech queues the translated Italian voice without canceling prior audio", () => {
  const originalWindow = globalThis.window;
  const originalUtterance = globalThis.SpeechSynthesisUtterance;
  const spoken = []; let canceled = 0;
  globalThis.window = { speechSynthesis: { speak: (utterance) => spoken.push(utterance), cancel: () => canceled++ } };
  globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  try {
    expect(queueSpeech("Ciao", "Italiano", () => {})).toBe(true);
    expect(queueSpeech("Come stai?", "Italiano", () => {})).toBe(true);
    expect(spoken.map((utterance) => [utterance.text, utterance.lang])).toEqual([["Ciao", "it-IT"], ["Come stai?", "it-IT"]]);
    expect(canceled).toBe(0);
  } finally { globalThis.window = originalWindow; globalThis.SpeechSynthesisUtterance = originalUtterance; }
});