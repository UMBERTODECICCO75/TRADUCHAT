import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, FolderOpen, Image, Loader2, Mail, Plus, RefreshCw, Send, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { fileToBase64 } from "@/lib/file-base64";
import { deleteArchiveFile, emailArchiveFile, hideChatArchiveFile, listArchive, preserveChatFile, saveArchiveFile, sendArchiveFile } from "@/lib/archive.functions";
import { listMyRooms } from "@/lib/rooms.functions";

export const Route = createFileRoute("/_authenticated/storico")({
  head: () => ({ meta: [
    { title: "Storico PDF, foto e file — TraduChat" },
    { name: "description", content: "Ritrova e conserva i tuoi PDF, le foto e i file delle conversazioni su TraduChat." },
    { property: "og:title", content: "Storico PDF, foto e file — TraduChat" },
    { property: "og:description", content: "Ritrova e conserva i tuoi PDF, le foto e i file delle conversazioni su TraduChat." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ArchivePage,
});

type Source = "personal" | "chat";
type Item = { id: string; name: string; type: string; date: string; url: string | null; roomCode: string | null };

function ArchivePage() {
  const list = useServerFn(listArchive);
  const save = useServerFn(saveArchiveFile);
  const remove = useServerFn(deleteArchiveFile);
  const hideChatFile = useServerFn(hideChatArchiveFile);
  const preserve = useServerFn(preserveChatFile);
  const send = useServerFn(sendArchiveFile);
  const emailFile = useServerFn(emailArchiveFile);
  const loadRooms = useServerFn(listMyRooms);
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>("personal");
  const [items, setItems] = useState<Item[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preserving, setPreserving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sendingItem, setSendingItem] = useState<Item | null>(null);
  const [rooms, setRooms] = useState<{ code: string; langA: string; langB: string }[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailItem, setEmailItem] = useState<Item | null>(null);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSending, setEmailSending] = useState(false);

  const refresh = useCallback(async (selected: Source, offset = 0) => {
    setLoading(true);
    setError("");
    try {
      const result = await list({ data: { source: selected, offset } });
      setItems((previous) => offset ? [...previous, ...result.items] : result.items);
      setHasMore(result.hasMore);
    } catch {
      setError("Non riesco a caricare lo storico. Riprova.");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    setItems([]);
    void refresh(source);
  }, [source, refresh]);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Il file supera i 15 MB consentiti.");
      return;
    }
    setUploading(true);
    try {
      await save({ data: { name: file.name, base64: await fileToBase64(file), mimeType: file.type } });
      toast.success("File conservato nello storico.");
      if (source !== "personal") setSource("personal");
      else await refresh("personal");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Non riesco a conservare il file.");
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(item: Item) {
    if (!window.confirm(source === "chat"
      ? `Rimuovere ${item.name} dal tuo Storico? Resterà disponibile nella conversazione per gli altri partecipanti.`
      : `Eliminare definitivamente ${item.name} dai tuoi file?`)) return;
    setDeleting(item.id);
    try {
      if (source === "chat") await hideChatFile({ data: { messageId: item.id } });
      else await remove({ data: { path: item.id } });
      setItems((current) => current.filter((file) => file.id !== item.id));
      toast.success(source === "chat" ? "Allegato rimosso dal tuo Storico." : "File eliminato.");
    } catch {
      toast.error("Non riesco a eliminare il file.");
    } finally {
      setDeleting(null);
    }
  }

  async function saveFromChat(item: Item) {
    setPreserving(item.id);
    try {
      await preserve({ data: { messageId: item.id } });
      toast.success("Copia conservata nei tuoi file.");
    } catch {
      toast.error("Non riesco a conservare questo allegato.");
    } finally {
      setPreserving(null);
    }
  }

  async function openSendPicker(item: Item) {
    setSendingItem(item);
    setRoomsLoading(true);
    try {
      const result = await loadRooms();
      setRooms(result.rooms);
    } catch {
      toast.error("Non riesco a leggere le tue conversazioni.");
      setSendingItem(null);
    } finally {
      setRoomsLoading(false);
    }
  }

  async function sendByEmail() {
    if (!emailItem) return;
    const recipient = emailRecipient.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      toast.error("Inserisci un indirizzo email valido.");
      return;
    }
    setEmailSending(true);
    try {
      const { url, name } = await emailFile({ data: { path: emailItem.id } });
      const body = `Ecco il file «${name}» dal tuo Storico TraduChat (link valido 7 giorni):\n${url}`;
      const query = new URLSearchParams({ subject: `File da TraduChat: ${name}`, body });
      window.location.href = `mailto:${encodeURIComponent(recipient)}?${query.toString()}`;
      setEmailItem(null);
      setEmailRecipient("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Non riesco a preparare il file per l'email.");
    } finally {
      setEmailSending(false);
    }
  }

  async function sendToRoom(code: string) {
    if (!sendingItem) return;
    setSending(true);
    try {
      await send({ data: { path: sendingItem.id, code } });
      toast.success("File inviato nella conversazione.");
      setSendingItem(null);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Non riesco a inviare il file.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header>
        <h1 className="font-display text-3xl">Storico</h1>
        <p className="mt-1 text-sm text-muted-foreground">PDF, foto e file</p>
        <AppNav />
      </header>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex gap-2" role="group" aria-label="Seleziona gli allegati">
          <Button variant={source === "personal" ? "default" : "secondary"} onClick={() => setSource("personal")}>I miei file</Button>
          <Button variant={source === "chat" ? "default" : "secondary"} onClick={() => setSource("chat")}>Conversazioni</Button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Aggiorna storico" title="Aggiorna storico" onClick={() => void refresh(source)} disabled={loading}><RefreshCw className="size-4" /></Button>
          <Button onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Salva file
          </Button>
        </div>
        <input ref={input} type="file" className="hidden" aria-label="Scegli file da conservare" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
      </div>

      {error && <p role="alert" className="mt-6 text-sm text-destructive">{error}</p>}
      {loading && items.length === 0 ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</p>
      ) : !items.length && !error ? (
        <div className="mt-12 flex flex-col items-center gap-3 text-center text-muted-foreground">
          <FolderOpen className="size-9" />
          <p className="text-sm">{source === "personal" ? "Non hai ancora file conservati." : "Nessun PDF o foto nelle tue conversazioni."}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex min-w-0 flex-wrap items-center gap-3 py-4 sm:flex-nowrap">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                {item.type === "photo" ? <Image className="size-5" /> : <FileText className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.date ? new Date(item.date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" }) : "File conservato"}{item.roomCode ? ` · Conversazione ${item.roomCode}` : ""}</p>
              </div>
              <div className="flex w-full shrink-0 items-center justify-end gap-1 sm:w-auto">
                {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-medium text-primary underline underline-offset-4">Apri</a>}
                {source === "personal" && item.id.split("/").at(-1)?.includes("--") && <Button variant="secondary" size="sm" aria-label={`Invia ${item.name} in una conversazione`} title="Invia in una conversazione" disabled={deleting === item.id} onClick={() => void openSendPicker(item)}><Send className="size-4" /> Invia</Button>}
                {source === "personal" && item.id.split("/").at(-1)?.includes("--") && <Button variant="secondary" size="sm" aria-label={`Invia ${item.name} via email`} title="Invia via email" disabled={deleting === item.id} onClick={() => { setEmailItem(item); setEmailRecipient(""); }}><Mail className="size-4" /> Email</Button>}
                {item.roomCode && <Link to="/stanza/$code" params={{ code: item.roomCode }} className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm text-accent underline underline-offset-4">Chat</Link>}
                {source === "chat" && <Button variant="secondary" size="sm" disabled={preserving === item.id || deleting === item.id} onClick={() => void saveFromChat(item)}>{preserving === item.id ? "Salvataggio…" : "Conserva"}</Button>}
                {(source === "chat" || item.id.split("/").at(-1)?.includes("--")) && <Button variant="ghost" size="icon" aria-label={`Elimina ${item.name} dallo storico`} title="Elimina dallo storico" disabled={deleting === item.id || preserving === item.id} onClick={() => void deleteFile(item)}>{deleting === item.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMore && <Button variant="secondary" className="mt-5 w-full" disabled={loading} onClick={() => void refresh(source, items.length)}>{loading ? "Caricamento…" : "Mostra altri"}</Button>}

      {emailItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Invia file via email" onClick={() => !emailSending && setEmailItem(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg">Invia «{emailItem.name}» via email</h2>
            <p className="mt-1 text-sm text-muted-foreground">Il file diventa un link sicuro nel messaggio, valido 7 giorni.</p>
            <label htmlFor="archive-email-recipient" className="mt-4 block text-sm font-medium">Destinatario</label>
            <input
              id="archive-email-recipient"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
              placeholder="cliente@esempio.it"
              maxLength={254}
              className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="mt-4 flex gap-2">
              <Button className="flex-1" disabled={emailSending} onClick={() => void sendByEmail()}>
                {emailSending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Apri nell’app di posta
              </Button>
              <Button variant="ghost" disabled={emailSending} onClick={() => setEmailItem(null)}>Annulla</Button>
            </div>
          </div>
        </div>
      )}

      {sendingItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Invia file in una conversazione" onClick={() => !sending && setSendingItem(null)}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-lg">Invia «{sendingItem.name}»</h2>
            <p className="mt-1 text-sm text-muted-foreground">Scegli la conversazione in cui inviare il file.</p>
            {roomsLoading ? (
              <p className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</p>
            ) : !rooms.length ? (
              <p className="mt-5 text-sm text-muted-foreground">Non hai ancora conversazioni.</p>
            ) : (
              <ul className="mt-4 max-h-72 divide-y divide-border overflow-y-auto">
                {rooms.map((room) => (
                  <li key={room.code}>
                    <button type="button" disabled={sending} onClick={() => void sendToRoom(room.code)} className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm font-medium text-primary">
                      <span>Conversazione {room.code}</span>
                      <span className="text-xs font-normal text-muted-foreground">{room.langA} ↔ {room.langB}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" className="mt-4 w-full" disabled={sending} onClick={() => setSendingItem(null)}>{sending ? "Invio…" : "Annulla"}</Button>
          </div>
        </div>
      )}
    </main>
  );
}