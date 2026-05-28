# EmperorLand — Discord Staking Game

MVP game website yang ngasih utility ke point komunitas Discord:
**spend points → buka pack → dapat hewan random → stake → earn points**.

Stack: Next.js 16 (App Router) + TypeScript + Prisma 7 + SQLite + Tailwind 4.

## Quick start

```bash
npm install
npx prisma migrate dev      # buat dev.db dari schema
npm run db:seed             # isi 37 Pokemon + 1 demo user (500 pts starter)
npm run dev                 # http://localhost:3000
```

App akan jalan di **demo mode** (single user "demo") sampai kamu setup Discord OAuth.

## Setup Discord OAuth login

Player real bisa login pakai akun Discord. Setup:

1. Buka https://discord.com/developers/applications → **New Application** → kasih nama (mis. "EmperorLand")
2. Tab **OAuth2** → **Redirects** → tambah:
   - `http://localhost:3000/api/auth/callback/discord` (dev)
   - `https://yourdomain.com/api/auth/callback/discord` (production, tambahin saat deploy)
3. Tab **OAuth2** → copy **Client ID** dan **Client Secret**
4. Edit file `.env`:
   ```
   AUTH_DISCORD_ID="paste_client_id_here"
   AUTH_DISCORD_SECRET="paste_client_secret_here"
   ```
5. Restart `npm run dev` → klik **Sign in with Discord** di navbar

Setiap user baru otomatis dapet 500 pts starter. Discord avatar + username muncul di header. Demo user tetap accessible kalau env Discord-nya di-empty lagi (fallback otomatis).

## Cara kerja

**Pack opening** (`/packs`):
- Cost 100 pts per pack, isi 3 kartu.
- Roll 2 langkah: pilih rarity tier dulu (common 60% / rare 27% / epic 10% / legendary 3%), lalu pilih species dalam tier itu pakai `packWeight`. Stabil — tier % gak berubah sekalipun nambah species baru.
- Semua transaksi atomic via `prisma.$transaction` — point gak akan kepotong tanpa dapat kartu.

**Staking** (`/staking`):
- Tiap species punya `stakeRatePerHour` skala rarity (common 2/hr → legendary 45/hr).
- Stake → mulai timer. **Claim** → bayar accumulated points dan reset timer. **Unstake** → pause earning, point yang udah terkumpul masuk `unclaimedPoints` (gak hilang, tinggal claim nanti).
- UI live-tick tiap detik biar earnings keliatan jalan real-time.

**Economy balance** (di `src/lib/constants.ts`):
- Common stake 2/hr → balik modal pack ~50 jam (gating yang sehat untuk non-paying user)
- Legendary stake 40-45/hr → balik modal pack <3 jam (reward besar untuk lucky pull)
- Adjust `PACK_PRICE`, `RARITY_WEIGHTS`, `stakeRatePerHour` di seed kalau mau rebalance.

## Struktur

```
prisma/
  schema.prisma         # User, AnimalSpecies, OwnedAnimal, PackOpening, Transaction
  seed.ts               # 12 Pokemon (Gen 1) + dummy user "demo"
src/
  app/
    page.tsx            # Dashboard: balance, stats, recent activity
    packs/              # Pack shop + opener (Client Component dengan animasi reveal)
    inventory/          # Koleksi (di-group by species, sorted by rarity)
    staking/            # Live counter staking, stake/claim/unstake buttons
  components/
    Nav.tsx             # Header dengan point badge
    AnimalCard.tsx      # Render sprite + rarity tier styling
  lib/
    db.ts               # Prisma client singleton (better-sqlite3 adapter)
    user.ts             # getCurrentUser() — saat ini hardcode ke user "demo"
    game.ts             # rollSpecies(), pointsEarnedSince()
    actions.ts          # Server Actions: openPack, stakeAnimal, claimStakeRewards, unstakeAnimal
    constants.ts        # PACK_PRICE, RARITY_WEIGHTS, dll — ekonomi game di sini
scripts/
  smoke-test.ts         # Stat test untuk verify distribusi roll
```

## Menggabungkan dengan bot Discord-mu

Untuk integrasi:

1. **Replace `getCurrentUser()`** di `src/lib/user.ts` — lookup `User.discordId` dari session Discord OAuth, atau dari header yang dikirim bot.
2. **Sync point dua arah** dengan bot:
   - **Opsi A (recommended)**: website jadi source of truth, bot panggil REST endpoint untuk read/write balance.
   - **Opsi B**: bot tetep source of truth, ekspos endpoint `/api/discord/balance` yang website panggil. Hati-hati race condition saat user buka pack dan bot kasih raid reward bersamaan — pakai DB transaction di sisi bot.
3. **Hook event komunitas**: tambah `kind` baru di `Transaction` (`raid_reward`, `chat_xp`, dll) biar log point konsisten.

## Test loop

```bash
npx tsx scripts/smoke-test.ts    # verify pack roll distribution (1000 packs)
```

Output yang sehat: tiap rarity ±1% dari expected weight.

## Reset state

```bash
PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=ya npx prisma migrate reset --force
npm run db:seed
```

(Prisma 7 minta consent flag ini untuk perintah destruktif.)

## Production checklist (saat siap deploy)

- [ ] Tambah Discord OAuth (NextAuth atau lib serupa)
- [ ] Migrate SQLite → Postgres (ganti `provider` di schema + adapter di db.ts)
- [ ] Tambah rate limit di `openPack` (saat ini gak ada cap, bisa diabuse via direct POST ke server action)
- [ ] Tambah CSRF check kalau ada endpoint API non-action
- [ ] Audit `Transaction` log untuk admin tools
- [ ] Cap maksimum `unclaimedPoints` per animal supaya gak inflasi tak terbatas saat user lupa unstake
