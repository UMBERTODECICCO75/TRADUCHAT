// Only these languages may reach the AI translator instructions.
// Anything else is rejected before it can alter the model's behavior.
export const TRANSLATION_LANGUAGES = [
  "Inglese",
  "Italiano",
  "Spagnolo",
  "Francese",
  "Tedesco",
  "Portoghese",
  "Cinese",
  "Giapponese",
  "Arabo",
  "Russo",
] as const;

export function validateTargetLanguage(value: unknown): string {
  const target = String(value ?? "").trim();
  if (!(TRANSLATION_LANGUAGES as readonly string[]).includes(target)) {
    throw new Error("Lingua non valida");
  }
  return target;
}
