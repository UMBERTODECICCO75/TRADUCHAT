/** Small thumbnail of the photo attached to a status; tap to open it full size. */
export function StatusPhoto({
  url,
  name,
  className,
}: {
  url: string | null;
  name?: string;
  className?: string;
}) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-block shrink-0"
    >
      <img
        src={url}
        alt={name ? `Foto dello stato di ${name}` : "Foto dello stato"}
        loading="lazy"
        className={
          className ?? "size-10 rounded-lg border border-border/60 object-cover bubble-shadow"
        }
      />
    </a>
  );
}
