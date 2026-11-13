# Rendere affidabili acquisti, crediti e account di TraduChat

## Esito della verifica
- I tre pacchetti corrispondono ai prezzi effettivi sia di prova sia reali: **50 / 2,99 €, 200 / 9,99 €, 1000 / 39,99 €**. Sono acquisti singoli: **nessun abbonamento, rinnovo o cambio piano**.
- Sono già presenti accesso, saldo personale, storico, pagine legali pubbliche e finestra di pagamento. Ho aperto il pagamento da un account autenticato: prezzo corretto, modalità di prova e nessun errore nell'apertura con lingua italiana.
- Non risulta ancora una ricarica completata: accredito dopo pagamento, rimborsi e versamenti bancari **non sono verificati**.
- Il controllo attuale approva privacy, rimborsi, prezzi e tipologia di prodotto. Restano da completare i dati del venditore nei Termini e la verifica personale: il precedente blocco sulla tipologia di prodotto non risulta più presente.

## Decisioni confermate
- Venditore: **Umbertodecicco Association**; marchio: **TraduChat**.
- **Cancellazione assistita** dell'account, senza cancellare le conversazioni degli altri.
- **Rimborso completo entro 30 giorni**, anche con crediti parzialmente utilizzati; detrazione senza saldo negativo.
- Restano invariati prezzi, 10 crediti gratuiti, assenza di scadenza e un credito per risposta dell'assistente. Le risposte non riuscite non devono costare crediti.

## Correzioni da realizzare

### 1. Accrediti e saldo
- Registrare acquisto e accredito insieme: un errore o una consegna ripetuta del pagamento non deve perdere o duplicare crediti.
- Assegnare i 10 crediti gratuiti una sola volta anche a chi acquista prima di aprire l'assistente. Evitare che letture contemporanee ripristinino accidentalmente il saldo a 10.
- Separare saldi, consumi e storico di prova da quelli reali. Le ricariche simulate non devono alimentare l'uso del sito pubblicato.
- Gestire le risposte IA con prenotazione del credito, conferma al successo e restituzione in caso di errore; impedire doppi addebiti della stessa richiesta.

### 2. Pagamento e conferma
- Conservare un unico catalogo condiviso fra prezzi pubblici, assistente e accredito; controllare importi, valuta, stato e acquisto singolo prima del pagamento.
- Associare l'ordine all'utente autenticato sul server; non fidarsi solo dell'identificativo passato dal browser.
- Per gli account telefonici, chiedere un'email reale per ricevute senza trasformarla automaticamente nell'email d'accesso.
- Mostrare il pagamento confermato solo dopo aver ritrovato l'acquisto registrato; distinguere pagamento in elaborazione, annullato, fallito e accredito in ritardo. Interrompere correttamente gli aggiornamenti quando si lascia la pagina.
- Validare prezzi ammessi, quantità e ambiente; mostrare errori comprensibili se il pagamento non è disponibile. Sul sito pubblicato indicare l'indisponibilità finché la verifica venditore è incompleta.

### 3. Rimborsi e storico
- Applicare solo rimborsi approvati, non quelli ancora in attesa; detrazione proporzionata per rimborsi parziali, completa per quelli totali.
- Registrare il rimborso e detrarre insieme, una sola volta. Gestire nuovi tentativi e più rimborsi dello stesso ordine.
- Spostare il controllo sul server e renderlo paginato, senza dipendere dall'apertura dell'assistente o dai primi 50 acquisti. Aggiungere riconciliazione affidabile compatibile con le notifiche già configurate, senza creare destinazioni duplicate.
- Storico paginato con errori e riprova; mostrare acquisti con più articoli, crediti effettivamente rimborsati e separazione prova/reale.
- Verificare le rettifiche e contestazioni disponibili dal gestore; non trattare una contestazione in attesa come un rimborso definitivo.

### 4. Accesso e gestione account
- Separare contatti modificabili da identità verificata d'accesso; correggere la ricerca degli account telefonici affinché modificare il contatto email non impedisca di accedere.
- Non unire automaticamente account o trasferire crediti tra email, telefono e accessi social. Conservare l'identificativo dell'account nei cambi verificati; chiarire eventuali account distinti.
- Correggere l'assegnazione amministratori: destinatario selezionato per account immutabile e identità reale, mai per email di profilo modificabile; mantenere il controllo del ruolo di chi assegna.
- Rendere atomici i tentativi dei codici email, bloccare invii quando il limite non è verificabile e controllare gli errori di creazione profilo. Uniformare gli errori degli accessi social, mantenendo le protezioni del recupero password e della verifica telefonica.
- Verificare le impostazioni effettive dei servizi di accesso e i percorsi disponibili; segnalare quelli non configurati senza inventare configurazioni riuscite.
- Aggiungere una richiesta di cancellazione autenticata, conferma e stato consultabile; gestione assistita con controllo dei crediti residui, conservazione contabile necessaria e tutela dei contenuti condivisi. Nessuna cancellazione automatica di acquisti o file altrui.

### 5. Documenti e contatti
- Sostituire il generico venditore nei Termini e nella Privacy con **Umbertodecicco Association**, mantenendo il marchio TraduChat e l'indicazione del rivenditore dei pagamenti.
- Esplicitare la cancellazione assistita e la garanzia confermata di 30 giorni. Rimuovere rimandi a contatti inesistenti; conservare paddle.net per richieste sui pagamenti.
- Inserire il contatto pubblico e l'indirizzo professionale appena forniti, senza usare automaticamente l'email d'accesso né inventare dati fiscali. Le pagine dovranno essere rilette dal venditore.

## Dettagli tecnici
- Interventi principali: `payments.functions.ts`, `paddle.ts`, `paddle.server.ts`, webhook pubblico dei pagamenti, `AskAiBar.tsx`, `/ricariche`, funzioni assistente, profilo, verifica email/telefono e amministrazione.
- Nuove migrazioni additive per operazioni atomiche, saldi distinti, registro di richieste IA/rettifiche e richieste di cancellazione. Tutte le scritture finanziarie restano privilegiate; letture limitate al proprietario, gestione assistita autorizzata agli amministratori.
- Gli attuali saldi non hanno provenienza per ambiente. Prima della separazione, verificare gli acquisti esistenti e attribuire in modo documentato senza perdere crediti reali. Al controllo attuale gli acquisti registrati sono zero.
- Logica server compatibile con l'ambiente di pubblicazione, caricamento privilegiato solo dopo autorizzazione; catalogo e calcoli puri riutilizzabili nei test. Registrare le regole architetturali in `AGENTS.md`.
- Test concreti: 10 gratis, importi dei pacchetti, acquisto iniziale, concorrenza, rollback e duplicati; consumo riuscito/fallito; rimborso totale/parziale/in attesa/ripetuto; isolamento prova/reale; accessi non autorizzati, email di profilo falsificata e accesso telefonico dopo modifica contatto.

## Prove in anteprima dopo le correzioni
1. Accedi, apri l'assistente e annota il saldo **di prova**. Scegli 50 crediti.
2. Nella finestra di prova inserisci **4242 4242 4242 4242**, **CVC 123**, nome qualsiasi e scadenza futura. L'inserimento della carta va fatto manualmente.
3. Verifica conferma, saldo aumentato esattamente di 50 e una sola voce nello storico; ricarica la pagina e controlla che non aumenti ancora.
4. Fai una domanda: una risposta riuscita deve costare esattamente 1 credito. Un errore non deve consumarlo.
5. Usa **4000 0000 0000 0002** per il pagamento rifiutato: nessun accredito.
6. Dal pannello Pagamenti prova rimborso completo e parziale; dopo approvazione verifica la detrazione corretta e che non si ripeta.
7. Verifica separazione dal saldo reale, errori dello storico, richiesta di cancellazione, modifica dei contatti e recupero accesso.

## Limiti e dati ancora mancanti
- **Email pubblica di assistenza e indirizzo professionale non forniti**: non impediscono le correzioni tecniche, ma bloccano il completamento dei contatti e dei documenti. Non richiederò documenti d'identità in chat.
- La verifica personale e l'approvazione per incassare devono essere completate dal venditore nel pannello Pagamenti. Il codice non può sostituirle.
- Una carta di prova non trasferisce denaro al conto bancario. Nessun versamento reale sarà dichiarato verificato senza una transazione e una conferma effettive.
- Nessuna pubblicazione automatica inclusa: il sito pubblico va aggiornato dopo controllo delle pagine e autorizzazione del venditore.