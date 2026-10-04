import type { Metadata } from "next";
import { lookupInvitation } from "@/lib/join";
import { JoinView } from "@/lib/joinPage";

// A cohort's short address: storymachine.themessagebusiness.com/givaudan. Set in cohort_codes.slug.
export const metadata: Metadata = { title: "Welcome | Jim Harvey's StoryMachine", robots: { index: false } };

// Cohorts whose welcome page stays short: Givaudan's invitation went out before the tour was added (4 October).
const NO_TOUR = new Set(["givaudan"]);

export default async function CohortPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <JoinView invitation={await lookupInvitation(slug, "slug")} tour={!NO_TOUR.has(slug.toLowerCase())} />;
}
