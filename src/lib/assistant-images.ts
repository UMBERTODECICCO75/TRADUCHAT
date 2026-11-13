import { z } from "zod";

export const ASSISTANT_IMAGE_BYTES = 2 * 1024 * 1024;
export const ASSISTANT_PHOTO_BYTES = 10 * 1024 * 1024;
export const ASSISTANT_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const AssistantImage = z.object({
  name: z.string().min(1).max(160),
  dataUrl: z.string().max(Math.ceil(ASSISTANT_IMAGE_BYTES / 3) * 4 + 40),
}).superRefine((image, ctx) => {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.dataUrl);
  const reject = () => ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Foto non valida: scegli un’immagine JPEG, PNG o WebP fino a 2 MB." });
  const encoded = match?.[2];
  if (!match || !encoded || encoded.length % 4 !== 0) { reject(); return; }
  try {
    const bytes = atob(encoded);
    const valid = match[1] === "image/png" ? bytes.startsWith("\x89PNG\r\n\x1a\n")
      : match[1] === "image/jpeg" ? bytes.startsWith("\xff\xd8\xff")
      : bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
    if (!valid || bytes.length > ASSISTANT_IMAGE_BYTES) reject();
  } catch { reject(); }
});
export type AssistantPhoto = z.infer<typeof AssistantImage>;

/** Bind the existing idempotent reservation without storing image bytes. */
export async function assistantReservationQuestion(question: string, image?: AssistantPhoto) {
  if (!image) return question;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(image.dataUrl));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  return `${question}\n[image-sha256:${hash}]`;
}

/** Re-encode locally to strip metadata and bound request size. */
export async function prepareAssistantPhoto(file: File): Promise<AssistantPhoto> {
  if (!file.size || file.size > ASSISTANT_PHOTO_BYTES) throw new Error("Scegli una foto non vuota fino a 10 MB.");
  if (!ASSISTANT_IMAGE_ACCEPT.split(",").includes(file.type)) throw new Error("Scegli una foto JPEG, PNG o WebP; per HEIC usa uno screenshot o esporta in JPEG.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Impossibile preparare la foto.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);
    if (dataUrl.length > Math.ceil(ASSISTANT_IMAGE_BYTES / 3) * 4 + 40) dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return AssistantImage.parse({ name: file.name.slice(0, 160) || "Foto", dataUrl });
  } catch { throw new Error("La foto non è leggibile o è troppo grande. Scegli un’altra immagine."); }
  finally { URL.revokeObjectURL(url); }
}