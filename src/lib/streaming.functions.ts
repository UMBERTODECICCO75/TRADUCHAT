import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Code = z
  .string()
  .trim()
  .toUpperCase()
  .min(4)
  .max(16)
  .regex(/^[A-Z0-9]+$/, "Codice non valido.");

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function communityByCode(code: string) {
  const db = await admin();
  const { data, error } = await db
    .from("rooms")
    .select("id, code, name, owner_id")
    .eq("code", code)
    .eq("is_group", true)
    .eq("invite_only", false)
    .maybeSingle();
  if (error) throw new Error("Non riesco a leggere la community.");
  return data;
}

async function isMember(roomId: string, userId: string) {
  const db = await admin();
  const { data } = await db
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export type LiveStreamInfo = {
  streamId: string;
  startedAt: string;
  mine: boolean;
};

/** Owner starts a live video stream for the community. */
export const startCommunityStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const community = await communityByCode(data.code);
    if (!community) throw new Error("Community non trovata.");
    if (community.owner_id !== context.userId)
      throw new Error("Solo chi ha creato la community può avviare una diretta.");
    const db = await admin();
    await db
      .from("community_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("room_id", community.id)
      .eq("status", "live");
    const { data: stream, error } = await db
      .from("community_streams")
      .insert({ room_id: community.id, owner_id: context.userId })
      .select("id, started_at")
      .single();
    if (error || !stream) throw new Error("Non riesco ad avviare la diretta.");
    return { streamId: stream.id as string };
  });

/** Owner ends the live stream. */
export const endCommunityStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db
      .from("community_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.streamId)
      .eq("owner_id", context.userId);
    if (error) throw new Error("Non riesco a chiudere la diretta.");
    return { ok: true };
  });

/** Owner publishes one recorded segment (a complete webm clip, base64). */
export const publishStreamSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        streamId: z.string().uuid(),
        seq: z.number().int().min(0).max(100000),
        videoBase64: z.string().max(14_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: stream } = await db
      .from("community_streams")
      .select("id, owner_id, status")
      .eq("id", data.streamId)
      .maybeSingle();
    if (!stream || stream.owner_id !== context.userId)
      throw new Error("Diretta non trovata.");
    if (stream.status !== "live") throw new Error("La diretta è terminata.");
    const bytes = Uint8Array.from(atob(data.videoBase64), (c) => c.charCodeAt(0));
    if (bytes.length > 9_000_000) throw new Error("Segmento troppo grande.");
    const path = `${data.streamId}/${data.seq}.webm`;
    const { error: upErr } = await db.storage
      .from("community-streams")
      .upload(path, bytes, { contentType: "video/webm", upsert: true });
    if (upErr) throw new Error("Non riesco a caricare il video.");
    const { error } = await db
      .from("stream_segments")
      .upsert(
        { stream_id: data.streamId, seq: data.seq, path },
        { onConflict: "stream_id,seq" },
      );
    if (error) throw new Error("Non riesco a pubblicare il segmento.");
    return { ok: true };
  });

/** Any member: is there a live stream in this community right now? */
export const getLiveStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ code: Code }).parse(input))
  .handler(async ({ data, context }) => {
    const community = await communityByCode(data.code);
    if (!community) throw new Error("Community non trovata.");
    if (!(await isMember(community.id, context.userId)))
      throw new Error("Devi entrare nella community per vedere la diretta.");
    const db = await admin();
    const { data: stream } = await db
      .from("community_streams")
      .select("id, started_at, owner_id")
      .eq("room_id", community.id)
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!stream) return { live: null as LiveStreamInfo | null };
    return {
      live: {
        streamId: stream.id,
        startedAt: stream.started_at,
        mine: stream.owner_id === context.userId,
      } satisfies LiveStreamInfo,
    };
  });

/** Members poll new segments; each comes back as a short-lived signed URL. */
export const listStreamSegments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ streamId: z.string().uuid(), afterSeq: z.number().int().min(-1).max(100000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: stream } = await db
      .from("community_streams")
      .select("id, room_id, status")
      .eq("id", data.streamId)
      .maybeSingle();
    if (!stream) throw new Error("Diretta non trovata.");
    if (!(await isMember(stream.room_id, context.userId)))
      throw new Error("Devi entrare nella community per vedere la diretta.");
    const { data: segments, error } = await db
      .from("stream_segments")
      .select("seq, path")
      .eq("stream_id", data.streamId)
      .gt("seq", data.afterSeq)
      .order("seq", { ascending: true })
      .limit(10);
    if (error) throw new Error("Non riesco a caricare la diretta.");
    const out: { seq: number; url: string }[] = [];
    for (const seg of segments ?? []) {
      const { data: signed } = await db.storage
        .from("community-streams")
        .createSignedUrl(seg.path, 30);
      if (signed?.signedUrl) out.push({ seq: seg.seq, url: signed.signedUrl });
    }
    return { segments: out, status: stream.status as "live" | "ended" };
  });
