import { prisma } from "./db";
import { auth, discordConfigured } from "@/auth";

// Returns the player making the current request, or `null` if nobody is signed
// in. A signed-in Discord session always resolves to that user's row.
//
// The "demo" fallback is intentionally LIMITED to local dev where Discord OAuth
// isn't configured yet — so `npm run dev` keeps working without a login step.
// In production (Discord configured) an anonymous visitor gets `null`: they must
// connect Discord before they can hold points or play. This prevents the public
// from spending the shared demo balance.
export async function getCurrentUser() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) return user;
    // Session cookie exists but the User row was deleted (e.g. via reset script).
    // Treat as signed-out; the next sign-in recreates the OAuth user.
  }

  // Local dev only: no Discord credentials → use the seeded demo user.
  if (!discordConfigured) {
    const demo = await prisma.user.findFirst({ where: { username: "demo" } });
    if (!demo) throw new Error("Demo user missing — run `npm run db:seed`");
    return demo;
  }

  return null;
}

// For server actions and other code paths that MUST have an authenticated user.
// Throws if nobody is signed in — this is the authoritative gate, enforced on the
// server regardless of what the UI shows. Never trust the client to hide buttons.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Connect Discord to play.");
  return user;
}
