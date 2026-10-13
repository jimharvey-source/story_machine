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
import { Pack } from "@/components/Pack";
import { OWN_IT_LEAD, OWN_IT_TITLE, ownItAdvice } from "@/lib/ownIt";
import { KIND_KEYS, KINDS, kindOf, type Kind } from "@/lib/kinds";

const DRAFT_KEY = "storymachine.draft";
const CURRENT_KEY = "storymachine.current";
// Set when a signed-out visitor presses Find my story: after sign-in the page carries straight on.
const AUTOSTART_KEY = "storymachine.autostart";
// The free story's allowance, shown on the page. Must match FREE_CAPS in lib/access.ts.
const FREE_CAPS = { rerun: 1, edit: 5 } as const;
type AiUsage = Partial<Record<"rerun" | "edit" | "land" | "rhetoric", number>>;

type Register = "formal" | "business" | "conversational";
const REGISTERS: Array<{ value: Register; label: string; hint: string }> = [
  { value: "formal", label: "Formal", hint: "Senior executives, government, legal settings. No contractions." },
  { value: "business", label: "Business", hint: "Colleagues, clients and stakeholders. Direct and plain." },
  { value: "conversational", label: "Conversational", hint: "Peers and friends. Warm, short sentences." },
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
                  ? "Payment received. A year of stories starts now."
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
    if (!draftRestored.current) return;
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
      setCapped(Boolean(s.capped));
      setAiUsage(s.aiUsage ?? {});
      setRhetoric(s.rhetoric ?? null);
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
        answers: given.filter((g) => g.answer.trim()),
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
        { notes, story: s, register, storyId: id ?? undefined },
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
      handleApiError(e, "The strategist could not answer that");
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

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-10 sm:pt-16 lg:max-w-5xl lg:px-10 2xl:max-w-6xl">
      <header className={story ? "mb-10" : "mb-6"}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Lockup />
          <Link href="/guide" className="ml-auto text-sm text-ink-2 underline decoration-rule underline-offset-4 hover:text-ink">User guide</Link>
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
            <h1 className="display text-3xl leading-[1.05] sm:text-4xl">What do you want to say?</h1>
            <p className="mt-3 max-w-2xl text-ink-2">
              Give the StoryMachine your material and tell it about your audience. It builds the story, start to finish,
              in about two minutes.
              {me && !me.signedIn && " Your first story is free: just your email, no card, no password."}{" "}
              <Link href="/guide" className="underline decoration-rule underline-offset-4 hover:text-ink">User guide</Link>
            </p>
          </div>

          <div>
            <StepHead n={1} title="Your material" sub="Paste your notes, an old deck, a paper or your rough thinking. It does not need to be neat." />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={12}
              placeholder="Paste your notes here, or upload a file below."
              className="mt-3 w-full rounded-md border border-rule bg-paper-2 p-4 text-base leading-relaxed outline-none focus:border-ink"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy !== null}
                className="rounded-md border border-ink bg-paper-2 px-4 py-2 font-medium text-ink disabled:opacity-40"
              >
                {busy === "upload" ? "Reading the file..." : "Upload a file"}
              </button>
              <span>PDF, Word or PowerPoint. The file stays on your computer; only the words are read.</span>
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
              {uploadNote && <span className="w-full text-ink">{uploadNote}</span>}
            </div>
          </div>

          <div className="space-y-6">
            <StepHead n={2} title="Your audience" sub="The more you say here, the sharper the story. All four are optional." />
            <label className="block text-sm">
              <span className="font-medium text-ink">Who is in the room, and what matters to them?</span>
              <textarea
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                rows={3}
                placeholder="For example: the executive committee, eight people, sceptical about cost, who care most about the pipeline number."
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base leading-relaxed outline-none focus:border-ink"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">When you sit down, what should they know, think or do?</span>
              <textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                rows={3}
                placeholder="For example: understand why the process needs more structure, and approve the pilot budget."
                className="mt-1 w-full rounded-md border border-rule bg-paper-2 p-3 text-base leading-relaxed outline-none focus:border-ink"
              />
            </label>

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
                {kind ? KINDS[kind].helps : "Not sure? Leave it, and the StoryMachine will choose from your notes."}
              </p>
            </fieldset>

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

          <div className="space-y-4">
            <StepHead
              n={3}
              title={signedIn ? "Your story" : "Your email"}
              sub={
                signedIn
                  ? "Press the button. If your notes leave something important open, you get up to three short questions first. Then the whole story arrives."
                  : "Press Find my story and enter your email. We send you a six-digit code; type it here. Then step 4, your story, starts straight away. Everything you have typed stays on this page."
              }
            />

          {storyId && (
            <p className="text-sm text-muted">
              {capped
                ? rerunsLeft > 0
                  ? "Reworking the notes of your free story. It includes one rerun. "
                  : "Your free story has had its rerun. Edit any line by hand, or upgrade for unlimited reruns. "
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
                body="Your first story is free, start to finish, with the PDF. We send you a six-digit code. Type it here and your story starts straight away. No card, no password."
                programme={programme}
                onSignedIn={onSignedIn}
              />
            </div>
          )}

          {questions && questions.length > 0 ? (
            <div className="rounded-md border border-ink bg-paper-2 p-5 sm:p-6">
              <p className="eyebrow">Before I write it</p>
              <h2 className="display mt-2 text-2xl">
                {questions.length === 1 ? "One question" : `${questions.length === 2 ? "Two" : "Three"} questions`} your notes leave open.
              </h2>
              <p className="mt-2 max-w-xl text-sm text-ink-2">
                A line each is plenty. Skip any you cannot answer; the story will name it as a gap.
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
                        maxLength={1500}
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
                <button
                  type="button"
                  onClick={() => findStory([])}
                  disabled={busy !== null}
                  className="text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink"
                >
                  Skip the questions
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
                <span className="text-sm text-muted">Add a few lines of notes in step 1 first.</span>
              )}
              {busy === "questions" && <span className="text-sm text-muted">A few seconds.</span>}
              {busy === "story" && (
                <span className="text-sm text-muted">
                  Usually twenty to forty seconds. Stage 2 follows straight after.
                </span>
              )}
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


      {story && (
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
            <p className="rounded-md bg-panel px-4 py-3 text-sm text-ink-2" role="status">
              Stage 1 is here. Now adding interest and impact: the first minute, signposts, slide ideas, the ending and
              your speaker notes. About a minute. Read on while it works.
            </p>
          )}
          <section>
            <p className="eyebrow">Big Idea</p>
            <Why>The whole argument in one line people can repeat in the corridor. If they remember nothing else, they remember this.</Why>
            <Editable
              as="h2"
              value={story.bigIdea}
              busy={busy === "bigIdea"}
              onChange={(v) => applyPath("bigIdea", v)}
              onAction={chips("bigIdea", story.bigIdea)}
              className="said mt-3 text-4xl leading-[1.08] sm:text-5xl"
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
                      className="said mt-1 text-xl"
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
                    <div className="grid gap-5 rounded-md bg-panel p-5 sm:grid-cols-2">
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
                {story && !endsOnBigIdea(landing.epilogue, story.bigIdea) && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-red bg-red-soft px-4 py-3">
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
              <section className="rounded-md bg-panel p-6 sm:p-8">
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
                        className="said text-lg"
                      />
                    </li>
                  ))}
                </ol>
              </section>
              <Pack story={story} landing={landing} />
            </>
          )}

          {story && (
            <section className="rounded-md bg-red-soft px-5 py-6 sm:px-8 sm:py-8">
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
            </section>
          )}

          {landing && (busy === "rhetoric" || hasRhetoric(rhetoric) || storyId) && (
            <section className="border-t border-rule pt-8">
              <p className="eyebrow">{RHETORIC_TITLE}</p>
              <p className="said mt-2 text-xl leading-snug text-ink">{RHETORIC_LEAD}</p>
              {busy === "rhetoric" && <p className="mt-3 text-sm text-muted" role="status">Finding the rhetoric in your story...</p>}
              {hasRhetoric(rhetoric) && (
                <>
                  <ul className="mt-4 space-y-4">
                    {rhetoric.devices.map((d, i) => (
                      <li key={i} className="border-l-2 border-rule pl-4">
                        <p className="text-sm">
                          <span className="font-semibold text-ink">{d.device}</span>
                          <span className="text-muted"> &middot; {d.where} &middot; {d.source === "yours" ? "your words" : "added"}</span>
                        </p>
                        <p className="spoken mt-1 text-ink">{d.line}</p>
                        <p className="mt-1 text-sm text-ink-2">{d.note}</p>
                      </li>
                    ))}
                  </ul>
                  {rhetoric.suggestions.length > 0 && (
                    <div className="mt-6">
                      <p className="eyebrow">Where a device would help</p>
                      <ul className="mt-3 space-y-4">
                        {rhetoric.suggestions.map((sg, i) => (
                          <li key={i} className="border-l-2 border-red pl-4 text-sm">
                            <p><span className="font-semibold text-ink">{sg.device}</span><span className="text-muted"> &middot; {sg.where}</span></p>
                            <p className="mt-1 text-ink-2">Now: &ldquo;{sg.now}&rdquo;</p>
                            <p className="mt-1 text-ink">Try: &ldquo;{sg.better}&rdquo;</p>
                          </li>
                        ))}
                      </ul>
                      <Why>Copy a line you like into the story above. Every edit by hand is free.</Why>
                    </div>
                  )}
                </>
              )}
              {busy !== "rhetoric" && storyId && (
                <button
                  type="button"
                  onClick={() => runRhetoric()}
                  disabled={busy !== null}
                  className="mt-4 text-sm text-muted underline decoration-rule underline-offset-4 hover:text-ink disabled:opacity-40"
                >
                  {hasRhetoric(rhetoric) ? "Check the rhetoric again after your edits" : "Point out the rhetoric in this story"}
                </button>
              )}
            </section>
          )}

          {!signedIn && (
            <section className="border-t border-rule pt-8">
              <SignIn
                next={`/build?${new URLSearchParams({ ...(me?.guestId ? { claim: me.guestId } : {}), ...(storyId ? { story: storyId } : {}), ...(programme ? { programme } : {}) }).toString()}`}
                programme={programme}
                title="Sign in to finish this story"
                body="Your first story is free, start to finish: Stage 2 adds the first minute, signposts, slide ideas, the ending, speaker notes and a slide brief, then the whole thing as a PDF. Sign in with your email and we send you a code. No card. No password."
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
                {busy === "export-pdf" ? "Making the PDF..." : landing ? "Download the PDF (stages 1 and 2)" : "Download the PDF (stage 1 so far)"}
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
                  ? "Finishing this story uses your free story."
                  : "Finishing this story needs a story, a month or a year."}
              </span>
            )}
            {capped && unlocked && (
              <span className="w-full text-sm text-muted">
                Your free story: {editsLeft} of {FREE_CAPS.edit} AI edits left
                {rerunsLeft > 0 ? ", and one rerun from Rework the notes" : ", rerun used"}. Edits by hand are always free.
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
