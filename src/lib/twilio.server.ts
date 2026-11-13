/**
 * Single entry point for every Twilio call (Verify codes and TURN tokens).
 *
 * Two ways to connect, chosen automatically:
 *  1. Direct Twilio account — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
 *     (or an API key pair: TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET).
 *     Works on any hosting, independent of Lovable.
 *  2. Lovable Twilio connector — LOVABLE_API_KEY + TWILIO_API_KEY (previous setup).
 */

const GATEWAY = "https://connector-gateway.lovable.dev/twilio";

/** Verify service that sends the 6-digit codes; can be overridden per account. */
export const VERIFY_SERVICE_SID = process.env["TWILIO_VERIFY_SERVICE_SID"] || "VA3f78e5feb58be6b7fcad85c1e844ce50";

function directCredentials() {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  if (!accountSid) return null;
  const user = process.env["TWILIO_API_KEY_SID"] || accountSid;
  const secret = process.env["TWILIO_API_KEY_SECRET"] || process.env["TWILIO_AUTH_TOKEN"];
  if (!secret) return null;
  return { accountSid, auth: `Basic ${Buffer.from(`${user}:${secret}`).toString("base64")}` };
}

export function twilioConfigured() {
  return Boolean(directCredentials() || (process.env["LOVABLE_API_KEY"] && process.env["TWILIO_API_KEY"]));
}

/**
 * POSTs a form to Twilio. `path` uses the gateway convention:
 * "/verify/v2/..." for Verify, "/Tokens.json" (or other "/X.json") for the account REST API.
 */
export async function twilioPost(path: string, form: Record<string, string>, timeoutMs = 12000): Promise<Response> {
  const body = new URLSearchParams(form);
  const signal = AbortSignal.timeout(timeoutMs);
  const direct = directCredentials();
  if (direct) {
    const url = path.startsWith("/verify/")
      ? `https://verify.twilio.com${path.slice("/verify".length)}`
      : `https://api.twilio.com/2010-04-01/Accounts/${direct.accountSid}${path}`;
    return fetch(url, {
      method: "POST",
      headers: { Authorization: direct.auth, "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal,
    });
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["TWILIO_API_KEY"];
  if (!lovableKey || !connectionKey) throw new Error("Twilio non configurato.");
  return fetch(`${GATEWAY}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal,
  });
}
