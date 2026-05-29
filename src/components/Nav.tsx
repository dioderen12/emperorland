import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/user";
import { auth, signIn, signOut, discordConfigured } from "@/auth";

export async function Nav() {
  const user = await getCurrentUser();
  const session = await auth();
  const signedIn = Boolean(session?.user?.id);

  return (
    <header className="border-b border-white/10 bg-slate-950/60 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link href="/" className="font-bold text-lg tracking-tight">
          👑 EmperorLand
        </Link>
        <nav className="flex gap-4 text-sm text-slate-300">
          <Link href="/packs" className="hover:text-white">Pack Shop</Link>
          <Link href="/inventory" className="hover:text-white">Inventory</Link>
          <Link href="/staking" className="hover:text-white">Dungeons</Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 px-3 py-1.5 rounded-full text-amber-100 text-sm">
              <span>💰</span>
              <span className="font-mono font-semibold">{user.points.toLocaleString()}</span>
              <span className="text-amber-200/70 text-xs">pts</span>
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
                className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-3 py-1.5 rounded-full text-white text-sm font-semibold transition"
              >
                <span>🔗</span> Sign in with Discord
              </button>
            </form>
          ) : (
            <span
              title="Set AUTH_DISCORD_ID + AUTH_DISCORD_SECRET in .env to enable login"
              className="text-xs text-slate-500 border border-slate-700 rounded-full px-3 py-1.5"
            >
              demo mode
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
        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
          {name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className="text-sm text-white/80 hidden sm:inline">{name}</span>
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
