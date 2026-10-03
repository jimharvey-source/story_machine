import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import { Lockup } from "@/components/Logo";
import { Icon, IconTile, type IconName } from "@/components/Icon";

// The user guide, from content/user-guide.md. Read at build time, so the page is static.
// The markdown is our own and uses a small subset: ## and ### headings, paragraphs, **bold**, *italic*,
// [links](/x), bullet and numbered lists, and one table.

export const metadata: Metadata = {
  title: "User guide | Jim Harvey's StoryMachine",
  description: "How to use Jim Harvey's StoryMachine, step by step.",
};

type Block =
  | { t: "h2" | "h3" | "p"; text: string }
  | { t: "ul" | "ol"; items: string[] }
  | { t: "table"; head: string[]; rows: string[][] };

function parse(md: string): Block[] {
  const lines = md.split("\n");
  const out: Block[] = [];
  let i = 0;
  const cells = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("### ")) { out.push({ t: "h3", text: l.slice(4) }); i++; continue; }
    if (l.startsWith("## ")) { out.push({ t: "h2", text: l.slice(3) }); i++; continue; }
    if (l.startsWith("|")) {
      const head = cells(l);
      i += 2; // skip the |---| line
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(cells(lines[i++]));
      out.push({ t: "table", head, rows });
      continue;
    }
    if (/^- /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2));
      out.push({ t: "ul", items });
      continue;
    }
    if (/^\d+\. /.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ""));
      out.push({ t: "ol", items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#|\||- |\d+\. )/.test(lines[i])) para.push(lines[i++]);
    out.push({ t: "p", text: para.join(" ") });
  }
  return out;
}

/** Inline marks: **bold**, *italic*, [text](href). */
function Inline({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) parts.push(<strong key={k++} className="font-semibold text-ink">{m[1]}</strong>);
    else if (m[2]) parts.push(<em key={k++}>{m[2]}</em>);
    else parts.push(<Link key={k++} href={m[4]} className="underline decoration-rule underline-offset-4 hover:text-ink">{m[3]}</Link>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// One icon per section of the guide, from the StoryMachine icon set.
const ICONS: Record<string, IconName> = {
  "What the StoryMachine does": "quote",
  "Before you start": "clipboard",
  "Step 1: Put in your material": "upload",
  "Step 2: Answer two questions": "questions",
  "Step 3: Choose the kind of presentation": "grid",
  "Stage 1: Get your story straight": "target",
  "Making the story yours": "pen",
  "Stage 2: Add interest and impact": "mic",
  "Downloads": "download",
  "Making the slides": "slides",
  "Before you present": "acts",
  "Your account": "key",
  "What it costs": "tag",
  "Questions": "help",
  "Help": "mail",
};
const iconFor = (heading: string): IconName => ICONS[heading] ?? "quote";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Guide() {
  const md = fs.readFileSync(path.join(process.cwd(), "content", "user-guide.md"), "utf8");
  const blocks = parse(md);
  const contents = blocks.filter((b): b is { t: "h2"; text: string } => b.t === "h2");

  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 lg:px-10">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Lockup />
        <Link
          href="/build"
          className="ml-auto inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:opacity-90"
        >
          Build your first story
        </Link>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav className="lg:sticky lg:top-8 lg:self-start" aria-label="Contents">
          <p className="eyebrow">Contents</p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {contents.map((c) => (
              <li key={c.text}>
                <a href={`#${slug(c.text)}`} className="flex items-center gap-2.5 py-0.5 text-ink-2 hover:text-ink">
                  <Icon name={iconFor(c.text)} className="!h-[18px] !w-[18px]" />
                  <span>{c.text}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="min-w-0 max-w-3xl">
          <IconTile name="book" />
          <p className="eyebrow mt-5">User guide</p>
          <h1 className="display mt-3 text-4xl leading-[1.05] sm:text-5xl">How to use the StoryMachine</h1>
          <div className="mt-10 space-y-5 text-[1.0625rem] leading-relaxed text-ink-2">
            {blocks.map((b, i) => {
              switch (b.t) {
                case "h2":
                  return (
                    <h2 key={i} id={slug(b.text)} className="display !mt-14 flex scroll-mt-8 items-center gap-4 border-t border-rule pt-10 text-2xl text-ink sm:text-3xl">
                      <IconTile name={iconFor(b.text)} />
                      <span>{b.text}</span>
                    </h2>
                  );
                case "h3":
                  return <h3 key={i} className="display !mt-10 text-xl text-ink">{b.text}</h3>;
                case "p":
                  return <p key={i}><Inline text={b.text} /></p>;
                case "ul":
                  return (
                    <ul key={i} className="list-disc space-y-2 pl-5 marker:text-muted">
                      {b.items.map((x, j) => <li key={j}><Inline text={x} /></li>)}
                    </ul>
                  );
                case "ol":
                  return (
                    <ol key={i} className="list-decimal space-y-2 pl-5 marker:font-semibold marker:text-red">
                      {b.items.map((x, j) => <li key={j}><Inline text={x} /></li>)}
                    </ol>
                  );
                case "table":
                  return (
                    <div key={i} className="overflow-x-auto rounded-md border border-rule bg-paper-2">
                      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                        <thead>
                          <tr>
                            {b.head.map((h) => (
                              <th key={h} className="border-b border-rule px-4 py-3 font-semibold text-ink">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {b.rows.map((r, j) => (
                            <tr key={j} className="align-top">
                              {r.map((c, n) => (
                                <td key={n} className={"border-t border-rule px-4 py-3 " + (n === 0 ? "font-semibold text-ink" : "")}>
                                  <Inline text={c} />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
              }
            })}
          </div>
        </article>
      </div>
    </main>
  );
}
