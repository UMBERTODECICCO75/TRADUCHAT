import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  LogOut,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  Search,
  Smartphone,
  Trash2,
  Sparkles,
  Sun,
  Tablet,
  Type,
  User,
  Users,
  Watch,
  X,
} from "lucide-react";

import { AppNav } from "@/components/AppNav";
import { ContactMicButton } from "@/components/ContactMicButton";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { listMyParticipants, removeContact } from "@/lib/rooms.functions";
import { toast } from "sonner";
import { applyTheme, readTheme, saveTheme, type Theme } from "@/lib/theme";
import { applyFontPreference, readFontPreference, saveFontPreference, type FontPreference } from "@/lib/font-preference";
import { whatsappLink } from "@/lib/whatsapp";
import { StatusText } from "@/components/StatusText";
import { StatusPhoto } from "@/components/StatusPhoto";
import { getDeviceSessionId } from "@/lib/device-info";
import { AccountDeletionRequest } from "@/components/AccountDeletionRequest";
import { ChangePassword } from "@/components/ChangePassword";
import { SupportRequestForm } from "@/components/SupportRequests";
import {
  listDeviceSessions,
  removeDeviceSession,
  type DeviceSession,
} from "@/lib/devices.functions";

export const Route = createFileRoute("/_authenticated/impostazioni")({
  head: () => ({
    meta: [
      { title: "Impostazioni — TraduChat" },
      {
        name: "description",
        content: "Cambia tema chiaro o scuro, apri i tuoi contatti, l'email e il profilo.",
      },
      { property: "og:title", content: "Impostazioni — TraduChat" },
      {
        property: "og:description",
        content: "Tema chiaro o scuro, contatti, email e profilo di TraduChat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

type Contact = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phone?: string | null;
  status?: string | null;
  statusImageUrl?: string | null;
  roomCode: string;
  langA?: string | undefined;
  langB?: string | undefined;
};

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  computer: Monitor,
  tablet: Tablet,
  telefono: Smartphone,
  orologio: Watch,
};

function DeviceIcon({ type }: { type: string }) {
  const Icon = DEVICE_ICONS[type] ?? Monitor;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-accent">
      <Icon className="size-5" />
    </span>
  );
}

function formatDeviceDate(value: string) {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadContacts = useServerFn(listMyParticipants);
  const [theme, setTheme] = useState<Theme>("light");
  const [font, setFont] = useState<FontPreference>("original");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const loadDevices = useServerFn(listDeviceSessions);
  const disconnectDeviceFn = useServerFn(removeDeviceSession);
  const removeContactFn = useServerFn(removeContact);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    const current = readTheme();
    setTheme(current);
    applyTheme(current);
    const currentFont = readFontPreference();
    setFont(currentFont);
    applyFontPreference(currentFont);
  }, []);

  useEffect(() => {
    void loadContacts({ data: undefined })
      .then((result) => setContacts(result.participants as Contact[]))
      .catch(() => undefined);
  }, [loadContacts]);

  useEffect(() => {
    setCurrentSessionId(getDeviceSessionId());
  }, []);

  useEffect(() => {
    void loadDevices({ data: undefined })
      .then((result) => setDevices(result.sessions))
      .catch(() => undefined);
  }, [loadDevices]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.status && c.status.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)),
        )
      : contacts.slice();
    return list.sort((a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" }));
  }, [contacts, search]);

  function chooseTheme(next: Theme) {
    setTheme(next);
    saveTheme(next);
  }

  function chooseFont(next: FontPreference) {
    setFont(next);
    saveFontPreference(next);
  }

  async function disconnectDevice(id: string) {
    try {
      await disconnectDeviceFn({ data: { sessionId: id } });
      setDevices((list) => list.filter((d) => d.id !== id));
    } catch {
      // ignora errori di rete
    }
  }

  async function removeOneContact(userId: string, name: string) {
    setRemovingId(userId);
    try {
      await removeContactFn({ data: { userId } });
      setContacts((list) => list.filter((c) => c.userId !== userId));
      await queryClient.invalidateQueries();
      toast.success(`${name} è stato cancellato dai contatti.`);
    } catch {
      toast.error("Non riesco a cancellare il contatto. Riprova.");
    } finally {
      setRemovingId(null);
    }
  }

  async function signOut() {
    if (currentSessionId) {
      try {
        await disconnectDeviceFn({ data: { sessionId: currentSessionId } });
      } catch {
        // il dispositivo resta in elenco se la richiesta non va a buon fine
      }
    }
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4 sm:px-6">
      <AppNav />

      <h1 className="mt-6 font-display text-2xl sm:text-3xl">Impostazioni</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Scegli l'aspetto dell'app, apri i tuoi contatti, l'email o il profilo.
      </p>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="font-display text-lg">Aspetto</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tema chiaro con sfondo bianco e testi verde scuro, tema scuro oppure tema viola con sfondo bianco e scritta nera.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            variant={theme === "light" ? "default" : "outline"}
            className="h-12"
            aria-pressed={theme === "light"}
            onClick={() => chooseTheme("light")}
          >
            <Sun className="size-4" /> Chiaro
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "outline"}
            className="h-12"
            aria-pressed={theme === "dark"}
            onClick={() => chooseTheme("dark")}
          >
            <Moon className="size-4" /> Scuro
          </Button>
          <Button
            variant={theme === "purple" ? "default" : "outline"}
            className="h-12"
            aria-pressed={theme === "purple"}
            onClick={() => chooseTheme("purple")}
          >
            <Sparkles className="size-4" /> Viola
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg"><Type className="size-4 text-accent" /> Carattere di scrittura</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Scegli il carattere di scrittura">
          <Button variant={font === "original" ? "default" : "outline"} aria-pressed={font === "original"} className="h-auto min-h-14 whitespace-normal text-base font-sans" onClick={() => chooseFont("original")}>Originale</Button>
          <Button variant={font === "lineare" ? "default" : "outline"} aria-pressed={font === "lineare"} className="h-auto min-h-14 whitespace-normal font-[Arial,Helvetica,sans-serif] text-base" onClick={() => chooseFont("lineare")}>Lineare</Button>
          <Button variant={font === "classico" ? "default" : "outline"} aria-pressed={font === "classico"} className="h-auto min-h-14 whitespace-normal font-[Georgia,serif] text-base" onClick={() => chooseFont("classico")}>Classico</Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="font-display text-lg">Scorciatoie</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <Button asChild variant="outline" className="h-12 justify-start">
            <Link to="/email">
              <Mail className="size-4 text-accent" /> Email
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 justify-start">
            <Link to="/profilo">
              <User className="size-4 text-accent" /> Profilo
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start text-muted-foreground"
            onClick={() => void signOut()}
          >
            <LogOut className="size-4" /> Esci
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Users className="size-4 text-accent" /> Contatti
          <span className="text-sm font-normal text-muted-foreground">
            ({filtered.length}/{contacts.length})
          </span>
        </p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, stato o numero..."
            aria-label="Cerca contatto"
            className="h-11 pl-9"
          />
        </div>

        {contacts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Non hai ancora contatti. Entra in una conversazione o in un gruppo.
          </p>
        ) : filtered.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessun contatto corrisponde alla ricerca.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {filtered.map((c) => {
              const wa = whatsappLink(c.phone);
              return (
                <li
                  key={c.userId}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <ParticipantAvatar
                    name={c.name}
                    avatarUrl={c.avatarUrl}
                    className="size-11 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/stanza/$code"
                      params={{ code: c.roomCode }}
                      className="block min-w-0 truncate text-sm font-semibold hover:text-accent"
                    >
                      {c.name}
                    </Link>
                    {c.status && (
                      <p className="truncate text-xs text-muted-foreground">
                        <StatusText text={c.status} />
                      </p>
                    )}
                    {c.statusImageUrl && (
                      <StatusPhoto url={c.statusImageUrl} name={c.name} className="mt-1 size-12 rounded-lg border border-border/60 object-cover" />
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <ContactMicButton
                      name={c.name}
                      roomCode={c.roomCode}
                      langA={c.langA ?? "Italiano"}
                      langB={c.langB ?? "Inglese"}
                    />
                    {wa && (
                      <Button asChild variant="ghost" size="icon" className="size-10">
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Scrivi a ${c.name} su WhatsApp`}
                          title="WhatsApp"
                        >
                          <MessageCircle className="size-4 text-accent" />
                        </a>
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label={`Cancella ${c.name} dai contatti`}
                          disabled={removingId === c.userId}
                        >
                          <Trash2 className="size-4 text-muted-foreground" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancellare {c.name} dai contatti?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Sparisce dall'elenco contatti ed esci anche dalle conversazioni condivise.
                            La chat e i messaggi restano agli altri partecipanti.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annulla</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void removeOneContact(c.userId, c.name)}
                          >
                            Cancella
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-3xl surface-card p-4">
        <p className="flex items-center gap-2 font-display text-lg">
          <Monitor className="size-4 text-accent" /> Dispositivi collegati
          <span className="text-sm font-normal text-muted-foreground">({devices.length})</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Computer, tablet, Mac e orologi su cui hai aperto TraduChat. Un dispositivo non visto da più di un mese si scollega da solo.
        </p>
        {devices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessun altro dispositivo collegato a questo account.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {devices.map((d) => {
              const current = d.id === currentSessionId;
              return (
                <li
                  key={d.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <DeviceIcon type={d.deviceType} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.deviceLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Ultimo accesso: {formatDeviceDate(d.lastSeenAt)}
                      {current ? " · questo dispositivo" : ""}
                    </p>
                  </div>
                  {!current && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10"
                      aria-label={`Scollega ${d.deviceLabel}`}
                      onClick={() => void disconnectDevice(d.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <ChangePassword />
      <AccountDeletionRequest />
      <SupportRequestForm />
    </main>
  );
}
