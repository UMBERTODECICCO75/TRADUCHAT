import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { reviewDeletionRequests } from "@/lib/account-requests.functions";
import { Button } from "./ui/button";

type Request = { id: string; email: string | null; status: string; purchaseCount: number; balances: { environment: string; balance: number }[] };
export function AdminDeletionRequests() {
  const load = useServerFn(reviewDeletionRequests);
  const [rows, setRows] = useState<Request[]>([]);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  async function refresh(offset = 0, requestId?: string) {
    try {
      const result = await load({ data: { offset, requestId } });
      setRows(current => offset === 0 ? result.requests : [...current, ...result.requests]); setMore(result.hasMore); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Richieste non disponibili."); }
  }
  useEffect(() => { void refresh(); }, []);
  return <section className="mt-8 border-t border-border pt-6"><h2 className="font-display text-lg">Richieste di cancellazione</h2>
    {rows.map(r => <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm"><div className="min-w-0"><p className="break-all">{r.email ?? r.id}</p><p className="text-muted-foreground">{r.purchaseCount} acquisti · {r.balances.map(b => `${b.environment === "sandbox" ? "Prova" : "Reale"}: ${b.balance} crediti`).join(" · ")}</p><p>{r.status === "reviewing" ? "In verifica" : "In attesa"}</p></div><Button variant="outline" disabled={r.status === "reviewing"} onClick={() => void refresh(0,r.id)}>Prendi in carico</Button></div>)}
    {!rows.length && !error && <p className="mt-3 text-sm text-muted-foreground">Nessuna richiesta aperta.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}<Button variant="link" onClick={() => void refresh()}>Riprova</Button></p>}
    {more && <Button variant="outline" onClick={() => void refresh(rows.length)}>Mostra altre</Button>}
  </section>;
}