import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProfileInput = z.object({
  displayName: z.string().trim().max(60).optional(),
  nickname: z.string().trim().max(24).regex(/^([A-Za-z0-9_]{3,24})?$/, "Usa 3-24 lettere, numeri o trattini bassi.").optional(),
  email: z.string().trim().email().max(200).or(z.literal("")).optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+0-9 ().-]*$/, "Numero non valido.")
    .optional(),
  /** Status shown under the participant name, e.g. "riunione" or "malato". */
  status: z.string().trim().max(100).optional(),
  showStatus: z.boolean().optional(),
  /** Storage path of a freshly uploaded photo, inside the person's own folder. */
  avatarPath: z.string().trim().max(300).optional(),
  removeAvatar: z.boolean().optional(),
  /** Storage path of a photo attached to the status, inside the person's own folder. */
  statusImagePath: z.string().trim().max(300).optional(),
  removeStatusImage: z.boolean().optional(),
});

export const getMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, email, phone, display_name, nickname, avatar_url, status, status_image_path, show_status, last_seen_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Non riesco a leggere il profilo.");
    const email = (context.claims["email"] as string | undefined) ?? null;
    const profile = data ?? {
      id: context.userId,
      email,
      phone: null,
      display_name: null,
      nickname: null,
      avatar_url: null,
      status: null,
      status_image_path: null,
      show_status: true,
      last_seen_at: null,
    };
    const { signAvatarPath } = await import("./avatars.server");
    const { signStatusPath } = await import("./status-photos.server");
    return {
      profile,
      avatarUrl: await signAvatarPath(profile.avatar_url ?? null),
      statusImageUrl: await signStatusPath(profile.status_image_path ?? null),
      accountEmail: email,
    };
  });

/** Creates the profile row on first sign-in, without overwriting saved values. */
export const ensureMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (data) return { created: false };
    const email = (context.claims["email"] as string | undefined) ?? null;
    const phone = (context.claims["phone"] as string | undefined) || null;
    const name = (context.claims["name"] as string | undefined) || null;
    const { error } = await context.supabase
      .from("profiles")
      .insert({ id: context.userId, email, phone, display_name: name });
    if (error) throw new Error("Non riesco a creare il profilo.");
    return { created: true };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    if (data.avatarPath && !data.avatarPath.startsWith(`${context.userId}/`)) {
      throw new Error("Foto non valida.");
    }
    if (data.statusImagePath && !data.statusImagePath.startsWith(`${context.userId}/`)) {
      throw new Error("Foto non valida.");
    }

    const { data: current } = await context.supabase
      .from("profiles")
      .select("avatar_url, status_image_path, show_status")
      .eq("id", context.userId)
      .maybeSingle();

    const avatarPath = data.removeAvatar
      ? null
      : (data.avatarPath ?? current?.avatar_url ?? null);

    const statusImagePath = data.removeStatusImage
      ? null
      : (data.statusImagePath ?? current?.status_image_path ?? null);

    const status = data.status === undefined ? null : data.status || null;
    const showStatus = data.showStatus ?? current?.show_status ?? true;

    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      display_name: data.displayName ? data.displayName : null,
      nickname: data.nickname || null,
      email: data.email ? data.email : null,
      phone: data.phone ? data.phone : null,
      status,
      show_status: showStatus,
      avatar_url: avatarPath,
      status_image_path: statusImagePath,
    });
    if (error?.code === "23505") throw new Error("Questo nickname è già in uso. Scegline un altro.");
    if (error) throw new Error("Non riesco a salvare il profilo.");

    const { pruneOldAvatars, signAvatarPath } = await import("./avatars.server");
    await pruneOldAvatars(context.userId, avatarPath);
    const { pruneOldStatusPhotos, signStatusPath } = await import("./status-photos.server");
    await pruneOldStatusPhotos(context.userId, statusImagePath);
    return {
      ok: true,
      avatarUrl: await signAvatarPath(avatarPath),
      statusImageUrl: await signStatusPath(statusImagePath),
    };
  });

/**
 * Heartbeat: the app pings this while open, so `profiles.last_seen_at` marks
 * who is online and when someone was last active. Cheap single-row update.
 */
export const pingPresence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await (await import("@/integrations/supabase/client.server")).supabaseAdmin;
    await db
      .from("profiles")
      .upsert({ id: context.userId, last_seen_at: new Date().toISOString() });
    return { ok: true };
  });
