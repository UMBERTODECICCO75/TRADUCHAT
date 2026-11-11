import { useState } from "react";
import { Check, Mail, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function ChangePassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [stage, setStage] = useState<"send" | "code" | "done">("send");
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function sendCode() {
    setBusy(true); setError(""); setNotice("");
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user?.email) throw new Error("Accedi nuovamente per cambiare la password.");
      const address = data.user.email;
      const { error: sendError } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: `${window.location.origin}/reset-password` });
      if (sendError) throw new Error("Invio non riuscito. Attendi un minuto e riprova.");
      setEmail(address); setCode(""); setVerified(false); setStage("code");
      setNotice("Codice inviato via email. Controlla anche Spam.");
    } catch (e) { setError(e instanceof Error ? e.message : "Invio non riuscito."); }
    finally { setBusy(false); }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(""); setNotice("");
    if (password.length < 6) { setError("La password deve avere almeno 6 caratteri."); return; }
    if (password !== confirmation) { setError("Le password non coincidono."); return; }
    if (!verified && !code.trim()) { setError("Inserisci il codice ricevuto via email."); return; }
    setBusy(true);
    try {
      if (!verified) {
        const { error: otpError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "recovery" });
        if (otpError) throw new Error("Codice errato o scaduto. Richiedine uno nuovo.");
        setVerified(true);
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error("Password non accettata. Scegline un'altra e riprova.");
      setCode(""); setPassword(""); setConfirmation(""); setStage("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Cambio password non riuscito."); }
    finally { setBusy(false); }
  }

  const input = "mt-2 w-full rounded-md border border-input bg-card p-3 text-card-foreground";
  return <div className="px-6 pb-8">
    {error && <p role="alert" className="mb-4 rounded-md bg-destructive p-3 text-sm text-destructive-foreground">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-muted-foreground">{notice}</p>}
    {stage === "send" && <Button disabled={busy} className="w-full" onClick={() => void sendCode()}><Mail />{busy ? "Invio…" : "Invia codice via email"}</Button>}
    {stage === "code" && <form onSubmit={save} className="flex flex-col gap-5">
      <p className="break-all text-sm text-muted-foreground">{email}</p>
      {!verified && <label className="text-sm font-semibold">Codice ricevuto<input required autoComplete="one-time-code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} className={input} /></label>}
      <label className="text-sm font-semibold">Nuova password<input required type="password" autoComplete="new-password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className={input} /></label>
      <label className="text-sm font-semibold">Conferma nuova password<input required type="password" autoComplete="new-password" minLength={6} value={confirmation} onChange={e => setConfirmation(e.target.value)} className={input} /></label>
      <Button disabled={busy}><Save />{busy ? "Salvataggio…" : "Salva nuova password"}</Button>
      <Button type="button" variant="ghost" disabled={busy} onClick={() => void sendCode()}><Mail />Invia nuovo codice</Button>
    </form>}
    {stage === "done" && <p role="status" className="flex items-center gap-2 text-foreground"><Check />Password aggiornata</p>}
  </div>;
}