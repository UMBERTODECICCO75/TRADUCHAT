import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, legalHead } from "@/components/LegalPage";

export const Route = createFileRoute("/termini")({
  head: () => legalHead("Termini di servizio", "Termini e condizioni d'uso di TraduChat, chat con traduzione istantanea e crediti IA."),
  component: TerminiPage,
});

function TerminiPage() {
  return (
    <LegalPage title="Termini di servizio">
      <p>Ultimo aggiornamento: <time dateTime="2026-10-25">25 ottobre 2026</time>.</p>
      <section>
        <h2>Chi siamo</h2>
        <p>Il servizio TraduChat (chat con traduzione istantanea, assistente IA e funzioni collegate) è fornito da Umbertodecicco Association (entità registrata nel Delaware, USA, EIN 37-2222305), che opera con il marchio TraduChat. Usando il servizio stipuli un contratto con Umbertodecicco Association.</p>
        <p>Sede: Via Annunziata 30, 80139 Napoli, Italia.</p>
        <p>Contatto professionale per assistenza e richieste: <a href="mailto:admin@traduchat.com">admin@traduchat.com</a>.</p>
      </section>
      <section>
        <h2>Accettazione</h2>
        <p>Creando un account o continuando a usare il servizio accetti questi termini. Devi avere almeno 14 anni (o il consenso di un genitore) e, se usi TraduChat per un'organizzazione, avere l'autorità per vincolarla. Fornisci informazioni corrette e custodisci le tue credenziali: sei responsabile dell'attività del tuo account.</p>
      </section>
      <section>
        <h2>Uso consentito</h2>
        <ul>
          <li>Niente usi illeciti, frodi, spam o molestie.</li>
          <li>Niente violazione di diritti d'autore o altri diritti di terzi.</li>
          <li>Niente malware, tentativi di accesso non autorizzato, scansioni o scraping del servizio.</li>
          <li>Niente reverse engineering, rivendita o aggiramento dei limiti tecnici.</li>
          <li>Con l'assistente IA: niente contenuti illegali, d'odio, deepfake, codice malevolo o tentativi di aggirare i filtri.</li>
        </ul>
      </section>
      <section>
        <h2>Intelligenza artificiale</h2>
        <p>Traduzioni e risposte dell'IA possono contenere errori: verificale prima di usarle e non usarle come consulenza professionale (medica, legale, finanziaria) senza un controllo umano. Sei responsabile dei testi che invii, dell'uso dei risultati e di avere i diritti sui contenuti caricati. Possiamo filtrare o rimuovere contenuti e sospendere account che violano questi termini. I titolari di diritti possono segnalare contenuti che li violano scrivendo a <a href="mailto:admin@traduchat.com">admin@traduchat.com</a> o tramite una richiesta di assistenza nelle Impostazioni; le violazioni ripetute portano alla chiusura dell'account.</p>
      </section>
      <section>
        <h2>Proprietà intellettuale</h2>
        <p>Umbertodecicco Association resta titolare del servizio, del software, della documentazione e del marchio. Ti concediamo un diritto limitato, non esclusivo e non trasferibile di usarlo. I contenuti che invii restano tuoi; ci concedi solo il permesso di conservarli ed elaborarli per fornirti il servizio.</p>
      </section>
      <section>
        <h2>Pagamenti e crediti IA</h2>
        <p>Il nostro processo d'ordine è gestito dal nostro rivenditore online Paddle.com. Paddle.com è il Merchant of Record per tutti i nostri ordini. Paddle gestisce tutte le richieste di assistenza clienti e i resi.</p>
        <p>I pacchetti di crediti IA sono acquisti singoli, non abbonamenti: i crediti si aggiungono subito al saldo e non scadono. Pagamenti, fatturazione, tasse, annullamenti e rimborsi sono regolati dai <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">Termini per l'acquirente di Paddle</a>. Vedi anche la nostra <a href="/rimborsi">Politica di rimborso</a> e i <a href="/prezzi">Prezzi</a>.</p>
      </section>
      <section>
        <h2>Livello di servizio e responsabilità</h2>
        <p>Il servizio è fornito «così com'è»: non garantiamo un funzionamento ininterrotto o privo di errori ed escludiamo, nei limiti di legge, le garanzie implicite. La nostra responsabilità complessiva è limitata a quanto hai pagato negli ultimi 12 mesi ed esclude danni indiretti (perdita di profitti, dati o avviamento), salvo dolo, morte o lesioni personali dove la legge non consente limiti.</p>
      </section>
      <section>
        <h2>Sospensione e chiusura</h2>
        <p>Possiamo sospendere o chiudere l'accesso in caso di violazione grave o ripetuta di questi termini, mancato pagamento, rischi di sicurezza o frode. Puoi richiedere la cancellazione assistita del tuo account nelle Impostazioni. Prima della chiusura vengono verificati acquisti, crediti residui e obblighi di conservazione; non vengono cancellati automaticamente i contenuti degli altri partecipanti.</p>
      </section>
      <section>
        <h2>Altro</h2>
        <p>Non rispondiamo di ritardi dovuti a cause fuori dal nostro controllo. Non puoi cedere il contratto senza il nostro consenso. Si applica la legge italiana, fatti salvi i diritti inderogabili dei consumatori. Eventuali modifiche ai termini saranno pubblicate su questa pagina.</p>
      </section>
    </LegalPage>
  );
}
