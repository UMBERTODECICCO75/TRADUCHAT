export type Msg = {
  cameraId?: string;
  /** Stored text message id, so polling never duplicates it. */
  msgId?: string;
  me: boolean;
  text: string;
  time: string;
  audio?: string;
  audioUrl?: string;
  audioPath?: string | undefined;
  /** Photo attached to the message (data URL). */
  image?: string;
  /** Storage path of a saved photo, so it can be deleted. */
  photoPath?: string;
  /** Translation of `text` (received messages) or the original wording (my sent messages). */
  tr?: string | undefined;
  /** Language `tr` is written in. */
  trLang?: string | undefined;
  trBusy?: boolean | undefined;
  trErr?: string | undefined;
  react?: string | undefined;
};

const at = (msgs: Msg[], i: number, patch: Partial<Msg>): Msg[] =>
  msgs.map((m, k) => (k === i ? { ...m, ...patch } : m));

/** Only messages that came from the other person can be translated into my language,
 * and only while there is no translation in that language yet. */
export function canTranslate(m: Msg, myLang: string): boolean {
  return !m.me && (!m.tr || m.trLang !== myLang);
}

/** Label shown in front of the secondary line: the language a received message was
 * translated into, or "Originale" for a message I sent already translated. */
export function translationLabel(m: Msg, myLang: string): string {
  return m.me ? "Originale" : (m.trLang ?? myLang);
}

export function markTranslating(msgs: Msg[], i: number): Msg[] {
  return at(msgs, i, { trBusy: true, trErr: undefined });
}

/** Stores the translation beside the original: the original text is never replaced. */
export function applyTranslation(msgs: Msg[], i: number, translation: string, lang: string): Msg[] {
  return at(msgs, i, { tr: translation, trLang: lang, trBusy: false, trErr: undefined });
}

/** Stable identity of a message across polling refreshes (stored messages only). */
export function msgKey(m: Msg): string | undefined {
  return m.msgId ? `m:${m.msgId}` : m.cameraId ? `c:${m.cameraId}` : undefined;
}

/** Finds a message again after the list may have been refreshed or reordered. */
export function findMsgIndex(msgs: Msg[], target: Msg, fallback: number): number {
  const key = msgKey(target);
  if (key) return msgs.findIndex((m) => msgKey(m) === key);
  return msgs[fallback] === target ? fallback : msgs.indexOf(target);
}

/** Local-only changes made on a stored message (a translation requested on screen, a reaction). */
export type LocalPatch = { tr?: string; trLang?: string; react?: string };

/** Re-applies local changes, so the 3-second polling refresh never wipes them. */
export function keepLocal(msgs: Msg[], saved: ReadonlyMap<string, LocalPatch>): Msg[] {
  if (!saved.size) return msgs;
  return msgs.map((m) => {
    const key = msgKey(m);
    const p = key ? saved.get(key) : undefined;
    if (!p) return m;
    const next = { ...m };
    if (p.react !== undefined) next.react = p.react;
    if (!m.me && p.tr !== undefined) { next.tr = p.tr; next.trLang = p.trLang; }
    return next;
  });
}

/** True when two lists render the same, so a refresh can skip a useless re-render. */
export function sameMessages(a: Msg[], b: Msg[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      msgKey(x) !== msgKey(y) || x.text !== y.text || x.tr !== y.tr || x.trLang !== y.trLang ||
      x.trBusy !== y.trBusy || x.trErr !== y.trErr || x.react !== y.react || x.audioUrl !== y.audioUrl ||
      x.image !== y.image || x.time !== y.time
    ) return false;
  }
  return true;
}

export function applyTranslationError(msgs: Msg[], i: number, error: string): Msg[] {
  return at(msgs, i, { trBusy: false, trErr: error });
}
