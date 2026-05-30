import { getCurrentUser } from "@/lib/user";
import { PACKS } from "@/lib/constants";
import { PackCard } from "./PackCard";
import { SignInGate } from "@/components/SignInGate";
import { AccessGate } from "@/components/AccessGate";
import { userHasAccess } from "@/lib/access";

export default async function PacksPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to get your starter points and open packs." />;
  if (!userHasAccess(user)) return <AccessGate username={user.username} />;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-display text-xl sm:text-2xl text-[var(--accent)]">Pack Shop</h1>
        <p className="text-slate-400 mt-2 text-lg">
          Higher-tier packs cost more but bias toward rarer pulls.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map((pack) => (
          <PackCard key={pack.id} pack={pack} balance={user.points} />
        ))}
      </section>
    </div>
  );
}
