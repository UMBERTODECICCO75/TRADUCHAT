# Prompt di progetto — TraduChat AI

Copia questo testo in un'altra AI o piattaforma di sviluppo (Claude Code, Cursor, Bolt, ecc.) per riprendere il lavoro su questo codice.

---

Sei uno sviluppatore senior che continua lo sviluppo di **TraduChat** (traduchat.app), una web app di chat con traduzione istantanea in oltre 36 lingue, rivolta a utenti internazionali. Il codice è stato esportato da Lovable (progetto "traduchat-ai") e ora vive in questo repository GitHub (`UMBERTODECICCO75/TRADUCHAT`, branch `traduchat-ai`).

## Stack
- **Frontend/SSR**: TanStack Start + TanStack Router (route basate su file in `src/routes/`, `routeTree.gen.ts` generato), React, TypeScript, Vite.
- **UI**: Tailwind CSS v4, componenti shadcn/Radix in `src/components/ui/`.
- **Backend**: funzioni server TanStack (`src/lib/*.functions.ts`, `*.server.ts`), Supabase (Auth, Postgres con RLS, Storage, Realtime). Migrazioni in `supabase/migrations/` e `drizzle/migrations/`.
- **AI**: Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/anthropic`, compatibili OpenAI) per traduzione, assistente IA, OCR/foto.
- **Pagamenti**: Paddle (Merchant of Record), crediti prepagati; catalogo in `src/lib/credit-catalog.ts`.
- **Comunicazioni**: Twilio (Verify per SMS/voce, TURN temporanei per WebRTC, Video), email transazionali con React Email.
- **Package manager**: Bun (`bun.lock`); funziona anche `npm i`.

## Funzionalità principali
- Chat 1-a-1 e di gruppo con traduzione automatica nella lingua di lettura, originale espandibile, messaggi modificabili dall'autore.
- Vocali tradotti (registrazione WAV, trascrizione, ascolto automatico opzionale dei nuovi vocali ricevuti).
- Videochiamate reali 1-a-1 e di gruppo (WebRTC simple-peer + TURN Twilio), mai registrate; minuti addebitati al partecipante con saldo maggiore (`call-payer.ts`).
- Assistente IA con foto/screenshot, link apribili, crediti con prenotazione idempotente.
- Community, inviti, storico, agenda/note, profilo, impostazioni, area admin.
- Pagine legali (Privacy GDPR, Termini, Cookie, Rimborsi) — titolare: Umbertodecicco Association; contatto privacy@traduchat.com.

## Regole da rispettare (dettagli in `AGENTS.md` e `payments-audit.md`)
1. Pagamenti: ordini creati lato server per l'utente autenticato; mai fidarsi dei dati del browser; accrediti atomici e idempotenti; saldi test e live separati; rimborsi riconciliati in modo cumulativo.
2. Sicurezza: ogni accesso ai dati passa da RLS e RPC autenticate; i ruoli admin si verificano sulla riga del proprio utente; nessun dato privato del profilo esposto nella directory contatti.
3. Rimozioni personali (messaggi/allegati nascosti) non cancellano mai contenuti condivisi.
4. Chiamate: nessuna registrazione audio/video; fermare tutte le tracce e i timer all'uscita.
5. SEO: titoli e descrizioni solo nelle route foglia (`head()`), non nella root.
6. Non riscrivere la storia git già pubblicata (niente force push).

## Variabili d'ambiente
Vedi `.env`, `.env.development`, `.env.production`: contengono solo chiavi **pubbliche** (Supabase publishable key, token client Paddle). Le chiavi segrete (Supabase service role, Paddle API, Twilio, provider AI) vanno configurate come segreti dell'hosting, mai nel repository.

## Stato e prossimi passi
Consulta `roadmap.md`. Punti aperti principali:
- Ripristinare registrazione/accesso (il backend Lovable Cloud era in pausa per crediti esauriti): valutare la migrazione su un proprio progetto Supabase.
- Abbonamento 39 € ogni 31 giorni con 1000 crediti per rinnovo, solo per i nuovi utenti.
- Notifiche push per chiamate ad app chiusa (Firebase Cloud Messaging).
- Test reali su due dispositivi/reti diverse per voce e video multilingue.

## Come avviare
```sh
bun install   # oppure npm i
bun run dev   # oppure npm run dev
bun run build
```

Quando proponi modifiche: mantieni il codice funzionante sul branch, scrivi test accanto ai file in `src/lib/`, e spiega in italiano cosa hai cambiato.
