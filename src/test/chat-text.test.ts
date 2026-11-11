import { describe, expect, it } from "vitest";
import { translatedVoiceInsert, chatMessageInsert, chatMessageToMsg, type ChatMessageRow } from "@/lib/chat-text";

describe("Chat text messages", () => {
  it("stores a translated voice with original wording and recipient", () => {
    const row = translatedVoiceInsert("me", "other", "Mario", "Hello", "Ciao", "Inglese", "me/voice.wav");
    expect(row).toEqual({ sender_id: "me", recipient_id: "other", chat_key: "Mario", body: "Hello", original: "Ciao", target_lang: "Inglese", audio_path: "me/voice.wav" });
    expect(chatMessageToMsg({ ...row, id: "v", created_at: "2026-11-10T00:00:00Z" }, "other")).toMatchObject({ me: false, audioPath: "me/voice.wav", text: "Hello", tr: "Ciao" });
  });
  it("rejects voice notes without a real recipient", () => {
    expect(() => translatedVoiceInsert("me", "", "Mario", "Hello", "Ciao", "Inglese", "me/voice.wav")).toThrow();
    expect(() => translatedVoiceInsert("me", "me", "Mario", "Hello", "Ciao", "Inglese", "me/voice.wav")).toThrow();
  });
  it("rejects voice paths owned by another account", () => {
    expect(() => translatedVoiceInsert("me", "other", "Mario", "Hello", "Ciao", "Inglese", "other/voice.wav")).toThrow();
  });
  it("stores the sender, recipient and conversation of a message", () => {
    expect(chatMessageInsert("me", "Mario Rossi", " Ciao! ", "other")).toEqual({
      sender_id: "me", recipient_id: "other", chat_key: "Mario Rossi", body: "Ciao!", original: null, target_lang: null,
    });
  });
  it("rejects an empty message without sending it", () => {
    expect(() => chatMessageInsert("me", "Mario Rossi", "   ", "other")).toThrow("Messaggio vuoto");
  });
  it("keeps the original wording next to the translated text", () => {
    const row: ChatMessageRow = {
      id: "1", sender_id: "me", recipient_id: "other", chat_key: "k",
      body: "Hello!", original: "Ciao!", target_lang: "Inglese", created_at: "2026-11-08T12:00:00Z",
    };
    const msg = chatMessageToMsg(row, "me");
    expect(msg.me).toBe(true);
    expect(msg.text).toBe("Hello!");
    expect(msg.tr).toBe("Ciao!");
    expect(msg.trLang).toBe("Inglese");
  });
  it("marks messages from the other person as received", () => {
    const row: ChatMessageRow = {
      id: "2", sender_id: "other", recipient_id: "me", chat_key: "k",
      body: "Hi", original: null, target_lang: null, created_at: "2026-11-08T12:00:00Z",
    };
    expect(chatMessageToMsg(row, "me").me).toBe(false);
  });
});

import { groupConversations } from "@/lib/chat-text";
describe("chat list", () => {
  it("shows one row per real contact with the latest message", () => {
    const r = (id: string, s: string, rc: string, body: string, at: string) => ({ id, sender_id: s, recipient_id: rc, chat_key: "x", body, original: null, target_lang: null, created_at: at });
    const out = groupConversations([r("1", "me", "a", "old", "2026-01-01"), r("2", "a", "me", "new", "2026-01-02"), r("3", "me", "b", "hi", "2026-01-01")], "me", { a: "Anna" });
    expect(out.map(c => [c.name, c.preview])).toEqual([["Anna", "new"], ["x", "hi"]]);
  });
});
