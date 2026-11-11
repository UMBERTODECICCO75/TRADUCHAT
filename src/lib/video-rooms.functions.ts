import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { ROOM_TOKEN_SECONDS, roomTokenClaims } from '@/lib/room-access';
import { z } from 'zod';

export const videoServiceStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: Boolean(process.env['TWILIO_VIDEO_ACCOUNT_SID'] && process.env['TWILIO_VIDEO_KEY_SID'] && process.env['TWILIO_VIDEO_KEY_SECRET']) }));

export const joinVideoRoom = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ roomId: z.uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: room, error } = await context.supabase.from('video_rooms').select('id,name').eq('id', data.roomId).maybeSingle();
    if (error || !room) throw new Error('Non sei invitato a questa stanza');
    const account = process.env['TWILIO_VIDEO_ACCOUNT_SID'];
    const key = process.env['TWILIO_VIDEO_KEY_SID'];
    const secret = process.env['TWILIO_VIDEO_KEY_SECRET'];
    if (!account || !key || !secret) return { ok: false as const, error: 'Twilio Video non configurato: completa le credenziali protette.' };
    if (!/^AC[0-9a-f]{32}$/i.test(account) || !/^SK[0-9a-f]{32}$/i.test(key)) return { ok: false as const, error: 'Controlla Account SID e API Key SID di Twilio Video.' };
    const { data: profile } = await context.supabase.from('profiles').select('username').eq('id', context.userId).maybeSingle();
    const { SignJWT } = await import('jose');
    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT(roomTokenClaims(room.id, context.userId, profile?.username ?? 'Partecipante'))
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', cty: 'twilio-fpa;v=1' })
      .setIssuer(key).setSubject(account).setJti(`${key}-${crypto.randomUUID()}`)
      .setIssuedAt(now).setNotBefore(now).setExpirationTime(now + ROOM_TOKEN_SECONDS)
      .sign(new TextEncoder().encode(secret));
    return { ok: true as const, token, roomName: `traduchat-${room.id}`, displayName: room.name };
  });
