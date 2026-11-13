import { cn } from "@/lib/utils";

type Props = {
  name: string;
  avatarUrl?: string | null | undefined;
  className?: string | undefined;
  /**
   * Show a presence dot on the corner: true = online (green), false = offline
   * (muted), undefined = no dot at all.
   */
  online?: boolean | undefined;
  /** Size of the dot border ring; defaults to the standard 3px dot. */
  dotClassName?: string | undefined;
};

/** Photo of a participant, with their initial as fallback and optional presence dot. */
export function ParticipantAvatar({ name, avatarUrl, className, online, dotClassName }: Props) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const dot =
    online === undefined ? null : (
      <span
        aria-hidden="true"
        className={cn(
          "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
          online ? "bg-green-500" : "bg-muted-foreground/40",
          dotClassName,
        )}
      />
    );
  if (avatarUrl) {
    return (
      <span className="relative inline-block shrink-0">
        <img
          src={avatarUrl}
          alt={`Foto di ${name}`}
          className={cn("size-9 shrink-0 rounded-full object-cover", className)}
        />
        {dot}
      </span>
    );
  }
  return (
    <span className="relative inline-block shrink-0">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm text-secondary-foreground",
          className,
        )}
      >
        {initial}
      </span>
      {dot}
    </span>
  );
}
