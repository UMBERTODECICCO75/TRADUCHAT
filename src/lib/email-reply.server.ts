import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

import { createLovableAiGatewayRunIdFetch } from "./ai-run-id.server";

/** Drafts an email reply with Anthropic Claude; the user sends it from their own mail app. */
export async function draftEmailReply(input: { received: string; notes: string; language: string }) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Configurazione AI mancante.");
  const run = createLovableAiGatewayRunIdFetch();
  const anthropic = createAnthropic({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey: key,
    headers: { "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: run.fetch,
  });

  let refused = false;
  try {
    const result = streamText({
      model: anthropic("anthropic/claude-sonnet-5"),
      maxOutputTokens: 4000,
      maxRetries: 0,
      system:
        "Sei l'assistente email di TraduChat. Scrivi una risposta cortese e professionale all'email ricevuta, " +
        `in lingua ${input.language}. Rispondi SOLO con il corpo dell'email (saluto, testo, chiusura), ` +
        "senza oggetto, senza markdown e senza inventare fatti, date o impegni non indicati. Non firmare a nome di TraduChat: chiudi con un saluto senza nome.",
      prompt:
        `Email ricevuta:\n${input.received}\n\n` +
        (input.notes ? `Indicazioni per la risposta:\n${input.notes}` : "Nessuna indicazione aggiuntiva."),
      onFinish: ({ finishReason }) => {
        if (String(finishReason) === "content-filter") refused = true;
      },
    });
    const text = (await result.text).trim();
    if (refused || !text) throw new Error("L'IA non ha potuto preparare questa risposta.");
    return text;
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode;
    if (status === 429) throw new Error("Troppe richieste: riprova tra qualche secondo.");
    if (status === 402) throw new Error("Crediti AI esauriti: ricaricali nelle impostazioni di Lovable.");
    throw new Error(error instanceof Error ? error.message : "Risposta non riuscita, riprova.");
  }
}
