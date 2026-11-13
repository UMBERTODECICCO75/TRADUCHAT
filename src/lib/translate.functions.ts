import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TranslateInput = z.object({
  text: z.string().min(1).max(6000),
  from: z.string().min(2).max(40),
  to: z.string().min(2).max(40),
  ticket: z.string().min(10).max(400),
});

function clientKey() {
  const forwarded = getRequestHeader("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || getRequestHeader("cf-connecting-ip") || "unknown";
  return `ip:${ip}`;
}

/** Issues a short-lived, signed ticket that the translation endpoint requires. */
export const getTranslationTicket = createServerFn({ method: "POST" }).handler(async () => {
  const { issueTicket, withinQuota } = await import("./translate-ticket.server");
  if (!(await withinQuota(`ticket:${clientKey()}`, 60, 3600))) {
    return { ticket: "", expiresIn: 0, error: "Troppe richieste, riprova più tardi." };
  }
  return issueTicket();
});

export const translateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranslateInput.parse(input))
  .handler(async ({ data }) => {
    const { verifyTicket, withinQuota } = await import("./translate-ticket.server");

    const ticketId = await verifyTicket(data.ticket);
    if (!ticketId) throw new Error("Sessione scaduta, ricarica la pagina.");

    const ok =
      (await withinQuota(`t:${ticketId}`, 200, 600)) &&
      (await withinQuota(`tr:${clientKey()}`, 300, 3600));
    if (!ok) throw new Error("Hai raggiunto il limite di traduzioni, riprova più tardi.");

    // Shared cache: a text already translated for anyone skips the paid AI call.
    if (data.from !== data.to) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const cached = await supabaseAdmin.rpc("get_cached_translation", {
        _from: data.from,
        _to: data.to,
        _source: data.text,
      });
      if (!cached.error && typeof cached.data === "string" && cached.data) {
        return { translation: cached.data };
      }
    }

    const { translateText } = await import("./translate.server");
    const translation = await translateText({ text: data.text, from: data.from, to: data.to });

    if (data.from !== data.to && translation !== data.text) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.rpc("store_cached_translation", {
        _from: data.from,
        _to: data.to,
        _source: data.text,
        _translation: translation,
      });
    }
    return { translation };
  });

/**
 * Public translation of fixed site texts (legal pages) for signed-out visitors.
 * Italian source only, ticket-bound, tightly rate-limited and cached.
 */
export const translateSiteText = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TranslateInput.extend({ from: z.literal("Italiano") }).parse(input))
  .handler(async ({ data }) => {
    const { verifyTicket, withinQuota } = await import("./translate-ticket.server");
    const ticketId = await verifyTicket(data.ticket);
    if (!ticketId) throw new Error("Sessione scaduta, ricarica la pagina.");
    if (data.to === data.from) return { translation: data.text };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cached = await supabaseAdmin.rpc("get_cached_translation", { _from: data.from, _to: data.to, _source: data.text });
    if (!cached.error && typeof cached.data === "string" && cached.data) return { translation: cached.data };
    const ok = (await withinQuota(`st:${ticketId}`, 6, 600)) && (await withinQuota(`sti:${clientKey()}`, 20, 3600));
    if (!ok) throw new Error("Hai raggiunto il limite di traduzioni, riprova più tardi.");
    const { translateText } = await import("./translate.server");
    const translation = await translateText({ text: data.text, from: data.from, to: data.to });
    if (translation !== data.text) {
      await supabaseAdmin.rpc("store_cached_translation", { _from: data.from, _to: data.to, _source: data.text, _translation: translation });
    }
    return { translation };
  });
