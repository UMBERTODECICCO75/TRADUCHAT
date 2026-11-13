/** Photos attached to a person's status live in a private bucket: shown via signed links. */
const STATUS_BUCKET = "status-photos";
const SIGNED_URL_TTL = 60 * 60; // one hour

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Turns storage paths into temporary viewable URLs, keyed by path. */
export async function signStatusPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (unique.length === 0) return {};
  const db = await admin();
  const { data, error } = await db.storage
    .from(STATUS_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export async function signStatusPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const map = await signStatusPaths([path]);
  return map[path] ?? null;
}

/** Keeps a single status photo per person: removes every other file in their folder. */
export async function pruneOldStatusPhotos(userId: string, keepPath: string | null) {
  const db = await admin();
  const { data } = await db.storage.from(STATUS_BUCKET).list(userId, { limit: 100 });
  const stale = (data ?? [])
    .map((f) => `${userId}/${f.name}`)
    .filter((p) => p !== keepPath);
  if (stale.length > 0) await db.storage.from(STATUS_BUCKET).remove(stale);
}
