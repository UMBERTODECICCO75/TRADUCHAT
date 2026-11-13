import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) {
    throw new Error("Accesso riservato agli amministratori.");
  }
}

export const amIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error("Non riesco a verificare il ruolo.");
    return { admin: Boolean(data) };
  });

export type AdminRoomRow = {
  code: string;
  langA: string;
  langB: string;
  inviteOnly: boolean;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
  participantCount: number;
  messageCount: number;
  lastMessageAt: string | null;
};

export const getAdminDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);

    const db = await admin();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsersResult,
      totalRoomsResult,
      totalMessagesResult,
      activeTodayResult,
      roomsResult,
    ] = await Promise.all([
      db.from("profiles").select("*", { count: "exact", head: true }),
      db.from("rooms").select("*", { count: "exact", head: true }),
      db.from("room_messages").select("*", { count: "exact", head: true }),
      db.from("room_messages").select("room_id").gte("created_at", today.toISOString()),
      db
        .from("rooms")
        .select("id, code, lang_a, lang_b, invite_only, created_at, owner_id")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (roomsResult.error) throw new Error("Non riesco a leggere le conversazioni.");

    const roomIds = roomsResult.data?.map((r) => r.id) ?? [];
    const ownerIds = [...new Set((roomsResult.data ?? []).map((r) => r.owner_id).filter(Boolean))] as string[];

    const [membersResult, messagesResult, profilesResult] =
      roomIds.length > 0
        ? await Promise.all([
            db.from("room_members").select("room_id").in("room_id", roomIds),
            db.from("room_messages").select("room_id, created_at").in("room_id", roomIds),
            ownerIds.length > 0
              ? db.from("profiles").select("id, display_name, email").in("id", ownerIds)
              : Promise.resolve({ data: [] as { id: string; display_name: string | null; email: string | null }[] | null }),
          ])
        : [
            { data: [] as { room_id: string }[] | null },
            { data: [] as { room_id: string; created_at: string }[] | null },
            { data: [] as { id: string; display_name: string | null; email: string | null }[] | null },
          ];

    const profileMap = new Map(
      (profilesResult.data ?? []).map((p) => [p.id, p]),
    );

    const participantCount = new Map<string, number>();
    for (const m of membersResult.data ?? []) {
      participantCount.set(m.room_id, (participantCount.get(m.room_id) ?? 0) + 1);
    }

    const messageCount = new Map<string, number>();
    const lastMessageAt = new Map<string, string>();
    for (const m of messagesResult.data ?? []) {
      messageCount.set(m.room_id, (messageCount.get(m.room_id) ?? 0) + 1);
      const current = lastMessageAt.get(m.room_id);
      if (!current || m.created_at > current) {
        lastMessageAt.set(m.room_id, m.created_at);
      }
    }

    const activeRoomIds = new Set(activeTodayResult.data?.map((m) => m.room_id) ?? []);

    const rooms: AdminRoomRow[] = (roomsResult.data ?? []).map((r) => {
      const owner = r.owner_id ? profileMap.get(r.owner_id) : null;
      return {
        code: r.code,
        langA: r.lang_a,
        langB: r.lang_b,
        inviteOnly: r.invite_only,
        createdAt: r.created_at,
        ownerEmail: owner?.email ?? null,
        ownerName: owner?.display_name ?? null,
        participantCount: participantCount.get(r.id) ?? 0,
        messageCount: messageCount.get(r.id) ?? 0,
        lastMessageAt: lastMessageAt.get(r.id) ?? null,
      };
    });

    return {
      totalUsers: totalUsersResult.count ?? 0,
      totalRooms: totalRoomsResult.count ?? 0,
      totalMessages: totalMessagesResult.count ?? 0,
      activeRoomsToday: activeRoomIds.size,
      rooms,
    };
  });

export type AdminUserRow = {
  userId: string;
  email: string | null;
  name: string | null;
  isMe: boolean;
};

/** A paged list of registered accounts, visible only to admins. */
export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ offset: z.number().int().min(0).max(100000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: profiles, error } = await db
      .from("profiles")
      .select("id, display_name, nickname, email, created_at")
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + 29);
    if (error) throw new Error("Non riesco a leggere gli utenti.");
    return {
      users: await Promise.all((profiles ?? []).map(async (profile) => ({
        id: profile.id,
        name: profile.display_name,
        nickname: profile.nickname,
        email: (await db.auth.admin.getUserById(profile.id)).data.user?.email ?? null,
        createdAt: profile.created_at,
      }))),
      hasMore: (profiles?.length ?? 0) === 30,
    };
  });

/** Everyone who currently has admin access to the panel. */
export const listAdmins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: roles, error } = await db
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: true });
    if (error) throw new Error("Non riesco a leggere gli amministratori.");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) return { admins: [] as AdminUserRow[] };
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, email")
      .in("id", ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const admins: AdminUserRow[] = ids.map((id) => ({
      userId: id,
      email: byId.get(id)?.email ?? null,
      name: byId.get(id)?.display_name ?? null,
      isMe: id === context.userId,
    }));
    return { admins };
  });

/** An admin promotes a registered account, identified by its email address. */
export const grantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const db = await admin();
    const { data: account, error: accountError } = await db.auth.admin.getUserById(data.userId);
    if (accountError || !account.user) throw new Error("Account non disponibile.");
    const { error } = await db
      .from("user_roles")
      .upsert({ user_id: account.user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error("Non riesco ad assegnare il ruolo admin.");
    return { ok: true };
  });

/** Removes admin access; an admin cannot remove their own access. */
export const revokeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Non puoi rimuovere il tuo accesso admin.");
    }
    const db = await admin();
    const { error } = await db
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "admin");
    if (error) throw new Error("Non riesco a rimuovere il ruolo admin.");
    return { ok: true };
  });
