# Modulo Invia email

## Obiettivo
Aggiungere nell’area riservata una pagina “Email” dove l’utente può preparare un messaggio libero indicando destinatario, oggetto e testo.

## Esperienza utente
- Nuova voce “Email” nella navigazione principale.
- Modulo con destinatario, oggetto e messaggio, controlli di validità e limiti chiari.
- Il pulsante “Apri nell’app di posta” prepara l’email nel programma di posta del telefono o computer; l’invio finale resta sotto il controllo dell’utente.
- Messaggi di errore comprensibili quando mancano dati o l’indirizzo non è valido.

## Dettagli tecnici
- Nuova pagina autenticata `/email`, con metadati dedicati e stile coerente con TraduChat Italy.
- Composizione sicura del collegamento `mailto:` tramite codifica di destinatario, oggetto e corpo.
- Nessun invio automatico, nessun destinatario arbitrario trasmesso dal server e nessun uso del dominio email dell’app per messaggi liberi.
- Verifica della pagina su schermo mobile e desktop.
