import type { jsPDF } from "jspdf";

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const ARABIC_FONT = "NotoNaskhArabic";

let shaper: ((text: string) => string) | null = null;

/** True when the text contains Arabic-script characters. */
export function hasArabic(text: string) {
  return ARABIC_RANGE.test(text);
}

/** Registers the embedded Arabic font on a jsPDF document (once per document). */
export async function registerArabicFont(doc: jsPDF) {
  if (doc.getFontList()[ARABIC_FONT]) return;
  const { NOTO_NASKH_ARABIC_BASE64 } = await import("@/lib/fonts/noto-naskh-arabic");
  doc.addFileToVFS("NotoNaskhArabic-Regular.ttf", NOTO_NASKH_ARABIC_BASE64);
  doc.addFont("NotoNaskhArabic-Regular.ttf", ARABIC_FONT, "normal");
}

/** Loads the Arabic shaper; call before shapeArabicLine. */
export async function loadArabicShaper() {
  if (shaper) return;
  const mod = await import("arabic-persian-reshaper");
  const convert = mod.ArabicShaper.convertArabic;
  shaper = (text: string) => convert(text);
}

/**
 * jsPDF draws glyphs left-to-right without Arabic shaping, so we shape the
 * letters into their contextual forms and reverse each visual line ourselves.
 */
export function shapeArabicLine(line: string) {
  const shaped = shaper ? shaper(line) : line;
  return Array.from(shaped).reverse().join("");
}
