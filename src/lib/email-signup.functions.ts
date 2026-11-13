import { createServerFn } from "@tanstack/react-start";
import { createHash, randomInt } from "node:crypto";
import { z } from "zod";

import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const CODE_TTL_MINUTES = 15;

/** Hashes the code together with the email and a server pepper. */
function hashCode(email: string, code: string) {
  const pepper = process.env["LOVABLE_API_KEY"];
  if (!pepper) throw new Error("Verifica email temporaneamente non disponibile.");
  return createHash("sha256").update(`signup:${email}:${code}:${pepper}`).digest("hex");
}

/** Sends an 6-digit code by email so the person can confirm a new account. */
export const requestEmailSignupCode = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string; phone: string }) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(200),
        phone: z.string().min(5).max(30),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (data.phone.replace(/\D/g, "").length < 6) {
      throw new Error("Inserisci il tuo numero di telefono.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: allowed, error: limitError } = await supabaseAdmin.rpc("bump_translation_usage", {
      _key: `email-code:${email}`,
      _limit: 5,
      _window: "01:00:00",
    });
    if (limitError || allowed !== true) throw new Error("Invio non disponibile o limite raggiunto. Riprova più tardi.");

    const code = String(randomInt(100_000, 1_000_000));
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

    const { error: saveError } = await supabaseAdmin.from("signup_codes").upsert(
      {
        email,
        code_hash: hashCode(email, code),
        phone: data.phone.trim(),
        expires_at: expiresAt,
        attempts: 0,
      },
      { onConflict: "email" },
    );
    if (saveError) {
      console.error("signup_codes upsert failed", saveError);
      throw new Error("Non riesco a preparare il codice. Riprova.");
    }

    const sent = await sendTemplateEmail("signup-code", email, {
      templateData: { code, email },
      idempotencyKey: `signup-code-${email}-${code}`,
    });
    if (!sent.sent) {
      throw new Error("Non riesco a inviare l'email a questo indirizzo.");
    }

    return { email };
  });

/**
 * Checks the 6-digit code and creates the account with the chosen password
 * and phone number; the client then signs in with those credentials.
 */
export const verifyEmailSignupCode = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; password: string; phone: string }) =>
    z
      .object({
        email: z.string().email(),
        code: z.string().regex(/^\d{6}$/),
        password: z.string().min(8).max(200),
        phone: z.string().min(5).max(30),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim();
    if (data.phone.replace(/\D/g, "").length < 6) {
      throw new Error("Inserisci il tuo numero di telefono.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error: checkError } = await supabaseAdmin.rpc("claim_signup_code", { p_email: email, p_hash: hashCode(email, code) });
    if (checkError) throw new Error("Verifica temporaneamente non disponibile.");
    if (result !== "approved") throw new Error(result === "limited" ? "Troppi tentativi. Richiedi un nuovo codice." : "Codice non valido o scaduto. Richiedine uno nuovo.");

    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { phone: data.phone.trim() },
    });
    if (created.error || !created.data.user) {
      const message = created.error?.message ?? "";
      if (/already|exist|registered|duplicate/i.test(message)) {
        await supabaseAdmin.from("signup_codes").delete().eq("email", email);
        throw new Error("Esiste già un account con questa email. Accedi con la password.");
      }
      console.error("createUser failed", created.error);
      throw new Error("Non riesco a creare l'account. Riprova.");
    }

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: created.data.user.id,
        email,
        phone: data.phone.replace(/[^\d+]/g, ""),
      },
      { onConflict: "id" },
    );

    if (profileError) throw new Error("Account creato, ma il profilo non è disponibile. Accedi per riprovare.");
    await supabaseAdmin.from("signup_codes").delete().eq("email", email);
    return { ok: true };
  });
