import LinkifyIt from "linkify-it";

const linkify = new LinkifyIt().set({ fuzzyEmail: false });
export type AssistantTextPart = { text: string; href?: string };

export function assistantTextParts(text: string): AssistantTextPart[] {
  const parts: AssistantTextPart[] = [];
  let cursor = 0;
  for (const match of linkify.match(text) ?? []) {
    let url: URL;
    try { url = new URL(match.url); } catch { continue; }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) continue;
    if (match.index > cursor) parts.push({ text: text.slice(cursor, match.index) });
    parts.push({ text: match.text, href: url.href });
    cursor = match.lastIndex;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}