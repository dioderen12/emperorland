// Developer patch notes. Add a new entry at the TOP for each update — players
// get a "new" dot in the nav until they open the News page. id just needs to be
// unique + change when there's something new (date works).

export type ChangeTag = "new" | "buff" | "nerf" | "fix";
export type ChangeEntry = {
  id: string;
  date: string;
  title: string;
  items: { tag: ChangeTag; text: string }[];
};

export const CHANGELOG: ChangeEntry[] = [
  {
    id: "2026-05-31",
    date: "May 31, 2026",
    title: "Economy & Marketplace",
    items: [
      { tag: "new", text: "Marketplace — buy & sell Pokémon for coins (5% house fee)." },
      { tag: "new", text: "Marketplace got a fresh look + a Sale History showing who sold to whom." },
      { tag: "nerf", text: "Epic & Legendary pull rates cut across all packs — they're meant to be rare and hold value." },
      { tag: "nerf", text: "Dungeon income slashed. Real coins now come from Raid & Arena, not idle farming." },
      { tag: "fix", text: "Arena wager / market price boxes were stuck at the minimum — you can type any amount now." },
    ],
  },
  {
    id: "2026-05-30",
    date: "May 30, 2026",
    title: "Arena & Bigger Dex",
    items: [
      { tag: "new", text: "PvP Betting Arena — stake coins, pick 3 Pokémon, winner takes the pot." },
      { tag: "new", text: "Cinematic battles: move-specific effects, sound, hit reactions & KO animations." },
      { tag: "new", text: "Power Ranking (Top CP) page so you can chase the strongest Pokémon." },
      { tag: "buff", text: "Dex expanded to 649 Pokémon (Gen 1–5) — all animated." },
    ],
  },
  {
    id: "2026-05-29",
    date: "May 29, 2026",
    title: "Raids, Collection & Access",
    items: [
      { tag: "new", text: "Community Raid Boss with a shared HP bar + damage leaderboard." },
      { tag: "new", text: "Collection / Pokédex — hunt the silhouettes to complete it." },
      { tag: "new", text: "NEW! / Dupe badges when you open packs." },
      { tag: "new", text: "Members-only access via your Discord role." },
    ],
  },
];

export const LATEST_ID = CHANGELOG[0]?.id ?? "";
