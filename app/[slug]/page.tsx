import type { Metadata } from "next";
import { lookupInvitation } from "@/lib/join";
import { JoinView } from "@/lib/joinPage";

// A cohort's short address: storymachine.themessagebusiness.com/givaudan. Set in cohort_codes.slug.
export const metadata: Metadata = { title: "Welcome | Jim Harvey's StoryMachine", robots: { index: false } };

export default async function CohortPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <JoinView invitation={await lookupInvitation(slug, "slug")} />;
}
