// Discord role-gating. All config comes from env so access rules change per
// deployment without code edits. Gating is OFF unless BOTH a guild id and at
// least one allowed role id are set — so an un-configured deploy behaves exactly
// as before (anyone who signs in can play).

export const ACCESS_GUILD_ID = process.env.AUTH_DISCORD_GUILD_ID ?? "";

export const ACCESS_ROLE_IDS = (process.env.AUTH_DISCORD_ALLOWED_ROLE_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const accessGatingEnabled = Boolean(ACCESS_GUILD_ID && ACCESS_ROLE_IDS.length);

// Shown on the access gate so users know how to qualify.
export const ACCESS_INVITE_URL = process.env.DISCORD_INVITE_URL ?? "";
export const ACCESS_ROLE_LABEL = process.env.DISCORD_REQUIRED_ROLE_LABEL ?? "the required role";

// Whether this user may play. When gating is disabled, everyone signed in passes.
export function userHasAccess(user: { hasAccess?: boolean } | null | undefined): boolean {
  if (!user) return false;
  if (!accessGatingEnabled) return true;
  return Boolean(user.hasAccess);
}

// Reads the member's roles in the configured guild via their OAuth access token
// (scope: guilds.members.read) and returns whether any matches the allow list.
// Fails closed: any error / not-a-member → no access.
export async function checkGuildAccess(
  accessToken: string,
): Promise<{ hasAccess: boolean; roles: string[] }> {
  if (!accessGatingEnabled) return { hasAccess: true, roles: [] };
  try {
    const res = await fetch(
      `https://discord.com/api/users/@me/guilds/${ACCESS_GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { hasAccess: false, roles: [] }; // 404 = not in the guild
    const member = (await res.json()) as { roles?: string[] };
    const roles = Array.isArray(member.roles) ? member.roles : [];
    return { hasAccess: roles.some((r) => ACCESS_ROLE_IDS.includes(r)), roles };
  } catch {
    return { hasAccess: false, roles: [] };
  }
}
