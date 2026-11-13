import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Story = {
  id: string;
  imageUrl: string | null;
  caption: string;
  createdAt: string;
  expiresAt: string;
};

export type ContactStories = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  stories: Story[];
};

const AddInput = z.object({
  imagePath: z.string().trim().min(1).max(300),
  caption: z.string().trim().max(200).optional(),
});

/** Adds a photo story, visible to the person's contacts for 24 hours. */
export const addMyStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!data.imagePath.startsWith(`${context.userId}/`)) {
      throw new Error("Foto non valida.");
    }
    const { error } = await context.supabase.from("profile_stories").insert({
      user_id: context.userId,
      image_path: data.imagePath,
      caption: data.caption ?? "",
    });
    if (error) throw new Error("Non riesco a pubblicare la storia.");
    return { ok: true };
  });

/** Lists the signed-in person's own active stories. */
export const listMyStories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profile_stories")
      .select("id, image_path, caption, created_at, expires_at")
      .eq("user_id", context.userId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error("Non riesco a leggere le tue storie.");
    const { signStatusPaths } = await import("./status-photos.server");
    const signed = await signStatusPaths((data ?? []).map((s) => s.image_path));
    const stories: Story[] = (data ?? []).map((s) => ({
      id: s.id,
      imageUrl: signed[s.image_path] ?? null,
      caption: s.caption,
      createdAt: s.created_at,
      expiresAt: s.expires_at,
    }));
    return { stories };
  });

export const deleteMyStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profile_stories")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error("Non riesco a eliminare la storia.");
    return { ok: true };
  });

/** Active stories of the people the signed-in user shares a conversation with. */
export const listContactStories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await (await import("@/integrations/supabase/client.server")).supabaseAdmin;

    const { data: memberships } = await db
      .from("room_members")
      .select("room_id")
      .eq("user_id", context.userId)
      .limit(50);
    const roomIds = (memberships ?? []).map((m) => m.room_id);
    if (roomIds.length === 0) return { contacts: [] as ContactStories[] };

    const { data: members } = await db
      .from("room_members")
      .select("user_id")
      .in("room_id", roomIds)
      .neq("user_id", context.userId)
      .limit(200);
    const contactIds = Array.from(new Set((members ?? []).map((m) => m.user_id)));
    if (contactIds.length === 0) return { contacts: [] as ContactStories[] };

    const { data: rows } = await db
      .from("profile_stories")
      .select("id, user_id, image_path, caption, created_at, expires_at")
      .in("user_id", contactIds)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(200);
    if (!rows || rows.length === 0) return { contacts: [] as ContactStories[] };

    const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: profiles } = await db
      .from("profiles")
      .select("id, display_name, nickname, email, avatar_url")
      .in("id", authorIds);

    const { signAvatarPaths, fallbackName } = await import("./avatars.server");
    const { signStatusPaths } = await import("./status-photos.server");
    const signedAvatars = await signAvatarPaths(
      (profiles ?? []).map((p) => p.avatar_url).filter((p): p is string => Boolean(p)),
    );
    const signedStories = await signStatusPaths(rows.map((r) => r.image_path));
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

    const grouped = new Map<string, ContactStories>();
    for (const row of rows) {
      const profile = byId.get(row.user_id);
      let entry = grouped.get(row.user_id);
      if (!entry) {
        entry = {
          userId: row.user_id,
          name: fallbackName(
            profile?.nickname ?? profile?.display_name ?? null,
            profile?.email ?? null,
          ),
          avatarUrl: profile?.avatar_url ? (signedAvatars[profile.avatar_url] ?? null) : null,
          stories: [],
        };
        grouped.set(row.user_id, entry);
      }
      entry.stories.push({
        id: row.id,
        imageUrl: signedStories[row.image_path] ?? null,
        caption: row.caption,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      });
    }

    const contacts = [...grouped.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "it", { sensitivity: "base" }),
    );
    return { contacts };
  });
