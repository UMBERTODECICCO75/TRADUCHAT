export const PDF_TEXT_LIMIT = 5000;

/** Extract plain text from a PDF file in the browser, capped at PDF_TEXT_LIMIT characters. */
export async function extractPdfText(
  file: File,
  limit = PDF_TEXT_LIMIT,
): Promise<{ text: string; truncated: boolean; pages: number }> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const parts: string[] = [];
  let total = 0;
  let truncated = false;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/[ \t]+/g, " ")
      .trim();
    if (!pageText) continue;
    if (total + pageText.length > limit) {
      parts.push(pageText.slice(0, Math.max(0, limit - total)));
      truncated = true;
      break;
    }
    parts.push(pageText);
    total += pageText.length;
  }

  const pages = doc.numPages;
  return { text: parts.join("\n\n").slice(0, limit), truncated, pages };
}
