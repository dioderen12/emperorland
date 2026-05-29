import { signIn, discordConfigured } from "@/auth";
import { Logo } from "@/components/Logo";
import { SkyBanner } from "@/components/SkyBanner";

// Full-page call-to-action shown to anonymous visitors in place of any gameplay
// surface. Connecting Discord is the only way to get a point balance and play.
export function SignInGate({
  title = "Connect Discord to play",
  subtitle = "Sign in with Discord to claim your starter points, open packs, and deploy Pokemon into dungeons.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
        {/* Manga sky hero */}
        <div className="relative h-40 sm:h-52">
          <SkyBanner className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <Logo className="h-16 w-16 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center px-8 pb-10 pt-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed max-w-md mx-auto">{subtitle}</p>

          {discordConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
              className="mt-6"
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 px-6 py-3 rounded-full text-white font-semibold transition"
              >
                <span>🔗</span> Sign in with Discord
              </button>
            </form>
          ) : (
            <p className="mt-6 text-xs text-slate-500 border border-slate-700 rounded-full px-4 py-2 inline-block">
              Discord login not configured
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
