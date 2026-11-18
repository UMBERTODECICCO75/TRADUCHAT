# TRADUCHAT · Chiamate tradotte con Twilio (demo)

Con questa demo un utente dell'app chiama un altro utente registrato. Ciascuno parla nella propria lingua e sente l'altro tradotto, con i sottotitoli sullo schermo.

```
 App (utente A)                         Server TraduChat (VPS)                 App (utente B)
 Twilio Voice SDK ──chiama──► Twilio ──► /voice ── fa squillare ──► Twilio ──► Twilio Voice SDK
                               │                                     │
                    ConversationRelay ◄──── WebSocket /relay ────► ConversationRelay
                    (voce→testo, testo→voce)   traduzione DeepL    (voce→testo, testo→voce)
```

## Contenuto

| File | A cosa serve |
|---|---|
| `server.js` | Server Node.js: token, webhook Twilio, traduzione, sottotitoli |
| `public/index.html` | Pagina di test: aprila su due telefoni e fate una chiamata |
| `lovable/TraduCall.tsx` | Componente React da incollare nel progetto Lovable di traduchatchat.com |
| `.env.example` | Le chiavi da compilare |

---

## 1. Twilio Console

1. **API Key**: Account → *API keys & tokens* → *Create API key* (Standard). Copia `SK…` e il *Secret* in `TWILIO_API_KEY` e `TWILIO_API_SECRET`.
2. **Account SID e Auth Token**: dalla home della Console, in `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN`.
3. **TwiML App**: Voice → *Manage* → *TwiML apps* → *Create*
   - Voice Request URL: `https://call.workoftraduchat.it/voice` (metodo **POST**)
   - Copia il SID `AP…` in `TWILIO_TWIML_APP_SID`.
4. **ConversationRelay**: in Voice → *Settings* attiva le funzioni AI/ML (Twilio chiede di accettare l'addendum sulle funzioni AI). Senza questo passaggio ConversationRelay non parte.
5. (Facoltativo) un numero Twilio in `TWILIO_CALLER_ID`, solo se in futuro vuoi chiamare anche numeri di telefono normali.

## 2. DeepL

Crea un account **DeepL API Free** e copia la chiave (finisce con `:fx`) in `DEEPL_API_KEY`. Il server usa da solo l'indirizzo giusto, Free o Pro.

## 3. Installazione sul VPS Keliweb

```bash
# Node 18 o superiore
cd /opt && git clone <repo> traduchat-twilio   # oppure carica la cartella via SFTP
cd traduchat-twilio
cp .env.example .env && nano .env              # compila le chiavi
npm install
npm start                                      # prova: deve dire "TraduChat call server su porta 3000"
```

Per tenerlo sempre acceso:
```bash
npm i -g pm2 && pm2 start server.js --name traduchat-call && pm2 save && pm2 startup
```

## 4. Sottodominio e nginx

Crea il record DNS `call.workoftraduchat.it` → IP del VPS. Poi in nginx:

```nginx
server {
  server_name call.workoftraduchat.it;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;     # WebSocket per ConversationRelay
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_buffering off;                        # sottotitoli in tempo reale
    proxy_read_timeout 3600s;
  }
}
```
```bash
sudo certbot --nginx -d call.workoftraduchat.it && sudo nginx -s reload
```
Controllo: `https://call.workoftraduchat.it/health` deve rispondere `{"ok":true,...}`.

## 5. Prova con due telefoni

1. Apri `https://call.workoftraduchat.it` su due dispositivi.
2. Sul primo entra come `umberto` (Italiano), sul secondo come `john` (English), con la stessa *chiave demo* (`DEMO_SECRET`).
3. Da `umberto` tocca `john` nella lista e premi **Chiama** → su `john` compare **Rispondi**.
4. Parlate: ognuno sente la voce tradotta e vede i sottotitoli con i tempi di traduzione.

## 6. Inserirlo nell'app (Lovable)

1. Nel progetto Lovable di traduchatchat.com chiedi: *"Installa @twilio/voice-sdk e aggiungi il componente TraduCall che ti incollo, in una pagina /chiamate visibile solo agli utenti loggati"*, poi incolla `lovable/TraduCall.tsx`.
2. Passa come `identity` l'ID dell'utente loggato e come `lang` la lingua del suo profilo.
3. Imposta `CALL_SERVER` con l'indirizzo del tuo server.

## 7. Prima di andare in produzione

- **Login vero**: sostituisci `DEMO_SECRET` con la verifica del token Supabase dell'utente in `/token`, `/users` ed `/events`. Oggi la chiave demo è visibile nel codice dell'app.
- **Dati persistenti**: utenti online e sessioni sono in memoria; spostali su Supabase o Redis se usi più server.
- **Crediti**: Twilio e DeepL si pagano a consumo oltre le soglie gratuite. Scala i minuti dal saldo dell'utente (Paddle) a fine chiamata, usando la durata dalla callback di stato Twilio.
- **Privacy GDPR**: il parlato passa da Twilio (trascrizione/sintesi) e da DeepL (traduzione). Aggiungili come responsabili del trattamento nell'informativa.

## Sicurezza e affidabilità lato Twilio

- **Firma Twilio**: `/voice`, `/status` e il WebSocket `/relay` accettano solo richieste firmate da Twilio (`X-Twilio-Signature`, verificata con `TWILIO_AUTH_TOKEN`). Lascia `VALIDATE_TWILIO=true` in produzione.
- **Riconnessione**: ConversationRelay usa `applicationReconnect="true"`. Se la connessione cade (riavvio del server, rete), Twilio si ricollega da solo e la chiamata continua; l'altro lato viene chiuso solo se il collegamento non torna entro 12 secondi.
- **Non risponde / occupato**: se il chiamato non risponde, rifiuta o è occupato, chi chiama lo sente nella propria lingua e la chiamata si chiude.
- **Fine chiamata**: quando uno dei due riaggancia, l'altro lato viene chiuso con il messaggio `end` di ConversationRelay.
- **Log**: `pm2 logs traduchat-call` mostra esito e durata di ogni chiamata (utile per scalare i crediti).

## Lingue già configurate

Italiano, Inglese, Spagnolo, Francese, Tedesco, Portoghese (BR). Per aggiungerne una, inserisci una riga nell'oggetto `LANGS` in `server.js` e nelle `<select>` delle pagine.
