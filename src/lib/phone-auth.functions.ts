import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Twilio Verify service used to send and check 6-digit SMS or voice codes. */
const VERIFY_SERVICE_SID = "VA3f78e5feb58be6b7fcad85c1e844ce50";
const GATEWAY = "https://connector-gateway.lovable.dev/twilio";

/** Turns what the person typed into E.164 (Italian numbers default to +39). */
function toE164(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s().-]/g, "");
  // An international prefix must be explicit (+ or 00). Bare local numbers default to Italy.
  const explicit = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed.startsWith("00") ? trimmed.slice(2) : trimmed;
  if (!/^\d{6,15}$/.test(digits)) return null;
  const normalized = explicit || digits.startsWith("39") ? digits : `39${digits}`;
  return /^\d{8,15}$/.test(normalized) ? `+${normalized}` : null;
}

/** Languages Twilio Verify can use for the SMS / voice message; anything else falls back to English. */
const VERIFY_LOCALES: Record<string, string> = {
  it: "it", en: "en", es: "es", fr: "fr", de: "de", ru: "ru", pt: "pt", ar: "ar", zh: "zh", "zh-TW": "zh-HK",
};
function verifyLocale(lang?: string) {
  return (lang && (VERIFY_LOCALES[lang] ?? VERIFY_LOCALES[lang.split("-")[0] ?? ""])) || "en";
}

/** Synthetic login address derived from the phone number. */
function phoneEmail(e164: string) {
  return `${e164.replace("+", "")}@telefono.traduchat.app`;
}

async function twilio(path: string, form: Record<string, string>) {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!lovableKey || !twilioKey) throw new Error("Verifica telefonica non configurata.");
  const response = await fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`Twilio Verify failed [${response.status}]: ${text}`);
    throw new Error(path.endsWith("VerificationCheck")
      ? "Non riesco a verificare il codice. Controllalo e riprova."
      : "Non riesco a inviare il codice. Controlla il numero e riprova.");
  }
  return JSON.parse(text) as { status?: string; valid?: boolean };
}

/** Sends a 6-digit code by SMS or automated voice call to the given phone number. */
export const sendPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; channel: "sms" | "call"; locale?: string }) =>
    z
      .object({ phone: z.string().min(5).max(30), channel: z.enum(["sms", "call"]), locale: z.string().max(10).optional() })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const to = toE164(data.phone);
    if (!to) throw new Error("Numero di telefono non valido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error: limitError } = await supabaseAdmin.rpc("bump_translation_usage", {
      _key: `phone-code:${to}`,
      _limit: 5,
      _window: "01:00:00",
    });
    if (limitError) throw new Error("Verifica temporaneamente non disponibile. Riprova più tardi.");
    if (allowed === false) throw new Error("Troppi tentativi. Riprova tra un'ora.");

    const sent = await twilio(`/verify/v2/Services/${VERIFY_SERVICE_SID}/Verifications`, {
      To: to,
      Channel: data.channel,
      Locale: verifyLocale(data.locale),
    });
    if (sent.status !== "pending") throw new Error("Non riesco a inviare il codice. Riprova.");
    return { phone: to };
  });

/**
 * Checks the phone code and, when it matches, prepares a one-time sign-in
 * for that phone number (creating the account the first time).
 */
export const verifyPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((input: { phone: string; code: string; recoverOnly?: boolean }) =>
    z.object({ phone: z.string().min(5).max(30), code: z.string().regex(/^\d{6}$/), recoverOnly: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const to = toE164(data.phone);
    if (!to) throw new Error("Numero di telefono non valido.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed, error: limitError } = await supabaseAdmin.rpc("bump_translation_usage", {
      _key: `phone-check:${to}`,
      _limit: 20,
      _window: "01:00:00",
    });
    if (limitError) throw new Error("Verifica temporaneamente non disponibile. Riprova più tardi.");
    if (allowed === false) throw new Error("Troppi tentativi di verifica. Riprova tra un'ora.");

    const check = await twilio(`/verify/v2/Services/${VERIFY_SERVICE_SID}/VerificationCheck`, {
      To: to,
      Code: data.code,
    });
    if (check.status !== "approved" || check.valid !== true) {
      throw new Error("Codice non valido o scaduto.");
    }

    const email = phoneEmail(to);
    const password = crypto.randomUUID() + crypto.randomUUID();

    // Find the account tied to this number, or create it on first access.
    const { data: existing, error: identityLookupError } = await supabaseAdmin
      .from("phone_login_identities")
      .select("user_id")
      .eq("phone", to)
      .maybeSingle();
    if (identityLookupError) throw new Error("Verifica temporaneamente non disponibile.");

    let userId = existing?.user_id ?? null;
    // Password recovery must never create a new, empty account.
    if (!userId && data.recoverOnly) throw new Error("Nessun account collegato a questo numero. Recupera la password con l'email.");
    if (!userId) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { phone: to },
      });
      if (created.error || !created.data.user) {
        console.error("createUser failed", created.error);
        throw new Error("Non riesco a creare l'account con questo numero.");
      }
      userId = created.data.user.id;
    } else {
      // A profile email is editable: never use it alone to select an Auth account.
      const { data: account, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (lookupError || account.user?.email?.toLowerCase() !== email) {
        throw new Error("Account telefonico non valido. Contatta l'assistenza.");
      }
      const updated = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (updated.error) {
        console.error("updateUserById failed", updated.error);
        throw new Error("Non riesco a completare l'accesso.");
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(existing ? { id: userId } : { id: userId, email, phone: to }, { onConflict: "id" });
    if (profileError) {
      console.error("Phone profile upsert failed", profileError);
      throw new Error("Non riesco a completare l'accesso.");
    }

    const { error: identityError } = await supabaseAdmin.from("phone_login_identities").upsert({ phone: to, user_id: userId }, { onConflict: "phone" });
    if (identityError) throw new Error("Non riesco a confermare l’identità telefonica.");
    return { email, password };
  });
