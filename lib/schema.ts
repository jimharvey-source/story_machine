import { z } from "zod";

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

export const StorySchema = z.object({
  audience: z.object({
    who: z.string().describe("Who the audience is, in one line"),
    needToHear: z.string().describe("What they need or want to hear, in one or two lines"),
    doNotNeedToHear: z
      .string()
      .describe("What they do not need to hear and should be left out, in one line"),
  }),
  intent: z
    .string()
    .describe(
      'Statement of intent, no more than two lines, beginning "After my presentation, the audience will"'
    ),
  argument: z.string().describe("The argument of the presentation in one plain sentence"),
  bigIdea: z
    .string()
    .describe("The soundbite: the one phrase the audience will carry out of the room. Under twelve words."),
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
  titleSlide: z.string().describe("Words on the title slide: the Big Idea or a shorter form of it, eight words or fewer."),
  closingSlide: z.string().describe("Words on the closing slide: the line the audience leaves with, eight words or fewer."),
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

export const StoryRequestSchema = z.object({
  notes: z.string().min(40, "Paste at least a few lines of notes").max(60000),
  audience: z.string().max(400).optional().default(""),
  intent: z.string().max(400).optional().default(""),
  register: RegisterSchema,
  /** Rework an existing story rather than start a new one. */
  storyId: z.string().uuid().optional(),
});

export const LandRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StorySchema,
  register: RegisterSchema,
});

// Contextual edit

export const EditRequestSchema = z.object({
  notes: z.string().min(40).max(60000),
  story: StorySchema,
  landing: LandingInputSchema.optional(),
  register: RegisterSchema,
  path: z.string().min(1).max(80),
  current: z.union([z.string(), z.array(z.string())]),
  action: z.enum(["sharper", "simpler", "provocative", "senior", "another", "memorable", "clearer", "custom"]),
  instruction: z.string().max(600).optional().default(""),
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
  story: StorySchema,
  landing: LandingInputSchema.optional(),
  register: RegisterSchema,
  messages: z.array(RefineMessageSchema).min(1).max(30),
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
