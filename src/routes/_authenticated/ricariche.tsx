import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Coins, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { listAiCreditPurchases } from "@/lib/payments.functions";
import { AppNav } from "@/components/AppNav";
import { Button } from "@/components/ui/button";
import { BuyCredits } from "@/components/BuyCredits";
import { CreditBalanceBar } from "@/components/CreditBalanceBar";

const PACK_LABELS: Record<string, string> = {
  ai_credits_50_eur: "Pacchetto 50 crediti",
  ai_credits_200_eur: "Pacchetto 200 crediti",
  ai_credits_1000_eur: "Pacchetto 1000 crediti",
};

type Purchase = {
  id: string;
  price_id: string;
  credits: number;
  environment: string;
  refunded_at: string | null;
  refunded_credits: number;
  created_at: string;
};

function RicarichePage() {
  const list = useServerFn(listAiCreditPurchases);
  const queryClient = useQueryClient();
  const { checkout, order } = Route.useSearch();
  const [confirmation, setConfirmation] = useState("");
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  async function refresh(offset = 0) {
    setBusy(true); setError("");
    try {
      const result = await list({ data: { offset } });
      setPurchases(current => offset === 0 ? result.purchases : [...(current ?? []), ...result.purchases]);
      setMore(result.hasMore);
    } catch (err) { setError(err instanceof Error ? err.message : "Storico non disponibile."); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const returned = checkout === "success" && Boolean(order);
    async function check(attempt = 0) {
      try {
        if (returned) {
          setConfirmation("Pagamento in elaborazione: controllo l’accredito…");
          const result = await list({ data: { offset: 0, orderId: order } });
          if (cancelled) return;
          const purchase = result.purchases[0];
          if (!purchase) {
            if (attempt < 29) { timer = setTimeout(() => void check(attempt + 1), 2000); return; }
            setConfirmation("Accredito ancora in verifica. Non ripetere il pagamento: riprova ad aggiornare lo storico tra poco.");
          } else {
            setConfirmation(`Pagamento confermato: ${purchase.credits} crediti accreditati.`);
          }
          await queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
        }
        if (!cancelled) await refresh();
      } catch (err) {
        if (!cancelled) {
          setConfirmation("");
          setError(err instanceof Error ? err.message : "Verifica pagamento non disponibile. Non ripetere il pagamento.");
        }
      }
    }
    void check();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout, order]);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <AppNav />
      <h1 className="mt-6 flex items-center gap-2 text-2xl font-bold text-foreground">
        <Coins className="size-6 text-primary" /> Le mie ricariche
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Lo storico dei pacchetti di crediti IA che hai acquistato.
      </p>
      <BuyCredits />
      <CreditBalanceBar />
      {confirmation && <p role="status" className="mt-4 text-sm text-foreground">{confirmation}</p>}

      {error ? <p role="alert" className="mt-6 text-sm text-destructive">{error}<Button variant="link" onClick={() => void refresh()}>Riprova</Button></p> : purchases === null ? (
        <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Caricamento…
        </p>
      ) : purchases.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Non hai ancora fatto ricariche. Usa il pulsante «Ricarica crediti» qui sopra.

        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {purchases.map((purchase) => (
            <li
              key={purchase.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Ricarica {purchase.credits} crediti
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(purchase.created_at).toLocaleString("it-IT", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {purchase.environment === "sandbox" && " · prova"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-primary">+{purchase.credits}</p>
                {purchase.refunded_credits > 0 && (
                  <p className="text-xs text-destructive">{purchase.refunded_at ? "Rimborsata" : "Rimborso parziale"} · −{purchase.refunded_credits} crediti</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {more && <Button className="mt-4" variant="outline" disabled={busy} onClick={() => void refresh(purchases?.length ?? 0)}>Mostra altre</Button>}

      <p className="mt-8 text-center">
        <Link to="/app" className="text-sm font-medium text-primary underline underline-offset-2">
          Torna a Home
        </Link>
      </p>
    </main>
  );
}

export const Route = createFileRoute("/_authenticated/ricariche")({
  validateSearch: (search: Record<string, unknown>): { checkout?: string | undefined; order?: string | undefined } => ({
    checkout: search["checkout"] === "success" ? "success" : undefined,
    order: z.string().uuid().optional().catch(undefined).parse(search["order"]),
  }),
  head: () => ({
    meta: [
      { title: "Le mie ricariche — TraduChat" },
      { name: "description", content: "Storico delle ricariche di crediti IA su TraduChat." },
      { property: "og:title", content: "Le mie ricariche — TraduChat" },
      { property: "og:description", content: "Storico delle ricariche di crediti IA su TraduChat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RicarichePage,
});
