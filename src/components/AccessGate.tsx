import { signOut } from "@/auth";
import { Logo } from "@/components/Logo";
import { ACCESS_INVITE_URL, ACCESS_ROLE_LABEL } from "@/lib/access";

// Shown to a signed-in user who doesn't (yet) have the required Discord role.
// Friendly: tells them exactly how to qualify + a join link, and a sign-out
// button to re-check after they get the role (access is evaluated at sign-in).
export function AccessGate({ username }: { username: string }) {
  return (
    <div className="max-w-xl mx-auto font-clean">
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 overflow-hidden shadow-2xl shadow-black/40 p-8 text-center">
        <div className="flex justify-center">
          <Logo className="h-16 w-16 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-4">
          Almost there, {username}!
        </h1>
        <p className="text-slate-300/90 mt-3 leading-relaxed">
          EmperorLand is members-only. You need the{" "}
          <span className="text-amber-300 font-semibold">{ACCESS_ROLE_LABEL}</span> role in our
          Discord to play.
        </p>

        <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
          {ACCESS_INVITE_URL && (
            <a
              href={ACCESS_INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="bg-[#5865F2] hover:bg-[#4752c4] px-6 py-3 rounded-xl text-white font-semibold transition-colors"
            >
              Join the Discord →
            </a>
          )}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="w-full px-6 py-3 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 transition"
            >
              Re-check (sign out)
            </button>
          </form>
        </div>

        <p className="text-slate-500 text-sm mt-5">
          Just got the role? Sign out and back in to re-check your access.
        </p>
      </div>
    </div>
  );
}
