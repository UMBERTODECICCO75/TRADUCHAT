#!/usr/bin/env bash
# TRADUCHAT - installa o aggiorna l'app (con sottotitoli tradotti) sul VPS Keliweb.
# Uso:  sudo bash setup-app.sh workoftraduchat.it tua@email.it
# Rilancialo uguale per aggiornare l'app all'ultima versione di main.
set -euo pipefail

DOMAIN="${1:-workoftraduchat.it}"
EMAIL="${2:-}"
REPO="https://github.com/UMBERTODECICCO75/traduchat.git"
APP_DIR=/opt/traduchat-app
ENV_FILE=/etc/traduchat/app.env
PORT=3100

# Solo un dominio principale (es. workoftraduchat.it) riceve anche www;
# un sottodominio (es. app.workoftraduchat.it) resta da solo.
DOTS="${DOMAIN//[^.]/}"
if [ "${#DOTS}" -eq 1 ]; then NAMES="$DOMAIN www.$DOMAIN"; CERT_ARGS=(-d "$DOMAIN" -d "www.$DOMAIN")
else NAMES="$DOMAIN"; CERT_ARGS=(-d "$DOMAIN"); fi

[ "$(id -u)" -eq 0 ] || { echo "Esegui con sudo"; exit 1; }
[ -n "$EMAIL" ] || { echo "Uso: sudo bash setup-app.sh $DOMAIN tua@email.it"; exit 1; }

echo "==> 1/6 Strumenti (git, Node 20, bun, pm2)"
apt-get update -qq && apt-get install -y -qq git curl unzip >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
fi
command -v bun >/dev/null || { curl -fsSL https://bun.sh/install | bash; ln -sf /root/.bun/bin/bun /usr/local/bin/bun; }
command -v pm2 >/dev/null || npm i -g pm2

echo "==> 2/6 Codice da GitHub (main)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --depth 1 origin main && git -C "$APP_DIR" reset --hard origin/main
else
  git clone --depth 1 -b main "$REPO" "$APP_DIR"
fi

echo "==> 3/6 Chiavi segrete ($ENV_FILE)"
if [ ! -f "$ENV_FILE" ]; then
  mkdir -p /etc/traduchat
  cat > "$ENV_FILE" <<'ENV'
# Copia i valori da Lovable: progetto traduchatchat.com > Cloud > Secrets
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LOVABLE_API_KEY=
LOVABLE_SEND_URL=
LOVABLE_CRON_SECRET=
TRANSLATE_TICKET_SECRET=
PADDLE_LIVE_API_KEY=
PADDLE_SANDBOX_API_KEY=
PAYMENTS_LIVE_WEBHOOK_SECRET=
PAYMENTS_SANDBOX_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_API_KEY_SID=
TWILIO_API_KEY_SECRET=
TWILIO_VERIFY_SERVICE_SID=
ENV
  chmod 600 "$ENV_FILE"
  echo "    Inserisci ora le chiavi (le trovi nei Secrets del progetto Lovable)."
  read -r -p "    Premi Invio per aprire l'editor..." _
  ${EDITOR:-nano} "$ENV_FILE"
fi
grep -q '^SUPABASE_URL=.\+' "$ENV_FILE" || { echo "    SUPABASE_URL vuota in $ENV_FILE: completa il file e rilancia."; exit 1; }

echo "==> 4/6 Build per server Node"
cd "$APP_DIR"
bun install --frozen-lockfile
set -a; . "$ENV_FILE"; set +a
NITRO_PRESET=node-server NODE_ENV=production bun run build

echo "==> 5/6 Avvio con pm2 (porta $PORT)"
cat > "$APP_DIR/pm2.config.cjs" <<PM2
const fs = require("fs");
const env = Object.fromEntries(fs.readFileSync("$ENV_FILE", "utf8").split("\n")
  .filter((l) => l.trim() && !l.startsWith("#") && l.includes("="))
  .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
module.exports = { apps: [{ name: "traduchat-app", script: "$APP_DIR/.output/server/index.mjs",
  env: { ...env, NODE_ENV: "production", PORT: "$PORT", HOST: "127.0.0.1" } }] };
PM2
pm2 delete traduchat-app >/dev/null 2>&1 || true
pm2 start "$APP_DIR/pm2.config.cjs"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true
sleep 3
curl -fsS -o /dev/null "http://127.0.0.1:$PORT/" && echo "    App avviata." || { echo "    L'app non risponde: guarda pm2 logs traduchat-app"; exit 1; }

echo "==> 6/6 nginx + HTTPS per $DOMAIN"
VPS_IP=$(curl -s https://api.ipify.org || true)
for name in $NAMES; do
  ip=$(getent hosts "$name" | awk '{print $1}' | head -1 || true)
  [ "$ip" = "$VPS_IP" ] && echo "    DNS ok: $name -> $ip" || echo "    ATTENZIONE: $name punta a ${ip:-nessun IP}, non a questo VPS ($VPS_IP)"
done
command -v nginx >/dev/null || apt-get install -y nginx
cat > /etc/nginx/sites-available/traduchat-app <<NGINX
server {
  listen 80;
  server_name $NAMES;
  client_max_body_size 25m;
  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/traduchat-app /etc/nginx/sites-enabled/traduchat-app
nginx -t && systemctl reload nginx
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
certbot --nginx "${CERT_ARGS[@]}" --non-interactive --agree-tos -m "$EMAIL" --redirect || \
  echo "    HTTPS non attivato: controlla che i record A di $NAMES puntino a questo VPS, poi rilancia lo script"

echo
echo "Fatto: https://$DOMAIN"
echo "Log: pm2 logs traduchat-app   ·   Aggiornare: sudo bash $APP_DIR/deploy/keliweb/setup-app.sh $DOMAIN $EMAIL"
