import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, legalHead } from "@/components/LegalPage";

import { CREDIT_PACKS as PACKS, formatCreditPrice } from "@/lib/credit-catalog";

export const Route = createFileRoute("/prezzi")({
  head: () => legalHead("Prezzi", "Traduzioni a consumo: 1 credito per messaggio o vocale, 1 credito al minuto in videochiamata. 10 crediti in regalo, pacchetti da 2,99 €."),
  component: PrezziPage,
});

function PrezziPage() {
  return (
    <LegalPage title="Prezzi">
      <p>Le traduzioni funzionano a consumo con i crediti. Ogni nuovo account riceve 10 crediti gratis.</p>
      <ul>
        <li>Messaggio scritto tradotto: 1 credito</li>
        <li>Messaggio vocale tradotto: 1 credito</li>
        <li>Videochiamata tradotta: 1 credito al minuto (paga chi chiama)</li>
        <li>Messaggi nella stessa lingua e lettura dei messaggi ricevuti: gratis</li>
      </ul>
      <div className="grid gap-3 sm:grid-cols-3">
        {PACKS.map((p) => (
          <div key={p.credits} className="rounded-3xl border border-border bg-card p-5 text-center">
            <p className="text-2xl font-extrabold text-foreground">{p.credits}</p>
            <p>crediti</p>
            <p className="mt-3 text-lg font-bold text-primary">{formatCreditPrice(p.amount)}</p>
          </div>
        ))}
      </div>
      <p>Pagamento unico, nessun abbonamento. I crediti arrivano subito e non scadono. Prezzi IVA inclusa dove applicabile; il pagamento è gestito da Paddle, nostro Merchant of Record. Ricarichi dopo l'<Link to="/auth">accesso</Link>.</p>
    </LegalPage>
  );
}
