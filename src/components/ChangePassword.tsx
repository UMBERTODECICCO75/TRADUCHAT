import { useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { passwordProblems } from "@/lib/password-rules";

export function ChangePassword() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const problems = passwordProblems(pw);

  async function save(e: React.FormEvent): Promise<unknown> {
    e.preventDefault();
    if (problems.length) return toast.error(`La password deve avere ${problems.join(", ")}.`);
    if (pw !== confirm) return toast.error("Le due password non coincidono.");
    setBusy(true);
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) {
      setBusy(false);
      return toast.error("Sessione scaduta: esci e rientra, poi riprova.");
    }
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      const code = (error as { code?: string }).code ?? "";
      const msg = error.message.toLowerCase();
      if (code === "same_password" || msg.includes("different from the old"))
        return toast.error("La nuova password deve essere diversa da quella attuale.");
      if (code === "weak_password" || msg.includes("weak") || msg.includes("pwned"))
        return toast.error("Password troppo debole o già trapelata online: scegline un'altra.");
      if (code === "reauthentication_needed" || msg.includes("reauth"))
        return toast.error("Per sicurezza esci e rientra, poi cambia subito la password.");
      if (code === "over_request_rate_limit" || error.status === 429)
        return toast.error("Troppi tentativi: attendi qualche minuto.");
      return toast.error(`Non riesco a cambiare la password: ${error.message}`);
    }
    setPw("");
    setConfirm("");
    toast.success("Password cambiata.");
    return undefined;
  }

  return (
    <section className="mt-4 rounded-3xl surface-card p-4">
      <p className="flex items-center gap-2 font-display text-lg">
        <KeyRound className="size-4 text-accent" /> Cambia password
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Almeno 8 caratteri, con una lettera maiuscola, un numero e un carattere speciale.
      </p>
      <form onSubmit={save} className="mt-3 grid gap-2">
        <Input type="password" autoComplete="new-password" placeholder="Nuova password" aria-label="Nuova password" value={pw} onChange={(e) => setPw(e.target.value)} className="h-11" />
        <Input type="password" autoComplete="new-password" placeholder="Ripeti la nuova password" aria-label="Ripeti la nuova password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
        {pw && problems.length > 0 && (
          <p className="text-xs text-destructive">Manca: {problems.join(", ")}.</p>
        )}
        <Button type="submit" className="h-11" disabled={busy || !pw}>
          {busy ? "Salvataggio..." : "Salva nuova password"}
        </Button>
      </form>
    </section>
  );
}
