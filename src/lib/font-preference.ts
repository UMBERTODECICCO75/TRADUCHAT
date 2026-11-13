/** Device-specific writing style; the existing typography remains the default. */
export type FontPreference = "original" | "lineare" | "classico";

const KEY = "traduchat:font";

export function readFontPreference(): FontPreference {
  if (typeof window === "undefined") return "original";
  const value = window.localStorage.getItem(KEY);
  return value === "lineare" || value === "classico" ? value : "original";
}

export function applyFontPreference(font: FontPreference) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("font-lineare", font === "lineare");
  document.documentElement.classList.toggle("font-classico", font === "classico");
}

export function saveFontPreference(font: FontPreference) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, font);
  applyFontPreference(font);
}