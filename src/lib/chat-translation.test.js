import { expect, test } from "bun:test";
import { chatLanguages, chatTranslationKey, chatTranslationText, voiceLanguagesOk } from "./chat-translation";

const message = { id: "received", original: "Hello my friend", translation: "Ciao amico mio", from_lang: "Inglese", to_lang: "Italiano" };
test("received messages immediately use their saved Italian translation", () => {
  expect(chatTranslationText(message, "Italiano", {})).toBe("Ciao amico mio");
});
test("same-language reading uses the original without a translation request", () => {
  expect(chatTranslationText(message, "Inglese", {})).toBe("Hello my friend");
});
test("another reading language uses its cached translation", () => {
  expect(chatTranslationText(message, "Francese", { [chatTranslationKey(message, "Francese")]: "Bonjour mon ami" })).toBe("Bonjour mon ami");
});
test("edited messages do not reuse stale translations", () => {
  expect(chatTranslationText({ ...message, original: "Goodbye" }, "Francese", { [chatTranslationKey(message, "Francese")]: "Bonjour mon ami" })).toBeNull();
});
test("system messages never need translation", () => {
  expect(chatTranslationText({ ...message, file_kind: "system" }, "Francese", {})).toBe("Hello my friend");
});
test("automatic default follows the participant's room language", () => {
  expect(chatLanguages("Italiano", "Inglese", false, undefined, null)).toEqual({ from: "Inglese", to: "Italiano" });
  expect(chatLanguages("Italiano", "Inglese", true, undefined, null)).toEqual({ from: "Italiano", to: "Inglese" });
});
test("voice and text use the same established sending direction", () => {
  expect(chatLanguages("Italiano", "Inglese", true, "Inglese", "Italiano")).toEqual({ from: "Inglese", to: "Italiano" });
});test("group voice messages accept any supported spoken language", () => {
  expect(voiceLanguagesOk(true, ["Italiano", "Inglese"], "Giapponese", "Italiano", ["Italiano", "Inglese", "Giapponese"])).toBe(true);
});
test("group voice messages reject unsupported spoken languages", () => {
  expect(voiceLanguagesOk(true, ["Italiano", "Inglese"], "Klingon", "Italiano", ["Italiano", "Inglese", "Giapponese"])).toBe(false);
});
test("group voice translation target stays a room language", () => {
  expect(voiceLanguagesOk(true, ["Italiano", "Inglese"], "Giapponese", "Giapponese", ["Italiano", "Inglese", "Giapponese"])).toBe(false);
});
test("one-to-one voice messages keep the room language pair", () => {
  expect(voiceLanguagesOk(false, ["Italiano", "Inglese"], "Giapponese", "Italiano", ["Italiano", "Inglese", "Giapponese"])).toBe(false);
  expect(voiceLanguagesOk(false, ["Italiano", "Inglese"], "Inglese", "Italiano", ["Italiano", "Inglese", "Giapponese"])).toBe(true);
});
