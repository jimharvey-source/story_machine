import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Lockup } from "@/components/Logo";

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
        <section className="max-w-4xl pt-16 sm:pt-24">
          <h1 className="display text-[2.75rem] leading-[1.02] tracking-[-0.035em] sm:text-7xl sm:leading-[0.98]">
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
        </section>

        {/* 2. The problem */}
        <Section label="The problem" title="Most presentations are built backwards.">
          <p>
            Most people open PowerPoint first. They gather old slides, add new ones, and hope an argument appears. The
            audience leaves with plenty of information and no message.
          </p>
          <div className="my-8 space-y-4 border-l-2 border-red pl-6">
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">
              Presentation skills training is repainting the Titanic after it has hit the iceberg.
            </p>
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">When has a great actor saved a terrible script?</p>
          </div>
          <p>
            The fix is to decide what you are saying, and to whom, before you build a single slide. That is what the
            StoryMachine does with you.
          </p>
        </Section>

        {/* 3. How it works */}
        <Section label="How it works" title="Three steps. About twenty minutes.">
          <ol className="mt-2 border-b border-rule">
            {HOW.map(([head, body], i) => (
              <li key={head} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-rule py-6">
                <span className="text-base font-semibold text-red">{i + 1}</span>
                <span>
                  <span className="block text-lg font-semibold text-ink">{head}</span>
                  <span className="mt-1 block text-ink-2">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. What you get */}
        <section className="border-t border-rule pt-16 mt-20 sm:mt-28">
          <p className="eyebrow">What you get</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-[2.6rem]">A detailed PDF you can use at once.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {STAGES.map((st) => (
              <div key={st.n} className="panel flex flex-col !p-7 sm:!p-9">
                <p className="tag text-red">{st.n}</p>
                <p className="display mt-1 text-2xl">{st.name}</p>
                <p className="mt-1 text-sm text-muted">{st.access}</p>
                <ul className="mt-6 space-y-4">
                  {st.steps.map(([head, sub]) => (
                    <li key={head}>
                      <span className="block font-semibold text-ink">{head}</span>
                      <span className="block text-ink-2">{sub}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-2xl text-lg text-ink-2">
            Then download the lot as a PDF, a Word file, or a PowerPoint outline ready for your company template.
          </p>
        </section>

        {/* 5. Built for the room you face */}
        <Section label="Presentation types" title="Tell it what kind of presentation it is.">
          <p>
            A project update, a strategy recommendation, a sales pitch, choosing between options, a training session, bad
            news, or something else. Each one gives the three acts the right job for that room. A sales pitch moves from
            the need to the solution to the proof and the close. Bad news moves from what happened to putting it right to
            where it ends for the people affected.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <li key={k} className="rounded-full border border-rule bg-paper-2 px-4 py-1.5 text-sm text-ink-2">{k}</li>
            ))}
          </ul>
        </Section>

        {/* 6. Make it your own */}
        <Section label="It works only from what you give it" title="Make it your own.">
          <p>
            Where your notes are silent, the StoryMachine asks. Every story ends with a panel headed{" "}
            <span className="font-semibold text-ink">Make it your own: Jim&apos;s suggestions</span>: the example, the
            number, the reason this matters to you, and my advice before you rehearse. An audience believes a speaker who
            sounds like themselves.
          </p>
        </Section>

        {/* 7. Your deck stays on your computer */}
        <Section label="Confidential material" title="Your deck stays on your computer.">
          <p>
            Upload a PowerPoint, Word file or PDF of any size. The StoryMachine reads the words on your own computer and
            keeps only those. The file is never sent anywhere, so a confidential board deck stays where it belongs.
          </p>
        </Section>

        {/* 8. The method behind it */}
        <Section label="The method behind it" title="Thirty years of the same method, in one tool.">
          <p>
            We have used this method for thirty years with teams at JP Morgan, Mercer, Ford, Rolls-Royce, Givaudan, Puig,
            Grifols, AstraZeneca, Mott MacDonald and many others.
          </p>
          <p className="mt-4">
            Each part of your story arrives with a line saying why it is there, so you learn the method while it works. The
            PDF ends with the method on a page, so you can do it yourself next time.
          </p>
          <p className="said mt-8 text-2xl leading-snug text-ink sm:text-[1.7rem]">
            I have been doing this thirty years and I am not Churchill.
          </p>
          <p className="mt-4">
            The StoryMachine is a good coach at nine in the evening before the board meeting, which is when you need one.
          </p>
        </Section>

        {/* 9. What it costs */}
        <section className="mt-20 border-t border-rule pt-16 sm:mt-28">
          <p className="eyebrow">What it costs</p>
          <h2 className="display mt-3 text-3xl leading-tight sm:text-[2.6rem]">Your first story is free.</h2>
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
          <h2 className="display max-w-2xl text-3xl leading-tight sm:text-[2.6rem]">
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

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-20 grid gap-6 border-t border-rule pt-16 sm:mt-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div>
        <p className="eyebrow">{label}</p>
        <h2 className="display mt-3 text-3xl leading-tight sm:text-[2.6rem]">{title}</h2>
      </div>
      <div className="max-w-2xl text-lg leading-relaxed text-ink-2 lg:pt-8">{children}</div>
    </section>
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

const HOW: Array<[string, string]> = [
  [
    "Bring what you have.",
    "Paste your notes, or upload the deck, the paper or the brief. Your file stays on your computer; only the words are read.",
  ],
  [
    "Answer two questions.",
    "Who is in the room? What do you want them to do when you sit down? Then choose the kind of presentation.",
  ],
  [
    "Read your story as it arrives.",
    "Edit any line, ask for a sharper version, or argue with the strategist until it says what you mean.",
  ],
];

const STAGES = [
  {
    n: "Stage 1",
    name: "Get your story straight",
    access: "Free. No sign-in.",
    steps: [
      ["Understand the audience", "Who is in the room, what they need to hear, what to leave out."],
      ["Set clear goals", "After my presentation, the audience will..."],
      ["Build a three-act story", "Beginning, middle and end. Why, how, what."],
    ],
  },
  {
    n: "Stage 2",
    name: "Add interest and impact",
    access: "Free with your first story.",
    steps: [
      ["A confident start and a definite ending", "The first minute, and an ending with a clear action."],
      ["Headlines and signposts", "The lines they will remember, and the sentences that tell them the point has arrived."],
      ["A simple set of visuals", "One idea per slide, with a brief and a prompt for the tool you use."],
      ["Rehearse it into life", "Speaker notes, and the words in full. Say it aloud before you build anything."],
    ],
  },
];

const KINDS = [
  "Project update",
  "Strategy recommendation",
  "Sales pitch",
  "Choosing between options",
  "Training session",
  "Bad news",
  "Something else",
];
