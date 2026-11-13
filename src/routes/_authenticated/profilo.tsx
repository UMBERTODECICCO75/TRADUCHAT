import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, QrCode, Trash2, UserRound } from "lucide-react";
import QRCode from "qrcode";

import { Switch } from "@/components/ui/switch";

import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, saveMyProfile } from "@/lib/profile.functions";
import { addMyStory, deleteMyStory, listMyStories, type Story } from "@/lib/stories.functions";
import { isOnline, presenceLabel } from "@/lib/presence";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { StatusText } from "@/components/StatusText";
import { StatusPhoto } from "@/components/StatusPhoto";

import { isBillingEmail } from "@/lib/credit-catalog";

const MAX_STATUS_PHOTO_BYTES = 25_000_000;

export const Route = createFileRoute("/_authenticated/profilo")({
  head: () => ({
    meta: [
      { title: "Il mio profilo — TraduChat" },
      {
        name: "description",
        content:
          "Scegli nome e foto con cui appari nelle conversazioni e gestisci email e numero di telefono del tuo account TraduChat.",
      },
      { property: "og:title", content: "Il mio profilo — TraduChat" },
      {
        property: "og:description",
        content: "Nome, foto, email e numero di telefono del tuo account TraduChat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const load = useServerFn(getMyProfile);
  const save = useServerFn(saveMyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [showStatus, setShowStatus] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [myQr, setMyQr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [statusImageUrl, setStatusImageUrl] = useState<string | null>(null);
  const [statusUploading, setStatusUploading] = useState(false);
  const statusFileRef = useRef<HTMLInputElement>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyCaption, setStoryCaption] = useState("");
  const [storyUploading, setStoryUploading] = useState(false);
  const storyFileRef = useRef<HTMLInputElement>(null);
  const loadStoriesFn = useServerFn(listMyStories);
  const addStoryFn = useServerFn(addMyStory);
  const deleteStoryFn = useServerFn(deleteMyStory);
  const [pwStep, setPwStep] = useState<"idle" | "code" | "password">("idle");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwCode, setPwCode] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  useEffect(() => {
    let active = true;
    void load({ data: undefined })
      .then((result) => {
        if (!active) return;
        void loadStoriesFn({ data: undefined })
          .then((r) => {
            if (active) setStories(r.stories);
          })
          .catch(() => undefined);
        setAccountEmail(result.accountEmail);
        setDisplayName(result.profile.display_name ?? "");
        setNickname(result.profile.nickname ?? "");
        setEmail(result.profile.email ?? result.accountEmail ?? "");
        setPhone(result.profile.phone ?? "");
        setStatus(result.profile.status ?? "");
        setShowStatus(result.profile.show_status ?? true);
        setAvatarUrl(result.avatarUrl);
        setStatusImageUrl(result.statusImageUrl);
        setLastSeenAt(result.profile.last_seen_at ?? new Date().toISOString());
        const connectUrl = `${window.location.origin}/connetti/${result.profile.id}`;
        void QRCode.toDataURL(connectUrl, { width: 320, margin: 1 }).then((url) => {
          if (active) setMyQr(url);
        });
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Non riesco a leggere il profilo.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load]);

  async function submit(extra?: {
    avatarPath?: string;
    removeAvatar?: boolean;
    statusImagePath?: string;
    removeStatusImage?: boolean;
  }) {
    setSaving(true);
    try {
      const result = await save({
        data: {
          displayName: displayName.trim(),
          nickname: nickname.trim(),
          email: email.trim(),
          phone: phone.trim(),
          status: status.trim(),
          showStatus,
          ...extra,
        },
      });
      setAvatarUrl(result.avatarUrl);
      setStatusImageUrl(result.statusImageUrl);
      window.dispatchEvent(
        new CustomEvent("traduchat:profile-updated", {
          detail: {
            name: nickname.trim() || displayName.trim() || email.trim() || "Profilo",
            avatarUrl: result.avatarUrl,
          },
        }),
      );
      toast.success("Profilo salvato");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a salvare il profilo.");
    } finally {
      setSaving(false);
    }
  }

  /** Uploads the photo into the person's own folder, then saves the profile. */
  async function uploadPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Scegli un'immagine.");
      return;
    }
    if (file.size > MAX_STATUS_PHOTO_BYTES) {
      toast.error("La foto dello stato è troppo grande: massimo 25 MB.");
      return;
    }
    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessione scaduta, entra di nuovo.");
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw new Error("Non riesco a caricare la foto.");
      await submit({ avatarPath: path });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a caricare la foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  /** Uploads the photo shown next to the status, into the person's own folder. */
  async function uploadStatusPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Scegli un'immagine.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("La foto è troppo grande: massimo 3 MB.");
      return;
    }
    setStatusUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessione scaduta, entra di nuovo.");
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("status-photos")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw new Error("Non riesco a caricare la foto.");
      await submit({ statusImagePath: path });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a caricare la foto.");
    } finally {
      setStatusUploading(false);
      if (statusFileRef.current) statusFileRef.current.value = "";
    }
  }

  /** Uploads a story photo (visible to contacts for 24 hours) with an optional caption. */
  async function uploadStoryPhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Scegli un'immagine.");
      return;
    }
    if (file.size > MAX_STATUS_PHOTO_BYTES) {
      toast.error("La foto è troppo grande: massimo 25 MB.");
      return;
    }
    setStoryUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Sessione scaduta, entra di nuovo.");
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${userId}/story-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("status-photos")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw new Error("Non riesco a caricare la foto.");
      await addStoryFn({ data: { imagePath: path, caption: storyCaption.trim() } });
      setStoryCaption("");
      const r = await loadStoriesFn({ data: undefined });
      setStories(r.stories);
      toast.success("Storia pubblicata: i tuoi contatti la vedono per 24 ore.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a pubblicare la storia.");
    } finally {
      setStoryUploading(false);
      if (storyFileRef.current) storyFileRef.current.value = "";
    }
  }

  async function removeStory(id: string) {
    try {
      await deleteStoryFn({ data: { id } });
      setStories((prev) => prev.filter((s) => s.id !== id));
      toast.success("Storia eliminata.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a eliminare la storia.");
    }
  }

  /** Sends a 6-digit email code, then lets the person set a new password. */
  async function sendPasswordCode() {
    const target = accountEmail?.trim();
    if (pwBusy) return;
    if (!isBillingEmail(target)) {
      toast.error("Questo account usa il codice telefonico. Accedi tramite SMS o chiamata.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: target,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setPwCode("");
      setPwStep("code");
      toast.success("Codice inviato! Controlla la tua email.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invio del codice non riuscito.");
    } finally {
      setPwBusy(false);
    }
  }

  async function verifyPasswordCode() {
    if (pwBusy) return;
    const target = accountEmail?.trim();
    if (!target || !/^\d{6}$/.test(pwCode.trim())) {
      toast.error("Inserisci il codice a 6 cifre ricevuto per email.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: target,
        token: pwCode.trim(),
        type: "email",
      });
      if (error) throw error;
      setPwStep("password");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Codice non valido.");
    } finally {
      setPwBusy(false);
    }
  }

  async function savePassword() {
    if (pwBusy) return;
    if (pwNew.length < 8) {
      toast.error("La nuova password deve avere almeno 8 caratteri.");
      return;
    }
    if (pwNew !== pwConfirm) {
      toast.error("Le due password non coincidono.");
      return;
    }
    setPwBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwNew });
      if (error) throw error;
      setPwNew("");
      setPwConfirm("");
      setPwCode("");
      setPwStep("idle");
      toast.success("Password aggiornata!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Non riesco a cambiare la password.");
    } finally {
      setPwBusy(false);
    }
  }

  const initial = (nickname.trim() || displayName.trim() || email || "?").charAt(0).toUpperCase();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 pb-10 pt-6 sm:px-6">
      <Toaster position="top-center" />

      <header className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground bubble-shadow">
          <UserRound className="size-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl">Il mio profilo</h1>
          <p className="text-sm text-muted-foreground">
            {accountEmail ? `Account: ${accountEmail}` : "I tuoi dati di contatto."}
          </p>
        </div>
      </header>

      <AppNav />

      <section className="mt-5 space-y-4 rounded-3xl surface-card p-5">
        {loading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <span className="relative inline-block shrink-0" title={presenceLabel(lastSeenAt)}>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="La tua foto profilo"
                    className="size-20 rounded-full object-cover bubble-shadow"
                  />
                ) : (
                  <span className="flex size-20 items-center justify-center rounded-full bg-secondary font-display text-2xl text-secondary-foreground">
                    {initial}
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className={
                    "absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-card " +
                    (isOnline(lastSeenAt) ? "bg-green-500" : "bg-muted-foreground/40")
                  }
                />
              </span>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  La tua foto e il tuo nome appaiono tra i partecipanti alla conversazione.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading || saving}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                    {avatarUrl ? "Cambia foto" : "Carica foto"}
                  </Button>
                  {avatarUrl && (
                    <Button
                      variant="ghost"
                      aria-label="Rimuovi la foto"
                      onClick={() => void submit({ removeAvatar: true })}
                      disabled={uploading || saving}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Nome visibile</Label>
              <Input
                id="profile-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Maria Rossi"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-nickname">Nickname</Label>
              <Input
                id="profile-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="es. Maria_82"
                maxLength={24}
                autoComplete="nickname"
              />
              <p className="text-xs text-muted-foreground">Facoltativo e unico. Da 3 a 24 lettere, numeri o _; appare nelle conversazioni.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-email">Email di contatto</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@esempio.it"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profile-phone">Telefono di contatto</Label>
              <Input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 333 1234567"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <span
                aria-hidden="true"
                className={
                  "size-2.5 rounded-full " +
                  (isOnline(lastSeenAt) ? "bg-green-500" : "bg-muted-foreground/40")
                }
              />
              <span className="text-muted-foreground">
                Sei {isOnline(lastSeenAt) ? "in linea" : "offline"} — {presenceLabel(lastSeenAt)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profile-status">Stato</Label>
              <Input
                id="profile-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="es. riunione #lavoro https://esempio.it"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                {status.length}/100 caratteri. Appare sotto il tuo nome nella chat. Link e
                hashtag diventano cliccabili.
              </p>
              {status.trim() && (
                <p className="text-xs">
                  <StatusText text={status} className="text-muted-foreground" />
                </p>
              )}
            </div>
            <div className="space-y-2 rounded-2xl bg-muted p-3">
              <Label className="text-sm">Foto dello stato</Label>
              <p className="text-xs text-muted-foreground">
                 Appare accanto al tuo stato nei contatti e tra i partecipanti. Massimo 25 MB.
              </p>
              <div className="flex items-center gap-3">
                <StatusPhoto
                  url={statusImageUrl}
                  className="size-16 rounded-xl border border-border/60 object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => statusFileRef.current?.click()}
                    disabled={statusUploading || saving}
                  >
                    {statusUploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                    {statusImageUrl ? "Cambia foto" : "Aggiungi foto"}
                  </Button>
                  {statusImageUrl && (
                    <Button
                      variant="ghost"
                      aria-label="Rimuovi la foto dello stato"
                      onClick={() => void submit({ removeStatusImage: true })}
                      disabled={statusUploading || saving}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
              <input
                ref={statusFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadStatusPhoto(file);
                }}
              />
            </div>
            <div className="space-y-2 rounded-2xl bg-muted p-3">
              <Label className="text-sm">Le mie storie</Label>
              <p className="text-xs text-muted-foreground">
                Una foto con una frase, visibile ai tuoi contatti per 24 ore. Massimo 25 MB.
              </p>
              <Input
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                placeholder="Scrivi una frase per la storia (facoltativo)"
                maxLength={200}
              />
              <Button
                variant="secondary"
                onClick={() => storyFileRef.current?.click()}
                disabled={storyUploading || saving}
              >
                {storyUploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Aggiungi una storia
              </Button>
              <input
                ref={storyFileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadStoryPhoto(file);
                }}
              />
              {stories.length > 0 && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {stories.map((story) => (
                    <div key={story.id} className="relative">
                      {story.imageUrl && (
                        <img
                          src={story.imageUrl}
                          alt={story.caption || "La tua storia"}
                          className="aspect-square w-full rounded-xl border border-border/60 object-cover"
                        />
                      )}
                      {story.caption && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {story.caption}
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Elimina la storia"
                        className="absolute right-1 top-1 size-8 rounded-full bg-card/80"
                        onClick={() => void removeStory(story.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted p-3">
              <div className="space-y-0.5">
                <Label htmlFor="show-status" className="text-sm">
                  Mostra il mio stato agli altri
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se spento, nessuno vede la tua barretta di stato.
                </p>
              </div>
              <Switch
                id="show-status"
                checked={showStatus}
                onCheckedChange={setShowStatus}
              />
            </div>
            <Button onClick={() => void submit()} disabled={saving || uploading}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Salva
            </Button>
          </>
        )}
      </section>

      <section className="mt-5 space-y-4 rounded-3xl surface-card p-5">
        <div className="flex items-center gap-2">
          <QrCode className="size-5 text-primary" />
          <h2 className="font-display text-lg">Il mio QR personale</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Fai inquadrare questo codice con la fotocamera dell'altro telefono: si apre subito la
          conversazione privata tra voi due, già tradotta.
        </p>
        {myQr ? (
          <div className="flex justify-center rounded-2xl bg-white p-4">
            <img src={myQr} alt="Il tuo QR code personale per connetterti in chat" className="size-48" />
          </div>
        ) : (
          <div className="flex justify-center py-6">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </section>

      <section className="mt-5 space-y-4 rounded-3xl surface-card p-5">
        <div>
          <h2 className="font-display text-lg">Cambia password</h2>
          <p className="text-sm text-muted-foreground">
            Ti inviamo un codice a 6 cifre per email, poi scegli la nuova password.
          </p>
        </div>

        {pwStep === "idle" && (
          <Button variant="secondary" onClick={() => void sendPasswordCode()} disabled={pwBusy}>
            {pwBusy && <Loader2 className="size-4 animate-spin" />}
            Invia codice per email
          </Button>
        )}

        {pwStep === "code" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw-code">Codice a 6 cifre</Label>
              <Input
                id="pw-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={pwCode}
                onChange={(e) => setPwCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void verifyPasswordCode()} disabled={pwBusy}>
                {pwBusy && <Loader2 className="size-4 animate-spin" />}
                Verifica codice
              </Button>
              <Button variant="ghost" onClick={() => void sendPasswordCode()} disabled={pwBusy}>
                Invia di nuovo
              </Button>
            </div>
          </>
        )}

        {pwStep === "password" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="pw-new">Nuova password</Label>
              <Input
                id="pw-new"
                type="password"
                autoComplete="new-password"
                value={pwNew}
                onChange={(e) => setPwNew(e.target.value)}
                placeholder="Almeno 8 caratteri"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw-confirm">Ripeti la nuova password</Label>
              <Input
                id="pw-confirm"
                type="password"
                autoComplete="new-password"
                value={pwConfirm}
                onChange={(e) => setPwConfirm(e.target.value)}
                placeholder="Ripeti la password"
              />
            </div>
            <Button onClick={() => void savePassword()} disabled={pwBusy}>
              {pwBusy && <Loader2 className="size-4 animate-spin" />}
              Salva nuova password
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
