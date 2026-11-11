import { useRef, useState } from "react";
import { ArrowLeft, Archive, Camera, Copy, EyeOff, MessageCircle, Save, Settings, Share2, UserPlus, Users, Volume2, X } from "lucide-react";
import { CreateGroup } from "@/components/create-group";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import type { AccountMenu } from "@/lib/use-account-menu";
import { photoError } from "@/lib/profile-rules";
import { compressPhoto } from "@/lib/compress-photo";
import logo from "@/assets/traduchat-logo.png.asset.json";
const languages = ["Italiano", "Inglese", "Spagnolo", "Francese", "Tedesco", "Portoghese", "Cinese", "Giapponese", "Arabo", "Russo"];
export function AccountPanel({ account: a, back, logout, openChat }: { account: AccountMenu; back: () => void; logout: () => void; openChat: (name: string) => void }) {
  const [view, setView] = useState("menu");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(a.profile?.username ?? "");
  const [city, setCity] = useState(a.profile?.city ?? "");
  const [status, setStatus] = useState(a.profile?.status_text ?? "");
  const [language, setLanguage] = useState(a.profile?.my_lang ?? "Italiano");
  const input = useRef<HTMLInputElement>(null);
  const invitation = "https://traduchatchat.com";
  async function run(action: () => Promise<void>, success = "") {
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(success); } catch (e) { setError(e instanceof Error ? e.message : "Operazione non riuscita"); } finally { setBusy(false); }
  }
  function settings() {
    setName(a.profile?.username ?? ""); setCity(a.profile?.city ?? ""); setStatus(a.profile?.status_text ?? ""); setLanguage(a.profile?.my_lang ?? "Italiano"); setView("settings"); setNotice(""); setError("");
  }
  async function upload(file: File) {
    const invalid = photoError(file); if (invalid) { setError(invalid); return; }
    await run(async () => {
      if (!a.profile) throw new Error("Profilo non disponibile");
      file = await compressPhoto(file, "profile");
      const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
      const path = `${a.profile.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const old = a.profile.avatar_path;
      try { await a.save({ avatar_path: path }); } catch (e) { await supabase.storage.from("profile-photos").remove([path]); throw e; }
      const signed = await supabase.storage.from("profile-photos").createSignedUrl(path, 3600);
      if (signed.error) throw signed.error;
      a.setPhoto(signed.data.signedUrl);
      if (old) await supabase.storage.from("profile-photos").remove([old]);
    }, "Foto aggiornata");
  }
  const items = [{ key: "chat", icon: MessageCircle, label: "Chat" }, { key: "archive", icon: Archive, label: "Chat archiviate" }, { key: "group", icon: Users, label: "Crea gruppo" }, { key: "invite", icon: UserPlus, label: "Invita amici" }, { key: "settings", icon: Settings, label: "Impostazioni profilo" }];
  const title = view === "settings" ? "Impostazioni profilo" : view === "archive" ? "Chat archiviate" : view === "group" ? "Crea gruppo" : "Invita amici";
  return <section className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${view === "menu" ? "bg-aurora text-secondary-foreground" : "bg-background text-foreground"}`}>
    <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-6">
      {view !== "menu" ? <><Button variant="ghost" size="icon" aria-label="Indietro al menu" onClick={() => { setView("menu"); setNotice(""); setError(""); }}><ArrowLeft /></Button><h2 className="min-w-0 flex-1 font-display text-lg font-extrabold">{title}</h2></> : <span />}
      <Button variant="ghost" size="icon" aria-label="Chiudi" onClick={back}><X /></Button>
    </header>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Foto personale" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
    {a.loading && <p className="px-8 py-4">Caricamento…</p>}
    {(error || a.error) && <p role="alert" className="mx-6 rounded-md bg-destructive p-3 text-sm text-destructive-foreground">{error || a.error}</p>}
    {notice && <p role="status" className="mx-6 rounded-md bg-primary-light p-3 text-sm text-primary-foreground">{notice}</p>}
    {view === "menu" && <>
      <div className="flex flex-col items-center px-6 text-center">
        <img src={logo.url} alt="Logo TraduChat" className="mb-3 h-10 w-auto" />
        <div className="relative">
          <Button variant="ghost" aria-label="Modifica foto e stato" className="h-24 w-24 overflow-hidden rounded-full bg-accent p-0 text-2xl font-bold text-accent-foreground ring-2 ring-primary" onClick={settings}>
            {a.photo ? <img src={a.photo} alt="Foto profilo" className="h-full w-full object-cover" /> : (a.profile?.username ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
          </Button>
          <button type="button" aria-label="Carica o cambia foto" title="Carica o cambia foto" disabled={busy || !a.profile} onClick={() => input.current?.click()} className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background"><Camera size={14} /></button>
        </div>
        <h2 className="mt-4 break-words font-display text-2xl font-black uppercase text-primary">{a.profile?.username ?? ""}</h2>
        {a.profile?.city && <p className="mt-1 text-sm">{a.profile.city}</p>}
        {a.profile?.status_text && <p className="mt-2 break-words text-sm opacity-80">{a.profile.status_text}</p>}
      </div>
      <nav className="mt-5 space-y-1 px-6">
        {items.map(({ key, icon: Icon, label }) => <Button key={key} variant="ghost" className="h-auto min-h-12 w-full justify-start gap-4 whitespace-normal px-3 py-3 text-left text-base" onClick={() => key === "chat" ? back() : key === "settings" ? settings() : setView(key)}><Icon /><span className="flex-1">{label}</span></Button>)}
        <label className="flex min-h-14 items-center gap-4 px-3 py-3"><EyeOff size={18} /><span className="min-w-0 flex-1 text-base font-medium">Naviga in incognito</span><span className="w-7 text-xs">{a.profile?.incognito ? "On" : "Off"}</span><Switch aria-label="Incognito" disabled={busy || !a.profile} checked={a.profile?.incognito ?? false} onCheckedChange={value => { void run(() => a.save({ incognito: value })); }} /></label>
        <label className="flex min-h-14 items-center gap-4 px-3 py-3"><Volume2 size={18} /><span className="min-w-0 flex-1 text-base font-medium">Bip messaggi</span><span className="w-7 text-xs">{a.beep.enabled ? "On" : "Off"}</span><Switch aria-label="Bip messaggi" disabled={!a.profile} checked={a.beep.enabled} onCheckedChange={a.beep.toggle} /></label>
        {a.beep.enabled && a.beep.browserStatus && a.beep.browserStatus !== "idle" && <p role="status" className="px-3 pb-3 text-sm text-muted-foreground">{a.beep.browserStatus === "granted" ? "Avvisi browser consentiti" : a.beep.browserStatus === "open-in-new-tab" ? "Per consentire gli avvisi, apri TraduChat in una scheda separata e riattiva Bip." : a.beep.browserStatus === "denied" ? "Avvisi bloccati: puoi consentirli nelle impostazioni del browser per questo sito." : a.beep.browserStatus === "unsupported" ? "Questo browser non supporta gli avvisi. Il bip resta disponibile con l’app aperta." : "Avvisi non disponibili. Riprova riattivando Bip."}</p>}
      </nav>
      <a href="/privacy" className="mx-8 mt-4 text-center text-sm underline text-secondary-foreground">Privacy & Dati (GDPR)</a>
      <Button variant="outline" className="mx-8 mb-6 mt-6 shrink-0 border-accent bg-transparent text-secondary-foreground" onClick={logout}>Esci</Button>
    </>}
    {view === "settings" && <form className="flex flex-col gap-5 px-6 pb-8" onSubmit={e => { e.preventDefault(); void run(async () => { if (!name.trim()) throw new Error("Inserisci il tuo nome"); await a.save({ username: name.trim(), city: city.trim(), status_text: status.trim(), my_lang: language }); }, "Profilo salvato"); }}>
      <div className="flex items-center gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-accent-foreground">{a.photo ? <img src={a.photo} alt="Foto personale" className="h-full w-full object-cover" /> : <Camera />}</div><div className="flex flex-col gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={() => input.current?.click()}><Camera /> Cambia foto</Button>{a.photo && <Button type="button" variant="ghost" disabled={busy} onClick={() => void run(async () => { const old = a.profile?.avatar_path; await a.save({ avatar_path: null }); a.setPhoto(""); if (old) await supabase.storage.from("profile-photos").remove([old]); })}>Rimuovi foto</Button>}</div></div>
      <label className="text-sm font-semibold">Nome<input aria-label="Nome" maxLength={80} required value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-card p-3" /></label>
      <label className="text-sm font-semibold">Città<input aria-label="Città" maxLength={100} value={city} onChange={e => setCity(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-card p-3" /></label>
      <label className="text-sm font-semibold">Stato<textarea aria-label="Stato" maxLength={160} value={status} onChange={e => setStatus(e.target.value)} className="mt-2 min-h-20 w-full resize-none rounded-md border border-input bg-card p-3" /></label>
      <label className="text-sm font-semibold">La mia lingua<select aria-label="La mia lingua" value={language} onChange={e => setLanguage(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-card p-3">{languages.map(l => <option key={l}>{l}</option>)}</select></label>
      <Button disabled={busy || !a.profile}><Save /> {busy ? "Salvataggio…" : "Salva profilo"}</Button>
    </form>}
    {view === "archive" && <div className="px-6 pb-8">{a.archived.length === 0 && <div className="py-16 text-center text-muted-foreground"><Archive className="mx-auto mb-4" /><p>Nessuna chat archiviata</p></div>}{a.archived.map(n => <div key={n} className="flex items-center gap-2 border-b border-border py-4"><Button variant="ghost" className="min-w-0 flex-1 justify-start whitespace-normal text-left" onClick={() => openChat(n)}><MessageCircle />{n}</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => void run(() => a.archive(n, false), "Chat ripristinata")}>Ripristina</Button></div>)}</div>}
    {view === "group" && <CreateGroup openChat={openChat} />}
    {view === "invite" && <div className="flex flex-col gap-5 px-6 py-8"><UserPlus size={48} className="self-center text-secondary" /><h3 className="text-center font-display text-xl font-extrabold">Invita un amico su Traduchat</h3><input aria-label="Link di invito" readOnly value={invitation} className="min-w-0 w-full rounded-md border border-input bg-card p-3 text-sm" /><Button disabled={busy} onClick={() => void run(async () => { await navigator.clipboard.writeText(invitation); }, "Link copiato")}><Copy /> Copia link</Button><Button variant="secondary" disabled={busy} onClick={() => void run(async () => { if (navigator.share) { try { await navigator.share({ title: "Traduchat", text: "Unisciti a me su Traduchat!", url: invitation }); } catch (e) { if (e instanceof Error && e.name === "AbortError") return; throw e; } } else { await navigator.clipboard.writeText(invitation); setNotice("Link copiato"); } })}><Share2 /> Condividi invito</Button><Button variant="outline" disabled={busy} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Unisciti a me su TraduChat! Installa l'app da qui: ${invitation}`)}`, "_blank", "noopener,noreferrer")}><MessageCircle /> Invita su WhatsApp</Button></div>}
  </section>;
}
