import type { Metadata } from "next";
import Link from "next/link";
import { currentProfile } from "@/lib/access";
import { isCodeAdmin, STORIES_PER_PERSON } from "@/lib/codes";
import { Lockup } from "@/components/Logo";
import { SignIn } from "@/components/Account";
import { CodesConsole } from "@/components/Codes";

export const metadata: Metadata = { title: "Codes | Jim Harvey's StoryMachine", robots: { index: false } };
export const dynamic = "force-dynamic";

// The Codes page (24 October 2026): make personal and group codes, see who has joined. Team only (lib/codes.ts).
export default async function CodesPage() {
  const p = await currentProfile().catch(() => null);
  return (
    <main className="mx-auto w-full max-w-3xl px-5 lg:max-w-5xl lg:px-10 2xl:max-w-6xl pb-24 pt-10 sm:pt-16">
      <Link href="/" aria-label="Home"><Lockup /></Link>
      <h1 className="display mt-8 text-4xl leading-[1.05]">Codes</h1>
      {!p ? (
        <div className="mt-6 max-w-xl">
          <p className="text-ink-2">Make codes for trialists and programmes, and see who has joined. Sign in with your StoryMachine address.</p>
          <div className="mt-5"><SignIn title="Sign in" body="Enter your email and we send you a six-digit code." next="/codes" /></div>
        </div>
      ) : !isCodeAdmin(p.email) ? (
        <p className="mt-6 max-w-xl text-ink-2">
          This page is for the StoryMachine team. You are signed in as {p.email}. <Link href="/build" className="underline decoration-rule underline-offset-4">Go to my stories</Link>
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-ink-2">
            Every code gives {STORIES_PER_PERSON} stories a person. The join-by date closes sign-up only: stories never lapse. Signed in as {p.email}.
          </p>
          <CodesConsole />
        </>
      )}
    </main>
  );
}
