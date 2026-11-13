import { afterAll, expect, mock, test } from "bun:test";

let options;
mock.module("ai", () => ({
  streamText: (input) => {
    options = input;
    return { text: Promise.resolve("Good morning") };
  },
}));
mock.module("./ai-gateway.server", () => ({
  createLovableAiGatewayProvider: () => ({ chatModel: (model) => model }),
}));

const originalKey = process.env.LOVABLE_API_KEY;
process.env.LOVABLE_API_KEY = "test-only";
const { answerQuestion } = await import("./assistant.server");
afterAll(() => {
  if (originalKey === undefined) delete process.env.LOVABLE_API_KEY;
  else process.env.LOVABLE_API_KEY = originalKey;
  mock.restore();
});

test("assistenza rapida usa il modello veloce senza ragionamento", async () => {
  expect(await answerQuestion({ question: "Come si dice buongiorno?" })).toBe("Good morning");
  expect(options.model).toBe("openai/gpt-6-luna");
  expect(options.providerOptions.lovable.reasoningEffort).toBe("none");
  expect(options.maxRetries).toBe(0);
  expect(options.abortSignal).toBeInstanceOf(AbortSignal);
});

test("invia foto come parte immagine con il testo richiesto", async () => {
  const dataUrl = `data:image/png;base64,${btoa("\x89PNG\r\n\x1a\nfixture")}`;
  await answerQuestion({ question: "Leggi lo screenshot", image: { name: "schermo.png", dataUrl } });
  expect(options.messages[0].role).toBe("user");
  expect(options.messages[0].content[0]).toEqual({ type: "text", text: "Leggi lo screenshot" });
  expect(options.messages[0].content[1].type).toBe("image");
  expect(options.messages[0].content[1].image.href).toBe(dataUrl);
});
