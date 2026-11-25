import Link from "next/link";
import { Icon, IconTile, type IconName } from "@/components/Icon";
import { HowItWorksDiagram } from "@/components/HowItWorksDiagram";

// The case for the StoryMachine, from the problem to the method (order of 2 November: problem, how it works with the
// diagram, what you get, types, make it your own, confidential, method). Who we are lives on /about. Shared by the landing page and the
// programme welcome pages. With `programme`, nothing mentions money: the stories are already paid for.
// Copy: claude/storymachine-landing-page.md. Lines in quotation marks there are Jim's, word for word.

// `signedIn` (19 November, John): a returning user sees "Go to my stories" and no "first story is free" line.
export function Tour({ programme = false, signedIn = false }: { programme?: boolean; signedIn?: boolean }) {
  return (
    <>
        {/* 2. The problem */}
        <Section icon="backwards" label="The problem" title="Most presentations are built backwards.">
          <p>
            People start with PowerPoint. They gather old slides, add new ones, and hope that somehow, a coherent
            presentation will emerge. The audience leaves with too much information and no clear message.
          </p>
          <div className="my-8 border-l-2 border-red pl-6">
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">
              When a presentation falls flat, the presenter takes the blame: too long, too confusing, too many slides. The
              real problem is usually the story. And it&apos;s easy to fix.
            </p>
          </div>
          <p>
            StoryMachine helps you build a clear, strong story. A clear, strong story means a more engaged audience. A
            more engaged audience means better results.
          </p>
        </Section>

        {/* 3. How it works */}
        {/* 3. How it works (2 November): the diagram and the steps are one section, with a way to start straight away. */}
        <HowItWorksDiagram>
          <h3 className="display mt-16 text-2xl sm:text-3xl">Six steps. Under 30 minutes.</h3>
          <ol className="mt-6 max-w-3xl border-b border-rule">
            {HOW.map(([head, body], i) => (
              <li key={head} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-3 border-t border-rule py-6">
                <span className="text-base font-semibold text-red pt-0.5">{i + 1}</span>
                <span>
                  <span className="block text-lg font-semibold text-ink">{head}</span>
                  <span className="mt-1 block text-lg leading-relaxed text-ink-2">{body}</span>
                </span>
                <IconTile name={STEP_ICONS[i]} size="sm" />
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
            {programme ? (
              <a href="#signin" className="inline-flex items-center justify-center rounded-md bg-ink px-7 py-3.5 text-base font-medium text-paper hover:opacity-90">
                Sign in to start
              </a>
            ) : (
              <Link href={signedIn ? "/build?stories=1" : "/build"} className="inline-flex items-center justify-center rounded-md bg-ink px-7 py-3.5 text-base font-medium text-paper hover:opacity-90">
                {signedIn ? "Go to my stories" : "Start your first story"}
              </Link>
            )}
            <Link href="/guide" className="text-base text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">
              Or follow the User Guide
            </Link>
          </div>
          {!programme && !signedIn && <p className="mt-3 text-sm text-muted">Your first story is free. Just your email, no credit card.</p>}
        </HowItWorksDiagram>

        {/* 4. What you get (draft 9, John, 19 November): what the presenter takes away, not the process. */}
        <section className="border-t border-rule pt-16 mt-20 sm:mt-28">
          <p className="eyebrow">What you get</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-[2.6rem]">A compelling story designed for your audience.</h2>
          {programme && <p className="mt-3 text-ink-2">Included in your programme.</p>}
          <div className="mt-8">
            <IconTile name="download" size="xl" />
          </div>
          <div className="panel mt-10 !p-7 sm:!p-9">
            <p className="text-lg font-semibold text-ink">A compelling story designed for your audience that has:</p>
            {/* Columns, not a grid, so the list reads down in John's order. */}
            <ul className="mt-5 gap-x-10 sm:columns-2">
              {GET.map((g) => (
                <li key={g} className="mb-3 flex break-inside-avoid items-start gap-3 text-lg text-ink-2">
                  <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-red" aria-hidden="true" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {AFTER.map(([head, icon]) => (
              <div key={head} className="flex items-center gap-4 rounded-md border border-rule bg-paper-2 p-6">
                <IconTile name={icon} size="sm" />
                <span className="font-semibold text-ink">{head}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Presentation types */}
        <Section icon="grid" label="Presentation types" title="Tell StoryMachine what kind of presentation it is.">
          <p>StoryMachine helps you create the right story for any presentation.</p>
          {/* Square red tiles in a grid (Jim, 23 October): the pills looked weak. */}
          <ul className="kind-grid mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {KINDS.map(([k, icon]) => (
              <li key={k} className="flex min-h-14 items-center gap-2.5 bg-red px-3.5 py-3 text-sm font-medium leading-snug text-paper">
                <Icon name={icon} className="!h-[20px] !w-[20px] shrink-0" />
                {k}
              </li>
            ))}
          </ul>
        </Section>

        {/* 6. Make it your own. The panel at the end of the story is now "Additional suggestions from StoryMachine" (call, 16 November). */}
        <Section icon="pen" label="StoryMachine works from what you give it" title="Make it your own.">
          <p>
            StoryMachine only works from your notes, your documents and your ideas. If it needs more information,
            StoryMachine will ask you for it.
          </p>
          <p className="mt-4">
            Every story ends with a panel headed{" "}
            <span className="font-semibold text-ink">Additional suggestions from StoryMachine</span>. This is the moment for you to add what StoryMachine cannot: your examples, your
            numbers, your stories, the reason this talk matters to you. StoryMachine is not designed to do all the work for
            you; it is designed to help you do the necessary thinking that every presenter must do before they go on stage.
          </p>
          <p className="mt-4">
            Once you have done the work to make the story your own, you will get concrete advice to help you rehearse so
            that you sound authentic.
          </p>
        </Section>

        {/* 7. Your documents stay on your computer */}
        <Section icon="laptop" label="Confidential material" title="Your documents stay on your computer.">
          <p>
            Upload a Word file, PDF or PowerPoint of any size. StoryMachine reads the words, but the files never leave your
            computer. Only the words go to our servers and to the AI that helps you write your story.
          </p>
          <p className="mt-4">
            The one exception is a photo or screenshot: it goes to our servers, is read, and is then deleted. All of your information, including
            your story, is saved to your account. You can delete it at any time.
          </p>
          <p className="mt-4">
            For more details on how your information is handled, please see the{" "}
            <Link href="/guide" target="_blank" className="underline decoration-rule underline-offset-4 hover:text-ink">User Guide</Link>.
          </p>
        </Section>

        {/* 8. The method behind it */}
        <Section icon="book" label="The method behind it" title="65 years of the same method, in one tool.">
          <p>
            Between us, we have used this method for 65 years with teams at AstraZeneca, Ford, Givaudan, Gore, Grifols, JP
            Morgan, Mercer, Mott MacDonald, Nokia, Puig, Rolls-Royce, UEFA, the United Nations, Zalando and many others.{" "}
            <Link href="/about" className="underline decoration-rule underline-offset-4 hover:text-ink">Who we are</Link>
          </p>
          <p className="mt-4">
            Each part of your story has a line explaining why it is there, so you learn the method while you work with
            StoryMachine. The PDF ends with a summary of the method, that you can use for your next presentation.
          </p>
          <div className="my-8 border-l-2 border-red pl-6">
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">
              You don&apos;t have to be a superstar to speak and present well. And even the superstars had help. Steve Jobs,
              Barack Obama, Michelle Obama, Nelson Mandela, Margaret Thatcher: all of them worked with others on their words.
            </p>
          </div>
          <p className="mt-4">
            StoryMachine will guide you through the maze of information, and help you structure and articulate the good
            ideas you already have.
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

// Six steps, in the order the visitor meets them (2 November: no email step; the two stages are steps 3 and 4;
// slides and rehearsal are separate). The same on the landing page and the programme welcome pages.
const HOW: Array<[string, string]> = [
  [
    "Answer some key questions.",
    "What kind of presentation is it? What is it about? Who is your audience, and why does it matter to them? What do you want them to do as a result? What is your message, and why should they care? How long is your presentation?",
  ],
  ["Add what you have.", "Paste or type your notes. Upload any relevant documents, photos (such as of your whiteboard) and screenshots."],
  [
    "Get your story straight.",
    "StoryMachine writes the first draft: your big idea, your argument and your three acts. Read it and change any line. Ask for a sharper version, or argue with StoryMachine until it says what you mean.",
  ],
  [
    "Add interest and impact.",
    "When the storyline is right, StoryMachine adds a strong start, signposts, a clear ending, speaker notes and suggestions for more powerful language. Use them, change them or omit them as you prefer.",
  ],
  [
    "If you need them, make your slides.",
    "StoryMachine will generate a PowerPoint outline or a detailed prompt for your preferred AI tool.",
  ],
  ["Rehearse it into life.", "Practise your presentation with your speaker notes and slides."],
];

// What you get (draft 9, John): the story's parts, then slides and speaker notes.
const GET = [
  "A confident start that captures attention.",
  "A three-act story with a beginning, middle and end.",
  "Headlines and signposts as you go.",
  "A message that sticks.",
  "A clear call to action.",
  "A powerful ending.",
];

const AFTER: Array<[string, IconName]> = [
  ["An outline and AI prompt for powerful slides.", "slides"],
  ["Comprehensive speaker notes to help you practise and sound authentic.", "mic"],
];

const KINDS: Array<[string, IconName]> = [
  ["Project update", "update"],
  ["Strategy recommendation", "strategy"],
  ["Choosing between options", "options"],
  ["Sales pitch", "pitch"],
  ["Funding request", "tag"],
  ["Product launch", "upload"],
  ["Leading change", "backwards"],
  ["Team kickoff", "target"],
  ["Bad news", "badnews"],
  ["Lessons learned", "book"],
  ["Conference keynote", "mic"],
  ["Something else", "quote"],
];

const STEP_ICONS: IconName[] = ["questions", "notes", "target", "acts", "slides", "mic"];

/** Who we are: Jim's and John's bios. On /about since 2 November. */
export function WhoWeAre() {
  return (
    <>
        {/* Who we are (18 October; on its own page since 2 November). */}
        <section className="mt-20 border-t border-rule pt-16 sm:mt-28">
          <p className="eyebrow">Who we are</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-[2.6rem]">
            Two people who have spent 65 years helping others make their case.
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="panel overflow-hidden !p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/team/jim.jpg" alt="Jim Harvey" width={640} height={800} loading="lazy" className="aspect-[5/4] w-full bg-ink object-cover object-top" />
              <div className="p-7 sm:p-8">
              <p className="display text-2xl">Jim Harvey</p>
              <p className="mt-4 text-lg leading-relaxed text-ink-2">
                Jim started his first business at 26 years old and had to learn to sell as he built it. Before long, generous
                and supportive clients were asking him to help them launch products, run conferences and train their people.
                Today, after three start-up-to-sell-out adventures, over three decades, his company, The Message Business,
                works with businesses around the world in the technology, retail, consulting and finance sectors. Jim is
                co-founder and co-owner of Presentation Guru, which has published a decade of articles on speaking and
                presenting for more than 4,000 subscribers. He has published three books on presenting, charisma and
                presentation technology. He has also written jokes for television and done many gigs in London and Key West
                as a stand-up comedian.
              </p>
              <a href="https://www.themessagebusiness.com" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">
                The Message Business
              </a>
              </div>
            </div>
            <div className="panel overflow-hidden !p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/team/john.jpg" alt="John Zimmer" width={640} height={800} loading="lazy" className="aspect-[5/4] w-full bg-ink object-cover object-top" />
              <div className="p-7 sm:p-8">
              <p className="display text-2xl">John Zimmer</p>
              <p className="mt-4 text-lg leading-relaxed text-ink-2">
                John is an internationally recognised expert on public speaking and presentation skills. He gives keynotes,
                moderates events, and helps organisations around the world communicate more effectively. Before becoming a
                full-time speaker, John worked as a lawyer at one of Canada&apos;s premier law firms, the United Nations and the
                World Health Organization. A TEDx speaker and co-creator of <em>Rhetoric: The Public Speaking Game</em>, John is
                a nine-time European champion in Toastmasters contests and coach of the 2025 and 2026 World Champions of Public
                Speaking. His blog, <em>Manner of Speaking</em>, has been a leading voice on public speaking since 2009.
              </p>
              <a href="https://mannerofspeaking.org" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">
                Manner of Speaking
              </a>
              </div>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-ink-2">
            Jim and John met through a shared obsession with presentations, started{" "}
            <a href="https://www.presentation-guru.com" target="_blank" rel="noopener noreferrer" className="underline decoration-rule underline-offset-4 hover:text-ink"><em>Presentation Guru</em></a>{" "}
            together, and have worked together ever since.
          </p>
        </section>

    </>
  );
}
