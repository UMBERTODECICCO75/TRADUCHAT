type Part = { type: "text" | "url" | "tag"; value: string };

const PATTERN = /((?:https?:\/\/|www\.)[^\s]+)|(#[\p{L}\p{N}_]+)/gu;

function parse(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ type: "text", value: text.slice(last, index) });
    if (match[1]) parts.push({ type: "url", value: match[1] });
    else if (match[2]) parts.push({ type: "tag", value: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts;
}

export function StatusText({ text, className }: { text: string; className?: string }) {
  const parts = parse(text);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.type === "url") {
          const href = part.value.startsWith("http") ? part.value : `https://${part.value}`;
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </a>
          );
        }
        if (part.type === "tag") {
          return (
            <a
              key={i}
              href={`https://www.google.com/search?q=${encodeURIComponent(part.value)}`}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </a>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </span>
  );
}

export default StatusText;
