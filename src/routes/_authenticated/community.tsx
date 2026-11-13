import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Globe,
  Link2,
  Loader2,
  Pencil,
  ImagePlus,
  LogOut,
  MessageSquare,
  Send,
  Users,
  UserPlus,
} from "lucide-react";

import { AppNav } from "@/components/AppNav";
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
  createCommunity,
  joinCommunity,
  leaveCommunity,
  listMyCommunities,
  listCommunityMembers,
  updateCommunityProfile,
  type CommunitySummary,
  type CommunityMember,
} from "@/lib/community.functions";
import { connectWithUser } from "@/lib/rooms.functions";
import { LANGUAGES, type Language } from "@/lib/languages";
import { fileToBase64 } from "@/lib/file-base64";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { CommunityStream } from "@/components/CommunityStream";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — TraduChat" },
      {
        name: "description",
        content:
          "Crea una community aperta: chiunque con il codice può entrare e scrivere nella propria lingua.",
      },
      { property: "og:title", content: "Community — TraduChat" },
      {
        property: "og:description",
        content: "Crea o unisciti a una community su TraduChat con traduzione automatica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  const navigate = useNavigate();
  const loadCommunities = useServerFn(listMyCommunities);
  const makeCommunity = useServerFn(createCommunity);
  const enterCommunity = useServerFn(joinCommunity);
  const exitCommunity = useServerFn(leaveCommunity);
  const saveProfile = useServerFn(updateCommunityProfile);
  const addContact = useServerFn(connectWithUser);
  const loadMembers = useServerFn(listCommunityMembers);

  // Profile editor
  const [editCode, setEditCode] = useState<string | null>(null);
  const [editTheme, setEditTheme] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editPhoto, setEditPhoto] = useState<File | null>(null);
  const [editCover, setEditCover] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  function startEdit(c: CommunitySummary) {
    setEditCode(c.code);
    setEditTheme(c.theme ?? "");
    setEditTopic(c.topic ?? "");
    setEditPhoto(null);
    setEditCover(null);
  }

  async function submitProfile() {
    if (!editCode || savingProfile) return;
    if (editPhoto && editPhoto.size > 5_000_000) {
      toast.error("Foto troppo grande (max 5 MB).");
      return;
    }
    if (editPhoto && !["image/jpeg", "image/png", "image/webp"].includes(editPhoto.type)) {
      toast.error("Usa una foto JPG, PNG o WEBP.");
      return;
    }
    for (const f of [editPhoto, editCover]) {
      if (f && (f.size > 5_000_000 || !["image/jpeg", "image/png", "image/webp"].includes(f.type))) {
        toast.error("Usa immagini JPG, PNG o WEBP fino a 5 MB.");
        return;
      }
    }
    setSavingProfile(true);
    try {
      await saveProfile({
        data: {
          code: editCode,
          theme: editTheme,
          topic: editTopic,
          ...(editPhoto
            ? {
                photoBase64: await fileToBase64(editPhoto),
                photoType: editPhoto.type as "image/jpeg" | "image/png" | "image/webp",
              }
            : {}),
          ...(editCover
            ? {
                coverBase64: await fileToBase64(editCover),
                coverType: editCover.type as "image/jpeg" | "image/png" | "image/webp",
              }
            : {}),
        },
      });
      toast.success("Profilo della community salvato.");
      setEditCode(null);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a salvare il profilo.");
    } finally {
      setSavingProfile(false);
    }
  }

  const [communities, setCommunities] = useState<CommunitySummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [name, setName] = useState("");
  const [langA, setLangA] = useState<Language>("Italiano");
  const [langB, setLangB] = useState<Language>("Inglese");
  const [creating, setCreating] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Join form
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  // Per-community busy
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Community participants → contacts
  const [membersCode, setMembersCode] = useState<string | null>(null);
  const [membersByCode, setMembersByCode] = useState<Record<string, CommunityMember[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  async function refresh() {
    try {
      const result = await loadCommunities({ data: undefined });
      setCommunities(result.communities);
    } catch {
      toast.error("Non riesco a caricare le community.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (creating) return;
    if (!name.trim()) {
      toast.error("Dai un nome alla community.");
      return;
    }
    setCreating(true);
    try {
      const result = await makeCommunity({ data: { name: name.trim(), langA, langB } });
      toast.success("Community creata!");
      await navigate({ to: "/stanza/$code", params: { code: result.code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a creare la community.");
    } finally {
      setCreating(false);
    }
  }

  async function joinByCode() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Inserisci il codice della community.");
      return;
    }
    setJoining(true);
    try {
      const result = await enterCommunity({ data: { code } });
      toast.success(`Sei entrato nella community "${result.name}"!`);
      await navigate({ to: "/stanza/$code", params: { code: result.code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Codice non trovato.");
    } finally {
      setJoining(false);
    }
  }

  async function leave(code: string) {
    setBusyCode(code);
    try {
      await exitCommunity({ data: { code } });
      toast.success("Hai lasciato la community.");
      setCommunities((prev) => prev.filter((c) => c.code !== code));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a uscire dalla community.");
    } finally {
      setBusyCode(null);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast.error("Non riesco a copiare il codice.");
    }
  }

  async function toggleMembers(code: string) {
    if (membersCode === code) {
      setMembersCode(null);
      return;
    }
    setMembersCode(code);
    if (membersByCode[code]) return;
    setLoadingMembers(true);
    try {
      const result = await loadMembers({ data: { code } });
      setMembersByCode((prev) => ({ ...prev, [code]: result.members }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a leggere i partecipanti.");
      setMembersCode(null);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function addAsContact(userId: string) {
    if (connectingId) return;
    setConnectingId(userId);
    try {
      const result = await addContact({ data: { userId } });
      if (!result.code) {
        toast.success("Richiesta inviata ✨ La conversazione si apre quando l'altra persona accetta.");
        return;
      }
      await navigate({ to: "/stanza/$code", params: { code: result.code } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco ad aggiungere il contatto.");
    } finally {
      setConnectingId(null);
    }
  }

  function shareLink(community: CommunitySummary) {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://traduchat.app";
    return `${origin}/community-join?code=${community.code}`;
  }

  function whatsappText(community: CommunitySummary) {
    return `Ciao! Entra nella community "${community.name}" su TraduChat: scriviamo ognuno nella propria lingua con traduzione automatica in tempo reale.\n\nCodice: *${community.code}*\n\nIscriviti su ${shareLink(community)}`;
  }

  function telegramText(community: CommunitySummary) {
    return `Entra nella community "${community.name}" su TraduChat — traduzione automatica in tempo reale. Codice: ${community.code}`;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
      <Toaster />
      <header>
        <h1 className="font-display text-3xl">
          <span className="text-foreground">Community</span>{" "}
          <span className="text-primary">aperta</span>
        </h1>
        <p className="mt-1 text-sm text-primary">
          Chiunque con il codice può entrare e scrivere nella propria lingua.
        </p>
        <AppNav />
      </header>

      {/* Create */}
      <section className="mt-6 rounded-2xl border border-border bg-card p-3 sm:mt-8 sm:p-4">
        <button
          type="button"
          onClick={() => { setShowNew((v) => !v); setShowJoin(false); }}
          aria-expanded={showNew}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-display text-lg"
        >
          <span className="flex items-center gap-2">
            <Globe className="size-5 text-primary" />
            Crea una community
          </span>
          <span className="text-sm font-normal text-accent">{showNew ? "Chiudi" : "Apri"}</span>
        </button>

        {showNew && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome della community"
              maxLength={60}
              className="sm:col-span-3"
            />
            <Select value={langA} onValueChange={(v) => setLangA(v as Language)}>
              <SelectTrigger aria-label="Prima lingua">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={langB} onValueChange={(v) => setLangB(v as Language)}>
              <SelectTrigger aria-label="Seconda lingua">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
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
            <Button className="h-12 sm:col-span-3" onClick={() => void submit()} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
              Crea community
            </Button>
          </div>
        )}
      </section>

      {/* Join */}
      <section className="mt-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
        <button
          type="button"
          onClick={() => { setShowJoin((v) => !v); setShowNew(false); }}
          aria-expanded={showJoin}
          className="flex min-h-11 w-full items-center justify-between gap-2 text-left font-display text-lg"
        >
          <span className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            Entra con un codice
          </span>
          <span className="text-sm font-normal text-accent">{showJoin ? "Chiudi" : "Apri"}</span>
        </button>

        {showJoin && (
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); void joinByCode(); }}
          >
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Codice community (es. ABC12345)"
              maxLength={16}
              className="h-11 flex-1 font-mono tracking-widest"
              autoCapitalize="characters"
            />
            <Button type="submit" className="h-11 px-4" disabled={joining || joinCode.trim().length < 4}>
              {joining ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
              Entra
            </Button>
          </form>
        )}
      </section>

      {/* List */}
      <section className="mt-8">
        <h2 className="font-display text-lg">Le mie community</h2>
        {loading && <p className="mt-2 text-sm text-muted-foreground">Carico…</p>}
        {!loading && communities.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Non hai ancora community: creane una o entra con un codice.
          </p>
        )}

        <ul className="mt-3 space-y-3">
          {communities.map((c) => (
            <li key={c.code} className="overflow-hidden rounded-2xl border border-border bg-card p-3 sm:p-4">
              <div className="-mx-3 -mt-3 mb-3 h-28 bg-gradient-to-r from-primary/30 to-accent/30 sm:-mx-4 sm:-mt-4 sm:h-36">
                {c.coverUrl && (
                  <img src={c.coverUrl} alt={`Copertina di ${c.name}`} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <ParticipantAvatar name={c.name} avatarUrl={c.photoUrl} className="size-16 text-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base">{c.name}</p>
                  {c.theme && (
                    <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Tema: {c.theme}
                    </span>
                  )}
                  {c.topic && <p className="mt-1 text-sm text-foreground">{c.topic}</p>}
                  <p className="text-xs text-muted-foreground">
                    {c.memberCount} {c.memberCount === 1 ? "persona" : "persone"} ·{" "}
                    {c.langA === c.langB ? `solo ${c.langA}` : `${c.langA} ↔ ${c.langB}`}
                  </p>
                  <p className="mt-1 flex items-center gap-1 font-mono text-xs text-muted-foreground">
                    Codice:{" "}
                    <span className="rounded bg-secondary px-1.5 py-0.5 tracking-widest text-foreground">
                      {c.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyCode(c.code)}
                      className="ml-0.5 rounded p-0.5 hover:text-foreground"
                      aria-label="Copia codice"
                    >
                      {copiedCode === c.code ? (
                        <Check className="size-3.5 text-primary" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </p>
                  {c.lastMessage && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">{c.lastMessage}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                  <Link to="/stanza/$code" params={{ code: c.code }}>
                    <Button className="h-11 w-full px-3">
                      <MessageSquare className="size-4" /> Apri
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="h-11 px-3 text-muted-foreground"
                    disabled={busyCode === c.code}
                    onClick={() => void leave(c.code)}
                  >
                    <LogOut className="size-4" /> Esci
                  </Button>
                </div>
              </div>

              <div className="mt-3">
                <CommunityStream code={c.code} mine={c.mine} />
              </div>

              <Button
                variant="outline"
                className="mt-3 h-11 w-full"
                aria-expanded={membersCode === c.code}
                onClick={() => void toggleMembers(c.code)}
              >
                <Users className="size-4" />
                {membersCode === c.code ? "Nascondi partecipanti" : `Partecipanti (${c.memberCount})`}
              </Button>
              {membersCode === c.code && (
                <section aria-label="Partecipanti" className="mt-3 rounded-xl border border-border p-2">
                  {loadingMembers && !membersByCode[c.code] ? (
                    <p className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" /> Carico i partecipanti…
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {(membersByCode[c.code] ?? []).map((m) => (
                        <li key={m.userId} className="flex items-center gap-3 py-2">
                          <div className="relative">
                            <ParticipantAvatar name={m.name} avatarUrl={m.avatarUrl} className="size-11" />
                            {m.online && (
                              <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-card bg-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {m.name}
                              {m.isMe && <span className="text-muted-foreground"> (tu)</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {m.isOwner ? "Creatore · " : ""}
                              {m.online ? "Online" : m.statusVisible ? "Offline" : "Stato nascosto"}
                            </p>
                          </div>
                          {!m.isMe && (
                            <Button
                              size="sm"
                              className="h-11 shrink-0 px-3"
                              disabled={connectingId !== null}
                              onClick={() => void addAsContact(m.userId)}
                            >
                              {connectingId === m.userId ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <UserPlus className="size-4" />
                              )}
                              Aggiungi contatto
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {c.mine && editCode !== c.code && (
                <Button variant="outline" className="mt-3 h-11 w-full" onClick={() => startEdit(c)}>
                  <Pencil className="size-4" /> Modifica profilo (copertina, foto, tema, argomento)
                </Button>
              )}
              {editCode === c.code && (
                <div className="mt-3 grid gap-3 border-t border-border pt-3">
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm hover:bg-secondary">
                    <ImagePlus className="size-4" />
                    {editPhoto ? editPhoto.name : "Scegli la foto della community"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => setEditPhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm hover:bg-secondary">
                    <ImagePlus className="size-4" />
                    {editCover ? editCover.name : "Scegli la copertina"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(e) => setEditCover(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <Input
                    value={editTheme}
                    onChange={(e) => setEditTheme(e.target.value)}
                    placeholder="Tema (es. Viaggi, Cucina, Lavoro)"
                    maxLength={60}
                  />
                  <Textarea
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    placeholder="Argomento: di cosa si parla in questa community?"
                    maxLength={300}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button className="h-11" onClick={() => void submitProfile()} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Salva
                    </Button>
                    <Button variant="ghost" className="h-11" onClick={() => setEditCode(null)}>
                      Annulla
                    </Button>
                  </div>
                </div>
              )}

              {/* Share */}
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(whatsappText(c))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-secondary"
                >
                  <MessageSquare className="size-4" /> Condividi su WhatsApp
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(shareLink(c))}&text=${encodeURIComponent(telegramText(c))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-secondary"
                >
                  <Send className="size-4" /> Condividi su Telegram
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
