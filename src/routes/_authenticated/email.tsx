import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bot, FileText, ImagePlus, Loader2, Mail, Paperclip, Send, Volume2, X } from "lucide-react";
import { draftReply, speakReplyVoice } from "@/lib/email-reply.functions";

import { LANGUAGES as REPLY_LANGS, type Language as ReplyLang } from "@/lib/languages";
import { type FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadEmailAttachment } from "@/lib/email-attachments.functions";
import { fileToBase64 } from "@/lib/file-base64";

export const Route = createFileRoute("/_authenticated/email")({
  head: () => ({
    meta: [
      { title: "Invia email — TraduChat" },
      {
        name: "description",
        content: "Prepara un messaggio con allegati e aprilo nella tua app di posta con TraduChat.",
      },
      { property: "og:title", content: "Invia email — TraduChat" },
      {
        property: "og:description",
        content: "Scrivi destinatario, oggetto e messaggio, allega PDF o foto e completa l’invio dalla tua app di posta.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EmailPage,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

type Attachment = { name: string; url: string };

function EmailPage() {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [received, setReceived] = useState("");
  const [notes, setNotes] = useState("");
  const [replyLang, setReplyLang] = useState<ReplyLang>("Italiano");
  const [drafting, setDrafting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const draftReplyFn = useServerFn(draftReply);
  const speakReplyFn = useServerFn(speakReplyVoice);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  async function addAttachment(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      toast.error("Il file supera i 15 MB consentiti.");
      return;
    }
    setUploading(true);
    try {
      const base64 = await fileToBase64(file);
      const uploaded = await uploadEmailAttachment({
        data: { file: base64, fileName: file.name, mimeType: file.type || "application/octet-stream" },
      });
      setAttachments((prev) => [...prev, { name: uploaded.fileName, url: uploaded.url }]);
      toast.success(`Allegato pronto: ${uploaded.fileName}`);
    } catch {
      toast.error("Non riesco a caricare l'allegato, riprova.");
    } finally {
      setUploading(false);
    }
  }

  async function generateReply() {
    setDrafting(true);
    try {
      const { reply } = await draftReplyFn({ data: { received, notes, language: replyLang } });
      setMessage(reply.slice(0, 5000));
      if (!subject.trim()) {
        const first = received.match(/^\s*(?:oggetto|subject)\s*:\s*(.+)$/im)?.[1]?.trim();
        if (first) setSubject(`Re: ${first}`.slice(0, 150));
      }
      toast.success("Risposta pronta nel campo Messaggio.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Risposta non riuscita, riprova.");
    } finally {
      setDrafting(false);
    }
  }

  async function listenToReply() {
    const text = message.trim();
    if (!text || speaking) return;
    setSpeaking(true);
    try {
      const { audio } = await speakReplyFn({ data: { text: text.slice(0, 700) } });
      voiceRef.current?.pause();
      const player = new Audio(`data:audio/wav;base64,${audio}`);
      voiceRef.current = player;
      await player.play();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Voce non riuscita, riprova.");
    } finally {
      setSpeaking(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  function openMailApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanRecipient = recipient.trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!EMAIL_PATTERN.test(cleanRecipient)) {
      setError("Inserisci un indirizzo email valido.");
      return;
    }
    if (!cleanSubject) {
      setError("Inserisci l’oggetto dell’email.");
      return;
    }
    if (!cleanMessage && attachments.length === 0) {
      setError("Scrivi il messaggio o allega un file.");
      return;
    }

    setError("");
    let body = cleanMessage;
    if (attachments.length > 0) {
      const links = attachments.map((a) => `${a.name}: ${a.url}`).join("\n");
      body = `${body}${body ? "\n\n" : ""}Allegati (link validi 7 giorni):\n${links}`;
    }
    const query = new URLSearchParams({ subject: cleanSubject, body });
    window.location.href = `mailto:${encodeURIComponent(cleanRecipient)}?${query.toString()}`;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-8 pt-6 sm:px-6">
      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
          <Mail className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Invia email</h1>
          <p className="text-sm text-muted-foreground">Traduci e invia qualsiasi documento a mezzo mail.</p>
        </div>
      </header>

      <AppNav />

      <section className="mt-6 space-y-4 rounded-3xl surface-card p-4 sm:p-6" aria-label="Risposta con IA">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bot className="size-5 text-primary" /> TraduChat risponde con l'IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Incolla l'email ricevuta: l'IA prepara la risposta, tu la controlli e la invii.
          </p>
        </div>
        <Textarea
          value={received}
          onChange={(e) => setReceived(e.target.value)}
          placeholder="Incolla qui l'email a cui vuoi rispondere…"
          rows={6}
          maxLength={8000}
          aria-label="Email ricevuta"
        />
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Cosa vuoi dire? (es. accetto l'appuntamento di lunedì)"
          maxLength={1000}
          aria-label="Indicazioni per la risposta"
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={replyLang}
            onChange={(e) => setReplyLang(e.target.value as ReplyLang)}
            aria-label="Lingua della risposta"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            {REPLY_LANGS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <Button type="button" onClick={() => void generateReply()} disabled={drafting || received.trim().length < 5}>
            {drafting ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
            {drafting ? "Scrivo la risposta…" : "Prepara risposta"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void listenToReply()}
            disabled={speaking || !message.trim()}
            aria-label="Ascolta la risposta come messaggio vocale"
          >
            {speaking ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
            {speaking ? "Preparo la voce…" : "Ascolta la risposta"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          La risposta va nel campo «Messaggio» qui sotto: aggiungi destinatario e oggetto, poi apri l'app di posta.
        </p>
      </section>

      <form onSubmit={openMailApp} className="mt-6 space-y-5 rounded-3xl surface-card p-4 sm:p-6">
        <div className="space-y-2">
          <label htmlFor="email-recipient" className="text-sm font-medium">Destinatario</label>
          <Input
            id="email-recipient"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="cliente@esempio.it"
            maxLength={254}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email-subject" className="text-sm font-medium">Oggetto</label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Oggetto del messaggio"
            maxLength={150}
            required
          />
          <p className="text-right text-xs text-muted-foreground">{subject.length}/150</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="email-message" className="text-sm font-medium">Messaggio</label>
          <Textarea
            id="email-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Scrivi qui il tuo messaggio, anche molto lungo…"
            rows={10}
            maxLength={5000}
            className="resize-y"
          />
          <p className="text-right text-xs text-muted-foreground">{message.length}/5000</p>
        </div>

        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="size-4" /> Allegati
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => pdfInputRef.current?.click()}
            >
              <FileText className="size-4" /> PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => photoInputRef.current?.click()}
            >
              <ImagePlus className="size-4" /> Foto
            </Button>
            {uploading && (
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Caricamento…
              </span>
            )}
          </div>
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              void addAttachment(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void addAttachment(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {attachments.length > 0 && (
            <ul className="space-y-2">
              {attachments.map((a, i) => (
                <li
                  key={`${a.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span className="truncate">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    aria-label={`Rimuovi ${a.name}`}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            Gli allegati diventano link sicuri nel messaggio, validi 7 giorni.
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">{error}</p>
        )}

        <Button type="submit" className="w-full sm:w-auto" disabled={uploading}>
          <Send className="size-4" />
          Apri nell’app di posta
        </Button>
      </form>
    </main>
  );
}
