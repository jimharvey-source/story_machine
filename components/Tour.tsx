import Link from "next/link";
import { Icon, IconTile, type IconName } from "@/components/Icon";

// The case for the StoryMachine, from the problem to the method. Shared by the landing page and the
// programme welcome pages. With `programme`, nothing mentions money: the stories are already paid for.
// Copy: claude/storymachine-landing-page.md. Lines in quotation marks there are Jim's, word for word.

export function Tour({ programme = false }: { programme?: boolean }) {
  return (
    <>
        {/* 1b. Who we are (18 October): the "we" behind "our advice" and "65 years between us". */}
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
                Jim started his first business 35 years ago and had to learn to sell as he built it. Before long, clients
                were asking him to help them launch products, run conferences and train their people. Today his company, The
                Message Business, works with teams at JP Morgan, Mercer, Ford, Rolls-Royce and many others in technology,
                retail, consulting and finance. He has also written for television, done hundreds of gigs as a stand-up
                comedian, and hosts conferences as a core part of his work.
              </p>
              <a href="https://www.themessagebusiness.com" className="mt-4 inline-block text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">
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
                John is a lawyer who found public speaking and never looked back. He is a nine-time European Toastmasters
                champion and a TEDx speaker. He teaches presentation skills on Executive MBA programmes in Geneva, Lausanne
                and Barcelona. His blog, <em>Manner of Speaking</em>, has been one of the leading voices on public speaking
                since 2009.
              </p>
              <a href="https://mannerofspeaking.org/the-face-behind-the-blog/" className="mt-4 inline-block text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">
                Manner of Speaking
              </a>
              </div>
            </div>
          </div>
          <p className="mt-8 max-w-3xl text-lg leading-relaxed text-ink-2">
            They met through a shared obsession with presentations, started{" "}
            <a href="https://www.presentation-guru.com" className="underline decoration-rule underline-offset-4 hover:text-ink"><em>Presentation Guru</em></a>{" "}
            together, and have worked side by side ever since.
          </p>
        </section>

        {/* 2. The problem */}
        <Section icon="backwards" label="The problem" title="Most presentations are built backwards.">
          <p>
            People start with PowerPoint. They gather old slides, add new ones, and hope that somehow, a coherent
            presentation will emerge. The audience leaves with plenty of information, often too much information, but
            no clear message.
          </p>
          <div className="my-8 border-l-2 border-red pl-6">
            <p className="said text-2xl leading-snug text-ink sm:text-[1.7rem]">
              In most poor presentations, the story is the problem. But after the presentation, the presenter gets the
              blame. It&apos;s unfair, and it&apos;s easy to fix.
            </p>
          </div>
          <p>
            StoryMachine helps you build stronger stories. Stronger stories mean more confident presenters and more engaged
            audiences. More engaged audiences mean better results.
          </p>
        </Section>

        {/* 3. How it works */}
        <Section icon="acts" label="How it works" title="Five steps. About 20 minutes.">
          <ol className="mt-2 border-b border-rule">
            {(programme ? HOW_PROGRAMME : HOW).map(([head, body], i) => (
              <li key={head} className="grid grid-cols-[1.5rem_1fr_auto] items-start gap-3 border-t border-rule py-6">
                <span className="text-base font-semibold text-red pt-0.5">{i + 1}</span>
                <span>
                  <span className="block text-lg font-semibold text-ink">{head}</span>
                  <span className="mt-1 block text-ink-2">{body}</span>
                </span>
                <IconTile name={(programme ? STEP_ICONS_PROGRAMME : STEP_ICONS)[i]} size="sm" />
              </li>
            ))}
          </ol>
        </Section>

        {/* 4. What you get */}
        <section className="border-t border-rule pt-16 mt-20 sm:mt-28">
          <p className="eyebrow">What you get</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-[2.6rem]">A compelling story that you can take to your audience.</h2>
          <div className="mt-8">
            <IconTile name="download" size="xl" />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {STAGES.map((st) => (
              <div key={st.n} className="panel flex flex-col !p-7 sm:!p-9">
                <IconTile name={st.icon} />
                <p className="tag mt-5 text-red">{st.n}</p>
                <p className="display mt-1 text-2xl">{st.name}</p>
                <p className="mt-1 text-ink-2">{st.sub}</p>
                <p className="mt-1 text-sm text-muted">{programme ? "Included in your 20 stories." : st.access}</p>
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
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            {AFTER.map(([tag, head, sub, icon]) => (
              <div key={head} className="flex items-start gap-4 rounded-md border border-rule bg-paper-2 p-6">
                <IconTile name={icon} size="sm" />
                <span>
                  <span className="tag block text-red">{tag}</span>
                  <span className="mt-1 block font-semibold text-ink">{head}</span>
                  <span className="block text-ink-2">{sub}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Presentation types */}
        <Section icon="grid" label="Presentation types" title="Tell StoryMachine what kind of presentation it is.">
          <p>
            A project update, a strategy recommendation, a sales pitch, choosing between options, a training session, a
            conference keynote, a scientific presentation, bad news, or something else. StoryMachine helps you create the
            right story for any presentation.
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
        <Section icon="pen" label="StoryMachine works from what you give it" title="Make it your own.">
          <p>
            StoryMachine only works from your notes, your documents and your ideas. If it needs more information,
            StoryMachine will ask you questions. Every story ends with a panel headed{" "}
            <span className="font-semibold text-ink">Make it your own</span>. Here, you add the example, the number, the
            reason it matters to you. And you get advice before you rehearse. Audiences believe speakers who sound like
            themselves.
          </p>
        </Section>

        {/* 7. Your documents stay on your computer */}
        <Section icon="laptop" label="Confidential material" title="Your documents stay on your computer.">
          <p>
            Upload a Word file, PDF or PowerPoint of any size. StoryMachine reads the words, but the files never leave your
            computer. Only the words go to our servers and to the AI that helps you write your story. Your story is saved
            to your account. You can delete it, and all related material, at any time. A photo or screenshot is
            different: it goes to our servers and the AI to be read, and it is not kept.
          </p>
          <p className="mt-4">
            For more details on how your information is handled, please see the{" "}
            <Link href="/guide" className="underline decoration-rule underline-offset-4 hover:text-ink">User Guide</Link>.
          </p>
        </Section>

        {/* 8. The method behind it */}
        <Section icon="book" label="The method behind it" title="65 years of the same method, in one tool.">
          <p>
            Between us, we have used this method for 65 years with teams at AstraZeneca, Ford, Givaudan, Gore, Grifols, JP
            Morgan, Mercer, Mott MacDonald, Nokia, Puig, Rolls-Royce, UEFA, the United Nations, Zalando and many others.
          </p>
          <p className="mt-4">
            Each part of your story has a line explaining why it is there, so you learn the method while you work with
            StoryMachine. The PDF ends with a summary of the method, so you can do it yourself next time.
          </p>
          <p className="said mt-8 text-2xl leading-snug text-ink sm:text-[1.7rem]">
            You don&apos;t have to be a superstar to speak and present well. Steve Jobs, Barack Obama, Nelson Mandela,
            Mahatma Gandhi, all of the greats had speechwriters to help them.
          </p>
          <p className="mt-4">
            StoryMachine will guide you through the maze of information and help you structure and articulate the good
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

// Five steps, in the order the public visitor meets them (John Zimmer's working draft 4, 18 October).
const HOW: Array<[string, string]> = [
  [
    "Answer some key questions.",
    "What kind of presentation is it? Who is your audience, and what do they think about the subject? What do you want them to do when you finish? What is your message, and why should they care?",
  ],
  [
    "Add what you have.",
    "Paste or type your notes. Upload any relevant documents. Your files stay on your computer; StoryMachine only reads the words.",
  ],
  [
    "Enter your email.",
    "We will send you a six-digit code. Type it on the page. No credit card required. Your first story is free.",
  ],
  [
    "Read and revise your story.",
    "Edit any line, ask for a sharper version, or argue with StoryMachine until it says what you mean. When you are satisfied, download it as a PDF or Word file.",
  ],
  [
    "Add slides, then rehearse.",
    "If you need slides, StoryMachine can produce a PowerPoint outline, or give you a detailed prompt for your slides to use in your AI tool of choice. Then rehearse from your speaker notes.",
  ],
];

// On a programme welcome page the person signs in at the top first.
const HOW_PROGRAMME: Array<[string, string]> = [
  ["Sign in at the top of this page.", "Your work email and the six-digit code we send you."],
  HOW[0],
  HOW[1],
  HOW[3],
  HOW[4],
];

const STAGES = [
  {
    n: "Stage 1",
    icon: "target" as IconName,
    name: "Get your story straight",
    sub: "The essential elements that form the backbone of your story.",
    access: "Free with your first story.",
    steps: [
      ["Understand the audience", "Who is in the room, what they need to hear, what to leave out."],
      ["Set a clear goal", "After my presentation, the audience will..."],
      ["Build a three-act story", "Beginning, middle, end."],
    ],
  },
  {
    n: "Stage 2",
    icon: "mic" as IconName,
    name: "Add interest and impact",
    sub: "Refine and reinforce your story.",
    access: "Follows straight on, in the same run.",
    steps: [
      ["A confident start and a powerful ending", "The first minute, and a conclusion with a clear call to action."],
      ["Headlines and signposts", "The lines the audience will remember, and the sentences that drive home the key points."],
    ],
  },
];

// After the two stages: story, slides, rehearsal (Jim, 21 October).
const AFTER: Array<[string, string, string, IconName]> = [
  ["Then, if you need them", "The outline for powerful visuals", "One idea per slide, with a brief and a prompt for your own AI tool.", "slides"],
  ["Finally", "Rehearse it into life", "Speaker notes, and the words in full. Say it aloud, with your slides, before you present.", "acts"],
];

const KINDS: Array<[string, IconName]> = [
  ["Project update", "update"],
  ["Strategy recommendation", "strategy"],
  ["Sales pitch", "pitch"],
  ["Choosing between options", "options"],
  ["Training session", "training"],
  ["Conference keynote", "mic"],
  ["Scientific presentation", "science"],
  ["Bad news", "badnews"],
  ["Something else", "quote"],
];

const STEP_ICONS: IconName[] = ["questions", "notes", "mail", "acts", "slides"];
const STEP_ICONS_PROGRAMME: IconName[] = ["mail", "questions", "notes", "acts", "slides"];
