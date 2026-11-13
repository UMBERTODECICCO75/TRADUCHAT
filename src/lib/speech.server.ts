/** Turns a recorded WAV clip into text with the Lovable AI transcription model. */
export async function transcribeWav(input: { base64: string; language?: string | undefined }) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Configurazione AI mancante (LOVABLE_API_KEY).");

  const binary = atob(input.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (bytes.length < 2048) throw new Error("Registrazione troppo breve: riprova.");

  const form = new FormData();
  form.append("model", "google/gemini-3.5-transcribe");
  form.append("file", new Blob([bytes], { type: "audio/wav" }), "recording.wav");
  if (input.language) form.append("language", input.language);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 429) throw new Error("Troppe richieste: riprova tra qualche secondo.");
    if (response.status === 402)
      throw new Error("Crediti AI esauriti: ricaricali nelle impostazioni di Lovable.");
    if (response.status === 403)
      throw new Error("Accesso all'AI bloccato dalle impostazioni del workspace.");
    throw new Error(`Trascrizione non riuscita (${response.status}). ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as { text?: unknown };
  const text = typeof data.text === "string" ? data.text.trim() : "";
  return { text };
}

/** ISO code the transcription model expects, for the languages of the app. */
export const LANGUAGE_CODES: Record<string, string> = {
  Italiano: "it",
  Inglese: "en",
  "Inglese (Stati Uniti)": "en",
  Francese: "fr",
  Spagnolo: "es",
  Tedesco: "de",
  Portoghese: "pt",
  "Portoghese (Brasile)": "pt",
  Rumeno: "ro",
  Russo: "ru",
  Albanese: "sq",
  Arabo: "ar",
  Ucraino: "uk",
  Cinese: "zh",
  Giapponese: "ja",
  Ebraico: "he",
  Greco: "el",
  Polacco: "pl",
  Turco: "tr",
  "Filippino (tagalog)": "tl",
  Punjabi: "pa",
  Wolof: "wo",
  Hindi: "hi",
  Coreano: "ko",
  "Cinese mandarino": "zh",
  Vietnamita: "vi",
  Thailandese: "th",
  Serbo: "sr",
  Slovacco: "sk",
  Mongolo: "mn",
  Croato: "hr",
  Svedese: "sv",
  Danese: "da",
  Norvegese: "no",
  Azerbaigiano: "az",
  "Groenlandese (Kalaallisut)": "kl",
  Inupiaq: "ik",
  Bengalese: "bn",
  Indonesiano: "id",
  "Urdu (Pakistan)": "ur",
  "Cinese tradizionale (Taiwan)": "zh",
  "Cantonese (Hong Kong)": "zh",
};
