/** Messages typed while offline are kept on the phone until they can be sent. */
export type OutboxItem = {
  id: string;
  text: string;
  from: string;
  to: string;
  createdAt: number;
};

const PREFIX = "traduchat:outbox:";

function key(code: string) {
  return `${PREFIX}${code.toUpperCase()}`;
}

export function readOutbox(code: string): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(code));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is OutboxItem =>
        typeof i === "object" &&
        i !== null &&
        typeof (i as OutboxItem).id === "string" &&
        typeof (i as OutboxItem).text === "string",
    );
  } catch {
    return [];
  }
}

export function writeOutbox(code: string, items: OutboxItem[]) {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) window.localStorage.removeItem(key(code));
    else window.localStorage.setItem(key(code), JSON.stringify(items));
  } catch {
    /* storage full or unavailable: nothing else to do */
  }
}

export function newOutboxId() {
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
