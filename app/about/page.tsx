import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/Logo";
import { WhoWeAre } from "@/components/Tour";

// About us (2 November 2026): Who we are moved here from the landing page, so the front page leads with the problem.
export const metadata: Metadata = { title: "About us | Jim Harvey's StoryMachine" };

export default function About() {
  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 pt-6 lg:px-10">
        <Lockup />
        <nav className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/" className="text-ink-2 hover:text-ink">Home</Link>
          <Link href="/guide" className="text-ink-2 hover:text-ink">User Guide</Link>
          <Link
            href="/build"
            className="inline-flex items-center justify-center rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
          >
            Build your first story
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 pb-24 lg:px-10">
        <WhoWeAre />
        <section className="panel mt-20 sm:mt-28 !p-8 sm:!p-14">
          <h2 className="display max-w-2xl text-3xl leading-tight sm:text-[2.6rem]">Try it for your next presentation.</h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link href="/build" className="inline-flex items-center justify-center rounded-md bg-ink px-7 py-3.5 text-base font-medium text-paper hover:opacity-90">
              Build your first story
            </Link>
            <p className="text-sm text-muted">Your first story is free. Just your email, no credit card.</p>
          </div>
        </section>
      </main>
    </>
  );
}
