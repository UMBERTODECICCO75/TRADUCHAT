import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registrationInput } from "@/lib/auth-registration";
import { Button } from "@/components/ui/button";
import logo from "@/assets/traduchat-logo.png.asset.json";

const requirements = [
  "Username di almeno 3 caratteri, non già usato da un altro utente",
  "Indirizzo e-mail valido: servirà per accedere e confermare l'account",
  "Password di almeno 6 caratteri",
  "Conferma password identica alla password",
];

export const Route = createFileRoute("/registrati")({
  head: () => ({
    meta: [
      { title: "Registrati — Traduchat" },
      { name: "description", content: "Crea il tuo account Traduchat: username, e-mail e password. Chatta in ogni lingua con traduzione automatica." },
      { property: "og:title", content: "Registrati — Traduchat" },
      { property: "og:description", content: "Crea il tuo account Traduchat e chatta in ogni lingua." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Registrati,
});

function Registrati() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const input = "w-full rounded-full border border-input bg-card px-5 py-3.5 outline-none focus:ring-2 focus:ring-ring";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      const values = registrationInput(username, email, password, confirmation);
      const { error } = await supabase.auth.signUp({ email: values.email, password: values.password, options: { emailRedirectTo: window.location.origin, data: { username: values.username } } });
      if (error) throw new Error(error.message.includes("Database error saving new user") || error.message.includes("duplicate") ? "Questo username è già in uso, scegline un altro" : error.message);
      setDone(true);
    } catch (err) { setMsg({ ok: false, t: (err as Error).message }); }
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-aurora text-secondary-foreground">
      <div className="rounded-b-[2.5rem] bg-secondary-dark px-8 pb-10 pt-14 text-center">
        <img src={logo.url} alt="Logo TraduChat" className="mx-auto mb-4 h-20 w-auto" />
        <h1 className="presentation-brand font-display text-4xl font-black tracking-wide">TRADUCHAT<sup className="align-super text-[0.42em] font-bold">®</sup></h1>
        <p className="mt-2 text-sm opacity-80">Crea il tuo account</p>
      </div>
      {done ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check size={32} /></div>
          <h2 className="font-display text-2xl font-extrabold">Registrazione completata!</h2>
          <p className="max-w-sm text-sm opacity-80">Ti abbiamo inviato un'e-mail di conferma. Aprila e tocca il link per attivare il tuo account, poi accedi.</p>
          <Link to="/" className="rounded-full bg-primary px-8 py-3 font-display font-extrabold text-primary-foreground">Vai al login</Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 p-8">
          <div className="rounded-2xl bg-card p-5">
            <h2 className="font-display text-base font-extrabold text-card-foreground">Requisiti per registrarti</h2>
            <ul className="mt-3 space-y-2">
              {requirements.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-card-foreground">
                  <Check size={16} className="mt-0.5 shrink-0 text-primary" />{r}
                </li>
              ))}
            </ul>
          </div>
          <label className="space-y-2 text-sm font-semibold">Username<input className={input} placeholder="Username" autoComplete="username" maxLength={80} value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label className="space-y-2 text-sm font-semibold">E-mail<input className={input} placeholder="E-mail" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="space-y-2 text-sm font-semibold">Password<input className={input} placeholder="Password" autoComplete="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label className="space-y-2 text-sm font-semibold">Conferma password<input className={input} placeholder="Conferma password" autoComplete="new-password" type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required /></label>
          {msg && <p role="alert" className="rounded-2xl bg-destructive px-4 py-3 text-sm text-destructive-foreground">{msg.t}</p>}
          <p className="text-xs opacity-70">Registrandoti dichiari di aver letto l'<a href="/privacy" target="_blank" className="font-semibold underline">Informativa Privacy (GDPR)</a>.</p>
          <Button type="submit" disabled={busy} className="mt-2 h-auto rounded-full bg-brand py-4 font-display text-lg font-extrabold text-brand-foreground hover:bg-brand/90">
            {busy ? "..." : "REGISTRA →"}
          </Button>
          <p className="text-center text-sm opacity-80">
            Hai già un account? <Link to="/" className="font-bold text-secondary underline">Login</Link>
          </p>
        </form>
      )}
    </div>
  );
}
