import type { Metadata } from "next";
import { lookupInvitation } from "@/lib/join";
import { JoinView } from "@/lib/joinPage";

// /join/CODE: for single-use trialist codes, where the code is the secret, and for any code at all.
export const metadata: Metadata = { title: "Welcome | Jim Harvey's StoryMachine", robots: { index: false } };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <JoinView invitation={await lookupInvitation(decodeURIComponent(code), "code")} />;
}
