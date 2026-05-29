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
      <div className="pixel-panel overflow-hidden">
        {/* Manga sky hero */}
        <div className="relative h-40 sm:h-52 border-b-[3px] border-[var(--ink)]">
          <SkyBanner className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 flex items-end justify-center pb-4">
            <Logo className="h-16 w-16 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        {/* CTA */}
        <div className="text-center px-6 sm:px-8 pb-10 pt-5">
          <h1 className="font-display text-base sm:text-lg text-[var(--accent)] leading-relaxed">{title}</h1>
          <p className="text-slate-300 mt-3 text-lg leading-snug max-w-md mx-auto">{subtitle}</p>

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
                className="pixel-btn inline-flex items-center gap-2 bg-[#5865F2] text-white text-[11px] px-6 py-3"
              >
                SIGN IN · DISCORD
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-500 pixel-badge bg-[var(--panel-2)] px-4 py-2 inline-block">
              Discord login not configured
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
