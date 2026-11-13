import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RegisterInput = z.object({
  sessionId: z.string().uuid(),
  deviceType: z.enum(["computer", "tablet", "telefono", "orologio"]),
  deviceLabel: z.string().trim().min(1).max(80),
});

export type DeviceSession = {
  id: string;
  deviceType: string;
  deviceLabel: string;
  createdAt: string;
  lastSeenAt: string;
};

/** Un dispositivo non visto da un mese si considera scollegato. */
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

/** Registra o aggiorna il dispositivo corrente per l'account. */
export const registerDeviceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(RegisterInput)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("device_sessions")
      .upsert(
        {
          id: data.sessionId,
          user_id: context.userId,
          device_type: data.deviceType,
          device_label: data.deviceLabel,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) throw new Error("Non riesco a registrare il dispositivo.");
    return { ok: true };
  });

/** Elenco dei dispositivi collegati, con pulizia di quelli non visti da un mese. */
export const listDeviceSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ sessions: DeviceSession[] }> => {
    const cutoff = new Date(Date.now() - STALE_MS).toISOString();
    await context.supabase
      .from("device_sessions")
      .delete()
      .eq("user_id", context.userId)
      .lt("last_seen_at", cutoff);
    const { data, error } = await context.supabase
      .from("device_sessions")
      .select("id, device_type, device_label, created_at, last_seen_at")
      .eq("user_id", context.userId)
      .order("last_seen_at", { ascending: false });
    if (error) throw new Error("Non riesco a leggere i dispositivi collegati.");
    return {
      sessions: (data ?? []).map((row) => ({
        id: row.id,
        deviceType: row.device_type,
        deviceLabel: row.device_label,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
      })),
    };
  });

const RemoveInput = z.object({ sessionId: z.string().uuid() });

/** Scollega un dispositivo dall'elenco. */
export const removeDeviceSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(RemoveInput)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("device_sessions")
      .delete()
      .eq("id", data.sessionId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Non riesco a scollegare il dispositivo.");
    return { ok: true };
  });
