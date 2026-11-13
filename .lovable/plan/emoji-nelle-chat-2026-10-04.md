# Emoji nelle chat

## Cosa verrà aggiunto
- Un pulsante emoji accanto agli allegati e al microfono nella conversazione.
- Un pannello compatto con emoji comuni, organizzate per categoria e comodo da usare con il tocco.
- Tocco o clic su un’emoji per inserirla nel punto corrente del testo, senza inviare subito il messaggio.
- Chiusura automatica del pannello dopo la scelta, mantenendo invariati invio, traduzione e messaggi offline.

## Dettagli tecnici
- Creare un piccolo componente riutilizzabile per il selettore emoji usando i controlli grafici già presenti nell’app.
- Collegarlo al campo di scrittura della stanza e preservare correttamente cursore, limite di 5.000 caratteri e accessibilità.
- Verificare compilazione e funzionamento visivo su desktop e telefono.
