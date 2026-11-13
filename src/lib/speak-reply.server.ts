/** Turns a short reply text into a spoken WAV clip with the Lovable AI speech model. */

type CachedAudio = { audio: string; expiresAt: number };

const AUDIO_TTL_MS = 24 * 60 * 60 * 1000;
const AUDIO_CACHE_MAX = 200;

// Same text spoken again within 24 h replays the saved audio instead of paying the TTS model.
const audioCache = new Map<string, CachedAudio>();
// Identical requests already in flight share one network call.
const inFlight = new Map<string, Promise<{ audio: string }>>();

function readCache(key: string): { audio: string } | null {
  const hit = audioCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    audioCache.delete(key);
    return null;
  }
  // Refresh recency so the most reused clips survive the size cap.
  audioCache.delete(key);
  audioCache.set(key, hit);
  return { audio: hit.audio };
}

function writeCache(key: string, audio: string) {
  audioCache.set(key, { audio, expiresAt: Date.now() + AUDIO_TTL_MS });
  while (audioCache.size > AUDIO_CACHE_MAX) {
    const oldest = audioCache.keys().next().value;
    if (oldest === undefined) break;
    audioCache.delete(oldest);
  }
}

async function synthesize(spoken: string, key: string) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-tts-preview",
      contents: [{ role: "user", parts: [{ text: spoken }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
      },
      stream_format: "audio",
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("Troppe richieste: riprova tra qualche secondo.");
    if (response.status === 402)
      throw new Error("Crediti AI esauriti: ricaricali nelle impostazioni di Lovable.");
    if (response.status === 403)
      throw new Error("Accesso all'AI bloccato dalle impostazioni del workspace.");
    throw new Error(`Voce non riuscita (${response.status}).`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error("La voce non è stata prodotta, riprova.");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { audio: btoa(binary) };
}

export async function speakReply(text: string) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Configurazione AI mancante (LOVABLE_API_KEY).");

  const spoken = text.trim().slice(0, 700);
  if (!spoken) throw new Error("Non c'è nessun testo da leggere.");

  const cached = readCache(spoken);
  if (cached) return cached;

  const pending = inFlight.get(spoken);
  if (pending) return pending;

  const request = synthesize(spoken, key)
    .then((result) => {
      writeCache(spoken, result.audio);
      return result;
    })
    .finally(() => {
      inFlight.delete(spoken);
    });
  inFlight.set(spoken, request);
  return request;
}
