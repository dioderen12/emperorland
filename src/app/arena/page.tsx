import { getCurrentUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";
import { MIN_WAGER, type Fighter } from "@/lib/pvp";
import { ArenaView, type Mon, type LobbyMatch, type HistoryMatch, type OutgoingMatch } from "./ArenaView";

function teamPreview(json: string): Fighter[] {
  try {
    return (JSON.parse(json) as Fighter[]).slice(0, 3);
  } catch {
    return [];
  }
}

export default async function ArenaPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to enter the betting arena." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  const [owned, opponents, lobby, incoming, outgoing, history] = await Promise.all([
    prisma.ownedAnimal.findMany({ where: { userId: user.id }, include: { species: true } }),
    prisma.user.findMany({
      where: { id: { not: user.id }, username: { not: "" } },
      select: { id: true, username: true },
      orderBy: { username: "asc" },
      take: 100,
    }),
    prisma.match.findMany({
      where: { status: "open", directed: false, challengerId: { not: user.id } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { challenger: { select: { username: true, image: true } } },
    }),
    prisma.match.findMany({
      where: { status: "open", directed: true, opponentId: user.id },
      orderBy: { createdAt: "desc" },
      include: { challenger: { select: { username: true, image: true } } },
    }),
    prisma.match.findMany({
      where: { status: "open", challengerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { opponent: { select: { username: true } } },
    }),
    prisma.match.findMany({
      where: { status: "resolved", OR: [{ challengerId: user.id }, { opponentId: user.id }] },
      orderBy: { resolvedAt: "desc" },
      take: 12,
      include: {
        challenger: { select: { username: true } },
        opponent: { select: { username: true } },
      },
    }),
  ]);

  // Distinct owned species → team picker options.
  const seen = new Set<string>();
  const myMons: Mon[] = [];
  for (const o of owned) {
    if (seen.has(o.speciesId)) continue;
    seen.add(o.speciesId);
    myMons.push({
      speciesId: o.species.id,
      name: o.species.name,
      spriteUrl: o.species.spriteUrl,
      typeCode: o.species.typeCode,
      cp: o.species.power,
    });
  }
  myMons.sort((a, b) => b.cp - a.cp);

  const toLobby = (m: (typeof lobby)[number] | (typeof incoming)[number]): LobbyMatch => ({
    id: m.id,
    wager: m.wager,
    challengerName: m.challenger.username || "player",
    challengerImage: m.challenger.image ?? null,
    team: teamPreview(m.challengerTeam),
  });

  const outgoingMapped: OutgoingMatch[] = outgoing.map((m) => ({
    id: m.id,
    wager: m.wager,
    directed: m.directed,
    targetName: m.opponent?.username ?? null,
  }));

  const historyMapped: HistoryMatch[] = history.map((m) => {
    const iAmChallenger = m.challengerId === user.id;
    const won = m.winnerId === user.id;
    return {
      id: m.id,
      wager: m.wager,
      opponentName: (iAmChallenger ? m.opponent?.username : m.challenger.username) || "player",
      won,
      logJson: m.logJson ?? "",
      iAmSide: iAmChallenger ? "a" : "b",
    };
  });

  return (
    <ArenaView
      minWager={MIN_WAGER}
      balance={user.points}
      myMons={myMons}
      opponents={opponents}
      lobby={lobby.map(toLobby)}
      incoming={incoming.map(toLobby)}
      outgoing={outgoingMapped}
      history={historyMapped}
    />
  );
}
