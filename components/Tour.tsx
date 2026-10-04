import { Icon, IconTile, type IconName } from "@/components/Icon";

// The case for the StoryMachine, from the problem to the method. Shared by the landing page and the
// programme welcome pages. With `programme`, nothing mentions money: the stories are already paid for.
// Copy: claude/storymachine-landing-page.md. Lines in quotation marks there are Jim's, word for word.

export function Tour({ programme = false }: { programme?: boolean }) {
  return (
    <>
        {/* 2. The problem */}
        <Section icon="backwards" label="The problem" title="Most presentations are built backwards.">
          <p>
            Most people open PowerPoint first. They gather old slides, add new ones, and hope a story appears. The
            audience leaves with plenty of information and no message.
          </p>
          <div className="my-8 space-y-4 border-l-2 border-red pl-6">
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">
              Presentation skills training alone is like repainting the Titanic after it has hit the iceberg. The story is the problem.
            </p>
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">When has a great actor saved a terrible script? Never.</p>
          </div>
          <p>
            The long-term fix is to decide what you are saying, and to whom, before you build a single slide. That is
            what the StoryMachine does.
          </p>
        </Section>

        {/* 3. How it works */}
        <Section icon="acts" label="How it works" title="Three steps. About twenty minutes.">
          <ol className="mt-2 border-b border-rule">
            {HOW.map(([head, body], i) => (
              <li key={head} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-3 border-t border-rule py-6">
                <span className="text-base font-semibold text-red pt-0.5">{i + 1}</span>
                <span>
                  <span className="block text-lg font-semibold text-ink">{head}</span>
                  <span className="mt-1 block text-ink-2">{body}</span>
                </span>
                <IconTile name={STEP_ICONS[i]} size="sm" />
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. What you get */}
        <section className="border-t border-rule pt-16 mt-20 sm:mt-28">
          <p className="eyebrow">What you get</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-[2.6rem]">A detailed PDF you can use at once.</h2>
          <div className="mt-8">
            <IconTile name="download" size="xl" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {STAGES.map((st) => (
              <div key={st.n} className="panel flex flex-col !p-7 sm:!p-9">
                <IconTile name={st.icon} />
                <p className="tag mt-5 text-red">{st.n}</p>
                <p className="display mt-1 text-2xl">{st.name}</p>
                <p className="mt-1 text-sm text-muted">{programme ? "Included in your twenty stories." : st.access}</p>
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
        <Section icon="grid" label="Presentation types" title="Tell it what kind of presentation it is.">
          <p>
            A project update, a strategy recommendation, a sales pitch, choosing between options, a training session, bad
            news, or something else. Each one gives the three acts the right job for that room. A sales pitch moves from
            the need to the solution to the proof and the close. Bad news moves from what happened to putting it right to
            where it ends for the people affected.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2">
            {KINDS.map(([k, icon]) => (
              <li key={k} className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 py-1.5 pl-2.5 pr-4 text-sm text-ink-2">
                <Icon name={icon} className="!h-[18px] !w-[18px]" />
                {k}
              </li>
            ))}
          </ul>
        </Section>

        {/* 6. Make it your own */}
        <Section icon="pen" label="It works only from what you give it" title="Make it your own.">
          <p>
            Where your notes are silent, the StoryMachine asks. Every story ends with a panel headed{" "}
            <span className="font-semibold text-ink">Make it your own: Jim&apos;s suggestions</span>: the example, the
            number, the reason this matters to you, and my advice before you rehearse. An audience believes a speaker who
            sounds like themselves.
          </p>
        </Section>

        {/* 7. Your deck stays on your computer */}
        <Section icon="laptop" label="Confidential material" title="Your deck stays on your computer.">
          <p>
            Upload a PowerPoint, Word file or PDF of any size. The StoryMachine reads the words on your own computer and
            keeps only those. The file is never sent anywhere, so a confidential board deck stays where it belongs.
          </p>
        </Section>

        {/* 8. The method behind it */}
        <Section icon="book" label="The method behind it" title="Thirty years of the same method, in one tool.">
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
    </>
  );
}

export function Section({ icon, label, title, children }: { icon: IconName; label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-20 grid gap-6 border-t border-rule pt-16 sm:mt-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      <div>
        <p className="eyebrow">{label}</p>
        <h2 className="display mt-3 text-3xl leading-tight sm:text-[2.6rem]">{title}</h2>
        <div className="mt-8">
          <IconTile name={icon} size="xl" />
        </div>
      </div>
      <div className="max-w-2xl text-lg leading-relaxed text-ink-2 lg:pt-8">{children}</div>
    </section>
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
    icon: "target" as IconName,
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
    icon: "mic" as IconName,
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

const KINDS: Array<[string, IconName]> = [
  ["Project update", "update"],
  ["Strategy recommendation", "strategy"],
  ["Sales pitch", "pitch"],
  ["Choosing between options", "options"],
  ["Training session", "training"],
  ["Bad news", "badnews"],
  ["Something else", "quote"],
];

const STEP_ICONS: IconName[] = ["notes", "questions", "acts"];
