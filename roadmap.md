# Roadmap
- [ ] Applicare abbonamento accesso ai nuovi utenti: 39 € ogni 31 giorni, 1000 crediti per rinnovo pagato, disdetta con accesso fino alla scadenza pagata; non imporlo automaticamente agli account esistenti. Bloccato da Lovable Cloud in pausa per crediti Cloud esauriti; acquisto crediti in chat non disponibile il 9 novembre 2026, nessun acquisto avviato e nessun nuovo pagamento attivato. Preservare crediti già acquistati; configurare esattamente 31 giorni (create_price non espone frequency, non sostituire con mensile/giornaliero).
- [ ] Ripristinare e verificare registrazione account: Lovable Cloud confermato in pausa il 9 novembre 2026; riattivazione richiesta ma fallita per crediti Cloud esauriti. Registrazione/accesso e letture non disponibili finché il workspace non aggiunge crediti Cloud; nessuna modifica ai flussi account.
- [ ] Individuare e correggere l’errore di connessione segnalato; verificare il percorso interessato dopo accesso.
- [x] Privacy aggiornata al 30 ottobre 2026: accesso alle chat e allo storico, archiviazione Lovable Cloud e copie locali, vocali/trascrizioni/traduzioni, rimozione personale distinta dalla cancellazione condivisa, accesso tecnico e limiti dei fornitori, chiamate a due/di gruppo non registrate e vocali persistenti. Eliminata la frase contraddittoria sui minuti al solo chiamante. Pagina verificata a schermo su desktop e 360px, nessun errore o overflow; 9 controlli logici superati. Non pubblicato.
- [ ] Videochiamate di gruppo con adesione esplicita, vocali tradotti nella chat esistente, silenzioso e uscita; verificare accesso, segnali e comandi.
- [x] Ascolto automatico vocali tradotti: comando attivabile nella chat, solo nuovi ricevuti, coda senza interruzioni, niente riproduzione dello storico, arresto su disattivazione/uscita. Comando verificato dopo accesso e a 360px; logica e voce provate con controlli automatici. Ascolto reale su telefono e nuovo vocale da un secondo utente non verificati. Non pubblicato.
- [x] Chat: lingua di lettura automatica predefinita, traduzione mostrata direttamente e originale espandibile; direzione vocali in chiamata coerente con la chat, richieste deduplicate e errori espliciti. Italiano/inglese verificati su messaggi reali dopo accesso, 13 test superati e nessun overflow a 360px. La prova di nuove traduzioni in francese ha restituito indisponibilità, non verificata una nuova traduzione riuscita né una chiamata collegata. Non pubblicato.
- [x] Privacy: saldi separati per gli invii tradotti dei due utenti, ricezione gratuita, minuti al chiamante; precisazioni sul cookie statistico pseudonimo e date 26/10/2026. Verificate le pagine; 5 test superati. Non pubblicato.
- [ ] Attivare statistiche realmente anonime con cookie: bloccate finché anonimato e consenso preventivo dell'hosting non sono verificati; nessun nuovo tracciamento attivato.
- [x] Privacy, Termini e Cookie policy datati 25/10/2026; inventario cookie e memoria locale, durate e Lovable Analytics aggiunto; rimosse affermazioni non verificate su Google Ads e anonimato. Tre pagine e scelta persistente verificate nel browser, 5 test superati, nessun errore pagina. Non pubblicato.
- [ ] Confermare con il fornitore hosting finalità dettagliata di __dpl, conservazione dei dati statistici e gestione del consenso preventivo per gli script iniettati: nessun controllo disponibile nel codice dell'app; non dichiarare «Solo necessari» come blocco degli script hosting.
- [x] Urdu (Pakistan) nei selettori condivisi, elenco pubblico, codici voce/trascrizione, riconoscimento telefono e lettura RTL; 40 test lingue superati e traduzione reale Italiano→Urdu verificata dopo accesso senza errori pagina. Voce/trascrizione reali non verificate; non pubblicato.
- [x] Consenso newsletter salvato nella Privacy, avviso operativo a admin@traduchat.com con link al sito; 4 test superati e prova autenticata di accettazione/invio, persistenza e revoca riuscita. Nessun errore pagina o overflow a 360px. Non pubblicato; invio degli annunci agli iscritti non attivo.
- [x] Correggere conferme di pagamento prive del codice pacchetto, verificare pagamenti reali contro accrediti e aggiornare saldo/conferma al ritorno dal pagamento. 3 pagamenti reali completati, tutti accreditati; 21 test superati. Da pubblicare.
- [x] Controllo generale 24/10/2026: frase italiana realmente tradotta tramite pagina Traduzioni verso tutte le 36 scelte (Italiano resta invariato), messaggio rapido Italiano→Inglese mostrato nella home; 54 test distinti superati tra lingue, chiamate, messaggi nascosti, avvisi, cache audio, login e minuti. Test lingue ampliati da 23 a tutte le 36 mappature; build OK, nessun errore pagina nelle prove browser. In una stanza esistente verificati comandi e anteprima con camera/microfono simulati (640×480, tracce live), non una chiamata collegata a un secondo dispositivo. Nessuna pubblicazione.
- [ ] Completare verifica vocale e video multilingue su due dispositivi: mancano seconda persona collegata, audio parlato nelle 36 lingue e voci installate (browser di prova senza voci); restano non verificati qualità linguistica di ogni coppia, trascrizione/lettura reale per ogni lingua, collegamento TURN tra reti diverse e consumo effettivo a saldo zero. La videochiamata usa chat tradotta, non sottotitoli automatici dell'audio dal vivo.
- [x] Correggere i tre problemi SEO della homepage: titoli Google/social descrittivi, funzioni incluse nell’h1 senza cambiare la scritta scelta, testo alternativo del logo contestuale; rimuovere i metadati pagina duplicati dal root. Modifiche da pubblicare.
- [x] Arabo nel login con lettura da destra a sinistra, rilevamento browser e scelta ricordata; Groenlandese (Kalaallisut) e Inupiaq nei selettori condivisi dell’app con codici lingua. 26 test superati e selezioni verificate dopo accesso; login, registrazione, recupero e validazione arabi verificati. Qualità della traduzione, trascrizione e voci reali per le due nuove lingue non verificata; disponibilità vocale dipendente dal fornitore/dispositivo. Non pubblicato.
- [x] Squillo bip per chiamate ad app aperta e campanella con pallino rosso numerato per messaggi recenti non letti su questo dispositivo (ultimi 12 ricevuti). Verificati chiamata reale, bip ripetuti e arresto all’annullamento, elenco messaggi e riduzione del contatore aprendo la chat; 3 test superati. Non pubblicato. Il browser richiede un primo tocco per consentire il suono.
- [ ] Avvisi sonori di videochiamata ad app chiusa: collegare il servizio notifiche push, consenso per dispositivo, invio al destinatario e apertura della conversazione; verificare su dispositivo reale. In attesa del collegamento Firebase Cloud Messaging con web push.
- [x] Cancellare un contatto dalla schermata rapida: cestino accanto al microfono di ogni contatto nella home, con la stessa conferma di Impostazioni (sparisce dall'elenco e si esce dalle conversazioni condivise, chat e messaggi restano agli altri). Verificato nel browser con contatto di prova: conferma, messaggio «Contatto Prova è stato cancellato dai contatti.», contatto assente dopo il ricaricamento; typecheck pulito, build OK.

- [x] Demo videochiamata rimossa dalla home: eliminati VideoCallDemo.tsx, video-call-demo.ts e relativi test; la videochiamata reale resta attiva nelle conversazioni, con un nuovo pulsante a icona videocamera nell'intestazione della stanza che porta alla sezione chiamata. Verificato dopo accesso nel browser; build OK.
- [x] Schermo intero nella videochiamata reale: pulsante «Schermo intero» e «Esci dallo schermo intero», video dell'altra persona a tutto schermo con il proprio in basso a destra e comandi sovrapposti. Fullscreen del browser su desktop/Android, sovrapposizione a tutta pagina su iPhone (Esc chiude, pagina dietro non scorre). 3 test superati, verificato nel browser a 1280x900 e 390x844 senza overflow o errori; build OK.
- [x] Italiano, svedese, greco e serbo selezionabili nella demo videochiamata e nella chat tradotta delle chiamate; 29 test superati, 12 combinazioni lingua/situazione e quattro opzioni della chat verificate dopo accesso; build OK.
- [x] Tasto con cornetta «Chiama» nella videochiamata reale, collegato al contatto selezionato e all'avvio della chiamata esistente.
- [x] Attivare la videochiamata reale verso un utente registrato: chiamata verificata tra due account reali (deciccoumberto12@gmail.com e umbertodecicco8@gmail.com) nella conversazione SYCP3C4ZSD — squillo, accettazione, «In chiamata» su entrambi, video remoto 640x480 e 320x240 con tracce audio e video, messaggio arrivato durante la chiamata, «Termina» riporta entrambi a «Videochiama». L'app riceve 4 server di collegamento (3 TURN Twilio) dal percorso autenticato; il solo transito TURN non è verificabile da questo ambiente (UDP bloccato), serve una prova su due dispositivi e reti diverse.

- [x] Videochiamate reali uno-a-uno nelle conversazioni: consenso audio/video, destinatario, accettazione atomica, Twilio TURN temporaneo, chat tradotta sincronizzata, controlli microfono/fotocamera e chiusura. Verificate tra due account isolati con tracce audio e video ricevute, messaggio consegnato durante la chiamata, rifiuto e arresto delle tracce; telefono senza overflow e invio visibile. 5 test superati, build OK. Non pubblicate; collegamento su due dispositivi fisici/reti diverse e sottotitoli vocali automatici non verificati/implementati.

- [x] Demo videochiamata tradotta del link pubblico aggiunta come prima sezione dopo accesso: 3 situazioni, 9 lingue, cambio prospettiva, pausa, riavvio, sottotitoli e chiusura; simulata, senza crediti, microfono, videocamera o salvataggio. 2 test superati, controlli dopo accesso e telefono senza overflow o errori; build OK.

- [x] Rimuovere traduzione offline, accessi e modello scaricabile; vecchio worker ritirato e cache pagina eliminate, chat conservate. Navigazione e rimozione cache verificate nel browser.
- [x] Ridurre attese iniziali dell’assistente: quote parallele, digest foto sovrapposto alla riconciliazione, stesso modello e protezioni; 27 test superati e risposta diretta reale verificata. Nessun confronto end-to-end dopo modifica: account a 0 crediti di prova (blocco verificato), serve ricarica per misurarlo.

- [x] Aggiungere fotocamera, foto e screenshot nell’assistente IA: anteprima rimovibile, immagini validate senza archivio, prenotazione legata alla foto; 24 test superati, scatto con fotocamera simulata e screenshot letto/tradotto realmente, un credito (2→1), controlli su telefono senza sovrapposizioni.

- [x] Rendere apribili i link nelle risposte dell'assistente IA senza interpretare HTML o indirizzi eseguibili.
- [x] Consentire all'assistente IA di leggere i siti pubblici indicati nella domanda tramite Firecrawl autorizzato, citando i link; nessun accesso a siti privati o invio di moduli.

- [x] Pulsante «Cancella conversazione» nell'assistenza IA: nasconde domanda e risposta con un tocco, voce interrotta, nessuna modifica a crediti o storico.


- [x] Ottimizzare l’assistenza IA: ragionamento leggero sullo stesso modello e nessuna rilettura duplicata del saldo dopo successo; 13 test superati, prova reale 4,39→3,89 secondi e un solo credito per risposta (7→6). Misura singola, non garanzia dei tempi futuri.

- [x] Aggiungere svedese, danese, norvegese e azerbaigiano a selettori, voce, trascrizione e riconoscimento della lingua del telefono; 19 test superati e selezione delle quattro lingue verificata nell’app.

- [x] Nuovo audit di acquisti, crediti e account: codice, funzioni applicate, cataloghi test/live e apertura checkout con account reale verificati; nessuna ricarica completata.
- [x] Implementare il piano approvato: saldi separati, accrediti atomici, rimborsi cumulativi e contestazioni, recupero risposte fallite, storico paginato, account telefonici immutabili, codici email atomici, assegnazione admin per account, richieste assistite e dati venditore confermati. 38 test superati; risposta reale 9→8, apertura pagamento test e richiesta assistenza verificati.
- [x] Pubblicare l'email di assistenza fornita nelle pagine Termini, Privacy e Rimborsi.
- [ ] Completare documenti: servono indirizzo professionale e dati di registrazione applicabili del venditore.
- [ ] Completare la prova manuale di acquisto/rimborso in anteprima e verifica venditore: servono inserimento carta test e documenti nel pannello Pagamenti; nessun incasso bancario verificato.

- [x] Rimuovere la sezione «Da ricordare» dalla schermata iniziale (appunti, allarmi, avviso email e pulsante WhatsApp); hook promemoria reso inerte, nessuna email automatica in partenza, 9 test superati.
- [x] Togliere i pulsanti «Inizia gratis» e «Ho già un account» dalla pagina iniziale; resta «Accedi» in alto a destra.
- [x] Rimuovere SMS «Da ricordare» e preparare lettura telefonica italiana con consenso separato; 5 test superati, appunti verificati con account reale su telefono.
- [x] Sbloccare opzione chiamata: job gestito separato ogni minuto, consenso abilitato, 7 test superati; callback senza credenziali o con credenziali invalide respinto (401), rifiuto del numero non verificato confermato nell'app.
- [x] Ritirare l'attivazione delle chiamate «Da ricordare», sostituite dall'invio manuale WhatsApp.
- [x] Rimuovere avvisi telefonici e job chiamate; condivisione manuale WhatsApp verificata con account reale (salvataggio, apertura, ricarica ed eliminazione), 8 test superati.
- [x] Correggere gestione degli invii falliti: nuovo tentativo per SMS rifiutati, nessun reinvio automatico con esito incerto; 3 test senza invii reali.
- [ ] Proteggere autenticazione dei promemoria programmati — non risolto: il job email non ha metadati gestiti e non è eliminabile; l'invio è disattivato nel hook, il job resta inerte.

- [x] Aggiornare lingue: tagalog, punjabi, wolof, hindi, coreano e cinese mandarino; mantenere giapponese e polacco, verificare selettori e mappature (9 test; traduzione reale in coreano e selettori email verificati).

- [x] Mostrare i messaggi ricevuti nella schermata iniziale con avviso immediato all'arrivo
- [x] Aggiungere un selettore emoji alle conversazioni con inserimento nel punto del cursore
- [x] Rendere i vocali registrati più nitidi e uniformi senza alterare la voce

- [x] Aggiungere zoom, pizzico e trascinamento alle foto condivise nelle conversazioni
- [x] Consentire foto dello stato fino a 25 MB, mantenendo privato il relativo archivio
- [x] Mostrare nella schermata iniziale un pulsante «Senza segnale» per aprire la traduzione offline
- [x] Aggiungere un modello scaricabile per tradurre testi sul dispositivo senza Internet, con pagina utilizzabile offline dopo la preparazione iniziale

- [x] Registrazione/accesso con codice OTP via email (numero di telefono opzionale salvato nel profilo)
- [x] Traduzioni: limite del testo alzato a 6000 caratteri (anche per il PDF)
- [x] Rimuovere lo spazio azienda conservando chat e traduzioni esistenti
- [x] Ordinare e rendere più definita la scheda partecipanti
- [x] Mostrare la foto dell’account nella navigazione e aggiornarla subito dopo il salvataggio
- [x] Barra di ricerca partecipanti nella schermata iniziale (/app)
- [x] Aggiungere Storico per conservare, consultare e scaricare PDF, foto e file personali e delle conversazioni
- [x] Consentire accesso telefonico senza password anche tramite chiamata automatica con codice
- [x] Aggiungere installazione sulla schermata iniziale con nome e logo TraduChat
- [x] Correggere recupero password: codice a sei cifre e rientro dall'email
- [x] Rendere il pannello amministrativo leggibile su telefono e limitare l'accesso agli amministratori già autorizzati
- [x] Aggiungere il turco a traduzione e voce; verificare configurazione SMS e chiamata Twilio e proteggere la verifica dei codici
- [x] Mostrare nel pannello admin i nomi degli utenti registrati
- [x] Consentire un nickname nel profilo e mostrarlo nelle conversazioni e nel pannello admin
- [x] Consentire di cancellare gli allegati dallo Storico senza cancellarli dalle conversazioni degli altri
- [x] Consentire di modificare il testo dei propri messaggi inviati e aggiornare la traduzione
- [x] Chiudere la richiesta Telegram: nessuna integrazione attiva senza il collegamento del bot
- [x] Eliminare chiamate e videochiamate tradotte: rimossi pulsanti e componente (l'app resta con vocali tradotti dal microfono nei contatti)
- [x] Mostrare nella schermata di apertura, sotto il logo, la scritta "Open With a tap ✨"
- [x] Correggere i sottotitoli: evitare traduzioni duplicate, riavviare il riconoscimento e mostrare il testo originale se la traduzione fallisce
- [x] Usare un modello linguistico recente per le traduzioni e l'assistente nell'app
- [x] Evitare richieste automatiche ripetute per i ticket di traduzione e mostrare il limite raggiunto senza una schermata vuota
- [x] Ripristinare Gemini 3.7 Flash solo per i sottotitoli delle chiamate, senza richieste ticket condivise con la traduzione rapida
- [x] Mostrare i contatti con icona telefono per avviare la chiamata tradotta nella conversazione condivisa
- [x] Rendere cancellabili i vocali tradotti inviati, inclusi audio e testo, senza farli ricomparire dalla cache locale

- [x] Pulsante "Condividi" sui vocali in chat: condivisione di sistema, altrimenti scarica il file

- [x] Fotocamera nella home: scatta foto, legge il testo, lo traduce e la invia in una conversazione (verificata in anteprima; da provare con foto reale su telefono)
- [x] Storie nel profilo: foto con frase visibile ai contatti per 24 ore, pubblicazione ed eliminazione dal profilo, riga "Storie dei contatti" nella home
- [x] Scelta della lingua di destinazione dei messaggi tradotti (testi e vocali): italiano, inglese, spagnolo, francese nel selettore "Leggi tutta la chat in"
- [x] Pulsante "Scatta" in ogni chat: apre la fotocamera e invia la foto nel messaggio (accanto a "Foto" dalla galleria)

- [x] Barra "Ricerca nel web" nella schermata iniziale: cerca su Google e apre i risultati nel browser
- [x] Pulsante "Invita con Telegram" nei gruppi accanto a WhatsApp: apre Telegram con messaggio e link di iscrizione
- [x] Pulsante "Installa app" nella schermata iniziale: prompt nativo su Android/PC, istruzioni guidate su iPhone; firma dev/Umbertodecicco
- [x] Firma dev/Umbertodecicco anche nella schermata di apertura
- [x] Pulsante "Scarica l'app" nella schermata di apertura: installazione veloce con un tocco
- [x] Agenda «Da ricordare» nella home con data, ora, dettatura e allarmi
- [x] Nella pagina Email, pulsante "Ascolta la risposta": la risposta IA diventa un breve messaggio vocale (voce AI, WAV)
- [x] Privacy/GDPR aggiornata con la risposta email IA e la risposta vocale IA (sintesi vocale)
- [x] Da ricordare: avviso via email anche ad app chiusa (controllo ogni 5 minuti)
- [x] Da ricordare: richiesta WhatsApp automatico sostituita dall'invio manuale scelto dall'utente; nessun collegamento Business necessario.
- [x] Avvisi «Da ricordare» via SMS (Twilio); Telegram in attesa del collegamento del bot
- [x] Rimossa la sezione «Installa l'app» dalla schermata iniziale: l'installazione resta dal pulsante «Scarica l'app» nella schermata di apertura
- [x] Logo TraduChat più grande e nitido: schermata di apertura, intestazione della home e pagina iniziale pubblica, con icona dell'app rigenerata ad alta risoluzione
- [x] Pubblicare traduchat.app così che umbertodecicco.dev mostri l'app pubblicata
- [x] Targhetta di firma aggiornata da "dev/Umbertodecicco🌐" a "umbertodecicco.app" (apertura, home, installazione app)
- [x] Scritta della pagina iniziale cambiata in "Comunica con tutto il mondo"
- [x] Pulsante «Ascolta la risposta» per l'assistente nella home (voce IA)
- [x] Community aperta: crea con nome e lingue, entra con codice, condividi su WhatsApp/Telegram, esci
- [x] Link di invito community (/community-join) e pagina 404 in italiano
- [x] Community: copertina, foto, tema e argomento mostrati anche nell'intestazione della chat della community
- [x] Lingua russa aggiunta ovunque (chat, traduzioni, offline, voce, trascrizione, risposte email)
- [x] Dispositivi collegati in Impostazioni: elenco di PC, tablet, telefoni e orologi con ultimo accesso, scollegamento manuale e pulizia automatica dopo un mese
- [x] Dirette video nelle community: il creatore trasmette dalla fotocamera, i membri guardano con pochi secondi di ritardo
- [x] Pulsante «Torna a Home» su tutte le funzioni: barra di navigazione (9 pagine), intestazione della chat, pagina Offline
- [x] Lingua portoghese (Brasile) aggiunta ovunque (chat, traduzioni, voce, trascrizione, rilevamento automatico della lingua del telefono)
- [x] Lingua vietnamita aggiunta ovunque (chat, traduzioni, voce, trascrizione, rilevamento automatico della lingua del telefono)
- [x] Aggiungere serbo e slovacco a selettori, voce, trascrizione e rilevamento della lingua; 13 test superati, selezione di entrambe e traduzione reale dallo slovacco verificate nell’app.
- [x] Lingua mongola aggiunta ovunque (chat, traduzioni, voce, trascrizione, rilevamento automatico della lingua del telefono); 14 test superati.
- [x] Targhetta «umbertodecicco.app 🌐» ora è un collegamento cliccabile (apre umbertodecicco.app in una nuova scheda) su home, splash e sezione «Installa l'app».
- [x] Lingua croata aggiunta ovunque (chat, traduzioni, voce, trascrizione, rilevamento automatico della lingua del telefono).
- [x] Crediti IA a pagamento: pagamenti attivati (Paddle), pacchetti 50/200/1000 crediti (2,99/9,99/39,99 €), 10 crediti gratis, saldo per utente, pulsante «Ricarica crediti» nell'assistenza IA, accredito automatico dopo il pagamento; 27 test superati, consumo verificato (10→9). Per pagamenti reali serve la verifica del venditore dal pannello Pagamenti.
- [x] Audit pagamenti/crediti IA: consumo atomico, rimborsi scalano i crediti, storico «Le mie ricariche», conferma dopo pagamento, webhook multi-articolo; 27 test superati.
- [x] Pulsante «Cancella» su tutti i messaggi ricevuti: nella home («Messaggi ricevuti») e in ogni bolla ricevuta della stanza; il messaggio scompare solo per chi lo cancella, gli altri lo vedranno ancora; nascosto anche nella copia offline; test integrazione superati, verificato nel browser (home e stanza) senza errori.
- [x] Pagina di accesso tradotta in it/en/es/fr/de/ru con lo stesso selettore della presentazione (scelta condivisa); verificata in russo su telefono.

- [x] Sicurezza: solo il creatore può cambiare le lingue di una conversazione. Non pubblicato.

- [x] Ottimizzazione costi IA: cache condivisa traduzioni (tabella translation_cache), cache audio 24h + dedup richieste simultanee, timeout rete TTS 60s, limite a raffica voce 10/10min; 3 test superati. Non pubblicato.
- [x] Crediti a consumo (chat 1, vocale 1, videochiamata 1/min dal registro esistente) e assistente IA tolto dalla home — da pubblicare
- [x] Pannello di ricarica nascosto: le tre opzioni (50/200/1000 crediti) compaiono solo aprendo il pulsante «Ricarica crediti» in una finestra; verificato nel browser su home e «Le mie ricariche» (nessun pacchetto sulla pagina, tre nella finestra, chiusura con Esc, nessun errore console).
- [x] Cookie policy: «Messaggi vocali» è ora una voce dell'elenco con etichetta in grassetto (il testo non inizia più da solo in minuscolo) e «Cambia la tua scelta» è un titolo separato sopra i pulsanti «Accetta tutto» / «Solo necessari», che prima mostravano frasi sbagliate. 5 test superati (src/lib/cookie-page.test.js) e verifica nel browser in italiano; build OK. Non pubblicato.
- [x] Vocali nei gruppi: selettore «Parlo in» nel compositore e nella videochiamata di gruppo per scegliere la lingua parlata; il server accetta qualsiasi lingua supportata come origine nei gruppi (destinazione sempre una lingua della stanza). 11 test superati, selettore verificato nel browser dopo accesso (scelta Giapponese). Invio reale di un vocale in altra lingua non provato. Non pubblicato.
- [x] Pubblicato il 10/11/2026 su https://www.traduchat.app: pulsante «Scarta messaggio» verificato nel codice della pagina chat live (chunk stanza._code-Bcc-TXUf.js), così un messaggio rifiutato in modo permanente non blocca più la conversazione. Scan di sicurezza di base non completato (nessun problema segnalato, scansione profonda del codice non eseguita); risultati agent_security_v2 e supply_chain fermi al 22/10/2026 — ripetere lo scan prima di condividere ampiamente.
