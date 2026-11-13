/** Shrinks a photo chosen on the phone to a JPEG small enough to send. */
export async function fileToJpegBase64(
  file: File,
  maxSide = 1600,
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Il browser non supporta la lettura delle foto.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.split(",")[1] ?? "";
  if (!base64) throw new Error("Foto non valida, riprova.");
  return { base64, mimeType: "image/jpeg" };
}
