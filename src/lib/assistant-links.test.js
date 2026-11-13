import { expect, test } from "bun:test";
import { assistantTextParts } from "./assistant-links";

test("recognizes website links without surrounding punctuation", () => {
  const text = "Visita https://example.com/info?q=ciao. Poi www.wikipedia.org!";
  const parts = assistantTextParts(text);
  expect(parts.filter(part => part.href).map(part => part.href)).toEqual([
    "https://example.com/info?q=ciao", "http://www.wikipedia.org/",
  ]);
  expect(parts.map(part => part.text).join("")).toBe(text);
});

test("never links executable protocols or embedded credentials", () => {
  const parts = assistantTextParts("javascript:alert(1) data:text/html,hello https://user:password@example.com/private");
  expect(parts.filter(part => part.href)).toEqual([]);
});

test("preserves plain text without interpreting HTML", () => {
  const text = '<script>alert(1)</script> Nessun collegamento';
  expect(assistantTextParts(text)).toEqual([{ text }]);
});