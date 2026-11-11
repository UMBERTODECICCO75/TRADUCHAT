import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const FALLBACK_ICE: { urls: string | string[]; username?: string; credential?: string }[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];

// Short-lived Twilio relay (TURN) credentials so calls connect on mobile and restrictive networks.
export const getIceServers = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const account = process.env['TWILIO_VIDEO_ACCOUNT_SID'];
    const key = process.env['TWILIO_VIDEO_KEY_SID'];
    const secret = process.env['TWILIO_VIDEO_KEY_SECRET'];
    if (!account || !key || !secret) return { relay: false, iceServers: FALLBACK_ICE };
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${account}/Tokens.json`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'Ttl=3600',
      });
      if (!res.ok) { console.error('Twilio TURN', res.status, await res.text()); return { relay: false, iceServers: FALLBACK_ICE }; }
      const json = (await res.json()) as { ice_servers?: { urls?: string; url?: string; username?: string; credential?: string }[] };
      const iceServers = (json.ice_servers ?? []).map(s => ({ urls: s.urls ?? s.url ?? '', username: s.username ?? '', credential: s.credential ?? '' })).filter(s => s.urls);
      return { relay: iceServers.length > 0, iceServers: iceServers.length ? iceServers : FALLBACK_ICE };
    } catch (e) {
      console.error('Twilio TURN', e);
      return { relay: false, iceServers: FALLBACK_ICE };
    }
  });
