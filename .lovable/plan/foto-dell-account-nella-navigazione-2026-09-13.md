# Foto dell’account nella navigazione

## Obiettivo
Mostrare la foto salvata nel profilo accanto alla voce “Profilo” in tutte le pagine dell’area personale, con l’iniziale come alternativa quando manca una foto.

## Modifiche
- Recuperare nome e foto del profilo nella barra di navigazione già presente.
- Visualizzare una miniatura circolare accanto a “Profilo”.
- Aggiornare subito la miniatura dopo il salvataggio o la rimozione della foto, senza dover ricaricare la pagina.
- Mantenere invariati caricamento foto, privacy e resto della navigazione.

## Dettagli tecnici
- Riutilizzare il collegamento temporaneo già generato per le foto private.
- Riutilizzare il componente avatar esistente e aggiungere un piccolo evento locale dopo il salvataggio del profilo.
- Verificare il risultato sia su telefono sia su schermo grande.
