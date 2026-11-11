import { useState } from "react";
import { MessageCircle, Phone, Search, Users, Video, X } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import type { Contact } from "@/lib/sample-data";

export function ContactList({ contacts, openChat, openCall }: {
  contacts: Contact[];
  openChat: (name: string) => void;
  openCall: (name: string, mode: "audio" | "video") => void;
}) {
  return <>
    {contacts.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nessun contatto</p>}
    {contacts.map((c) => (
      <div key={c.name} className="flex items-center gap-3 border-b border-border py-3">
        <Avatar name={c.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-extrabold uppercase text-foreground">{c.name}</p>
          <p className="truncate text-sm text-muted-foreground">{c.role}</p>
        </div>
        <div className="flex shrink-0 gap-1 text-secondary-foreground">
          <Button variant="ghost" size="icon" title="Chiama" aria-label={`Chiama ${c.name}`} onClick={() => openCall(c.name, "audio")}><Phone size={18} /></Button>
          <Button variant="ghost" size="icon" title="Scrivi" aria-label={`Scrivi a ${c.name}`} onClick={() => openChat(c.name)}><MessageCircle size={18} /></Button>
          <Button variant="ghost" size="icon" title="Videochiamata" aria-label={`Videochiamata ${c.name}`} onClick={() => openCall(c.name, "video")}><Video size={18} /></Button>
        </div>
      </div>
    ))}
  </>;
}

/** Slide-over panel with the address book, opened from the home screen header. */
export function ContactsPanel({ contacts, openChat, openCall, onClose }: {
  contacts: Contact[];
  openChat: (name: string) => void;
  openCall: (name: string, mode: "audio" | "video") => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = contacts.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="flex h-full w-[88%] max-w-[340px] flex-col bg-background shadow-2xl">
        <header className="flex shrink-0 items-center gap-2 rounded-b-[1.5rem] bg-secondary-dark px-4 pb-3 pt-6">
          <Users size={18} className="text-primary" />
          <h2 className="flex-1 font-display text-lg font-extrabold uppercase text-primary">Contatti</h2>
          <span className="text-xs text-secondary-foreground/70">{list.length}</span>
          <Button variant="ghost" size="icon" aria-label="Chiudi contatti" onClick={onClose}><X /></Button>
        </header>
        <div className="mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-full border border-input px-3 py-2">
          <Search size={16} className="opacity-60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca contatto"
            aria-label="Cerca contatto" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
        </div>
        <div className="mt-1 flex-1 overflow-y-auto px-4 pb-6">
          <ContactList contacts={list} openChat={openChat} openCall={openCall} />
        </div>
      </div>
    </div>
  );
}
