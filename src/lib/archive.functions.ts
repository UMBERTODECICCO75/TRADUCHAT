import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PAGE_SIZE = 30;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const archiveInput = z.object({ source: z.enum(["personal", "chat"]), offset: z.number().int().min(0).max(10000) });

function fileLabel(name: string) {
  const marker = name.indexOf("--");
  if (marker < 0) return name;
  try {
    return decodeURIComponent(name.slice(marker + 2));
  } catch {
    return name;
  }
}

export const listArchive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => archiveInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.source === "personal") {
      const bucket = context.supabase.storage.from("email-attachments");
      const { data: files, error } = await bucket.list(context.userId, {
        limit: PAGE_SIZE + 1,
        offset: data.offset,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw new Error("Non riesco a leggere i tuoi file.");
      const page = (files ?? []).slice(0, PAGE_SIZE);
      const paths = page.map((file) => `${context.userId}/${file.name}`);
      const { data: signed, error: signError } = paths.length
        ? await bucket.createSignedUrls(paths, 60 * 60)
        : { data: [], error: null };
      if (signError) throw new Error("Non riesco ad aprire i tuoi file.");
      return {
        items: page.map((file, i) => ({
          id: paths[i] ?? file.name,
          name: fileLabel(file.name),
          type: /\.(jpe?g|png|gif|webp|heic)$/i.test(file.name) ? "photo" : "file",
          date: file.created_at ?? "",
          url: signed?.[i]?.signedUrl ?? null,
          roomCode: null as string | null,
        })),
        hasMore: (files?.length ?? 0) > PAGE_SIZE,
      };
    }

    // Memberships are server-only; restrict the privileged read to verified rooms.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from("room_members")
      .select("room_id, rooms(code)")
      .eq("user_id", context.userId);
    if (membershipError) throw new Error("Non riesco a leggere le tue conversazioni.");
    const roomIds = (memberships ?? []).map((entry) => entry.room_id);
    if (!roomIds.length) return { items: [] as { id: string; name: string; type: string; date: string; url: string | null; roomCode: string | null }[], hasMore: false };
    const codes = new Map((memberships ?? []).map((entry) => [entry.room_id, entry.rooms?.code ?? null]));
    // Offset counts visible attachments, not messages hidden by this user.
    // Scan in batches so deleting an item cannot make the next page skip a file.
    type ChatAttachment = { id: string; room_id: string; created_at: string; image_path: string | null; file_path: string | null; file_name: string | null };
    const visible: ChatAttachment[] = [];
    let cursor = 0;
    let exhausted = false;
    while (visible.length <= data.offset + PAGE_SIZE && !exhausted) {
      const { data: batch, error } = await supabaseAdmin
        .from("room_messages")
        .select("id, room_id, created_at, image_path, file_path, file_name")
        .in("room_id", roomIds)
        .or("image_path.not.is.null,file_path.not.is.null")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(cursor, cursor + 99);
      if (error) throw new Error("Non riesco a leggere gli allegati delle conversazioni.");
      const rows = batch ?? [];
      exhausted = rows.length < 100;
      cursor += rows.length;
      if (!rows.length) break;
      const { data: hidden, error: hiddenError } = await context.supabase
        .from("archive_hidden_items")
        .select("message_id")
        .in("message_id", rows.map((row) => row.id));
      if (hiddenError) throw new Error("Non riesco a leggere lo storico personale.");
      const hiddenIds = new Set((hidden ?? []).map((entry) => entry.message_id));
      visible.push(...rows.filter((row) => !hiddenIds.has(row.id)));
    }
    const page = visible.slice(data.offset, data.offset + PAGE_SIZE);
    const { signChatFilePaths } = await import("./chat-files.server");
    const { signChatImagePaths } = await import("./chat-images.server");
    const [files, photos] = await Promise.all([
      signChatFilePaths(page.map((m) => m.file_path).filter((p): p is string => Boolean(p))),
      signChatImagePaths(page.map((m) => m.image_path).filter((p): p is string => Boolean(p))),
    ]);
    return {
      items: page.map((message) => ({
        id: message.id,
        name: message.file_name ?? (message.image_path ? "Foto" : "Documento PDF"),
        type: message.image_path ? "photo" : "file",
        date: message.created_at,
        url: message.image_path ? (photos[message.image_path] ?? null) : (message.file_path ? files[message.file_path] ?? null : null),
        roomCode: codes.get(message.room_id) ?? null,
      })),
      hasMore: visible.length > data.offset + PAGE_SIZE,
    };
  });

export const saveArchiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(1).max(200), base64: z.string().min(1).max(21_000_000), mimeType: z.string().max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const name = data.name.replace(/[\\/\x00-\x1f]/g, "_").trim();
    if (!name) throw new Error("Nome del file non valido.");
    const { assertAllowedMime } = await import("./email-attachments.server");
    const contentType = assertAllowedMime(data.mimeType || "");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_FILE_BYTES) throw new Error("Il file supera i 15 MB consentiti.");
    const path = `${context.userId}/${Date.now()}-${crypto.randomUUID()}--${encodeURIComponent(name)}`;
    const { error } = await context.supabase.storage.from("email-attachments").upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (error) throw new Error("Non riesco a conservare il file, riprova.");
    return { ok: true };
  });

export const deleteArchiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes("..") || data.path.slice(context.userId.length + 1).includes("/") || !data.path.split("/").at(-1)?.includes("--")) {
      throw new Error("File non autorizzato.");
    }
    const { error } = await context.supabase.storage.from("email-attachments").remove([data.path]);
    if (error) throw new Error("Non riesco a eliminare il file.");
    return { ok: true };
  });

/** Hide an attachment from this user's archive without deleting the shared chat message or file. */
export const hideChatArchiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messageId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: message, error: messageError } = await context.supabase
      .from("room_messages")
      .select("id, image_path, file_path")
      .eq("id", data.messageId)
      .maybeSingle();
    if (messageError || !message || (!message.image_path && !message.file_path)) throw new Error("Allegato non disponibile.");
    const { error } = await context.supabase.from("archive_hidden_items").insert({
      user_id: context.userId,
      message_id: message.id,
    });
    if (error && error.code !== "23505") throw new Error("Non riesco a rimuovere il file dallo storico.");
    return { ok: true };
  });

/** Creates a 7-day link for a personal archive file so it can be sent by email. */
export const emailArchiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes("..") || data.path.slice(context.userId.length + 1).includes("/") || !data.path.split("/").at(-1)?.includes("--")) {
      throw new Error("File non autorizzato.");
    }
    const { data: signed, error } = await context.supabase.storage
      .from("email-attachments")
      .createSignedUrl(data.path, 60 * 60 * 24 * 7);
    if (error || !signed?.signedUrl) throw new Error("Non riesco a preparare il file per l'email.");
    return { url: signed.signedUrl, name: fileLabel(data.path.split("/").at(-1) ?? "File") };
  });

/** Sends a personal archive file straight into one of the user's conversations. */
export const sendArchiveFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(1).max(500), code: z.string().trim().min(4).max(24) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes("..") || data.path.slice(context.userId.length + 1).includes("/") || !data.path.split("/").at(-1)?.includes("--")) {
      throw new Error("File non autorizzato.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room, error: roomError } = await supabaseAdmin
      .from("rooms")
      .select("id, code, lang_a, lang_b")
      .eq("code", data.code)
      .maybeSingle();
    if (roomError || !room) throw new Error("Conversazione non trovata.");
    const { data: membership } = await supabaseAdmin
      .from("room_members")
      .select("user_id")
      .eq("room_id", room.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership) throw new Error("Non fai parte di questa conversazione.");

    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("email-attachments")
      .download(data.path);
    if (downloadError || !blob) throw new Error("Non riesco ad aprire il file.");
    if (blob.size > MAX_FILE_BYTES) throw new Error("Il file supera i 15 MB consentiti.");

    const name = fileLabel(data.path.split("/").at(-1) ?? "File");
    const isPhoto = /\.(jpe?g|png)$/i.test(name) && (blob.type === "image/jpeg" || blob.type === "image/png" || !blob.type);
    const mimeType = isPhoto ? (/\.png$/i.test(name) ? "image/png" : "image/jpeg") : (blob.type || "application/octet-stream");
    const buffer = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const base64 = btoa(binary);

    let imagePath: string | null = null;
    let filePath: string | null = null;
    if (isPhoto) {
      const { uploadChatImage } = await import("./chat-images.server");
      imagePath = await uploadChatImage({ roomId: room.id, userId: context.userId, base64, mimeType });
    } else {
      const { uploadChatFile } = await import("./chat-files.server");
      const ext = (name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
      filePath = await uploadChatFile({ roomId: room.id, userId: context.userId, base64, mimeType, extension: ext });
    }

    const label = isPhoto ? "📷 Foto" : `📄 ${name}`;
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("room_messages")
      .insert({
        room_id: room.id,
        sender_id: context.userId,
        user_id: context.userId,
        original: label,
        translation: label,
        from_lang: room.lang_a,
        to_lang: room.lang_b,
        image_path: imagePath,
        file_path: filePath,
        file_name: isPhoto ? null : name,
        file_kind: isPhoto ? null : "pdf",
      })
      .select("id")
      .single();
    if (insertError || !inserted) throw new Error("File non inviato, riprova.");

    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, nickname, email")
      .eq("id", context.userId)
      .maybeSingle();
    const { fallbackName } = await import("./avatars.server");
    const { notifyAwayMembers } = await import("./message-email.server");
    await notifyAwayMembers({
      roomId: room.id,
      roomCode: room.code,
      senderId: context.userId,
      senderName: fallbackName(senderProfile?.nickname ?? senderProfile?.display_name ?? null, senderProfile?.email ?? null),
      messageId: inserted.id,
      original: label,
      translation: label,
    });
    return { ok: true };
  });

/** Preserve a copy of a conversation attachment even if the original message is later removed. */
export const preserveChatFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messageId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: message, error: messageError } = await supabaseAdmin
      .from("room_messages")
      .select("room_id, image_path, file_path, file_name")
      .eq("id", data.messageId)
      .maybeSingle();
    if (messageError || !message) throw new Error("Allegato non trovato.");
    const { data: membership, error: memberError } = await supabaseAdmin
      .from("room_members")
      .select("room_id")
      .eq("room_id", message.room_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (memberError || !membership) throw new Error("Non hai accesso a questa conversazione.");
    const image = Boolean(message.image_path);
    const original = image ? message.image_path : message.file_path;
    if (!original) throw new Error("Questo messaggio non contiene un file.");
    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from(image ? "chat-images" : "chat-files")
      .download(original);
    if (downloadError || !blob) throw new Error("Non riesco ad aprire l'allegato.");
    if (blob.size > MAX_FILE_BYTES) throw new Error("Il file supera i 15 MB consentiti.");
    const name = (message.file_name ?? (image ? "Foto.jpg" : "Documento.pdf"))
      .replace(/[\\/\x00-\x1f]/g, "_").slice(0, 200);
    const path = `${context.userId}/${Date.now()}-${crypto.randomUUID()}--${encodeURIComponent(name)}`;
    const { error: uploadError } = await context.supabase.storage.from("email-attachments").upload(path, blob, {
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) throw new Error("Non riesco a conservare l'allegato.");
    return { ok: true };
  });