// Renders a sample story PDF from a JSON file, for checking the layout: npx tsx scripts/pdf-sample.ts in.json out.pdf
import { readFileSync, writeFileSync } from "node:fs";
import { LandingInputSchema, RhetoricSchema, StoryInputSchema } from "../lib/schema";
import { renderPdf } from "../lib/exportPdf";

const [, , input, output] = process.argv;
const d = JSON.parse(readFileSync(input, "utf8"));
const story = StoryInputSchema.parse(d.story);
const landing = d.landing ? LandingInputSchema.parse(d.landing) : null;
const rhetoric = d.rhetoric ? RhetoricSchema.parse(d.rhetoric) : null;
renderPdf(d.title, story, landing, rhetoric).then((b) => writeFileSync(output, b));
