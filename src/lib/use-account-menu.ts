import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMessageBeep } from "@/lib/use-message-beep";
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export function useAccountMenu(userId: string | null) {
  const beep = useMessageBeep(userId);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [archived, setArchived] = useState<string[]>([]);
  const [photo, setPhoto] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setProfile(null); setNotifications([]); setArchived([]); setPhoto(""); setError("");
    setLoading(Boolean(userId));
    if (!userId) return;
    async function load(id: string) {
      const [p, n, a] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("chat_preferences").select("chat_key").eq("archived", true),
      ]);
      if (!active) return;
      setProfile(p.data); setNotifications(n.data ?? []); setArchived((a.data ?? []).map(x => x.chat_key));
      setError(p.error?.message ?? n.error?.message ?? a.error?.message ?? ""); setLoading(false);
      if (p.data?.avatar_path) {
        const result = await supabase.storage.from("profile-photos").createSignedUrl(p.data.avatar_path, 3600);
        if (active) setPhoto(result.data?.signedUrl ?? "");
      }
    }
    void load(userId).catch(e => { if (active) { setError(e instanceof Error ? e.message : "Caricamento non riuscito"); setLoading(false); } });
    return () => { active = false; };
  }, [userId]);
  async function save(values: Partial<Profile>) {
    if (!profile) throw new Error("Accedi nuovamente per aggiornare il profilo.");
    const { data, error } = await supabase.from("profiles").update(values).eq("id", profile.id).select().single();
    if (error) throw error;
    setProfile(data);
  }
  async function archive(name: string, value: boolean) {
    if (!profile) throw new Error("Profilo non disponibile");
    const { error } = await supabase.from("chat_preferences").upsert({ user_id: profile.id, chat_key: name, archived: value });
    if (error) throw error;
    setArchived(x => value ? [...new Set([...x, name])] : x.filter(k => k !== name));
  }
  async function markRead(id?: string) {
    if (!profile) return;
    let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", profile.id);
    if (id) query = query.eq("id", id);
    const { error } = await query;
    if (error) throw error;
    setNotifications(x => x.map(n => !id || n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }
  return { profile, notifications, archived, photo, setPhoto, error, loading, save, archive, markRead, beep };
}
export type AccountMenu = ReturnType<typeof useAccountMenu>;