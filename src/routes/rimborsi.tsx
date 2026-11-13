import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/rimborsi")({
  head: () => legalHead("Politica di rimborso", "Rimborso garantito entro 30 giorni sui pacchetti di crediti IA di TraduChat."),
  component: RimborsiPage,
});

function RimborsiPage() {
  return (
    <LegalPage title="Politica di rimborso">
      <section>
        <h2>Garanzia di 30 giorni</h2>
        <p>Offriamo una garanzia «soddisfatti o rimborsati» di 30 giorni. Se non sei soddisfatto di un pacchetto di crediti IA, puoi chiedere il rimborso completo entro 30 giorni dalla data dell'ordine, anche se hai già utilizzato parte dei crediti.</p>
      </section>
      <section>
        <h2>Come chiederlo</h2>
        <p>I rimborsi sono gestiti dal nostro rivenditore Paddle. Visita <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">paddle.net</a> e cerca il tuo ordine con l'email usata per l'acquisto.</p>
        <p>Per assistenza puoi anche scrivere a <a href="mailto:admin@traduchat.com">admin@traduchat.com</a>, indicando il riferimento dell'ordine; non inviare dati della carta.</p>
      </section>
      <section>
        <h2>Chi vende il servizio</h2>
        <p>Il servizio è fornito da Umbertodecicco Association (entità registrata nel Delaware, USA, EIN 37-2222305), che opera con il marchio TraduChat. Sede: Via Annunziata 30, 80139 Napoli, Italia. Per richieste di rimborso scrivi a <a href="mailto:admin@traduchat.com">admin@traduchat.com</a> indicando il riferimento dell'ordine.</p>
      </section>
      <section>
        <h2>Dopo il rimborso</h2>
        <p>Quando il rimborso è completato, i crediti di quel pacchetto vengono tolti dal saldo. Per maggiori dettagli vedi la <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">politica di rimborso di Paddle</a>.</p>
      </section>
    </LegalPage>
  );
}
