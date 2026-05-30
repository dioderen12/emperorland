"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createPvpMatch,
  acceptPvpMatch,
  cancelPvpMatch,
  declinePvpMatch,
} from "@/lib/actions";
import { TYPE_COLOR } from "@/lib/constants";
import type { Fighter, BattleLog } from "@/lib/pvp";
import { BattlePlayback } from "./BattlePlayback";

export type Mon = { speciesId: string; name: string; spriteUrl: string; typeCode: string; cp: number };
export type LobbyMatch = {
  id: string;
  wager: number;
  challengerName: string;
  challengerImage: string | null;
  team: Fighter[];
};
export type OutgoingMatch = { id: string; wager: number; directed: boolean; targetName: string | null };
export type HistoryMatch = {
  id: string;
  wager: number;
  opponentName: string;
  won: boolean;
  logJson: string;
  iAmSide: "a" | "b";
};

export function ArenaView({
  minWager,
  balance,
  myMons,
  opponents,
  lobby,
  incoming,
  outgoing,
  history,
}: {
  minWager: number;
  balance: number;
  myMons: Mon[];
  opponents: { id: string; username: string }[];
  lobby: LobbyMatch[];
  incoming: LobbyMatch[];
  outgoing: OutgoingMatch[];
  history: HistoryMatch[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // create form
  const [team, setTeam] = useState<string[]>([]);
  const [wager, setWager] = useState(minWager);
  const [opponentId, setOpponentId] = useState("");

  // accept modal
  const [acceptId, setAcceptId] = useState<string | null>(null);
  const [acceptTeam, setAcceptTeam] = useState<string[]>([]);

  // playback
  const [playback, setPlayback] = useState<{ log: BattleLog; iAmSide: "a" | "b" } | null>(null);

  const canPlay = myMons.length >= 3;

  function toggle(list: string[], set: (v: string[]) => void, id: string) {
    if (list.includes(id)) set(list.filter((x) => x !== id));
    else if (list.length < 3) set([...list, id]);
  }

  function doCreate() {
    setError(null);
    startTransition(async () => {
      try {
        await createPvpMatch(team, wager, opponentId || null);
        setTeam([]);
        setWager(minWager);
        setOpponentId("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create challenge");
      }
    });
  }

  function doAccept() {
    if (!acceptId) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await acceptPvpMatch(acceptId, acceptTeam);
        setAcceptId(null);
        setAcceptTeam([]);
        if (r.logJson) setPlayback({ log: JSON.parse(r.logJson) as BattleLog, iAmSide: "b" });
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to accept");
      }
    });
  }

  function doSimple(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent-3)]">Arena</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Stake points, pick 3 Pokemon, battle a rival. Winner takes the pot.
        </p>
      </section>

      {error && <p className="text-[var(--accent-3)] text-base">{error}</p>}

      {!canPlay ? (
        <p className="pixel-panel p-6 text-center text-slate-400 text-lg">
          You need at least 3 Pokemon to battle — open some packs first.
        </p>
      ) : (
        /* Create challenge */
        <section className="pixel-panel p-5 space-y-4">
          <h2 className="font-display text-xs text-slate-300 uppercase">Create a challenge</h2>
          <TeamPicker mons={myMons} selected={team} onToggle={(id) => toggle(team, setTeam, id)} />
          <div className="flex flex-wrap items-end gap-4">
            <label className="text-base text-slate-300">
              <span className="block text-sm text-slate-400 uppercase mb-1">Wager</span>
              <input
                type="number"
                min={minWager}
                max={balance}
                value={wager}
                onChange={(e) => setWager(Math.max(minWager, Math.floor(Number(e.target.value) || 0)))}
                className="w-28 bg-black/40 border-2 border-[var(--ink)] px-2 py-1.5 text-white"
              />
            </label>
            <label className="text-base text-slate-300">
              <span className="block text-sm text-slate-400 uppercase mb-1">Opponent</span>
              <select
                value={opponentId}
                onChange={(e) => setOpponentId(e.target.value)}
                className="bg-black/40 border-2 border-[var(--ink)] px-2 py-1.5 text-white max-w-[12rem]"
              >
                <option value="">🌐 Open lobby (anyone)</option>
                {opponents.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.username}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={doCreate}
              disabled={pending || team.length !== 3 || wager > balance}
              className="pixel-btn bg-[var(--accent-3)] text-white text-[10px] px-5 py-2.5 disabled:cursor-not-allowed"
            >
              {team.length !== 3 ? "PICK 3" : wager > balance ? "LOW BALANCE" : `STAKE ${wager}`}
            </button>
          </div>
          <p className="text-sm text-slate-500">Your balance: 🪙 {balance.toLocaleString()}</p>
        </section>
      )}

      {/* Incoming challenges */}
      {incoming.length > 0 && (
        <section>
          <h2 className="font-display text-xs text-slate-300 uppercase mb-3">⚔ Challenges for you</h2>
          <div className="space-y-2">
            {incoming.map((m) => (
              <MatchRow key={m.id} who={m.challengerName} wager={m.wager} team={m.team}>
                <button onClick={() => { setAcceptId(m.id); setAcceptTeam([]); }} disabled={pending || !canPlay}
                  className="pixel-btn bg-emerald-500 text-emerald-950 text-[9px] px-3 py-2">ACCEPT</button>
                <button onClick={() => doSimple(() => declinePvpMatch(m.id))} disabled={pending}
                  className="pixel-btn bg-slate-600 text-white text-[9px] px-3 py-2">DECLINE</button>
              </MatchRow>
            ))}
          </div>
        </section>
      )}

      {/* Open lobby */}
      <section>
        <h2 className="font-display text-xs text-slate-300 uppercase mb-3">🌐 Open lobby</h2>
        {lobby.length === 0 ? (
          <p className="pixel-panel p-6 text-center text-slate-400 text-lg">No open challenges. Create one above!</p>
        ) : (
          <div className="space-y-2">
            {lobby.map((m) => (
              <MatchRow key={m.id} who={m.challengerName} wager={m.wager} team={m.team}>
                <button onClick={() => { setAcceptId(m.id); setAcceptTeam([]); }} disabled={pending || !canPlay}
                  className="pixel-btn bg-emerald-500 text-emerald-950 text-[9px] px-3 py-2 disabled:opacity-50">ACCEPT</button>
              </MatchRow>
            ))}
          </div>
        )}
      </section>

      {/* My open challenges */}
      {outgoing.length > 0 && (
        <section>
          <h2 className="font-display text-xs text-slate-300 uppercase mb-3">⏳ Your open challenges</h2>
          <div className="space-y-2">
            {outgoing.map((m) => (
              <div key={m.id} className="pixel-panel p-3 flex items-center gap-3">
                <span className="flex-1 text-lg text-slate-200">
                  {m.directed ? `vs ${m.targetName ?? "?"}` : "Open lobby"} · 🪙 {m.wager}
                </span>
                <button onClick={() => doSimple(() => cancelPvpMatch(m.id))} disabled={pending}
                  className="pixel-btn bg-slate-600 text-white text-[9px] px-3 py-2">CANCEL</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* History */}
      {history.length > 0 && (
        <section>
          <h2 className="font-display text-xs text-slate-300 uppercase mb-3">📜 Recent battles</h2>
          <ul className="pixel-panel divide-y-[3px] divide-[var(--ink)] overflow-hidden">
            {history.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-2">
                <span className={`font-display text-[9px] ${m.won ? "text-[var(--accent)]" : "text-rose-400"}`}>
                  {m.won ? "WIN" : "LOSS"}
                </span>
                <span className="flex-1 text-lg text-slate-200">vs {m.opponentName} · 🪙 {m.wager}</span>
                {m.logJson && (
                  <button
                    onClick={() => setPlayback({ log: JSON.parse(m.logJson) as BattleLog, iAmSide: m.iAmSide })}
                    className="text-base text-[var(--accent-2)] hover:underline uppercase"
                  >
                    watch
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Accept team-pick modal */}
      {acceptId && (
        <div className="fixed inset-0 z-40 bg-slate-950/90 flex items-center justify-center p-4" onClick={() => !pending && setAcceptId(null)}>
          <div className="pixel-panel p-5 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xs text-slate-300 uppercase mb-3">Pick your team</h2>
            <TeamPicker mons={myMons} selected={acceptTeam} onToggle={(id) => toggle(acceptTeam, setAcceptTeam, id)} />
            <div className="flex gap-2 mt-4">
              <button onClick={doAccept} disabled={pending || acceptTeam.length !== 3}
                className="pixel-btn bg-emerald-500 text-emerald-950 text-[10px] px-5 py-2.5 disabled:opacity-50">
                {pending ? "BATTLING…" : acceptTeam.length !== 3 ? "PICK 3" : "FIGHT!"}
              </button>
              <button onClick={() => setAcceptId(null)} disabled={pending}
                className="pixel-btn bg-slate-600 text-white text-[10px] px-5 py-2.5">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {playback && (
        <BattlePlayback log={playback.log} iAmSide={playback.iAmSide} onClose={() => setPlayback(null)} />
      )}
    </div>
  );
}

function TeamPicker({ mons, selected, onToggle }: { mons: Mon[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1">
      {mons.map((m) => {
        const idx = selected.indexOf(m.speciesId);
        const picked = idx >= 0;
        return (
          <button
            key={m.speciesId}
            onClick={() => onToggle(m.speciesId)}
            className={`relative border-[3px] p-1 flex flex-col items-center ${picked ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--ink)] bg-[var(--panel-2)]"}`}
          >
            {picked && (
              <span className="absolute -top-2 -left-2 w-5 h-5 bg-[var(--accent)] text-[var(--ink)] font-display text-[9px] flex items-center justify-center border-2 border-[var(--ink)]">
                {idx + 1}
              </span>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.spriteUrl} alt={m.name} width={44} height={44} style={{ width: 44, height: 44, imageRendering: "pixelated" }} />
            <span className="text-xs text-white truncate w-full text-center leading-tight">{m.name}</span>
            <span className={`pixel-badge text-[6px] uppercase px-1 ${TYPE_COLOR[m.typeCode] ?? TYPE_COLOR.NOR}`}>{m.typeCode}</span>
            <span className="text-[10px] text-[var(--accent)] leading-none">CP {m.cp}</span>
          </button>
        );
      })}
    </div>
  );
}

function MatchRow({ who, wager, team, children }: { who: string; wager: number; team: Fighter[]; children: React.ReactNode }) {
  return (
    <div className="pixel-panel p-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        {team.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={f.spriteUrl} alt={f.name} width={32} height={32} style={{ width: 32, height: 32, imageRendering: "pixelated" }} />
        ))}
      </div>
      <span className="flex-1 min-w-0 text-lg text-slate-200 truncate">{who} · 🪙 {wager}</span>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}
