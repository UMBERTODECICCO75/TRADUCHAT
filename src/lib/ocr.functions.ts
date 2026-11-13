import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ReadImageInput = z.object({
  /** base64 (no data: prefix) of a JPEG/PNG photo. */
  image: z.string().min(100).max(10_000_000),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
  ticket: z.string().min(10).max(400),
});

function clientKey() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip =
    forwarded.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

/** Reads text (titles, signs, documents) from a photo with the Lovable AI vision model. */
export const readTextFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReadImageInput.parse(input))
  .handler(async ({ data }) => {
    const { verifyTicket, withinQuota } = await import("./translate-ticket.server");

    const ticketId = await verifyTicket(data.ticket);
    if (!ticketId) throw new Error("Sessione scaduta, ricarica la pagina.");

    const ok =
      (await withinQuota(`img:${ticketId}`, 20, 600)) &&
      (await withinQuota(`imgr:${clientKey()}`, 60, 3600));
    if (!ok) throw new Error("Hai raggiunto il limite di letture da foto, riprova più tardi.");

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("Configurazione AI mancante (LOVABLE_API_KEY).");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "Leggi il testo presente in questa foto (titolo, cartello, documento o etichetta) " +
                  "e trascrivilo esattamente com'è, nella lingua originale. " +
                  "Rispondi SOLO con il testo letto, senza commenti, senza virgolette, senza markdown. " +
                  "Se non c'è testo leggibile, rispondi esattamente: NESSUN_TESTO",
              },
              {
                type: "image_url",
                image_url: { url: `data:${data.mimeType};base64,${data.image}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 429)
        throw new Error("Troppe richieste: riprova tra qualche secondo.");
      if (response.status === 402)
        throw new Error("Crediti AI esauriti: ricaricali nelle impostazioni di Lovable.");
      if (response.status === 403)
        throw new Error("Accesso all'AI bloccato dalle impostazioni del workspace.");
      throw new Error(`Lettura non riuscita (${response.status}). ${body.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const raw = json.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!text || text === "NESSUN_TESTO") {
      throw new Error("Non ho trovato testo leggibile nella foto: avvicinati e riprova.");
    }
    return { text: text.slice(0, 6000) };
  });
