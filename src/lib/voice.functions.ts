import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateTargetLanguage } from "@/lib/languages";

const GW = "https://ai.gateway.lovable.dev/v1";

// Voice translation: speech → text → translated text → spoken audio (WAV, base64).
export const translateVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audio: string; target: string; speak?: boolean }) => {
    const audio = String(input.audio ?? "");
    const target = validateTargetLanguage(input.target);
    if (!audio || audio.length > 14_000_000) throw new Error("Audio non valido (max ~10MB)");
    return { audio, target, speak: input.speak !== false };
  })
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "Traduzione non configurata" };
    const fail = (s: number) =>
      ({ ok: false as const, error: s === 429 ? "Troppe richieste, riprova tra poco" : s === 402 ? "Crediti AI esauriti" : "Traduzione audio non riuscita" });

    // 1. Transcribe
    const bin = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("model", "openai/gpt-transcribe");
    form.append("file", new File([bin], "voice.wav", { type: "audio/wav" }), "voice.wav");
    form.append("response_format", "json");
    const tr = await fetch(`${GW}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    if (!tr.ok) { console.error("stt", tr.status, await tr.text()); return fail(tr.status); }
    const original = String(((await tr.json()) as { text?: string }).text ?? "").trim();
    if (!original) return { ok: false as const, error: "Non ho sentito nessuna voce, riprova" };

    // 2. Translate
    let translation = "";
    try {
      const { createOpenAI } = await import("@ai-sdk/openai");
      const { streamText } = await import("ai");
      const provider = createOpenAI({ baseURL: GW, apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system: `You are a translator. Translate the user's message into ${data.target}. Reply ONLY with the translation.`,
        messages: [{ role: "user", content: original }],
        maxRetries: 0,
        providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] } },
      });
      translation = (await result.text).trim();
    } catch (e) {
      console.error("translate", e);
      return fail((e as { statusCode?: number }).statusCode ?? 500);
    }
    if (!translation) return { ok: false as const, error: "Nessuna traduzione ricevuta" };
    if (!data.speak) return { ok: true as const, original, translation, audio: null };

    // 3. Speak (buffered WAV)
    const sp = await fetch(`${GW}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text: translation }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
      }),
    });
    if (!sp.ok) { console.error("tts", sp.status, await sp.text()); return { ok: true as const, original, translation, audio: null }; }
    const buf = new Uint8Array(await sp.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return { ok: true as const, original, translation, audio: btoa(s) };
  });
