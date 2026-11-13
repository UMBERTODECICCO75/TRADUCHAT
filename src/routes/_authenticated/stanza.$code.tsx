import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Bell,
  BellOff,
  CloudOff,
  FileDown,
  Camera,
  Home,
  Languages,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  QrCode,
  ImagePlus,
  FileText,
  Mic,
  Square,

  Search,
  Settings2,
  Share2,
  Send,
  Trash2,
  Users,
  Volume2,
  X,
} from "lucide-react";
import QRCode from "qrcode";

import {
  newOutboxId,
  readOutbox,
  writeOutbox,
  type OutboxItem,
} from "@/lib/offline-outbox";
import {
  clearCachedRoom,
  readCachedHiddenMessages,
  readCachedMessages,
  readCachedRoom,
  readCachedTranslations,
  writeCachedHiddenMessages,
  writeCachedMessages,
  writeCachedRoom,
  writeCachedTranslations,
} from "@/lib/chat-cache";

import {
  deleteRoom,
  deleteRoomMessage,
  editRoomMessage,
  hideRoomMessage,
  listRoomMessages,
  sendRoomImage,
  sendRoomMessage,
  sendRoomPdf,
  sendRoomVoice,
  setRoomLanguages,
} from "@/lib/rooms.functions";
import { fileToJpegBase64 } from "@/lib/image-file";
import { fileToBase64 } from "@/lib/file-base64";
import { useVoiceRecorder } from "@/lib/useVoiceRecorder";
import { inviteToRoom, listRoomInvites } from "@/lib/invites.functions";
import { LANGUAGES, TARGET_LANGUAGES } from "@/lib/languages";
import { getPreferredLanguage, onPreferredLanguageChange } from "@/lib/preferred-language";
import {
  alertPermission,
  alertsEnabled,
  playBeep,
  requestAlertPermission,
  setAlertsEnabled,
  showMessageNotification,
  type AlertPermission,
} from "@/lib/message-alerts";
import { translateMessage } from "@/lib/translate.functions";
import { useTranslationTicket } from "@/lib/useTranslationTicket";
import { buildTranslationPdf, isLatinText } from "@/lib/translation-pdf";
import { speak, queueSpeech } from "@/lib/speak";
import { ChatAudioInbox } from "@/lib/chat-audio";
import { whatsappLink } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { MicButton } from "@/components/MicButton";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { isOnline, presenceLabel } from "@/lib/presence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { StatusText } from "@/components/StatusText";
import { StatusPhoto } from "@/components/StatusPhoto";
import { ConversationPhoto } from "@/components/ConversationPhoto";
import AudioPlayer from "@/components/AudioPlayer";
import { EmojiPicker } from "@/components/EmojiPicker";
import { VideoCall } from "@/components/VideoCall";
import { GroupVideoCall } from "@/components/GroupVideoCall";
import { chatLanguages, chatTranslationKey, chatTranslationText } from "@/lib/chat-translation";
import { chatSendFailure } from "@/lib/chat-connection";

export const Route = createFileRoute("/_authenticated/stanza/$code")({
  head: () => ({
    meta: [
      { title: "Conversazione condivisa — TraduChat" },
      {
        name: "description",
        content:
          "Due telefoni, una conversazione: ogni messaggio arriva tradotto in tempo reale nella lingua dell'altra persona.",
      },
      { property: "og:title", content: "Conversazione condivisa — TraduChat" },
      {
        property: "og:description",
        content: "Inquadra il QR code ed entra nella conversazione tradotta in tempo reale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPage,
});

type Room = {
  id?: string;
  code: string;
  lang_a: string;
  lang_b: string;
  invite_only?: boolean;
  name?: string | null;
  is_group?: boolean;
  theme?: string | null;
  topic?: string | null;
  photoUrl?: string | null;
  coverUrl?: string | null;
};

type RoomInvite = { id: string; invitee_email: string; status: string };

type Participant = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phone?: string | null;
  status?: string | null;
  statusImageUrl?: string | null;
  showStatus?: boolean;
  lastSeenAt?: string | null;
  globalLastSeenAt?: string | null;
};

type RoomMessage = {
  id: string;
  sender_id: string;
  original: string;
  translation: string | null;
  from_lang: string;
  to_lang: string;
  image_path?: string | null;
  imageUrl?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  file_kind?: string | null;
  fileUrl?: string | null;
  audio_path?: string | null;
  audioUrl?: string | null;
};


/** Newest activity across this room and the whole app drives presence. */
function participantSeenAt(p: Participant): string | null {
  const times = [p.lastSeenAt, p.globalLastSeenAt]
    .filter((t): t is string => Boolean(t))
    .map((t) => new Date(t).getTime());
  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

function isParticipantOnline(p: Participant): boolean {
  return isOnline(participantSeenAt(p));
}

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const loadRoom = useServerFn(listRoomMessages);
  const sendMessage = useServerFn(sendRoomMessage);
  const sendImage = useServerFn(sendRoomImage);
  const [sendingPhoto, setSendingPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const sendPdfFn = useServerFn(sendRoomPdf);
  const [sendingPdf, setSendingPdf] = useState(false);
  const pdfInput = useRef<HTMLInputElement>(null);
  const sendVoiceFn = useServerFn(sendRoomVoice);
  const [sendingVoice, setSendingVoice] = useState(false);
  const voice = useVoiceRecorder();
  const updateLanguages = useServerFn(setRoomLanguages);
  const sendInvite = useServerFn(inviteToRoom);
  const loadInvites = useServerFn(listRoomInvites);
  const removeRoomFn = useServerFn(deleteRoom);
  const removeMessageFn = useServerFn(deleteRoomMessage);
  const hideMessageFn = useServerFn(hideRoomMessage);
  const editMessageFn = useServerFn(editRoomMessage);
  const [isOwner, setIsOwner] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function saveEdit(messageId: string) {
    const value = editText.trim();
    if (!value || savingEdit) return;
    setSavingEdit(true);
    try {
      const result = await editMessageFn({ data: { code, messageId, text: value } });
      if (!result.unchanged) {
        setMessages((prev) => prev.map((m) => m.id === messageId
          ? { ...m, original: result.original, translation: result.translation }
          : m));
      }
      setEditingMessageId(null);
      toast.success("Messaggio modificato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a modificare il messaggio.");
    } finally {
      setSavingEdit(false);
    }
  }

  /** Removes one message for everyone in the conversation or group. */
  async function removeMessage(messageId: string, isVoice: boolean) {
    if (deletingMessageId) return;
    if (!window.confirm(isVoice ? "Cancellare il vocale e la sua traduzione per tutti?" : "Cancellare questo messaggio per tutti?")) return;
    setDeletingMessageId(messageId);
    try {
      await removeMessageFn({ data: { code, messageId } });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success(isVoice ? "Vocale cancellato." : "Messaggio cancellato.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco a cancellare il messaggio.",
      );
    } finally {
      setDeletingMessageId(null);
    }
  }

  /** Deletes a received message only from this person's view: the others keep it. */
  async function hideMessage(messageId: string) {
    if (deletingMessageId) return;
    if (!window.confirm("Cancellare questo messaggio solo per te? Gli altri partecipanti lo vedranno ancora.")) return;
    setDeletingMessageId(messageId);
    try {
      await hideMessageFn({ data: { code, messageId } });
      hiddenIds.current.add(messageId);
      writeCachedHiddenMessages(code, [...hiddenIds.current]);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast.success("Messaggio cancellato.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco a cancellare il messaggio.",
      );
    } finally {
      setDeletingMessageId(null);
    }
  }

  /** Deletes the conversation for everyone and goes back to the list. */
  async function removeRoom() {
    if (deleting) return;
    setDeleting(true);
    try {
      await removeRoomFn({ data: { code } });
      clearCachedRoom(code);
      writeOutbox(code, []);
      toast.success("Conversazione cancellata.");
      await navigate({ to: "/app" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco a cancellare la conversazione.",
      );
    } finally {
      setDeleting(false);
    }
  }


  const [me, setMe] = useState("");
  const [room, setRoom] = useState<Room | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [text, setText] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [queue, setQueue] = useState<OutboxItem[]>([]);
  const [online, setOnline] = useState(true);
  const [sendError, setSendError] = useState("");
  const sendBlocked = useRef(false);
  const [pendingVoice, setPendingVoice] = useState<{ audio: string; from: string; to: string } | null>(null);
  const queueRef = useRef<OutboxItem[]>([]);
  const flushing = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // On a phone the messages come first: options live behind one button.
  const [showTools, setShowTools] = useState(false);
  const [alertsOn, setAlertsOn] = useState(false);
  const [permission, setPermission] = useState<AlertPermission>("default");
  const alertsRef = useRef(false);
  const seenIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  // Messages deleted from this person's view, so realtime and offline copies skip them.
  const hiddenIds = useRef<Set<string>>(new Set());

  // In-chat translation: read every message in one chosen language.
  const ensureTicket = useTranslationTicket();
  const translate = useServerFn(translateMessage);
  const [chatLang, setChatLang] = useState<string | null>(null);
  const [preferredLanguage, setPreferredLanguage] = useState<string | null>(null);
  const translationRequests = useRef(new Map<string, Promise<string>>());
  const failedTranslations = useRef(new Set<string>());
  const myLanguage = [...messages].reverse().find((m) => m.sender_id === me && m.file_kind !== "system" && (m.from_lang === room?.lang_a || m.from_lang === room?.lang_b))?.from_lang;
  const { from, to } = chatLanguages(room?.lang_a ?? "Italiano", room?.lang_b ?? "Inglese", isOwner, myLanguage, preferredLanguage);
  const readingLanguage = chatLang ?? preferredLanguage ?? from;
  // In a group each member picks the language they speak in voice messages.
  const [voiceLang, setVoiceLang] = useState<string | null>(null);
  const voiceFrom = room?.is_group ? (voiceLang ?? preferredLanguage ?? from) : from;
  const voiceTo = !room ? to : voiceFrom === room.lang_a ? room.lang_b : room.lang_a;
  const [audioAuto, setAudioAuto] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioInbox = useRef(new ChatAudioInbox());

  const stopAutoAudio = useCallback(() => {
    setAudioAuto(false);
    window.speechSynthesis?.cancel();
  }, []);

  function toggleAutoAudio(enabled: boolean) {
    if (!enabled) { stopAutoAudio(); return; }
    const supported = queueSpeech("Ascolto automatico attivo", "Italiano", () => {
      stopAutoAudio();
      toast.error("Ascolto automatico non disponibile: tocca Ascolta sul vocale.");
    });
    if (!supported) { toast.error("Questo browser non supporta la lettura vocale."); return; }
    setAudioAuto(true);
  }

  useEffect(() => {
    audioInbox.current = new ChatAudioInbox();
    setAudioAuto(false);
    setAudioLoaded(false);
    return () => { window.speechSynthesis?.cancel(); };
  }, [code]);

  // Applies the global reading language from the menu: initial value and live changes.
  useEffect(() => {
    const saved = getPreferredLanguage();
    setPreferredLanguage(saved);
    return onPreferredLanguageChange((language) => {
      setPreferredLanguage(language);
      setChatLang(null);
    });
  }, []);
  const [extra, setExtra] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!audioLoaded || !me) return;
    for (const text of audioInbox.current.collect(messages, me, audioAuto, readingLanguage, extra)) {
      if (!queueSpeech(text, readingLanguage, () => {
        stopAutoAudio();
        toast.error("Ascolto automatico interrotto: tocca Ascolta sul vocale.");
      })) { stopAutoAudio(); break; }
    }
  }, [messages, me, audioLoaded, audioAuto, readingLanguage, extra, stopAutoAudio]);
  const [translationErrors, setTranslationErrors] = useState<Record<string, boolean>>({});
  const [translating, setTranslating] = useState(0);
  const [exporting, setExporting] = useState(false);
  const cacheWriteReady = useRef(false);

  // Offline copy: messages and their translations are read back from the phone,
  // so the chat and its PDF are complete even without a connection.
  useEffect(() => {
    hiddenIds.current = new Set(readCachedHiddenMessages(code));
    const cached = readCachedMessages(code).filter((m) => !hiddenIds.current.has(m.id));
    if (cached.length > 0) {
      setMessages((prev) => {
        if (prev.length > 0) return prev;
        for (const m of cached) seenIds.current.add(m.id);
        return cached;
      });
    }
    const saved = readCachedTranslations(code);
    if (Object.keys(saved).length > 0) setExtra((prev) => ({ ...saved, ...prev }));
    const info = readCachedRoom(code);
    if (info) {
      setRoom((prev) => prev ?? info.room);
      setMe((prev) => prev || info.me);
      setParticipants((prev) => (prev.length > 0 ? prev : info.participants));
    }
  }, [code]);

  useEffect(() => {
    if (!cacheWriteReady.current) {
      cacheWriteReady.current = true;
      return;
    }
    writeCachedMessages(code, messages);
  }, [code, messages]);

  useEffect(() => {
    if (Object.keys(extra).length > 0) writeCachedTranslations(code, extra);
  }, [code, extra]);



  useEffect(() => {
    const enabled = alertsEnabled();
    setAlertsOn(enabled);
    alertsRef.current = enabled;
    setPermission(alertPermission());
  }, []);

  /** Turns the alerts on (asking the browser once) or off. */
  async function toggleAlerts() {
    if (alertsOn) {
      setAlertsOn(false);
      alertsRef.current = false;
      setAlertsEnabled(false);
      toast.success("Avvisi disattivati.");
      return;
    }
    const state = await requestAlertPermission();
    setPermission(state);
    if (state === "iframe") {
      toast.error("Apri l'app in una scheda del browser per attivare gli avvisi.");
      return;
    }
    if (state === "unsupported") {
      toast.error("Questo browser non supporta le notifiche.");
      return;
    }
    if (state === "denied") {
      toast.error("Le notifiche sono bloccate: sbloccale nelle impostazioni del sito.");
      return;
    }
    setAlertsOn(true);
    alertsRef.current = true;
    setAlertsEnabled(true);
    playBeep();
    toast.success("Avvisi attivi: ti avviso a ogni nuovo messaggio.");
  }



  const filteredParticipants = useMemo(() => {
    const q = participantSearch.trim().toLowerCase();
    const list = q
      ? participants.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.status && p.status.toLowerCase().includes(q)) ||
            (p.phone && p.phone.includes(q)),
        )
      : participants.slice();
    return list.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
  }, [participants, participantSearch]);

  const joinUrl = useMemo(
    () => (typeof window === "undefined" ? "" : `${window.location.origin}/stanza/${code}`),
    [code],
  );

  useEffect(() => {
    if (!joinUrl) return;
    void QRCode.toDataURL(joinUrl, { width: 320, margin: 1 }).then(setQr);
  }, [joinUrl]);

  const participantsRef = useRef<Participant[]>([]);
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  const meRef = useRef("");
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  /**
   * Announces messages written by someone else: an in-app banner while the chat
   * is on screen, a system notification (and beep) when the bell is on.
   */
  const announce = useCallback((fresh: RoomMessage[]) => {
    if (fresh.length === 0) return;
    const last = fresh[fresh.length - 1]!;
    const sender =
      participantsRef.current.find((p) => p.userId === last.sender_id)?.name ?? "Partecipante";
    const title =
      fresh.length > 1 ? `${fresh.length} nuovi messaggi` : `Nuovo messaggio da ${sender}`;
    const body = last.translation ?? last.original;
    const visible = typeof document === "undefined" || document.visibilityState === "visible";
    if (alertsRef.current) playBeep();
    if (visible) {
      toast(title, { description: body.slice(0, 140), duration: 3500 });
      return;
    }
    if (alertsRef.current) showMessageNotification(title, body);
  }, []);

  /** Adds a streamed message right away, keeping the list free of duplicates. */
  const addMessage = useCallback(
    (message: RoomMessage) => {
      if (hiddenIds.current.has(message.id)) return;
      let isNew = false;
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        isNew = true;
        return [...prev, message];
      });
      if (!isNew || seenIds.current.has(message.id)) return;
      seenIds.current.add(message.id);
      if (message.sender_id !== meRef.current && message.file_kind !== "system") {
        announce([message]);
      }
    },
    [announce],
  );

  const refresh = useCallback(async () => {
    const result = await loadRoom({ data: { code } });
    if (!result.room) {
      setNotFound(true);
      return;
    }
    setRoom(result.room);
    setMe(result.me);
    setIsOwner(result.isOwner);
    setParticipants(result.participants);
    writeCachedRoom(code, {
      room: result.room,
      participants: result.participants,
      me: result.me,
    });
    // The server is authoritative: deleted messages must not return from the phone cache.
    setMessages(result.messages);
    setAudioLoaded(true);

    // Alert only for messages written by someone else, and never on first load.
    const fresh = result.messages.filter(
      (m) => !seenIds.current.has(m.id) && m.sender_id !== result.me && m.file_kind !== "system",
    );
    for (const m of result.messages) seenIds.current.add(m.id);
    if (!primed.current) {
      primed.current = true;
      return;
    }
    participantsRef.current = result.participants;
    meRef.current = result.me;
    announce(fresh);
  }, [code, loadRoom, announce]);

  const refreshInvites = useCallback(async () => {
    const result = await loadInvites({ data: { code } });
    setInvites(result.invites);
  }, [code, loadInvites]);

  /** The text of a message in the language chosen for reading the chat. */
  const inChatLang = useCallback(
    (m: RoomMessage, lang: string): string | null => {
      return chatTranslationText(m, lang, extra);
    },
    [extra],
  );

  // Share pending requests across realtime refreshes; never restart a batch on each result.
  useEffect(() => {
    const lang = readingLanguage;
    if (!room || !online) return;
    let active = true;
    const todo = messages.filter((m) => inChatLang(m, lang) === null && !failedTranslations.current.has(chatTranslationKey(m, lang)));
    if (todo.length === 0) return;

    void (async () => {
      for (let index = 0; index < todo.length; index += 3) {
        if (!active) return;
        await Promise.all(todo.slice(index, index + 3).map(async (m) => {
        const key = chatTranslationKey(m, lang);
        let request = translationRequests.current.get(key);
        if (!request) {
          request = (async () => {
            const ticket = await ensureTicket();
            const result = await translate({ data: { text: m.original, from: m.from_lang, to: lang, ticket } });
            return result.translation;
          })();
          translationRequests.current.set(key, request);
        }
        setTranslating((n) => n + 1);
        try {
          const translatedText = await request;
          if (!active) return;
          setExtra((prev) => ({ ...prev, [key]: translatedText }));
        } catch (error) {
          if (!active) return;
          failedTranslations.current.add(key);
          setTranslationErrors((prev) => ({ ...prev, [key]: true }));
          toast.error(
            error instanceof Error ? error.message : "Non riesco a tradurre il messaggio.",
          );
          return;
        } finally {
          setTranslating((n) => Math.max(0, n - 1));
        }
        }));
      }
    })();

    return () => {
      active = false;
    };
  }, [readingLanguage, room, messages, inChatLang, ensureTicket, translate, online]);

  /** Downloads the conversation as a PDF: original next to its translation. */
  async function exportPdf() {
    if (messages.length === 0) {
      toast.error("Non c'è ancora nessun messaggio da scaricare.");
      return;
    }
    const lang = readingLanguage;
    const chatMessages = messages.filter((m) => m.file_kind !== "system");
    const pairs = chatMessages.map((m) => ({
      original: m.original,
      translation: inChatLang(m, lang) ?? "—",
    }));
    const unsupported = pairs.some((p) => !isLatinText(p.original) || !isLatinText(p.translation));
    setExporting(true);
    try {
      await buildTranslationPdf({
        pairs,
        from: "Messaggi originali",
        to: lang,
        fileName: `conversazione-${code}-${lang}.pdf`,
      });
      toast.success(
        unsupported
          ? "PDF scaricato. Alcuni alfabeti (cinese, ucraino) potrebbero non essere leggibili."
          : "PDF scaricato.",
      );
    } catch {
      toast.error("Non riesco a creare il PDF.");
    } finally {
      setExporting(false);
    }
  }

  /**
   * Builds a plain-text transcript (sender, original, translation) and opens
   * WhatsApp so it can be sent to anyone, even without TraduChat.
   */
  function shareOnWhatsapp() {
    if (messages.length === 0) {
      toast.error("Non c'è ancora nessun messaggio da inviare.");
      return;
    }
    const lang = readingLanguage;
    const chatMessages = messages.filter((m) => m.file_kind !== "system");
    const name = (senderId: string) =>
      senderId === me
        ? "Io"
        : (participants.find((p) => p.userId === senderId)?.name ?? "Partecipante");
    const lines = chatMessages.map((m) => {
      const translated = inChatLang(m, lang);
      const extra = translated && translated !== m.original ? `\n   ↳ ${translated}` : "";
      return `*${name(m.sender_id)}*: ${m.original}${extra}`;
    });
    let body = lines.join("\n");
    // WhatsApp links break past a few thousand characters: keep the latest part.
    const LIMIT = 3000;
    let trimmed = false;
    while (body.length > LIMIT && lines.length > 1) {
      lines.shift();
      trimmed = true;
      body = lines.join("\n");
    }
    const header = `Conversazione TraduChat (${code})${trimmed ? "\n(ultimi messaggi)" : ""}\n\n`;
    const text = `${header}${body.slice(-LIMIT)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    toast.success("Apro WhatsApp con la conversazione.");
  }


  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      void refresh().catch((error: unknown) => {
        if (error instanceof Error && error.message.includes("solo su invito")) {
          setBlocked(error.message);
          active = false;
        }
      });
    };
    tick();
    // Slow fallback: realtime below is the fast path.
    const interval = window.setInterval(tick, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [refresh]);

  /** Streams new messages into the conversation as soon as they arrive. */
  useEffect(() => {
    if (!room?.id || blocked) return;
    const channel = supabase
      .channel(`room-stream-${room.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const row = payload.new as RoomMessage & Record<string, unknown>;
          // Text-only messages show instantly; files need a signed link, so refetch.
          if (row.id && !row.image_path && !row.file_path && !row.audio_path) {
            addMessage({
              id: row.id,
              sender_id: row.sender_id,
              original: row.original,
              translation: row.translation ?? null,
              from_lang: row.from_lang,
              to_lang: row.to_lang,
              file_kind: row.file_kind ?? null,
            });
            return;
          }
          void refresh().catch(() => undefined);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` },
        () => { void refresh().catch(() => undefined); },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "room_messages", filter: `room_id=eq.${room.id}` },
        () => { void refresh().catch(() => undefined); },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh().catch(() => undefined);
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room?.id, blocked, refresh, addMessage]);

  useEffect(() => {
    void refreshInvites().catch(() => undefined);
  }, [refreshInvites]);

  // Follows the conversation, unless the person is reading older messages.
  useEffect(() => {
    const box = listRef.current;
    if (box) {
      const distance = box.scrollHeight - box.scrollTop - box.clientHeight;
      if (distance > 240) return;
      box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
      return;
    }
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, queue]);

  /** Keeps the phone copy of the not-yet-sent messages in sync. */
  const saveQueue = useCallback(
    (items: OutboxItem[]) => {
      queueRef.current = items;
      setQueue(items);
      writeOutbox(code, items);
    },
    [code],
  );

  useEffect(() => {
    const stored = readOutbox(code);
    sendBlocked.current = false;
    setSendError("");
    setPendingVoice(null);
    queueRef.current = stored;
    setQueue(stored);
    setOnline(navigator.onLine);
  }, [code]);

  /** Sends everything still waiting, oldest first, and stops as soon as the line drops. */
  const flush = useCallback(async () => {
    if (flushing.current || sendBlocked.current || !navigator.onLine || queueRef.current.length === 0) return;
    flushing.current = true;
    try {
      while (queueRef.current.length > 0) {
        const item = queueRef.current[0];
        if (!item) break;
        try {
          const result = await sendMessage({
            data: { code, text: item.text, from: item.from, to: item.to },
          });
          setMessages((prev) =>
            prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message],
          );
          saveQueue(queueRef.current.filter((i) => i.id !== item.id));
          setSendError("");
        } catch (error) {
          if (typeof navigator !== "undefined" && !navigator.onLine) break;
          const failure = chatSendFailure(error);
          setSendError(failure.message);
          sendBlocked.current = !failure.retryable;
          break;
        }
      }
    } finally {
      flushing.current = false;
    }
  }, [code, saveQueue, sendMessage]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void refresh().catch(() => undefined);
      void flush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const interval = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, 15000);
    const resume = () => { if (document.visibilityState === "visible" && navigator.onLine) goOnline(); };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      window.clearInterval(interval);
    };
  }, [flush, refresh]);


  /** Every message is first saved on the phone, then sent as soon as there is a line. */
  async function send() {
    const value = text.trim();
    if (!value || pending || !room || !me) return;
    if (sendBlocked.current) { toast.error(sendError); return; }
    setText("");
    setPending(true);
    saveQueue([
      ...queueRef.current,
      { id: newOutboxId(), text: value, from, to, createdAt: Date.now() },
    ]);
    try {
      await flush();
    } finally {
      setPending(false);
    }
  }

  function addEmoji(emoji: string) {
    const field = textAreaRef.current;
    const start = field?.selectionStart ?? text.length;
    const end = field?.selectionEnd ?? start;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`.slice(0, 5000);
    const cursor = Math.min(start + emoji.length, next.length);
    setText(next);
    window.requestAnimationFrame(() => {
      textAreaRef.current?.focus();
      textAreaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  /** Sends a photo: the text already written becomes its caption and gets translated. */
  async function sendPhoto(file: File | null | undefined) {
    if (!file || sendingPhoto || !room) return;
    setSendingPhoto(true);
    const caption = text.trim();
    try {
      const { base64, mimeType } = await fileToJpegBase64(file);
      const result = await sendImage({
        data: { code, image: base64, mimeType, caption: caption || undefined, from, to },
      });
      setText("");
      setMessages((prev) =>
        prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message],
      );
      toast.success("Foto inviata.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a inviare la foto.");
    } finally {
      setSendingPhoto(false);
    }
  }

  /** Sends a PDF: the text already written becomes its caption and gets translated. */
  async function sendPdf(file: File | null | undefined) {
    if (!file || sendingPdf || !room) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Il documento è troppo grande: massimo 15 MB.");
      return;
    }
    setSendingPdf(true);
    const caption = text.trim();
    try {
      const base64 = await fileToBase64(file);
      const result = await sendPdfFn({
        data: {
          code,
          file: base64,
          fileName: file.name.slice(0, 200),
          caption: caption || undefined,
          from,
          to,
        },
      });
      setText("");
      setMessages((prev) =>
        prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message],
      );
      toast.success("Documento inviato.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a inviare il documento.");
    } finally {
      setSendingPdf(false);
    }
  }

  /** Records a voice message, then sends it with its text and traduzione. */
  async function toggleVoiceMessage() {
    if (sendingVoice || !room) return;
    if (!voice.recording && !pendingVoice) {
      try {
        await voice.start();
      } catch {
        toast.error("Non riesco ad accedere al microfono: consenti l'accesso e riprova.");
      }
      return;
    }
    const audio = pendingVoice?.audio ?? await voice.stop();
    if (!audio) {
      toast.error("Registrazione troppo breve: riprova.");
      return;
    }
    setSendingVoice(true);
    const payload = pendingVoice ?? { audio, from: voiceFrom, to: voiceTo };
    try {
      const result = await sendVoiceFn({ data: { code, ...payload } });
      setMessages((prev) =>
        prev.some((m) => m.id === result.message.id) ? prev : [...prev, result.message],
      );
      toast.success("Messaggio vocale inviato.");
      setPendingVoice(null);
    } catch (error) {
      setPendingVoice(payload);
      toast.error(chatSendFailure(error).message);
    } finally {
      setSendingVoice(false);
    }
  }


  async function applyLanguages(next: Room) {
    setRoom(next);
    try {
      await updateLanguages({
        data: { code, langA: next.lang_a, langB: next.lang_b },
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Non riesco ad aggiornare le lingue.",
      );
    }
  }

  async function setLang(which: "lang_a" | "lang_b", value: string) {
    if (!room) return;
    await applyLanguages({ ...room, [which]: value });
  }

  async function swap() {
    if (!room) return;
    await applyLanguages({ ...room, lang_a: room.lang_b, lang_b: room.lang_a });
  }

  /** Invites a registered account to this conversation by email. */
  async function invite() {
    const email = inviteEmail.trim();
    if (!email || inviting) return;
    setInviting(true);
    try {
      const result = await sendInvite({
        data: { code, email, appOrigin: window.location.origin },
      });
      setInviteEmail("");
      toast.success(
        result.emailSent
          ? `Invito inviato a ${email}.`
          : `Invito creato: ${email} lo trova su TraduChat appena entra.`,
      );
      await refreshInvites().catch(() => undefined);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a inviare l'invito.");
    } finally {
      setInviting(false);
    }
  }

  if (blocked) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl">Conversazione privata</h1>
        <p className="text-sm text-muted-foreground">{blocked}</p>
        <Button onClick={() => void navigate({ to: "/app" })}>Torna alla home</Button>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl">Conversazione non trovata</h1>
        <p className="text-sm text-muted-foreground">
          Il codice <span className="font-semibold">{code}</span> non esiste più.
        </p>
        <Button onClick={() => void navigate({ to: "/app" })}>Torna alla home</Button>
      </main>
    );
  }

  return (
    <main className="relative mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden px-2 pb-2 pt-2 sm:px-6 sm:pb-6 sm:pt-6">
      <Toaster position="top-center" />

      {room?.id && me && (room.is_group
        ? <GroupVideoCall key={room.id} roomId={room.id} roomCode={room.code} langA={from} langB={to} me={me} participants={participants} />
        : <VideoCall key={room.id} roomId={room.id} roomCode={room.code} langA={from} langB={to} me={me} participants={participants} />)}

      {room?.coverUrl && (
        <img
          src={room.coverUrl}
          alt={room.name ? `Copertina di ${room.name}` : "Copertina della community"}
          className="mb-2 h-20 w-full shrink-0 rounded-2xl border border-border object-cover sm:h-28"
        />
      )}

      <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary text-primary-foreground bubble-shadow sm:size-11">
            {room?.photoUrl ? (
              <img src={room.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <Users className="size-5" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-base sm:text-2xl">
              {room?.is_group ? (room.name || `Community ${code}`) : `Conversazione ${code}`}
            </h1>
            {room?.theme && (
              <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Tema: {room.theme}
              </span>
            )}
            <p className="hidden truncate text-sm text-muted-foreground sm:block">
              {room?.topic || "Ogni messaggio arriva tradotto sull'altro telefono."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-accent"
            aria-label="Torna alla home"
            title="Torna a Home"
            onClick={() => void navigate({ to: "/app" })}
          >
            <Home className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-accent"
            aria-label={alertsOn ? "Disattiva gli avvisi" : "Attiva gli avvisi dei messaggi"}

            title={alertsOn ? "Avvisi attivi" : "Attiva gli avvisi"}
            onClick={() => void toggleAlerts()}
          >
            {alertsOn ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-11 w-11 text-accent", showTools && "bg-accent/10")}
            aria-label="Mostra le opzioni della conversazione"
            title="Opzioni: lingue, inviti, QR, PDF"
            aria-expanded={showTools}
            onClick={() => setShowTools((v) => !v)}
          >
            <Settings2 className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-accent"
            aria-label="Mostra il QR code per invitare"
            onClick={() => setShowQr((v) => !v)}
          >
            <QrCode className="size-5" />
          </Button>
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-destructive"
                  aria-label="Cancella la conversazione"
                  title="Cancella la conversazione"
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Trash2 className="size-5" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancellare questa conversazione?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tutti i messaggi vengono eliminati per tutti i partecipanti e non si possono
                    recuperare.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void removeRoom()}>
                    Cancella
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </header>

      {!alertsOn && showTools && (
        <p className="mt-2 shrink-0 text-xs text-muted-foreground">
          {permission === "denied"
            ? "Gli avvisi sono bloccati dal browser: sbloccali nelle impostazioni del sito."
            : permission === "unsupported"
              ? "Questo browser non supporta le notifiche dei messaggi."
              : permission === "iframe"
                ? "Apri l'app in una scheda del browser e tocca la campanella per gli avvisi."
                : "Tocca la campanella in alto per essere avvisato a ogni nuovo messaggio."}
        </p>
      )}

      {participants.length > 0 && (
        <div
          className="mt-2 flex shrink-0 items-center gap-1 overflow-x-auto rounded-2xl surface-card px-2 py-1.5 sm:px-3 sm:py-2"
          aria-label="Partecipanti nella conversazione"
        >
          {participants.map((p) => {
            const online = isParticipantOnline(p);
            const show = p.showStatus !== false;
            return (
              <div
                key={p.userId}
                className="relative shrink-0"
                title={`${p.name}${p.userId === me ? " (tu)" : ""}${show ? ` — ${p.status || presenceLabel(participantSeenAt(p))}` : ""}`}
              >
                <ParticipantAvatar name={p.name} avatarUrl={p.avatarUrl} className="size-10" />
                {show && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
                      online ? "bg-green-500" : "bg-muted-foreground/40",
                    )}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setShowParticipants((v) => !v)}
            className="ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            aria-expanded={showParticipants}
          >
            <Users className="size-4" />
            {showParticipants ? "Nascondi" : `Dettagli (${participants.length})`}
          </button>
        </div>
      )}

      {showParticipants && (
      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Users className="size-4 text-accent" /> Partecipanti
          <span className="text-sm font-normal text-muted-foreground">
            ({filteredParticipants.length}/{participants.length})
          </span>
        </p>
        {participants.length > 0 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={participantSearch}
              onChange={(e) => setParticipantSearch(e.target.value)}
              placeholder="Cerca per nome, stato o numero..."
              aria-label="Cerca partecipante"
              className="h-11 pl-9"
            />
          </div>
        )}
        {participants.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Nessun partecipante ancora: invita l'altra persona.
          </p>
        ) : filteredParticipants.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessun partecipante corrisponde alla ricerca.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {filteredParticipants.map((p) => {
              const wa = p.userId === me ? null : whatsappLink(p.phone);
              const online = isParticipantOnline(p);
              const show = p.showStatus !== false;
              return (
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
                    <span className="block min-w-0 truncate text-sm font-semibold">
                      {p.name}
                      {p.userId === me && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(tu)</span>
                      )}
                    </span>
                    {show && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            online ? "bg-green-500" : "bg-muted-foreground/40",
                          )}
                          aria-hidden="true"
                        />
                        <span className="max-w-[12rem] truncate text-xs text-muted-foreground">
                          <StatusText text={p.status || presenceLabel(participantSeenAt(p))} />
                        </span>
                      </div>
                    )}
                    {p.showStatus && p.statusImageUrl && (
                      <StatusPhoto url={p.statusImageUrl} name={p.name} className="mt-1 size-12 rounded-lg border border-border/60 object-cover" />
                    )}
                  </div>
                  {wa && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Scrivi a ${p.name} su WhatsApp`}
                          title="Scrivi su WhatsApp"
                          className="inline-flex size-10 items-center justify-center rounded-full bg-accent/10 text-accent transition-colors hover:bg-accent/20"
                        >
                          <MessageCircle className="size-4" />
                        </a>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      )}

      {showTools && (
      <div className="mt-2 max-h-[28vh] shrink-0 space-y-3 overflow-y-auto overscroll-y-contain pr-0.5">
      <section className="rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Mail className="size-4 text-accent" /> Invita per email
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {room?.invite_only
            ? "Questa conversazione è privata: entra solo chi accetta l'invito."
            : "Invita una persona già registrata: la trova tra i suoi inviti, senza codice."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void invite();
            }}
            placeholder="email@esempio.it"
            aria-label="Email della persona da invitare"
            className="h-11 sm:flex-1"
          />
          <Button
            onClick={() => void invite()}
            disabled={inviting || !inviteEmail.trim()}
            className="h-11 px-5"
          >
            {inviting ? <Loader2 className="size-5 animate-spin" /> : <Mail className="size-5" />}
            Invita
          </Button>
        </div>
        {invites.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {invites.map((i) => (
              <li key={i.id}>
                {i.invitee_email} ·{" "}
                {i.status === "accepted"
                  ? "ha accettato"
                  : i.status === "declined"
                    ? "ha rifiutato"
                    : "in attesa"}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showQr && !room?.invite_only && (
        <section className="mt-4 flex flex-col items-center gap-3 rounded-3xl surface-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Fai inquadrare questo QR code con la fotocamera dell'altro telefono.
          </p>
          {qr ? (
            <img src={qr} alt={`QR code per entrare nella conversazione ${code}`} className="size-48 rounded-xl" />
          ) : (
            <Loader2 className="size-6 animate-spin" />
          )}
          <p className="font-display text-2xl tracking-[0.3em]">{code}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              onClick={() => {
                const link = `${window.location.origin}/invito/${code}`;
                const text = `Ti invito a chattare su TraduChat: scrivi nella tua lingua, io leggo nella mia. ${link}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
              }}
            >
              Invia su WhatsApp
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(`${window.location.origin}/invito/${code}`);
                toast.success("Link di invito copiato");
              }}
            >
              Copia il link
            </Button>
          </div>
        </section>
      )}

      <section className="mt-3 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Languages className="size-4 text-accent" /> Leggi tutta la chat in
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Scegli una lingua: ogni messaggio viene tradotto anche in quella lingua e puoi scaricare
          tutto in PDF.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            value={chatLang ?? "automatic"}
            onValueChange={(v) => setChatLang(v === "automatic" ? null : v)}
          >
            <SelectTrigger
              className="h-11 w-full border-0 bg-muted sm:flex-1"
              aria-label="Lingua di lettura"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="automatic">Automatica · {preferredLanguage ?? from}</SelectItem>
              {TARGET_LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            onClick={() => void exportPdf()}
            disabled={exporting || translating > 0 || messages.length === 0}
            className="h-11 px-4"
          >
            {exporting ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <FileDown className="size-5" />
            )}
            Scarica PDF
          </Button>
          <Button
            variant="outline"
            onClick={shareOnWhatsapp}
            disabled={translating > 0 || messages.length === 0}
            className="h-11 px-4"
            title="Invia la conversazione su WhatsApp"
          >
            <Share2 className="size-5" />
            Invia su WhatsApp
          </Button>
        </div>
        {translating > 0 && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Sto traducendo i messaggi…
          </p>
        )}
      </section>
      </div>
      )}

      <section
        ref={listRef}
        className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-y-contain rounded-3xl surface-card p-3 text-base sm:mt-4 sm:space-y-4 sm:p-5"
      >
        {!room ? (
          <div className="flex min-h-56 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 && queue.length === 0 ? (
          <div className="flex h-full min-h-56 flex-col items-center justify-center gap-2 text-center">
            <p className="font-display text-lg">Nessun messaggio, ancora.</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Invita l'altra persona con il QR code, poi scrivi il primo messaggio.
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <Bubble
                key={m.id}
                message={m}
                mine={m.sender_id === me}
                sender={participants.find((p) => p.userId === m.sender_id)}
                extraLang={readingLanguage}
                extraText={inChatLang(m, readingLanguage)}
                translationFailed={translationErrors[chatTranslationKey(m, readingLanguage)]}
                canDelete={m.sender_id === me || isOwner}
                canHide={m.sender_id !== me && m.file_kind !== "system"}
                deleting={deletingMessageId === m.id}
                onDelete={() => void removeMessage(m.id, Boolean(m.audio_path))}
                onHide={() => void hideMessage(m.id)}
                canEdit={m.sender_id === me && m.file_kind !== "system" && !m.image_path && !m.file_path && !m.audio_path}
                editing={editingMessageId === m.id}
                editText={editText}
                savingEdit={savingEdit}
                onEdit={() => { setEditingMessageId(m.id); setEditText(m.original); }}
                onEditText={setEditText}
                onSaveEdit={() => void saveEdit(m.id)}
                onCancelEdit={() => setEditingMessageId(null)}
              />
            ))}
            {queue.map((q) => (
              <WaitingBubble key={q.id} item={q} failed={Boolean(sendError)} />
            ))}
          </>
        )}
        <div ref={endRef} />
      </section>

      <section className="mt-2 shrink-0 rounded-3xl surface-card p-2 sm:mt-4 sm:p-4">
        {(sendError || pendingVoice) && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm" role="alert">
            <p className="min-w-0 flex-1 break-words">{sendError || "Vocale non inviato: puoi riprovare senza registrarlo di nuovo."}</p>
            {sendError && <Button variant="outline" size="sm" disabled={pending || !online} onClick={() => { sendBlocked.current = false; setSendError(""); void flush(); }}>Riprova invio</Button>}
            {sendError && queue.length > 0 && <Button variant="ghost" size="sm" onClick={() => { saveQueue(queueRef.current.slice(1)); sendBlocked.current = false; setSendError(""); void flush(); }}>Scarta messaggio</Button>}
            {pendingVoice && <><Button variant="outline" size="sm" disabled={sendingVoice || !online} onClick={() => void toggleVoiceMessage()}>Riprova vocale</Button><Button variant="ghost" size="icon" aria-label="Elimina vocale non inviato" onClick={() => setPendingVoice(null)}><X className="size-4" /></Button></>}
          </div>
        )}
        <Textarea
          ref={textAreaRef}
          value={text}
          maxLength={5000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder={`Scrivi in ${from}…`}
          className="max-h-28 min-h-11 resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
        />
        <div className="mt-1.5 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
          <p className="order-2 truncate text-xs text-muted-foreground sm:order-1">
            {!online || queue.length > 0 ? (
              <span className="flex items-center gap-1.5">
                <CloudOff className="size-3.5" />
                {online
                  ? sendError ? `${queue.length} non inviati` : `${queue.length} in invio…`
                  : "Senza connessione: i messaggi partono da soli."}
              </span>
             ) : (
               <>
                 {from} → {to}
                 {text.length > 0 && (
                   <span className="ml-2 tabular-nums">{text.length}/5000</span>
                 )}
               </>
             )}
          </p>
          <div className="order-1 flex flex-wrap items-center justify-between gap-1 sm:order-2 sm:justify-end sm:gap-2">
            <EmojiPicker onSelect={addEmoji} disabled={!room} />
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void sendPhoto(file);
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
                void sendPhoto(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              aria-label="Scatta e invia una foto"
              title="Scatta e invia una foto"
              disabled={sendingPhoto || !room}
              onClick={() => cameraInput.current?.click()}
              className="h-12 w-12 p-0 text-base sm:w-auto sm:px-4"
            >
              {sendingPhoto ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Camera className="size-5" />
              )}
              <span className="hidden sm:inline">Scatta</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              aria-label="Invia una foto"
              title="Invia una foto"
              disabled={sendingPhoto || !room}
              onClick={() => photoInput.current?.click()}
              className="h-12 w-12 p-0 text-base sm:w-auto sm:px-4"
            >
              {sendingPhoto ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <ImagePlus className="size-5" />
              )}
              <span className="hidden sm:inline">Foto</span>
            </Button>
            <input
              ref={pdfInput}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void sendPdf(file);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              aria-label="Invia un documento PDF"
              title="Invia un documento PDF"
              disabled={sendingPdf || !room}
              onClick={() => pdfInput.current?.click()}
              className="h-12 w-12 p-0 text-base sm:w-auto sm:px-4"
            >
              {sendingPdf ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <FileText className="size-5" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>
            {room?.is_group && (
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Parlo in
                <select
                  aria-label="Lingua parlata nei messaggi vocali"
                  className="h-12 rounded-md border border-input bg-background px-2 text-sm text-foreground"
                  value={voiceFrom}
                  onChange={(event) => setVoiceLang(event.target.value)}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </label>
            )}
            <Button
              type="button"
              variant={voice.recording ? "destructive" : "default"}
              aria-label={
                voice.recording ? "Ferma e invia il messaggio vocale" : "Registra un messaggio vocale"
              }
              title={voice.recording ? "Ferma e invia il vocale" : "Messaggio vocale"}
              disabled={sendingVoice || !room}
              onClick={() => void toggleVoiceMessage()}
              className="h-12 w-12 p-0 text-base sm:w-auto sm:px-4"
            >
              {sendingVoice ? (
                <Loader2 className="size-5 animate-spin" />
              ) : voice.recording ? (
                <Square className="size-5" />
              ) : (
                <Mic className="size-5" />
              )}
              <span className="hidden sm:inline">
                {sendingVoice ? "Invio…" : voice.recording ? "Ferma" : "Vocale"}
              </span>
            </Button>
            {voice.recording && !sendingVoice && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Annulla la registrazione senza inviare"
                title="Annulla la registrazione"
                onClick={() => { voice.cancel(); toast.info("Registrazione annullata."); }}
                className="h-12 w-12 p-0"
              >
                <X className="size-5" />
              </Button>
            )}


            <MicButton
              language={voiceFrom}
              label="Parla"
              className="h-12 px-3 text-base sm:px-4"
              onText={(spoken) =>
                setText((prev) => (prev.trim() ? `${prev} ${spoken}` : spoken))
              }
            />
            <Button
              onClick={() => void send()}
              disabled={pending || !text.trim() || !room}
              className="h-12 w-12 p-0 text-base sm:w-auto sm:px-5"
            >
              {pending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Send className="size-5" />
              )}
              <span className="hidden sm:inline">Invia</span>
            </Button>
          </div>
        </div>
      </section>

      {showTools && (
        <p className="mt-2 shrink-0 text-center text-sm">
          <Link to="/app" className="text-accent underline-offset-4 hover:underline">
            Torna alla chat su un solo telefono
          </Link>
        </p>
      )}
    </main>
  );
}

/** A message saved on the phone that is still waiting for the line. */
function WaitingBubble({ item, failed }: { item: OutboxItem; failed: boolean }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl border border-dashed border-primary/50 bg-primary/10 px-3 py-2.5 text-foreground sm:max-w-[85%] sm:px-4 sm:py-3">
        <p className="text-xs uppercase tracking-wide opacity-70">{item.from}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.text}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CloudOff className="size-3.5" /> {failed ? "Non inviato" : "In attesa di invio"}
        </p>
      </div>
    </div>
  );
}

function LangSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full flex-1 border-0 bg-muted">
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

/** Shares a voice clip via the system share sheet, falling back to a download. */
async function shareAudio(url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const file = new File([blob], "vocale-traduchat.wav", { type: blob.type || "audio/wav" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "Vocale TraduChat" });
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = "vocale-traduchat.wav";
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    toast.error("Non riesco a condividere il vocale, riprova.");
  }
}

function Bubble({
  message,
  mine,
  sender,
  extraLang,
  extraText,
  translationFailed,
  canDelete,
  deleting,
  onDelete,
  canHide,
  onHide,
  canEdit,
  editing,
  editText,
  savingEdit,
  onEdit,
  onEditText,
  onSaveEdit,
  onCancelEdit,
}: {
  message: RoomMessage;
  mine: boolean;
  sender?: Participant | undefined;
  extraLang?: string | null;
  extraText?: string | null;
  translationFailed?: boolean | undefined;
  canDelete?: boolean;
  deleting?: boolean;
  onDelete?: () => void;
  canHide?: boolean;
  onHide?: () => void;
  canEdit?: boolean;
  editing?: boolean;
  editText?: string;
  savingEdit?: boolean;
  onEdit?: () => void;
  onEditText?: (value: string) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
}) {
  const name = sender?.name ?? "Partecipante";
  const displayLanguage = extraLang ?? message.to_lang;
  const displayText = extraText ?? (message.from_lang === displayLanguage ? message.original : message.to_lang === displayLanguage ? message.translation : null);
  // System notices (es. un nuovo partecipante) are centered pills, not bubbles.
  if (message.file_kind === "system") {
    return (
      <div className="flex justify-center py-1">
        <p className="rounded-full bg-muted px-4 py-1.5 text-center text-xs font-medium text-muted-foreground">
          {message.original}
        </p>
      </div>
    );
  }
  return (
    <div className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && <ParticipantAvatar name={name} avatarUrl={sender?.avatarUrl} className="size-8 shrink-0" />}
      <div
        className={cn(
          "min-w-0 max-w-[80%] rounded-2xl px-3 py-2.5 bubble-shadow sm:max-w-[85%] sm:px-4 sm:py-3",
          mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-xs font-semibold">{mine ? "Tu" : name}</p>
          {canEdit && (
            <Button type="button" variant="ghost" size="sm" aria-label="Modifica questo messaggio" title="Modifica messaggio" disabled={savingEdit} onClick={onEdit} className="min-h-11 shrink-0 px-2 text-inherit hover:text-foreground">
              <Pencil className="size-4" /> <span className="text-xs">Modifica</span>
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
               variant="ghost"
               size="icon"
               aria-label={message.audio_path ? "Cancella questo vocale tradotto" : "Cancella questo messaggio"}
               title={message.audio_path ? "Cancella vocale" : "Cancella messaggio"}
              disabled={deleting}
              onClick={onDelete}
               className="size-11 shrink-0 text-inherit hover:text-foreground"
            >
              {deleting ? (
                 <Loader2 className="size-4 animate-spin" />
              ) : (
                 <Trash2 className="size-4" />
              )}
             </Button>
          )}
          {canHide && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Cancella questo messaggio solo per te"
              title="Cancella per te"
              disabled={deleting}
              onClick={onHide}
              className="size-11 shrink-0 text-inherit hover:text-foreground"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          )}
        </div>
        {message.imageUrl && (
          <ConversationPhoto src={message.imageUrl} alt={`Foto inviata da ${mine ? "te" : name}`} />
        )}
        {message.fileUrl && (
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm underline-offset-4 hover:underline",
              mine ? "border-primary-foreground/30" : "border-border",
            )}
          >
            <FileText className="size-4 shrink-0" />
            <span className="truncate">{message.file_name ?? "Documento PDF"}</span>
          </a>
        )}
        {message.audioUrl && (
          <div className="mt-2 space-y-1.5">
            <AudioPlayer src={message.audioUrl} className="mt-0" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Condividi questo vocale"
              title="Condividi vocale"
              onClick={() => { if (message.audioUrl) void shareAudio(message.audioUrl); }}
              className="min-h-11 px-2 text-inherit hover:text-foreground"
            >
              <Share2 className="size-4" /> <span className="text-xs">Condividi</span>
            </Button>
          </div>
        )}
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide opacity-70">{displayLanguage}</p>
          {displayText && <Button type="button" variant="ghost" size="icon" aria-label={`Ascolta il messaggio in ${displayLanguage}`} title={`Ascolta in ${displayLanguage}`} onClick={() => { if (!speak(displayText, displayLanguage)) toast.error("Questo browser non legge i testi."); }} className="size-9 text-inherit"><Volume2 className="size-4" /></Button>}
        </div>
         {editing ? (
           <div className="mt-2 space-y-2">
             <Textarea aria-label="Modifica messaggio" value={editText} maxLength={5000} onChange={(e) => onEditText?.(e.target.value)} disabled={savingEdit} className="min-h-24 bg-background text-foreground" />
             <div className="flex flex-wrap justify-end gap-2">
               <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={savingEdit}>Annulla</Button>
               <Button type="button" onClick={onSaveEdit} disabled={savingEdit || !editText?.trim() || editText.trim() === message.original}>
                 {savingEdit && <Loader2 className="size-4 animate-spin" />} Salva
               </Button>
             </div>
           </div>
         ) : (
           <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium" translate="no">{displayText ?? (translationFailed ? "Traduzione non disponibile." : "Traduzione in corso…")}</p>
         )}
        {displayLanguage !== message.from_lang && (
        <details
          className={cn(
            "mt-3 border-t pt-2",
            mine ? "border-primary-foreground/25" : "border-border",
          )}
        >
          <summary className="cursor-pointer text-xs opacity-70">Originale · {message.from_lang}</summary>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm" translate="no">
            {message.original}
          </p>
        </details>
        )}
          {message.audioUrl && displayText && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2 min-h-11 rounded-full"
              onClick={() => {
                if (!speak(displayText, displayLanguage))
                  toast.error("Questo browser non legge i testi.");
              }}
            >
              <Volume2 className="size-4" /> Ascolta in {displayLanguage}
            </Button>
          )}
      </div>
      {mine && <ParticipantAvatar name={name} avatarUrl={sender?.avatarUrl} className="size-8 shrink-0" />}
    </div>
  );
}
