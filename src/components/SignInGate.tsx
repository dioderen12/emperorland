import { signIn, discordConfigured } from "@/auth";

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
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center rounded-3xl border border-white/10 bg-slate-950/60 p-10">
        <div className="text-6xl">👑</div>
        <h1 className="text-2xl font-bold mt-4">{title}</h1>
        <p className="text-slate-400 mt-2 text-sm leading-relaxed">{subtitle}</p>

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
  );
}
