import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Loader2 } from "lucide-react";
import { listMyDeletionRequests, requestAccountDeletion } from "@/lib/account-requests.functions";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

export function AccountDeletionRequest() {
  const list = useServerFn(listMyDeletionRequests);
  const request = useServerFn(requestAccountDeletion);
  const [state, setState] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = () => list().then(rows => setState(rows.find(r => r.status !== "completed")?.status ?? "none")).catch(() => setError("Richieste non disponibili."));
  useEffect(() => { void refresh(); }, []);
  async function submit() {
    if (!confirmed || busy) return;
    setBusy(true); setError("");
    try { await request({ data: { confirmed: true } }); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Richiesta non inviata."); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 border-t border-border pt-6">
    <h2 className="flex items-center gap-2 font-display text-lg"><Trash2 className="size-4" />Cancellazione account</h2>
    <p className="mt-2 text-sm text-muted-foreground">La cancellazione è assistita. Prima di chiudere l'account vengono verificati crediti residui e acquisti; le conversazioni degli altri partecipanti non vengono eliminate.</p>
    {state === "requested" || state === "reviewing" ? <p role="status" className="mt-3 text-sm text-primary">{state === "requested" ? "Richiesta ricevuta: in attesa di verifica." : "Richiesta presa in carico."}</p> : state === "none" ? <>
      <label className="mt-4 flex items-start gap-2 text-sm"><Checkbox checked={confirmed} onCheckedChange={value => setConfirmed(value === true)} />Confermo di voler richiedere la cancellazione del mio account.</label>
      <Button variant="outline" className="mt-3" disabled={!confirmed || busy} onClick={() => void submit()}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}Richiedi cancellazione</Button>
    </> : <Loader2 className="mt-3 size-4 animate-spin" />}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}<Button variant="link" onClick={() => void refresh()}>Riprova</Button></p>}
  </section>;
}