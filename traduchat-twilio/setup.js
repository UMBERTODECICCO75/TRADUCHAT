// TraduChat - interfaccia di configurazione delle chiavi.
// Parte al posto del server quando mancano le chiavi (o con FORCE_SETUP=1).
// Protetta da un codice monouso salvato in .setup-code e mostrato dallo script di installazione.

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.resolve('.env');
const CODE_PATH = path.resolve('.setup-code');
const FORCE_PATH = path.resolve('.force-setup');

const FIELDS = [
  { key: 'TWILIO_ACCOUNT_SID', label: 'Account SID', hint: 'Console Twilio, home: inizia con AC', pattern: /^AC[0-9a-f]{32}$/i, required: true },
  { key: 'TWILIO_AUTH_TOKEN', label: 'Auth Token', hint: 'Console Twilio, home, sotto l’Account SID', pattern: /^[0-9a-f]{32}$/i, required: true, secret: true },
  { key: 'TWILIO_API_KEY', label: 'API Key SID', hint: 'Account → API keys & tokens: inizia con SK', pattern: /^SK[0-9a-f]{32}$/i, required: true },
  { key: 'TWILIO_API_SECRET', label: 'API Key Secret', hint: 'Mostrato una sola volta quando crei la API Key', pattern: /^[A-Za-z0-9]{20,64}$/, required: true, secret: true },
  { key: 'TWILIO_TWIML_APP_SID', label: 'TwiML App SID', hint: 'Voice → TwiML apps: inizia con AP', pattern: /^AP[0-9a-f]{32}$/i, required: true },
  { key: 'TWILIO_CALLER_ID', label: 'Numero Twilio (facoltativo)', hint: 'Formato +39… — lascia vuoto se non chiami numeri di telefono', pattern: /^(\+[1-9]\d{6,14})?$/, required: false },
  { key: 'DEEPL_API_KEY', label: 'Chiave DeepL', hint: 'DeepL API Free: finisce con :fx', pattern: /^[0-9a-f-]{36}(:fx)?$/i, required: false, secret: true },
  { key: 'ALLOWED_ORIGINS', label: 'Siti autorizzati', hint: 'Separati da virgola', pattern: /^[a-z0-9:/.,\- ]*$/i, required: false }
];

export function needsSetup(env) {
  return fs.existsSync(FORCE_PATH) || FIELDS.some(f => f.required && !env[f.key]);
}

function readEnv() {
  const out = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i > 0 && !line.trimStart().startsWith('#')) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

function writeEnv(values) {
  const current = readEnv();
  const merged = { ...current, ...values };
  const body = Object.entries(merged).map(([k, v]) => `${k}=${String(v).replace(/[\r\n]/g, '')}`).join('\n') + '\n';
  fs.writeFileSync(ENV_PATH, body, { mode: 0o600 });
  fs.chmodSync(ENV_PATH, 0o600);
}

const esc = s => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));

async function checkTwilio(v) {
  const results = [];
  const auth = (u, p) => 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64');
  const base = `https://api.twilio.com/2010-04-01/Accounts/${v.TWILIO_ACCOUNT_SID}`;
  try {
    const r = await fetch(`${base}.json`, { headers: { Authorization: auth(v.TWILIO_ACCOUNT_SID, v.TWILIO_AUTH_TOKEN) } });
    results.push({ ok: r.ok, text: r.ok ? 'Account SID e Auth Token corretti' : `Account SID o Auth Token non validi (${r.status})` });
  } catch (e) { results.push({ ok: false, text: 'Twilio non raggiungibile: ' + e.message }); }
  try {
    const r = await fetch(`${base}/Applications/${v.TWILIO_TWIML_APP_SID}.json`, { headers: { Authorization: auth(v.TWILIO_API_KEY, v.TWILIO_API_SECRET) } });
    if (r.ok) {
      const app = await r.json();
      const expected = `https://${process.env.PUBLIC_HOST}/voice`;
      results.push({ ok: true, text: `API Key corretta, TwiML App «${app.friendly_name}» trovata` });
      results.push({ ok: app.voice_url === expected, text: app.voice_url === expected ? `Voice URL corretta (${expected})` : `Voice URL della TwiML App è «${app.voice_url || 'vuota'}»: impostala su ${expected} (POST)` });
    } else {
      results.push({ ok: false, text: r.status === 404 ? 'TwiML App SID non trovato in questo account' : `API Key o Secret non validi (${r.status})` });
    }
  } catch (e) { results.push({ ok: false, text: 'Verifica API Key non riuscita: ' + e.message }); }
  return results;
}

async function checkDeepl(key) {
  if (!key) return [{ ok: true, warn: true, text: 'Nessuna chiave DeepL: le frasi passano senza traduzione' }];
  const host = key.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com';
  try {
    const r = await fetch(`https://${host}/v2/usage`, { headers: { Authorization: `DeepL-Auth-Key ${key}` } });
    if (!r.ok) return [{ ok: false, text: `Chiave DeepL non valida (${r.status})` }];
    const u = await r.json();
    return [{ ok: true, text: `DeepL attivo: usati ${Number(u.character_count).toLocaleString('it-IT')} di ${Number(u.character_limit).toLocaleString('it-IT')} caratteri questo mese` }];
  } catch (e) { return [{ ok: false, text: 'DeepL non raggiungibile: ' + e.message }]; }
}

function page({ values = {}, errors = {}, results = [], saved = false, code }) {
  const rows = FIELDS.map(f => `
    <label for="${f.key}">${esc(f.label)}${f.required ? ' *' : ''}</label>
    <input id="${f.key}" name="${f.key}" type="${f.secret ? 'password' : 'text'}" autocomplete="off" spellcheck="false"
      value="${f.secret ? '' : esc(values[f.key])}" placeholder="${f.secret && values[f.key] ? '•••••• già salvato: lascia vuoto per non cambiarlo' : ''}">
    <small class="${errors[f.key] ? 'err' : ''}">${esc(errors[f.key] || f.hint)}</small>`).join('');
  const res = results.length ? `<ul class="res">${results.map(r => `<li class="${r.ok ? (r.warn ? 'warn' : 'ok') : 'ko'}">${r.ok ? (r.warn ? '⚠️' : '✅') : '❌'} ${esc(r.text)}</li>`).join('')}</ul>` : '';
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>TRADUCHAT · Configurazione</title><style>
:root{--bg:#0b1020;--card:#141a30;--line:#232b4a;--txt:#eef1fb;--mut:#9aa3c7;--a:#5b8cff;--b:#22d3a6;--r:#ff5b6e;--w:#ffb547}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;background:var(--bg);color:var(--txt)}
.wrap{max-width:560px;margin:0 auto;padding:20px}h1{font-size:22px;margin:6px 0}h1 span{color:var(--b)}
p{color:var(--mut);font-size:14px}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;margin:14px 0}
label{display:block;font-weight:600;font-size:14px;margin-top:14px}
input{width:100%;font:inherit;padding:11px;border-radius:10px;border:1px solid var(--line);background:#0e1428;color:var(--txt);margin-top:5px}
small{display:block;color:var(--mut);font-size:12px;margin-top:4px}small.err{color:var(--r)}
button{width:100%;font:inherit;font-weight:700;border:0;border-radius:12px;padding:13px;margin-top:18px;cursor:pointer;color:#fff;background:var(--a)}
.res{list-style:none;padding:0;margin:0}.res li{padding:8px 0;border-bottom:1px solid var(--line);font-size:14px}
.ko{color:var(--r)}.warn{color:var(--w)}.done{border-color:var(--b)}</style></head><body><div class="wrap">
<h1>TRADU<span>CHAT</span> · Configurazione</h1>
<p>Inserisci le chiavi di Twilio e DeepL. Vengono verificate e salvate solo su questo server, nel file .env protetto.</p>
${saved ? `<div class="card done"><b>✅ Configurazione salvata.</b><p>Il server si sta riavviando con le nuove chiavi. Tra qualche secondo apri <a style="color:var(--b)" href="/">la pagina di test</a>. Questa pagina di configurazione ora è disattivata.</p>${res}</div>` : `
${res ? `<div class="card">${res}</div>` : ''}
<form class="card" method="post" action="/setup">
<input type="hidden" name="code" value="${esc(code)}">${rows}
<button type="submit">Verifica e salva</button></form>`}
</div></body></html>`;
}

export function startSetup(port) {
  const code = fs.existsSync(CODE_PATH) ? fs.readFileSync(CODE_PATH, 'utf8').trim() : crypto.randomBytes(12).toString('hex');
  fs.writeFileSync(CODE_PATH, code + '\n', { mode: 0o600 });
  let failures = 0;
  const okCode = c => typeof c === 'string' && c.length === code.length && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(code));

  const app = express();
  app.set('trust proxy', true);
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });

  app.get('/setup', (req, res) => {
    if (failures >= 10) return res.status(429).send('Troppi tentativi. Riavvia il server per un nuovo codice.');
    if (!okCode(req.query.code)) { failures += 1; return res.status(403).send('Codice di configurazione mancante o errato. Usa il link mostrato dallo script di installazione.'); }
    res.send(page({ values: readEnv(), code }));
  });

  app.post('/setup', async (req, res) => {
    if (failures >= 10) return res.status(429).send('Troppi tentativi.');
    if (!okCode(req.body.code)) { failures += 1; return res.status(403).send('Codice di configurazione errato.'); }
    const current = readEnv();
    const values = {}; const errors = {};
    for (const f of FIELDS) {
      let v = String(req.body[f.key] ?? '').trim();
      if (!v && f.secret && current[f.key]) v = current[f.key]; // segreto già salvato e lasciato vuoto
      if (!v && f.required) errors[f.key] = 'Campo obbligatorio';
      else if (v && !f.pattern.test(v)) errors[f.key] = 'Formato non valido: ' + f.hint;
      values[f.key] = v;
    }
    const shown = { ...current, ...values };
    if (Object.keys(errors).length) return res.send(page({ values: shown, errors, code }));

    const results = [...await checkTwilio(values), ...await checkDeepl(values.DEEPL_API_KEY)];
    const blocking = results.filter(r => !r.ok && !/Voice URL/.test(r.text));
    if (blocking.length) return res.send(page({ values: shown, results, code }));

    writeEnv(values);
    fs.rmSync(CODE_PATH, { force: true });
    fs.rmSync(FORCE_PATH, { force: true });
    res.send(page({ saved: true, results, code }));
    console.log('Configurazione salvata: riavvio con le nuove chiavi.');
    setTimeout(() => process.exit(0), 800); // pm2 riavvia il server in modalità normale
  });

  app.get('/health', (req, res) => res.json({ ok: true, setup: true }));
  app.use((req, res) => res.status(503).send('TraduChat in configurazione. Completa la configurazione su /setup.'));

  app.listen(port, () => {
    console.log(`TraduChat in modalità configurazione sulla porta ${port}`);
    console.log(`Apri: https://${process.env.PUBLIC_HOST || 'TUO-DOMINIO'}/setup?code=${code}`);
  });
}
