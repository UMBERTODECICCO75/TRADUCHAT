import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { CookieSettingsLink } from "@/components/cookie-banner";

const URL = "https://www.traduchatchat.com/privacy";
const TITLE = "Informativa Privacy — TraduChat";
const DESC = "Informativa GDPR di TraduChat: dati personali, chiamate e videochiamate Twilio, cookie tecnici e consenso ai cookie pubblicitari.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Privacy,
});

function S({ t, children }: { t: string; children: ReactNode }) {
  return <section className="space-y-2"><h2 className="font-display text-xl font-extrabold text-secondary">{t}</h2><div className="space-y-2 text-sm leading-relaxed">{children}</div></section>;
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted"><tr>{head.map((h) => <th key={h} className="p-2 font-bold">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="p-2 align-top">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 bg-background px-6 py-10 text-foreground">
      <Link to="/" className="text-sm font-semibold text-primary">← Torna a TraduChat</Link>
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-extrabold text-secondary">Informativa Privacy TraduChat</h1>
        <p className="text-xs text-muted-foreground">Ultimo aggiornamento: 6 novembre 2026 · ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR)</p>
        <p className="text-sm">Questa informativa descrive il trattamento dei dati per chat, chiamate e videochiamate con traduzione automatica, l'utilizzo di Twilio per le stanze audio/video e le condizioni per l'eventuale utilizzo di cookie pubblicitari. Vale per il sito e l'app su <a className="underline" href="https://www.traduchatchat.com">www.traduchatchat.com</a> e sui domini collegati. TraduChat non vende i dati personali a terzi.</p>
      </header>

      <S t="1. Titolare del trattamento">
        <p>Umbertodecicco Association (TRADUCHAT), EIN 37-2222305, Via Annunziata 30, 80139 Napoli, Italia. Email: <a className="underline" href="mailto:privacy@traduchat.com">privacy@traduchat.com</a>. Sito: <a className="underline" href="https://www.traduchatchat.com">www.traduchatchat.com</a>.</p>
        <p>Avendo sede in Italia, non è necessario un rappresentante UE (art. 27). Autorità di controllo: Garante per la protezione dei dati personali. Non è stato nominato un DPO perché non obbligatorio.</p>
      </S>

      <S t="2. Dati che trattiamo">
        <Table head={["Categoria", "Esempi", "Origine"]} rows={[
          ["Dati dell'account", "nome o nickname, email, password cifrata, lingua preferita, foto profilo (facoltativa)", "dall'utente, alla registrazione"],
          ["Contenuti di comunicazione", "messaggi di testo, audio e video di chiamate, testi originali e tradotti", "dall'utente, durante l'uso"],
          ["Contatti e conversazioni", "utenti con cui si chatta, data e ora di messaggi e chiamate", "generati dal servizio"],
          ["Dati di acquisto", "crediti acquistati, importo, paese, stato del pagamento", "da Paddle (non riceviamo i dati completi della carta)"],
          ["Dati tecnici", "indirizzo IP, dispositivo e browser, log di accesso ed errori", "raccolti automaticamente"],
          ["Richieste di assistenza", "contenuto di email o messaggi al supporto", "dall'utente"],
        ]} />
        <p>Non trattiamo intenzionalmente categorie particolari di dati (art. 9). Se inserite in un messaggio, vengono trattate solo per tradurle e consegnarle al destinatario.</p>
      </S>

      <S t="3. Finalità e basi giuridiche">
        <Table head={["Finalità", "Base giuridica (art. 6)"]} rows={[
          ["Creare e gestire l'account", "esecuzione del contratto (lett. b)"],
          ["Tradurre e consegnare messaggi, chiamate e videochiamate", "esecuzione del contratto (lett. b)"],
          ["Vendere e gestire i crediti", "contratto (lett. b) e obblighi fiscali (lett. c)"],
          ["Sicurezza, prevenzione abusi e frodi, log tecnici", "legittimo interesse (lett. f)"],
          ["Statistiche aggregate e anonime", "legittimo interesse (lett. f)"],
          ["Assistenza", "contratto o misure precontrattuali (lett. b)"],
          ["Difesa dei nostri diritti", "legittimo interesse (lett. f)"],
          ["Newsletter (solo se attivate)", "consenso (lett. a), revocabile"],
          ["Cookie pubblicitari e misurazione delle campagne, se attivati", "consenso preventivo (lett. a), facoltativo e revocabile"],
        ]} />
        <p>Eventuali attività pubblicitarie basate su cookie o identificatori non necessari richiedono il consenso preventivo. Non vendiamo i dati e non adottiamo decisioni automatizzate con effetti giuridici (art. 22).</p>
      </S>

      <S t="4. Messaggi, chiamate e traduzioni">
        <ul className="list-disc space-y-1 pl-5">
          <li>I contenuti sono usati solo per tradurli e consegnarli ai partecipanti.</li>
          <li>Messaggi: conservati nell'account finché l'utente non li elimina o chiude l'account.</li>
          <li>Audio e video delle chiamate: elaborati in tempo reale per la traduzione, non registrati né archiviati.</li>
          <li>I fornitori di traduzione ricevono il contenuto solo per tradurlo, come responsabili del trattamento.</li>
          <li>Non usiamo i contenuti degli utenti per addestrare modelli di intelligenza artificiale.</li>
          <li>Il personale non legge le conversazioni, salvo segnalazione di abuso, richiesta dell'utente o obbligo di legge.</li>
        </ul>
        <p>La traduzione automatica può contenere errori: per comunicazioni importanti (mediche, legali, contrattuali) è bene verificarla.</p>
      </S>

      <S t="5. A chi comunichiamo i dati">
        <p>Solo a fornitori necessari al servizio, vincolati da accordo sul trattamento (art. 28): hosting dell'app, database/autenticazione/archiviazione, motore di traduzione testo e voce, trasmissione audio/video, email di servizio. Paddle agisce come titolare autonomo (Merchant of Record) per vendita crediti, pagamenti, fatture e IVA, secondo la propria informativa. L'elenco aggiornato dei fornitori è disponibile su richiesta. I dati possono essere comunicati alle autorità solo se previsto dalla legge.</p>
        <p><b>Twilio Video.</b> Per collegare i partecipanti nelle stanze private, Twilio tratta i flussi audio/video e i dati tecnici necessari alla comunicazione, come indirizzo IP, informazioni sul dispositivo, identificativi della stanza e dei partecipanti e dati di qualità della connessione. L'accesso alla stanza è riservato ai membri autorizzati. L'integrazione Twilio non costituisce, di per sé, un servizio pubblicitario. Ulteriori informazioni: <a className="underline" href="https://www.twilio.com/en-us/legal/privacy" target="_blank" rel="noopener noreferrer">informativa privacy Twilio</a>.</p>
      </S>

      <S t="6. Trasferimenti fuori dall'UE">
        <p>Alcuni dati possono essere trattati fuori dallo SEE, in particolare negli Stati Uniti. Ogni trasferimento è protetto da decisione di adeguatezza (incluso l'EU-US Data Privacy Framework) o da clausole contrattuali standard (art. 46) con misure aggiuntive. Copia delle garanzie su richiesta a privacy@traduchat.com.</p>
      </S>

      <S t="7. Conservazione">
        <Table head={["Dati", "Durata"]} rows={[
          ["Account e profilo", "fino alla chiusura dell'account; cancellazione entro 30 giorni"],
          ["Messaggi di testo", "fino alla cancellazione o alla chiusura dell'account"],
          ["Audio e video delle chiamate", "non conservati (solo tempo reale)"],
          ["Log tecnici e di sicurezza", "90 giorni"],
          ["Dati di acquisto e fatturazione", "10 anni, per obblighi fiscali"],
          ["Richieste di assistenza", "24 mesi dalla chiusura"],
        ]} />
        <p>Scaduti i termini, i dati vengono cancellati o resi anonimi in modo irreversibile.</p>
      </S>

      <S t="8. Cookie e tecnologie simili">
        <p><b>Cookie tecnici.</b> Cookie e archiviazione locale necessari all'accesso, alla sicurezza, alle preferenze di lingua e ai servizi richiesti non richiedono il consenso. I servizi audio/video Twilio possono utilizzare tecnologie necessarie alla connessione e alla gestione della sessione; non devono essere confusi con cookie pubblicitari.</p>
        <p><b>Cookie pubblicitari.</b> Se attivati, possono essere utilizzati per personalizzare gli annunci, misurare le campagne e riconoscere un dispositivo tramite identificatori online. Non sono necessari al funzionamento di chat e chiamate e possono essere attivati soltanto dopo un consenso libero, specifico e informato, ai sensi dell'art. 6, par. 1, lett. a GDPR e dell'art. 122 del Codice Privacy.</p>
        <p><b>Le tue preferenze.</b> Puoi modificare o revocare in qualsiasi momento il consenso ai cookie dal link «Cookie» in fondo a ogni schermata oppure qui: <CookieSettingsLink className="font-semibold text-primary underline" />.</p>
        <p><b>Scelta e revoca.</b> Al primo accesso il sito mostra un pannello che consente di accettare, rifiutare o scegliere le categorie (analisi e pubblicità) con pari facilità, senza opzioni preselezionate. Chiudere o ignorare il pannello non attiva alcun cookie facoltativo, e il consenso può essere modificato o revocato in qualsiasi momento dal link «Cookie». Il rifiuto non deve impedire l'utilizzo delle funzioni essenziali. Si applicano le Linee guida cookie del Garante del 10 giugno 2021.</p>
        <p><b>Elenco dei cookie.</b> Prima dell'attivazione, il pannello deve indicare per ogni cookie o tecnologia il fornitore, la finalità, la durata e gli eventuali trasferimenti di dati. Nessun cookie pubblicitario viene usato senza il tuo consenso. Se il browser invia il segnale Global Privacy Control, viene trattato come un rifiuto.</p>
      </S>

      <S t="9. I tuoi diritti">
        <p>Ai sensi degli artt. 15-22 GDPR puoi chiedere: accesso e copia, rettifica, cancellazione dei dati e dell'account, limitazione, portabilità, opposizione ai trattamenti basati sul legittimo interesse, revoca del consenso. Scrivi a <a className="underline" href="mailto:privacy@traduchat.com">privacy@traduchat.com</a>: rispondiamo entro un mese (prorogabile di due nei casi complessi). Puoi proporre reclamo al Garante (www.garanteprivacy.it).</p>
      </S>

      <S t="10. Altre informazioni">
        <p><b>Minori.</b> Il servizio è riservato a chi ha almeno 14 anni. Account di persone più giovani vengono cancellati.</p>
        <p><b>Sicurezza.</b> Connessione HTTPS, password cifrate, accessi limitati al personale autorizzato. In caso di violazione informeremo l'autorità e, se necessario, gli utenti (artt. 33-34).</p>
        <p><b>Modifiche.</b> Le modifiche importanti saranno comunicate nell'app o via email.</p>
        <p><b>Contatti.</b> Umbertodecicco Association (TRADUCHAT) · EIN 37-2222305 · Via Annunziata 30, 80139 Napoli · privacy@traduchat.com</p>
      </S>
    </main>
  );
}
