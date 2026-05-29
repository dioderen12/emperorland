#!/usr/bin/env bash
# Bootstrap script for EmperorLand on a fresh Ubuntu VPS.
# Usage on the VPS (as root):
#   curl -sSL https://raw.githubusercontent.com/dioderen12/emperorland/main/scripts/setup-vps.sh | bash
#
# Or download + run with prompts:
#   wget https://raw.githubusercontent.com/dioderen12/emperorland/main/scripts/setup-vps.sh
#   chmod +x setup-vps.sh
#   ./setup-vps.sh

set -euo pipefail

REPO_URL="https://github.com/dioderen12/emperorland.git"
APP_DIR="/var/www/emperorland"

echo ""
echo "═════════════════════════════════════════════"
echo "  EmperorLand VPS Setup"
echo "═════════════════════════════════════════════"
echo ""

# Interactive prompts. Each value is required.
read -rp "Domain (mis. emperorland.com, tanpa http://): " DOMAIN
read -rp "Discord Client ID: " DISCORD_ID
read -rp "Discord Client Secret: " DISCORD_SECRET
read -rp "Email untuk SSL renewal notifications: " EMAIL

if [ -z "$DOMAIN" ] || [ -z "$DISCORD_ID" ] || [ -z "$DISCORD_SECRET" ] || [ -z "$EMAIL" ]; then
  echo "❌ Semua field harus diisi. Aborting."
  exit 1
fi

echo ""
echo "🔄 [1/8] Updating system packages..."
apt update -qq && apt upgrade -y -qq

echo "📦 [2/8] Installing Node.js 22, nginx, git, ufw, certbot..."
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
apt install -y -qq nodejs git nginx ufw certbot python3-certbot-nginx

echo "🛡️  [3/8] Configuring firewall..."
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null

echo "📂 [4/8] Cloning repository..."
mkdir -p /var/www
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull
else
  cd /var/www
  git clone "$REPO_URL" emperorland
  cd emperorland
fi

echo "🔨 [5/8] Installing deps + building app (this takes ~2 min)..."
npm install --silent

# Generate a fresh AUTH_SECRET for this VPS — never reuse local one.
AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

cat > .env <<EOF
DATABASE_URL="file:./prod.db"
AUTH_SECRET="$AUTH_SECRET"
AUTH_TRUST_HOST="true"
AUTH_DISCORD_ID="$DISCORD_ID"
AUTH_DISCORD_SECRET="$DISCORD_SECRET"
EOF

npx prisma db push --accept-data-loss
npm run db:seed
npm run build

echo "♻️  [6/8] Setting up PM2 process manager..."
npm install -g pm2 --silent

if pm2 list | grep -q "emperorland"; then
  pm2 restart emperorland
else
  pm2 start npm --name "emperorland" -- start
fi

# Generate the startup command and execute it (auto-restart on reboot).
pm2 startup systemd -u root --hp /root | tail -1 | bash >/dev/null 2>&1 || true
pm2 save >/dev/null

echo "🌐 [7/8] Configuring nginx reverse proxy..."
cat > /etc/nginx/sites-available/emperorland <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Increase body size for any future file uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/emperorland /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null
systemctl reload nginx

echo "🔒 [8/8] Requesting SSL certificate via Let's Encrypt..."
echo "    (DNS A record harus udah point ke server ini, else step ini gagal)"
echo ""

if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect 2>&1; then
  echo "✅ SSL berhasil dipasang!"
else
  echo "⚠️  SSL gagal — kemungkinan DNS belum propagate."
  echo "    Tunggu 5-30 menit, lalu re-run: certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo ""
echo "═════════════════════════════════════════════"
echo "  ✅ DONE!"
echo "═════════════════════════════════════════════"
echo ""
echo "  App live at: https://$DOMAIN"
echo "  PM2 status:"
pm2 status
echo ""
echo "  Logs:        pm2 logs emperorland"
echo "  Restart:     pm2 restart emperorland"
echo "  Edit .env:   nano $APP_DIR/.env"
echo ""
