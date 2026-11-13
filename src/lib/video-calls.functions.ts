import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CallUpdate } from "./video-calls";
import type { Json } from "@/integrations/supabase/types";

export const getIncomingVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("video_calls").select("*")
      .eq("callee_id", context.userId).eq("status", "ringing")
      .gt("created_at", new Date(Date.now() - 60_000).toISOString())
      .order("created_at", { ascending: false }).limit(1);
    if (error) throw new Error("Non riesco a controllare le chiamate in arrivo.");
    const call = data?.[0];
    if (!call) return null;
    // The user-scoped call read proves membership before mapping the private room code.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room, error: roomError } = await supabaseAdmin.from("rooms").select("code").eq("id", call.room_id).maybeSingle();
    if (roomError || !room) throw new Error("Conversazione della chiamata non disponibile.");
    return { ...call, status: "ringing" as const, code: room.code };
  });

export const updateVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    roomId: z.string().uuid(), device: z.string().uuid(),
    action: z.enum(["start", "poll", "accept", "end", "heartbeat", "signal"]),
    callId: z.string().uuid().optional(), target: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()).optional(), after: z.number().int().nonnegative().default(0),
  }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.payload && JSON.stringify(data.payload).length > 65536) throw new Error("Segnale troppo grande.");
    const { data: result, error } = await context.supabase.rpc("video_call_action", {
      p_room: data.roomId, p_device: data.device, p_action: data.action,
      ...(data.callId ? { p_call: data.callId } : {}),
      ...(data.target ? { p_target: data.target } : {}),
      ...(data.payload ? { p_payload: data.payload as Json } : {}),
      p_after: data.after,
    });
    if (error) throw new Error(error.message);
    const raw = result as unknown as { call: CallUpdate["call"]; events: { id: number; payload: Json }[] };
    const call = raw.call as { id: string; status: string; caller_id: string; created_at: string } | null;
    if (data.action === "heartbeat" && call?.status === "active") {
      const { data: both } = await context.supabase.from("video_calls").select("caller_id,callee_id").eq("id", call.id).maybeSingle();
      const { chargeCallMinutes } = await import("./usage-credits.server");
      await chargeCallMinutes(call.id, both ? [both.caller_id, both.callee_id] : [context.userId], call.created_at);
    }
    return { call: raw.call, events: raw.events.map((event) => ({ id: event.id, payload: JSON.stringify(event.payload) })) };
  });

export const getVideoIceServers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ callId: z.string().uuid(), device: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: call, error } = await context.supabase.from("video_calls").select("caller_id,callee_id,caller_device,callee_device,status").eq("id", data.callId).maybeSingle();
    if (error || !call || call.status !== "active" || !(
      (call.caller_id === context.userId && call.caller_device === data.device) ||
      (call.callee_id === context.userId && call.callee_device === data.device)
    )) throw new Error("Chiamata non disponibile su questo dispositivo.");
    {
      // Connection credentials are released only once the current minutes are paid by a participant.
      const { data: started } = await context.supabase.from("video_calls").select("created_at").eq("id", data.callId).maybeSingle();
      const { chargeCallMinutes } = await import("./usage-credits.server");
      await chargeCallMinutes(data.callId, [call.caller_id, call.callee_id], started?.created_at ?? new Date().toISOString());
    }
    const { twilioConfigured, twilioPost } = await import("./twilio.server");
    if (!twilioConfigured()) throw new Error("Collegamento video non configurato.");
    const response = await twilioPost("/Tokens.json", { Ttl: "3600" });
    if (!response.ok) {
      // Do not log successful bodies: they contain temporary TURN credentials.
      const body = await response.text();
      console.error(`Video TURN failed [${response.status}]: ${body}`);
      throw new Error(`Twilio non riesce a collegare la chiamata (${response.status}). Riprova più tardi.`);
    }
    const result = await response.json() as { ice_servers?: { urls: string; username?: string; credential?: string }[] };
    if (!result.ice_servers?.some((server) => server.urls.startsWith("turn:"))) throw new Error("Collegamento tra reti non disponibile.");
    return { iceServers: result.ice_servers.map(({ urls, username, credential }) => ({ urls, ...(username ? { username } : {}), ...(credential ? { credential } : {}) })) };
  });