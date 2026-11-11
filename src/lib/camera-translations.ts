import { supabase } from "@/integrations/supabase/client";
import { cameraDelivery, type CameraTranslation } from "@/lib/camera-rules";
import type { Msg } from "@/lib/chat-messages";

export async function sendCameraTranslation(recipientId: string, result: CameraTranslation, language: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Accedi per inviare la traduzione");
  const { error } = await supabase.from("camera_translations").insert(cameraDelivery(recipientId, auth.user.id, result, language));
  if (error) throw new Error("Invio non riuscito. La traduzione è ancora disponibile.");
  const { notifyContact } = await import("@/lib/push.functions");
  void notifyContact({ data: { recipientId, title: "{name}", body: "Ti ha inviato una traduzione con la fotocamera" } }).catch(() => {});
}

export async function loadCameraTranslations(userId: string, recipientId: string): Promise<Msg[]> {
  const { data, error } = await supabase.from("camera_translations").select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${userId})`).order("created_at");
  if (error) throw new Error("Impossibile caricare le traduzioni delle foto");
  return (data ?? []).map(row => ({ cameraId: row.id, me: row.sender_id === userId, text: row.translated_text, tr: row.original_text, trLang: "Originale", time: new Date(row.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) }));
}

export async function cameraConversations(userId: string) {
  const { data, error } = await supabase.from("camera_translations").select("sender_id, recipient_id, sender_name, recipient_name, translated_text").order("created_at", { ascending: false });
  if (error) throw new Error("Impossibile caricare le traduzioni ricevute");
  const contacts = new Map<string, { id: string; name: string; preview: string }>();
  for (const row of data ?? []) {
    const mine = row.sender_id === userId;
    const id = mine ? row.recipient_id : row.sender_id;
    if (!contacts.has(id)) contacts.set(id, { id, name: (mine ? row.recipient_name : row.sender_name) || "Contatto", preview: row.translated_text });
  }
  return [...contacts.values()];
}