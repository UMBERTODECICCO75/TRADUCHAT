import { afterAll, beforeEach, expect, mock, test } from "bun:test";

const wavBytes = new Uint8Array(2048).fill(7);
let calls;
const originalFetch = globalThis.fetch;
const originalKey = process.env.LOVABLE_API_KEY;
process.env.LOVABLE_API_KEY = "test-only";

globalThis.fetch = mock(async () => {
  calls += 1;
  return new Response(wavBytes, { status: 200 });
});

const { speakReply } = await import("./speak-reply.server");

beforeEach(() => {
  calls = 0;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.LOVABLE_API_KEY;
  else process.env.LOVABLE_API_KEY = originalKey;
});

test("lo stesso testo riusa l'audio in cache senza una seconda chiamata", async () => {
  const first = await speakReply("Buongiorno mondo");
  const second = await speakReply("Buongiorno mondo");
  expect(calls).toBe(1);
  expect(second.audio).toBe(first.audio);
  expect(first.audio.length).toBeGreaterThan(100);
});

test("richieste identiche contemporanee condividono una sola chiamata di rete", async () => {
  const [a, b] = await Promise.all([speakReply("Testo simultaneo"), speakReply("Testo simultaneo")]);
  expect(calls).toBe(1);
  expect(a.audio).toBe(b.audio);
});

test("testi diversi producono chiamate distinte e la rete ha un limite di attesa", async () => {
  await speakReply("Primo testo diverso");
  await speakReply("Secondo testo diverso");
  expect(calls).toBe(2);
  const options = globalThis.fetch.mock.calls[0][1];
  expect(options.signal).toBeInstanceOf(AbortSignal);
});
