// Auth.js (NextAuth v5) configuration. Discord OAuth + Prisma adapter.
//
// SETUP (one-time):
// 1. Go to https://discord.com/developers/applications → New Application
// 2. OAuth2 → Redirects → add http://localhost:3000/api/auth/callback/discord
// 3. Copy Client ID + Client Secret → paste into .env as AUTH_DISCORD_ID / AUTH_DISCORD_SECRET
// 4. Restart `npm run dev` and click "Sign in with Discord" in the navbar
//
// Until Discord credentials are present, the app silently falls back to the
// hardcoded "demo" user so local dev keeps working.

import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { STARTING_POINTS } from "@/lib/constants";
import { accessGatingEnabled, checkGuildAccess } from "@/lib/access";

export const discordConfigured = Boolean(
  process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET,
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Cast: PrismaAdapter type expects a slightly different shape than our
  // generated client exposes. Behavior is fine at runtime.
  adapter: PrismaAdapter(prisma as never) as never,
  providers: discordConfigured
    ? [
        Discord({
          // `identify` = public profile (id, username, avatar), no email.
          // When role-gating is on we also request `guilds.members.read` so we
          // can read the user's roles in the configured guild at sign-in.
          authorization: {
            params: {
              scope: accessGatingEnabled ? "identify guilds.members.read" : "identify",
            },
          },
        }),
      ]
    : [],
  session: { strategy: "database" },
  // Trust the localhost dev origin without a NEXTAUTH_URL env var.
  trustHost: true,
  events: {
    // First-time sign-in: copy Discord profile data onto our User row and grant
    // the starter point balance. The adapter pre-creates the User; we just
    // patch in our game-specific fields.
    async createUser({ user }) {
      // Find the discord Account row that was just created for this user.
      const account = await prisma.account.findFirst({
        where: { userId: user.id, provider: "discord" },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: {
          discordId: account?.providerAccountId ?? null,
          username: user.name ?? user.email?.split("@")[0] ?? "player",
          points: STARTING_POINTS,
        },
      });
    },

    // Re-check Discord role access on every sign-in, using this login's fresh
    // access token. Keeps `hasAccess` current as roles change (user must sign
    // out/in to re-evaluate). No-op when role-gating is disabled.
    async signIn({ user, account }) {
      if (!accessGatingEnabled) return;
      if (account?.provider !== "discord" || !account.access_token || !user.id) return;
      const { hasAccess, roles } = await checkGuildAccess(account.access_token);
      await prisma.user.update({
        where: { id: user.id },
        data: { hasAccess, discordRoles: roles.join(","), accessCheckedAt: new Date() },
      });
    },
  },
  callbacks: {
    // Expose user id on the session so server components can query directly.
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
