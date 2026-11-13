/**
 * Local copy of a conversation: messages and their extra translations are kept
 * on the phone, so the chat and its PDF stay complete without a connection.
 */
export type CachedMessage = {
  id: string;
  sender_id: string;
  original: string;
  translation: string | null;
  from_lang: string;
  to_lang: string;
  image_path?: string | null;
  imageUrl?: string | null;
};

const MESSAGES_PREFIX = "traduchat:chat:";
const TRANSLATIONS_PREFIX = "traduchat:chat-translations:";
const MAX_MESSAGES = 500;

function read<T>(storageKey: string, fallback: T, ok: (value: unknown) => boolean): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return ok(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(storageKey: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* storage full or unavailable: nothing else to do */
  }
}

export function readCachedMessages(code: string): CachedMessage[] {
  const items = read<CachedMessage[]>(
    `${MESSAGES_PREFIX}${code.toUpperCase()}`,
    [],
    (v) => Array.isArray(v),
  );
  return items.filter(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      typeof m.id === "string" &&
      typeof m.original === "string" &&
      typeof m.from_lang === "string" &&
      typeof m.to_lang === "string",
  );
}

export function writeCachedMessages(code: string, messages: CachedMessage[]) {
  write(`${MESSAGES_PREFIX}${code.toUpperCase()}`, messages.slice(-MAX_MESSAGES));
}

/** Extra translations, keyed by `${messageId}:${language}`. */
export function readCachedTranslations(code: string): Record<string, string> {
  const value = read<Record<string, string>>(
    `${TRANSLATIONS_PREFIX}${code.toUpperCase()}`,
    {},
    (v) => typeof v === "object" && v !== null && !Array.isArray(v),
  );
  const clean: Record<string, string> = {};
  for (const [k, text] of Object.entries(value)) {
    if (typeof text === "string") clean[k] = text;
  }
  return clean;
}

export function writeCachedTranslations(code: string, map: Record<string, string>) {
  write(`${TRANSLATIONS_PREFIX}${code.toUpperCase()}`, map);
}

export type CachedRoomInfo = {
  room: { code: string; lang_a: string; lang_b: string; invite_only?: boolean };
  participants: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    phone?: string | null;
    status?: string | null;
    showStatus?: boolean;
    lastSeenAt?: string | null;
  }[];
  me: string;
};

const ROOM_PREFIX = "traduchat:chat-room:";
const HIDDEN_PREFIX = "traduchat:chat-hidden:";

/** Message IDs this user deleted from their own view of this conversation. */
export function readCachedHiddenMessages(code: string): string[] {
  const items = read<string[]>(`${HIDDEN_PREFIX}${code.toUpperCase()}`, [], (v) => Array.isArray(v));
  return items.filter((id) => typeof id === "string");
}

export function writeCachedHiddenMessages(code: string, ids: string[]) {
  write(`${HIDDEN_PREFIX}${code.toUpperCase()}`, [...new Set(ids)]);
}

export function readCachedRoom(code: string): CachedRoomInfo | null {
  const value = read<CachedRoomInfo | null>(
    `${ROOM_PREFIX}${code.toUpperCase()}`,
    null,
    (v) => typeof v === "object" && v !== null && "room" in (v as object),
  );
  if (!value || typeof value.room?.code !== "string") return null;
  return {
    room: value.room,
    participants: Array.isArray(value.participants) ? value.participants : [],
    me: typeof value.me === "string" ? value.me : "",
  };
}

export function writeCachedRoom(code: string, info: CachedRoomInfo) {
  write(`${ROOM_PREFIX}${code.toUpperCase()}`, info);
}

/** Forgets the local copy of a conversation (after it has been deleted). */
export function clearCachedRoom(code: string) {
  if (typeof window === "undefined") return;
  const key = code.toUpperCase();
  for (const prefix of [MESSAGES_PREFIX, TRANSLATIONS_PREFIX, ROOM_PREFIX, HIDDEN_PREFIX]) {
    try {
      window.localStorage.removeItem(`${prefix}${key}`);
    } catch {
      /* storage unavailable */
    }
  }
}
