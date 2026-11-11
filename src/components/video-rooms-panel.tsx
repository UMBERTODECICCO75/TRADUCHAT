import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { joinVideoRoom, videoServiceStatus } from '@/lib/video-rooms.functions';
import { VideoRoom } from '@/components/video-room';
import { Button } from '@/components/ui/button';
import { Plus, Video } from 'lucide-react';

export function VideoRoomsPanel({ people }: { people: { id: string; name: string }[] }) {
  const [rooms, setRooms] = useState<Tables<'video_rooms'>[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [invites, setInvites] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [session, setSession] = useState<{ token: string; roomName: string; displayName: string } | null>(null);
  const join = useServerFn(joinVideoRoom);
  const status = useServerFn(videoServiceStatus);
  const load = async () => {
    const result = await supabase.from('video_rooms').select('*').order('created_at', { ascending: false });
    if (result.error) setError('Accedi per vedere le stanze private'); else setRooms(result.data ?? []);
  };
  useEffect(() => {
    let active = true;
    void load();
    void status().then(r => { if (active) setConfigured(r.configured); }).catch(() => { if (active) setConfigured(false); });
    const channel = supabase.channel(`private-rooms-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_room_members' }, () => { if (active) void load(); }).subscribe();
    const timer = setInterval(() => { if (active) void load(); }, 15000);
    return () => { active = false; clearInterval(timer); void supabase.removeChannel(channel); };
  }, []);
  const create = async () => {
    setBusy(true); setError('');
    const result = await supabase.rpc('create_video_room', { room_name: name.trim(), invited_ids: invites });
    setBusy(false);
    if (result.error) { setError(result.error.message); return; }
    setCreating(false); setName(''); setInvites([]); await load();
  };
  const enter = async (roomId: string) => {
    setBusy(true); setError('');
    try { const r = await join({ data: { roomId } }); if (!r.ok) setError(r.error); else setSession(r); }
    catch (e) { setError(e instanceof Error ? e.message : 'Accesso non riuscito'); }
    finally { setBusy(false); }
  };
  return <section className="mb-5 border-b border-border pb-4">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-display font-bold">Stanze private</h2><Button variant="ghost" size="icon" title="Crea stanza" aria-label="Crea stanza" onClick={() => setCreating(c => !c)}><Plus /></Button></div>
    {configured === false && <p role="status" className="mb-3 text-sm text-muted-foreground">Twilio Video: credenziali da completare</p>}
    {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
    {creating && <form className="mb-4 space-y-3" onSubmit={e => { e.preventDefault(); void create(); }}>
      <label className="block text-sm">Nome stanza<input required maxLength={80} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-card-foreground" /></label>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Invita partecipanti</legend>
        {people.map(p => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={invites.includes(p.id)} onChange={e => setInvites(ids => e.target.checked ? [...ids,p.id] : ids.filter(id => id !== p.id))} />{p.name}</label>)}
      </fieldset>
      <Button disabled={busy || !name.trim()} type="submit">{busy ? 'Creazione…' : 'Crea stanza privata'}</Button>
    </form>}
    {rooms.length === 0 && <p className="text-sm text-muted-foreground">Nessuna stanza</p>}
    {rooms.map(r => <div key={r.id} className="flex items-center justify-between gap-2 border-b border-border py-2"><p className="min-w-0 truncate text-sm font-semibold">{r.name}</p><Button variant="ghost" size="icon" disabled={busy || configured !== true} title="Entra nella stanza" aria-label={`Entra in ${r.name}`} onClick={() => void enter(r.id)}><Video /></Button></div>)}
    {session && <VideoRoom token={session.token} roomName={session.roomName} name={session.displayName} leave={() => setSession(null)} />}
  </section>;
}
