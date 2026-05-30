# Deployment Guide — EmperorLand on VPS

Two scripts that automate the full deploy:
- **`scripts/setup-vps.sh`** — first-time VPS setup (run once on the server)
- **`.github/workflows/deploy.yml`** — auto-deploy on every git push

## Cost summary

| | Cost | Notes |
|---|---|---|
| Hostinger VPS KVM 1 | ~$5-8/mo | 4GB RAM, 50GB NVMe, Singapore option |
| Domain (you have) | — | At Hostinger |
| **Total** | **~$5-8/mo** | Flat, predictable |

---

## Step 1 — Provision VPS

Pick any Ubuntu 22.04 / 24.04 VPS. Recommended:
- **Hostinger VPS** — single vendor with your domain
- **DigitalOcean** — $4/mo Basic droplet, Singapore region
- **Vultr** — $5/mo, Singapore region

Settings:
- OS: **Ubuntu 24.04 LTS**
- Region: closest to your audience (Singapore for SEA)
- Plan: 1-4GB RAM is fine
- Auth: set a root password OR SSH key

Note the **IP address** and **root credentials**.

## Step 2 — Point your domain at the VPS

Before SSL works, DNS must already point to your VPS. Do this first.

At Hostinger (or wherever your domain lives):
1. Domain → DNS Zone Editor
2. Remove existing A records pointing elsewhere
3. Add:
   - Type `A`, Name `@`, Value `<VPS_IP>`, TTL 14400
   - Type `A`, Name `www`, Value `<VPS_IP>`, TTL 14400
4. Save

Verify (from your laptop, takes 5-30 min to propagate):
```powershell
nslookup yourdomain.com 8.8.8.8
# Must return your VPS IP
```

## Step 3 — Register Discord OAuth app

1. https://discord.com/developers/applications → **New Application** → "EmperorLand"
2. **OAuth2** → **Redirects** → add:
   ```
   https://yourdomain.com/api/auth/callback/discord
   ```
3. Copy **Client ID** and **Client Secret** — you'll paste them into the setup prompt

## Step 4 — Run bootstrap on VPS

SSH into the VPS:
```powershell
ssh root@<VPS_IP>
```

Run the bootstrap (one curl command):
```bash
curl -sSL https://raw.githubusercontent.com/dioderen12/emperorland/main/scripts/setup-vps.sh | bash
```

It prompts for:
- Domain (e.g. `emperorland.com`)
- Discord Client ID
- Discord Client Secret
- Email for SSL renewal notifications

Then it does everything: update system, install Node/nginx/certbot/PM2, clone repo, build, configure nginx, request SSL, start the app. Takes ~5 minutes.

When it finishes, visit `https://yourdomain.com` — app live with HTTPS.

---

## Setting up auto-deploy on `git push`

After the first deploy works, set up GitHub Actions so future updates happen automatically.

### 4a. Generate an SSH deploy key (on your laptop, PowerShell)

```powershell
cd $env:USERPROFILE
ssh-keygen -t ed25519 -f emperorland_deploy -N '""'
# Creates two files: emperorland_deploy (private) and emperorland_deploy.pub (public)
```

### 4b. Add the PUBLIC key to your VPS

```powershell
type emperorland_deploy.pub | ssh root@<VPS_IP> "cat >> ~/.ssh/authorized_keys"
```

Test it works without password:
```powershell
ssh -i emperorland_deploy root@<VPS_IP> "echo OK"
# Should print "OK" without asking for password
```

### 4c. Add secrets to GitHub

Open https://github.com/dioderen12/emperorland/settings/secrets/actions → **New repository secret** for each:

| Name | Value |
|---|---|
| `VPS_HOST` | Your VPS IP, e.g. `38.180.123.45` |
| `VPS_USER` | `root` |
| `VPS_SSH_KEY` | Contents of the PRIVATE key file: `type emperorland_deploy` (paste full file content, including `-----BEGIN OPENSSH PRIVATE KEY-----` lines) |

### 4d. Delete local key files

```powershell
del emperorland_deploy
del emperorland_deploy.pub
```

GitHub now has the only copy of the private key. Your VPS has the public key (read-only).

### 4e. Test auto-deploy

```powershell
cd C:\Users\User\discord-staking-game
git commit --allow-empty -m "test: trigger auto-deploy"
git push
```

Watch the deploy run live at: https://github.com/dioderen12/emperorland/actions

Visit your site — changes live within ~1 minute.

---

## Manual ops on the VPS

If you ever need to SSH in:

```bash
ssh root@<VPS_IP>
cd /var/www/emperorland

# View live logs
pm2 logs emperorland

# Restart app
pm2 restart emperorland

# Edit env vars (e.g. rotate Discord secret)
nano .env
pm2 restart emperorland

# Grant points to a user
npx tsx scripts/grant-points.ts 1000 GuarEmperor

# Backup the SQLite DB
cp prod.db prod.db.backup-$(date +%Y%m%d)

# View disk usage
df -h
du -sh /var/www/emperorland
```

## Updating Discord OAuth

Add additional redirect URIs in the Discord Developer Portal as needed (e.g. for staging, second domain). Each callback URL must match exactly — no trailing slash, correct scheme (http vs https), correct host.

## Role-gating (members-only access)

Restrict play to members who hold specific Discord role(s). Off by default;
enabling needs only env vars (no bot). Add to `/var/www/emperorland/.env`:

```env
AUTH_DISCORD_GUILD_ID="<your server id>"
AUTH_DISCORD_ALLOWED_ROLE_IDS="<roleid1>,<roleid2>"   # any one of these = access
DISCORD_INVITE_URL="https://discord.gg/xxxx"          # shown on the gate
DISCORD_REQUIRED_ROLE_LABEL="Member"                  # role name shown on the gate
```

Getting the IDs: Discord → Settings → Advanced → enable **Developer Mode**, then
right-click the **server** icon → *Copy Server ID*, and Server Settings → Roles →
right-click a **role** → *Copy Role ID*.

How it works: when both a guild id and ≥1 role id are set, the OAuth scope
auto-upgrades to `identify guilds.members.read`, and each sign-in reads the
member's roles in that guild. Holders of an allowed role get `hasAccess`; everyone
else hits a friendly gate with the invite link. Access is re-evaluated **on every
sign-in** — a user who just got the role must sign out and back in.

After editing `.env`: `pm2 restart emperorland --update-env`. Existing users must
re-login (the new scope needs fresh consent).

## Troubleshooting

**Bootstrap script fails at SSL step** — DNS hasn't propagated yet. Wait, then run manually:
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**App returns 502 Bad Gateway** — PM2 process crashed or never started. Check:
```bash
pm2 status
pm2 logs emperorland --lines 50
```

**Out of memory** — increase swap on small VPS:
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**Discord callback "redirect_uri_mismatch"** — URL in Discord OAuth2 Redirects must match exactly. Check `https://` vs `http://`, www vs no www, trailing slash.

**Discord login fails with `error=Configuration` and `/api/auth/providers` returns `https://localhost:3000/...`** — Auth.js baked a stale base URL into the build. It reads `AUTH_URL` *before* `trustHost`, and Next.js inlines `AUTH_URL` at **build time**, so editing `.env` + restarting PM2 alone won't fix it. The `.env` must contain `AUTH_URL="https://yourdomain.com"` and you must **rebuild**:
```bash
cd /var/www/emperorland
grep -q '^AUTH_URL=' .env || printf '\nAUTH_URL="https://emperorland.fun"\n' >> .env
pm2 kill && rm -f ~/.pm2/dump.pm2 && rm -rf .next
set -a; . ./.env; set +a
npm run build
pm2 start npm --name emperorland -- start && pm2 save
# Verify — must show emperorland.fun, not localhost:
curl -sk https://emperorland.fun/api/auth/providers
```

**GitHub Action fails: "Permission denied (publickey)"** — wrong key in `VPS_SSH_KEY` secret, or public key not in `authorized_keys` on VPS. Re-do step 4b.

## Cost monitoring

- Hostinger VPS: flat monthly
- No DB cost (SQLite local)
- No image bandwidth cost (Pokemon sprites from PokéAPI CDN)
- Free SSL (Let's Encrypt auto-renew)
- Free auto-deploy (GitHub Actions has generous free tier for public repos)
