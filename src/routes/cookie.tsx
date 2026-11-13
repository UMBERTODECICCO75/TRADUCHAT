import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Cookie } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LegalLanguagePicker } from "@/components/LegalLanguagePicker";
import { useAutoTranslatedTexts } from "@/lib/useAutoTranslatedTexts";

export const Route = createFileRoute("/cookie")({
  head: () => ({
    meta: [
      { title: "Cookie policy — TraduChat" },
      {
        name: "description",
        content:
          "Cookie e memoria locale di TraduChat: nomi, finalità, durata, statistiche Lovable e scelta sui cookie.",
      },
      { property: "og:title", content: "Cookie policy — TraduChat" },
      {
        property: "og:description",
        content: "Nomi, finalità e durata dei cookie e dei dati locali di TraduChat, con dettagli sugli strumenti di statistiche dell'hosting.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CookiePage,
});

const FLAT: readonly string[] = [
  "Torna alla home",
  "Cookie policy",
  "Questa pagina distingue i cookie (inviati al sito nelle richieste) dalla memoria locale del browser (localStorage e sessionStorage). Informativa aggiornata il 26 ottobre 2026 sulla base delle verifiche del sito pubblicato; alcuni strumenti vengono aggiunti dall'hosting solo sul sito pubblicato.",
  "Cosa salviamo",
  "Accesso",
  "la sessione che ti tiene collegato al tuo account. Senza questo non puoi usare chat e traduzioni.",
  "Preferenze",
  "tema chiaro o scuro, lingue scelte, messaggi in attesa di invio quando sei senza rete.",
  "Statistiche del sito",
  "Lovable Analytics, aggiunto dall'hosting al sito pubblicato; non è verificata l'anonimizzazione né il collegamento alla scelta nel banner. Dettagli e durata dell'identificatore sono indicati sotto.",
  "Pubblicità",
  "nella versione verificata non risultano tag Google Ads o Google Analytics configurati; non elenchiamo cookie pubblicitari non riscontrati.",
  "Messaggi vocali",
  "le registrazioni audio della tua voce restano sul dispositivo solo mentre sono in attesa di invio senza rete; dopo l'invio sono conservate nel servizio, non in cookie o memoria locale.",
  "Cambia la tua scelta",
  "Accetta tutto",
  "Solo necessari",
  "Hai accettato tutto.",
  "Hai scelto solo i necessari.",
  "Non è stato possibile salvare la scelta su questo dispositivo.",
  "Vai alla Privacy e GDPR",
  "Ultimo aggiornamento: 26 ottobre 2026",
  "Cookie: nome, fornitore, finalità e durata",
  "session-id — Lovable Analytics, tramite l'hosting del sito. Cookie statistico con identificatore pseudonimo delle visite, non anonimo. Lo script /~flock.js configura una durata di 1.800 secondi (30 minuti), rinnovata quando registra un evento. Nella verifica del sito pubblicato il cookie viene impostato e le statistiche vengono inviate anche dopo la scelta «Solo necessari».",
  "__cf_bm — Cloudflare, infrastruttura dell'hosting. Protezione da traffico automatizzato e abusi; rilevato sul sito pubblicato, con durata di 30 minuti e possibile rinnovo.",
  "__dpl — hosting del sito. Cookie tecnico di distribuzione della versione pubblicata; rilevato con scadenza di circa 24 ore. La finalità dettagliata è da confermare con il fornitore.",
  "sidebar_state — TraduChat, solo se viene usata la barra laterale che lo imposta. Ricorda se è aperta o chiusa; durata 604.800 secondi (7 giorni) dall'ultima modifica. Non rilevato nelle pagine legali controllate.",
  "Memoria persistente (localStorage): nomi e durata",
  "Questi elementi non sono cookie e non hanno una scadenza automatica impostata dall'app, salvo le rimozioni indicate. Restano fino alla cancellazione dei dati del sito da parte tua, alla loro rimozione da parte dell'app o del browser. Cambiare una preferenza sostituisce il valore precedente.",
  "traduchat:cookie-consent — TraduChat. Memorizza «accepted» o «rejected», senza scadenza automatica; puoi sostituire la scelta con i pulsanti di questa pagina.",
  "sb-<identificativo>-auth-token e chiavi temporanee associate per l'accesso — servizio di autenticazione di Lovable Cloud. Mantengono la sessione, rinnovata durante l'uso; la sessione salvata viene rimossa alla disconnessione. La scadenza del token non coincide con quella della memoria locale. I verificatori temporanei dell'accesso vengono rimossi al completamento del relativo flusso.",
  "traduchat:theme, traduchat:font, traduchat:landing-lang, traduchat:preferred-lang — TraduChat. Tema, stile di scrittura e lingue; nessuna scadenza automatica. La lingua preferita può essere rimossa azzerando la relativa scelta.",
  "traduchat:ai-tone, traduchat:ai-lang, traduchat.alerts.enabled, traduchat:call-sound — TraduChat. Preferenze per tono e lingua dell'assistente, notifiche e suono delle chiamate; nessuna scadenza automatica.",
  "traduchat:device-session — TraduChat. Identificatore tecnico del dispositivo per il servizio; nessuna scadenza automatica.",
  "traduchat:message-read:<utente> — TraduChat. Stato locale di lettura dei messaggi per il contatore degli avvisi; nessuna scadenza automatica.",
  "traduchat:ui-tr:<lingua> — TraduChat. Copia locale delle traduzioni dell'interfaccia; nessuna scadenza automatica.",
  "traduchat:chat:<stanza>, traduchat:chat-translations:<stanza>, traduchat:chat-room:<stanza>, traduchat:chat-hidden:<stanza> — TraduChat. Copie locali dei messaggi, traduzioni, informazioni della stanza e messaggi nascosti. Nessuna scadenza temporale automatica; massimo 500 messaggi per stanza. Le chiavi della stanza vengono rimosse quando l'app cancella la relativa copia locale.",
  "traduchat:outbox:<stanza> — TraduChat. Testi in attesa di invio senza rete; nessuna scadenza temporale automatica. La chiave viene rimossa quando la coda è vuota, dopo l'invio o la rimozione dei messaggi.",
  "traduchat:agenda — TraduChat. Eventuali vecchi appunti locali della funzione ritirata; nessuna scadenza automatica. Non attiva promemoria o avvisi.",
  "Memoria della scheda (sessionStorage)",
  "traduchat:post-auth — TraduChat. Destinazione da aprire dopo l'accesso; rimossa quando viene usata, altrimenti resta per la sessione della scheda.",
  "Strumento per le statistiche e limiti della verifica",
  "Lovable Analytics è fornito dall'hosting Lovable tramite /~flock.js e /~api/analytics. Lo script prevede pagina e indirizzo visitati, pagina di provenienza, informazioni del browser, lingua, paese stimato dal fuso orario e identificatore di sessione. I dati sono quindi potenzialmente pseudonimi, non dichiarati anonimi. La durata di 30 minuti riguarda il cookie, non i dati raccolti sui sistemi del fornitore: la loro conservazione e i destinatari ulteriori non sono stati verificati.",
  "L'hosting carica anche /__l5e/events…js per eventi tecnici. Nel codice controllato di questo script non risultano scritture di cookie o memoria locale; questo non esclude il trattamento di dati tecnici nelle richieste di rete. Per l'informativa del fornitore: https://lovable.dev/privacy; per Cloudflare: https://www.cloudflare.com/privacypolicy/.",
  "Il banner salva la scelta ma non blocca gli script statistici aggiunti dall'hosting nella versione verificata. Non sono stati aggiunti ulteriori cookie per statistiche anonime: occorre prima verificare l'anonimato dei dati e rendere operativo il consenso preventivo, ove richiesto. Per fermare le statistiche attuali occorre disattivare Visitor analytics nelle impostazioni di pubblicazione dell'hosting; questa impostazione non è stata modificata. Rifiutare non limita chat, accesso o crediti.",
  "Gestione e cancellazione",
  "Puoi modificare la scelta qui sotto e cancellare cookie e dati del sito dalle impostazioni privacy del browser. La cancellazione può disconnetterti e rimuovere preferenze, copie locali delle chat e messaggi non ancora inviati; non cancella i messaggi già salvati nel servizio né costituisce una richiesta di cancellazione dell'account. Per informazioni o richieste: admin@traduchat.com.",
];

function CookiePage() {
  const { texts, language, setLanguage, loading, rtl } = useAutoTranslatedTexts(FLAT);
  const [saved, setSaved] = useState<"accepted" | "rejected" | "error" | null>(null);

  function setChoice(value: "accepted" | "rejected") {
    try {
      localStorage.setItem("traduchat:cookie-consent", value);
      setSaved(value);
    } catch {
      setSaved("error");
    }
  }

  const savedMessage =
    saved === "accepted" ? texts[17] : saved === "rejected" ? texts[18] : saved === "error" ? texts[19] : null;

  return (
    <div translate="no" className="min-h-screen bg-background text-foreground" dir={rtl ? "rtl" : "ltr"}>
      <main className="mx-auto w-full max-w-2xl px-5 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> {texts[0]}
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Cookie className="size-5" />
          </span>
          <h1 className="font-sans text-2xl font-extrabold tracking-tight">{texts[1]}</h1>
        </div>

        <p className="mt-3 text-sm text-muted-foreground"><time dateTime="2026-10-26">{texts[21]}</time></p>
        <LegalLanguagePicker language={language} onChange={setLanguage} loading={loading} />

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          <p>{texts[2]}</p>
        </div>

        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[3]}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            <strong className="text-foreground">{texts[4]}:</strong> {texts[5]}
          </li>
          <li>
            <strong className="text-foreground">{texts[6]}:</strong> {texts[7]}
          </li>
          <li>
            <strong className="text-foreground">{texts[8]}:</strong> {texts[9]}
          </li>
          <li>
            <strong className="text-foreground">{texts[10]}:</strong> {texts[11]}
          </li>
          <li>
            <strong className="text-foreground">{texts[12]}:</strong> {texts[13]}
          </li>
        </ul>

        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[22]}</h2>
        <ul className="mt-2 list-disc space-y-3 pl-5 break-words text-sm text-muted-foreground">
          <li>{texts[23]}</li><li>{texts[24]}</li><li>{texts[25]}</li><li>{texts[26]}</li>
        </ul>
        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[27]}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{texts[28]}</p>
        <ul className="mt-3 list-disc space-y-3 pl-5 break-words text-sm text-muted-foreground">
          <li>{texts[29]}</li><li>{texts[30]}</li><li>{texts[31]}</li><li>{texts[32]}</li>
          <li>{texts[33]}</li><li>{texts[34]}</li><li>{texts[35]}</li><li>{texts[36]}</li>
          <li>{texts[37]}</li><li>{texts[38]}</li>
        </ul>
        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[39]}</h2>
        <p className="mt-2 break-words text-sm text-muted-foreground">{texts[40]}</p>
        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[41]}</h2>
        <div className="mt-2 space-y-3 break-words text-sm text-muted-foreground">
          <p>{texts[42]}</p><p>{texts[43]}</p><p>{texts[44]}</p>
        </div>
        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[45]}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{texts[46]}</p>

        <h2 className="mt-8 font-sans text-lg font-bold text-foreground">{texts[14]}</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button className="rounded-full sm:flex-1" onClick={() => setChoice("accepted")}>
            {texts[15]}
          </Button>
          <Button
            variant="secondary"
            className="rounded-full sm:flex-1"
            onClick={() => setChoice("rejected")}
          >
            {texts[16]}
          </Button>
        </div>
        {savedMessage ? <p className="mt-3 text-sm text-primary">{savedMessage}</p> : null}

        <p className="mt-10 text-xs text-muted-foreground">
          <Link to="/privacy" className="font-semibold text-primary underline">
            {texts[20]}
          </Link>
        </p>
      </main>
    </div>
  );
}
