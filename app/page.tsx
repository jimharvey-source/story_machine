import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Lockup } from "@/components/Logo";
import { Icon, IconTile } from "@/components/Icon";
import { Tour } from "@/components/Tour";

// The front door. Signed-out visitors read the case and press "Build your first story"; the tool lives at /build.
// Copy: claude/storymachine-landing-page.md. Lines in quotation marks there are Jim's, word for word.

export const metadata: Metadata = {
  title: "Jim Harvey's StoryMachine",
  description:
    "Start with the story, not with the slides. Turn rough notes into a presentation story that lands and sticks.",
};

// Old links to the tool pointed at / with these in the address. Send them on to /build, query and all.
const TOOL_PARAMS = ["story", "claim", "joined", "joinerror", "signin", "why", "reason", "programme", "checkout", "session_id"];

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Landing({ searchParams }: Props) {
  const sp = await searchParams;
  if (TOOL_PARAMS.some((k) => sp[k] !== undefined)) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (typeof v === "string") q.set(k, v);
      else if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    }
    redirect(`/build?${q.toString()}`);
  }
  // A signed-in visitor goes straight to the tool. The session cookie is enough to decide; /build checks it properly.
  const jar = await cookies();
  if (jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"))) redirect("/build");

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-5 pt-6 lg:px-10">
        <Lockup href={null} />
        <nav className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <Link href="/guide" className="text-ink-2 hover:text-ink">User guide</Link>
          <Link href="/build#signin" className="text-ink-2 hover:text-ink">Sign in</Link>
          <BuildButton small />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 lg:px-10">
        {/* 1. Opening */}
        <section className="grid items-center gap-14 pt-16 sm:pt-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <div>
          <h1 className="display text-[2.75rem] leading-[1.02] tracking-[-0.035em] sm:text-7xl sm:leading-[0.98] lg:text-[4.25rem]">
            Start with the story, not with the slides.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-ink-2 sm:text-xl">
            You have a big presentation to make. The audience is tough, and the subject is complex. After thirty years of
            helping the biggest businesses do this, my advice is: start with the story, not the slides. Now there is a
            machine that walks you through it.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
            <BuildButton />
            <p className="text-sm text-muted">Free to start. No sign-in, no card.</p>
          </div>
          </div>
          <HeroStory />
        </section>

        <Tour />

        {/* 9. What it costs */}
        <section className="mt-20 border-t border-rule pt-16 sm:mt-28">
          <p className="eyebrow">What it costs</p>
          <h2 className="display mt-3 text-3xl leading-tight sm:text-[2.6rem]">Your first story is free.</h2>
          <div className="mt-8">
            <IconTile name="tag" size="xl" />
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Price label="Stage 1" amount="Free" note="No sign-in, no card." />
            <Price label="Your first full story" amount="Free" note="When you sign in with your email. No password." />
            <Price label="After that, one story" amount="$4.99" note="A month $15.99. Lifetime $99." />
            <Price label="Launch offer" amount="$49" note="Lifetime, for the first five hundred. Code LAUNCH49." strong />
          </div>
          <p className="mt-6 max-w-2xl text-ink-2">
            <span className="font-semibold text-ink">On one of our programmes?</span> Your programme link adds twenty stories
            when you sign in.
          </p>
        </section>

        {/* 10. Close */}
        <section className="panel mt-20 sm:mt-28 !p-8 sm:!p-14">
          <Icon name="quote" className="!h-12 !w-12" />
          <h2 className="display mt-6 max-w-2xl text-3xl leading-tight sm:text-[2.6rem]">
            Try it on the presentation you are worried about.
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <BuildButton />
            <p className="text-sm text-muted">
              New here? Read the{" "}
              <Link href="/guide" className="underline decoration-rule underline-offset-4 hover:text-ink">user guide</Link>.
            </p>
          </div>
        </section>

        <p className="mt-12 text-sm text-muted">
          For training for you or your team:{" "}
          <a href="mailto:jim.harvey@themessagebusiness.com" className="underline decoration-rule underline-offset-4 hover:text-ink">
            jim.harvey@themessagebusiness.com
          </a>
        </p>
      </main>
    </>
  );
}

/**
 * The hero picture, drawn from the app itself: rough notes behind, the story they become in front.
 * The Big Idea is Jim's own, from his FFF book pitch.
 */
function HeroStory() {
  const scribble = ["w-[86%]", "w-[64%]", "w-[92%]", "w-[48%]", "w-[78%]", "w-[58%]", "w-[84%]", "w-[40%]"];
  return (
    <div className="relative mx-auto w-full max-w-[30rem] pb-4 lg:mx-0" aria-hidden="true">
      <div className="absolute left-0 top-0 w-[74%] -rotate-[5deg] rounded-md border border-rule bg-paper-2 p-5 shadow-[0_10px_30px_-18px_rgba(22,21,19,0.35)]">
        <div className="flex items-center gap-2">
          <Icon name="notes" className="!h-[18px] !w-[18px]" />
          <span className="tag text-muted">Your notes</span>
        </div>
        <div className="mt-4 space-y-2.5">
          {scribble.map((w, i) => (
            <div key={i} className={`h-[5px] rounded-full bg-rule ${w}`} />
          ))}
        </div>
      </div>
      <div className="panel relative ml-auto mt-24 w-[90%] !p-6 sm:!p-7">
        <div className="flex items-center gap-2">
          <Icon name="quote" className="!h-5 !w-5" />
          <span className="eyebrow">Big Idea</span>
        </div>
        <p className="said mt-3 text-[1.4rem] leading-[1.3] text-ink">Everyone admires the ceiling. The genius is in the walls.</p>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {["Why", "How", "What"].map((w) => (
            <div key={w} className="rounded-md bg-panel p-3">
              <p className="text-sm font-semibold text-red">{w}</p>
              <div className="mt-2.5 h-[5px] w-full rounded-full bg-rule" />
              <div className="mt-1.5 h-[5px] w-2/3 rounded-full bg-rule" />
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 border-t border-rule pt-4 text-sm text-muted">
          <Icon name="mic" className="!h-[18px] !w-[18px]" />
          Prologue, signposts, Epilogue, speaker notes
        </div>
      </div>
    </div>
  );
}

function BuildButton({ small = false }: { small?: boolean }) {
  return (
    <Link
      href="/build"
      className={
        "inline-flex items-center justify-center rounded-md bg-ink font-medium text-paper hover:opacity-90 " +
        (small ? "px-4 py-2 text-sm" : "px-7 py-3.5 text-base")
      }
    >
      Build your first story
    </Link>
  );
}

function Price({ label, amount, note, strong = false }: { label: string; amount: string; note: string; strong?: boolean }) {
  return (
    <div className={"rounded-md border bg-paper-2 p-6 " + (strong ? "border-ink" : "border-rule")}>
      <p className="eyebrow">{label}</p>
      <p className="display mt-2 text-4xl tabular-nums">{amount}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  );
}
