import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { token: string }) => {
    const token = String(input.token ?? "").trim();
    if (!token || token.length > 512) throw new Error("Token non valido");
    return { token };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_tokens")
      .upsert({ user_id: context.userId, token: data.token }, { onConflict: "token" });
    if (error) return { ok: false as const, error: "Registrazione non riuscita" };
    return { ok: true as const };
  });

export const notifyContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recipientId: string; title: string; body: string }) => {
    const recipientId = String(input.recipientId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(recipientId)) throw new Error("Destinatario non valido");
    const title = String(input.title ?? "").trim().slice(0, 80);
    const body = String(input.body ?? "").trim().slice(0, 200);
    if (!title || !body) throw new Error("Notifica non valida");
    return { recipientId, title, body };
  })
  .handler(async ({ data, context }) => {
    if (data.recipientId === context.userId) return { ok: true as const, sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await context.supabase.from("profiles").select("username").eq("id", context.userId).maybeSingle();
    const title = data.title.replace("{name}", me?.username || "Un contatto");

    // In-app notice for the recipient, respecting their "Avvisi nell'app" setting.
    const { data: target } = await supabaseAdmin.from("profiles").select("notifications_enabled").eq("id", data.recipientId).maybeSingle();
    if (target && target.notifications_enabled !== false) {
      await supabaseAdmin.from("notifications").insert({ user_id: data.recipientId, title: `Nuovo messaggio da ${title}`, body: data.body });
    }

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connectionKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !connectionKey) return { ok: true as const, sent: 0 };
    const { data: rows } = await supabaseAdmin.from("push_tokens").select("token").eq("user_id", data.recipientId);
    if (!rows?.length) return { ok: true as const, sent: 0 };

    let sent = 0;
    for (const row of rows) {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: { token: row.token, notification: { title, body: data.body }, data: { path: "/" } },
        }),
      });
      if (res.ok) { sent++; continue; }
      const errorBody = await res.text();
      console.error(`FCM send failed [${res.status}]: ${errorBody}`);
      if (res.status === 404 || res.status === 400) {
        await supabaseAdmin.from("push_tokens").delete().eq("token", row.token);
      }
    }
    return { ok: true as const, sent };
  });
