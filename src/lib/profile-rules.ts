export const PHOTO_MAX_BYTES = 25 * 1024 * 1024;
export function photoError(file: { size: number; type: string }) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Scegli una foto JPG, PNG o WebP.";
  if (file.size > PHOTO_MAX_BYTES) return "La foto non deve superare 25 MB.";
  return "";
}
export function visibleProfile(status: string, incognito: boolean) {
  return { status: incognito ? "" : status, online: !incognito };
}
export function filterArchived<T extends { name: string }>(rows: T[], archived: string[], showArchive = false) {
  return rows.filter(row => archived.includes(row.name) === showArchive);
}