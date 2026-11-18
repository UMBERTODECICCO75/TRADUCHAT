// TraduChat - avvio: senza chiavi parte l'interfaccia di configurazione (/setup),
// con le chiavi parte il server delle chiamate tradotte (app.js).
import 'dotenv/config';
import { needsSetup, startSetup } from './setup.js';

if (needsSetup(process.env)) startSetup(process.env.PORT || 3000);
else await import('./app.js');
