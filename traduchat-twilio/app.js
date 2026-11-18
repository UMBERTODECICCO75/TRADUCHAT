// TraduChat - server chiamate tradotte
// Utente A chiama utente B dall'app (Twilio Voice SDK).
// Ogni lato della chiamata passa da Twilio ConversationRelay, che trascrive la voce (STT)
// e legge il testo (TTS). Questo server traduce con DeepL il testo di A e lo fa leggere a B, e viceversa.

import 'dotenv/config';
import express from 'express';
import http from 'http';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import twilio from 'twilio';

const {
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_API_KEY, TWILIO_API_SECRET,
  TWILIO_TWIML_APP_SID, TWILIO_CALLER_ID, DEEPL_API_KEY,
  PUBLIC_HOST, DEMO_SECRET, PORT = 3000,
  ALLOWED_ORIGINS = '', VALIDATE_TWILIO = 'true'
} = process.env;

for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_API_KEY', 'TWILIO_API_SECRET', 'TWILIO_TWIML_APP_SID', 'PUBLIC_HOST', 'DEMO_SECRET']) {
  if (!process.env[k]) { console.error(`Manca la variabile ${k} nel file .env`); process.exit(1); }
}

const client = twilio(TWILIO_API_KEY, TWILIO_API_SECRET, { accountSid: TWILIO_ACCOUNT_SID });

// Lingue supportate: codice ConversationRelay -> codice DeepL + frasi di servizio
const LANGS = {
  'it-IT': { deepl: 'IT',    calling: 'Chiamata in corso, attendi la risposta.', incoming: 'Chiamata TraduChat. Parla pure, verrai tradotto.' },
  'en-US': { deepl: 'EN-US', calling: 'Calling, please wait for an answer.',      incoming: 'TraduChat call. Go ahead and speak, you will be translated.' },
  'es-ES': { deepl: 'ES',    calling: 'Llamando, espera la respuesta.',           incoming: 'Llamada TraduChat. Habla, serás traducido.' },
  'fr-FR': { deepl: 'FR',    calling: 'Appel en cours, attendez la réponse.',     incoming: 'Appel TraduChat. Parlez, vous serez traduit.' },
  'de-DE': { deepl: 'DE',    calling: 'Anruf läuft, bitte warten.',               incoming: 'TraduChat-Anruf. Sprechen Sie, Sie werden übersetzt.' },
  'pt-BR': { deepl: 'PT-BR', calling: 'Chamando, aguarde a resposta.',            incoming: 'Chamada TraduChat. Fale, você será traduzido.' }
};
const DEFAULT_LANG = 'it-IT';

// Stato in memoria (per la demo). In produzione: Supabase/Redis.
const users = new Map();     // identity -> { lang, lastSeen }
const sessions = new Map();  // sessionId -> { a: {...}, b: {...}, created }
const listeners = new Map(); // identity -> Set(res) per i sottotitoli (Server-Sent Events)

const app = express();
app.set('trust proxy', true);
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// CORS per l'app traduchatchat.com
const origins = ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const o = req.headers.origin;
  if (o && origins.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static('public'));

const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_.-]{2,40}$/.test(id);
const esc = s => String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));
const checkSecret = s => typeof s === 'string' && s.length === DEMO_SECRET.length &&
  crypto.timingSafeEqual(Buffer.from(s), Buffer.from(DEMO_SECRET));

// 1) Token per il Voice SDK: l'app lo chiede dopo il login
app.post('/token', (req, res) => {
  const { identity, lang, secret } = req.body || {};
  if (!checkSecret(secret)) return res.status(401).json({ error: 'non autorizzato' });
  if (!validId(identity)) return res.status(400).json({ error: 'identity non valida (2-40 caratteri: lettere, numeri, . _ -)' });
  users.set(identity, { lang: LANGS[lang] ? lang : DEFAULT_LANG, lastSeen: Date.now() });

  const { AccessToken } = twilio.jwt;
  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, { identity, ttl: 3600 });
  token.addGrant(new AccessToken.VoiceGrant({ outgoingApplicationSid: TWILIO_TWIML_APP_SID, incomingAllow: true }));
  res.json({ token: token.toJwt(), identity, lang: users.get(identity).lang });
});

// Elenco utenti collegati (solo demo)
app.get('/users', (req, res) => {
  if (!checkSecret(req.query.secret)) return res.status(401).json({ error: 'non autorizzato' });
  const now = Date.now();
  res.json([...users].filter(([, u]) => now - u.lastSeen < 3600e3).map(([id, u]) => ({ identity: id, lang: u.lang })));
});

// Sottotitoli in tempo reale per l'app
app.get('/events', (req, res) => {
  const { identity, secret } = req.query;
  if (!checkSecret(secret) || !validId(identity)) return res.sendStatus(401);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write(': ok\n\n');
  if (!listeners.has(identity)) listeners.set(identity, new Set());
  listeners.get(identity).add(res);
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(ping); listeners.get(identity)?.delete(res); });
});
function emit(identity, data) {
  for (const r of listeners.get(identity) || []) r.write(`data: ${JSON.stringify(data)}\n\n`);
}

// TwiML che collega un lato della chiamata a ConversationRelay
function relayTwiml(sessionId, role, lang, greeting) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Connect>` +
    `<ConversationRelay url="wss://${esc(PUBLIC_HOST)}/relay" language="${esc(lang)}" welcomeGreeting="${esc(greeting)}" applicationReconnect="true">` +
    `<Parameter name="session" value="${esc(sessionId)}"/><Parameter name="role" value="${role}"/>` +
    `</ConversationRelay></Connect></Response>`;
}
const sayTwiml = (text, lang) =>
  `<?xml version="1.0" encoding="UTF-8"?><Response><Say language="${esc(lang)}">${esc(text)}</Say><Hangup/></Response>`;

// 2) Webhook della TwiML App: A ha premuto "Chiama"
const twilioCheck = VALIDATE_TWILIO === 'false' || !TWILIO_AUTH_TOKEN
  ? (req, res, next) => next()
  : twilio.webhook(TWILIO_AUTH_TOKEN, { url: undefined, host: PUBLIC_HOST, protocol: 'https' });

app.post('/voice', twilioCheck, async (req, res) => {
  const from = String(req.body.From || '').replace(/^client:/, '');
  const to = String(req.body.To || '').replace(/^client:/, '');
  const fromLang = users.get(from)?.lang || DEFAULT_LANG;
  res.type('text/xml');

  const target = users.get(to);
  if (!validId(to) || !target) return res.send(sayTwiml('Utente non disponibile.', 'it-IT'));

  const sessionId = crypto.randomUUID();
  const s = {
    a: { identity: from, lang: fromLang, callSid: req.body.CallSid, queue: [] },
    b: { identity: to, lang: target.lang, queue: [] },
    created: Date.now()
  };
  sessions.set(sessionId, s);

  // Fa squillare B nell'app
  client.calls.create({
    to: `client:${to}`,
    from: TWILIO_CALLER_ID || `client:${from}`,
    twiml: relayTwiml(sessionId, 'b', target.lang, LANGS[target.lang].incoming),
    timeout: 30,
    statusCallback: `https://${PUBLIC_HOST}/status?session=${encodeURIComponent(sessionId)}`,
    statusCallbackEvent: ['completed'],
    statusCallbackMethod: 'POST'
  }).then(c => { s.b.callSid = c.sid; })
    .catch(err => { console.error('Errore chiamata verso B:', err.message); hangup(s.a.callSid); });

  res.send(relayTwiml(sessionId, 'a', fromLang, LANGS[fromLang].calling));
});

// Esito della chiamata verso B: se non risponde, A lo sente nella sua lingua e la chiamata si chiude
const NO_ANSWER = {
  'it-IT': 'La persona non risponde. Riprova più tardi.', 'en-US': 'No answer. Please try again later.',
  'es-ES': 'No contesta. Inténtalo más tarde.', 'fr-FR': 'Pas de réponse. Réessayez plus tard.',
  'de-DE': 'Keine Antwort. Bitte später erneut versuchen.', 'pt-BR': 'Sem resposta. Tente mais tarde.'
};
app.post('/status', twilioCheck, (req, res) => {
  res.sendStatus(204);
  const s = sessions.get(String(req.query.session || ''));
  if (!s) return;
  const status = String(req.body.CallStatus || '');
  const duration = Number(req.body.CallDuration || 0);
  console.log(`Chiamata ${s.a.identity} -> ${s.b.identity}: ${status}, ${duration}s`);
  if (['no-answer', 'busy', 'failed', 'canceled'].includes(status) && !s.b.ws) {
    speak(s.a, NO_ANSWER[s.a.lang] || NO_ANSWER['it-IT']);
    setTimeout(() => endSide(s.a), 4000);
  }
});

app.get('/health', (req, res) => res.json({ ok: true, users: users.size, sessions: sessions.size }));

// 3) WebSocket ConversationRelay: riceve il parlato trascritto e rimanda la traduzione all'altro lato
const server = http.createServer(app);
// Twilio firma l'apertura del WebSocket (X-Twilio-Signature): si accettano solo connessioni autentiche
const wss = new WebSocketServer({
  server,
  path: '/relay',
  verifyClient: ({ req }) => {
    if (VALIDATE_TWILIO === 'false' || !TWILIO_AUTH_TOKEN) return true;
    const signature = req.headers['x-twilio-signature'];
    if (typeof signature !== 'string') return false;
    return [`wss://${PUBLIC_HOST}${req.url}`, `https://${PUBLIC_HOST}${req.url}`]
      .some(url => twilio.validateRequest(TWILIO_AUTH_TOKEN, signature, url, {}));
  }
});

wss.on('connection', ws => {
  let s = null, role = null;

  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'setup') {
      const p = m.customParameters || {};
      s = sessions.get(p.session);
      role = p.role;
      if (!s || !['a', 'b'].includes(role)) return ws.close();
      clearTimeout(s[role].dropTimer);
      s[role].ws = ws;
      s[role].closed = false;
      s[role].callSid = m.callSid || s[role].callSid;
      if (m.connectionType === 'reconnect') console.log(`Riconnesso ${role} (${s[role].identity}), tentativo ${m.reconnectAttempt}`);
      for (const msg of s[role].queue.splice(0)) ws.send(msg);
      return;
    }

    if (m.type === 'prompt' && s && m.last !== false && m.voicePrompt) {
      const me = s[role], other = s[role === 'a' ? 'b' : 'a'];
      const original = String(m.voicePrompt).trim();
      if (!original) return;
      const t0 = Date.now();
      const translated = await translate(original, other.lang);
      const ms = Date.now() - t0;
      speak(other, translated);
      const line = { from: me.identity, original, translated, fromLang: me.lang, toLang: other.lang, ms };
      emit(me.identity, line);
      emit(other.identity, line);
      return;
    }

    if (m.type === 'error') console.error('ConversationRelay:', m.description || m);
  });

  ws.on('close', code => {
    if (!s || !role || s[role].ws !== ws) return;
    s[role].ws = null;
    const finish = () => {
      s[role].closed = true;
      const other = s[role === 'a' ? 'b' : 'a'];
      if (!other.closed) endSide(other);
      if (s.a.closed && s.b.closed) for (const [id, v] of sessions) if (v === s) sessions.delete(id);
    };
    // Twilio si ricollega da solo dopo una caduta di rete (codici 1001/1006/1011/1012/1013): aspetta prima di chiudere l'altro lato
    if ([1001, 1006, 1011, 1012, 1013].includes(code)) s[role].dropTimer = setTimeout(finish, 12000);
    else finish();
  });
});

function speak(p, text) {
  const msg = JSON.stringify({ type: 'text', token: text, last: true });
  if (p.ws && p.ws.readyState === 1) p.ws.send(msg);
  else p.queue.push(msg); // B non ha ancora risposto: la frase parte appena risponde
}

// Chiude un lato: con il messaggio "end" se il WebSocket è aperto, altrimenti via API
function endSide(p) {
  if (p.ws && p.ws.readyState === 1) {
    try { p.ws.send(JSON.stringify({ type: 'end', handoffData: JSON.stringify({ reason: 'altro partecipante uscito' }) })); return; } catch { /* poi via API */ }
  }
  hangup(p.callSid);
}

function hangup(callSid) {
  if (callSid) client.calls(callSid).update({ status: 'completed' }).catch(() => {});
}

async function translate(text, targetLang) {
  if (!DEEPL_API_KEY) return text;
  const host = DEEPL_API_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  try {
    const r = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: [text], target_lang: LANGS[targetLang]?.deepl || 'EN-US' })
    });
    if (!r.ok) throw new Error(`DeepL ${r.status}`);
    const j = await r.json();
    return j.translations?.[0]?.text || text;
  } catch (e) {
    console.error('Traduzione non riuscita:', e.message);
    return text;
  }
}

// Pulizia sessioni vecchie
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) if (now - s.created > 2 * 3600e3) sessions.delete(id);
}, 600e3);

server.listen(PORT, () => console.log(`TraduChat call server su porta ${PORT} (https://${PUBLIC_HOST})`));
