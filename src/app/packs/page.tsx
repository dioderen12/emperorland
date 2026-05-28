import { getCurrentUser } from "@/lib/user";
import { PACKS } from "@/lib/constants";
import { PackCard } from "./PackCard";

export default async function PacksPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold">Pack Shop</h1>
        <p className="text-slate-400 mt-1">
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
