import { z } from "zod";
import { KIND_KEYS } from "./kinds";

// Stage one: Get your story straight (Worksheet 1).
// Audience, intent, argument, Big Idea, three acts.

export const SoundbiteSchema = z.object({
  text: z.string().describe("The soundbite itself. Under fourteen words."),
  source: z
    .enum(["material", "proposed"])
    .describe(
      '"material" if these words appear in the presenter\'s source material, quoted verbatim; "proposed" if you wrote it because the material had none'
    ),
});

export const ActSchema = z.object({
  headline: z.string().describe("One line a presenter could say aloud that makes this act's point: a claim with a verb, never a product name, tagline or label"),
  soundbite: SoundbiteSchema.describe(
    "The phrase the audience could repeat afterwards. WHY: the problem in a phrase. HOW: the insight or solution in a phrase. WHAT: the closing image or headline."
  ),
  coreMessage: z.string().describe("One or two sentences: the single thing the audience must take from this act"),
  supportingPoints: z
    .array(z.string())
    .describe("Two to four points drawn only from the source material"),
});

export const KindSchema = z.enum(KIND_KEYS);

export const HeroSchema = z.object({
  who: z.string().describe("The hero of this story: the audience, named as the people in the room. One line."),
  wants: z.string().describe("What they want: their yearning, in one line, in their terms."),
  obstacle: z.string().describe("What stands in the way: the obstacle Act 1 shows, in one line."),
});

export const StorySchema = z.object({
  kind: KindSchema.describe(
    "The kind of presentation this story follows. The presenter's choice if they made one; otherwise the likeliest kind for this material."
  ),
  audience: z.object({
    who: z.string().describe("Who the audience is, in one line"),
    needToHear: z.string().describe("What they need or want to hear, in one or two lines"),
    doNotNeedToHear: z
      .string()
      .describe("What they do not need to hear and should be left out, in one line"),
  }),
  hero: HeroSchema.describe("The audience is the hero; the presenter is the faithful friend. What they want and what stands in the way."),
  intent: z
    .string()
    .describe(
      'Statement of intent, no more than two lines, beginning "After my presentation, the audience will"'
    ),
  argument: z.string().describe("The argument of the presentation in one plain sentence"),
  bigIdea: z
    .string()
    .describe("The soundbite: the one phrase the audience will carry out of the room. Under twelve words, or up to twenty when it is the presenter's own line quoted word for word."),
  why: ActSchema,
  how: ActSchema,
  what: ActSchema,
  gaps: z
    .array(z.string())
    .describe(
      "Up to three things the story needs that the source material does not supply, written as coaching, not as errors. Empty if none."
    ),
});

export type Story = z.infer<typeof StorySchema>;

/** A story coming back from the browser or the database. Stories made before 1 October lack a kind and a hero. */
export const EMPTY_HERO = { who: "", wants: "", obstacle: "" };
export const StoryInputSchema = StorySchema.extend({
  kind: KindSchema.catch("other").default("other"),
  hero: HeroSchema.default(EMPTY_HERO),
});

// Stage two: Make it land and stick (Worksheet 2).
// Prologue, signposts, visuals, epilogue, five-line story.

export const LandingActSchema = z.object({
  signpost: z
    .string()
    .describe("A natural spoken sentence that tells the audience the important idea has arrived"),
  visualIdea: z
    .string()
    .describe(
      "One slide or visual that illustrates rather than explains. If no visual would help, say so plainly."
    ),
});

export const LandingSchema = z.object({
  prologue: z
    .string()
    .describe(
      "The golden first minute, written as spoken words: states the Big Idea, establishes why it matters and why now, sets expectations and says what is needed from the audience. Under 150 words."
    ),
  why: LandingActSchema,
  how: LandingActSchema,
  what: LandingActSchema,
  epilogue: z
    .string()
    .describe(
      "The ending, written as spoken words: reinforces the Big Idea, reconnects with the audience's need, states what they should think, feel or do next, and bookends the prologue. Under 120 words."
    ),
  fiveLineStory: z.object({
    prologue: z.string(),
    why: z.string(),
    how: z.string(),
    what: z.string(),
    epilogue: z.string(),
  }),
  titleSlide: z.string().describe("Words on the title slide: the Big Idea, word for word."),
  closingSlide: z.string().describe("Words on the closing slide: the Big Idea, word for word, as the last line of the epilogue."),
  speechNotes: z
    .object({
      prologue: z.array(z.string()),
      why: z.array(z.string()),
      how: z.array(z.string()),
      what: z.array(z.string()),
      epilogue: z.array(z.string()),
    })
    .describe(
      "Speech notes for the presenter to hold: three to five cues per beat, each ten words or fewer, memory hooks rather than sentences, in the order they are said."
    ),
  gaps: z
    .array(z.string())
    .describe(
      "Gaps re-assessed against the finished story: only what the presenter alone can supply. Empty if nothing is missing."
    ),
});

export type Landing = z.infer<typeof LandingSchema>;

/** A landing coming back from the browser or the database. Older ones lack the two slide lines. */
const EMPTY_NOTES = { prologue: [], why: [], how: [], what: [], epilogue: [] };
export const LandingInputSchema = LandingSchema.extend({
  titleSlide: z.string().default(""),
  closingSlide: z.string().default(""),
  speechNotes: LandingSchema.shape.speechNotes.default(EMPTY_NOTES),
});

export const RegisterSchema = z.enum(["formal", "business", "conversational"]).default("business");

// Ask back: up to three questions before the story is written.

export const AnswerSchema = z.object({
  question: z.string().max(300),
  answer: z.string().max(1500, "Keep each answer to a short paragraph."),
});

export const QuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string().describe("One short question, under twenty words."),
        example: z.string().describe("A short example answer the presenter could adapt, from their material where possible."),
      })
    )
    .max(2)
    .describe("At most two questions. Empty when the answers and the material are enough."),
});

export type Question = z.infer<typeof QuestionsSchema>["questions"][number];

export const QuestionsRequestSchema = z.object({
  notes: z.string().min(40, "Paste at least a few lines of notes").max(60000, "That is more than StoryMachine can read at once. Cut anything that is not part of this story."),
  audience: z.string().max(4000).optional().default(""),
  intent: z.string().max(4000).optional().default(""),
  kind: KindSchema.optional(),
  storyId: z.string().uuid().optional(),
});

export const StoryRequestSchema = z.object({
  notes: z.string().min(40, "Paste at least a few lines of notes").max(60000, "That is more than StoryMachine can read at once. Cut anything that is not part of this story."),
  audience: z.string().max(4000, "Keep each answer about your audience to a short paragraph.").optional().default(""),
  intent: z.string().max(4000, "Keep your objective and your message to a short paragraph each.").optional().default(""),
  register: RegisterSchema,
  /** The kind of presentation. Absent: the StoryMachine picks the likeliest and says so. */
  kind: KindSchema.optional(),
  /** Rework an existing story rather than start a new one. */
  storyId: z.string().uuid().optional(),
  /** The presenter's answers to the ask-back questions. Blank answers are skipped questions. */
  answers: z.array(AnswerSchema).max(3).optional().default([]),
});

export const LandRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StoryInputSchema,
  register: RegisterSchema,
  /** The saved story to unlock for stage 2. */
  storyId: z.string().uuid().optional(),
});

// The ending, rewritten after the Big Idea has changed. Only the parts that carry the Big Idea at the close.

export const EndingRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StoryInputSchema,
  landing: LandingInputSchema,
  register: RegisterSchema,
});

export const EndingSchema = z.object({
  epilogue: LandingSchema.shape.epilogue,
  fiveLineEpilogue: z.string().describe("The Epilogue's line in the story in five lines."),
  epilogueNotes: z
    .array(z.string())
    .describe("Three to five speech-note cues for the Epilogue, each ten words or fewer, written as what the audience hears."),
});

// Contextual edit

export const EditRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StoryInputSchema,
  landing: LandingInputSchema.optional(),
  register: RegisterSchema,
  path: z.string().min(1).max(80),
  current: z.union([z.string(), z.array(z.string())]),
  action: z.enum(["sharper", "simpler", "provocative", "senior", "another", "memorable", "clearer", "custom"]),
  instruction: z.string().max(600).optional().default(""),
  /** The saved story, so a free story's AI edits can be counted. */
  storyId: z.string().uuid().optional(),
});

export const EditTextSchema = z.object({ value: z.string() });
export const EditListSchema = z.object({ items: z.array(z.string()) });

// Refine conversation

export const RefineMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

export const RefineRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StoryInputSchema,
  landing: LandingInputSchema.optional(),
  register: RegisterSchema,
  messages: z.array(RefineMessageSchema).min(1).max(30),
  /** The saved story, so a free story's Refine turns can be counted with its edits. */
  storyId: z.string().uuid().optional(),
});

export const RefineStoryResultSchema = z.object({
  reply: z.string(),
  story: StorySchema,
});

export const RefineFullResultSchema = z.object({
  reply: z.string(),
  story: StorySchema,
  landing: LandingSchema,
});


// Rhetoric: the devices in the finished story, and where one would help.
// Since 18 October each note belongs to one line of the story and is shown under it (John Zimmer's change):
// at most three devices already there and three suggestions. Older stories have notes without a path.

export const RHETORIC_PATHS = [
  "bigIdea",
  "landing.prologue",
  "why.headline", "why.coreMessage", "why.soundbite.text", "landing.why.signpost",
  "how.headline", "how.coreMessage", "how.soundbite.text", "landing.how.signpost",
  "what.headline", "what.coreMessage", "what.soundbite.text", "landing.what.signpost",
  "landing.epilogue",
] as const;
export type RhetoricPath = (typeof RHETORIC_PATHS)[number];

const DEVICE_NAME = "The device's name: Tricolon, Anaphora, Epistrophe, Alliteration, Antithesis, Rhetorical question, Metaphor, Analogy, Chiasmus or Callback.";
const DEVICE_WHAT = "One plain sentence saying what the device is, for someone who has never heard its name. For example: \"A tricolon is a list of three: three words, phrases or ideas in a row.\"";

const deviceGen = z.object({
  device: z.string().describe(DEVICE_NAME),
  what: z.string().describe(DEVICE_WHAT),
  path: z.enum(RHETORIC_PATHS).describe("The line it is in."),
  line: z.string().describe("The words, quoted exactly as they appear in that line."),
  source: z.enum(["yours", "added"]).describe('"yours" if the words come from the presenter\'s material; "added" if the StoryMachine wrote them.'),
  note: z.string().describe("One sentence: why it works for this audience."),
});
const suggestionGen = z.object({
  device: z.string().describe(DEVICE_NAME),
  what: z.string().describe(DEVICE_WHAT),
  path: z.enum(RHETORIC_PATHS).describe("The line to strengthen. Never a line that already uses a device."),
  now: z.string().describe("The line as it stands."),
  better: z.string().describe("The line rewritten to use the device. Same facts and numbers."),
  note: z.string().describe("One sentence: why the device makes this line stronger."),
});

/** What the model returns. */
export const RhetoricGenSchema = z.object({
  devices: z.array(deviceGen).max(3).describe("At most three devices already in the story, the strongest first."),
  suggestions: z.array(suggestionGen).max(3).describe("At most three lines where a device would help."),
});

/** What is stored and shown. Older notes have no path or "what"; they are shown as a list. */
export const RhetoricSchema = z.object({
  devices: z
    .array(
      deviceGen.extend({
        what: z.string().optional(),
        path: z.string().optional(),
        where: z.string().default(""),
      })
    )
    .max(6),
  suggestions: z
    .array(
      suggestionGen.extend({
        what: z.string().optional(),
        path: z.string().optional(),
        note: z.string().optional(),
        where: z.string().default(""),
      })
    )
    .max(3),
});

export type Rhetoric = z.infer<typeof RhetoricSchema>;

export const RhetoricRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StoryInputSchema,
  landing: LandingInputSchema.optional(),
  storyId: z.string().uuid(),
});
