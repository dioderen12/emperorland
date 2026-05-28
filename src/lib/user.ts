import { prisma } from "./db";
import { auth } from "@/auth";

// Returns the player making the current request. Reads from the Auth.js
// session if present; otherwise falls back to the seeded "demo" user so the
// app keeps working when Discord OAuth isn't configured yet (local dev).
export async function getCurrentUser() {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) return user;
    // Session exists but the User row was deleted (e.g. via reset script) —
    // fall through to demo. The next sign-in will recreate the OAuth user.
  }

  const demo = await prisma.user.findFirst({ where: { username: "demo" } });
  if (!demo) throw new Error("Demo user missing — run `npm run db:seed`");
  return demo;
}
