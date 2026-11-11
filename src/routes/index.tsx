import { CookieSettingsLink } from "@/components/cookie-banner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { translateText } from "@/lib/translate.functions";
import { translateVoice } from "@/lib/voice.functions";
import { TRANSLATION_LANGUAGES, languageCode } from "@/lib/languages";
import { recordWav } from "@/lib/record-wav";
import { PeerCallsProvider, usePeerCalls } from "@/components/peer-calls";
import { VideoRoomsPanel } from "@/components/video-rooms-panel";
import { cameraConversations, loadCameraTranslations } from "@/lib/camera-translations";
import {
  applyTranslation, applyTranslationError, canTranslate, findMsgIndex, keepLocal, markTranslating, msgKey,
  sameMessages, translationLabel, type LocalPatch, type Msg,
} from "@/lib/chat-messages";
import { TranslationCache, needsTranslation } from "@/lib/translation-cache";

// Translations already obtained in this browser session: repeats are instant, no server round-trip.
const clientTranslations = new TranslationCache(300);
// Translations already on their way (e.g. started while typing): sending reuses them.
const clientPending = new Map<string, Promise<{ ok: true; translation: string } | { ok: false; error: string }>>();
import { supabase } from "@/integrations/supabase/client";
import { AccountPanel } from "@/components/account-panel";
import { useAccountMenu, type AccountMenu } from "@/lib/use-account-menu";
import { filterArchived } from "@/lib/profile-rules";
import { chatPhotoError, deleteChatPhoto, loadChatPhotos, sendChatPhoto } from "@/lib/chat-photos";
import { deleteChatMessage, sendTranslatedVoice, loadChatMessages, loadConversations, sendChatMessage, type Conversation } from "@/lib/chat-text";
import { Button } from "@/components/ui/button";
import { Avatar, MyAvatar } from "@/components/avatar";
import { ContactList, ContactsPanel } from "@/components/contacts-panel";
import { lovable } from "@/integrations/lovable/index";
import logo from "@/assets/traduchat-logo.png.asset.json";
import {
  ArrowLeft, Bell, Camera, Languages, Menu, Mic, MoreVertical, Paperclip,
  Phone, PhoneIncoming, PhoneMissed, Plus, Search, Send, Settings, UserPlus, Archive, EyeOff, Video, X, Volume2, Square,
  Trash2, Users,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Traduchat — Chatta in ogni lingua" },
      { name: "description", content: "Chat, chiamate e videochiamate con traduzione automatica nella lingua che preferisci." },
      { property: "og:title", content: "Traduchat — Chatta in ogni lingua" },
      { property: "og:description", content: "Chat, chiamate e videochiamate con traduzione automatica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: App,
});

type Screen = "splash" | "login" | "home" | "chat" | "profile";
type Tab = "chiamate" | "chat" | "contatti";


const LANGS: string[] = [...TRANSLATION_LANGUAGES];


function App() {
  return <PeerCallsProvider><AppContent /></PeerCallsProvider>;
}

function AppContent() {
  const [userId, setUserId] = useState<string | null>(null);
  const account = useAccountMenu(userId);
  const [chatName, setChatName] = useState("Milly Rosa");
  const [screen, setScreen] = useState<Screen>("splash");
  useEffect(() => {
    let active = true;
    let identityChanged = false;
    const { data: sub } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "SIGNED_IN" && session) {
        identityChanged = true;
        setUserId(session.user.id);
        setScreen((s) => (s === "login" || s === "splash" ? "home" : s));
      }
      if (ev === "SIGNED_OUT") {
        identityChanged = true;
        setUserId(null);
        setChatOpen(false);
        setScreen("login");
      }
    });
    void supabase.auth.getUser().then(({ data }) => {
      if (!active || identityChanged) return;
      setUserId(data.user?.id ?? null);
      if (data.user) setScreen("home");
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);
  const [desktop, setDesktop] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mql.matches);
    on(); mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  const inApp = screen === "home" || screen === "chat" || screen === "profile";
  if (desktop && inApp) {
    const open = (name: string) => { setChatName(name); setChatOpen(true); if (screen === "chat") setScreen("home"); };
    return (
      <div className="presentation-app presentation-workspace flex h-dvh bg-muted p-4">
        <div className="presentation-shell flex h-full w-full overflow-hidden rounded-3xl bg-aurora shadow-2xl">
          <aside className="relative flex h-full w-[400px] shrink-0 flex-col overflow-hidden border-r border-border">
            {screen === "profile"
              ? <AccountPanel account={account} back={() => setScreen("home")} openChat={(n) => { open(n); setScreen("home"); }} logout={() => { void supabase.auth.signOut(); }} />
              : <Home account={account} openChat={open} openProfile={() => setScreen("profile")} />}
          </aside>
          <section className="relative flex min-w-0 flex-1 flex-col">
            {chatOpen ? <Chat key={chatName} name={chatName} back={() => setChatOpen(false)} /> : (
              <div className="flex flex-1 flex-col items-center justify-center bg-transparent p-10 text-center text-secondary-foreground">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground"><Languages size={48} /></div>
                <h1 className="presentation-brand font-display text-4xl font-extrabold">TRADUCHAT<sup className="align-super text-[0.42em] font-bold">®</sup></h1>
                <p className="mt-3 max-w-md opacity-80">Seleziona una conversazione a sinistra per iniziare a chattare, chiamare e tradurre nella lingua che preferisci.</p>
              </div>
            )}
          </section>
        </div>
        <p className="fixed bottom-1 left-1/2 z-50 -translate-x-1/2 presentation-legal rounded-full px-3 py-1 text-[10px] font-semibold"><a href="/privacy" className="underline">Privacy</a> · <CookieSettingsLink /></p>
      </div>
    );
  }
  return (
    <div className="presentation-app flex min-h-dvh items-center justify-center sm:py-8">
      <div className="presentation-shell relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-aurora sm:h-[min(860px,calc(100dvh-4rem))] sm:rounded-[2rem] sm:shadow-2xl">
        {screen === "splash" && <Splash onNext={() => setScreen("login")} />}
        {screen === "login" && <Login onLogin={() => setScreen("home")} />}
        {screen === "home" && <Home account={account} openChat={(name) => { setChatName(name); setScreen("chat"); }} openProfile={() => setScreen("profile")} />}
        {screen === "chat" && <Chat key={chatName} name={chatName} back={() => setScreen("home")} />}
        {screen === "profile" && <AccountPanel account={account} back={() => setScreen("home")} openChat={(name) => { setChatName(name); setScreen("chat"); }} logout={() => { void supabase.auth.signOut(); }} />}
      </div>
      {screen !== "chat" && <p className="fixed bottom-1 left-1/2 z-50 -translate-x-1/2 presentation-legal rounded-full px-3 py-1 text-[10px] font-semibold"><a href="/privacy" className="underline">Privacy</a> · <CookieSettingsLink /></p>}
    </div>
  );
}

function Splash({ onNext }: { onNext: () => void }) {
  const slides = [
    { h: "Hello!", t: "Benvenuto su Traduchat", d: "Comunicare non è mai stato così facile. Scegli la lingua che preferisci!" },
    { h: "Ciao!", t: "Chatta con chi vuoi, nella lingua che vuoi", d: "Accorcia le distanze: parla con chiunque con un semplice click." },
    { h: "¡Hola!", t: "Utilizza la videochiamata", d: "Attiva i sottotitoli nella lingua che preferisci, Traduchat farà il resto!" },
  ];
  const [i, setI] = useState(0);
  const s = slides[i] ?? slides[0];
  if (!s) return null;
  return (
    <div className="flex flex-1 flex-col bg-transparent p-8 text-secondary-foreground">
      <button onClick={onNext} className="self-end text-sm opacity-80">Skip</button>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img src={logo.url} alt="Logo TraduChat" className="mb-8 h-28 w-auto" />
        <h1 className="font-display text-5xl font-black text-primary">{s.h}</h1>
        <h2 className="mt-4 font-display text-2xl font-extrabold">{s.t}</h2>
        <p className="mt-3 opacity-80">{s.d}</p>
      </div>
      <div className="mb-6 flex justify-center gap-2">
        {slides.map((_, k) => <span key={k} className={`h-2 rounded-full transition-all ${k === i ? "w-6 bg-primary" : "w-2 bg-accent"}`} />)}
      </div>
      <button onClick={() => (i < 2 ? setI(i + 1) : onNext())}
        className="rounded-full bg-brand py-4 font-display text-lg font-extrabold text-brand-foreground">
        {i < 2 ? "Avanti" : "Inizia"}
      </button>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<"login" | "forgot" | "code">("login");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const input = "w-full rounded-full border border-input bg-card px-5 py-3.5 outline-none focus:ring-2 focus:ring-ring";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMode("code");
        setMsg({ ok: true, t: "Ti abbiamo inviato un codice via e-mail. Inseriscilo qui sotto con la nuova password." });
      } else if (mode === "code") {
        const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "recovery" });
        if (error) throw new Error("Codice errato o scaduto");
        const { error: e2 } = await supabase.auth.updateUser({ password });
        if (e2) throw new Error("Impossibile salvare la nuova password");
        onLogin();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(error.message.includes("confirm") ? "Conferma prima la tua e-mail" : "E-mail o password errati");
        onLogin();
      }
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    setBusy(false);
  };

  const social = async (p: "google" | "apple") => {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin });
    if (r.error) setMsg({ ok: false, t: "Accesso non riuscito, riprova" });
    else if (!r.redirected) onLogin();
  };

  return (
    <div className="presentation-login flex flex-1 flex-col overflow-y-auto">
      <div className="presentation-login-header px-8 pb-8 pt-16 text-center">
        <img src={logo.url} alt="Logo TraduChat" className="mx-auto mb-4 h-20 w-auto" />
        <h1 className="presentation-brand font-display text-4xl font-extrabold">TRADUCHAT<sup className="align-super text-[0.42em] font-bold">®</sup></h1>
        <p className="mt-2 text-sm text-secondary-foreground opacity-80">
          {mode === "forgot" || mode === "code" ? "Recupera la password" : "Bentornato!"}</p>
      </div>
      <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4 p-8">
        <label className="space-y-2 text-sm font-semibold">E-mail<input className={input} placeholder="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        {mode === "code" && <input className={input} placeholder="Codice ricevuto via e-mail" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} required />}
        {mode !== "forgot" && <label className="space-y-2 text-sm font-semibold">{mode === "code" ? "Nuova password" : "Password"}<input className={input} placeholder={mode === "code" ? "Nuova password" : "Password"} autoComplete={mode === "login" ? "current-password" : "new-password"} type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>}
        {mode === "login" && <Button variant="link" type="button" onClick={() => setMode("forgot")} className="self-end text-sm text-muted-foreground">Password dimenticata?</Button>}
        {msg && <p className={`rounded-2xl px-4 py-3 text-sm ${msg.ok ? "bg-primary-light" : "bg-destructive text-destructive-foreground"}`}>{msg.t}</p>}
        <Button type="submit" disabled={busy} className="mt-2 h-auto rounded-full bg-brand py-4 font-display text-lg font-extrabold text-brand-foreground hover:bg-brand/90">
          {busy ? "..." : mode === "forgot" ? "INVIA CODICE →" : mode === "code" ? "CONFERMA →" : "LOGIN →"}
        </Button>
        {mode !== "forgot" && mode !== "code" && (
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={() => social("google")} className="flex-1 rounded-full py-3 font-semibold">Google</Button>
            <Button variant="outline" type="button" onClick={() => social("apple")} className="flex-1 rounded-full py-3 font-semibold">Apple</Button>
          </div>
        )}
        <p className="mt-auto text-center text-sm text-muted-foreground">
          {mode === "login" ? "Non hai un account? " : "Ricordi la password? "}
          {mode === "login"
            ? <Link to="/registrati" className="font-bold text-accent underline">Registrati</Link>
            : <Button variant="link" type="button" onClick={() => { setMode("login"); setMsg(null); }} className="font-bold text-accent underline">Login</Button>}
        </p>
      </form>
    </div>
  );
}

export function Home({ openChat, openProfile, account }: { openChat: (name: string) => void; openProfile: () => void; account: AccountMenu }) {
  const peerCalls = usePeerCalls();
  const contacts = peerCalls.people;
  const [convs, setConvs] = useState<Conversation[]>([]);
  useEffect(() => {
    const userId = peerCalls.userId;
    if (!userId) return;
    let active = true;
    const names = Object.fromEntries(contacts.map(c => [c.id, c.name]));
    const refresh = () => { void loadConversations(userId, names).then(rows => { if (active) setConvs(rows); }).catch(() => {}); };
    refresh(); const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [peerCalls.userId, contacts]);
  const [archiveError, setArchiveError] = useState("");
  const [tab, setTab] = useState<Tab>("chat");
  const [panel, setPanel] = useState<"none" | "contatti">("none");
  const [q, setQ] = useState("");
  const openCall = (name: string, mode: "audio" | "video") => { setPanel("none"); peerCalls.start(name, mode); };
  const f = (n: string) => n.toLowerCase().includes(q.toLowerCase());
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="presentation-header px-5 pb-5 pt-8 text-secondary-foreground">
        <div className="flex items-center justify-between">
          <div>
            <img src={logo.url} alt="Logo TraduChat" className="mb-1 h-8 w-auto" />
            <h1 className="presentation-brand font-display text-2xl font-extrabold">TRADUCHAT<sup className="align-super text-[0.45em] font-bold">®</sup></h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" aria-label="Apri contatti" onClick={() => setPanel("contatti")}><Users /></Button>
            <Button variant="ghost" size="icon" aria-label="Menu" onClick={openProfile}><Menu /></Button>
          </div>
        </div>
        <div className="presentation-search mt-5 flex items-center gap-2 rounded-xl px-4 py-3">
          <Search size={18} className="opacity-70" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <nav className="presentation-tabs mt-4 flex justify-around font-display text-sm font-bold">
          {(["chiamate", "chat", "contatti"] as Tab[]).map((t) => (
            <Button variant="ghost" key={t} onClick={() => setTab(t)} aria-pressed={tab === t}
              className={`h-auto rounded-none border-b-2 px-2 pb-1 uppercase ${tab === t ? "border-primary text-primary" : "border-transparent opacity-70"}`}>{t}</Button>
          ))}
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-4">
        {tab === "chiamate" && <VideoRoomsPanel people={contacts} />}
        {archiveError && <p role="alert" className="text-sm text-destructive">{archiveError}</p>}
        {tab === "chat" && (
          <>
            {convs.length > 0 && <div className="mb-4 flex gap-3 overflow-x-auto pb-1">
              {convs.slice(0, 4).map((c) => (
                <Button variant="ghost" key={c.peerId} aria-label={`Apri chat con ${c.name}`} onClick={() => openChat(c.name)} className="relative h-auto p-0"><Avatar name={c.name} size={52} /></Button>
              ))}
            </div>}
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recenti</p>
            {filterArchived(convs, account.archived).filter((c) => f(c.name)).map((c) => (
              <div key={c.peerId} className="flex items-center gap-2 border-b border-border"><Button variant="ghost" onClick={() => openChat(c.name)} className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal px-0 py-3 text-left">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-foreground">{c.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{c.preview}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{c.time}</span>
                  {c.unread && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
                </div>
              </Button><Button variant="ghost" size="icon" aria-label={`Archivia ${c.name}`} title="Archivia chat" onClick={() => { void account.archive(c.name, true).catch(e => setArchiveError(e.message)); }}><Archive size={18} /></Button></div>
            ))}
            {convs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nessuna chat. Tocca + per scrivere a un contatto.</p>}
          </>
        )}
        {tab === "chiamate" && peerCalls.history.map((session) => ({
          id: session.id,
          name: session.caller_id === peerCalls.userId ? session.callee_name : session.caller_name,
          missed: session.status === "rejected" || (session.status === "ringing" && Date.parse(session.expires_at) < Date.now()),
          info: `${session.mode === "video" ? "Video" : "Audio"} · ${new Date(session.created_at).toLocaleString("it-IT")}`,
        })).filter((c) => f(c.name)).map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-3">
            <Avatar name={c.name} />
            <div className="flex-1">
              <p className="font-display font-bold text-foreground">{c.name}</p>
              <p className={`flex items-center gap-1 text-sm ${c.missed ? "text-destructive" : "text-muted-foreground"}`}>
                {c.missed ? <PhoneMissed size={14} /> : <PhoneIncoming size={14} />}{c.info}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label={`Chiama ${c.name}`} title="Chiama" onClick={() => openCall(c.name, "audio")}><Phone className="text-primary" size={20} /></Button>
            <Button variant="ghost" size="icon" aria-label={`Videochiamata ${c.name}`} title="Videochiamata" onClick={() => openCall(c.name, "video")}><Video className="text-primary" size={20} /></Button>
          </div>
        ))}
        {tab === "chiamate" && peerCalls.history.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nessuna chiamata</p>}
        {tab === "contatti" && <ContactList contacts={contacts.filter((c) => f(c.name))} openChat={openChat} openCall={openCall} />}
      </main>

      <div className="absolute bottom-6 right-5 flex flex-col gap-3">
        <Button size="icon" aria-label="Nuova chat" title="Nuova chat" onClick={() => setPanel("contatti")} className="h-14 w-14 rounded-full shadow-lg"><Plus /></Button>
      </div>
      {panel === "contatti" && (
        <ContactsPanel contacts={contacts} openCall={openCall} openChat={(n) => { setPanel("none"); openChat(n); }} onClose={() => setPanel("none")} />
      )}
    </div>
  );
}

export function Chat({ back, name = "Milly Rosa" }: { back: () => void; name?: string }) {
  const peerCalls = usePeerCalls();
  const [knownRecipient, setKnownRecipient] = useState<string>();
  const recipientId = peerCalls.people.find(p => p.name === name)?.id ?? knownRecipient;
  useEffect(() => {
    const userId = peerCalls.userId;
    if (!userId) return;
    let active = true;
    void cameraConversations(userId).then(rows => { if (active) setKnownRecipient(rows.find(p => p.name === name)?.id); }).catch(() => {});
    return () => { active = false; };
  }, [peerCalls.userId, name]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  // Translations / reactions made on screen, kept across polling refreshes.
  const localRef = useRef(new Map<string, LocalPatch>());
  const [text, setText] = useState("");
  const [translate, setTranslate] = useState(true);
  const [showTr, setShowTr] = useState(true);
  const [picker, setPicker] = useState<number | null>(null);
  const [rec, setRec] = useState<{ stop: () => Promise<string> } | null>(null);
  const recordingRef = useRef<{ stop: () => Promise<string> } | null>(null);
  useEffect(() => () => { const recording = recordingRef.current; recordingRef.current = null; if (recording) void recording.stop().catch(() => {}); }, []);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const doVoice = useServerFn(translateVoice);
  const [lang, setLang] = useState("Inglese");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const doTranslate = useServerFn(translateText);
  const [myLang, setMyLang] = useState("Italiano");
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("my_lang").eq("id", data.user.id).maybeSingle();
      if (alive && p?.my_lang && LANGS.includes(p.my_lang)) setMyLang(p.my_lang);
    });
    void loadChatPhotos(name).then((p) => { if (alive && p.length) setMsgs((x) => [...x, ...p]); });
    return () => { alive = false; };
  }, [name]);

  useEffect(() => {
    const userId = peerCalls.userId;
    if (!userId || !recipientId) return;
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true;
      try {
        const [rows, texts] = await Promise.all([loadCameraTranslations(userId, recipientId), loadChatMessages(name, recipientId)]);
        if (active) setMsgs(previous => {
          const next = keepLocal([...previous.filter(m => !m.cameraId && !m.msgId), ...rows, ...texts], localRef.current);
          // keep in-progress translation state of messages still on screen
          const busy = new Map(previous.filter(m => m.trBusy || m.trErr).map(m => [msgKey(m), m] as const));
          const merged = busy.size ? next.map(m => { const b = busy.get(msgKey(m)); return b && msgKey(m) ? { ...m, trBusy: b.trBusy, trErr: b.trErr } : m; }) : next;
          return sameMessages(previous, merged) ? previous : merged;
        });
      } catch (e) { if (active) setErr(e instanceof Error ? e.message : "Caricamento non riuscito"); }
      finally { loading = false; }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => { active = false; window.clearInterval(interval); };
  }, [peerCalls.userId, recipientId, name]);

  const pickMyLang = async (l: string) => {
    setMyLang(l);
    setLangOpen(false);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ my_lang: l }).eq("id", data.user.id);
  };

  const saveLocal = (m: Msg, patch: LocalPatch) => {
    const key = msgKey(m);
    if (key) localRef.current.set(key, { ...localRef.current.get(key), ...patch });
  };

  /** Cached client-side first, then the server (which has its own cache). */
  const fetchTranslation = async (text: string, target: string) => {
    if (!needsTranslation(text)) return { ok: true as const, translation: text };
    const hit = clientTranslations.get(text, target);
    if (hit !== undefined) return { ok: true as const, translation: hit };
    const key = TranslationCache.key(text, target);
    const pending = clientPending.get(key);
    if (pending) return pending;
    const job = doTranslate({ data: { text, target } })
      .then((r) => { if (r.ok) clientTranslations.set(text, target, r.translation); return r; })
      .finally(() => clientPending.delete(key));
    clientPending.set(key, job);
    return job;
  };
  const fetchRef = useRef(fetchTranslation);
  fetchRef.current = fetchTranslation;

  // Translate the draft while the user is still typing: when they press send,
  // the translation is usually already there and the message goes out at once.
  useEffect(() => {
    const draft = text.trim();
    if (!translate || draft.length < 2 || draft.length > 2000) return;
    const t = window.setTimeout(() => { void fetchRef.current(draft, lang).catch(() => {}); }, 700);
    return () => window.clearTimeout(t);
  }, [text, lang, translate]);

  const translateIn = async (i: number) => {
    const m = msgs[i];
    if (!m || m.trBusy || !canTranslate(m, myLang)) return;
    const target = myLang;
    // the list may be refreshed while we wait: always locate the message again by its id
    const update = (fn: (x: Msg[], k: number) => Msg[]) =>
      setMsgs((x) => { const k = findMsgIndex(x, m, i); return k < 0 ? x : fn(x, k); });
    update((x, k) => markTranslating(x, k));
    setShowTr(true);
    try {
      const r = await fetchTranslation(m.text, target);
      if (r.ok) saveLocal(m, { tr: r.translation, trLang: target });
      update((x, k) => (r.ok ? applyTranslation(x, k, r.translation, target) : applyTranslationError(x, k, r.error)));
    } catch {
      update((x, k) => applyTranslationError(x, k, "Traduzione non riuscita"));
    }
  };

  const send = async () => {
    const original = text.trim();
    if (!original) return;
    setErr("");
    // Show the message right away and free the input; the translation finishes in the background.
    const pending: Msg = { me: true, text: original, trBusy: true, time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) };
    setMsgs((x) => [...x, pending]);
    setText("");
    const fail = (message: string) => {
      setMsgs((x) => x.filter((m) => m !== pending));
      setText((current) => current || original);
      setErr(message);
    };
    try {
      let m: Msg;
      if (!translate) {
        m = await sendChatMessage(original, name, recipientId ?? null);
      } else {
        const r = await fetchTranslation(original, lang);
        if (!r.ok) { fail(r.error); return; }
        m = await sendChatMessage(r.translation, name, recipientId ?? null, original, lang);
      }
      // polling may already have brought the stored message: never show it twice
      setMsgs((x) => {
        const rest = x.filter((y) => y !== pending);
        if (rest.some((y) => y.msgId === m.msgId)) return rest;
        return rest.length === x.length ? [...x, m] : x.map((y) => (y === pending ? m : y));
      });
    } catch (e) { fail(e instanceof Error ? e.message : "Invio non riuscito"); }
  };

  const toggleRec = async () => {
    if (voiceBusy || busy) return;
    if (!recipientId) { setErr("Scegli un contatto per inviare il vocale"); return; }
    if (!rec) {
      try { setErr(""); const recording = await recordWav(); recordingRef.current = recording; setRec(recording); } catch { setErr("Microfono non disponibile"); }
      return;
    }
    const r0 = rec; recordingRef.current = null; setRec(null); setVoiceBusy(true);
    try {
      const audio = await r0.stop();
      const r = await doVoice({ data: { audio, target: translate ? lang : myLang } });
      if (!r.ok) { setErr(r.error); return; }
      if (!r.audio) { setErr("Audio tradotto non disponibile: il vocale non è stato inviato. Riprova."); return; }
      const message = await sendTranslatedVoice(r.audio, r.translation, r.original, translate ? lang : myLang, name, recipientId);
      setMsgs(m => [...m.filter(x => x.msgId !== message.msgId), message]);
    } catch (e) { setErr(e instanceof Error ? e.message : "Traduzione audio non riuscita"); }
    finally { setVoiceBusy(false); }
  };

  const sendPhoto = async (f: File) => {
    const e = chatPhotoError(f);
    if (e) { setErr(e); return; }
    setErr(""); setBusy(true);
    try { const m = await sendChatPhoto(f, name); setMsgs((x) => [...x, m]); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : "Invio non riuscito"); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden" onClick={() => setLangOpen(false)}>
      <header className="presentation-header presentation-chat-header flex items-center gap-2 px-4 pb-4 pt-8 text-secondary-foreground">
        <Button variant="ghost" size="icon" onClick={back} aria-label="Indietro" title="Indietro" className="shrink-0 text-secondary-foreground"><ArrowLeft /></Button>
        <Avatar name={name} />
        <div className="presentation-chat-name min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-foreground">{name.toUpperCase()}</p>
          <p className="text-xs">Online</p>
        </div>
        <div className="presentation-chat-language relative" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setLangOpen((o) => !o)} aria-label="La mia lingua"
            className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-secondary-foreground">
            <Languages size={13} /> {languageCode(myLang)}
          </button>
          {langOpen && (
            <div className="absolute right-0 top-9 z-20 max-h-64 w-44 overflow-y-auto rounded-2xl bg-card p-1 shadow-xl">
              <p className="px-2 py-1 text-[10px] font-bold uppercase text-muted-foreground">La mia lingua</p>
              {LANGS.map((l) => (
                <button key={l} onClick={() => void pickMyLang(l)}
                  className={`block w-full rounded-xl px-3 py-1.5 text-left text-sm ${l === myLang ? "bg-primary-light font-bold" : ""}`}>{l}</button>
              ))}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={() => peerCalls.start(name, "video")} aria-label="Videochiamata" title="Videochiamata" className="h-8 w-8 shrink-0 text-secondary-foreground"><Video /></Button>
        <Button variant="ghost" size="icon" onClick={() => peerCalls.start(name, "audio")} aria-label="Chiama" title="Chiama" className="h-8 w-8 shrink-0 text-secondary-foreground"><Phone /></Button>
        <Button variant="ghost" size="icon" onClick={() => setShowTr(!showTr)} aria-label="Mostra traduzioni" title="Mostra traduzioni" className="h-8 w-8 shrink-0 text-secondary-foreground"><MoreVertical /></Button>
      </header>

      <main className="presentation-chat-body flex-1 space-y-5 overflow-y-auto px-4 py-5" onClick={() => setPicker(null)}>
        {msgs.map((m, i) => (
          <div key={i} className={`relative flex items-end gap-2 ${m.me ? "justify-end" : "justify-start"}`}>
            {!m.me && <Avatar name={name} size={32} />}
            <div
              onContextMenu={(e) => { e.preventDefault(); setPicker(i); }}
              onDoubleClick={(e) => { e.stopPropagation(); setPicker(i); }}
              className={`presentation-bubble relative max-w-[80%] px-4 py-3 text-sm ${m.me ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-bubble text-bubble-foreground"}`}>
              {m.image && <img src={m.image} alt="Foto inviata" className="mb-1 max-h-64 w-full rounded-2xl object-cover" />}
              {m.text && <p>{m.text}</p>}
              {m.me && m.trBusy && <p className="mt-1 text-[10px] font-semibold opacity-70">Traduco e invio…</p>}
              {m.audioUrl && <audio controls preload="none" src={m.audioUrl} aria-label="Vocale tradotto" className="mt-2 h-10 w-full min-w-0" onClick={e => e.stopPropagation()} />}
              {showTr && m.tr && (
                <p className="mt-1 border-t border-foreground/10 pt-1 text-xs italic opacity-80">
                  <span className="text-[9px] font-bold uppercase not-italic">{m.cameraId ? "Originale" : translationLabel(m, myLang)}</span> {m.tr}
                </p>
              )}
              {m.trErr && <p className="mt-1 text-[10px] font-semibold text-destructive">{m.trErr}</p>}
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-[10px] opacity-70">{m.time}</p>
                {canTranslate(m, myLang) && (
                  <button disabled={m.trBusy} aria-label="Traduci nella mia lingua"
                    onClick={(e) => { e.stopPropagation(); void translateIn(i); }}
                    className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-secondary-foreground disabled:opacity-60">
                    <Languages size={11} /> {m.trBusy ? "Traduco…" : `Traduci in ${myLang}`}
                  </button>
                )}
              </div>
              <Button variant="destructive" size="icon" aria-label="Cancella messaggio" title="Cancella"
                disabled={Boolean((m.cameraId || m.msgId) && !m.me)}
                onClick={async (e) => { e.stopPropagation(); if (!confirm("Cancellare questo messaggio?")) return; if (m.cameraId) { const { error } = await supabase.from("camera_translations").delete().eq("id", m.cameraId); if (error) { setErr("Cancellazione non riuscita"); return; } } if (m.msgId) { try { await deleteChatMessage(m.msgId, m.audioPath); } catch { setErr("Cancellazione non riuscita"); return; } } if (m.me && m.photoPath) void deleteChatPhoto(m.photoPath); setMsgs((x) => x.filter((_, k) => k !== i)); setPicker(null); }}
                className={`absolute -top-2 ${m.me ? "-left-2" : "-right-2"} h-7 w-7 rounded-full border border-background shadow`}>
                <Trash2 />
              </Button>
              {m.react && <span className="absolute -bottom-3 right-2 rounded-full bg-card px-1 text-sm shadow">{m.react}</span>}
            </div>
            {m.me && <MyAvatar size={32} />}
            {picker === i && (
              <div className="absolute -top-10 z-10 flex gap-1 rounded-full bg-card px-2 py-1 shadow-lg">
                {["😮", "😉", "😊", "😠", "❤️"].map((r) => (
                  <button key={r} className="text-xl" onClick={(e) => { e.stopPropagation(); saveLocal(m, { react: r }); setMsgs((all) => all.map((x, k) => k === i ? { ...x, react: r } : x)); setPicker(null); }}>{r}</button>
                ))}
              </div>
            )}
          </div>
        ))}
        <p className="text-center text-[11px] text-muted-foreground">Doppio click su un messaggio per reagire</p>
      </main>

      <footer className="presentation-composer relative px-4 pb-6 pt-5">
        {translate && (
          <div className="mb-3 flex items-center gap-2 rounded-2xl bg-card px-3 py-2 text-xs">
            <span className="font-bold uppercase text-card-foreground">Traduci in</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Lingua"
              className="flex-1 bg-transparent font-semibold outline-none">
              {LANGS.map((l) => <option key={l}>{l}</option>)}
            </select>
            {(busy || voiceBusy) && <span className="text-muted-foreground">Traduzione…</span>}
            {rec && <span className="font-bold text-destructive">● Registro…</span>}
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-card-foreground" onClick={() => setTranslate(false)} aria-label="Disattiva traduttore" title="Disattiva traduttore"><X /></Button>
          </div>
        )}
        {err && <p className="mb-2 rounded-2xl bg-destructive px-3 py-2 text-xs text-destructive-foreground">{err}</p>}
        <Button variant="ghost" size="icon" onClick={() => setTranslate(!translate)} aria-label="Traduttore" title="Traduttore"
          className={`absolute -top-6 right-6 h-12 w-12 rounded-full shadow-lg [&_svg]:size-6 ${translate ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
          <Languages size={22} />
        </Button>
        <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-center gap-2 rounded-full bg-composer text-composer-foreground px-4 py-2.5">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Scrivi un messaggio" className="min-w-0 flex-1 bg-transparent text-sm text-composer-foreground placeholder:text-composer-foreground/70 outline-none" />
          <label aria-label="Scatta e invia foto" title="Scatta e invia foto" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-composer-foreground hover:bg-composer-foreground/15 focus-within:ring-2 focus-within:ring-ring">
            <Camera size={18} />
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendPhoto(f); }} />
          </label>
          <label aria-label="Invia foto dalla galleria" title="Invia foto dalla galleria" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-composer-foreground hover:bg-composer-foreground/15 focus-within:ring-2 focus-within:ring-ring">
            <Paperclip size={18} />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) sendPhoto(f); }} />
          </label>
          {text ? <Button type="submit" variant="ghost" size="icon" aria-label="Invia" title="Invia" className="h-8 w-8 shrink-0 text-composer-foreground hover:bg-composer-foreground/15 hover:text-composer-foreground"><Send /></Button> : (
            <Button variant="ghost" size="icon" type="button" disabled={voiceBusy || busy} onClick={() => void toggleRec()} aria-label={rec ? "Ferma, traduci e invia" : "Messaggio vocale tradotto"} title={rec ? "Ferma, traduci e invia" : "Messaggio vocale tradotto"}
              className={`h-8 w-8 shrink-0 hover:bg-composer-foreground/15 hover:text-composer-foreground ${rec ? "animate-pulse bg-destructive text-destructive-foreground" : "text-composer-foreground"}`}>
              {rec ? <Square size={18} /> : <Mic size={18} />}
            </Button>)}
        </form>
      </footer>
    </div>
  );
}

