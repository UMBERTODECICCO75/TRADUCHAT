/** Helpers to open WhatsApp (message) or the phone dialer (call) for a participant. */

/** Keeps only digits; adds the Italian prefix when the number looks local. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("3") && digits.length === 10) return `39${digits}`;
  return digits;
}

export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  const number = normalizePhone(phone);
  if (!number) return null;
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${number}${query}`;
}

export function callLink(phone: string | null | undefined): string | null {
  const number = normalizePhone(phone);
  return number ? `tel:+${number}` : null;
}
