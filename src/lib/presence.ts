/** Presence: who is online and how to phrase "last activity" in Italian. */

/** A person counts as online when they did something in the last 2 minutes. */
export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

/** "in linea" or a human "last seen" label, e.g. "ultima attività 5 minuti fa". */
export function presenceLabel(lastSeenAt: string | null | undefined): string {
  if (!lastSeenAt) return "mai in linea";
  if (isOnline(lastSeenAt)) return "in linea";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `ultima attività ${Math.max(1, minutes)} min fa`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `ultima attività ${hours} h fa`;
  const days = Math.round(hours / 24);
  if (days < 7) return `ultima attività ${days} g fa`;
  return `ultima attività il ${new Date(lastSeenAt).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  })}`;
}
