import { expect, test } from "bun:test";
import { decodeCaption, encodeCaption, isFatalRecognitionError, keepRecent } from "./call-captions";

test("a caption survives the data channel as text or bytes", () => {
  const message = encodeCaption(" Ciao, come stai? ", "Hi, how are you?");
  expect(decodeCaption(message)).toEqual({
    original: "Ciao, come stai?",
    translated: "Hi, how are you?",
  });
  expect(decodeCaption(new TextEncoder().encode(message))).toEqual({
    original: "Ciao, come stai?",
    translated: "Hi, how are you?",
  });
});

test("other data-channel payloads are ignored", () => {
  expect(decodeCaption("not json")).toBeNull();
  expect(
    decodeCaption(JSON.stringify({ kind: "other", original: "a", translated: "b" })),
  ).toBeNull();
  expect(
    decodeCaption(JSON.stringify({ kind: "traduchat:caption", original: 1, translated: "b" })),
  ).toBeNull();
  expect(
    decodeCaption(JSON.stringify({ kind: "traduchat:caption", original: " ", translated: "" })),
  ).toBeNull();
  expect(decodeCaption(42)).toBeNull();
});

test("a missing translation falls back to the original text", () => {
  expect(
    decodeCaption(JSON.stringify({ kind: "traduchat:caption", original: "Hola", translated: "" })),
  ).toEqual({ original: "Hola", translated: "Hola" });
});

test("captions are bounded in length and count", () => {
  const long = "a".repeat(5000);
  expect(decodeCaption(encodeCaption(long, long))?.original.length).toBe(1000);
  expect(keepRecent([1, 2, 3, 4], 5)).toEqual([2, 3, 4, 5]);
});

test("only permanent recognition errors stop captions", () => {
  expect(isFatalRecognitionError("not-allowed")).toBe(true);
  expect(isFatalRecognitionError("audio-capture")).toBe(true);
  expect(isFatalRecognitionError("no-speech")).toBe(false);
  expect(isFatalRecognitionError("aborted")).toBe(false);
});
