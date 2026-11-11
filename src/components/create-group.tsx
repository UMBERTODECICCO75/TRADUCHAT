import { useEffect, useState } from "react";
import { Check, MessageCircle, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { groupError } from "@/lib/group-rules";

import { usePeerCalls } from "@/components/peer-calls";
type Group = { id: string; name: string; members: string[] };

export function CreateGroup({ openChat }: { openChat: (name: string) => void }) {
  const { people } = usePeerCalls();
  const [name, setName] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data, error } = await supabase.from("chat_groups").select("id,name,members").order("created_at", { ascending: false });
      if (error) throw error;
      setGroups(data ?? []);
    } catch { setGroups([]); }
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    const e = groupError(name, sel);
    if (e) { setErr(e); return; }
    setBusy(true); setErr(""); setMsg("");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setErr("Accedi per creare un gruppo"); setBusy(false); return; }
    const { error } = await supabase.from("chat_groups").insert({ owner_id: u.user.id, name: name.trim(), members: sel });
    setBusy(false);
    if (error) { setErr("Creazione non riuscita"); return; }
    setName(""); setSel([]); setMsg("Gruppo creato"); void load();
  };
  const remove = async (id: string) => { await supabase.from("chat_groups").delete().eq("id", id); void load(); };

  return <div className="flex flex-col gap-4 px-6 pb-8">
    <input aria-label="Nome del gruppo" placeholder="Nome del gruppo" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-input bg-card p-3 text-sm" />
    <p className="text-sm font-bold">Scegli i partecipanti ({sel.length})</p>
    <div className="flex flex-col">
      {people.map((c) => { const on = sel.includes(c.name); return (
        <Button variant="ghost" key={c.id} type="button" onClick={() => setSel((s) => on ? s.filter((x) => x !== c.name) : [...s, c.name])}
          className="flex items-center justify-between border-b border-border py-3 text-left">
          <span>{c.name}</span>
          <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${on ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>{on && <Check size={14} />}</span>
        </Button>); })}
    </div>
    {err && <p className="text-sm text-destructive">{err}</p>}
    {msg && <p className="text-sm text-primary">{msg}</p>}
    <Button disabled={busy} onClick={() => void create()}><Users /> Crea gruppo</Button>
    {groups.length > 0 && <h3 className="mt-4 font-display font-extrabold">I tuoi gruppi</h3>}
    {groups.map((g) => <div key={g.id} className="flex items-center gap-2 border-b border-border py-3">
      <Button variant="ghost" className="min-w-0 flex-1 justify-start whitespace-normal text-left" onClick={() => openChat(g.name)}>
        <MessageCircle /><span><b>{g.name}</b><br /><span className="text-xs text-muted-foreground">{g.members.join(", ")}</span></span>
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Elimina ${g.name}`} onClick={() => void remove(g.id)}><Trash2 /></Button>
    </div>)}
  </div>;
}
