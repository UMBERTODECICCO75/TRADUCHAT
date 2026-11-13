/** Reads any file chosen on the phone as plain base64 (no data-URL prefix). */
export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const base64 = btoa(binary);
  if (!base64) throw new Error("File non valido, riprova.");
  return base64;
}
