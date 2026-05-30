import { getCurrentUser } from "@/lib/user";
import { SignInGate } from "@/components/SignInGate";
import { ChangelogView } from "./ChangelogView";

// Patch notes — readable by any signed-in user (even before they have the role),
// so everyone can follow what's changing.
export default async function ChangelogPage() {
  const user = await getCurrentUser();
  if (!user) return <SignInGate subtitle="Sign in with Discord to read the latest updates." />;
  return <ChangelogView />;
}
