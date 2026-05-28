# Deployment Guide — EmperorLand

Quick path to public: **Vercel (hosting) + Turso (database) + GitHub (source)**. Free tier, ~15 minutes setup.

## Architecture in production

```
User browser  →  Vercel (Next.js)  →  Turso (libSQL DB)
                       ↓
                  Discord OAuth (auth callback redirects back to your domain)
```

Local dev still works unchanged (better-sqlite3 + dev.db file). The DB adapter auto-switches based on `TURSO_DATABASE_URL` presence.

## Step 1 — Push code to GitHub

```bash
cd discord-staking-game
git init
git add .
git commit -m "Initial commit: EmperorLand MVP"

# Create empty repo at https://github.com/new (private OR public — your call)
git remote add origin https://github.com/<your-username>/emperorland.git
git branch -M main
git push -u origin main
```

`.env` is gitignored — secrets won't leak. Verify with `git status`.

## Step 2 — Create Turso database (free tier)

```bash
# Install Turso CLI (Windows PowerShell)
iwr -useb get.tur.so/install.ps1 | iex

# Sign up + login (opens browser)
turso auth signup
# OR if already have account:
turso auth login

# Create your database
turso db create emperorland

# Get connection URL
turso db show emperorland --url
# → libsql://emperorland-<your-org>.turso.io

# Mint an auth token (long string starting with eyJ...)
turso db tokens create emperorland
```

Save both values — you'll paste them into Vercel env vars next.

## Step 3 — Push schema to Turso

From the project directory:

```bash
# One-shot: set env vars inline and push schema
TURSO_DATABASE_URL="libsql://emperorland-<your-org>.turso.io" \
TURSO_AUTH_TOKEN="eyJ..." \
npx prisma db push

# Seed the 37 Pokemon catalog into Turso
TURSO_DATABASE_URL="libsql://emperorland-<your-org>.turso.io" \
TURSO_AUTH_TOKEN="eyJ..." \
npm run db:seed
```

On Windows PowerShell, use this syntax instead:
```powershell
$env:TURSO_DATABASE_URL = "libsql://..."
$env:TURSO_AUTH_TOKEN = "eyJ..."
npx prisma db push
npm run db:seed
```

## Step 4 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub
2. Click **Add New** → **Project** → import your `emperorland` repo
3. Vercel auto-detects Next.js. Don't touch build settings.
4. Before clicking Deploy, expand **Environment Variables** and add:

| Key | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://emperorland-<your-org>.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJ...` (the token from step 2) |
| `AUTH_SECRET` | Generate fresh: `openssl rand -base64 32` (DON'T reuse local one) |
| `AUTH_DISCORD_ID` | (leave blank initially, fill in step 5) |
| `AUTH_DISCORD_SECRET` | (leave blank initially) |

5. Click **Deploy**. Wait ~1-2 minutes. You get a URL like `emperorland-xyz.vercel.app`.
6. Visit it — app should run in "demo mode" (everyone shares one demo account).

## Step 5 — Attach your custom domain

1. Vercel project → **Settings** → **Domains** → add your domain
2. Vercel shows DNS records you need to set at your registrar (an A record or CNAME)
3. Once DNS propagates (~5 min), HTTPS is automatic

## Step 6 — Enable Discord login

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**
2. **OAuth2** → **Redirects** → add (use YOUR actual domain):
   - `https://yourdomain.com/api/auth/callback/discord`
   - `http://localhost:3000/api/auth/callback/discord` (also keep this for local dev)
3. **OAuth2** → copy **Client ID** and **Client Secret**
4. Back in Vercel → project **Settings** → **Environment Variables** → edit:
   - `AUTH_DISCORD_ID` → paste Client ID
   - `AUTH_DISCORD_SECRET` → paste Client Secret
5. Vercel → **Deployments** → click latest → **Redeploy** (no rebuild, just to pick up env changes)
6. Visit your site → navbar now shows **🔗 Sign in with Discord**

Each member who signs in gets their own user row with their own balance + inventory (500 pts starter).

## Updating after deploy

`git push origin main` → Vercel auto-deploys.

Schema changes:
```bash
# After editing prisma/schema.prisma locally:
TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx prisma db push
```

## Costs

| Service | Free tier limit | Should fit if… |
|---|---|---|
| Vercel Hobby | 100GB bandwidth/mo | < ~10k daily active users |
| Turso Free | 9GB storage, 1B row reads/mo | Pretty much any community size |
| Discord OAuth | unlimited | always |

If you outgrow free: Vercel Pro $20/mo, Turso Scaler $29/mo.

## Troubleshooting

**"Demo mode" badge shows in production** — `AUTH_DISCORD_ID` is empty in Vercel env. Set it + redeploy.

**Discord callback fails with "Invalid redirect URI"** — the URL in Discord OAuth2 Redirects must match EXACTLY what Vercel uses. Check trailing slashes, http vs https, www vs non-www.

**Database table doesn't exist** — you didn't run `prisma db push` against Turso. Run step 3 again.

**Vercel build fails on Prisma generate** — `postinstall: prisma generate` in package.json should handle this. If not, add `prisma generate && next build` as the build command in Vercel settings.
