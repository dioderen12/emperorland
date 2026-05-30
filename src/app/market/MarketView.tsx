"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { listPokemon, cancelListing, buyPokemon } from "@/lib/actions";
import { RARITY_BADGE, TYPE_COLOR, type Rarity } from "@/lib/constants";

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
};

export function MarketView({
  balance,
  feePercent,
  minPrice,
  sellMons,
  browse,
  mine,
}: {
  balance: number;
  feePercent: number;
  minPrice: number;
  sellMons: SellMon[];
  browse: Listing[];
  mine: Listing[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [price, setPrice] = useState(minPrice * 5);

  function run(fn: () => Promise<{ error: string } | { ok: true }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else after?.();
      router.refresh();
    });
  }

  const fee = Math.ceil((price * feePercent) / 100);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent-2)]">Marketplace</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Buy &amp; sell Pokemon for coins. The house takes a {feePercent}% fee on every sale.
        </p>
        <p className="text-sm text-slate-500 mt-1">Your balance: 🪙 {balance.toLocaleString()}</p>
      </section>

      {error && <p className="text-[var(--accent-3)] text-base">{error}</p>}

      {/* Sell */}
      <section className="pixel-panel p-5 space-y-4">
        <h2 className="font-display text-xs text-slate-300 uppercase">Sell a Pokemon</h2>
        {sellMons.length === 0 ? (
          <p className="text-slate-400 text-lg">No free Pokemon to sell (deployed/listed ones can&apos;t be sold).</p>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
              {sellMons.map((m) => (
                <button
                  key={m.speciesId}
                  onClick={() => setSel(m.speciesId === sel ? null : m.speciesId)}
                  className={`relative border-[3px] p-1 flex flex-col items-center ${m.speciesId === sel ? "border-[var(--accent-2)] bg-[var(--accent-2)]/10" : "border-[var(--ink)] bg-[var(--panel-2)]"}`}
                >
                  {m.count > 1 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--panel-2)] border-2 border-[var(--ink)] text-[9px] flex items-center justify-center">×{m.count}</span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.spriteUrl} alt={m.name} width={44} height={44} style={{ width: 44, height: 44, imageRendering: "pixelated" }} />
                  <span className="text-xs text-white truncate w-full text-center leading-tight">{m.name}</span>
                  <span className="text-[10px] text-[var(--accent)] leading-none">CP {m.cp}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <label className="text-base text-slate-300">
                <span className="block text-sm text-slate-400 uppercase mb-1">Price (coins)</span>
                <input
                  type="number"
                  min={minPrice}
                  value={price}
                  onChange={(e) => setPrice(Math.max(minPrice, Math.floor(Number(e.target.value) || 0)))}
                  className="w-32 bg-black/40 border-2 border-[var(--ink)] px-2 py-1.5 text-white"
                />
              </label>
              <button
                onClick={() => sel && run(() => listPokemon(sel, price), () => setSel(null))}
                disabled={pending || !sel || price < minPrice}
                className="pixel-btn bg-[var(--accent-2)] text-[var(--ink)] text-[10px] px-5 py-2.5 disabled:cursor-not-allowed"
              >
                {sel ? "LIST FOR SALE" : "PICK ONE"}
              </button>
              {sel && <span className="text-sm text-slate-400">You&apos;ll get 🪙 {(price - fee).toLocaleString()} after {feePercent}% fee</span>}
            </div>
          </>
        )}
      </section>

      {/* My listings */}
      {mine.length > 0 && (
        <section>
          <h2 className="font-display text-xs text-slate-300 uppercase mb-3">⏳ Your listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {mine.map((l) => (
              <ListingRow key={l.id} l={l} balance={balance}>
                <button onClick={() => run(() => cancelListing(l.id))} disabled={pending}
                  className="pixel-btn bg-slate-600 text-white text-[9px] px-3 py-2">CANCEL</button>
              </ListingRow>
            ))}
          </div>
        </section>
      )}

      {/* Browse */}
      <section>
        <h2 className="font-display text-xs text-slate-300 uppercase mb-3">🛒 For sale</h2>
        {browse.length === 0 ? (
          <p className="pixel-panel p-6 text-center text-slate-400 text-lg">Nothing for sale right now.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {browse.map((l) => (
              <ListingRow key={l.id} l={l} balance={balance}>
                <button
                  onClick={() => run(() => buyPokemon(l.id))}
                  disabled={pending || balance < l.price}
                  className="pixel-btn bg-[var(--accent)] text-[var(--ink)] text-[9px] px-3 py-2 disabled:cursor-not-allowed"
                >
                  {balance < l.price ? "LOW" : "BUY"}
                </button>
              </ListingRow>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ListingRow({ l, balance, children }: { l: Listing; balance: number; children: React.ReactNode }) {
  const r = l.rarity as Rarity;
  void balance;
  return (
    <div className="pixel-panel p-3 flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={l.spriteUrl} alt={l.name} width={48} height={48} style={{ width: 48, height: 48, imageRendering: "pixelated" }} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-lg text-white truncate leading-tight">{l.name}</div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`${RARITY_BADGE[r] ?? RARITY_BADGE.common} pixel-badge text-[8px] uppercase px-1.5 py-0.5`}>{l.rarity}</span>
          <span className={`${TYPE_COLOR[l.typeCode] ?? TYPE_COLOR.NOR} pixel-badge text-[8px] uppercase px-1.5 py-0.5`}>{l.typeCode}</span>
          <span className="text-[10px] text-[var(--accent)]">CP {l.cp}</span>
        </div>
        {l.seller && <div className="text-xs text-slate-500 mt-0.5">by {l.seller}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="font-display text-[11px] text-[var(--accent)]">🪙 {l.price.toLocaleString()}</div>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
