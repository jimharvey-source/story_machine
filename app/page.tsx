"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Landing, Story } from "@/lib/schema";
import { Editable, EditableList } from "@/components/Editable";
import { Refine, type ChatMessage } from "@/components/Refine";
import { AccountBar, Paywall, PRICES, SignIn, type Me } from "@/components/Account";
import { clearPendingProgramme, normaliseCode, readPendingProgramme, savePendingProgramme } from "@/lib/pendingProgramme";
import { StoriesPanel } from "@/components/Stories";
import { Pack } from "@/components/Pack";
import { OWN_IT_LEAD, OWN_IT_TITLE, ownItAdvice } from "@/lib/ownIt";
import { KIND_KEYS, KINDS, kindOf, type Kind } from "@/lib/kinds";

const DRAFT_KEY = "storymachine.draft";
const CURRENT_KEY = "storymachine.current";

type Register = "formal" | "business" | "conversational";
const REGISTERS: Array<{ value: Register; label: string; hint: string }> = [
  {
    value: "formal",
    label: "Formal",
    hint: "No contractions, no rhetorical questions",
  },
  {
    value: "business",
    label: "Business",
    hint: "Direct. Spoken sections may use contractions",
  },
  {
    value: "conversational",
    label: "Conversational",
    hint: "Plain, warm, short sentences",
  },
];

type Meta = {
  model: string;
  attempts: number;
  violationsBefore: number;
  violationsAfter: number;
  unresolved: string[];
};
type ActKey = "why" | "how" | "what";
const ACTS: Array<{ key: ActKey; n: string; word: string; job: string; why: string }> = [
  { key: "why", n: "Act 1", word: "Why", job: "the hook", why: "The problem, and why it matters to this audience now. Until they feel the problem, the answer is noise." },
  { key: "how", n: "Act 2", word: "How", job: "the response", why: "The insight or the answer. Only the evidence that carries the point; the rest goes in a handout." },
  { key: "what", n: "Act 3", word: "What", job: "the ask", why: "What you want them to think, feel or do next. Say it plainly, once." },
];

/** The three acts as this kind of presentation names them. The classic story keeps Why, How, What. */
function actsFor(kind: Kind): typeof ACTS {
  if (kind === "other") return ACTS;
  const k = KINDS[kind];
  const jobs = [k.act1, k.act2, k.act3];
  return ACTS.map((a, i) => ({ ...a, word: k.acts[i], job: "", why: jobs[i] }));
}

// Old stories have no kind or hero; give them the defaults so the page can show them.
function normaliseStory(s: Story): Story {
  return { ...s, kind: kindOf(s.kind), hero: s.hero ?? { who: "", wants: "", obstacle: "" } };
}

// The process explains itself as the story appears: one line under each part saying why it is there.
function Why({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 mb-2 text-xs leading-relaxed text-muted">{children}</p>;
}

const GET: string[] = [
  "A first minute that grabs their attention",
  "A rational case they can follow",
  "Headlines, soundbites and signposts they will remember",
  "An ending with a clear action",
  "Speaker notes",
  "A design brief and a prompt, so you can make the slides in the tool you already use",
];

const PACK: string[] = [
  "The story.",
  "Speaker notes.",
  "The words in full for rehearsal.",
  "A slide design brief.",
  "And a prompt for your slides if you want to use an AI tool.",
];

// For visitors, before the form: the case, what you get, how it works, what it costs. Jim's words, final.
// The method as a picture: two stages, what happens in each, and what is free against what needs a sign-in.
const STAGES = [
  {
    n: "Stage 1",
    name: "Get your story straight",
    steps: [
      ["Understand the audience", "Who is in the room, what they need to hear, what to leave out."],
      ["Set clear goals", "After my presentation, the audience will..."],
      ["Build a three-act story", "Beginning, middle and end. Why, how, what."],
    ],
    access: "Free. No sign-in.",
    detail: "Paste, answer two questions, read the story on screen. Edit any line. Three stories a day.",
    tone: "free" as const,
  },
  {
    n: "Stage 2",
    name: "Add interest and impact",
    steps: [
      ["A confident start and a definite ending", "The first minute, and an ending with a clear action."],
      ["Headlines and signposts", "The lines they will remember, and the sentences that tell them the point has arrived."],
      ["A simple set of visuals", "One idea per slide, with a brief and a prompt for the tool you use."],
      ["Rehearse it into life", "Speaker notes, and the words in full. Say it aloud before you build anything."],
    ],
    access: "Free with your first story. Sign in with your email.",
    detail: "Then the whole thing as a PDF. After the first: this story $4.99, a month $15.99, lifetime $99.",
    tone: "signin" as const,
  },
];

function Method() {
  return (
    <div>
      <p className="eyebrow">How it works</p>
      <h2 className="display mt-2 text-2xl sm:text-3xl">Do not start with the slides.</h2>
      <p className="mt-3 max-w-xl text-ink-2">
        Two stages. The first is free to anyone, with nothing to sign. The second, and the PDF of the lot, come
        with your first story when you sign in.
      </p>
      <ol className="mt-6 grid gap-4 sm:grid-cols-2">
        {STAGES.map((st) => (
          <li key={st.n} className="flex flex-col overflow-hidden rounded-md border border-rule bg-paper-2">
            <div className="flex-1 p-5">
              <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-red">{st.n}</p>
              <p className="display mt-1 text-xl">{st.name}</p>
              <ol className="mt-4 space-y-3">
                {st.steps.map(([head, sub], i) => (
                  <li key={head} className="grid grid-cols-[1.5rem_1fr] gap-2">
                    <span className="font-mono text-[0.7rem] leading-6 text-muted">{i + 1}</span>
                    <span>
                      <span className="block font-medium text-ink">{head}</span>
                      <span className="block text-sm text-ink-2">{sub}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className={"border-t p-4 " + (st.tone === "free" ? "border-rule bg-paper" : "border-ink bg-ink text-paper")}>
              <p className={"font-mono text-[0.7rem] uppercase tracking-[0.12em] " + (st.tone === "free" ? "text-red" : "text-paper/70")}>
                {st.tone === "free" ? "Free" : "Sign in"}
              </p>
              <p className="mt-1 font-medium">{st.access}</p>
              <p className={"mt-1 text-sm " + (st.tone === "free" ? "text-muted" : "text-paper/80")}>{st.detail}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 max-w-xl text-sm text-muted">
        Then, and only then, the slides. The PDF ends with the method on a page, so you can do it yourself next time.
      </p>
    </div>
  );
}

function Intro() {
  return (
    <div className="mb-12 space-y-12">
      <div>
        <h1 className="display mt-3 text-4xl leading-[1.05] sm:text-6xl">Start with the story, not with the slides.</h1>
        <p className="mt-5 max-w-xl text-lg text-ink-2">
          You have a big presentation to make. The audience is tough, and the subject is complex. After thirty years
          of helping the biggest businesses do this, my advice is: start with the story, not the slides.
        </p>
        <p className="mt-3 max-w-xl text-ink-2">
          Jim Harvey&apos;s StoryMachine<sup className="text-[0.6em]">TM</sup> takes the notes, slides and rough thinking you
          already have and builds your story for the people in front of you. You get:
        </p>
        <ul className="mt-3 max-w-xl space-y-1 text-ink-2">
          {GET.map((g) => (
            <li key={g} className="border-l-2 border-rule pl-3">
              {g}
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-xl text-lg font-medium text-ink">Try it now. No sign-in, no card. Your first story is free.</p>
      </div>

      <div>
        <p className="eyebrow">What you get</p>
        <h2 className="display mt-2 text-2xl sm:text-3xl">A detailed PDF you can use at once.</h2>
        <ul className="mt-3 max-w-xl space-y-1 text-ink-2">
          {PACK.map((g) => (
            <li key={g}>{g}</li>
          ))}
        </ul>
        <p className="mt-3 max-w-xl text-ink-2">
          All your work is saved here, so you can come back and re-edit if you change your mind.
        </p>
      </div>

      <Method />

      <div>
        <p className="eyebrow">The method in action</p>
        <h2 className="display mt-2 text-2xl sm:text-3xl">
          Paste what you have. Answer two questions. Read the story as it arrives.
        </h2>
        <p className="mt-3 max-w-xl text-ink-2">
          Each part of the speech explains what we did and why, so you see the method in action. Edit any line. Rerun
          the tool as many times as you like. Then download the lot in a single PDF.
        </p>
        <p className="mt-3 max-w-xl text-ink-2">
          We have used this method for thirty years with teams at JP Morgan, Mercer, Ford, Rolls-Royce, Givaudan,
          Puig, Grifols, AstraZeneca, Mott MacDonald and many others.
        </p>
      </div>

      <div>
        <p className="eyebrow">What it costs</p>
        <h2 className="display mt-2 text-2xl sm:text-3xl">Your first story is free.</h2>
        <p className="mt-3 max-w-xl text-ink-2">
          Stage 1, get your story straight, needs no sign-in at all: paste, answer the questions, read the story on
          screen. Stage 2, add interest and impact, and the PDF of the whole thing come free with your first story
          when you sign in with your email. No card. No password.
        </p>
      </div>
    </div>
  );
}

// After the form: the prices.
function Prices() {
  return (
    <section className="mt-14 border-t border-rule pt-10">
      <p className="eyebrow">To continue using the tool</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {(["story", "monthly", "lifetime"] as const).map((k) => (
          <div key={k} className={"rounded-md border p-4 " + (k === "lifetime" ? "border-ink" : "border-rule")}>
            <span className="eyebrow">{PRICES[k].label}</span>
            <span className="display mt-1 block text-3xl">{PRICES[k].price}</span>
            <span className="mt-2 block text-sm text-muted">{PRICES[k].note}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 max-w-xl text-sm text-muted">Launch: lifetime {PRICES.launch} for the first five hundred. Code LAUNCH49.</p>
      <p className="mt-2 max-w-xl text-sm text-muted">
        On a Message Business training programme? Your code gives you twenty stories at no charge.
      </p>
      <p className="mt-6 max-w-xl text-sm text-ink-2">
        For the method or training for you or your team:{" "}
        <a href="mailto:jim.harvey@themessagebusiness.com" className="underline decoration-rule underline-offset-4 hover:text-ink">
          jim.harvey@themessagebusiness.com
        </a>
      </p>
    </section>
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: { error?: string } & T;
  try {
    data = JSON.parse(text);
  } catch {
    if (res.status === 504)
      throw new Error(
        "That took too long and the server gave up. Try again; shorter notes finish faster.",
      );
    throw new Error(
      `The server replied with an error (${res.status}). ${text.slice(0, 120)}`,
    );
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

// Immutable deep set for dotted paths.
function setIn<T>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T;
  const [k, ...rest] = path;
  const o = obj as unknown as Record<string, unknown>;
  return { ...o, [k]: setIn(o[k], rest, value) } as unknown as T;
}

// Vercel functions accept request bodies up to 4.5 MB.

export default function Home() {
  const [notes, setNotes] = useState("");
  const [audience, setAudience] = useState("");
  const [intent, setIntent] = useState("");
  const [register, setRegister] = useState<Register>("business");
  // The kind of presentation. Empty: the StoryMachine chooses, and says so.
  const [kind, setKind] = useState<Kind | "">("");
  const [kindChosenByMachine, setKindChosenByMachine] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [landing, setLanding] = useState<Landing | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [showStories, setShowStories] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null);
  const saveTimer = useRef<number | null>(null);
  const [programme, setProgramme] = useState<string | null>(null);
  // Returning users sign in from the top of the page, without making a story first.
  const [showSignIn, setShowSignIn] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      const data = (await res.json()) as Me;
      setMe(data);
    } catch {
      setMe({ signedIn: false });
    }
  }, []);

  // Once signed in, apply a code that came in a programme link, then forget it.
  useEffect(() => {
    if (!programme || !me?.signedIn) return;
    const code = programme;
    clearPendingProgramme();
    queueMicrotask(() => setProgramme(null));
    fetch("/api/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setNotice(`Code accepted. ${data.label ?? "Your stories are on your account"}.`);
          loadMe();
        } else if (/already used/i.test(data.error ?? "")) {
          setNotice(`Programme code ${code} is already on your account.`);
        } else {
          setNotice(`Programme code ${code} did not work: ${data.error ?? "try again"}. Enter it under Programme code at the top of the page.`);
        }
      })
      .catch(() => setNotice(`Programme code ${code} could not be applied. Enter it under Programme code at the top of the page.`));
  }, [programme, me?.signedIn, loadMe]);

  // On load: restore the draft (it survives the magic-link round trip), read the account, handle Stripe's return.
  useEffect(() => {
    // Restore after hydration, so the server-rendered empty form and the client agree first.
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (typeof d.notes === "string") setNotes(d.notes);
        if (typeof d.audience === "string") setAudience(d.audience);
        if (typeof d.intent === "string") setIntent(d.intent);
        if (
          d.register === "formal" ||
          d.register === "business" ||
          d.register === "conversational"
        )
          setRegister(d.register);
        if (typeof d.kind === "string" && (KIND_KEYS as readonly string[]).includes(d.kind)) setKind(d.kind as Kind);
      } catch {
        // storage unavailable; carry on
      }
    });
    const params = new URLSearchParams(window.location.search);
    // An old programme link (?programme=XXXX) goes to the welcome page, where people sign in at the door.
    const fromProgrammeLink = params.get("programme");
    if (fromProgrammeLink) {
      savePendingProgramme(fromProgrammeLink);
      window.location.replace(`/join/${encodeURIComponent(normaliseCode(fromProgrammeLink))}`);
      return;
    }
    // Arrived from the welcome page with the code applied: nothing is left to apply.
    if (params.get("joined")) clearPendingProgramme();
    const pending = params.get("joined") ? null : readPendingProgramme();
    if (pending) queueMicrotask(() => setProgramme(pending));
    const timer = window.setTimeout(() => {
      if (params.get("checkout") === "success" && params.get("session_id")) {
        fetch("/api/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: params.get("session_id") }),
        })
          .then((r) => r.json())
          .then((d) => {
            setNotice(
              d.ok
                ? d.kind === "lifetime"
                  ? "Payment received. The StoryMachine is yours for good."
                  : d.kind === "monthly"
                    ? "Payment received. A month of stories starts now."
                    : "Payment received. Your next story is ready to start."
                : "Payment is being confirmed. Reload in a moment if it has not appeared.",
            );
            return loadMe();
          })
          .catch(() => loadMe());
      } else if (params.get("checkout") === "cancelled") {
        setNotice("Checkout cancelled. Your story is still here.");
        loadMe();
      } else if (params.get("joined")) {
        setNotice("You are in. Paste your notes below to find your first story.");
        loadMe();
      } else if (params.get("joinerror")) {
        setNotice(
          params.get("joinerror") === "throttled"
            ? "You are signed in, but too many codes failed from this connection. Wait an hour, or email jim.harvey@themessagebusiness.com."
            : "You are signed in, but your programme stories were not added. Email jim.harvey@themessagebusiness.com and we will sort it out.",
        );
        loadMe();
      } else if (params.get("signin") === "failed") {
        setNotice(
          params.get("why") === "device"
            ? "That sign-in link only works in the browser that asked for it. Send a new one from this device."
            : "That sign-in link did not work. Links expire after an hour and work once. Send a new one.",
        );
        loadMe();
      } else {
        loadMe();
      }
      // Back from a sign-in link: the story id is in the address, so this works in any browser. Otherwise the last one here.
      const fromLink = params.get("story");
      try {
        const current = fromLink ?? localStorage.getItem(CURRENT_KEY);
        if (current) openStory(current, true);
      } catch {
        if (fromLink) openStory(fromLink, true);
      }
      if (params.toString())
        window.history.replaceState({}, "", window.location.pathname);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMe]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ notes, audience, intent, register, kind }),
      );
    } catch {
      // ignore
    }
  }, [notes, audience, intent, register, kind]);

  useEffect(() => {
    try {
      if (storyId) localStorage.setItem(CURRENT_KEY, storyId);
      else localStorage.removeItem(CURRENT_KEY);
    } catch {
      // ignore
    }
  }, [storyId]);

  const signedIn = Boolean(me?.signedIn);

  // Autosave, a moment after the last change. Every story is saved; a guest's story is saved under its id.
  useEffect(() => {
    if (!story || (!signedIn && !storyId)) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const data = await postJson<{ id: string }>("/api/stories", {
          id: storyId ?? undefined,
          title: story.bigIdea.slice(0, 160),
          notes,
          audience,
          intent,
          register,
          story,
          landing,
        });
        setStoryId(data.id);
        setSaveState("saved");
      } catch {
        setSaveState("failed");
      }
    }, 1500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [signedIn, story, landing, notes, audience, intent, register, storyId]);

  function handleApiError(e: unknown, fallback: string) {
    const message = e instanceof Error ? e.message : fallback;
    if (/Sign in to use/.test(message)) {
      setError("Sign in first: the box is below the story.");
      return;
    }
    if (/free story is used/.test(message)) {
      setShowPaywall(true);
      setError(null);
      loadMe();
      return;
    }
    setError(message);
  }

  async function openStory(id: string, quiet = false) {
    try {
      const r = await fetch(`/api/stories/${id}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not open");
      const s = d as unknown as {
        id: string;
        notes: string;
        audience: string;
        intent: string;
        register: Register;
        story: Story;
        landing: Landing | null;
        unlocked?: boolean;
      };
      setNotes(s.notes);
      setAudience(s.audience);
      setIntent(s.intent);
      setRegister(s.register);
      const opened = normaliseStory(s.story);
      setStory(opened);
      if (s.story.kind) setKind(opened.kind);
      setKindChosenByMachine(false);
      setLanding(s.landing);
      setStoryId(s.id);
      setUnlocked(Boolean(s.unlocked));
      setChat([]);
      setShowStories(false);
      if (!quiet) window.scrollTo({ top: 0 });
    } catch (e) {
      if (quiet) {
        try {
          localStorage.removeItem(CURRENT_KEY);
        } catch {
          // ignore
        }
        return;
      }
      setError(e instanceof Error ? e.message : "Could not open that story");
    }
  }

  // The PDF, the same content as a Word document, or the slide text as PowerPoint. Same gate for all three.
  async function exportFile(format: "pdf" | "docx" | "pptx" = "pdf") {
    if (!story) return;
    const what = format === "pdf" ? "the PDF" : format === "docx" ? "the Word file" : "the slides";
    setBusy(`export-${format}`);
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: story.bigIdea, story, landing, storyId: storyId ?? undefined, format }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Could not make ${what}`);
      }
      setUnlocked(true);
      const blob = await res.blob();
      const name =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? `story.${format}`;
      // Keep the last file: browsers sometimes block a second automatic download,
      // so the page also shows a real link the person can click.
      if (pdf) URL.revokeObjectURL(pdf.url);
      const url = URL.createObjectURL(blob);
      setPdf({ url, name });
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      handleApiError(e, `Could not make ${what}`);
    } finally {
      setBusy(null);
    }
  }

  // Stage 1 is free for everyone, signed in or not.
  async function findStory() {
    setBusy("story");
    setError(null);
    setStory(null);
    setLanding(null);
    setChat([]);
    setSaveState("idle");
    try {
      const data = await postJson<{ id: string | null; story: Story; meta: Meta }>("/api/story", {
        notes,
        audience,
        intent,
        register,
        kind: kind || undefined,
        storyId: storyId ?? undefined,
      });
      setKindChosenByMachine(!kind);
      if (data.id) setStoryId(data.id);
      if (!storyId) setUnlocked(false);
      setStory(normaliseStory(data.story));
      setShowPaywall(false);
      loadMe();
      setMeta(data.meta);
      window.scrollTo({ top: 0 });
    } catch (e) {
      handleApiError(e, "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function makeItLand() {
    if (!story) return;
    setBusy("land");
    setError(null);
    try {
      const data = await postJson<{ landing: Landing; meta: Meta }>(
        "/api/land",
        { notes, story, register, storyId: storyId ?? undefined },
      );
      setUnlocked(true);
      setLanding(data.landing);
      setMeta(data.meta);
      loadMe();
    } catch (e) {
      handleApiError(e, "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  // The file is read here, in the browser. Only its words go into the notes; the file itself is never sent.
  async function upload(file: File) {
    setError(null);
    setUploadNote(null);
    setBusy("upload");
    try {
      const { extractFromFile } = await import("@/lib/extractText");
      const data = await extractFromFile(file.name, await file.arrayBuffer());
      setNotes(
        (prev) => (prev.trim() ? prev.trimEnd() + "\n\n" : "") + data.text,
      );
      setUploadNote(
        `Added the words from ${data.name}${data.truncated ? " (the first 60,000 characters)" : ""}. The file stays on your computer. Cut anything that is not part of the story before you go on.`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        e instanceof Error && e.name === "ExtractError"
          ? msg
          : `Could not read that file${msg ? ` (${msg})` : ""}. Save it again as .pptx, .docx or .pdf, or paste the text.`,
      );
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function applyPath(path: string, value: string | string[]) {
    const [head, ...rest] = path.split(".");
    if (head === "landing") {
      setLanding((prev) => (prev ? setIn(prev, rest, value) : prev));
    } else {
      setStory((prev) => (prev ? setIn(prev, [head, ...rest], value) : prev));
    }
  }

  // Contextual edit of one component. path is dotted: "why.headline", "landing.prologue", "how.supportingPoints".
  const edit = useCallback(
    async (path: string, current: string | string[], action: string) => {
      if (!story) return;
      setBusy(path);
      setError(null);
      try {
        const data = await postJson<{ value: string | string[] }>("/api/edit", {
          notes,
          story,
          landing: landing ?? undefined,
          register,
          path,
          current,
          action,
        });
        applyPath(path, data.value);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "That edit did not go through",
        );
      } finally {
        setBusy(null);
      }
    },
    [story, landing, notes, register],
  );

  async function refine(text: string) {
    if (!story) return;
    const next = [...chat, { role: "user" as const, content: text }];
    setChat(next);
    setBusy("refine");
    setError(null);
    try {
      const data = await postJson<{
        reply: string;
        story: Story;
        landing?: Landing;
      }>("/api/refine", {
        notes,
        story,
        landing: landing ?? undefined,
        register,
        messages: next,
      });
      setStory(normaliseStory(data.story));
      if (data.landing) setLanding(data.landing);
      setChat([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The strategist could not answer that",
      );
      setChat(chat);
    } finally {
      setBusy(null);
    }
  }

  const gaps = landing ? landing.gaps : (story?.gaps ?? []);
  const chips = (path: string, current: string | string[]) =>
    signedIn ? (a: string) => edit(path, current, a) : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:pt-16 lg:max-w-5xl lg:px-10 2xl:max-w-6xl">
      <header className={story ? "mb-10" : "mb-6"}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="eyebrow">Jim Harvey&apos;s StoryMachine</p>
          {me && !me.signedIn && (
            <button
              type="button"
              onClick={() => setShowSignIn((v) => !v)}
              aria-expanded={showSignIn}
              className="text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink"
            >
              {showSignIn ? "Close" : "Already a user? Sign in"}
            </button>
          )}
        </div>
        {me && !me.signedIn && showSignIn && (
          <div className="mt-4">
            <SignIn
              title="Welcome back"
              body="Enter the email you used before. We send you a code and a link. Your stories are waiting."
              programme={programme}
            />
          </div>
        )}
        {me && (
          <div className="mt-4">
            <AccountBar
              me={me}
              onChange={loadMe}
              onOpenStories={() => setShowStories(true)}
            />
          </div>
        )}
        {notice && (
          <p className="mt-2 rounded-md bg-red-soft px-3 py-2 text-sm text-ink">
            {notice}
          </p>
        )}
        {programme && me && !me.signedIn && (
          <p className="mt-2 rounded-md bg-red-soft px-3 py-2 text-sm text-ink">
            Your programme code <span className="font-mono tracking-[0.08em]">{programme}</span> is ready.{" "}
            <a href={`/join/${encodeURIComponent(programme)}`} className="font-medium underline decoration-ink underline-offset-4">Sign in to use it</a>.
          </p>
        )}
        {showStories && (
          <div className="mt-4">
            <StoriesPanel
              currentId={storyId}
              onOpen={openStory}
              onClose={() => setShowStories(false)}
            />
          </div>
        )}
        {!story && me && !me.signedIn && <Intro />}
      </header>

      {!story && (
        <section className="panel space-y-6">
          <div>
            <p className="eyebrow">The StoryMachine</p>
            <h1 className="display mt-2 text-3xl leading-[1.05] sm:text-4xl">What do you want to say?</h1>
            <p className="mt-3 max-w-xl text-ink-2">
              Paste your notes, a deck, a paper or the rough thinking. It does not need to be neat.
            </p>
          </div>
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={14}
              placeholder="Your notes, or the rough thinking, go here."
              className="w-full rounded-md border border-rule bg-paper-2 p-4 text-base leading-relaxed outline-none focus:border-ink"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
              >
                {busy === "upload"
                  ? "Reading the file..."
                  : "Or upload a file (PDF, Word, PowerPoint)"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.pptx,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                }}
              />
              {uploadNote && <span>{uploadNote}</span>}
            </div>
          </div>

          <label className="block text-sm">
              <span className="text-muted">
                Who is in the audience, and what matters to them? (optional)
              </span>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                rows={4}
                placeholder="Who they are, how many, what they already think, and what they care about. For example: the executive committee, eight people, sceptical about cost, who care most about the pipeline number."
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base leading-relaxed outline-none focus:border-ink"
              />
            </label>

          <fieldset className="text-sm">
            <legend className="eyebrow">What kind of presentation is it?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {KIND_KEYS.map((k) => (
                <span key={k} className="group relative">
                  <button
                    type="button"
                    onClick={() => setKind(kind === k ? "" : k)}
                    aria-pressed={kind === k}
                    aria-describedby={`kind-help-${k}`}
                    className={
                      "rounded-md border px-3 py-1.5 " +
                      (kind === k
                        ? "border-ink bg-ink text-paper"
                        : "border-rule bg-paper-2 text-ink-2 hover:border-ink")
                    }
                  >
                    {KINDS[k].label}
                  </button>
                  {/* Hover or keyboard focus: what this kind helps you do. Touch screens see it under the buttons once chosen. */}
                  <span
                    id={`kind-help-${k}`}
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-64 rounded-md bg-ink px-3 py-2 text-xs leading-snug text-paper shadow-lg group-hover:block group-focus-within:block"
                  >
                    {KINDS[k].helps}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {kind ? KINDS[kind].helps : "Not sure? Leave it, and the StoryMachine will choose from your notes."}
            </p>
          </fieldset>

          <label className="block text-sm">
              <span className="text-muted">
                After I sit down, I want them to know, understand, do… (optional)
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Good presenters explain, engage, inspire, influence, support change, clarify, reassure or motivate. Which is yours?
              </span>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                rows={4}
                placeholder="What they should know, understand or do when you have finished. For example: understand why the process needs more structure, and approve the pilot budget."
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base leading-relaxed outline-none focus:border-ink"
              />
            </label>

          <fieldset className="text-sm">
            <p className="mb-3 max-w-xl text-sm text-ink-2">
              What is the tone of voice that you want for the presentation? Formal (senior executives, government
              officials, court cases)? Business (internal and external presentations and speeches to professional
              colleagues, clients, customers and stakeholders)? Conversational (presentations to friends, peers and
              colleagues in a friendly manner)?
            </p>
            <legend className="eyebrow">Tone</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGISTERS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRegister(r.value)}
                  title={r.hint}
                  className={
                    "rounded-md border px-3 py-1.5 " +
                    (register === r.value
                      ? "border-ink bg-ink text-paper"
                      : "border-rule bg-paper-2 text-ink-2 hover:border-ink")
                  }
                >
                  {r.label}
                </button>
              ))}
            </div>
          </fieldset>

          {storyId && (
            <p className="text-sm text-muted">
              Reworking the notes of a saved story. Finding it again is free.{" "}
              <button
                type="button"
                onClick={() => setStoryId(null)}
                className="underline decoration-rule underline-offset-4 hover:text-ink"
              >
                Start a new story instead
              </button>
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={findStory}
              disabled={busy !== null || notes.trim().length < 40}
              className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
            >
              {busy === "story" ? "Finding your story..." : storyId ? "Find my story again" : "Find my story"}
            </button>
            {busy === "story" && (
              <span className="text-sm text-muted">
                Usually twenty to forty seconds.
              </span>
            )}
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
        </section>
      )}

      {!story && <Prices />}

      {story && (
        <article className="panel rise space-y-14">
          <ol className="flex flex-wrap gap-x-6 gap-y-1 font-mono text-[0.7rem] uppercase tracking-[0.12em]">
            <li className="text-ink">
              <span className="text-red">1</span> Get your story straight <span className="text-red">&#10003;</span>
            </li>
            <li className={landing ? "text-ink" : "text-muted"}>
              <span className="text-red">2</span> Add interest and impact {landing && <span className="text-red">&#10003;</span>}
            </li>
          </ol>
          <section>
            <p className="eyebrow">Big Idea</p>
            <Why>The whole argument in one line people can repeat in the corridor. If they remember nothing else, they remember this.</Why>
            <Editable
              as="h2"
              value={story.bigIdea}
              busy={busy === "bigIdea"}
              onChange={(v) => applyPath("bigIdea", v)}
              onAction={chips("bigIdea", story.bigIdea)}
              className="display mt-3 text-4xl leading-[1.08] sm:text-5xl"
              label="Big Idea"
            />
            <p className="mt-4 text-sm text-muted">
              <span className="eyebrow mr-2">Structure</span>
              {KINDS[story.kind].label}: {KINDS[story.kind].line}
              {kindChosenByMachine && (
                <> The StoryMachine chose this from your notes. To use another, choose Rework the notes, pick the kind and find your story again.</>
              )}
            </p>
          </section>

          <section className="grid gap-8 border-t border-rule pt-8 sm:grid-cols-2">
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Audience</p>
                <Why>Every story starts with who is listening. A message for everyone lands with no one.</Why>
                <Editable
                  value={story.audience.who}
                  onChange={(v) => applyPath("audience.who", v)}
                  className="mt-1 font-medium"
                />
              </div>
              <div>
                <p className="eyebrow">They need to hear</p>
                <Editable
                  value={story.audience.needToHear}
                  onChange={(v) => applyPath("audience.needToHear", v)}
                  className="mt-1 text-ink-2"
                />
              </div>
              <div>
                <p className="eyebrow">Leave out</p>
                <Editable
                  value={story.audience.doNotNeedToHear}
                  onChange={(v) => applyPath("audience.doNotNeedToHear", v)}
                  className="mt-1 text-ink-2"
                />
              </div>
              {story.hero.who && (
                <div>
                  <p className="eyebrow">The hero</p>
                  <Why>The audience is the hero. You are the faithful friend who believes in them and tells them the truth.</Why>
                  <Editable
                    value={story.hero.who}
                    onChange={(v) => applyPath("hero.who", v)}
                    className="mt-1 font-medium"
                  />
                  <p className="eyebrow mt-3">What they want</p>
                  <Editable
                    value={story.hero.wants}
                    onChange={(v) => applyPath("hero.wants", v)}
                    className="mt-1 text-ink-2"
                  />
                  <p className="eyebrow mt-3">What stands in the way</p>
                  <Editable
                    value={story.hero.obstacle}
                    onChange={(v) => applyPath("hero.obstacle", v)}
                    className="mt-1 text-ink-2"
                  />
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <p className="eyebrow">Statement of intent</p>
                <Why>After my presentation, the audience will... If this sentence will not finish, the presentation is not ready.</Why>
                <Editable
                  value={story.intent}
                  busy={busy === "intent"}
                  onChange={(v) => applyPath("intent", v)}
                  onAction={chips("intent", story.intent)}
                  actions={["sharper", "simpler", "another"]}
                  className="mt-1"
                />
              </div>
              <div>
                <p className="eyebrow">The argument</p>
                <Why>Your case in one sentence a sceptic could test. Everything in the three acts has to serve it.</Why>
                <Editable
                  value={story.argument}
                  busy={busy === "argument"}
                  onChange={(v) => applyPath("argument", v)}
                  onAction={chips("argument", story.argument)}
                  actions={["sharper", "simpler", "clearer", "another"]}
                  className="mt-1"
                />
              </div>
            </div>
          </section>

          {landing && (
            <section className="border-t border-rule pt-8">
              <p className="eyebrow">
                Prologue &middot; spoken &middot; the golden minute
              </p>
              <Why>The first minute earns the rest. It states the Big Idea, says why now, and tells the room what you need from them.</Why>
              <div className="mt-4">
                <Editable
                  value={landing.prologue}
                  busy={busy === "landing.prologue"}
                  onChange={(v) => applyPath("landing.prologue", v)}
                  onAction={chips("landing.prologue", landing.prologue)}
                  className="spoken"
                  label="Prologue"
                />
              </div>
            </section>
          )}

          {actsFor(story.kind).map(({ key, n, word, job, why }) => {
            const act = story[key];
            const land = landing?.[key];
            return (
              <section
                key={key}
                className="border-t border-rule pt-8 sm:grid sm:grid-cols-[5.5rem_1fr] sm:gap-6"
              >
                <div className="mb-3 sm:mb-0">
                  <p className="eyebrow">{n}</p>
                  <p className={"display mt-1 text-red " + (word.length > 5 ? "text-lg leading-tight" : "text-3xl")}>{word}</p>
                  {job && <p className="mt-1 text-xs text-muted">{job}</p>}
                  <p className="mt-2 hidden text-xs leading-relaxed text-muted sm:block">{why}</p>
                </div>
                <div className="space-y-5">
                  <Editable
                    as="h2"
                    value={act.headline}
                    busy={busy === `${key}.headline`}
                    onChange={(v) => applyPath(`${key}.headline`, v)}
                    onAction={chips(`${key}.headline`, act.headline)}
                    className="display text-2xl leading-snug sm:text-[1.75rem]"
                    label={`${n} headline`}
                  />
                  <Editable
                    value={act.coreMessage}
                    busy={busy === `${key}.coreMessage`}
                    onChange={(v) => applyPath(`${key}.coreMessage`, v)}
                    onAction={chips(`${key}.coreMessage`, act.coreMessage)}
                    actions={[
                      "sharper",
                      "simpler",
                      "clearer",
                      "senior",
                      "another",
                    ]}
                    className="text-lg"
                  />
                  <div
                    className={
                      "border-l-2 pl-4 " +
                      (act.soundbite.source === "material"
                        ? "border-red"
                        : "border-rule")
                    }
                  >
                    <p className="eyebrow" title="A line worth quoting. From your notes when one is there; proposed when not, and marked so you find your own.">
                      Soundbite &middot;{" "}
                      {act.soundbite.source === "material" ? (
                        <span className="text-red">from your notes</span>
                      ) : (
                        "proposed, find your own"
                      )}
                    </p>
                    <Editable
                      value={act.soundbite.text}
                      busy={busy === `${key}.soundbite.text`}
                      onChange={(v) => applyPath(`${key}.soundbite.text`, v)}
                      onAction={chips(
                        `${key}.soundbite.text`,
                        act.soundbite.text,
                      )}
                      actions={["sharper", "memorable", "another"]}
                      className="display mt-1 text-xl"
                    />
                  </div>
                  <EditableList
                    items={act.supportingPoints}
                    busy={busy === `${key}.supportingPoints`}
                    onChange={(items) =>
                      applyPath(`${key}.supportingPoints`, items)
                    }
                    onAction={chips(
                      `${key}.supportingPoints`,
                      act.supportingPoints,
                    )}
                  />
                  {land && (
                    <div className="grid gap-5 rounded-md bg-paper-2 p-5 sm:grid-cols-2">
                      <div>
                        <p className="eyebrow">Signpost &middot; spoken</p>
                        <Why>One spoken sentence that tells the room the important idea has arrived.</Why>
                        <div className="mt-2">
                          <Editable
                            value={land.signpost}
                            busy={busy === `landing.${key}.signpost`}
                            onChange={(v) =>
                              applyPath(`landing.${key}.signpost`, v)
                            }
                            onAction={chips(
                              `landing.${key}.signpost`,
                              land.signpost,
                            )}
                            actions={["sharper", "memorable", "another"]}
                            className="spoken text-base"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="eyebrow">Slide idea</p>
                        <Why>One slide, one idea. It illustrates; your words explain.</Why>
                        <Editable
                          value={land.visualIdea}
                          busy={busy === `landing.${key}.visualIdea`}
                          onChange={(v) =>
                            applyPath(`landing.${key}.visualIdea`, v)
                          }
                          onAction={chips(
                            `landing.${key}.visualIdea`,
                            land.visualIdea,
                          )}
                          actions={["simpler", "another"]}
                          className="mt-2 text-sm text-ink-2"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {landing && (
            <>
              <section className="border-t border-rule pt-8">
                <p className="eyebrow">
                  Epilogue &middot; spoken &middot; end with certainty
                </p>
                <Why>Audiences need certainty. End by recapping your headlines and the actions from here. Send them away with the message ringing in their ears.</Why>
                <div className="mt-4">
                  <Editable
                    value={landing.epilogue}
                    busy={busy === "landing.epilogue"}
                    onChange={(v) => applyPath("landing.epilogue", v)}
                    onAction={chips("landing.epilogue", landing.epilogue)}
                    className="spoken"
                    label="Epilogue"
                  />
                </div>
              </section>
              <section className="rounded-md border border-rule bg-paper-2 p-6 sm:p-8">
                <p className="eyebrow">The story in five lines</p>
                <Why>The whole talk in thirty seconds. If it works here, it works in the room.</Why>
                <ol className="mt-4 space-y-3">
                  {(
                    ["prologue", "why", "how", "what", "epilogue"] as const
                  ).map((k) => (
                    <li key={k} className="grid grid-cols-[5rem_1fr] gap-3">
                      <span className="eyebrow pt-1.5">
                        {k === "why" || k === "how" || k === "what"
                          ? KINDS[story.kind].acts[["why", "how", "what"].indexOf(k)]
                          : k}
                      </span>
                      <Editable
                        value={landing.fiveLineStory[k]}
                        onChange={(v) =>
                          applyPath(`landing.fiveLineStory.${k}`, v)
                        }
                        className="display text-lg"
                      />
                    </li>
                  ))}
                </ol>
              </section>
              <Pack story={story} landing={landing} />
            </>
          )}

          {story && (
            <section className="rounded-md border border-red bg-red-soft px-5 py-6 sm:px-7">
              <p className="eyebrow text-red">{OWN_IT_TITLE}</p>
              <p className="mt-2 font-display text-xl leading-snug text-ink">{OWN_IT_LEAD}</p>
              <ul className="mt-4 space-y-3 text-ink-2">
                {[...gaps, ...ownItAdvice(story, landing)].map((g, i) => (
                  <li key={i} className="border-l-2 border-red pl-4">
                    {g}
                  </li>
                ))}
              </ul>
              <Why>The machine never invents. Where your notes were silent, it asks.</Why>
            </section>
          )}

          {!signedIn && (
            <section className="border-t border-rule pt-8">
              <SignIn
                next={`/?${new URLSearchParams({ ...(me?.guestId ? { claim: me.guestId } : {}), ...(storyId ? { story: storyId } : {}), ...(programme ? { programme } : {}) }).toString()}`}
                programme={programme}
                title={landing ? "Sign in to download the PDF" : "Stage 2 and the PDF are free with your first story"}
                body="Stage 2 adds interest and impact: the first minute, signposts, slide ideas, the ending, speaker notes and a slide brief. Then the whole thing as a PDF. Sign in with your email and we send you a link. No card. No password. Your story is waiting when you come back."
              />
            </section>
          )}

          {signedIn && showPaywall && (
            <Paywall me={me!} onChange={() => { loadMe(); setShowPaywall(false); }} />
          )}

          <section className="flex flex-wrap items-center gap-4 border-t border-rule pt-8">
            {!landing && signedIn && (
              <button
                onClick={makeItLand}
                disabled={busy !== null}
                className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
              >
                {busy === "land"
                  ? "Adding interest and impact..."
                  : "Stage 2: add interest and impact"}
              </button>
            )}
            {signedIn && (
              <button
                type="button"
                onClick={() => exportFile("pdf")}
                disabled={busy !== null}
                className="rounded-md border border-ink bg-paper-2 px-5 py-3 text-base font-medium text-ink disabled:opacity-40"
              >
                {busy === "export-pdf" ? "Making the PDF..." : landing ? "Download the PDF (stages 1 and 2)" : "Download the PDF (stage 1 so far)"}
              </button>
            )}
            {signedIn && (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <button
                  type="button"
                  onClick={() => exportFile("docx")}
                  disabled={busy !== null}
                  className="underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
                >
                  {busy === "export-docx" ? "Making the Word file..." : "Word"}
                </button>
                {landing && (
                  <button
                    type="button"
                    onClick={() => exportFile("pptx")}
                    disabled={busy !== null}
                    title="The slide words in title placeholders and the picture briefs in content placeholders, with the speech notes. Apply your company template in PowerPoint."
                    className="underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
                  >
                    {busy === "export-pptx" ? "Making the slides..." : "Slides for PowerPoint"}
                  </button>
                )}
              </span>
            )}
            {signedIn && !unlocked && me && !me.unlimited && (
              <span className="w-full text-sm text-muted">
                {(me.storiesLeft ?? 0) > 0
                  ? "Stage 2 and the PDF use your free story."
                  : "Stage 2 and the PDF need a story, a month or lifetime."}
              </span>
            )}
            {pdf && !busy?.startsWith("export") && (
              <a
                href={pdf.url}
                download={pdf.name}
                className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
              >
                Nothing downloaded? Save {pdf.name}
              </a>
            )}
            {saveState !== "idle" && (
              <span className="font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted">
                {saveState === "saving"
                  ? "Saving"
                  : saveState === "saved"
                    ? "Saved"
                    : "Not saved"}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setStory(null);
                setLanding(null);
                setMeta(null);
                setChat([]);
                setSaveState("idle");
                window.scrollTo({ top: 0 });
              }}
              className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
            >
              Rework the notes
            </button>
            <button
              type="button"
              onClick={() => {
                setStory(null);
                setLanding(null);
                setMeta(null);
                setChat([]);
                setStoryId(null);
                setUnlocked(false);
                setSaveState("idle");
                setNotes("");
                setAudience("");
                setIntent("");
                setKind("");
                setUploadNote(null);
                window.scrollTo({ top: 0 });
              }}
              className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
            >
              Start a new story
            </button>
            {error && <p className="w-full text-sm text-red">{error}</p>}
          </section>

          {signedIn && (
            <Refine messages={chat} busy={busy === "refine"} onSend={refine} />
          )}

          {meta && (
            <p className="font-mono text-[0.68rem] text-muted">
              {meta.model} &middot; {meta.attempts} attempt
              {meta.attempts > 1 ? "s" : ""} &middot; voice checks{" "}
              {meta.violationsBefore} before, {meta.violationsAfter} after
              {meta.unresolved.length ? ` (${meta.unresolved.join("; ")})` : ""}
            </p>
          )}
        </article>
      )}
    </main>
  );
}
