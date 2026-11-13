import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Globe, Home, Languages, LogOut, Mail, Settings, Shield, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { registerDeviceSession } from "@/lib/devices.functions";
import { currentDevice, getDeviceSessionId } from "@/lib/device-info";

import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/lib/languages";
import { getPreferredLanguage, setPreferredLanguage } from "@/lib/preferred-language";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { amIAdmin } from "@/lib/admin.functions";
import { getMyProfile, pingPresence } from "@/lib/profile.functions";
import { useServerFn } from "@tanstack/react-start";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const checkAdmin = useServerFn(amIAdmin);
  const loadProfile = useServerFn(getMyProfile);
  const ping = useServerFn(pingPresence);
  const registerDevice = useServerFn(registerDeviceSession);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState<string | null>(null);

  // Reads the saved reading language after hydration (localStorage is browser-only).
  useEffect(() => {
    setLang(getPreferredLanguage());
  }, []);

  // Registers this device in "Dispositivi collegati" (Impostazioni).
  useEffect(() => {
    const device = currentDevice();
    void registerDevice({
      data: { sessionId: getDeviceSessionId(), deviceType: device.type, deviceLabel: device.label },
    }).catch(() => undefined);
  }, [registerDevice]);

  function changeLang(value: string) {
    const next = value === "none" ? null : value;
    setLang(next);
    setPreferredLanguage(next);
    toast.success(next ? `Leggerai i messaggi in ${next}` : "Traduzione automatica nelle chat");
  }
  const [profile, setProfile] = useState({ name: "Profilo", avatarUrl: null as string | null });

  // Presence heartbeat: marks the account online and updates "ultima attività".
  useEffect(() => {
    void ping({ data: undefined }).catch(() => undefined);
    const timer = window.setInterval(() => {
      void ping({ data: undefined }).catch(() => undefined);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [ping]);

  useEffect(() => {
    checkAdmin({ data: undefined })
      .then((result) => setIsAdmin(result.admin))
      .catch(() => setIsAdmin(false));
  }, [checkAdmin]);

  useEffect(() => {
    let active = true;
    void loadProfile({ data: undefined })
      .then((result) => {
        if (!active) return;
        setProfile({
          name: result.profile.nickname?.trim() || result.profile.display_name?.trim() || result.accountEmail || "Profilo",
          avatarUrl: result.avatarUrl,
        });
      })
      .catch(() => undefined);

    function updateAvatar(event: Event) {
      const detail = (event as CustomEvent<{ name?: string; avatarUrl?: string | null }>).detail;
      setProfile((current) => ({
        name: detail?.name?.trim() || current.name,
        avatarUrl: detail?.avatarUrl === undefined ? current.avatarUrl : detail.avatarUrl,
      }));
    }

    window.addEventListener("traduchat:profile-updated", updateAvatar);
    return () => {
      active = false;
      window.removeEventListener("traduchat:profile-updated", updateAvatar);
    };
  }, [loadProfile]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      <Link
        to="/app"
        aria-label="Torna alla home"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-medium text-primary-foreground"
      >
        <Home className="size-4" />
        Torna a Home
      </Link>
      <Link
        to="/app"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        Chat
      </Link>
      <Link
        to="/gruppi"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        <Users className="mr-1 inline size-4" />
        Gruppi
      </Link>
      <Link
        to="/community"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        <Globe className="mr-1 inline size-4" />
        Community
      </Link>
      <Link
        to="/traduzioni"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        Traduzioni
      </Link>
      <Link
        to="/email"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        <Mail className="mr-1 inline size-4" />
        Email
      </Link>
      <Link
        to="/storico"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        <FolderOpen className="mr-1 inline size-4" />
        Storico
      </Link>
      <Link
        to="/impostazioni"
        className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        <Settings className="mr-1 inline size-4" />
        Impostazioni
      </Link>
      <Link

        to="/profilo"
        aria-label="Apri il profilo account"
        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-muted px-4 font-medium text-accent"
        activeProps={{ className: "bg-primary text-primary-foreground" }}
      >
        <ParticipantAvatar
          name={profile.name}
          avatarUrl={profile.avatarUrl}
          className="size-7 ring-1 ring-border"
          online
          dotClassName="size-2.5"
        />
        Profilo
      </Link>
      <div className="flex min-h-11 items-center gap-1 rounded-full bg-muted px-3">
        <Languages className="size-4 text-accent" aria-hidden />
        <Select value={lang ?? "none"} onValueChange={changeLang}>
          <SelectTrigger
            aria-label="Lingua di lettura dei messaggi"
            className="h-11 w-[7.5rem] border-0 bg-transparent px-2 text-sm shadow-none"
          >
            <SelectValue placeholder="Lingua" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Automatica</SelectItem>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isAdmin && (
        <Link
          to="/admin"
          className="inline-flex min-h-11 items-center rounded-full bg-muted px-4 font-medium text-accent"
          activeProps={{ className: "bg-primary text-primary-foreground" }}
        >
          <Shield className="mr-1 inline size-4" />
          Admin
        </Link>
      )}
      <Button
        variant="ghost"
        className="ml-auto min-h-11 text-muted-foreground"
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" /> Esci
      </Button>
    </nav>
  );
}
