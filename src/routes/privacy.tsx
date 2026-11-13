import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { LegalLanguagePicker } from "@/components/LegalLanguagePicker";
import { NewsletterConsent } from "@/components/NewsletterConsent";
import { useAutoTranslatedTexts } from "@/lib/useAutoTranslatedTexts";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy e GDPR — TraduChat" },
      {
        name: "description",
        content:
          "Privacy di TraduChat: chi legge chat e vocali, chi li conserva, come funzionano le videochiamate e quali sono i tuoi diritti GDPR.",
      },
      { property: "og:title", content: "Privacy e GDPR — TraduChat" },
      {
        property: "og:description",
        content: "Chat, messaggi vocali e videochiamate su TraduChat: accesso ai contenuti, archiviazione, traduzione e diritti GDPR.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

type Block = { kind: "p" | "li"; text: string };

const BACK = "Torna alla home";
const TITLE = "Privacy e GDPR";
const INTRO =
  "Questa informativa spiega quali dati raccoglie TraduChat, perché e come puoi controllarli, secondo il Regolamento UE 2016/679 (GDPR).";

const SECTIONS: { title: string; blocks: Block[] }[] = [
  {
    title: "Chi tratta i tuoi dati",
    blocks: [
      {
        kind: "p",
        text: "Il titolare del trattamento (data controller) è Umbertodecicco Association (entità registrata nel Delaware, USA, EIN 37-2222305; Via Annunziata 30, 80139 Napoli, Italia), che opera con il marchio TraduChat e decide finalità e mezzi del trattamento dei dati descritti in questa informativa. Per qualsiasi richiesta sui tuoi dati puoi scrivere a admin@traduchat.com o inviare una richiesta di assistenza dalla pagina Impostazioni dell'app.",
      },
    ],
  },
  {
    title: "Con chi condividiamo i dati",
    blocks: [
      { kind: "li", text: "Fornitori di servizi che ci aiutano a far funzionare l'app: Lovable Cloud per hosting, database e spazio file; servizi di intelligenza artificiale tramite Lovable AI; Twilio per verifica telefonica e collegamento delle chiamate; servizi di invio email." },
      { kind: "li", text: "Paddle.com, il nostro rivenditore online e Merchant of Record, per la vendita dei pacchetti di crediti IA, i pagamenti, la gestione fiscale, le fatture e i rimborsi." },
      { kind: "li", text: "Consulenti professionali (legali e contabili), quando necessario." },
      { kind: "li", text: "Autorità pubbliche, solo quando richiesto dalla legge." },
      {
        kind: "p",
        text: "Base giuridica: esecuzione del contratto per fornirti il servizio e gestire gli acquisti, interesse legittimo per sicurezza e prevenzione abusi, obbligo di legge per gli adempimenti fiscali, consenso dove richiesto. Proteggiamo i dati con misure tecniche e organizzative adeguate, come cifratura e controlli di accesso. Se alcuni fornitori trattano dati fuori dallo Spazio economico europeo, il trasferimento avviene con garanzie adeguate (decisioni di adeguatezza o clausole contrattuali standard). Rispondiamo alle richieste sui tuoi diritti entro un mese.",
      },
    ],
  },
  {
    title: "Quali dati raccogliamo",
    blocks: [
      { kind: "li", text: "Dati dell'account: email, nome visualizzato, lingua, stato, foto del profilo." },
      {
        kind: "li",
        text: "Contenuti che invii: messaggi, traduzioni, testi, foto, PDF e messaggi vocali, insieme alla loro traduzione.",
      },
      {
        kind: "li",
        text: "Messaggi vocali: l'audio della tua voce che registri e invii nelle conversazioni, conservato come file audio insieme alla sua trascrizione e traduzione.",
      },
      { kind: "li", text: "Dati di utilizzo tecnici: data di accesso, stato online e ultima attività." },
      { kind: "li", text: "Numero di telefono, se scegli la registrazione o l'accesso telefonico." },
    ],
  },
  {
    title: "Chi può leggere le chat e ascoltare i vocali",
    blocks: [
      { kind: "p", text: "Nelle conversazioni possono leggere i messaggi, le trascrizioni e le traduzioni, e ascoltare i vocali, gli utenti autorizzati ad accedere alla stanza. Nei gruppi questi contenuti sono condivisi con i membri della conversazione, non soltanto con le persone presenti in una videochiamata. Chi entra con le modalità di accesso previste dalla stanza può consultare anche lo storico disponibile. Non condividere il codice o il link di una conversazione con persone a cui non vuoi dare accesso." },
      { kind: "p", text: "I messaggi non sono pubblicati automaticamente per tutti i visitatori del sito. Gli allegati e i vocali sono conservati in uno spazio file privato e resi disponibili tramite link temporanei, normalmente validi per 5 minuti. Chi possiede un link già generato può usarlo fino alla scadenza: evita di inoltrarlo fuori dalla conversazione." },
      { kind: "p", text: "I contenuti sono elaborati dai sistemi del servizio per archiviazione e traduzione. Non sono protetti da cifratura end-to-end che li renda illeggibili a TraduChat e ai servizi incaricati dell'elaborazione. Il titolare e i fornitori che gestiscono i sistemi possono avere accesso tecnico ai dati per erogare il servizio, assistenza, sicurezza o obblighi di legge; ciò è distinto dalla lettura da parte degli altri utenti. Il pannello amministrativo attuale mostra dati degli account e metadati delle conversazioni, come il numero e le date dei messaggi, non un elenco dei testi o un lettore di vocali." },
      { kind: "p", text: "Un partecipante può conservare una propria copia dei contenuti a cui ha accesso, per esempio scaricando un allegato, esportando la conversazione o effettuando una cattura dello schermo. TraduChat non può cancellare a distanza copie già salvate o condivise da altri partecipanti." },
    ],
  },
  {
    title: "Videochiamate reali",
    blocks: [
      { kind: "p", text: "Quando avvii, accetti o raggiungi una videochiamata, il browser chiede accesso a microfono e fotocamera. Audio e video dal vivo sono trasmessi tramite WebRTC agli altri partecipanti collegati alla chiamata, a due o di gruppo, con cifratura del trasporto. TraduChat non registra né archivia l'audio o il video dal vivo. Puoi disattivare la fotocamera, silenziare l'audio ricevuto o terminare la tua partecipazione. Non possiamo impedire che un altro partecipante effettui una registrazione con strumenti esterni." },
      { kind: "p", text: "Il pulsante microfono della chat registra invece un messaggio vocale che scegli di inviare: quel file, la sua trascrizione e la traduzione vengono archiviati nella conversazione, anche se registrati durante una videochiamata. Sono accessibili agli utenti autorizzati della stanza, compresi quelli non presenti nella chiamata, e restano disponibili dopo la sua conclusione secondo le regole della chat. L'audio parlato dal vivo non viene tradotto automaticamente: la traduzione riguarda i messaggi scritti e i vocali inviati." },
      { kind: "p", text: "Twilio fornisce il collegamento tra reti tramite server STUN/TURN e può trattare indirizzi IP e traffico cifrato necessario al collegamento. TraduChat conserva dati tecnici per negoziare la connessione e metadati quali stanza, partecipanti, stato e orari della chiamata per il funzionamento del servizio e il conteggio dei crediti; questi dati non sono registrazioni della conversazione audio o video." },
    ],
  },
  {
    title: "Crediti a consumo per le traduzioni",
    blocks: [
      { kind: "p", text: "Le traduzioni usano crediti a consumo: 1 credito per ogni messaggio scritto tradotto e 1 credito per ogni messaggio vocale tradotto, addebitati all’account che li invia. Le videochiamate, a due o di gruppo, costano 1 credito per ogni minuto iniziato dopo la risposta, scalato dal partecipante con più crediti in quel momento, non soltanto da chi chiama. Ogni nuovo account riceve 10 crediti gratuiti. Messaggi nella stessa lingua e lettura dei messaggi ricevuti restano gratuiti." },
      { kind: "p", text: "I due utenti collegati hanno saldi separati: per scambiarsi messaggi che richiedono una traduzione in entrambe le direzioni, ciascuno deve avere crediti disponibili sul proprio account. I crediti di un utente non sono condivisi e non coprono gli invii dell’altro. Se uno esaurisce il saldo, non può inviare nuovi messaggi da tradurre, ma può continuare a ricevere e leggere quelli dell’altro gratuitamente. Nelle videochiamate, a due o di gruppo, ogni minuto è scalato dal partecipante che in quel momento ha più crediti; la chiamata si interrompe solo quando nessun partecipante ha più crediti." },
      { kind: "p", text: "Per calcolare il saldo registriamo solo tipo di utilizzo, data e ora, numero di crediti scalati e il riferimento tecnico del messaggio o della chiamata (per i minuti di chiamata, l'inizio e la durata). Non registriamo audio o video delle chiamate. Base giuridica: esecuzione del contratto e obblighi contabili e fiscali; questi dati restano per il tempo richiesto dalla legge e puoi chiederne copia in qualsiasi momento. I pagamenti sono gestiti da Paddle.com come Merchant of Record." },
    ],
  },
  {
    title: "Registrazione telefonica: solo numeri verificati",
    blocks: [
      {
        kind: "p",
        text: "La registrazione tramite numero di telefono è consentita solo dopo aver verificato il numero inserendo il codice ricevuto via SMS o chiamata automatica. La verifica conferma che hai accesso al numero indicato; non costituisce una verifica della tua identità anagrafica. Gli altri metodi di registrazione disponibili non richiedono un numero telefonico.",
      },
      {
        kind: "p",
        text: "Per recapitare e controllare il codice, il numero viene trasmesso a Twilio, il servizio utilizzato per la verifica telefonica. I codici servono a proteggere l'accesso e prevenire abusi. Un numero inserito o modificato nel profilo non diventa automaticamente verificato.",
      },
    ],
  },
  {
    title: "Perché li usiamo",
    blocks: [
      { kind: "li", text: "Far funzionare chat, gruppi e traduzioni (esecuzione del servizio richiesto)." },
      { kind: "li", text: "Inviarti i codici di accesso e le notifiche legate alle conversazioni." },
      { kind: "li", text: "Sicurezza dell'app e prevenzione degli abusi (interesse legittimo)." },
      { kind: "p", text: "Non vendiamo i tuoi dati. Nella versione verificata non risultano tag pubblicitari Google Ads configurati. Gli strumenti di misurazione dell'hosting sono descritti nella Cookie policy, separatamente dai dati necessari al servizio." },
    ],
  },
  {
    title: "Consenso facoltativo agli aggiornamenti via email",
    blocks: [
      { kind: "p", text: "Con il tuo consenso specifico e facoltativo, Umbertodecicco Association può usare l'indirizzo email del tuo account per inviarti annunci sulle nuove funzionalità e sugli aggiornamenti di TraduChat, con admin@traduchat.com come mittente. La base giuridica è il consenso (articolo 6, paragrafo 1, lettera a, del GDPR), separato dall'accettazione dei termini e dalla presa visione di questa informativa." },
      { kind: "p", text: "Formula del consenso: «Acconsento a ricevere via email da admin@traduchat.com comunicazioni sugli aggiornamenti e sulle nuove funzionalità di TraduChat. Il consenso è facoltativo e posso revocarlo in qualsiasi momento»." },
      { kind: "p", text: "La registrazione, la lettura di questa pagina e l'uso dell'app non costituiscono consenso. La scelta deve essere espressa con un'azione positiva, senza caselle preselezionate. Rifiutare o revocare il consenso non limita l'accesso all'app, ai crediti acquistati o alle sue funzionalità." },
      { kind: "p", text: "Puoi revocare il consenso gratuitamente tramite il link di disiscrizione presente in ogni comunicazione oppure scrivendo a admin@traduchat.com. La revoca non pregiudica la liceità del trattamento effettuato prima della revoca. L'indirizzo viene usato per questi annunci fino alla revoca; l'eventuale prova del consenso e della revoca viene conservata solo per il tempo necessario a documentare la scelta e tutelare i diritti." },
      { kind: "p", text: "Puoi salvare o revocare la tua scelta qui sotto dopo l'accesso con un account con email verificata. Registriamo l'indirizzo email, la data e la versione del consenso; a ogni nuova accettazione inviamo a admin@traduchat.com un avviso con l'email dell'account e il link al sito. Gli annunci agli iscritti richiedono un servizio dedicato, non ancora attivo. Le email necessarie per accesso, sicurezza e acquisti restano distinte dagli annunci sugli aggiornamenti." },
    ],
  },
  {
    title: "Traduzione automatica",
    blocks: [
      {
        kind: "p",
        text: "Per tradurre i testi, trascrivere i messaggi vocali e leggere il testo dalle foto, i contenuti necessari vengono inviati ai servizi di intelligenza artificiale tramite Lovable AI. L'audio registrato di un vocale viene inviato per la trascrizione; il testo ottenuto viene elaborato per la traduzione. Anche le traduzioni automatiche nella lingua di lettura richiedono l'elaborazione del testo. La lettura ad alta voce può usare la sintesi del browser o del dispositivo, oppure un servizio di sintesi vocale al quale viene trasmesso il testo. Non dichiariamo che i fornitori non conservino dati o non li usino per addestramento senza una verifica delle rispettive condizioni. Per informazioni sulle condizioni applicabili puoi scrivere a admin@traduchat.com. Invia solo contenuti che sei disposto a far elaborare da servizi esterni.",
      },
      {
        kind: "p",
        text: "Risposte alla posta con l'IA: se incolli un'email ricevuta per preparare una risposta con l'intelligenza artificiale, il testo dell'email e le tue indicazioni vengono inviati al servizio AI che redige la risposta. Se scegli di ascoltare la risposta, anche il suo testo viene inviato a un servizio di sintesi vocale che lo trasforma in un breve messaggio vocale. TraduChat non conserva il testo incollato: resta solo nella pagina finché non chiudi o scrivi una nuova email.",
      },
    ],
  },
  {
    title: "Dove restano i dati e per quanto",
    blocks: [
      {
        kind: "p",
        text: "L'archiviazione del servizio è gestita da Umbertodecicco Association tramite Lovable Cloud: messaggi originali, trascrizioni, traduzioni e riferimenti agli allegati sono conservati nel database; i file vocali e gli altri allegati nello spazio file privato. La scadenza di un link temporaneo non cancella il file. Nella versione attuale non è prevista una scadenza automatica generale dello storico delle chat e dei vocali; la loro conservazione è distinta da quella dei dati contabili e dai tempi propri dei fornitori esterni.",
      },
      { kind: "p", text: "Il browser può conservare sul dispositivo copie locali dei messaggi, delle traduzioni e dei dati della conversazione, per ritrovare lo storico. Queste copie sono distinte dall'archivio del servizio e dai file eventualmente scaricati. Le voci e le durate della memoria locale sono descritte nella Cookie policy. Se usi un dispositivo condiviso, considera che chi accede al browser o ai file salvati potrebbe accedere anche alle copie locali." },
      { kind: "p", text: "Rimuovere un messaggio ricevuto dalla propria chat o un allegato dallo Storico lo nasconde per il proprio account: non cancella il messaggio condiviso né il file conservato per gli altri. La cancellazione condivisa di un messaggio, consentita al suo autore o al proprietario della conversazione, rimuove il messaggio e richiede la rimozione degli allegati associati dallo spazio file. Uscire da una stanza o rimuovere un contatto non equivale alla cancellazione dello storico per gli altri partecipanti." },
      { kind: "p", text: "Puoi richiedere la cancellazione assistita dell'account o dei tuoi dati nelle Impostazioni o scrivendo a admin@traduchat.com. La richiesta viene esaminata tenendo conto dei contenuti condivisi, dei diritti degli altri partecipanti e degli obblighi di conservazione: non determina una cancellazione automatica immediata di tutti i messaggi, file o documenti di acquisto. I dati personali vengono cancellati o anonimizzati quando non più necessari; i documenti degli acquisti restano per gli obblighi contabili applicabili. Le copie già salvate da altri partecipanti non sono cancellate da questa procedura." },
    ],
  },
  {
    title: "Aggiornamenti delle funzionalità",
    blocks: [
      {
        kind: "p",
        text: "TraduChat si arricchisce nel tempo di nuove funzionalità, come le storie, le community e l'assistente che risponde con testo, voce ed email. Ogni funzionalità aggiuntiva usa solo i dati necessari a offrirti quel servizio: la foto e la descrizione delle storie e delle community, per esempio, vengono conservate finché non le elimini o non esci dalla community.",
      },
      {
        kind: "p",
        text: "La sezione «Da ricordare» è stata rimossa: gli appunti con allarme, l'avviso email facoltativo e il pulsante WhatsApp non sono più disponibili e non parte più nessun avviso automatico. Gli appunti già salvati restano nel database e puoi chiederne la cancellazione con le modalità indicate nella sezione «I tuoi diritti». I codici SMS e le chiamate per accedere all'account restano disponibili.",
      },
    ],
  },
  {
    title: "I tuoi diritti",
    blocks: [
      { kind: "li", text: "Accedere ai tuoi dati e ottenerne una copia." },
      { kind: "li", text: "Correggere o aggiornare i dati del profilo, direttamente dall'app." },
      { kind: "li", text: "Rimuovere contenuti dalla propria vista e richiedere la cancellazione dei propri dati o dell'account, con le distinzioni e i limiti indicati nella sezione sulla conservazione." },
      { kind: "li", text: "Limitare o opporti a un trattamento e revocare un consenso dato." },
      { kind: "li", text: "Proporre reclamo al Garante per la protezione dei dati personali." },
    ],
  },
  {
    title: "Statistiche del sito e pubblicità",
    blocks: [
      {
        kind: "p",
        text: "Il sito pubblicato include Lovable Analytics, fornito dall'hosting Lovable tramite lo script /~flock.js e il percorso /~api/analytics. Lo script prevede un identificatore di sessione e dati come pagina visitata, provenienza della visita, informazioni del browser, lingua e paese stimato dal fuso orario. Non descriviamo questi dati come anonimi: l'anonimizzazione e la durata di conservazione sui sistemi del fornitore non sono state verificate. Nella versione controllata non risultano tag Google Analytics o Google Ads configurati.",
      },
      {
        kind: "p",
        text: "Il cookie statistico session-id ha una durata di 30 minuti, rinnovata agli eventi, e identifica una sessione in modo pseudonimo: non è un cookie anonimo. La scelta nel banner viene salvata sul dispositivo e non limita l'uso dell'app. Nella verifica del 26 ottobre 2026 le statistiche dell'hosting continuano anche scegliendo «Solo necessari». Non abbiamo attivato ulteriori cookie per statistiche anonime: prima occorre verificare l'anonimato effettivo e un blocco preventivo funzionante fino al consenso, ove richiesto. Per chiarimenti puoi scrivere a admin@traduchat.com.",
      },
    ],
  },
  {
    title: "Cookie",
    blocks: [
      {
        kind: "p",
        text: "Usiamo memoria del browser per accesso, preferenze e copie locali delle conversazioni. L'hosting può usare cookie tecnici e uno strumento di statistiche. La Cookie policy elenca nomi, finalità, durate e limiti della verifica, distinguendo i cookie dalla memoria locale.",
      },
    ],
  },
  {
    title: "Minori",
    blocks: [
      {
        kind: "p",
        text: "Il servizio non è destinato a minori di 14 anni senza il consenso di chi esercita la responsabilità genitoriale.",
      },
    ],
  },
];

const FOOTER = "Se aggiorniamo questa informativa, la nuova versione sarà pubblicata su questa pagina.";
const COOKIE_LINK = "Vai alla Cookie policy";

const FLAT: readonly string[] = [
  BACK,
  TITLE,
  INTRO,
  ...SECTIONS.flatMap((section) => [section.title, ...section.blocks.map((block) => block.text)]),
  FOOTER,
  COOKIE_LINK,
  "Ultimo aggiornamento: 30 ottobre 2026",
];

const SECTION_OFFSETS = (() => {
  let index = 3;
  return SECTIONS.map((section) => {
    const start = index;
    index += 1 + section.blocks.length;
    return start;
  });
})();

const FOOTER_INDEX = FLAT.length - 3;
const COOKIE_LINK_INDEX = FLAT.length - 2;
const UPDATED_INDEX = FLAT.length - 1;

function PrivacyPage() {
  const { texts, language, setLanguage, loading, rtl } = useAutoTranslatedTexts(FLAT);

  return (
    <div translate="no" className="min-h-screen bg-background text-foreground" dir={rtl ? "rtl" : "ltr"}>
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> {texts[0]}
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight">{texts[1]}</h1>
        </div>

        <p className="mt-3 text-sm text-muted-foreground"><time dateTime="2026-10-30">{texts[UPDATED_INDEX]}</time></p>
        <LegalLanguagePicker language={language} onChange={setLanguage} loading={loading} />

        <p className="mt-3 text-sm text-muted-foreground">{texts[2]}</p>
        <p className="mt-3 text-sm"><a className="text-primary underline" href="mailto:admin@traduchat.com">admin@traduchat.com</a></p>

        {SECTIONS.map((section, sectionIndex) => {
          const start = SECTION_OFFSETS[sectionIndex];
          if (start === undefined) return null;
          const paragraphs = section.blocks
            .map((block, i) => ({ ...block, text: texts[start + 1 + i] ?? block.text }))
            .filter((block) => block.kind === "p");
          const items = section.blocks
            .map((block, i) => ({ ...block, text: texts[start + 1 + i] ?? block.text }))
            .filter((block) => block.kind === "li");

          return (
            <section key={section.title} className="mt-8">
              <h2 className="font-sans text-lg font-bold text-foreground">{texts[start]}</h2>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {items.length ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {items.map((block) => (
                      <li key={block.text}>{block.text}</li>
                    ))}
                  </ul>
                ) : null}
                {paragraphs.map((block) => (
                  <p key={block.text}>{block.text}</p>
                ))}
              </div>
              {section.title === "Consenso facoltativo agli aggiornamenti via email" && <NewsletterConsent />}
            </section>
          );
        })}

        <p className="mt-6 text-sm">
          <Link to="/cookie" className="font-semibold text-primary underline">
            {texts[COOKIE_LINK_INDEX]}
          </Link>
        </p>

        <p className="mt-10 text-xs text-muted-foreground">{texts[FOOTER_INDEX]}</p>
      </main>
    </div>
  );
}
