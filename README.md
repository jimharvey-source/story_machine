# Jim's Three Act Story Machine

Turns rough notes into a clear, memorable presentation story:
Prologue, Act 1 WHY, Act 2 HOW, Act 3 WHAT, Epilogue.

Stage one (Get your story straight): POST /api/story
Stage two (Make it land and stick): POST /api/land

Next.js, TypeScript, Tailwind, Anthropic SDK with structured outputs.
Secrets live in Vercel environment variables: ANTHROPIC_API_KEY, ANTHROPIC_MODEL.

The prompts are in lib/prompts.ts. The writing rules are enforced in lib/voice.ts.
