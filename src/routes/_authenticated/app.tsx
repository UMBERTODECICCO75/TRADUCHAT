import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Loader2,
  Lock,
  Mail,
  MessageSquare,
  QrCode,
  Send,
  Trash2,
  Users,
  UserPlus,
  Bell,
  BellOff,
  Camera,
  Images,
  Volume2,
  Mic,
} from "lucide-react";


import {
  createRoom as createRoomFn,
  deleteRoom,
  hideRoomMessage,
  listHomeMessages,
  listMyParticipants,
  listMyRooms,
  removeContact,
  sendRoomImage,
  type HomeMessage,
} from "@/lib/rooms.functions";

import { clearCachedRoom } from "@/lib/chat-cache";
import { inviteToRoom, listMyInvites, respondToInvite } from "@/lib/invites.functions";
import { listContactStories, type ContactStories } from "@/lib/stories.functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ensureMyProfile } from "@/lib/profile.functions";
import { LANGUAGES, type Language } from "@/lib/languages";
import { getPreferredLanguage, onPreferredLanguageChange } from "@/lib/preferred-language";
import { speak } from "@/lib/speak";
import { translateMessage } from "@/lib/translate.functions";
import { readTextFromImage } from "@/lib/ocr.functions";
import { fileToJpegBase64 } from "@/lib/image-file";
import { useTranslationTicket } from "@/lib/useTranslationTicket";
import { AppNav } from "@/components/AppNav";
import { CreditBalanceBar } from "@/components/CreditBalanceBar";
import { BuyCredits } from "@/components/BuyCredits";
import { ContactMicButton } from "@/components/ContactMicButton";
import { MicButton } from "@/components/MicButton";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusText } from "@/components/StatusText";
import { StatusPhoto } from "@/components/StatusPhoto";
import { supabase } from "@/integrations/supabase/client";
import {
  alertPermission,
  alertsEnabled,
  playBeep,
  requestAlertPermission,
  setAlertsEnabled,
  showMessageNotification,
} from "@/lib/message-alerts";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Le mie chat tradotte — TraduChat" },
      {
        name: "description",
        content:
          "Crea una conversazione condivisa, riprendi le chat salvate e traduci ogni messaggio all'istante con TraduChat.",
      },
      { property: "og:title", content: "Le mie chat tradotte — TraduChat" },
      {
        property: "og:description",
        content: "Crea una conversazione, invita con il QR code e riprendi le chat salvate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AppHome,
});

type Speaker = "a" | "b";

type Message = {
  id: string;
  speaker: Speaker;
  original: string;
  translation: string | null;
  from: string;
  to: string;
  error?: string;
};

function AppHome() {
  const translate = useServerFn(translateMessage);
  const ensureTicket = useTranslationTicket();
  const createNewRoom = useServerFn(createRoomFn);
  const loadMyRooms = useServerFn(listMyRooms);
  const loadMyParticipants = useServerFn(listMyParticipants);
  const loadHomeMessages = useServerFn(listHomeMessages);
  const removeRoomFn = useServerFn(deleteRoom);
  const removeContactFn = useServerFn(removeContact);
  const hideHomeMessageFn = useServerFn(hideRoomMessage);
  const ensureProfile = useServerFn(ensureMyProfile);

  const readImage = useServerFn(readTextFromImage);
  const sendImage = useServerFn(sendRoomImage);
  const sendInvite = useServerFn(inviteToRoom);
  const loadMyInvites = useServerFn(listMyInvites);
  const answerInvite = useServerFn(respondToInvite);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [newContactOpen, setNewContactOpen] = useState(false);
  const [invites, setInvites] = useState<
    { id: string; code: string; langA: string; langB: string }[]
  >([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [myRooms, setMyRooms] = useState<
    { code: string; langA: string; langB: string; inviteOnly?: boolean; mine?: boolean }[]
  >([]);
  const [myParticipants, setMyParticipants] = useState<
    { userId: string; name: string; avatarUrl: string | null; phone?: string | null; status?: string | null; statusImageUrl?: string | null; roomCode: string; langA: string; langB: string }[]
  >([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [removingContactId, setRemovingContactId] = useState<string | null>(null);
  const [hidingMessageId, setHidingMessageId] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [camPhoto, setCamPhoto] = useState<{ base64: string; mimeType: "image/jpeg"; url: string } | null>(null);
  const [camText, setCamText] = useState("");
  const [camTranslation, setCamTranslation] = useState("");
  const [camBusy, setCamBusy] = useState(false);
  const [camSending, setCamSending] = useState(false);
  const [camRoom, setCamRoom] = useState("");
  const [receivedMessages, setReceivedMessages] = useState<HomeMessage[]>([]);
  const [messageAlertsOn, setMessageAlertsOn] = useState(false);
  const [contactStories, setContactStories] = useState<ContactStories[]>([]);
  const [openStories, setOpenStories] = useState<ContactStories | null>(null);
  const loadContactStories = useServerFn(listContactStories);
  const meRef = useRef("");
  const inboxPrimed = useRef(false);


  /** Deletes one of my conversations for every participant. */
  async function removeRoom(roomCode: string) {
    if (deleting) return;
    setDeleting(roomCode);
    try {
      await removeRoomFn({ data: { code: roomCode } });
      clearCachedRoom(roomCode);
      setMyRooms((prev) => prev.filter((r) => r.code !== roomCode));
      toast.success("Conversazione cancellata.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco a cancellare la conversazione.",
      );
    } finally {
      setDeleting(null);
    }
  }

  /** Deletes a received message only from this person's inbox. */
  async function hideReceivedMessage(message: HomeMessage) {
    if (hidingMessageId) return;
    if (!window.confirm("Cancellare questo messaggio solo per te? Nella conversazione gli altri lo vedranno ancora.")) return;
    setHidingMessageId(message.id);
    try {
      await hideHomeMessageFn({ data: { code: message.roomCode, messageId: message.id } });
      setReceivedMessages((prev) => prev.filter((m) => m.id !== message.id));
      toast.success("Messaggio cancellato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a cancellare il messaggio.");
    } finally {
      setHidingMessageId(null);
    }
  }

  /** Removes a contact from this person's list and shared conversations. */
  async function removeOneContact(userId: string, name: string) {
    if (removingContactId) return;
    setRemovingContactId(userId);
    try {
      await removeContactFn({ data: { userId } });
      setMyParticipants((prev) => prev.filter((p) => p.userId !== userId));
      void loadMyRooms({ data: undefined })
        .then((result) => setMyRooms(result.rooms))
        .catch(() => undefined);
      toast.success(`${name} è stato cancellato dai contatti.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco a cancellare il contatto.",
      );
    } finally {
      setRemovingContactId(null);
    }
  }
  const [langA, setLangA] = useState<Language>("Italiano");
  const [langB, setLangB] = useState<Language>("Inglese");
  const [speaker, setSpeaker] = useState<Speaker>("a");
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const sortedParticipants = useMemo(() => {
    return myParticipants
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
  }, [myParticipants]);


  const { from, to } = useMemo(
    () => (speaker === "a" ? { from: langA, to: langB } : { from: langB, to: langA }),
    [speaker, langA, langB],
  );


  useEffect(() => {
    void ensureProfile({ data: undefined }).catch(() => undefined);
    void loadMyRooms({ data: undefined })
      .then((result) => setMyRooms(result.rooms))
      .catch(() => undefined);
    void loadMyInvites({ data: undefined })
      .then((result) => setInvites(result.invites))
      .catch(() => undefined);
    void loadMyParticipants({ data: undefined })
      .then((result) => setMyParticipants(result.participants))
      .catch(() => undefined);
    void loadHomeMessages({ data: undefined })
      .then((result) => {
        meRef.current = result.me;
        setReceivedMessages(result.messages);
        inboxPrimed.current = true;
      })
      .catch(() => undefined);
    void loadContactStories({ data: undefined })
      .then((result) => setContactStories(result.contacts))
      .catch(() => undefined);
    setMessageAlertsOn(alertsEnabled());
  }, [ensureProfile, loadMyRooms, loadMyInvites, loadMyParticipants, loadHomeMessages, loadContactStories]);

  useEffect(() => {
    const channel = supabase
      .channel("home-message-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages" },
        (payload) => {
          const row = payload.new as { id?: string; sender_id?: string; file_kind?: string };
          if (!inboxPrimed.current || !row.id || row.sender_id === meRef.current || row.file_kind === "system") return;
          void loadHomeMessages({ data: undefined })
            .then((result) => {
              meRef.current = result.me;
              setReceivedMessages(result.messages);
              const incoming = result.messages.find((message) => message.id === row.id);
              if (!incoming) return;
              const title = `Nuovo messaggio da ${incoming.senderName}`;
              playBeep();
              toast(title, { description: incoming.text.slice(0, 140), duration: 4500 });
              if (alertsEnabled() && document.visibilityState !== "visible") {
                showMessageNotification(title, incoming.text);
              }
            })
            .catch(() => undefined);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadHomeMessages]);

  async function toggleHomeMessageAlerts() {
    if (messageAlertsOn) {
      setAlertsEnabled(false);
      setMessageAlertsOn(false);
      toast.success("Notifiche dei messaggi disattivate.");
      return;
    }
    const permission = await requestAlertPermission();
    if (permission === "iframe") {
      toast.error("Apri l'app in una scheda del browser per attivare le notifiche.");
      return;
    }
    if (permission === "unsupported") {
      toast.error("Questo browser non supporta le notifiche.");
      return;
    }
    if (permission === "denied") {
      toast.error("Le notifiche sono bloccate nelle impostazioni del sito.");
      return;
    }
    setAlertsEnabled(true);
    setMessageAlertsOn(true);
    playBeep();
    toast.success("Notifiche attive per i nuovi messaggi.");
  }


  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // The "Lingua" button in the top menu also chooses the reading language here.
  useEffect(() => {
    function apply(language: string | null) {
      if (language && (LANGUAGES as readonly string[]).includes(language)) {
        setLangB(language as Language);
      }
    }
    apply(getPreferredLanguage());
    return onPreferredLanguageChange(apply);
  }, []);

  async function send(spoken?: string) {
    const value = (spoken ?? text).trim();
    if (!value || pending) return;
    const id = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id, speaker, original: value, translation: null, from, to },
    ]);
    if (spoken === undefined) setText("");
    setPending(true);
    try {
      const ticket = await ensureTicket();
      const result = await translate({ data: { text: value, from, to, ticket } });
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, translation: result.translation } : m)),
      );
      if (spoken !== undefined) speak(result.translation, to);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Traduzione non riuscita, riprova.";
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, error: message } : m)));
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  function swap() {
    setLangA(langB);
    setLangB(langA);
  }

  /** Shoots a photo, reads the text in it and translates it. */
  async function scanPhoto(file: File) {
    if (camBusy) return;
    setCamBusy(true);
    setCamText("");
    setCamTranslation("");
    try {
      const { base64, mimeType } = await fileToJpegBase64(file);
      setCamPhoto((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return { base64, mimeType, url: URL.createObjectURL(file) };
      });
      const ticket = await ensureTicket();
      const result = await readImage({ data: { image: base64, mimeType, ticket } });
      setCamText(result.text);
      const translated = await translate({ data: { text: result.text, from, to, ticket } });
      setCamTranslation(translated.translation);
      toast.success("Testo letto e tradotto dalla foto.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a leggere la foto.");
    } finally {
      setCamBusy(false);
      if (cameraInput.current) cameraInput.current.value = "";
    }
  }

  /** Sends the scanned photo, with its text as a translated caption, to a conversation. */
  async function sendPhotoToRoom() {
    if (!camPhoto || !camRoom || camSending) return;
    const room = myRooms.find((r) => r.code === camRoom);
    if (!room) return;
    setCamSending(true);
    try {
      await sendImage({
        data: {
          code: room.code,
          image: camPhoto.base64,
          mimeType: camPhoto.mimeType,
          caption: camText || undefined,
          from: room.langA,
          to: room.langB,
        },
      });
      toast.success("Foto inviata nella conversazione.");
      await navigate({ to: "/stanza/$code", params: { code: room.code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a inviare la foto.");
    } finally {
      setCamSending(false);
    }
  }

  async function createRoom() {
    if (creating) return;
    setCreating(true);
    try {
      const { code } = await createNewRoom({ data: { langA, langB } });
      await navigate({ to: "/stanza/$code", params: { code } });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco a creare la conversazione.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) return;
    await navigate({ to: "/stanza/$code", params: { code } });
  }

  /** Creates a private conversation and invites the other person by email. */
  async function inviteByEmail() {
    const email = inviteEmail.trim();
    if (!email || inviting) return;
    setInviting(true);
    try {
      const { code } = await createNewRoom({ data: { langA, langB, inviteOnly: true } });
      const result = await sendInvite({
        data: { code, email, appOrigin: window.location.origin },
      });
      setInviteEmail("");
      toast.success(
        result.emailSent
          ? `Invito inviato a ${email}.`
          : `Invito creato: ${email} lo trova qui su TraduChat appena entra.`,
      );
      await navigate({ to: "/stanza/$code", params: { code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a inviare l'invito.");
    } finally {
      setInviting(false);
    }
  }

  async function respond(id: string, accept: boolean) {
    if (answering) return;
    setAnswering(id);
    try {
      const { code } = await answerInvite({ data: { id, accept } });
      setInvites((prev) => prev.filter((i) => i.id !== id));
      if (accept && code) {
        await navigate({ to: "/stanza/$code", params: { code } });
      } else {
        toast.success("Invito rifiutato.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a rispondere all'invito.");
    } finally {
      setAnswering(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-6 pt-6 sm:px-6">

      <header className="flex items-center gap-3">
        <img
          src="/logo-apertura.png"
          alt="TraduChat"
          width={768}
          height={768}
          className="size-12 shrink-0 rounded-[24%] object-cover bubble-shadow sm:size-14"
        />
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">TraduChat</h1>
          <p className="text-sm text-muted-foreground">
            Scrivi nella tua lingua, l'altra persona legge nella sua.
          </p>
        </div>
      </header>

      <AppNav />

      <CreditBalanceBar />
      <BuyCredits />


      <section className="mt-4 p-1 sm:p-2">
        <div className="flex items-center gap-3">
          <p className="flex min-w-0 flex-1 items-center gap-2 font-display text-lg">
            <MessageSquare className="size-4 text-accent" /> Messaggi ricevuti
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void toggleHomeMessageAlerts()}
            aria-label={messageAlertsOn ? "Disattiva notifiche messaggi" : "Attiva notifiche messaggi"}
            title={messageAlertsOn ? "Notifiche attive" : "Attiva notifiche"}
          >
            {messageAlertsOn ? <Bell className="size-5 text-accent" /> : <BellOff className="size-5" />}
          </Button>
        </div>
        {receivedMessages.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">I nuovi messaggi compariranno qui appena arrivano.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {receivedMessages.map((message) => (
              <li key={message.id} className="relative rounded-lg border border-border bg-card p-3 sm:p-4">
                <Link
                  to="/stanza/$code"
                  params={{ code: message.roomCode }}
                  className="flex min-w-0 items-start gap-3 pr-11"
                 >
                  <ParticipantAvatar
                    name={message.senderName}
                    avatarUrl={message.senderAvatarUrl}
                    className="size-11 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-base font-semibold" translate="no">{message.senderName}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {message.isVoice ? <Mic className="size-4 shrink-0 text-primary" /> : <MessageSquare className="size-4 shrink-0 text-primary" />}
                      <span>{message.isVoice ? "Messaggio vocale" : "Messaggio scritto"}</span>
                      <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
                    </span>
                  </span>
                </Link>
                <p className="mt-3 whitespace-pre-wrap break-words text-base leading-relaxed text-foreground [overflow-wrap:anywhere]" translate="no">{message.text}</p>
                <Button variant="secondary" size="sm" asChild className="mt-3">
                  <Link to="/stanza/$code" params={{ code: message.roomCode }}>
                    {message.isVoice ? <Volume2 className="size-4" /> : <MessageSquare className="size-4" />}
                    {message.isVoice ? "Apri e ascolta" : "Apri conversazione"}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Cancella questo messaggio solo per te"
                  title="Cancella per te"
                  disabled={hidingMessageId !== null}
                  onClick={() => void hideReceivedMessage(message)}
                  className="absolute right-2 top-2 size-11 shrink-0"
                >
                  {hidingMessageId === message.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>


      <section className="mt-5 rounded-3xl surface-card p-4">
        <p className="font-display text-lg">Due telefoni, una conversazione</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea la conversazione e fai inquadrare il QR code all'altra persona: ognuno scrive e
          legge dal proprio telefono.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => void createRoom()} disabled={creating} className="sm:flex-1">
            {creating ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
            Crea conversazione
          </Button>
          <div className="flex gap-2 sm:flex-1">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") void joinRoom();
              }}
              placeholder="Codice"
              maxLength={16}
              aria-label="Codice della conversazione"
              className="tracking-[0.2em] uppercase"
            />
            <Button
              variant="secondary"
              onClick={() => void joinRoom()}
              disabled={joinCode.trim().length < 4}
            >
              Entra
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Camera className="size-4 text-accent" /> Fotocamera che traduce
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Scatta una foto a un cartello, un menù o un documento: leggo il testo e lo traduco da{" "}
          {from} a {to}. Poi puoi inviare la foto in una conversazione.
        </p>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Scatta una foto da tradurre"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void scanPhoto(file);
          }}
        />
        <Button
          type="button"
          className="mt-3 w-full sm:w-auto"
          disabled={camBusy}
          onClick={() => cameraInput.current?.click()}
        >
          {camBusy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {camBusy ? "Leggo la foto…" : "Scatta e traduci"}
        </Button>
        {camPhoto && (
          <div className="mt-4 space-y-3">
            <img
              src={camPhoto.url}
              alt="Foto scattata da tradurre"
              className="max-h-64 w-full rounded-2xl object-cover"
            />
            {camText && (
              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Testo letto ({from})
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{camText}</p>
              </div>
            )}
            {camTranslation && (
              <div className="rounded-2xl border border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Traduzione ({to})
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{camTranslation}</p>
              </div>
            )}
            {!camBusy && camPhoto && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={camRoom} onValueChange={setCamRoom}>
                  <SelectTrigger className="sm:flex-1" aria-label="Scegli la conversazione">
                    <SelectValue placeholder="Scegli la conversazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {myRooms.map((room) => (
                      <SelectItem key={room.code} value={room.code}>
                        {room.code} · {room.langA} ↔ {room.langB}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!camRoom || camSending}
                  onClick={() => void sendPhotoToRoom()}
                >
                  {camSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Invia foto
                </Button>
              </div>
            )}
          </div>
        )}
      </section>


      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Lock className="size-4 text-accent" /> Invita per email
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Crea una conversazione privata e invita chi vuoi con la sua email: nessun codice da
          condividere, entra solo chi accetta l'invito.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void inviteByEmail();
            }}
            placeholder="email@esempio.it"
            aria-label="Email della persona da invitare"
            className="sm:flex-1"
          />
          <Button onClick={() => void inviteByEmail()} disabled={inviting || !inviteEmail.trim()}>
            {inviting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            Invita
          </Button>
        </div>
      </section>

      {invites.length > 0 && (
        <section className="mt-4 rounded-3xl surface-card p-4">
          <p className="font-display text-lg">Inviti ricevuti</p>
          <ul className="mt-2 divide-y divide-border">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                <Mail className="size-4 text-accent" />
                <span className="font-medium tracking-[0.15em]">{i.code}</span>
                <span className="text-xs text-muted-foreground">
                  {i.langA} · {i.langB}
                </span>
                <span className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void respond(i.id, true)}
                    disabled={answering === i.id}
                  >
                    Accetta
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void respond(i.id, false)}
                    disabled={answering === i.id}
                  >
                    Rifiuta
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-3xl surface-card p-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/gruppi"
            className="flex min-h-14 items-center gap-4 rounded-2xl px-2 py-2 hover:bg-muted"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Users className="size-5" />
            </span>
            <span className="text-base font-medium tracking-wide">Nuovo gruppo</span>
          </Link>
          <button
            type="button"
            onClick={() => setNewContactOpen((v) => !v)}
            aria-expanded={newContactOpen}
            className="flex min-h-14 items-center gap-4 rounded-2xl px-2 py-2 text-left hover:bg-muted"
          >
            <span className="flex size-12 items-center justify-center rounded-full bg-primary/60 text-primary-foreground">
              <UserPlus className="size-5" />
            </span>
            <span className="text-base font-medium tracking-wide">Nuovo contatto</span>
          </button>
        </div>
        {newContactOpen && (
          <div className="mt-3 rounded-2xl border border-border bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              Scrivi l'email della persona: riceverà una notifica via email e nell'app, e
              comparirà tra i tuoi contatti appena accetta.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void inviteByEmail();
                }}
                placeholder="email@esempio.it"
                aria-label="Email del nuovo contatto"
                className="sm:flex-1"
                autoFocus
              />
              <Button
                onClick={() => void inviteByEmail()}
                disabled={inviting || !inviteEmail.trim()}
              >
                {inviting ? <Loader2 className="size-4 animate-spin" /> : <Bell className="size-4" />}
                Aggiungi e notifica
              </Button>
            </div>
          </div>
        )}
      </section>

      {contactStories.length > 0 && (
        <section className="mt-4 rounded-3xl surface-card p-4">
          <p className="flex items-center gap-2 font-display text-lg">
            <Images className="size-4 text-accent" /> Storie dei contatti
          </p>
          <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {contactStories.map((c) => (
              <button
                key={c.userId}
                type="button"
                onClick={() => setOpenStories(c)}
                className="flex w-16 shrink-0 flex-col items-center gap-1"
              >
                <span className="rounded-full bg-gradient-to-tr from-primary to-accent p-0.5">
                  <ParticipantAvatar
                    name={c.name}
                    avatarUrl={c.avatarUrl}
                    className="size-12 border-2 border-card"
                  />
                </span>
                <span className="w-full truncate text-center text-xs text-muted-foreground">
                  {c.name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <Dialog open={openStories !== null} onOpenChange={(open) => !open && setOpenStories(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{openStories ? `Storie di ${openStories.name}` : "Storie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {openStories?.stories.map((story) => (
              <figure key={story.id} className="space-y-1">
                {story.imageUrl && (
                  <img
                    src={story.imageUrl}
                    alt={story.caption || `Storia di ${openStories.name}`}
                    className="max-h-96 w-full rounded-2xl border border-border/60 object-contain"
                  />
                )}
                {story.caption && (
                  <figcaption className="text-sm text-muted-foreground">{story.caption}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {myParticipants.length > 0 && (
        <section className="mt-4 rounded-3xl surface-card p-4">
          <p className="flex items-center gap-2 font-display text-lg">
            <Users className="size-4 text-accent" /> Contatti
          </p>
          {sortedParticipants.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nessun partecipante corrisponde alla ricerca.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {sortedParticipants.map((p) => (
                <li
                  key={p.userId}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <ParticipantAvatar
                    name={p.name}
                    avatarUrl={p.avatarUrl}
                    className="size-11 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/stanza/$code"
                      params={{ code: p.roomCode }}
                      className="block min-w-0 truncate text-sm font-semibold hover:text-accent"
                    >
                      {p.name}
                    </Link>
                    {p.status && (
                      <p className="max-w-[12rem] truncate text-xs text-muted-foreground">
                        <StatusText text={p.status} />
                      </p>
                    )}
                    {p.statusImageUrl && (
                      <StatusPhoto url={p.statusImageUrl} name={p.name} className="mt-1 size-12 rounded-lg border border-border/60 object-cover" />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ContactMicButton
                      name={p.name}
                      roomCode={p.roomCode}
                      langA={p.langA}
                      langB={p.langB}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label={`Cancella ${p.name} dai contatti`}
                          disabled={removingContactId === p.userId}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancellare {p.name} dai contatti?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sparisce dall'elenco contatti ed esci anche dalle conversazioni condivise.
                            La chat e i messaggi restano agli altri partecipanti.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void removeOneContact(p.userId, p.name)}
                          >
                            Cancella
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {myRooms.length > 0 && (

        <section className="mt-4 rounded-3xl surface-card p-4">
          <p className="font-display text-lg">Le mie conversazioni</p>
          <ul className="mt-2 divide-y divide-border">
            {myRooms.map((r) => (
              <li key={r.code} className="flex items-center gap-2">
                <Link
                  to="/stanza/$code"
                  params={{ code: r.code }}
                  className="flex flex-1 items-center gap-3 py-2.5 text-sm hover:text-accent"
                >
                  <MessageSquare className="size-4 text-accent" />
                  <span className="font-medium tracking-[0.15em]">{r.code}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {r.langA} · {r.langB}
                  </span>
                </Link>
                {r.mine && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        aria-label={`Cancella la conversazione ${r.code}`}
                        disabled={deleting === r.code}
                      >
                        {deleting === r.code ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancellare la conversazione {r.code}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tutti i messaggi vengono eliminati per tutti i partecipanti e non si
                          possono recuperare.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void removeRoom(r.code)}>
                          Cancella
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5 flex items-center gap-2 rounded-2xl surface-card p-2">
        <LangSelect value={langA} onChange={setLangA} />
        <Button
          variant="ghost"
          size="icon"
          onClick={swap}
          aria-label="Inverti le lingue"
          className="shrink-0 text-accent"
        >
          <ArrowLeftRight className="size-4" />
        </Button>
        <LangSelect value={langB} onChange={setLangB} />
      </section>

      <section className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-3xl surface-card p-4">
        {messages.length === 0 ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-lg">Nessun messaggio, ancora.</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Scegli chi sta parlando, scrivi il messaggio e lo vedrai tradotto subito sotto
              l'originale.
            </p>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
        <div ref={endRef} />
      </section>

      <section className="mt-4 rounded-3xl surface-card p-3">
        <div className="flex gap-2">
          {(["a", "b"] as Speaker[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeaker(s)}
              className={cn(
                "min-h-11 flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                speaker === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-secondary",
              )}
            >
              {s === "a" ? `Persona 1 · ${langA}` : `Persona 2 · ${langB}`}
            </button>
          ))}
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={`Scrivi in ${from}…`}
          className="mt-3 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />

        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {from} → {to}
          </p>
          <div className="flex items-center gap-2">
            <MicButton language={from} onText={(t) => void send(t)} />
            <Button onClick={() => void send()} disabled={pending || !text.trim()}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Invia
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}

function LangSelect({
  value,
  onChange,
}: {
  value: Language;
  onChange: (v: Language) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Language)}>
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

function Bubble({ message }: { message: Message }) {
  const mine = message.speaker === "a";
  return (
    <div className={cn("flex", mine ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 bubble-shadow",
          mine ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        <p className="text-xs uppercase tracking-wide opacity-70">{message.from}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm" translate="no">{message.original}</p>
        <div
          className={cn(
            "mt-3 border-t pt-2",
            mine ? "border-border" : "border-primary-foreground/25",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide opacity-70">{message.to}</p>
            {message.translation && (
              <button
                type="button"
                aria-label={`Ascolta la traduzione in ${message.to}`}
                title={`Ascolta in ${message.to}`}
                onClick={() => {
                  if (!speak(message.translation ?? "", message.to))
                    toast.error("Questo browser non legge i testi.");
                }}
                className="opacity-80 transition hover:opacity-100"
              >
                <Volume2 className="size-4" />
              </button>
            )}
          </div>
          {message.error ? (
            <p className="mt-1 text-sm font-medium">⚠️ {message.error}</p>
          ) : message.translation ? (
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium" translate="no">{message.translation}</p>
          ) : (
            <p className="mt-1 flex items-center gap-2 text-sm opacity-80">
              <Loader2 className="size-3 animate-spin" /> traduzione in corso…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
