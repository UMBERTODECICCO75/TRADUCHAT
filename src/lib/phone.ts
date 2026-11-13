/**
 * Turns a typed phone number into E.164 (+<prefix><number>).
 * The prefix must be explicit (+ or 00); numbers without it are treated as Italian (+39),
 * which matches accounts created before the international selector existed.
 */
export function toE164(raw: string): string | null {
  const trimmed = raw.trim().replace(/[\s().-]/g, "");
  const explicit = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.startsWith("+") ? trimmed.slice(1) : trimmed.startsWith("00") ? trimmed.slice(2) : trimmed;
  if (!/^\d{6,15}$/.test(digits)) return null;
  const normalized = explicit ? digits : `39${digits}`;
  return /^\d{8,15}$/.test(normalized) ? `+${normalized}` : null;
}
