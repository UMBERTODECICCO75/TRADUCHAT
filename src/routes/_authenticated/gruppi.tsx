import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Loader2, LogOut, MessageSquare, Search, Send, Users, UserPlus } from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  addGroupMembers,
  inviteFriendToGroup,
  createGroup,
  listMyGroups,
  leaveGroup,
  type GroupSummary,
} from "@/lib/groups.functions";
import { listMyParticipants } from "@/lib/rooms.functions";
import { LANGUAGES, type Language } from "@/lib/languages";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/gruppi")({
  head: () => ({
    meta: [
      { title: "Gruppi di messaggi istantanei — TraduChat" },
      {
        name: "description",
        content:
          "Crea un gruppo, aggiungi i tuoi contatti e scrivete insieme: ogni messaggio arriva tradotto all'istante.",
      },
      { property: "og:title", content: "Gruppi di messaggi istantanei — TraduChat" },
      {
        property: "og:description",
        content: "Chat di gruppo con traduzione immediata per tutti i partecipanti.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GroupsPage,
});

type Contact = { userId: string; name: string; avatarUrl: string | null };

function GroupsPage() {
  const navigate = useNavigate();
  const loadGroups = useServerFn(listMyGroups);
  const loadContacts = useServerFn(listMyParticipants);
  const makeGroup = useServerFn(createGroup);
  const addMembers = useServerFn(addGroupMembers);
  const exitGroup = useServerFn(leaveGroup);
  const inviteFriend = useServerFn(inviteFriendToGroup);
  const [friendHandle, setFriendHandle] = useState("");

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [langA, setLangA] = useState<Language>("Italiano");
  const [langB, setLangB] = useState<Language>("Inglese");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  // On a phone the groups come first: the form opens on request.
  const [showNew, setShowNew] = useState(false);

  async function refresh() {
    try {
      const [g, c] = await Promise.all([
        loadGroups({ data: undefined }),
        loadContacts({ data: undefined }),
      ]);
      setGroups(g.groups);
      setContacts(
        c.participants.map((p) => ({
          userId: p.userId,
          name: p.name,
          avatarUrl: p.avatarUrl,
        })),
      );
    } catch {
      toast.error("Non riesco a caricare i gruppi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => (q ? c.name.toLowerCase().includes(q) : true));
  }, [contacts, search]);

  function toggle(userId: string) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function submit() {
    if (creating) return;
    if (!name.trim()) {
      toast.error("Dai un nome al gruppo.");
      return;
    }
    setCreating(true);
    try {
      const result = await makeGroup({
        data: { name: name.trim(), langA, langB, memberIds: selected },
      });
      toast.success("Gruppo creato.");
      await navigate({ to: "/stanza/$code", params: { code: result.code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a creare il gruppo.");
    } finally {
      setCreating(false);
    }
  }

  async function addToGroup(code: string, userId: string) {
    setBusyCode(code);
    try {
      await addMembers({ data: { code, memberIds: [userId] } });
      toast.success("Persona aggiunta al gruppo.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco ad aggiungere la persona.");
    } finally {
      setBusyCode(null);
    }
  }

  async function inviteToGroup(code: string) {
    if (friendHandle.trim().length < 3) return;
    setBusyCode(code);
    try {
      await inviteFriend({ data: { code, handle: friendHandle.trim() } });
      toast.success("Amico aggiunto al gruppo: riceverà subito l'avviso.");
      setFriendHandle("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a invitare questa persona.");
    } finally {
      setBusyCode(null);
    }
  }

  async function leave(code: string) {
    setBusyCode(code);
    try {
      await exitGroup({ data: { code } });
      toast.success("Hai lasciato il gruppo.");
      setGroups((prev) => prev.filter((g) => g.code !== code));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a lasciare il gruppo.");
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
      <Toaster />
      <header>
        <h1 className="font-display text-3xl">
          <span className="text-foreground">Gruppi</span>{" "}
          <span className="text-primary">tradotti</span>
        </h1>
        <p className="mt-1 text-sm text-primary">
          Scrivete tutti insieme: ogni messaggio arriva anche nella lingua dell'altro.
        </p>
        <AppNav />
      </header>

      <section className="mt-6 rounded-2xl border border-border bg-card p-3 sm:mt-8 sm:p-4">
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          aria-expanded={showNew}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-display text-lg"
        >
          Nuovo gruppo
          <span className="text-sm font-normal text-accent">{showNew ? "Chiudi" : "Apri"}</span>
        </button>
        {showNew && (
        <>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome del gruppo"
            maxLength={60}
            className="sm:col-span-3"
          />
          <Select value={langA} onValueChange={(v) => setLangA(v as Language)}>
            <SelectTrigger aria-label="Prima lingua del gruppo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={langB} onValueChange={(v) => setLangB(v as Language)}>
            <SelectTrigger aria-label="Seconda lingua del gruppo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setLangB(langA)}
            className="text-left text-xs text-accent underline sm:col-span-3"
          >
            Stessa lingua per tutti ({langA})
          </button>
          <Button className="h-12" onClick={() => void submit()} disabled={creating}>
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
            Crea gruppo
          </Button>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-2 rounded-xl border border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca una persona"
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            {selected.length} selezionati su {contacts.length} contatti
          </p>
          <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {filteredContacts.map((c) => (
              <li key={c.userId}>
                <button
                  type="button"
                  onClick={() => toggle(c.userId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm",
                    selected.includes(c.userId)
                      ? "bg-primary/15 ring-1 ring-primary"
                      : "hover:bg-secondary",
                  )}
                >
                  <ParticipantAvatar name={c.name} avatarUrl={c.avatarUrl} className="size-8" />
                  {c.name}
                </button>
              </li>
            ))}
            {filteredContacts.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Nessun contatto: apri una chat a due o fai inquadrare il tuo QR.
              </li>
            )}
          </ul>
        </div>
        </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg">I miei gruppi</h2>
        {loading && <p className="mt-2 text-sm text-muted-foreground">Carico…</p>}
        {!loading && groups.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Non hai ancora gruppi: creane uno qui sopra.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {groups.map((g) => (
            <li key={g.code} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.members.length} partecipanti · {g.langA === g.langB ? `solo ${g.langA}` : `${g.langA} ↔ ${g.langB}`}
                  </p>
                  {g.lastMessage && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">{g.lastMessage}</p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
                  <Link to="/stanza/$code" params={{ code: g.code }}>
                    <Button className="h-11 w-full px-3">
                      <MessageSquare className="size-4" /> Apri
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="h-11 px-3"
                    onClick={() => setAddingTo((prev) => (prev === g.code ? null : g.code))}
                  >
                    <UserPlus className="size-4" /> Aggiungi
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 px-3 text-muted-foreground"
                    disabled={busyCode === g.code}
                    onClick={() => void leave(g.code)}
                  >
                    <LogOut className="size-4" /> Esci
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {g.members.map((m) => (
                  <span
                    key={m.userId}
                    className="inline-flex items-center gap-2 rounded-full bg-secondary px-2 py-1 text-xs"
                  >
                    <ParticipantAvatar name={m.name} avatarUrl={m.avatarUrl} className="size-6" />
                    {m.name}
                  </span>
                ))}
              </div>

              {addingTo === g.code && g.mine && (
                <form
                  className="mt-3 flex gap-2 border-t border-border pt-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void inviteToGroup(g.code);
                  }}
                >
                  <Input
                    value={friendHandle}
                    onChange={(e) => setFriendHandle(e.target.value)}
                    placeholder="Invita un amico iscritto: nickname o email"
                    aria-label="Nickname o email dell'amico"
                    className="h-11"
                    maxLength={200}
                  />
                  <Button type="submit" className="h-11 px-4" disabled={busyCode === g.code || friendHandle.trim().length < 3}>
                    {busyCode === g.code ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} Invita
                  </Button>
                </form>
              )}
              {addingTo === g.code && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      `Ciao! Unisciti a me su TraduChat nel gruppo "${g.name}": scriviamo ognuno nella propria lingua con traduzione automatica. Iscriviti qui ${typeof window !== "undefined" ? window.location.origin : "https://traduchat.app"}/auth e mandami il tuo nickname, così ti aggiungo al gruppo.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-secondary"
                  >
                    <MessageSquare className="size-4" /> Invita con WhatsApp
                  </a>
                  <a
                    href={`https://t.me/share/url?url=${encodeURIComponent(
                      `${typeof window !== "undefined" ? window.location.origin : "https://traduchat.app"}/auth`,
                    )}&text=${encodeURIComponent(
                      `Ciao! Unisciti a me su TraduChat nel gruppo "${g.name}": scriviamo ognuno nella propria lingua con traduzione automatica. Iscriviti e mandami il tuo nickname, così ti aggiungo al gruppo.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-secondary"
                  >
                    <Send className="size-4" /> Invita con Telegram
                  </a>
                </div>
              )}
              {addingTo === g.code && (
                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto border-t border-border pt-3">
                  {contacts
                    .filter((c) => !g.members.some((m) => m.userId === c.userId))
                    .map((c) => (
                      <li key={c.userId}>
                        <button
                          type="button"
                          disabled={busyCode === g.code}
                          onClick={() => void addToGroup(g.code, c.userId)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-secondary"
                        >
                          <ParticipantAvatar
                            name={c.name}
                            avatarUrl={c.avatarUrl}
                            className="size-8"
                          />
                          {c.name}
                        </button>
                      </li>
                    ))}
                  {contacts.filter((c) => !g.members.some((m) => m.userId === c.userId)).length ===
                    0 && (
                    <li className="px-3 py-2 text-sm text-muted-foreground">
                      Tutti i tuoi contatti sono già nel gruppo.
                    </li>
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
