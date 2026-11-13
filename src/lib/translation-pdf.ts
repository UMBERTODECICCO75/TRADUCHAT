import { jsPDF } from "jspdf";

import {
  ARABIC_FONT,
  hasArabic,
  loadArabicShaper,
  registerArabicFont,
  shapeArabicLine,
} from "@/lib/pdf-arabic";

export type ParagraphPair = { original: string; translation: string };

/** Splits a text into paragraphs, keeping blank-line and single-line breaks. */
export function splitParagraphs(text: string) {
  return text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Latin-script check: Arabic is supported through an embedded font, but jsPDF's
 * built-in fonts still cannot draw Cyrillic/CJK/Hebrew.
 */
export function isLatinText(text: string) {
  return !/[\u0400-\u04FF\u0590-\u05FF\u3000-\u9FFF\uAC00-\uD7AF]/.test(text);
}

export async function buildTranslationPdf(options: {
  pairs: ParagraphPair[];
  from: string;
  to: string;
  fileName?: string;
}) {
  const { pairs, from, to } = options;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const needsArabic = pairs.some((p) => hasArabic(`${p.original}${p.translation}`));
  if (needsArabic) {
    await registerArabicFont(doc);
    await loadArabicShaper();
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const colGap = 20;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;
  let y = margin;

  /** Wraps a text block for a column, handling Arabic shaping and RTL order. */
  const layout = (text: string, width: number) => {
    const arabic = needsArabic && hasArabic(text);
    doc.setFont(arabic ? ARABIC_FONT : "helvetica", "normal");
    const lines = doc.splitTextToSize(text, width) as string[];
    return {
      arabic,
      lines: arabic ? lines.map(shapeArabicLine) : lines,
    };
  };

  const newPage = () => {
    doc.addPage();
    y = margin;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) newPage();
  };

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("TraduChat — Traduzione", margin, y + 6);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Da ${from} a ${to}  -  ${new Date().toLocaleDateString("it-IT")}  -  ${pairs.length} paragrafi`,
    margin,
    y,
  );
  y += 22;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Column headers
  const drawHeaders = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(from.toUpperCase(), margin, y);
    doc.text(to.toUpperCase(), margin + colWidth + colGap, y);
    y += 14;
  };
  drawHeaders();

  pairs.forEach((pair, index) => {
    doc.setFontSize(11);
    const left = layout(pair.original, colWidth);
    const right = layout(pair.translation, colWidth);
    const lineHeight = 15;
    const blockHeight = Math.max(left.lines.length, right.lines.length) * lineHeight + 18;

    if (y + blockHeight > pageHeight - margin) {
      newPage();
      drawHeaders();
      doc.setFontSize(11);
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(90);
    doc.text(`${index + 1}`, margin - 22, y + 11);

    doc.setTextColor(30);
    doc.setFont(left.arabic ? ARABIC_FONT : "helvetica", "normal");
    doc.text(left.lines, left.arabic ? margin + colWidth : margin, y + 11, {
      align: left.arabic ? "right" : "left",
    });

    doc.setTextColor(20);
    const rightX = margin + colWidth + colGap;
    doc.setFont(right.arabic ? ARABIC_FONT : "helvetica", "normal");
    doc.text(right.lines, right.arabic ? rightX + colWidth : rightX, y + 11, {
      align: right.arabic ? "right" : "left",
    });

    y += blockHeight;
    doc.setDrawColor(235);
    ensureSpace(0);
    doc.line(margin, y - 8, pageWidth - margin, y - 8);
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Pagina ${i} di ${pageCount}`, pageWidth - margin, pageHeight - 24, {
      align: "right",
    });
  }

  doc.save(options.fileName ?? `traduzione-${from}-${to}.pdf`);
}
