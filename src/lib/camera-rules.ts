import { validateTargetLanguage } from "@/lib/languages";

export type CameraTranslation = { original: string; translation: string };

export function validateCameraInput(input: { image: string; target: string }) {
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.image)) throw new Error("Seleziona una foto JPEG, PNG o WebP");
  if (input.image.length > 36 * 1024 * 1024) throw new Error("Foto troppo grande (max 25 MB)");
  const target = validateTargetLanguage(input.target);
  return { image: input.image, target };
}

export function validateCameraResult(value: unknown): CameraTranslation {
  if (!value || typeof value !== "object" || !("original" in value) || !("translation" in value) || typeof value.original !== "string" || typeof value.translation !== "string") throw new Error("Traduzione non disponibile");
  const original = value.original.trim();
  const translation = value.translation.trim();
  if (!original || !translation) throw new Error("Nessun testo leggibile nella foto. Scatta una foto più nitida.");
  return { original, translation };
}

export function cameraDelivery(recipientId: string, senderId: string, result: CameraTranslation, language: string) {
  if (!recipientId || recipientId === senderId) throw new Error("Scegli un altro contatto");
  const checked = validateCameraResult(result);
  return { sender_id: senderId, recipient_id: recipientId, original_text: checked.original, translated_text: checked.translation, target_language: language };
}