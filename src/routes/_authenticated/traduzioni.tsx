import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Camera,
  Copy,
  Download,
  FileUp,
  Languages,
  Loader2,
  Save,
  Trash2,
  Volume2,
} from "lucide-react";

import { readTextFromImage } from "@/lib/ocr.functions";

import { translateMessage } from "@/lib/translate.functions";
import {
  saveTranslation,
  listMyTranslations,
  deleteTranslation,
} from "@/lib/translations.functions";
import { useTranslationTicket } from "@/lib/useTranslationTicket";
import { splitParagraphs, isLatinText, type ParagraphPair } from "@/lib/translation-pdf";
import { speak } from "@/lib/speak";
import { LANGUAGES } from "@/lib/languages";
import { MicButton } from "@/components/MicButton";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/traduzioni")({
  head: () => ({
    meta: [
      { title: "Traduzioni in tempo reale — TraduChat" },
      {
        name: "description",
        content:
          "Incolla o scrivi un testo e leggi subito la traduzione nelle lingue disponibili di TraduChat. Le traduzioni che salvi restano nel tuo account.",
      },
      { property: "og:title", content: "Traduzioni in tempo reale — TraduChat" },
      {
        property: "og:description",
        content:
          "Scrivi un testo, vedi la traduzione mentre digiti e salvala nel tuo storico personale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TraduzioniPage,
});

type SavedTranslation = {
  id: string;
  source_text: string;
  translated_text: string;
  from_lang: string;
  to_lang: string;
  created_at: string;
};

function TraduzioniPage() {
  const translate = useServerFn(translateMessage);
  const ensureTicket = useTranslationTicket();
  const save = useServerFn(saveTranslation);
  const loadHistory = useServerFn(listMyTranslations);
  const removeSaved = useServerFn(deleteTranslation);
  const readImage = useServerFn(readTextFromImage);
  const [from, setFrom] = useState("Italiano");
  const [to, setTo] = useState("Inglese");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [pending, setPending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState<SavedTranslation[]>([]);
  const requestId = useRef(0);
  const translateRef = useRef(translate);
  translateRef.current = translate;
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  async function readPdf(file: File) {
    setReading(true);
    try {
      const { extractPdfText, PDF_TEXT_LIMIT } = await import("@/lib/pdf-text");
      const { text: extracted, truncated } = await extractPdfText(file, PDF_TEXT_LIMIT);
      if (!extracted.trim()) {
        toast.error("Questo PDF non contiene testo leggibile (forse è una scansione).");
        return;
      }
      setText(extracted);
      toast.success(
        truncated
          ? `Testo letto: primi ${PDF_TEXT_LIMIT} caratteri del PDF.`
          : "Testo del PDF inserito.",
      );
    } catch {
      toast.error("Non riesco a leggere questo PDF.");
    } finally {
      setReading(false);
    }
  }

  async function readPhoto(file: File) {
    setScanning(true);
    try {
      const { base64, mimeType } = await fileToJpegBase64(file);
      const ticket = await ensureTicket();
      const result = await readImage({ data: { image: base64, mimeType, ticket } });
      setText(result.text);
      toast.success("Testo letto dalla foto: la traduzione arriva qui sotto.", {
        description: "Quando è pronta puoi scaricare il PDF con originale e traduzione.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a leggere la foto.");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    void loadHistory({ data: undefined })
      .then((result) => setHistory(result.translations))
      .catch(() => undefined);
  }, [loadHistory]);

  async function saveCurrent() {
    if (!text.trim() || !output.trim() || saving) return;
    setSaving(true);
    try {
      const result = await save({
        data: { sourceText: text.trim(), translatedText: output.trim(), from, to },
      });
      setHistory((prev) => [result.translation, ...prev]);
      toast.success("Traduzione salvata nel tuo storico");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a salvare la traduzione.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    try {
      await removeSaved({ data: { id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a eliminare.");
    }
  }

  async function downloadPdf() {
    const paragraphs = splitParagraphs(text);
    if (paragraphs.length === 0) {
      toast.error("Scrivi un testo prima di scaricare il PDF.");
      return;
    }
    setExporting(true);
    try {
      const ticket = await ensureTicket();
      const pairs: ParagraphPair[] = [];
      for (const paragraph of paragraphs) {
        const result = await translate({ data: { text: paragraph, from, to, ticket } });
        pairs.push({ original: paragraph, translation: result.translation });
      }
      if (!isLatinText(pairs.map((p) => `${p.original}${p.translation}`).join(""))) {
        toast.warning(
          "Il PDF supporta alfabeto latino e arabo: altri caratteri potrebbero non essere stampati.",
        );
      }
      const { buildTranslationPdf } = await import("@/lib/translation-pdf");
      await buildTranslationPdf({ pairs, from, to });
      toast.success("PDF pronto per i tuoi clienti");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a creare il PDF.");
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    const id = ++requestId.current;
    const value = text.trim();
    if (!value) {
      setOutput("");
      setPending(false);
      return;
    }
    setPending(true);
    const timer = setTimeout(async () => {
      try {
        const ticket = await ensureTicket();
        const result = await translateRef.current({ data: { text: value, from, to, ticket } });
        if (id === requestId.current) setOutput(result.translation);
      } catch (error) {
        if (id === requestId.current) {
          toast.error(
            error instanceof Error ? error.message : "Traduzione non riuscita, riprova.",
          );
        }
      } finally {
        if (id === requestId.current) setPending(false);
      }
    }, 700);

    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [text, from, to, ensureTicket]);

  function swap() {
    setFrom(to);
    setTo(from);
    setText(output);
    setOutput(text);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
      <Toaster position="top-center" />

      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
          <Languages className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Traduzioni</h1>
          <p className="text-sm text-muted-foreground">
            Parla con chiunque mentre scrivi e traduci la tua lingua
          </p>
        </div>
      </header>

      <AppNav />

      <section className="mt-4 flex items-center gap-2 rounded-2xl surface-card p-2">
        <LangSelect value={from} onChange={setFrom} />
        <Button
          variant="ghost"
          size="icon"
          onClick={swap}
          aria-label="Inverti le lingue"
          className="shrink-0 text-accent"
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <LangSelect value={to} onChange={setTo} />
      </section>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={downloadPdf} disabled={exporting || !text.trim()} className="gap-2">
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          {exporting ? "Preparo il PDF…" : "Scarica PDF"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => void saveCurrent()}
          disabled={saving || !output.trim()}
          className="gap-2"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salva traduzione
        </Button>
        <p className="text-xs text-muted-foreground">
          Originale e traduzione affiancati, paragrafo per paragrafo.
        </p>
      </div>

      <section className="mt-4 grid flex-1 gap-4 sm:grid-cols-2">
        <div className="rounded-3xl surface-card border-l-4 border-l-primary p-4">
          <p className="text-xs uppercase tracking-wide text-primary">{from}</p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 6000))}
            rows={10}
            maxLength={6000}
            placeholder={`Scrivi o incolla un testo in ${from}…`}
            className="mt-2 min-h-48 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{text.trim().length}/6000</p>
            <MicButton
              language={from}
              label="Parla"
              onText={(spoken) => setText((prev) => (prev.trim() ? `${prev}\n${spoken}` : spoken))}
            />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void readPdf(file);
              }}
            />
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void readPhoto(file);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={reading}
              onClick={() => fileInput.current?.click()}
            >
              {reading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileUp className="size-4" />
              )}
              {reading ? "Leggo il PDF…" : "Leggi testo da PDF"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              disabled={scanning}
              onClick={() => cameraInput.current?.click()}
            >
              {scanning ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
              {scanning ? "Leggo la foto…" : "Traduci da foto"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tocca “Parla”, detta il testo e la traduzione arriva subito. Con “Traduci da foto”
            inquadri un menu, un cartello o un documento: leggo il testo, lo traduco e puoi
            scaricarlo in PDF. Da un PDF prendo fino a 5000 caratteri.
          </p>
        </div>

        <div className="rounded-3xl surface-card border-r-4 border-r-white/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-accent">{to}</p>
            {pending ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> traduzione…
              </span>
            ) : output ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Ascolta la traduzione in ${to}`}
                  onClick={() => {
                    if (!speak(output, to)) toast.error("Questo browser non legge i testi.");
                  }}
                >
                  <Volume2 className="size-3.5" /> Ascolta
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(output);
                    toast.success("Traduzione copiata");
                  }}
                >
                  <Copy className="size-3.5" /> Copia
                </Button>
              </div>
            ) : null}
          </div>
          <p className="mt-2 min-h-48 whitespace-pre-wrap text-sm">
            {output || (
              <span className="text-muted-foreground">
                La traduzione compare qui mentre digiti.
              </span>
            )}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="font-display text-lg">Le mie traduzioni salvate</p>
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Salva una traduzione e la ritrovi qui ogni volta che accedi.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {h.from_lang} · {h.to_lang}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm">{h.source_text}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">{h.translated_text}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Riapri questa traduzione"
                    onClick={() => {
                      setFrom(h.from_lang);
                      setTo(h.to_lang);
                      setText(h.source_text);
                      setOutput(h.translated_text);
                    }}
                  >
                    Riapri
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Elimina questa traduzione"
                    onClick={() => void remove(h.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function LangSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="flex-1 border-0 bg-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l} value={l}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Resize a photo to max 1600px and return base64 JPEG, small enough for the AI gateway. */
async function fileToJpegBase64(file: File): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
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
