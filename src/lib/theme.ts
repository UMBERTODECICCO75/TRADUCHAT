/** Theme choice, saved on the device. White/green light is the default look. */
export type Theme = "light" | "dark" | "purple";

const KEY = "traduchat:theme";
const THEMES: Theme[] = ["light", "dark", "purple"];

export function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY);
  return THEMES.includes(saved as Theme) ? (saved as Theme) : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("purple", theme === "purple");
}

export function saveTheme(theme: Theme) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, theme);
  applyTheme(theme);
}
