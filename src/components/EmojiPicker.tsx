import { useState } from "react";
import { SmilePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const EMOJI_GROUPS = [
  { name: "Faccine", symbol: "😊", emoji: ["😀", "😃", "😄", "😁", "😊", "😍", "🥰", "😘", "😂", "🤣", "😉", "😎", "🤩", "🥳", "😇", "🤗", "🤔", "😴", "😢", "😭", "😅", "😮", "😡", "🤯"] },
  { name: "Gesti", symbol: "👋", emoji: ["👋", "🤚", "🖐️", "✋", "👌", "🤌", "🤏", "✌️", "🤞", "🫶", "🤟", "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👀", "💅", "❤️", "💯", "✨", "🔥"] },
  { name: "Persone", symbol: "🧑", emoji: ["👶", "🧒", "👧", "👦", "🧑", "👩", "👨", "👵", "👴", "🧑‍⚕️", "🧑‍🎓", "🧑‍💻", "🧑‍🍳", "🧑‍🏫", "🧑‍🚀", "🧑‍🎨", "👨‍👩‍👧", "👩‍👩‍👦", "👨‍👨‍👧", "🫂", "💃", "🕺", "🏃", "🚶"] },
  { name: "Natura", symbol: "🌸", emoji: ["🐶", "🐱", "🐭", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐸", "🐵", "🦋", "🌸", "🌹", "🌻", "🌈", "☀️", "🌙", "⭐", "❄️", "🌊", "🍀", "🌍", "🌳"] },
  { name: "Cibo", symbol: "🍕", emoji: ["🍏", "🍓", "🍉", "🍋", "🍒", "🥐", "🍞", "🧀", "🍕", "🍔", "🍟", "🍝", "🍣", "🍦", "🍰", "🍫", "☕", "🍵", "🥤", "🍷", "🍺", "🥂", "🍽️", "😋"] },
  { name: "Attività", symbol: "⚽", emoji: ["⚽", "🏀", "🏈", "🎾", "🏐", "🎱", "🏆", "🎯", "🎮", "🎸", "🎤", "🎧", "🎬", "🎨", "🎁", "🎉", "🎊", "🎈", "✈️", "🚗", "🏠", "📱", "💡", "✅"] },
] as const;

export function EmojiPicker({ onSelect, disabled }: { onSelect: (emoji: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [groupIndex, setGroupIndex] = useState(0);
  const group = EMOJI_GROUPS[groupIndex] ?? EMOJI_GROUPS[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          aria-label="Aggiungi emoji"
          title="Aggiungi emoji"
          disabled={disabled}
          className="h-12 w-12 p-0 text-base sm:w-auto sm:px-4"
        >
          <SmilePlus className="size-5" />
          <span className="hidden sm:inline">Emoji</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1rem))] p-2"
      >
        <div className="flex items-center justify-between gap-1 border-b pb-2" role="tablist" aria-label="Categorie emoji">
          {EMOJI_GROUPS.map((item, index) => (
            <Button
              key={item.name}
              type="button"
              variant="ghost"
              size="icon"
              role="tab"
              aria-label={item.name}
              aria-selected={groupIndex === index}
              title={item.name}
              onClick={() => setGroupIndex(index)}
              className={cn("h-10 w-10 text-xl", groupIndex === index && "bg-accent")}
            >
              <span aria-hidden>{item.symbol}</span>
            </Button>
          ))}
        </div>
        <p className="px-1 pb-1 pt-2 text-xs font-medium text-muted-foreground">{group.name}</p>
        <div className="grid grid-cols-8 gap-0.5">
          {group.emoji.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Inserisci ${emoji}`}
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="h-10 w-10 text-2xl"
            >
              <span aria-hidden>{emoji}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EmojiPicker;