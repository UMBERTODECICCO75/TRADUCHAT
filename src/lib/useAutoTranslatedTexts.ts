import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { LANGUAGES } from "./languages";
import { getPreferredLanguage, onPreferredLanguageChange } from "./preferred-language";
import { translateSiteText } from "./translate.functions";
import { useTranslationTicket } from "./useTranslationTicket";

const BROWSER_LANG: Record<string, string> = {
  it: "Italiano",
  en: "Inglese",
  fr: "Francese",
  es: "Spagnolo",
  de: "Tedesco",
  pt: "Portoghese",
  "pt-br": "Portoghese (Brasile)",
  ro: "Rumeno",
  ru: "Russo",
  sq: "Albanese",
  ar: "Arabo",
  uk: "Ucraino",
  zh: "Cinese mandarino",
  ja: "Giapponese",
  he: "Ebraico",
  iw: "Ebraico",
  el: "Greco",
  pl: "Polacco",
  tr: "Turco",
  tl: "Filippino (tagalog)",
  fil: "Filippino (tagalog)",
  pa: "Punjabi",
  wo: "Wolof",
  hi: "Hindi",
  ko: "Coreano",
  vi: "Vietnamita",
  th: "Thailandese",
  sr: "Serbo",
  sk: "Slovacco",
  mn: "Mongolo",
  hr: "Croato",
  sv: "Svedese",
  da: "Danese",
  no: "Norvegese",
  nb: "Norvegese",
  nn: "Norvegese",
  az: "Azerbaigiano",
  kl: "Groenlandese (Kalaallisut)",
  ik: "Inupiaq",
  bn: "Bengalese",
  id: "Indonesiano",
  ur: "Urdu (Pakistan)",
  "zh-tw": "Cinese tradizionale (Taiwan)",
  "zh-hk": "Cantonese (Hong Kong)",
};

const RTL = new Set(["Arabo", "Ebraico", "Urdu (Pakistan)"]);

const SEPARATOR = "\n@@@\n";

/** True when the language is written right-to-left. */
export function isRtlLanguage(language: string) {
  return RTL.has(language);
}

/** Detects the language to show first: saved preference, then browser language. */
function detectLanguage(): string {
  const preferred = getPreferredLanguage();
  if (preferred) return preferred;
  if (typeof navigator === "undefined") return "Italiano";
  const full = (navigator.language || "it").toLowerCase();
  const first = full.split(/[-_]/)[0];
  return BROWSER_LANG[full] ?? (first !== undefined ? BROWSER_LANG[first] : undefined) ?? "Italiano";
}

/**
 * Translates a fixed list of Italian texts into the reader's language,
 * automatically on first render and again whenever the language changes.
 */
export function useAutoTranslatedTexts(source: readonly string[]) {
  const [language, setLanguage] = useState("Italiano");
  const [translated, setTranslated] = useState<readonly string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ensureTicket = useTranslationTicket();
  const translate = useServerFn(translateSiteText);
  const translateRef = useRef(translate);
  translateRef.current = translate;

  const joined = useMemo(() => source.join(SEPARATOR), [source]);

  useEffect(() => {
    setLanguage(detectLanguage());
    return onPreferredLanguageChange((value) => setLanguage(value ?? detectLanguage()));
  }, []);

  useEffect(() => {
    if (language === "Italiano") {
      setTranslated(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const ticket = await ensureTicket();
        const result = await translateRef.current({
          data: { text: joined, from: "Italiano", to: language, ticket },
        });
        const parts = result.translation.split("@@@").map((part) => part.trim());
        if (cancelled) return;
        setTranslated(parts.length === source.length ? parts : null);
      } catch {
        if (!cancelled) setTranslated(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [language, joined, source.length, ensureTicket]);

  const texts = translated ?? source;
  return {
    /** Texts in the reader's language (Italian while loading or on failure). */
    texts,
    language,
    setLanguage,
    loading,
    rtl: isRtlLanguage(language) && translated !== null,
    languages: LANGUAGES,
  };
}
