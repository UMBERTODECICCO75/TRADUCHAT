import { Languages, Loader2 } from "lucide-react";

import { LANGUAGES } from "@/lib/languages";

type Props = {
  language: string;
  onChange: (language: string) => void;
  loading?: boolean;
};

/** Lets the reader pick the language of a legal page, without reloading. */
export function LegalLanguagePicker({ language, onChange, loading }: Props) {
  return (
    <div className="mt-4 flex items-center gap-2">
      <Languages className="size-4 text-muted-foreground" />
      <select
        aria-label="Lingua della pagina"
        value={language}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-full border border-border bg-card px-3 text-sm text-foreground"
      >
        {LANGUAGES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      {loading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}
