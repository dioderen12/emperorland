"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listPokemon, cancelListing, buyPokemon } from "@/lib/actions";
import { RARITY_ORDER, TYPE_COLOR, type Rarity } from "@/lib/constants";

export type SellMon = {
  speciesId: string;
  name: string;
  spriteUrl: string;
  typeCode: string;
  rarity: string;
  cp: number;
  count: number;
};
export type Listing = {
  id: string;
  price: number;
  name: string;
  rarity: string;
  typeCode: string;
  cp: number;
  spriteUrl: string;
  seller: string | null;
  mine: boolean;
};
export type Sale = {
  id: string;
  price: number;
  name: string;
  rarity: string;
  typeCode: string;
  cp: number;
  spriteUrl: string;
  seller: string;
  buyer: string;
  soldAtIso: string;
};

type Tab = "browse" | "mine" | "sell" | "history";
type Sort = "recent" | "priceAsc" | "priceDesc" | "cpDesc";

// rarity → media gradient + ring tint (MagicEden-style colored cards)
const MEDIA: Record<string, string> = {
  common: "from-slate-600/25",
  uncommon: "from-emerald-600/30",
  rare: "from-sky-600/30",
  epic: "from-fuchsia-600/35",
  legendary: "from-amber-500/40",
};
const RING: Record<string, string> = {
  common: "hover:ring-slate-500/40",
  uncommon: "hover:ring-emerald-400/50",
  rare: "hover:ring-sky-400/50",
  epic: "hover:ring-fuchsia-400/60",
  legendary: "hover:ring-amber-400/70",
};
const RTEXT: Record<string, string> = {
  common: "text-slate-300",
  uncommon: "text-emerald-300",
  rare: "text-sky-300",
  epic: "text-fuchsia-300",
  legendary: "text-amber-300",
};

const Coin = () => <span className="text-amber-400">🪙</span>;

export function MarketView({
  balance,
  feePercent,
  minPrice,
  sellMons,
  listings,
  history,
  volume,
  totalSales,
}: {
  balance: number;
  feePercent: number;
  minPrice: number;
  sellMons: SellMon[];
  listings: Listing[];
  history: Sale[];
  volume: number;
  totalSales: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("browse");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [sort, setSort] = useState<Sort>("priceAsc");
  const [sel, setSel] = useState<string | null>(null);
  const [price, setPrice] = useState(minPrice * 5);
  const [now, setNow] = useState(0);
  useEffect(() => setNow(Date.now()), []);

  function run(fn: () => Promise<{ error: string } | { ok: true }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else after?.();
      router.refresh();
    });
  }

  const visible = useMemo(() => {
    let list = listings.filter((l) => rarity === "all" || l.rarity === rarity);
    if (sort === "priceAsc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "priceDesc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "cpDesc") list = [...list].sort((a, b) => b.cp - a.cp);
    return list;
  }, [listings, rarity, sort]);

  const mineList = useMemo(() => listings.filter((l) => l.mine), [listings]);
  const floor = listings.length ? Math.min(...listings.map((l) => l.price)) : 0;
  const fee = Math.ceil((price * feePercent) / 100);

  return (
    <div className="font-clean space-y-6">
      {/* hero / stats */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-fuchsia-900/30 via-slate-900/60 to-indigo-900/30 p-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">EmperorLand Market</h1>
        <p className="text-slate-300/80 mt-1">Buy &amp; sell Pokémon for coins · {feePercent}% house fee</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
          <Stat label="Floor" value={floor ? `🪙 ${floor.toLocaleString()}` : "—"} />
          <Stat label="Listings" value={listings.length.toLocaleString()} />
          <Stat label="Sales" value={totalSales.toLocaleString()} />
          <Stat label="Total Volume" value={`🪙 ${volume.toLocaleString()}`} />
        </div>
      </section>

      {/* tabs */}
      <div className="flex items-center gap-2 border-b border-white/10">
        {([["browse", "Browse"], ["mine", `Your Listings${mineList.length ? ` (${mineList.length})` : ""}`], ["sell", "Sell"], ["history", "History"]] as [Tab, string][]).map(
          ([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold transition border-b-2 -mb-px ${
                tab === t ? "border-fuchsia-400 text-white" : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ),
        )}
      </div>

      {error && <p className="text-rose-400 text-sm">{error}</p>}

      {/* BROWSE */}
      {tab === "browse" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip active={rarity === "all"} onClick={() => setRarity("all")}>All</Chip>
            {RARITY_ORDER.map((r) => (
              <Chip key={r} active={rarity === r} onClick={() => setRarity(r)}>
                <span className="capitalize">{r}</span>
              </Chip>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="ml-auto bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200"
            >
              <option value="recent">Recently listed</option>
              <option value="priceAsc">Price: low → high</option>
              <option value="priceDesc">Price: high → low</option>
              <option value="cpDesc">CP: high → low</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <Empty>Nothing for sale here yet.</Empty>
          ) : (
            <Grid>
              {visible.map((l) => (
                <Card key={l.id} l={l} mine={l.mine}>
                  {l.mine ? (
                    <div className="w-full mt-3 py-2 rounded-lg text-center text-sm text-fuchsia-300 border border-fuchsia-400/30 bg-fuchsia-500/10">
                      Your listing
                    </div>
                  ) : (
                    <button
                      onClick={() => run(() => buyPokemon(l.id))}
                      disabled={pending || balance < l.price}
                      className="w-full mt-3 py-2 rounded-lg font-semibold text-sm bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {balance < l.price ? "Not enough" : "Buy now"}
                    </button>
                  )}
                </Card>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* YOUR LISTINGS */}
      {tab === "mine" && (
        mineList.length === 0 ? (
          <Empty>You have no active listings. Head to the Sell tab.</Empty>
        ) : (
          <Grid>
            {mineList.map((l) => (
              <Card key={l.id} l={l} mine>
                <button
                  onClick={() => run(() => cancelListing(l.id))}
                  disabled={pending}
                  className="w-full mt-3 py-2 rounded-lg font-semibold text-sm border border-white/15 text-slate-200 hover:bg-white/5 transition"
                >
                  Cancel listing
                </button>
              </Card>
            ))}
          </Grid>
        )
      )}

      {/* SELL */}
      {tab === "sell" && (
        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 space-y-4">
          <h2 className="text-lg font-bold text-white">List a Pokémon</h2>
          {sellMons.length === 0 ? (
            <Empty>No free Pokémon to sell — deployed or already-listed ones can&apos;t be sold.</Empty>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-72 overflow-y-auto p-1">
                {sellMons.map((m) => {
                  const picked = m.speciesId === sel;
                  return (
                    <button
                      key={m.speciesId}
                      onClick={() => setSel(picked ? null : m.speciesId)}
                      className={`relative rounded-xl overflow-hidden border text-left transition ${
                        picked ? "border-fuchsia-400 ring-2 ring-fuchsia-400/40" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className={`aspect-square bg-gradient-to-br ${MEDIA[m.rarity] ?? MEDIA.common} to-slate-900 flex items-center justify-center`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.spriteUrl} alt={m.name} width={64} height={64} style={{ width: 64, height: 64, imageRendering: "pixelated" }} />
                        {m.count > 1 && <span className="absolute top-1 right-1 text-[10px] bg-black/60 rounded px-1 text-white">×{m.count}</span>}
                      </div>
                      <div className="p-1.5">
                        <div className="text-xs font-semibold text-white truncate">{m.name}</div>
                        <div className="text-[10px] text-amber-300">CP {m.cp}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-end gap-4 pt-2">
                <label className="text-sm text-slate-300">
                  <span className="block text-xs text-slate-400 mb-1">Price (coins)</span>
                  <input
                    type="number"
                    min={minPrice}
                    value={price}
                    onChange={(e) => setPrice(Math.floor(Number(e.target.value) || 0))}
                    onBlur={() => setPrice((p) => Math.max(minPrice, p))}
                    className="w-36 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                </label>
                <button
                  onClick={() => sel && run(() => listPokemon(sel, price), () => setSel(null))}
                  disabled={pending || !sel || price < minPrice}
                  className="px-6 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {sel ? "List for sale" : "Pick a Pokémon"}
                </button>
                {sel && (
                  <span className="text-sm text-slate-400">
                    You receive <Coin /> {(price - fee).toLocaleString()} after {feePercent}% fee
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* HISTORY */}
      {tab === "history" && (
        history.length === 0 ? (
          <Empty>No sales yet. Be the first to trade!</Empty>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 overflow-hidden divide-y divide-white/10">
            {history.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.spriteUrl} alt={s.name} width={40} height={40} style={{ width: 40, height: 40, imageRendering: "pixelated" }} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">
                    {s.name} <span className="text-slate-500 text-xs">CP {s.cp}</span>
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    <span className="text-emerald-300">{s.seller}</span> → <span className="text-sky-300">{s.buyer}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-white"><Coin /> {s.price.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-500">{relTime(s.soldAtIso, now)}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function relTime(iso: string, now: number) {
  if (!now) return "";
  const diff = Math.max(0, now - Date.parse(iso));
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 border border-white/10 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="text-lg font-bold text-white mt-0.5">{value}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{children}</div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-10 text-center text-slate-400">{children}</div>;
}

function Card({ l, mine, children }: { l: Listing; mine?: boolean; children: React.ReactNode }) {
  return (
    <div className={`group rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden ring-0 hover:ring-2 ${RING[l.rarity] ?? RING.common} hover:-translate-y-1 transition-all duration-200`}>
      <div className={`relative aspect-square bg-gradient-to-br ${MEDIA[l.rarity] ?? MEDIA.common} to-slate-950 flex items-center justify-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={l.spriteUrl} alt={l.name} width={96} height={96} style={{ width: 96, height: 96, imageRendering: "pixelated" }} className="drop-shadow-lg group-hover:scale-110 transition-transform" />
        <span className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/55 ${RTEXT[l.rarity] ?? RTEXT.common}`}>{l.rarity}</span>
        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/55 text-amber-300">CP {l.cp}</span>
      </div>
      <div className="p-3">
        <div className="font-semibold text-white truncate">{l.name}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`${TYPE_COLOR[l.typeCode] ?? TYPE_COLOR.NOR} text-[10px] font-bold uppercase px-1.5 py-0.5 rounded`}>{l.typeCode}</span>
          {!mine && l.seller && <span className="text-xs text-slate-500 truncate">by {l.seller}</span>}
          {mine && <span className="text-xs text-fuchsia-300">your listing</span>}
        </div>
        <div className="flex items-center gap-1 mt-2 text-lg font-bold text-white">
          <Coin /> {l.price.toLocaleString()}
        </div>
        {children}
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
        active ? "bg-white text-slate-900" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
