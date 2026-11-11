import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateTargetLanguage } from "@/lib/languages";
import { TranslationCache, needsTranslation } from "@/lib/translation-cache";

// Kept for the lifetime of the server instance: repeated texts are answered instantly.
const cache = new TranslationCache(1000);
// Identical requests arriving at the same time share one AI call.
const inFlight = new Map<string, Promise<TranslateResult>>();

type TranslateResult = { ok: true; translation: string } | { ok: false; error: string };

// The AI client is built once per API key instead of on every message.
let client: { apiKey: string; provider: import("@ai-sdk/openai").OpenAIProvider; generateText: typeof import("ai").generateText } | undefined;
async function getClient(apiKey: string) {
  if (client?.apiKey === apiKey) return client;
  const [{ createOpenAI }, { generateText }] = await Promise.all([import("@ai-sdk/openai"), import("ai")]);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  client = { apiKey, provider, generateText };
  return client;
}

async function callModel(apiKey: string, text: string, target: string): Promise<TranslateResult> {
  const { provider, generateText } = await getClient(apiKey);
  try {
    const result = await generateText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: `You are a translator. Translate the user's message into ${target}. Reply ONLY with the translation, no quotes or explanations. Keep tone and emojis.`,
      messages: [{ role: "user", content: text }],
      maxRetries: 1,
      timeout: 20_000,
      providerOptions: {
        // Single-turn request: no need to ask for encrypted reasoning back, which only adds payload.
        openai: { store: false, forceReasoning: true, reasoningEffort: "low" },
      },
    });
    const out = result.text.trim();
    if (!out) return { ok: false, error: "Nessuna traduzione ricevuta" };
    cache.set(text, target, out);
    return { ok: true, translation: out };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    console.error("translate error", status, e);
    if (status === 429) return { ok: false, error: "Troppe richieste, riprova tra poco" };
    if (status === 402) return { ok: false, error: "Crediti AI esauriti" };
    return { ok: false, error: "Traduzione non riuscita" };
  }
}

export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; target: string }) => {
    const text = String(input.text ?? "").trim();
    const target = validateTargetLanguage(input.target);
    if (!text || text.length > 2000) throw new Error("Testo non valido (max 2000 caratteri)");
    return { text, target };
  })
  .handler(async ({ data }): Promise<TranslateResult> => {
    if (!needsTranslation(data.text)) return { ok: true, translation: data.text };
    const cached = cache.get(data.text, data.target);
    if (cached !== undefined) return { ok: true, translation: cached };

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "Traduzione non configurata" };

    const key = TranslationCache.key(data.text, data.target);
    const pending = inFlight.get(key);
    if (pending) return pending;
    const job = callModel(apiKey, data.text, data.target).finally(() => inFlight.delete(key));
    inFlight.set(key, job);
    return job;
  });
