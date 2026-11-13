const VOICE_LANG: Record<string, string> = {
  Italiano: "it-IT",
  Inglese: "en-US",
  "Inglese (Stati Uniti)": "en-US",
  Francese: "fr-FR",
  Spagnolo: "es-ES",
  Tedesco: "de-DE",
  Portoghese: "pt-PT",
  "Portoghese (Brasile)": "pt-BR",
  Rumeno: "ro-RO",
  Russo: "ru-RU",
  Albanese: "sq-AL",
  Arabo: "ar-SA",
  Ucraino: "uk-UA",
  Cinese: "zh-CN",
  Giapponese: "ja-JP",
  Ebraico: "he-IL",
  Greco: "el-GR",
  Polacco: "pl-PL",
  Turco: "tr-TR",
  "Filippino (tagalog)": "fil-PH",
  Punjabi: "pa-IN",
  Wolof: "wo-SN",
  Hindi: "hi-IN",
  Coreano: "ko-KR",
  "Cinese mandarino": "zh-CN",
  Vietnamita: "vi-VN",
  Thailandese: "th-TH",
  Serbo: "sr-RS",
  Slovacco: "sk-SK",
  Mongolo: "mn-MN",
  Croato: "hr-HR",
  Svedese: "sv-SE",
  Danese: "da-DK",
  Norvegese: "nb-NO",
  Azerbaigiano: "az-AZ",
  "Groenlandese (Kalaallisut)": "kl-GL",
  Inupiaq: "ik-US",
  Bengalese: "bn-BD",
  Indonesiano: "id-ID",
  "Urdu (Pakistan)": "ur-PK",
  "Cinese tradizionale (Taiwan)": "zh-TW",
  "Cantonese (Hong Kong)": "zh-HK",
};

/** Reads a text out loud in the given language, using the phone's own voice. */
export function speak(text: string, language: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const value = text.trim();
  if (!value) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(value);
  utterance.lang = VOICE_LANG[language] ?? "it-IT";
  window.speechSynthesis.speak(utterance);
  return true;
}

/** Queues translated voice notes without cutting off the preceding note. */
export function queueSpeech(text: string, language: string, onError: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined" || !text.trim()) return false;
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = VOICE_LANG[language] ?? "it-IT";
  utterance.onerror = (event) => { if (event.error !== "canceled" && event.error !== "interrupted") onError(); };
  window.speechSynthesis.speak(utterance);
  return true;
}
