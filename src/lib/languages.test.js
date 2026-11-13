import { afterEach, expect, test } from "bun:test";
import { LANGUAGES, TARGET_LANGUAGES } from "./languages";
import { LANGUAGE_CODES } from "./speech.server";
import { speak } from "./speak";

const originalWindow = globalThis.window;
const originalUtterance = globalThis.SpeechSynthesisUtterance;
afterEach(() => {
  globalThis.window = originalWindow;
  globalThis.SpeechSynthesisUtterance = originalUtterance;
});

for (const [language, transcriptionCode, voiceCode] of [
  ["Italiano", "it", "it-IT"],
  ["Inglese", "en", "en-US"],
  ["Inglese (Stati Uniti)", "en", "en-US"],
  ["Francese", "fr", "fr-FR"],
  ["Spagnolo", "es", "es-ES"],
  ["Tedesco", "de", "de-DE"],
  ["Portoghese", "pt", "pt-PT"],
  ["Rumeno", "ro", "ro-RO"],
  ["Albanese", "sq", "sq-AL"],
  ["Arabo", "ar", "ar-SA"],
  ["Ucraino", "uk", "uk-UA"],
  ["Cinese", "zh", "zh-CN"],
  ["Ebraico", "he", "he-IL"],
  ["Turco", "tr", "tr-TR"],
  ["Greco", "el", "el-GR"],
  ["Giapponese", "ja", "ja-JP"],
  ["Polacco", "pl", "pl-PL"],
  ["Filippino (tagalog)", "tl", "fil-PH"],
  ["Punjabi", "pa", "pa-IN"],
  ["Wolof", "wo", "wo-SN"],
  ["Hindi", "hi", "hi-IN"],
  ["Coreano", "ko", "ko-KR"],
  ["Cinese mandarino", "zh", "zh-CN"],
  ["Portoghese (Brasile)", "pt", "pt-BR"],
  ["Vietnamita", "vi", "vi-VN"],
  ["Serbo", "sr", "sr-RS"],
  ["Slovacco", "sk", "sk-SK"],
  ["Mongolo", "mn", "mn-MN"],
  ["Croato", "hr", "hr-HR"],
  ["Svedese", "sv", "sv-SE"],
  ["Danese", "da", "da-DK"],
  ["Norvegese", "no", "nb-NO"],
  ["Azerbaigiano", "az", "az-AZ"],
  ["Russo", "ru", "ru-RU"],
  ["Groenlandese (Kalaallisut)", "kl", "kl-GL"],
  ["Inupiaq", "ik", "ik-US"],
  ["Bengalese", "bn", "bn-BD"],
  ["Indonesiano", "id", "id-ID"],
  ["Urdu (Pakistan)", "ur", "ur-PK"],
  ["Cinese tradizionale (Taiwan)", "zh", "zh-TW"],
  ["Cantonese (Hong Kong)", "zh", "zh-HK"],
  ["Thailandese", "th", "th-TH"],
]) {
  test(`${language} has chat selection, transcription code and browser voice locale mappings`, () => {
    expect(LANGUAGES).toContain(language);
    expect(TARGET_LANGUAGES).toContain(language);
    expect(LANGUAGE_CODES[language]).toBe(transcriptionCode);
    let spoken;
    globalThis.window = { speechSynthesis: { cancel() {}, speak(value) { spoken = value; } } };
    globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
    expect(speak("Test", language)).toBe(true);
    expect(spoken?.lang).toBe(voiceCode);
  });
}

test("existing Chinese selections remain compatible", () => {
  expect(LANGUAGES).toContain("Cinese");
  expect(LANGUAGE_CODES.Cinese).toBe("zh");
});