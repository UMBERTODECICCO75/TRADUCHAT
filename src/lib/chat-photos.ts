import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "@/lib/chat-messages";
import { compressPhoto } from "@/lib/compress-photo";

export const CHAT_PHOTO_MAX = 25 * 1024 * 1024;
const BUCKET = "chat-photos";

export function chatPhotoError(f: { size: number; type: string }) {
  if (!f.type.startsWith("image/")) return "Seleziona un'immagine";
  if (f.size > CHAT_PHOTO_MAX) return "Foto troppo grande (max 25 MB)";
  return "";
}

const hhmm = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

/** Uploads the photo and records it in the conversation; `recipientId` is the other participant's account, when known. */
export async function sendChatPhoto(file: File, chatKey: string, recipientId: string | null = null): Promise<Msg> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Accedi per inviare foto");
  const invalid = chatPhotoError(file);
  if (invalid) throw new Error(invalid);
  file = await compressPhoto(file, "chat");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${u.user.id}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (up.error) throw new Error("Caricamento non riuscito");
  const ins = await supabase.from("chat_photos").insert({ sender_id: u.user.id, recipient_id: recipientId, chat_key: chatKey, path });
  if (ins.error) throw new Error("Invio non riuscito");
  if (recipientId) {
    const { notifyContact } = await import("@/lib/push.functions");
    void notifyContact({ data: { recipientId, title: "{name}", body: "Ti ha inviato una foto" } }).catch(() => {});
  }
  const { data: s } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24);
  return { me: true, text: "", image: s?.signedUrl ?? URL.createObjectURL(file), photoPath: path, time: hhmm(new Date()) };
}

/** Photos sent or received in this conversation, oldest first. */
export async function loadChatPhotos(chatKey: string): Promise<Msg[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("chat_photos").select("path, sender_id, created_at")
    .eq("chat_key", chatKey).order("created_at");
  if (!data?.length) return [];
  const { data: urls } = await supabase.storage.from(BUCKET).createSignedUrls(data.map((r) => r.path), 60 * 60 * 24);
  return data.map((r, i) => ({
    me: r.sender_id === u.user!.id, text: "", image: urls?.[i]?.signedUrl ?? "", photoPath: r.path, time: hhmm(new Date(r.created_at)),
  })).filter((m) => m.image);
}

/** Removes a photo I sent from storage and from the conversation. */
export async function deleteChatPhoto(path: string) {
  await supabase.from("chat_photos").delete().eq("path", path);
  await supabase.storage.from(BUCKET).remove([path]);
}
