import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Loader2,
  Mail,
  MessageSquare,
  Shield,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { AdminDeletionRequests } from "@/components/AdminDeletionRequests";
import { AdminSupportRequests } from "@/components/SupportRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  amIAdmin,
  getAdminDashboardStats,
  grantAdmin,
  listAdminUsers,
  listAdmins,
  revokeAdmin,
  type AdminRoomRow,
  type AdminUserRow,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Dashboard admin — TraduChat" },
      {
        name: "description",
        content: "Panoramica globale di utenti, conversazioni e messaggi su TraduChat.",
      },
      { property: "og:title", content: "Dashboard admin — TraduChat" },
      {
        property: "og:description",
        content: "Panoramica globale di utenti, conversazioni e messaggi su TraduChat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const checkAdmin = useServerFn(amIAdmin);
  const loadStats = useServerFn(getAdminDashboardStats);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState(false);
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalRooms: number;
    totalMessages: number;
    activeRoomsToday: number;
    rooms: AdminRoomRow[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkAdmin({ data: undefined })
      .then((result) => {
        if (cancelled) return;
        setIsAdmin(result.admin);
      })
      .catch(() => setIsAdmin(false));
    return () => {
      cancelled = true;
    };
  }, [checkAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setLoadingStats(true);
    setStatsError(false);
    loadStats({ data: undefined })
      .then((result) => {
        if (cancelled) return;
        setStats(result);
      })
      .catch((error) => {
        if (cancelled) return;
        setStatsError(true);
        toast.error(error instanceof Error ? error.message : "Errore nel caricamento della dashboard.");
      })
      .finally(() => { if (!cancelled) setLoadingStats(false); });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, loadStats]);

  if (isAdmin === null) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center px-4 sm:px-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-6 pt-6 sm:px-6">
        <Toaster position="top-center" />
        <header className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
            <Shield className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Area admin</h1>
            <p className="text-sm text-muted-foreground">Accesso riservato agli amministratori.</p>
          </div>
        </header>
        <AppNav />
        <section className="mt-6 flex flex-1 flex-col items-center justify-center p-8 text-center">
          <Shield className="size-12 text-muted-foreground" />
          <p className="mt-4 font-display text-lg">Accesso riservato</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Chiedi a un amministratore di abilitare il tuo account.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-6 pt-6 sm:px-6">
      <Toaster position="top-center" />
      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
          <LayoutDashboard className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Pannello amministrativo</h1>
          <p className="text-sm text-muted-foreground">Panoramica di TraduChat.</p>
        </div>
      </header>

      <AppNav />

      {loadingStats ? (
        <div className="mt-6 flex flex-1 items-center justify-center p-8">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : statsError || !stats ? (
        <p className="mt-8 text-center text-muted-foreground">Non è stato possibile caricare i dati del pannello.</p>
      ) : (
        <>
          <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Users className="size-5" />}
              label="Utenti registrati"
              value={stats.totalUsers}
            />
            <StatCard
              icon={<LayoutDashboard className="size-5" />}
              label="Conversazioni totali"
              value={stats.totalRooms}
            />
            <StatCard
              icon={<MessageSquare className="size-5" />}
              label="Messaggi totali"
              value={stats.totalMessages}
            />
            <StatCard
              icon={<Mail className="size-5" />}
              label="Conversazioni attive oggi"
              value={stats.activeRoomsToday}
              accent
            />
          </section>

          <section className="mt-8 flex-1">
            <div className="flex items-center justify-between">
              <p className="font-display text-lg">Conversazioni recenti</p>
              <p className="text-xs text-muted-foreground">Ultime {stats.rooms.length} stanze</p>
            </div>
            {stats.rooms.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center text-center">
                <p className="text-muted-foreground">Nessuna conversazione, ancora.</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-border border-y border-border">
                {stats.rooms.map((room) => (
                  <div key={room.code} className="grid gap-2 py-4 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-accent">{room.code}</span>
                        {room.inviteOnly && <span className="rounded bg-muted px-2 py-0.5 text-xs">Privata</span>}
                        <span className="text-muted-foreground">{room.langA} → {room.langB}</span>
                      </div>
                      <p className="mt-1 truncate text-muted-foreground">{room.ownerName ?? room.ownerEmail ?? "Proprietario non disponibile"}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground sm:justify-end">
                      <span>{room.participantCount} partecipanti</span>
                      <span>{room.messageCount} messaggi</span>
                      <span>{room.lastMessageAt ? formatDate(room.lastMessageAt) : "Nessun messaggio"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <UsersSection />
          <AdminsSection />
          <AdminDeletionRequests />
          <AdminSupportRequests />
        </>
      )}
    </main>
  );
}

function UsersSection() {
  const load = useServerFn(listAdminUsers);
  const grant = useServerFn(grantAdmin);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; nickname: string | null; email: string | null; createdAt: string }>>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadPage = useCallback(async (offset: number) => {
    setLoading(true);
    setError(false);
    try {
      const result = await load({ data: { offset } });
      setUsers((current) => offset === 0 ? result.users : [...current, ...result.users]);
      setHasMore(result.hasMore);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { void loadPage(0); }, [loadPage]);

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-accent" />
        <h2 className="font-display text-lg">Utenti registrati</h2>
      </div>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {users.map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-sm">
            <div className="min-w-0">
              <p className="break-words font-medium">{person.name?.trim() || "Nome non impostato"}</p>
              {person.nickname && <p className="break-words text-xs text-accent">@{person.nickname}</p>}
              {person.email && <p className="break-all text-xs text-muted-foreground">{person.email}</p>}
            </div>
            <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{formatDate(person.createdAt)}</span><Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Assegnare accesso admin a ${person.email ?? person.id}?`)) void grant({ data: { userId: person.id } }).then(() => toast.success("Accesso admin assegnato.")).catch(err => toast.error(err.message)); }}><UserPlus className="size-4" />Rendi admin</Button></div>
          </li>
        ))}
      </ul>
      {loading && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento utenti…</p>}
      {error && <p className="mt-4 text-sm text-destructive">Non è stato possibile caricare gli utenti. <Button variant="outline" size="sm" onClick={() => void loadPage(users.length)}>Riprova</Button></p>}
      {!loading && !error && users.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Nessun utente registrato.</p>}
      {!loading && !error && hasMore && <Button variant="outline" className="mt-4" onClick={() => void loadPage(users.length)}>Mostra altri</Button>}
    </section>
  );
}

/** Grant or remove admin access from inside the panel. */
function AdminsSection() {
  const load = useServerFn(listAdmins);
  const grant = useServerFn(grantAdmin);
  const revoke = useServerFn(revokeAdmin);

  const [admins, setAdmins] = useState<AdminUserRow[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    load({ data: undefined })
      .then((result) => setAdmins(result.admins))
      .catch(() => setAdmins([]));
  }, [load]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleGrant() {
    if (busy || !email.trim()) return;
    setBusy(true);
    try {
      await grant({ data: { userId: email } });
      toast.success("Accesso admin assegnato.");
      setEmail("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco ad assegnare l'accesso.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(userId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await revoke({ data: { userId } });
      toast.success("Accesso admin rimosso.");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a rimuovere l'accesso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 border-t border-border pt-6">
      <div className="flex items-center gap-2">
        <Shield className="size-5 text-accent" />
        <p className="font-display text-lg">Amministratori</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Seleziona la persona nell'elenco utenti oppure indica il suo identificativo account.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="text"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Identificativo account"
          className="sm:flex-1"
        />
        <Button onClick={() => void handleGrant()} disabled={busy || !email.trim()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Rendi admin
        </Button>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {(admins ?? []).map((person) => (
          <li key={person.userId} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {person.name ?? person.email ?? "Account"}
                {person.isMe && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">tu</span>
                )}
              </p>
              {person.email && (
                <p className="truncate text-xs text-muted-foreground">{person.email}</p>
              )}
            </div>
            {!person.isMe && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleRevoke(person.userId)}
                disabled={busy}
              >
                <UserMinus className="size-4" />
                Rimuovi
              </Button>
            )}
          </li>
        ))}
        {admins !== null && admins.length === 0 && (
          <li className="py-3 text-sm text-muted-foreground">Nessun amministratore.</li>
        )}
      </ul>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md surface-card p-4",
        accent && "ring-1 ring-accent/30",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-semibold">{value.toLocaleString("it-IT")}</p>
    </div>
  );
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
