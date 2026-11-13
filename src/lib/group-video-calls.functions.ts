import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { groupBillingStart, ownsGroupDevice, type GroupUpdate } from "./group-video-calls";

export const updateGroupVideoCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    roomId: z.string().uuid(), device: z.string().uuid(),
    action: z.enum(["start", "join", "poll", "heartbeat", "signal", "leave"]),
    callId: z.string().uuid().optional(), target: z.string().uuid().optional(),
    payload: z.record(z.string(), z.unknown()).optional(), after: z.number().int().nonnegative().default(0),
  }).parse(input))
  .handler(async ({ data, context }) => {
    if (data.payload && JSON.stringify(data.payload).length > 65536) throw new Error("Segnale troppo grande.");
    const { data: raw, error } = await context.supabase.rpc("group_video_action", {
      p_room: data.roomId, p_device: data.device, p_action: data.action, p_after: data.after,
      ...(data.callId ? { p_call: data.callId } : {}), ...(data.target ? { p_target: data.target } : {}),
      ...(data.payload ? { p_payload: data.payload as Json } : {}),
    });
    if (error) throw new Error(error.message);
    const result = raw as unknown as Omit<GroupUpdate, "events"> & { events: { id: number; sender_id: string; payload: Json }[] };
    const started = groupBillingStart(result.call, context.userId);
    if (started && result.call && ownsGroupDevice(result.members, context.userId, data.device) && data.action !== "leave") {
      try {
        const { chargeCallMinutes } = await import("./usage-credits.server");
        await chargeCallMinutes(result.call.id, result.members.map((member) => member.user_id), started);
      } catch (reason) {
        await context.supabase.rpc("group_video_action", { p_room: data.roomId, p_device: data.device, p_action: "leave", p_call: result.call.id });
        throw reason;
      }
    }
    return { ...result, events: result.events.map((event) => ({ ...event, payload: JSON.stringify(event.payload) })) };
  });

export const getGroupIceServers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ roomId: z.string().uuid(), callId: z.string().uuid(), device: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: raw, error } = await context.supabase.rpc("group_video_action", { p_room: data.roomId, p_device: data.device, p_action: "heartbeat", p_call: data.callId });
    const result = raw as unknown as GroupUpdate | null;
    if (error || !result?.call || !ownsGroupDevice(result.members, context.userId, data.device)) throw new Error("Chiamata non disponibile su questo dispositivo.");
    const started = groupBillingStart(result.call, context.userId);
    if (started) {
      try {
        const { chargeCallMinutes } = await import("./usage-credits.server");
        await chargeCallMinutes(result.call.id, result.members.map((member) => member.user_id), started);
      } catch (reason) {
        await context.supabase.rpc("group_video_action", { p_room: data.roomId, p_device: data.device, p_action: "leave", p_call: data.callId });
        throw reason;
      }
    }
    const key = process.env["LOVABLE_API_KEY"]; const connection = process.env["TWILIO_API_KEY"];
    if (!key || !connection) throw new Error("Collegamento video non configurato.");
    const response = await fetch("https://connector-gateway.lovable.dev/twilio/Tokens.json", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "X-Connection-Api-Key": connection, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ Ttl: "3600" }), signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Collegamento video non disponibile. Riprova.");
    const body = await response.json() as { ice_servers?: RTCIceServer[] };
    if (!body.ice_servers?.some((server) => (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) => url.startsWith("turn:")))) throw new Error("Collegamento tra reti non disponibile.");
    return { iceServers: body.ice_servers };
  });