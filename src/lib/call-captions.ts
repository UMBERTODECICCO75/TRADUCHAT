/**
 * Live translated captions for one-to-one calls.
 * The speaker's device recognises its own speech, translates it into the other
 * participant's language and sends both texts over the call's peer data channel.
 * Nothing is stored: captions exist only on the two devices during the call.
 */

const KIND = "traduchat:caption";
export const CAPTION_MAX = 1000;

export type CaptionPayload = { original: string; translated: string };

export function encodeCaption(original: string, translated: string) {
  return JSON.stringify({
    kind: KIND,
    v: 1,
    original: original.trim().slice(0, CAPTION_MAX),
    translated: translated.trim().slice(0, CAPTION_MAX),
  });
}

/** Accepts only well-formed caption messages; any other data-channel payload is ignored. */
export function decodeCaption(data: unknown): CaptionPayload | null {
  let text: string;
  if (typeof data === "string") text = data;
  else if (data instanceof Uint8Array) text = new TextDecoder().decode(data);
  else return null;
  if (text.length > CAPTION_MAX * 3) return null;
  try {
    const value = JSON.parse(text) as {
      kind?: unknown;
      original?: unknown;
      translated?: unknown;
    } | null;
    if (
      !value ||
      value.kind !== KIND ||
      typeof value.original !== "string" ||
      typeof value.translated !== "string"
    )
      return null;
    const original = value.original.trim().slice(0, CAPTION_MAX);
    const translated = value.translated.trim().slice(0, CAPTION_MAX);
    if (!original && !translated) return null;
    return { original, translated: translated || original };
  } catch {
    return null;
  }
}

/** Keeps only the latest caption lines so the overlay never covers the video. */
export function keepRecent<T>(list: readonly T[], item: T, limit = 4): T[] {
  return [...list, item].slice(-limit);
}

/** Recognition errors after which captions cannot work on this device and must stop. */
export function isFatalRecognitionError(error: string) {
  return (
    error === "not-allowed" ||
    error === "service-not-allowed" ||
    error === "audio-capture" ||
    error === "language-not-supported"
  );
}
