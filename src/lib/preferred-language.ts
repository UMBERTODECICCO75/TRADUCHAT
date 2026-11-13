import { LANGUAGES } from "@/lib/languages";

const KEY = "traduchat:preferred-lang";
const EVENT = "traduchat:preferred-lang-changed";

/** Reads the preferred reading language (browser only; null on server). */
export function getPreferredLanguage(): string | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(KEY);
  return value && (LANGUAGES as readonly string[]).includes(value) ? value : null;
}

/** Saves the preferred reading language and notifies open pages without reload. */
export function setPreferredLanguage(language: string | null) {
  if (typeof window === "undefined") return;
  if (language) window.localStorage.setItem(KEY, language);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { language } }));
}

/** Subscribes to preferred-language changes; returns the unsubscribe function. */
export function onPreferredLanguageChange(listener: (language: string | null) => void) {
  function handler(event: Event) {
    listener((event as CustomEvent<{ language?: string | null }>).detail?.language ?? null);
  }
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
