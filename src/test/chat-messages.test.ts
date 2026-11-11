import { describe, expect, it } from "vitest";

import {
  applyTranslation,
  applyTranslationError,
  canTranslate,
  markTranslating,
  translationLabel,
  type Msg,
} from "@/lib/chat-messages";

const received: Msg = { me: false, text: "Hi! What did you do this weekend?", time: "17:45" };
const mine: Msg = { me: true, text: "I didn't go out and you?", time: "18:04" };

describe("Translating received messages", () => {
  it("offers the action only on messages that came from the other person", () => {
    expect(canTranslate(received, "Italiano")).toBe(true);
    expect(canTranslate(mine, "Italiano")).toBe(false);
  });

  it("offers it again when the translation on screen is in another language", () => {
    const [m] = applyTranslation([received], 0, "Ciao! Cosa hai fatto questo weekend?", "Italiano");
    expect(canTranslate(m!, "Italiano")).toBe(false);
    expect(canTranslate(m!, "Spagnolo")).toBe(true);
  });

  it("keeps the original visible next to the translation", () => {
    const [m] = applyTranslation([received], 0, "Ciao! Cosa hai fatto questo weekend?", "Italiano");
    expect(m?.text).toBe("Hi! What did you do this weekend?");
    expect(m?.tr).toBe("Ciao! Cosa hai fatto questo weekend?");
    expect(m?.trLang).toBe("Italiano");
    expect(translationLabel(m!, "Italiano")).toBe("Italiano");
  });

  it("keeps the original and shows the reason when translating fails", () => {
    const [m] = applyTranslationError(markTranslating([received], 0), 0, "Traduzione non riuscita");
    expect(m?.text).toBe("Hi! What did you do this weekend?");
    expect(m?.tr).toBeUndefined();
    expect(m?.trErr).toBe("Traduzione non riuscita");
    expect(m?.trBusy).toBe(false);
  });

  it("labels my own already translated message with the wording I wrote", () => {
    const sent: Msg = { me: true, text: "What a beautiful photo!", tr: "Che bella foto!", time: "18:10" };
    expect(translationLabel(sent, "Italiano")).toBe("Originale");
  });
});
