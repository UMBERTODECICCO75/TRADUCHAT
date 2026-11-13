/** Documents and voice clips sent in a conversation, kept private and shown via signed links. */
const CHAT_FILES_BUCKET = "chat-files";
// Short-lived: signed links cannot be revoked, so keep the window small after a member leaves.
const SIGNED_URL_TTL = 5 * 60; // five minutes

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function signChatFilePaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (unique.length === 0) return {};
  const db = await admin();
  const { data, error } = await db.storage
    .from(CHAT_FILES_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}

/** Stores a PDF or a voice clip and returns its storage path. */
export async function uploadChatFile(input: {
  roomId: string;
  userId: string;
  base64: string;
  mimeType: string;
  extension: string;
}): Promise<string> {
  const bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));
  const path = `${input.roomId}/${input.userId}-${Date.now()}-${crypto.randomUUID()}.${input.extension}`;
  const db = await admin();
  const { error } = await db.storage
    .from(CHAT_FILES_BUCKET)
    .upload(path, bytes, { contentType: input.mimeType, upsert: false });
  if (error) throw new Error("Non riesco a caricare il file, riprova.");
  return path;
}
