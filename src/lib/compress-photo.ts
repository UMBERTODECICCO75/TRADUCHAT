export type PhotoDestination = "profile" | "chat";

/** Browser-only compression: lazy loading keeps image processing out of SSR. */
export async function compressPhoto(file: File, destination: PhotoDestination): Promise<File> {
  // Leave GIF and WebP untouched to preserve possible animation; unsupported
  // formats remain available through the existing upload path.
  if (!["image/jpeg", "image/png"].includes(file.type)) return file;
  try {
    const { default: imageCompression } = await import("browser-image-compression");
    const compressed = await imageCompression(file, {
      maxSizeMB: destination === "profile" ? 1 : 2,
      maxWidthOrHeight: destination === "profile" ? 1280 : 2560,
      initialQuality: 0.85,
      maxIteration: 1,
      useWebWorker: false,
      fileType: file.type,
      preserveExif: false,
    });
    if (compressed.size >= file.size || compressed.size === 0) return file;
    return new File([compressed], file.name, { type: compressed.type, lastModified: file.lastModified });
  } catch {
    // A device that cannot decode or compress the image can still upload it.
    return file;
  }
}