#!/usr/bin/env bash
# TRADUCHAT - installazione del server chiamate sul VPS Keliweb (Ubuntu/Debian)
# Uso:  sudo bash setup-keliweb.sh call.workoftraduchat.it tua@email.it
set -euo pipefail

DOMAIN="${1:-call.workoftraduchat.it}"
EMAIL="${2:-}"
APP_DIR=/opt/traduchat-twilio
PORT=3000
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" -eq 0 ] || { echo "Esegui con sudo"; exit 1; }
[ -n "$EMAIL" ] || { echo "Uso: sudo bash setup-keliweb.sh $DOMAIN tua@email.it"; exit 1; }

echo "==> 1/6 Controllo DNS di $DOMAIN"
VPS_IP=$(curl -s https://api.ipify.org || true)
DNS_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
echo "    IP del VPS: ${VPS_IP:-?}   IP del dominio: ${DNS_IP:-non trovato}"
if [ -z "$DNS_IP" ] || [ "$DNS_IP" != "$VPS_IP" ]; then
  echo "    ATTENZIONE: il record A di $DOMAIN non punta ancora a questo VPS."
  echo "    Crealo nel pannello Keliweb (A  call  ->  ${VPS_IP:-IP_DEL_VPS}) e riprova tra qualche minuto."
  read -r -p "    Continuare lo stesso? (s/N) " ok; [ "$ok" = "s" ] || exit 1
fi

echo "==> 2/6 Node.js"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
command -v pm2 >/dev/null || npm i -g pm2

echo "==> 3/6 Copia dei file in $APP_DIR"
mkdir -p "$APP_DIR"
cp -r "$SRC_DIR"/server.js "$SRC_DIR"/package.json "$SRC_DIR"/public "$SRC_DIR"/.env.example "$APP_DIR"/
cd "$APP_DIR"
npm install --omit=dev --no-audit --no-fund

if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s|^PUBLIC_HOST=.*|PUBLIC_HOST=$DOMAIN|" .env
  sed -i "s|^DEMO_SECRET=.*|DEMO_SECRET=$(openssl rand -hex 12)|" .env
  chmod 600 .env
  echo
  echo "    Ho creato $APP_DIR/.env: ora inserisci le chiavi Twilio e DeepL."
  read -r -p "    Premi Invio per aprire l'editor..." _
  ${EDITOR:-nano} .env
fi

echo "==> 4/6 Avvio con pm2"
pm2 delete traduchat-call >/dev/null 2>&1 || true
pm2 start server.js --name traduchat-call --cwd "$APP_DIR"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> 5/6 nginx"
command -v nginx >/dev/null || apt-get install -y nginx
cat > /etc/nginx/sites-available/traduchat-call <<NGINX
server {
  listen 80;
  server_name $DOMAIN;
  location / {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_buffering off;
    proxy_read_timeout 3600s;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/traduchat-call /etc/nginx/sites-enabled/traduchat-call
nginx -t && systemctl reload nginx

echo "==> 6/6 Certificato HTTPS (Let's Encrypt)"
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect || \
  echo "    Certbot non riuscito: controlla che il DNS punti al VPS e rilancia: certbot --nginx -d $DOMAIN"

echo
echo "Fatto. Controlli:"
echo "  curl https://$DOMAIN/health"
echo "  pm2 logs traduchat-call"
echo "Chiave demo (DEMO_SECRET): $(grep ^DEMO_SECRET= "$APP_DIR/.env" | cut -d= -f2)"
echo "Ricorda: nella TwiML App di Twilio la Voice URL deve essere https://$DOMAIN/voice (POST)"
