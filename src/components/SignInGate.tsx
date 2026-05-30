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
    <div className="max-w-xl mx-auto font-clean">
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 overflow-hidden shadow-2xl shadow-black/40">
        {/* Sky hero with a gradient scrim so the logo + text below stay readable */}
        <div className="relative h-44 sm:h-56">
          <SkyBanner className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Logo className="h-20 w-20 text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]" />
          </div>
        </div>

        {/* CTA — clean, high-contrast, no pixel font here */}
        <div className="text-center px-6 sm:px-10 pb-10 -mt-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{title}</h1>
          <p className="text-slate-300/90 mt-3 text-base leading-relaxed max-w-sm mx-auto">{subtitle}</p>

          {discordConfigured ? (
            <form
              action={async () => {
                "use server";
                await signIn("discord");
              }}
              className="mt-7"
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2.5 bg-[#5865F2] hover:bg-[#4752c4] px-7 py-3.5 rounded-xl text-white font-semibold text-base shadow-lg shadow-indigo-900/40 transition-colors"
              >
                <svg viewBox="0 0 24 18" width="22" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M20.3 1.6A19.8 19.8 0 0 0 15.4.1a14 14 0 0 0-.6 1.3 18.3 18.3 0 0 0-5.5 0A14 14 0 0 0 8.6.1 19.8 19.8 0 0 0 3.7 1.6C.6 6.2-.3 10.6.1 15a19.9 19.9 0 0 0 6 3 15 15 0 0 0 1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1A15 15 0 0 0 17.9 18a19.9 19.9 0 0 0 6-3c.5-5.1-.8-9.5-3.6-13.4ZM8 12.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 7.5 8 7.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z" />
                </svg>
                Sign in with Discord
              </button>
            </form>
          ) : (
            <p className="mt-7 text-sm text-slate-500 border border-slate-700 rounded-lg px-4 py-2 inline-block">
              Discord login not configured
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
