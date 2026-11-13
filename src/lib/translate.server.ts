import { streamText } from "ai";

export async function translateText(input: { text: string; from: string; to: string }) {
  if (input.from === input.to) return input.text;
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Configurazione AI mancante (LOVABLE_API_KEY).");

  const { createLovableResponses } = await import("./ai-responses.server");
  const gateway = createLovableResponses(key);

  try {
    const result = streamText({
      model: gateway.responses("openai/gpt-6-astra"),
      system:
        "Sei un traduttore professionista. Traduci il messaggio dell'utente da " +
        input.from +
        " a " +
        input.to +
        ". Mantieni tono, registro colloquiale ed emoji. Rispondi SOLO con la traduzione, senza virgolette, note o spiegazioni.",
      prompt: input.text,
      maxRetries: 0,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const translation = (await result.text).trim();
    if (!translation) throw new Error("La traduzione non è disponibile. Riprova più tardi.");
    return translation;
  } catch (error: unknown) {
    const status =
      (error as { statusCode?: number; status?: number })?.statusCode ??
      (error as { status?: number })?.status;
    if (status === 429) throw new Error("Troppe richieste: riprova tra qualche secondo.");
    if (status === 402 || status === 403)
      throw new Error(error instanceof Error ? error.message : "Traduzione AI non disponibile. Controlla l'accesso nelle impostazioni di Lovable.");
    throw new Error(
      error instanceof Error ? error.message : "Traduzione non riuscita, riprova.",
    );
  }
}
