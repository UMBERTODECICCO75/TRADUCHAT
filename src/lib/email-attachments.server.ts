/** Files uploaded from the email page; each user stores them in their own private folder. */
const EMAIL_BUCKET = "email-attachments";
const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // seven days

/** Only safe, document/photo/audio types may be stored and shared. */
export const ALLOWED_ATTACHMENT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "application/pdf",
  "text/plain",
  "text/csv",
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "video/mp4",
  "application/zip",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function assertAllowedMime(mimeType: string): string {
  const normalized = mimeType.trim().toLowerCase();
  if (!ALLOWED_ATTACHMENT_MIME.has(normalized)) {
    throw new Error("Tipo di file non consentito: carica foto, PDF, documenti o audio.");
  }
  return normalized;
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Stores an attachment and returns a signed download link valid for seven days. */
export async function uploadEmailAttachmentFile(input: {
  userId: string;
  base64: string;
  mimeType: string;
  extension: string;
}): Promise<{ path: string; url: string }> {
  const contentType = assertAllowedMime(input.mimeType);
  const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));
  const path = `${input.userId}/${Date.now()}-${crypto.randomUUID()}.${input.extension}`;
  const db = await admin();
  const { error } = await db.storage
    .from(EMAIL_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error("Non riesco a caricare l'allegato, riprova.");
  const { data, error: signError } = await db.storage
    .from(EMAIL_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !data?.signedUrl) throw new Error("Allegato caricato ma non riesco a creare il link.");
  return { path, url: data.signedUrl };
}
