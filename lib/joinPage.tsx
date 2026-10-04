import { redirect } from "next/navigation";
import { currentProfile } from "./access";
import { redeemFor, type Invitation } from "./join";
import { Welcome } from "@/components/Join";
import { Tour } from "@/components/Tour";

/**
 * Shared by /[slug] and /join/[code]. A signed-in visitor goes straight to their stories, with the code
 * applied if it is open. Everyone else gets the welcome and signs in on it. With `tour`, an open
 * invitation also shows how the StoryMachine works, from the landing page, with no prices.
 */
export async function JoinView({ invitation, tour = true }: { invitation: Invitation; tour?: boolean }) {
  const p = await currentProfile().catch(() => null);
  if (p && (invitation.status === "open" || invitation.status === "closed")) {
    if (invitation.status === "open") {
      const r = await redeemFor(p.id, invitation.code);
      if (!r.ok && !r.already) redirect(`/build?joinerror=${r.throttled ? "throttled" : "failed"}`);
      redirect("/build?joined=1");
    }
    redirect("/build");
  }
  return <Welcome invitation={invitation} tour={tour ? <Tour programme /> : undefined} />;
}
