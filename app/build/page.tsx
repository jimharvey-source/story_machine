"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Landing, Question, Rhetoric, Story } from "@/lib/schema";
import { RHETORIC_LEAD, RHETORIC_TITLE, hasRhetoric } from "@/lib/rhetoric";
import { Editable, EditableList } from "@/components/Editable";
import { Refine, type ChatMessage } from "@/components/Refine";
import { AccountBar, Paywall, SignIn, type Me } from "@/components/Account";
import { clearPendingProgramme, normaliseCode, readPendingProgramme, savePendingProgramme } from "@/lib/pendingProgramme";
import { StoriesPanel } from "@/components/Stories";
import { Lockup } from "@/components/Logo";
import { OWN_IT_LEAD, OWN_IT_TITLE, ownItAdvice } from "@/lib/ownIt";
import { KIND_KEYS, KINDS, kindOf, type Kind } from "@/lib/kinds";
import Progress from "@/components/Progress";
import { BLANK_KEYS, KEY_QUESTIONS, composeAnswers, minutesFrom, splitAnswers } from "@/lib/keyQuestions";
import { Rehearse, Slides } from "@/components/Pack";
import { RhetoricNotes } from "@/components/RhetoricNotes";

const DRAFT_KEY = "storymachine.draft";
const CURRENT_KEY = "storymachine.current";
// Set when a signed-out visitor presses Find my story: after sign-in the page carries straight on.
const AUTOSTART_KEY = "storymachine.autostart";
// The free story's allowance, shown on the page. Must match FREE_CAPS in lib/access.ts.
const FREE_CAPS = { rerun: 1, edit: 5 } as const;
type AiUsage = Partial<Record<"rerun" | "edit" | "land" | "rhetoric", number>>;

type Register = "formal" | "business" | "conversational";
const REGISTERS: Array<{ value: Register; label: string; hint: string }> = [
  { value: "formal", label: "Formal", hint: "Senior executives and government representatives. Measured and precise." },
  { value: "business", label: "Business", hint: "Colleagues, clients and stakeholders. Clear and direct." },
  { value: "conversational", label: "Conversational", hint: "Peers and friends. Warm and relaxed." },
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
  { key: "why", n: "Act 1", word: "Why", job: "the hook", why: "The issue, and why it matters to this audience now. Until they feel it, the answer is just noise." },
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

/** A numbered step on the form: the number, the step's name, one line on what to do. */
function StepHead({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red text-sm font-semibold text-paper">{n}</span>
      <div>
        <h2 className="display text-xl sm:text-2xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">{sub}</p>
      </div>
    </div>
  );
}

/** A section of the finished story, numbered as in the PDF (21 October). */
function SectionHead({ n, title, intro }: { n: number; title: string; intro: string }) {
  return (
    <div className="border-t-2 border-ink pt-6">
      <p className="text-sm font-semibold text-red">Section {n}</p>
      <h2 className="display mt-1 text-3xl leading-tight sm:text-4xl">{title}</h2>
      <span className="mt-3 block h-[3px] w-10 bg-red" aria-hidden="true" />
      <p className="mt-4 max-w-2xl text-ink-2">{intro}</p>
    </div>
  );
}

/** A heading inside a section, with one line on what the part is for. */
function SubHead({ title, about }: { title: string; about?: string }) {
  return (
    <div className="mb-4">
      <h3 className="display text-xl">{title}</h3>
      {about && <p className="mt-1 max-w-3xl text-sm text-muted">{about}</p>}
    </div>
  );
}

/** A part of the presentation: Prologue, an act, the Epilogue. The id is a target for the speech structure links. */
function Part({ id, title, about, children }: { id: string; title: string; about: string; children: React.ReactNode }) {
  return (
    <div id={id} className="scroll-mt-20 space-y-5 border-t border-rule pt-8">
      <div>
        <h3 className="display text-2xl">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm text-muted">{about}</p>
      </div>
      {children}
    </div>
  );
}

/** Label on the left, words on the right, as in the PDF's audience analysis. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <p className="pt-1 text-sm font-semibold text-muted">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-xs font-semibold text-muted">{children}</p>;
}

// The process explains itself as the story appears: one line under each part saying why it is there.
function Why({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 mb-2 text-xs leading-relaxed text-muted">{children}</p>;
}

/** Whether the Epilogue still says the Big Idea. If the Big Idea was changed after Stage 2, it will not. */
function endsOnBigIdea(epilogue: string, bigIdea: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
  const big = norm(bigIdea);
  return !big || norm(epilogue).includes(big);
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
  if (!res.ok) {
    const err = new Error(data.error || "Something went wrong") as Error & { code?: string };
    err.code = (data as { code?: string }).code;
    throw err;
  }
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

export default function Build() {
  const [notes, setNotes] = useState("");
  // The key questions (lib/keyQuestions.ts). They travel as the audience and intent fields.
  const [keys, setKeys] = useState<string[]>(BLANK_KEYS);
  const { audience, intent } = composeAnswers(keys);
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
  const signInBoxRef = useRef<HTMLDivElement>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [showStories, setShowStories] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  // A free story is capped: one rerun and five AI edits (lib/access.ts). Counted on the server; shown here.
  const [capped, setCapped] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsage>({});
  // Ask back: up to three questions between pressing the button and the story.
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [rhetoric, setRhetoric] = useState<Rhetoric | null>(null);
  // The finished story, or the slides made from it (18 October: the slides come last, on a view of their own).
  const [view, setView] = useState<"story" | "slides">("story");
  // A capped story that has used an allowance: the message, with an Upgrade button beside it.
  const [capNotice, setCapNotice] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  // The Upgrade button in the account bar opens the prices under the bar, with or without a story on the page.
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [pdf, setPdf] = useState<{ url: string; name: string } | null>(null);
  const saveTimer = useRef<number | null>(null);
  const [programme, setProgramme] = useState<string | null>(null);
  // Returning users sign in from the top of the page, without making a story first.
  const [showSignIn, setShowSignIn] = useState(false);
  // Opened by Find my story rather than by "Already a user?": a new visitor, so the box speaks to them.
  const [signInForStory, setSignInForStory] = useState(false);
  // The landing page's "Sign in" link arrives as /build#signin: open the sign-in box.
  useEffect(() => {
    if (window.location.hash !== "#signin") return;
    const t = setTimeout(() => setShowSignIn(true), 0);
    return () => clearTimeout(t);
  }, []);

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

  // Back from signing in after pressing Find my story: carry straight on with the draft they left.
  const autostarted = useRef(false);
  const startRef = useRef<((justSignedIn?: boolean) => void) | null>(null);
  // The draft is restored from the browser once, on load. Until then, saving it would wipe it (13 October:
  // Jim signed in after pasting his notes, the page reloaded, and the empty form overwrote the saved draft).
  const draftRestored = useRef(false);

  // Signed in by code from the box at the top: stay on the page, keep everything typed, and carry on.
  async function onSignedIn() {
    try {
      localStorage.removeItem(AUTOSTART_KEY);
    } catch {
      // ignore
    }
    autostarted.current = true;
    const wasForStory = signInForStory;
    setShowSignIn(false);
    setSignInForStory(false);
    await loadMe();
    if (wasForStory) startRef.current?.(true);
  }
  useEffect(() => {
    if (!me?.signedIn || autostarted.current) return;
    let pending = false;
    try {
      pending = localStorage.getItem(AUTOSTART_KEY) === "1";
      localStorage.removeItem(AUTOSTART_KEY);
    } catch {
      // ignore
    }
    if (!pending) return;
    autostarted.current = true;
    // Give the draft a moment to come back from storage first.
    const t = window.setTimeout(() => startRef.current?.(), 300);
    return () => window.clearTimeout(t);
  }, [me?.signedIn]);

  // On load: restore the draft (it survives the magic-link round trip), read the account, handle Stripe's return.
  useEffect(() => {
    // Restore after hydration, so the server-rendered empty form and the client agree first.
    queueMicrotask(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (typeof d.notes === "string") setNotes(d.notes);
        const str = (v: unknown) => (typeof v === "string" ? v : "");
        if (Array.isArray(d.keys) && d.keysV === 2) setKeys(KEY_QUESTIONS.map((_, i) => str(d.keys[i])));
        // A draft from before 23 October: four answers in the old order (audience, their view, objective, message).
        else if (Array.isArray(d.keys))
          setKeys(["", [str(d.keys[0]), str(d.keys[1])].filter(Boolean).join("\n"), str(d.keys[2]), str(d.keys[3]), ""]);
        else if (typeof d.audience === "string" || typeof d.intent === "string") setKeys(splitAnswers(d.audience ?? "", d.intent ?? ""));
        if (
          d.register === "formal" ||
          d.register === "business" ||
          d.register === "conversational"
        )
          setRegister(d.register);
        if (typeof d.kind === "string" && (KIND_KEYS as readonly string[]).includes(d.kind)) setKind(d.kind as Kind);
      } catch {
        // storage unavailable; carry on
      } finally {
        draftRestored.current = true;
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
                ? d.kind === "annual"
                  ? "Payment received, thank you. Your year of stories starts now."
                  : d.kind === "monthly"
                    ? "Payment received, thank you. Your month of stories starts now."
                    : "Payment received, thank you. Your next story is ready to start."
                : "Payment is being confirmed. Reload in a moment if it has not appeared.",
            );
            return loadMe();
          })
          .catch(() => loadMe());
      } else if (params.get("checkout") === "cancelled") {
        setNotice("Checkout cancelled. Your story is still here.");
        loadMe();
      } else if (params.get("joined")) {
        setNotice("Welcome, you are in! Answer the questions below and add your material to work on your first story.");
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
    if (!draftRestored.current) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ notes, keys, keysV: 2, register, kind }),
      );
    } catch {
      // ignore
    }
  }, [notes, keys, register, kind]);

  useEffect(() => {
    try {
      if (storyId) localStorage.setItem(CURRENT_KEY, storyId);
      else localStorage.removeItem(CURRENT_KEY);
    } catch {
      // ignore
    }
  }, [storyId]);

  const signedIn = Boolean(me?.signedIn);
  // Signed in, this story not yet paid for, and nothing left to pay with: the actions become one Upgrade button.
  const locked = signedIn && !unlocked && !!me && !me.unlimited && me.plan !== "lifetime" && (me.storiesLeft ?? 0) === 0;

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
          rhetoric,
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
  }, [signedIn, story, landing, rhetoric, notes, audience, intent, register, storyId]);

  function handleApiError(e: unknown, fallback: string) {
    const message = e instanceof Error ? e.message : fallback;
    const code = (e as { code?: string } | null)?.code;
    if (code === "signin") {
      setShowSignIn(true);
      setError(null);
      window.scrollTo({ top: 0 });
      return;
    }
    if (code === "buy") {
      setShowPaywall(true);
      setError(null);
      loadMe();
      return;
    }
    if (code === "cap") {
      setCapNotice(message);
      setError(null);
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
        rhetoric?: Rhetoric | null;
        unlocked?: boolean;
        capped?: boolean;
        aiUsage?: AiUsage;
      };
      setNotes(s.notes);
      setKeys(splitAnswers(s.audience ?? "", s.intent ?? ""));
      setRegister(s.register);
      const opened = normaliseStory(s.story);
      setStory(opened);
      if (s.story.kind) setKind(opened.kind);
      setKindChosenByMachine(false);
      setLanding(s.landing);
      setStoryId(s.id);
      setUnlocked(Boolean(s.unlocked));
      setCapped(Boolean(s.capped));
      setAiUsage(s.aiUsage ?? {});
      setRhetoric(s.rhetoric ?? null);
      setView("story");
      setCapNotice(null);
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
        body: JSON.stringify({ title: story.bigIdea, story, landing, rhetoric, storyId: storyId ?? undefined, format }),
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

  // Email first (11 October): one button, then up to three questions, then the whole story in one go.
  // Signed out: open the sign-in box and carry on by ourselves once they are in.
  async function start(justSignedIn = false) {
    setError(null);
    setCapNotice(null);
    if (!signedIn && !justSignedIn) {
      try {
        localStorage.setItem(AUTOSTART_KEY, "1");
      } catch {
        // storage unavailable; they press the button again after signing in
      }
      setSignInForStory(true);
      setShowSignIn(true);
      window.setTimeout(() => signInBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      return;
    }
    setSignInForStory(false);
    setShowSignIn(false);
    // Finding a saved story again is a rerun: no questions, straight to the story.
    if (storyId) return findStory([]);
    setBusy("questions");
    try {
      const data = await postJson<{ questions: Question[] }>("/api/questions", {
        notes,
        audience,
        intent,
        kind: kind || undefined,
      });
      if (data.questions.length) {
        setQuestions(data.questions);
        setAnswers(data.questions.map(() => ""));
        setBusy(null);
        return;
      }
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code === "buy" || code === "signin") {
        setBusy(null);
        return handleApiError(e, "Something went wrong");
      }
      // The questions help; they are not essential. Carry on without them.
    }
    setBusy(null);
    await findStory([]);
  }

  // Stage 1, then Stage 2 and the rhetoric notes straight after, with no button in between.
  async function findStory(given: Array<{ question: string; answer: string }>) {
    setBusy("story");
    setError(null);
    setCapNotice(null);
    setQuestions(null);
    setStory(null);
    setLanding(null);
    setRhetoric(null);
    setView("story");
    setChat([]);
    setSaveState("idle");
    let found: { id: string | null; story: Story } | null = null;
    try {
      const data = await postJson<{ id: string | null; story: Story; capped?: boolean; meta: Meta }>("/api/story", {
        notes,
        audience,
        intent,
        register,
        kind: kind || undefined,
        storyId: storyId ?? undefined,
        // Blank answers go too: a blank means "I don't know yet", and the story names it as a gap.
        answers: given,
      });
      setKindChosenByMachine(!kind);
      if (data.id) setStoryId(data.id);
      if (storyId) setAiUsage((u) => ({ ...u, rerun: (u.rerun ?? 0) + 1 }));
      else setAiUsage({});
      setCapped(Boolean(data.capped));
      setUnlocked(true);
      const s = normaliseStory(data.story);
      setStory(s);
      setShowPaywall(false);
      setMeta(data.meta);
      window.scrollTo({ top: 0 });
      found = { id: data.id, story: s };
    } catch (e) {
      handleApiError(e, "Something went wrong");
    } finally {
      setBusy(null);
    }
    loadMe();
    if (found) await makeItLand(found.story, found.id);
  }

  async function makeItLand(s: Story | null = story, id: string | null = storyId) {
    if (!s) return;
    setBusy("land");
    setError(null);
    let landed: Landing | null = null;
    try {
      const data = await postJson<{ landing: Landing; meta: Meta }>(
        "/api/land",
        { notes, story: s, register, storyId: id ?? undefined, minutes: minutesFrom(intent) ?? undefined },
      );
      setUnlocked(true);
      setLanding(data.landing);
      setMeta(data.meta);
      setAiUsage((u) => ({ ...u, land: (u.land ?? 0) + 1 }));
      landed = data.landing;
      loadMe();
    } catch (e) {
      handleApiError(e, "Something went wrong");
    } finally {
      setBusy(null);
    }
    if (landed && id) await runRhetoric(s, landed, id);
  }

  // The rhetoric notes: what devices the story uses, and where one would help. Quiet on failure.
  async function runRhetoric(s: Story | null = story, l: Landing | null = landing, id: string | null = storyId) {
    if (!s || !l || !id) return;
    setBusy("rhetoric");
    try {
      const data = await postJson<{ rhetoric: Rhetoric }>("/api/rhetoric", { notes, story: s, landing: l, storyId: id });
      setRhetoric(data.rhetoric);
      setAiUsage((u) => ({ ...u, rhetoric: (u.rhetoric ?? 0) + 1 }));
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code === "cap") handleApiError(e, "");
      // Otherwise leave it: the story is complete without the notes, and the link below runs them again.
    } finally {
      setBusy(null);
    }
  }

  // The Big Idea changed after Stage 2: rewrite the Epilogue, its five-line entry and its cues to land on the new one.
  async function rewriteEnding() {
    if (!story || !landing) return;
    setBusy("ending");
    setError(null);
    try {
      const data = await postJson<{ ending: { epilogue: string; fiveLineEpilogue: string; epilogueNotes: string[] } }>(
        "/api/ending",
        { notes, story, landing, register },
      );
      setLanding((prev) =>
        prev
          ? {
              ...prev,
              epilogue: data.ending.epilogue,
              fiveLineStory: { ...prev.fiveLineStory, epilogue: data.ending.fiveLineEpilogue },
              speechNotes: { ...prev.speechNotes, epilogue: data.ending.epilogueNotes },
              titleSlide: story.bigIdea,
              closingSlide: story.bigIdea,
            }
          : prev,
      );
    } catch (e) {
      handleApiError(e, "The ending could not be rewritten");
    } finally {
      setBusy(null);
    }
  }

  // Photos and screenshots (21 October 2026): shrunk in the browser, sent to /api/photo, and Claude writes out
  // what is in them. Unlike documents, the picture does leave the computer; it is not stored.
  async function readPhoto(file: Blob, label: string): Promise<boolean> {
    setError(null);
    setUploadNote(null);
    setBusy("photo");
    try {
      const { prepareImage } = await import("@/lib/imagePrep");
      const img = await prepareImage(file);
      const res = await fetch("/api/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img.base64, mediaType: img.mediaType }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error || "We could not read that picture just now. Try again in a moment.");
      setNotes((prev) => (prev.trim() ? prev.trimEnd() + "\n\n" : "") + `From ${label}:\n` + data.text);
      setUploadNote(`Added what we could read in ${label}. Check the words and figures against the picture, and cut anything that is not part of the story.`);
      return true;
    } catch (e) {
      setError(`${label}: ${e instanceof Error && e.message ? e.message : "we could not read that picture."}`);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function uploadAll(files: FileList | null) {
    if (!files || !files.length) return;
    const { isImage } = await import("@/lib/imagePrep");
    const list = Array.from(files);
    const failed: string[] = [];
    let added = 0;
    for (const f of list.slice(0, 10)) {
      const ok = isImage(f) ? await readPhoto(f, f.name || "your picture") : await upload(f);
      if (ok) added += 1;
      else failed.push(f.name);
    }
    if (list.length > 1) {
      setUploadNote(
        added
          ? `Added what we could read from ${added} ${added === 1 ? "file" : "files"}${list.length > 10 ? " (the first ten; upload the rest next)" : ""}. Check the words and figures, and cut anything that is not part of the story.`
          : null,
      );
      setError(failed.length ? `Could not read: ${failed.join(", ")}. Try those again, save them in another format, or paste the text.` : null);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  // A screenshot pasted straight into the notes box is read like an uploaded photo.
  function pasteImage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
    if (!item) return;
    const blob = item.getAsFile();
    if (!blob) return;
    e.preventDefault();
    if (busy === null) readPhoto(blob, "your pasted picture");
  }

  // The file is read here, in the browser. Only its words go into the notes; the file itself is never sent.
  async function upload(file: File): Promise<boolean> {
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
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        e instanceof Error && e.name === "ExtractError"
          ? msg
          : `Could not read that file${msg ? ` (${msg})` : ""}. Save it again as .pptx, .docx or .pdf, or paste the text.`,
      );
      return false;
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
          storyId: storyId ?? undefined,
        });
        applyPath(path, data.value);
        setAiUsage((u) => ({ ...u, edit: (u.edit ?? 0) + 1 }));
      } catch (e) {
        handleApiError(e, "That edit did not go through");
      } finally {
        setBusy(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [story, landing, notes, register, storyId],
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
        storyId: storyId ?? undefined,
      });
      setStory(normaliseStory(data.story));
      if (data.landing) setLanding(data.landing);
      setChat([...next, { role: "assistant", content: data.reply }]);
      setAiUsage((u) => ({ ...u, edit: (u.edit ?? 0) + 1 }));
    } catch (e) {
      handleApiError(e, "StoryMachine could not answer that");
      setChat(chat);
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    startRef.current = start;
  });

  const gaps = landing ? landing.gaps : (story?.gaps ?? []);
  const editsLeft = Math.max(0, FREE_CAPS.edit - (aiUsage.edit ?? 0));
  const rerunsLeft = Math.max(0, FREE_CAPS.rerun - (aiUsage.rerun ?? 0));
  const chips = (path: string, current: string | string[]) =>
    signedIn ? (a: string) => edit(path, current, a) : undefined;
  // The rhetoric notes for one line, under it. "Use this line" is an edit by hand: free.
  const notesFor = (path: string, current: string) => (
    <RhetoricNotes rhetoric={rhetoric} path={path} current={current} onUse={(p, t) => applyPath(p, t)} />
  );
  const legacySuggestions = rhetoric ? rhetoric.suggestions.filter((x) => !x.path) : [];
  const inPlaceCount = rhetoric ? rhetoric.suggestions.filter((x) => x.path).length : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:pt-16 lg:max-w-5xl lg:px-10 2xl:max-w-6xl">
      <header className={story ? "mb-10" : "mb-6"}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Lockup />
          <Link href="/?home=1" className="ml-auto text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">Home</Link>
          <Link href="/guide" className="text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">User Guide</Link>
          {me && !me.signedIn && (
            <button
              type="button"
              onClick={() => {
                setSignInForStory(false);
                setShowSignIn((v) => !v);
              }}
              aria-expanded={showSignIn}
              className="text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink"
            >
              {showSignIn ? "Close" : "Already a user? Sign in"}
            </button>
          )}
        </div>
        {me && !me.signedIn && showSignIn && !signInForStory && (
          <div className="mt-4">
            <SignIn
              title="Welcome back"
              body="Enter the email you used before. We send you a six-digit code. Your stories are waiting."
              programme={programme}
              onSignedIn={onSignedIn}
            />
          </div>
        )}
        {me && (
          <div className="mt-4">
            <AccountBar
              me={me}
              onChange={loadMe}
              onOpenStories={() => setShowStories(true)}
              onUpgrade={() => setShowUpgrade((v) => !v)}
            />
          </div>
        )}
        {me?.signedIn && showUpgrade && (
          <div className="mt-4">
            <Paywall me={me} onChange={() => { loadMe(); setShowUpgrade(false); }} onClose={() => setShowUpgrade(false)} />
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
      </header>

      {!story && (
        <section className="panel space-y-10">
          <div>
            <h1 className="display text-3xl leading-[1.05] sm:text-4xl">Start with your audience.</h1>
            <p className="mt-3 max-w-2xl text-ink-2">
              Answer some questions about your presentation, your audience, your objective and your message. Add any
              relevant material. StoryMachine builds the story, start to finish.
              {me && !me.signedIn && " Your first story is free. Just your email, no credit card."}{" "}
              <Link href="/guide" className="underline decoration-rule underline-offset-4 hover:text-ink">User Guide</Link>
            </p>
          </div>

          <div className="space-y-6">
            <StepHead
              n={1}
              title="Key questions"
              sub="Think carefully about the questions below. They are the foundation of your presentation. Give as much detail as you can. If you really don't know, leave it blank."
            />
            <fieldset className="text-sm">
              <legend className="font-medium text-ink">What kind of presentation is it?</legend>
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
                {kind ? KINDS[kind].helps : "Not sure? Leave it, and StoryMachine will choose from your notes."}
              </p>
            </fieldset>

            {KEY_QUESTIONS.map((q, i) => (
              <label key={q.tag} className="block text-sm">
                <span className="font-medium text-ink">{q.question}</span>
                {q.short ? (
                  <input
                    type="text"
                    value={keys[i]}
                    onChange={(e) => setKeys((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    maxLength={60}
                    placeholder={q.hint}
                    className="mt-1 block w-full max-w-xs rounded-md border border-rule bg-paper-2 p-3 text-base outline-none focus:border-ink"
                  />
                ) : (
                  <textarea
                    value={keys[i]}
                    onChange={(e) => setKeys((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    rows={3}
                    maxLength={3000}
                    placeholder={q.hint}
                    className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base leading-relaxed outline-none focus:border-ink"
                  />
                )}
                {q.short && <span className="mt-1 block text-xs text-muted">StoryMachine builds the story to fit the time.</span>}
              </label>
            ))}
            <fieldset className="text-sm">
              <legend className="font-medium text-ink">Tone of voice</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {REGISTERS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRegister(r.value)}
                    aria-pressed={register === r.value}
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
              <p className="mt-2 text-xs text-muted">{REGISTERS.find((r) => r.value === register)?.hint}</p>
            </fieldset>
          </div>

          <div>
            <StepHead n={2} title="Your material" sub="Upload your documents. Type or paste your notes and rough thinking; it does not have to be neat." />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onPaste={pasteImage}
              rows={12}
              placeholder="Type or paste your notes and ideas here."
              className="mt-3 w-full rounded-md border border-rule bg-paper-2 p-4 text-base leading-relaxed outline-none focus:border-ink"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="rounded-md border border-ink bg-paper-2 px-4 py-2 font-medium text-ink disabled:opacity-40"
              >
                {busy === "upload" ? "Reading the file..." : busy === "photo" ? "Reading the picture..." : "Upload files or photos"}
              </button>
              <span>
                Choose up to ten at once. Your documents stay on your computer: only the words are read. The one exception is a photo or
                screenshot, which goes to our servers, is read, and is then deleted. You can also paste a screenshot into the box.
              </span>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,.txt,.md,image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => uploadAll(e.target.files)}
              />
              {uploadNote && <span className="w-full text-ink">{uploadNote}</span>}
            </div>
          </div>

          <div className="space-y-4">
            <StepHead
              n={3}
              title={signedIn ? "Your story" : "Your email"}
              sub={
                signedIn
                  ? "Press the button. If something important is still open, StoryMachine asks you up to two more questions. Then the whole story arrives."
                  : "Press Find my story and enter your email. We send you a six-digit code to type here. Then you get the complete story for your presentation, to edit and refine. Everything you have typed stays on this page."
              }
            />

          {storyId && (
            <p className="text-sm text-muted">
              {capped
                ? rerunsLeft > 0
                  ? "Reworking the notes of your free story. It includes one rerun: a full rebuild from your changed notes. "
                  : "Your free story has had its free rerun. You can still edit any line by hand. Upgrade for unlimited reruns. "
                : "Reworking the notes of a saved story. Finding it again is free. "}
              <button
                type="button"
                onClick={() => setStoryId(null)}
                className="underline decoration-rule underline-offset-4 hover:text-ink"
              >
                Start a new story instead
              </button>
            </p>
          )}

          {me && !me.signedIn && showSignIn && signInForStory && (
            <div ref={signInBoxRef}>
              <SignIn
                title="Enter your email to see your story"
                body="Your first story is free, start to finish, with the PDF. We will send you a six-digit code. Type it here to receive and work on your story. No credit card required. Signing in adds you to the Presentation Guru list: one useful email a month. Unsubscribe any time."
                programme={programme}
                onSignedIn={onSignedIn}
              />
            </div>
          )}

          {questions && questions.length > 0 ? (
            <div className="rounded-md border border-ink bg-paper-2 p-5 sm:p-6">
              <p className="eyebrow">Before I write it</p>
              <h2 className="display mt-2 text-2xl">
                {questions.length === 1 ? "One question" : "Two questions"} your notes leave open.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-2">
                Give as much detail as you can. If you really don&apos;t know, leave it blank.
              </p>
              <ol className="mt-5 space-y-5">
                {questions.map((q, i) => (
                  <li key={i}>
                    <label className="block text-sm">
                      <span className="font-medium text-ink">{q.question}</span>
                      <textarea
                        value={answers[i] ?? ""}
                        onChange={(e) => setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))}
                        rows={2}
                        maxLength={3000}
                        placeholder={q.example ? `For example: ${q.example}` : ""}
                        className="mt-1 w-full rounded-md border border-rule bg-paper p-3 text-base leading-relaxed outline-none focus:border-ink"
                      />
                    </label>
                  </li>
                ))}
              </ol>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => findStory(questions.map((q, i) => ({ question: q.question, answer: answers[i] ?? "" })))}
                  disabled={busy !== null}
                  className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
                >
                  Write my story
                </button>

              </div>
            </div>
          ) : !(me && !me.signedIn && showSignIn && signInForStory) ? (
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => start()}
                disabled={busy !== null || notes.trim().length < 40}
                className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
              >
                {busy === "questions"
                  ? "Reading your notes..."
                  : busy === "story"
                    ? "Finding your story..."
                    : storyId
                      ? "Find my story again"
                      : "Find my story"}
              </button>
              {busy === null && notes.trim().length < 40 && (
                <span className="text-sm text-muted">Add some material in step 2 first.</span>
              )}
              {busy === "questions" && <span className="text-sm text-muted">A few seconds.</span>}
              {busy === "story" && <Progress label="Stage 1: getting your story straight" expected={45} />}
            </div>
          ) : null}
          </div>
          {capNotice && (
            <p className="flex flex-wrap items-center gap-3 rounded-md bg-red-soft px-3 py-2 text-sm text-ink">
              {capNotice}
              {signedIn && (
                <button type="button" onClick={() => setShowUpgrade(true)} className="rounded-md bg-red px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90">
                  Upgrade
                </button>
              )}
            </p>
          )}
          {error && <p className="text-sm text-red">{error}</p>}
        </section>
      )}


      {story && landing && view === "slides" && (
        <article className="panel rise space-y-10">
          <button
            type="button"
            onClick={() => { setView("story"); window.scrollTo({ top: 0 }); }}
            className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
          >
            Back to your story
          </button>
          <div>
            <p className="eyebrow">Your slides, then rehearsal</p>
            <h1 className="display mt-2 text-3xl leading-[1.05] sm:text-4xl">If you need them, add slides.</h1>
            <p className="mt-3 max-w-2xl text-ink-2">
              You have done the important work. If you think slides can support your story rather than replace it, you can
              now create them. You have three options:
            </p>
            <ol className="mt-3 max-w-2xl list-decimal space-y-1 pl-5 text-ink-2">
              <li>Download the PowerPoint outline and work from that.</li>
              <li>Follow the slide brief below and build your slides from that.</li>
              <li>Copy the prompt at the bottom of this page and paste it into your preferred AI tool.</li>
            </ol>
            <p className="mt-3 max-w-2xl text-ink-2">Then rehearse it into life, with your speaker notes at the foot of this page.</p>
            <p className="said mt-4 text-xl text-ink">{story.bigIdea}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => exportFile("pptx")}
              disabled={busy !== null || locked}
              title="The slide words in title placeholders and the picture briefs in content placeholders, with the speaker notes. Apply your company template in PowerPoint."
              className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
            >
              {busy === "export-pptx" ? "Making the outline..." : "Download the PowerPoint outline"}
            </button>
            <span className="text-sm text-muted">Story-led headlines, ready for your own template. Add the images, data and detail.</span>
            {pdf && !busy?.startsWith("export") && (
              <a href={pdf.url} download={pdf.name} className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink">
                Nothing downloaded? Save {pdf.name}
              </a>
            )}
          </div>
          {error && <p className="text-sm text-red">{error}</p>}
          <Slides story={story} landing={landing} />
          <div id="rehearse" className="scroll-mt-8 space-y-10">
            <Rehearse story={story} landing={landing} />
          </div>
        </article>
      )}

      {story && view === "story" && (
        <article className="panel rise space-y-14">
          <ol className="stages">
            <li data-done="true" aria-current={landing ? undefined : "step"}>
              <span className="font-semibold text-red">1</span> Get your story straight <span className="text-red">&#10003;</span>
            </li>
            <li aria-current={landing ? "step" : undefined}>
              <span className="font-semibold text-red">2</span> Add interest and impact {landing && <span className="text-red">&#10003;</span>}
            </li>
          </ol>
          {busy === "land" && (
            <div className="space-y-3 rounded-md bg-panel px-4 py-3 text-sm text-ink-2" role="status">
              <p>
                Stage 1 is here. Now adding interest and impact: the first minute, signposts, the ending and your speaker
                notes. Read on while it works.
              </p>
              <Progress label="Stage 2: adding interest and impact" expected={45} />
            </div>
          )}
          {/* John's line (draft 5): say at once that this is a draft, and how to change it. */}
          <p className="max-w-2xl text-ink-2">
            Below is the first draft of your story. Click any text in a box to change it as you like. For many lines you can
            also ask StoryMachine to make it clearer, sharper or simpler.
          </p>
          {/* The story page follows the PDF (21 October): three sections, with a contents bar that stays in view. */}
          <nav aria-label="Your story" className="sticky top-0 z-20 -mx-2 flex flex-wrap gap-x-5 gap-y-1 border-b border-rule bg-paper-2/95 px-2 py-3 text-sm backdrop-blur">
            {[
              ["s-audience", "1 Your audience and your argument"],
              ["s-presentation", "2 Your presentation"],
              ["s-suggestions", "3 Suggestions"],
              ...(landing && signedIn && !locked ? [["s-finished", "Next: slides and rehearsal"]] : []),
            ].map(([id, t]) => (
              <a key={id} href={`#${id}`} className="text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">
                {t}
              </a>
            ))}
          </nav>

          {/* 1. Your audience and your argument */}
          <section id="s-audience" className="scroll-mt-20 space-y-8">
            <SectionHead
              n={1}
              title="Your audience and your argument"
              intro="These are the foundations of your story. Check them first: if one is wrong, everything built on it will be too. Click any line to change it."
            />
            <div>
              <SubHead title="Your audience analysis" about="Who is in the room, and what they need from you. A message for everyone lands with no one." />
              <div className="space-y-4">
                <Row label="Who they are">
                  <Editable value={story.audience.who} onChange={(v) => applyPath("audience.who", v)} className="font-medium" />
                </Row>
                {story.hero.who && (
                  <>
                    <Row label="What they want">
                      <Editable value={story.hero.wants} onChange={(v) => applyPath("hero.wants", v)} className="text-ink-2" />
                    </Row>
                    <Row label="What stands in the way">
                      <Editable value={story.hero.obstacle} onChange={(v) => applyPath("hero.obstacle", v)} className="text-ink-2" />
                    </Row>
                  </>
                )}
                <Row label="What they need to hear">
                  <Editable value={story.audience.needToHear} onChange={(v) => applyPath("audience.needToHear", v)} className="text-ink-2" />
                </Row>
                <Row label="What to leave out">
                  <Editable value={story.audience.doNotNeedToHear} onChange={(v) => applyPath("audience.doNotNeedToHear", v)} className="text-ink-2" />
                </Row>
              </div>
            </div>
            <div className="border-t border-rule pt-8">
              <SubHead title="What you want your presentation to do" about="Your statement of intent. If you can't finish the sentence, the presentation is not ready." />
              <Editable
                value={story.intent}
                busy={busy === "intent"}
                onChange={(v) => applyPath("intent", v)}
                onAction={chips("intent", story.intent)}
                actions={["sharper", "simpler", "another"]}
                className="text-lg"
              />
            </div>
            <div className="border-t border-rule pt-8">
              <SubHead title="Your argument" about="Your case in one sentence. Everything in the three acts supports it." />
              <Editable
                value={story.argument}
                busy={busy === "argument"}
                onChange={(v) => applyPath("argument", v)}
                onAction={chips("argument", story.argument)}
                actions={["sharper", "simpler", "clearer", "another"]}
                className="text-lg"
              />
            </div>
            {landing && (
              <div className="rounded-md bg-panel p-6 sm:p-8">
                <SubHead title="Your story in five lines" about="The whole talk in 30 seconds. If it works here, it will work in the room." />
                <ol className="space-y-3">
                  {(["prologue", "why", "how", "what", "epilogue"] as const).map((k, i) => (
                    <li key={k} className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
                      <span className="pt-1.5 text-sm font-semibold text-muted">
                        {k === "prologue" ? "Prologue" : k === "epilogue" ? "Epilogue" : `Act ${i}: ${KINDS[story.kind].acts[i - 1]}`}
                      </span>
                      <Editable value={landing.fiveLineStory[k]} onChange={(v) => applyPath(`landing.fiveLineStory.${k}`, v)} className="said text-lg" />
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* 2. Your presentation */}
          <section id="s-presentation" className="scroll-mt-20 space-y-10">
            <SectionHead
              n={2}
              title="Your presentation"
              intro={
                landing
                  ? "The talk from the first word to the last. Words in this typeface are for saying aloud. The red notes under some lines suggest a rhetorical device to add power: section 3 explains them."
                  : "Your Big Idea and the three acts. The opening, signposts and ending follow in Stage 2."
              }
            />
            <div>
              <SubHead title="Your Big Idea" about="The one line people repeat in the corridor afterwards. Your whole presentation rests on it." />
              <Editable
                as="h2"
                value={story.bigIdea}
                busy={busy === "bigIdea"}
                onChange={(v) => applyPath("bigIdea", v)}
                onAction={chips("bigIdea", story.bigIdea)}
                className="said text-4xl leading-[1.08] sm:text-5xl"
                label="Big Idea"
              />
              {notesFor("bigIdea", story.bigIdea)}
            </div>
            <div>
              <SubHead
                title="Your speech structure"
                about={`${KINDS[story.kind].label}: ${KINDS[story.kind].line}${kindChosenByMachine ? " StoryMachine chose this from your notes. To use another, choose Rework the notes, pick the kind and find your story again." : ""}`}
              />
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ["p-prologue", "Prologue", landing ? "The first minute" : "Comes with Stage 2", true],
                  ["p-why", "Act 1", KINDS[story.kind].acts[0], false],
                  ["p-how", "Act 2", KINDS[story.kind].acts[1], false],
                  ["p-what", "Act 3", KINDS[story.kind].acts[2], false],
                  ["p-epilogue", "Epilogue", landing ? "End with certainty" : "Comes with Stage 2", true],
                ].map(([id, a, b, end]) => {
                  const live = landing || !end;
                  const inner = (
                    <>
                      <span className={"block text-sm font-semibold " + (end ? "text-red" : "text-ink")}>{a as string}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-ink-2">{b as string}</span>
                    </>
                  );
                  return (
                    <li key={id as string} className={"rounded-md px-3 py-2.5 " + (end ? "bg-red-soft" : "bg-panel")}>
                      {live ? <a href={`#${id}`} className="block hover:opacity-80">{inner}</a> : inner}
                    </li>
                  );
                })}
              </ol>
            </div>

            {landing && (
              <Part id="p-prologue" title="Prologue" about="The first 30 to 60 seconds, to grab your audience's attention. State the Big Idea, say why it matters now, and tell them what you need from them.">
                <Editable
                  value={landing.prologue}
                  busy={busy === "landing.prologue"}
                  onChange={(v) => applyPath("landing.prologue", v)}
                  onAction={chips("landing.prologue", landing.prologue)}
                  className="spoken"
                  label="Prologue"
                />
                {notesFor("landing.prologue", landing.prologue)}
              </Part>
            )}

            {actsFor(story.kind).map(({ key, n, word, why }) => {
              const act = story[key];
              const land = landing?.[key];
              return (
                <Part key={key} id={`p-${key}`} title={`${n}: ${word}`} about={why.replace(/^(Why|How|What):\s*/, "")}>
                  {land && (
                    <div className="rounded-md bg-panel p-5">
                      <p className="text-xs font-semibold text-red">Your signpost that introduces {n}</p>
                      <div className="mt-2">
                        <Editable
                          value={land.signpost}
                          busy={busy === `landing.${key}.signpost`}
                          onChange={(v) => applyPath(`landing.${key}.signpost`, v)}
                          onAction={chips(`landing.${key}.signpost`, land.signpost)}
                          actions={["sharper", "memorable", "another"]}
                          className="spoken text-base"
                        />
                        {notesFor(`landing.${key}.signpost`, land.signpost)}
                      </div>
                    </div>
                  )}
                  <div>
                    <FieldLabel>Headline</FieldLabel>
                    <Editable
                      as="h2"
                      value={act.headline}
                      busy={busy === `${key}.headline`}
                      onChange={(v) => applyPath(`${key}.headline`, v)}
                      onAction={chips(`${key}.headline`, act.headline)}
                      className="display text-2xl leading-snug sm:text-[1.75rem]"
                      label={`${n} headline`}
                    />
                    {notesFor(`${key}.headline`, act.headline)}
                  </div>
                  <div>
                    <FieldLabel>What it means</FieldLabel>
                    <Editable
                      value={act.coreMessage}
                      busy={busy === `${key}.coreMessage`}
                      onChange={(v) => applyPath(`${key}.coreMessage`, v)}
                      onAction={chips(`${key}.coreMessage`, act.coreMessage)}
                      actions={["sharper", "simpler", "clearer", "senior", "another"]}
                      className="text-lg"
                    />
                    {notesFor(`${key}.coreMessage`, act.coreMessage)}
                  </div>
                  <div className={"border-l-2 pl-4 " + (act.soundbite.source === "material" ? "border-red" : "border-rule")}>
                    <FieldLabel>
                      Soundbite:{" "}
                      {act.soundbite.source === "material" ? (
                        <span className="text-red">from your notes</span>
                      ) : (
                        "our suggestion. Put it in your own words."
                      )}
                    </FieldLabel>
                    <Editable
                      value={act.soundbite.text}
                      busy={busy === `${key}.soundbite.text`}
                      onChange={(v) => applyPath(`${key}.soundbite.text`, v)}
                      onAction={chips(`${key}.soundbite.text`, act.soundbite.text)}
                      actions={["sharper", "memorable", "another"]}
                      className="said text-xl"
                    />
                    {notesFor(`${key}.soundbite.text`, act.soundbite.text)}
                  </div>
                  <div>
                    <FieldLabel>Evidence: only what carries the point</FieldLabel>
                    <EditableList
                      items={act.supportingPoints}
                      busy={busy === `${key}.supportingPoints`}
                      onChange={(items) => applyPath(`${key}.supportingPoints`, items)}
                      onAction={chips(`${key}.supportingPoints`, act.supportingPoints)}
                    />
                  </div>
                </Part>
              );
            })}

            {landing && (
              <Part id="p-epilogue" title="End with certainty: your Epilogue" about="Recap your headlines and the actions from here. Send them away with your message ringing in their ears.">
                {!endsOnBigIdea(landing.epilogue, story.bigIdea) && (
                  <div className="flex flex-wrap items-center gap-3 rounded-md border border-red bg-red-soft px-4 py-3">
                    <p className="text-sm text-ink">
                      Your Big Idea has changed. The Epilogue, the five lines and the closing notes still end on the old one.
                    </p>
                    <button
                      type="button"
                      onClick={rewriteEnding}
                      disabled={busy !== null}
                      className="rounded-md bg-red px-4 py-2 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-40"
                    >
                      {busy === "ending" ? "Rewriting the ending..." : "Rewrite the ending"}
                    </button>
                  </div>
                )}
                <Editable
                  value={landing.epilogue}
                  busy={busy === "landing.epilogue"}
                  onChange={(v) => applyPath("landing.epilogue", v)}
                  onAction={chips("landing.epilogue", landing.epilogue)}
                  className="spoken"
                  label="Epilogue"
                />
                {notesFor("landing.epilogue", landing.epilogue)}
              </Part>
            )}
            {/* Story, slides, rehearsal (Jim, 21 October): rehearsal sits after the slides, on the slides view.
                Anyone who cannot open that view still gets it here. */}
            {landing && !(signedIn && !locked) && <Rehearse story={story} landing={landing} />}
          </section>

          {/* 3. Suggestions from StoryMachine */}
          <section id="s-suggestions" className="scroll-mt-20 space-y-10">
            <SectionHead n={3} title="Suggestions from StoryMachine" intro="This is a first draft. Here's how we think you can make the message even stronger." />
            <div className="rounded-md bg-red-soft px-5 py-6 sm:px-8 sm:py-8">
              <p className="eyebrow text-red">{OWN_IT_TITLE}</p>
              <p className="said mt-2 text-xl leading-snug text-ink">{OWN_IT_LEAD}</p>
              <ul className="mt-4 space-y-3 text-ink-2">
                {[...gaps, ...ownItAdvice(story, landing)].map((g, i) => (
                  <li key={i} className="border-l-2 border-red pl-4">
                    {g}
                  </li>
                ))}
              </ul>
              <Why>The machine never invents. Where your notes were silent, it asks.</Why>
            </div>

            {landing && (busy === "rhetoric" || hasRhetoric(rhetoric) || storyId) && (
              <div className="border-t border-rule pt-8">
                <p className="eyebrow text-red">{RHETORIC_TITLE}</p>
                <p className="said mt-2 text-xl leading-snug text-ink">{RHETORIC_LEAD}</p>
                {busy === "rhetoric" && <p className="mt-3 text-sm text-muted" role="status">Looking for lines that would gain power...</p>}
                {busy !== "rhetoric" && inPlaceCount > 0 && (
                  <p className="mt-3 text-sm text-muted">
                    The suggestions sit in red under the lines they belong to in section 2. Copy any line you like, or press Use this line. Every edit by hand is free.{" "}
                    <a href="#s-presentation" className="underline decoration-rule underline-offset-4 hover:text-ink">Go to your presentation</a>
                  </p>
                )}
                {legacySuggestions.length > 0 && (
                  <ul className="mt-4 space-y-4">
                    {legacySuggestions.map((sg, i) => (
                      <li key={`s${i}`} className="border-l-2 border-red pl-4 text-sm">
                        <p className="text-muted">{sg.where}</p>
                        <p className="mt-1 text-ink-2">For example, you could say this:</p>
                        <p className="said mt-1 text-ink">&ldquo;{sg.better}&rdquo;</p>
                        <p className="mt-1 text-ink-2"><span className="font-semibold text-ink">{sg.device}.</span> {sg.what}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {busy !== "rhetoric" && storyId && (
                  <button
                    type="button"
                    onClick={() => runRhetoric()}
                    disabled={busy !== null}
                    className="mt-4 text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
                  >
                    {hasRhetoric(rhetoric) ? "Suggest again after your edits" : "Suggest rhetorical devices for this story"}
                  </button>
                )}
              </div>
            )}
          </section>

          {landing && signedIn && !locked && (
            <section id="s-finished" className="scroll-mt-20 rounded-md bg-ink px-6 py-8 text-paper sm:px-10 sm:py-10">
              <h2 className="display mt-2 text-3xl leading-tight">Congratulations, you&apos;ve finished your story.</h2>
              <p className="mt-3 max-w-2xl text-paper/80">
                You have done the hard work. Download it as a PDF or a Word file below. Next come the slides: StoryMachine
                gives you a slide brief, a PowerPoint outline and a prompt for your own AI tool. Then rehearse it into life
                from your speaker notes.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                <button
                  type="button"
                  onClick={() => { setView("slides"); window.scrollTo({ top: 0 }); }}
                  className="rounded-md bg-paper px-6 py-3 text-base font-medium text-ink hover:opacity-90"
                >
                  Now make your slides
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView("slides");
                    setTimeout(() => document.getElementById("rehearse")?.scrollIntoView({ behavior: "smooth" }), 50);
                  }}
                  className="text-sm text-paper/80 underline decoration-paper/40 underline-offset-4 hover:text-paper"
                >
                  No slides? Go straight to rehearsal
                </button>
              </div>
            </section>
          )}

          {!signedIn && (
            <section className="border-t border-rule pt-8">
              <SignIn
                next={`/build?${new URLSearchParams({ ...(me?.guestId ? { claim: me.guestId } : {}), ...(storyId ? { story: storyId } : {}), ...(programme ? { programme } : {}) }).toString()}`}
                programme={programme}
                title="Sign in to finish this story"
                body="Your first story is free, start to finish: Stage 2 adds the first minute, signposts, the ending and speaker notes, then the whole thing as a PDF. Sign in with your email and we send you a code. No credit card."
              />
            </section>
          )}

          {signedIn && showPaywall && (
            <Paywall me={me!} onChange={() => { loadMe(); setShowPaywall(false); }} onClose={() => setShowPaywall(false)} />
          )}

          <section className="flex flex-wrap items-center gap-4 border-t border-rule pt-8">
            {locked && !showPaywall && (
              <button
                type="button"
                onClick={() => setShowPaywall(true)}
                className="rounded-md bg-red px-6 py-3 text-base font-medium text-paper hover:opacity-90"
              >
                Upgrade for Stage 2, the PDF and your slides
              </button>
            )}
            {!landing && signedIn && !locked && (
              <button
                onClick={() => makeItLand()}
                disabled={busy !== null}
                className="rounded-md bg-ink px-6 py-3 text-base font-medium text-paper disabled:opacity-40"
              >
                {busy === "land"
                  ? "Adding interest and impact..."
                  : "Finish the story: add interest and impact"}
              </button>
            )}
            {signedIn && !locked && (
              <button
                type="button"
                onClick={() => exportFile("pdf")}
                disabled={busy !== null}
                className="rounded-md border border-ink bg-paper-2 px-5 py-3 text-base font-medium text-ink disabled:opacity-40"
              >
                {busy === "export-pdf" ? "Making the PDF..." : landing ? "Download your story as a PDF" : "Download the PDF (stage 1 so far)"}
              </button>
            )}
            {signedIn && !locked && (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <button
                  type="button"
                  onClick={() => exportFile("docx")}
                  disabled={busy !== null}
                  className="underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
                >
                  {busy === "export-docx" ? "Making the Word file..." : "or as a Word document"}
                </button>
              </span>
            )}
            {signedIn && !unlocked && me && !me.unlimited && (
              <span className="w-full text-sm text-muted">
                {(me.storiesLeft ?? 0) > 0
                  ? "Finishing this story uses your free story."
                  : "Finishing this story needs a story, a month or a year."}
              </span>
            )}
            {capped && unlocked && (
              <span className="w-full text-sm text-muted">
                Your free story: {editsLeft} of {FREE_CAPS.edit} AI edits left (each line StoryMachine rewrites, and each reply when you argue with it)
                {rerunsLeft > 0 ? ", and one rerun (a full rebuild from Rework the notes)" : ", rerun used"}. Edits by hand are always free.
              </span>
            )}
            {capNotice && (
              <span className="flex w-full flex-wrap items-center gap-3 rounded-md bg-red-soft px-3 py-2 text-sm text-ink">
                {capNotice}
                <button type="button" onClick={() => setShowPaywall(true)} className="rounded-md bg-red px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90">
                  Upgrade
                </button>
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
              <span className="text-xs text-muted">
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
                setCapped(false);
                setAiUsage({});
                setRhetoric(null);
                setCapNotice(null);
                setQuestions(null);
                setSaveState("idle");
                setNotes("");
                setKeys(BLANK_KEYS());
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
