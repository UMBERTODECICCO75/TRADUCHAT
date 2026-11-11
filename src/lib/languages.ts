// Only these languages may reach the AI translator instructions.
// Anything else is rejected before it can alter the model's behavior.
// Single source for every language menu in the app (chat, calls, camera, profile).
export const LANGUAGE_CODES = {
  Inglese: "EN",
  Italiano: "IT",
  Spagnolo: "ES",
  Francese: "FR",
  Tedesco: "DE",
  Portoghese: "PT",
  Cinese: "ZH",
  Giapponese: "JA",
  Arabo: "AR",
  Russo: "RU",
  Albanese: "SQ",
  Bengalese: "BN",
  Bulgaro: "BG",
  Catalano: "CA",
  Ceco: "CS",
  Coreano: "KO",
  Croato: "HR",
  Danese: "DA",
  Ebraico: "HE",
  Estone: "ET",
  Filippino: "TL",
  Finlandese: "FI",
  Greco: "EL",
  Hindi: "HI",
  Indonesiano: "ID",
  Irlandese: "GA",
  Islandese: "IS",
  Lettone: "LV",
  Lituano: "LT",
  Macedone: "MK",
  Malese: "MS",
  Maltese: "MT",
  Norvegese: "NO",
  Olandese: "NL",
  Persiano: "FA",
  Polacco: "PL",
  Punjabi: "PA",
  Rumeno: "RO",
  Serbo: "SR",
  Slovacco: "SK",
  Sloveno: "SL",
  Svedese: "SV",
  Swahili: "SW",
  Tamil: "TA",
  Thailandese: "TH",
  Turco: "TR",
  Ucraino: "UK",
  Ungherese: "HU",
  Urdu: "UR",
  Vietnamita: "VI",
} as const satisfies Record<string, string>;

export const TRANSLATION_LANGUAGES = Object.keys(LANGUAGE_CODES) as (keyof typeof LANGUAGE_CODES)[];

export function languageCode(lang: string): string {
  return (LANGUAGE_CODES as Record<string, string>)[lang] ?? "??";
}

export function validateTargetLanguage(value: unknown): string {
  const target = String(value ?? "").trim();
  if (!(TRANSLATION_LANGUAGES as readonly string[]).includes(target)) {
    throw new Error("Lingua non valida");
  }
  return target;
}
