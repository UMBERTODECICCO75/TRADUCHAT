const encoder = new TextEncoder();

const TICKET_TTL_MS = 10 * 60 * 1000;

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function key() {
  const secret = process.env["TRANSLATE_TICKET_SECRET"];
  if (!secret) throw new Error("Servizio di traduzione non configurato.");
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: string) {
  const sig = await crypto.subtle.sign("HMAC", await key(), encoder.encode(payload));
  return b64url(new Uint8Array(sig));
}

export async function issueTicket() {
  const payload = b64url(
    encoder.encode(JSON.stringify({ id: crypto.randomUUID(), exp: Date.now() + TICKET_TTL_MS })),
  );
  return { ticket: `${payload}.${await sign(payload)}`, expiresIn: TICKET_TTL_MS };
}

/** Returns the ticket id when the ticket is authentic and unexpired, otherwise null. */
export async function verifyTicket(ticket: string): Promise<string | null> {
  const [payload, signature] = ticket.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload);
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as {
      id?: unknown;
      exp?: unknown;
    };
    if (typeof data.id !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data.id;
  } catch {
    return null;
  }
}

/** Server-side usage cap so the paid AI endpoint cannot be scripted for free. */
export async function withinQuota(bucket: string, limit: number, windowSeconds: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("bump_translation_usage", {
    _key: bucket,
    _limit: limit,
    _window: `${windowSeconds} seconds`,
  });
  if (error) return false;
  return data === true;
}
