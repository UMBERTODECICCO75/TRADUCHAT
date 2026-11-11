/** Small LRU cache for translations, shared by the server function and the chat screen.
 * The same text translated into the same language always gives the same result,
 * so repeats are answered instantly without calling the AI again. */
export class TranslationCache {
  private readonly map = new Map<string, string>();
  constructor(private readonly max = 500) {}

  static key(text: string, target: string): string {
    return `${target}\u0000${text.trim()}`;
  }

  get(text: string, target: string): string | undefined {
    const k = TranslationCache.key(text, target);
    const v = this.map.get(k);
    if (v !== undefined) {
      // refresh position so frequently used entries stay in the cache
      this.map.delete(k);
      this.map.set(k, v);
    }
    return v;
  }

  set(text: string, target: string, translation: string): void {
    const k = TranslationCache.key(text, target);
    this.map.delete(k);
    this.map.set(k, translation);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get size(): number {
    return this.map.size;
  }
}

/** Text with no letters (only emoji, numbers, punctuation, links' symbols) needs no translation. */
export function needsTranslation(text: string): boolean {
  return /\p{L}/u.test(text);
}
