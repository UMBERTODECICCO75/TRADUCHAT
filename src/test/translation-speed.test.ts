import { describe, expect, it } from "vitest";
import { TranslationCache, needsTranslation } from "@/lib/translation-cache";
import { findMsgIndex, keepLocal, sameMessages, type Msg } from "@/lib/chat-messages";

describe("TranslationCache", () => {
  it("returns cached translations and evicts the oldest", () => {
    const c = new TranslationCache(2);
    c.set("ciao", "Inglese", "hi");
    c.set("grazie", "Inglese", "thanks");
    expect(c.get(" ciao ", "Inglese")).toBe("hi");
    c.set("sì", "Inglese", "yes");
    expect(c.get("grazie", "Inglese")).toBeUndefined();
    expect(c.get("ciao", "Inglese")).toBe("hi");
    expect(c.get("ciao", "Spagnolo")).toBeUndefined();
  });
  it("skips texts without letters", () => {
    expect(needsTranslation("👍 123 !!")).toBe(false);
    expect(needsTranslation("ok 👍")).toBe(true);
    expect(needsTranslation("你好")).toBe(true);
  });
});

describe("polling keeps local changes", () => {
  const received: Msg = { msgId: "a", me: false, text: "hello", time: "10:00" };
  it("re-applies translation and reaction after a refresh", () => {
    const saved = new Map([["m:a", { tr: "ciao", trLang: "Italiano", react: "❤️" }]]);
    expect(keepLocal([received], saved)[0]).toMatchObject({ tr: "ciao", trLang: "Italiano", react: "❤️" });
  });
  it("finds a message by id even when the list shifted", () => {
    const other: Msg = { msgId: "b", me: true, text: "x", time: "09:00" };
    expect(findMsgIndex([other, { ...received }], received, 0)).toBe(1);
  });
  it("detects unchanged lists to avoid re-rendering", () => {
    expect(sameMessages([received], [{ ...received }])).toBe(true);
    expect(sameMessages([received], [{ ...received, text: "hey" }])).toBe(false);
  });
});
