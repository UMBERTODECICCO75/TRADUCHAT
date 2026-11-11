import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "@/lib/chat-messages";

const hhmm = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

export type ChatMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  chat_key: string;
  body: string;
  original: string | null;
  target_lang: string | null;
  created_at: string;
  audio_path?: string | null;
};

/** Builds the row to store for a text message I send; `recipientId` is the other participant's account, when known. */
export function chatMessageInsert(senderId: string, chatKey: string, body: string, recipientId: string | null, original?: string, targetLang?: string) {
  const text = body.trim();
  if (!text) throw new Error("Messaggio vuoto");
  if (text.length > 2000) throw new Error("Messaggio troppo lungo");
  return {
    sender_id: senderId,
    recipient_id: recipientId,
    chat_key: chatKey,
    body: text,
    original: original?.trim() || null,
    target_lang: targetLang || null,
  };
}

/** Maps a stored row to a chat bubble; the original wording stays visible beside the translation. */
export function chatMessageToMsg(row: ChatMessageRow, myId: string): Msg {
  const me = row.sender_id === myId;
  return {
    msgId: row.id,
    audioPath: row.audio_path ?? undefined,
    me,
    text: row.body,
    tr: row.original ?? undefined,
    trLang: row.target_lang ?? undefined,
    time: hhmm(new Date(row.created_at)),
  };
}

/** Sends a text message to the conversation and notifies the recipient. */
export async function sendChatMessage(body: string, chatKey: string, recipientId: string | null, original?: string, targetLang?: string): Promise<Msg> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Accedi per inviare messaggi");
  const ins = await supabase.from("chat_messages").insert(chatMessageInsert(u.user.id, chatKey, body, recipientId, original, targetLang)).select("id").single();
  if (ins.error) throw new Error("Invio non riuscito");
  if (recipientId) {
    const { notifyContact } = await import("@/lib/push.functions");
    void notifyContact({ data: { recipientId, title: "{name}", body: body.trim().slice(0, 200) } }).catch(() => {});
  }
  return { msgId: ins.data.id, me: true, text: body.trim(), tr: original?.trim() || undefined, trLang: targetLang || undefined, time: hhmm(new Date()) };
}

/** Text messages sent or received in this conversation, oldest first.
 * Matches both directions: each participant saves the chat under the other person's name. */
export async function loadChatMessages(chatKey: string, peerId?: string | null): Promise<Msg[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const myId = u.user.id;
  let q = supabase.from("chat_messages").select("*").order("created_at");
  q = peerId
    ? q.or(`chat_key.eq.${chatKey},and(sender_id.eq.${peerId},recipient_id.eq.${myId}),and(sender_id.eq.${myId},recipient_id.eq.${peerId})`)
    : q.eq("chat_key", chatKey);
  const { data, error } = await q;
  if (error) throw new Error("Caricamento messaggi non riuscito");
  return Promise.all((data ?? []).map(async (r) => {
    const message = chatMessageToMsg(r as ChatMessageRow, myId);
    if (r.audio_path) message.audioUrl = await voiceUrl(r.audio_path);
    return message;
  }));
}

export type Conversation = { peerId: string; name: string; preview: string; time: string; unread: boolean };

/** Groups stored messages into one row per real contact, newest first. */
export function groupConversations(rows: ChatMessageRow[], myId: string, names: Record<string, string>): Conversation[] {
  const seen = new Map<string, Conversation>();
  for (const r of [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const peerId = r.sender_id === myId ? r.recipient_id : r.sender_id;
    if (!peerId || seen.has(peerId)) continue;
    const name = names[peerId] ?? (r.sender_id === myId ? r.chat_key : "Contatto");
    const d = new Date(r.created_at);
    const time = d.toDateString() === new Date().toDateString() ? hhmm(d) : d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    seen.set(peerId, { peerId, name, preview: r.sender_id === myId ? r.original ?? r.body : r.body, time, unread: r.sender_id !== myId });
  }
  return [...seen.values()];
}

/** Real conversations of the signed-in user. */
export async function loadConversations(myId: string, names: Record<string, string>): Promise<Conversation[]> {
  const { data } = await supabase.from("chat_messages").select("*").or(`sender_id.eq.${myId},recipient_id.eq.${myId}`).order("created_at", { ascending: false }).limit(300);
  return groupConversations((data ?? []) as ChatMessageRow[], myId, names);
}

/** Removes a message I sent from the conversation. */
export async function deleteChatMessage(id: string, audioPath?: string) {
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) throw new Error("Cancellazione non riuscita");
  if (audioPath) {
    await supabase.storage.from("chat-audio").remove([audioPath]);
    voiceUrls.delete(audioPath);
  }
}

const voiceUrls = new Map<string, { url: string; expires: number }>();
async function voiceUrl(path: string): Promise<string> {
  const cached = voiceUrls.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from("chat-audio").createSignedUrl(path, 3600);
  if (error) throw new Error("Audio non disponibile, riprova");
  voiceUrls.set(path, { url: data.signedUrl, expires: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export function translatedVoiceInsert(senderId: string, recipientId: string, chatKey: string, translation: string, original: string, target: string, path: string) {
  if (!recipientId || recipientId === senderId) throw new Error("Scegli un contatto per inviare il vocale");
  if (!path.startsWith(`${senderId}/`)) throw new Error("Audio non valido");
  if (!original.trim()) throw new Error("Registrazione vuota");
  return { ...chatMessageInsert(senderId, chatKey, translation, recipientId, original, target), audio_path: path };
}

export async function sendTranslatedVoice(audio: string, translation: string, original: string, target: string, chatKey: string, recipientId: string): Promise<Msg> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Accedi per inviare vocali");
  const path = `${u.user.id}/${crypto.randomUUID()}.wav`;
  const row = translatedVoiceInsert(u.user.id, recipientId, chatKey, translation, original, target, path);
  const bytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
  const { error: uploadError } = await supabase.storage.from("chat-audio").upload(path, new Blob([bytes], { type: "audio/wav" }), { contentType: "audio/wav" });
  if (uploadError) throw new Error("Caricamento vocale non riuscito");
  const { data, error } = await supabase.from("chat_messages").insert(row).select("*").single();
  if (error) {
    await supabase.storage.from("chat-audio").remove([path]);
    throw new Error("Invio vocale non riuscito");
  }
  const message = chatMessageToMsg(data, u.user.id);
  message.audioUrl = await voiceUrl(path);
  const { notifyContact } = await import("@/lib/push.functions");
  void notifyContact({ data: { recipientId, title: "{name}", body: "Ti ha inviato un vocale tradotto" } }).catch(() => {});
  return message;
}
