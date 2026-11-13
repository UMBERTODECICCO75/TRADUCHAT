export type ChatTranslationMessage = {
  id: string;
  original: string;
  translation: string | null;
  from_lang: string;
  to_lang: string;
  file_kind?: string | null;
};

export function chatTranslationKey(message: ChatTranslationMessage, language: string) {
  return `${message.id}:${language}:${message.original}`;
}

export function chatTranslationText(message: ChatTranslationMessage, language: string, cache: Record<string, string>) {
  if (message.file_kind === "system" || message.from_lang === language) return message.original;
  if (message.to_lang === language && message.translation !== null) return message.translation;
  return cache[chatTranslationKey(message, language)] ?? null;
}

export function chatLanguages(langA: string, langB: string, owner: boolean, previous: string | undefined, preferred: string | null) {
  const own = previous === langA || previous === langB ? previous : preferred;
  const isA = langA === langB || (own === langA ? true : own === langB ? false : owner);
  return { from: isA ? langA : langB, to: isA ? langB : langA };
}

/**
 * Voice messages: one-to-one rooms keep the room language pair; in a group
 * each member may speak any supported language, while the translation target
 * stays one of the room languages.
 */
export function voiceLanguagesOk(isGroup: boolean, pair: readonly string[], from: string, to: string, supported: readonly string[]) {
  const fromOk = isGroup ? supported.includes(from) : pair.includes(from);
  return fromOk && pair.includes(to);
}