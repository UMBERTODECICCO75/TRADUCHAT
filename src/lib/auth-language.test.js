import { afterEach, expect, test } from "bun:test";
import { detectAuthLang, saveAuthLang } from "./auth-i18n";

const originalWindow = globalThis.window;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
afterEach(() => {
  globalThis.window = originalWindow;
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalThis.navigator;
});

test("Portuguese browser locales and saved login preference resolve to pt", () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  for (const language of ["pt-PT", "pt-BR"]) {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language } });
    expect(detectAuthLang()).toBe("pt");
  }
  saveAuthLang("es");
  expect(detectAuthLang()).toBe("es");
  saveAuthLang("pt");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "it-IT" } });
  expect(detectAuthLang()).toBe("pt");
});

test("Arabic browser locales and saved login preference resolve to ar", () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  for (const language of ["ar-SA", "ar-EG", "ar"]) {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language } });
    expect(detectAuthLang()).toBe("ar");
  }
  saveAuthLang("ar");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "it-IT" } });
  expect(detectAuthLang()).toBe("ar");
  saveAuthLang("pt");
  expect(detectAuthLang()).toBe("pt");
});
test("Traditional Chinese browser locales resolve to zh-TW", () => {
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) } };
  for (const language of ["zh-TW", "zh-HK", "zh-Hant"]) {
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language } });
    expect(detectAuthLang()).toBe("zh-TW");
  }
  saveAuthLang("zh-TW");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { language: "it-IT" } });
  expect(detectAuthLang()).toBe("zh-TW");
});
