import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/user";
import { auth, signIn, signOut, discordConfigured } from "@/auth";
import { Logo } from "@/components/Logo";
import { NewsLink } from "@/components/NewsLink";

export async function Nav() {
  const user = await getCurrentUser();
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <header className="border-b-[3px] border-[var(--ink)] bg-[#0c0f1c] sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <Logo className="h-7 w-7 text-[var(--accent)] transition-transform group-hover:scale-110" />
          <span className="font-display text-sm text-[var(--accent)] tracking-tight hidden sm:inline">
            EmperorLand
          </span>
        </Link>
        <nav className="flex gap-3 sm:gap-4 text-base sm:text-lg uppercase tracking-wide text-slate-400">
          <Link href="/packs" className="hover:text-[var(--accent-2)] transition">Packs</Link>
          <Link href="/inventory" className="hover:text-[var(--accent-2)] transition">Bag</Link>
          <Link href="/collection" className="hover:text-[var(--accent-2)] transition">Dex</Link>
          <Link href="/staking" className="hover:text-[var(--accent-2)] transition">Dungeons</Link>
          <Link href="/boss" className="hover:text-[var(--accent-3)] transition">Raid</Link>
          <Link href="/arena" className="hover:text-[var(--accent-3)] transition">Arena</Link>
          <Link href="/market" className="hover:text-[var(--accent-2)] transition">Market</Link>
          <NewsLink />
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--ink)] px-2.5 py-1">
              <span className="text-base leading-none">🪙</span>
              <span className="font-clean font-bold text-sm tabular-nums leading-none">{user.points.toLocaleString()}</span>
            </div>
          )}

          {signedIn ? (
            <UserMenu
              name={session!.user!.name ?? user?.username ?? "player"}
              image={session!.user!.image ?? null}
            />
          ) : discordConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
            >
              <button
                type="submit"
                className="font-clean inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                Sign in
              </button>
            </form>
          ) : (
            <span
              title="Set AUTH_DISCORD_ID + AUTH_DISCORD_SECRET in .env to enable login"
              className="font-clean text-xs text-slate-500 border border-slate-700 rounded px-2 py-1"
            >
              demo
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

function UserMenu({ name, image }: { name: string; image: string | null }) {
  return (
    <div className="flex items-center gap-2">
      {image ? (
        <Image
          src={image}
          alt={name}
          width={28}
          height={28}
          className="rounded-full"
          unoptimized
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold font-clean">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="font-clean text-sm text-white/85 hidden sm:inline">{name}</span>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          className="text-xs text-slate-400 hover:text-rose-300 transition px-2"
          title="Sign out"
        >
          ↗
        </button>
      </form>
    </div>
  );
}
