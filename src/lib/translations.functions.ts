import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SaveInput = z.object({
  sourceText: z.string().trim().min(1).max(6000),
  translatedText: z.string().trim().min(1).max(12000),
  from: z.string().min(2).max(40),
  to: z.string().min(2).max(40),
});

export const saveTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("translations")
      .insert({
        user_id: context.userId,
        source_text: data.sourceText,
        translated_text: data.translatedText,
        from_lang: data.from,
        to_lang: data.to,
      })
      .select("id, source_text, translated_text, from_lang, to_lang, created_at")
      .single();
    if (error || !row) throw new Error("Non riesco a salvare la traduzione.");
    return { translation: row };
  });

export const listMyTranslations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("translations")
      .select("id, source_text, translated_text, from_lang, to_lang, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error("Non riesco a leggere lo storico.");
    return { translations: data ?? [] };
  });

export const deleteTranslation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("translations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Non riesco a eliminare la traduzione.");
    return { ok: true };
  });
