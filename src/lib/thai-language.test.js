import { afterEach, expect, test } from "bun:test";

import { AUTH_COPY, AUTH_LANGS, AUTH_LANG_LABELS } from "./auth-i18n";
import { LANDING_COPY, LANDING_LANGS, LANDING_LANG_LABELS, LANDING_LANGUAGE_NAMES, detectLandingLang } from "./landing-i18n";
import { LANGUAGES } from "./languages";
import { LANGUAGE_CODES } from "./speech.server";

const originalWindow = globalThis.window;
afterEach(() => {
  globalThis.window = originalWindow;
});

test("Thai is selectable in the app, for transcription and on the landing page", () => {
  expect(LANGUAGES).toContain("Thailandese");
  expect(LANGUAGE_CODES["Thailandese"]).toBe("th");
  expect(LANDING_LANGS).toContain("th");
  expect(LANDING_LANG_LABELS.th).toBe("ไทย");
  expect(LANDING_LANGUAGE_NAMES).toContain("ไทย");
});

test("landing page shows its whole page in Thai", () => {
  const th = LANDING_COPY.th;
  expect(th.login).toBe("เข้าสู่ระบบ");
  expect(th.title).toContain("สื่อสาร");
  expect(th.features).toHaveLength(4);
  expect(th.pricesText("50 เครดิต")).toContain("50 เครดิต");
  // Every landing text must be filled, never left in Italian.
  expect(th.terms).not.toBe(LANDING_COPY.it.terms);
  expect(th.privacy).not.toBe(LANDING_COPY.it.privacy);
});

test("sign-in screen offers Thai with every text translated", () => {
  expect(AUTH_LANGS).toContain("th");
  expect(AUTH_LANG_LABELS.th).toBe("ไทย");
  const th = AUTH_COPY.th;
  expect(Object.keys(th).sort()).toEqual(Object.keys(AUTH_COPY.it).sort());
  expect(th.login).toBe("เข้าสู่ระบบ");
  expect(th.errCode).toBe("รหัสไม่ถูกต้อง");
  for (const key of Object.keys(AUTH_COPY.it)) {
    expect(th[key]).not.toBe(AUTH_COPY.it[key]);
  }
});

test("a saved Thai choice is restored on the landing page", () => {
  globalThis.window = { localStorage: { getItem: (key) => (key === "traduchat:landing-lang" ? "th" : null) } };
  expect(detectLandingLang()).toBe("th");
});
