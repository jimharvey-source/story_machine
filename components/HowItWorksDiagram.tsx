"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

// "How StoryMachine works" in one picture (Jim, 23 October 2026). The master is the design canvas
// "StoryMachine: how it works diagram"; this is the same drawing for the landing page, animated:
// when it scrolls into view the inputs arrive, the lines draw left to right through the two steps and the
// mark, the outputs arrive, then small dots keep flowing through the pipeline. Reduced motion: drawn still.
// Phones get the same story stacked top to bottom.

const INK = "#161513";
const MUTED = "#6a6761";
const LINE = "#8a8680";
const RED = "#b3261e";
const SUNK = "#efeeeb";
const SOFT = "#f7e8e6";
const RULE = "#d9d6d0";

const INPUTS = ["Your notes", "Old slides and decks", "Reports and papers", "Photos and screenshots", "Who is in the room"];
const OUTPUTS = [
  "Your Big Idea",
  "A three-act story",
  "A strong start in 60 seconds",
  "A clear, confident ending",
  "Speaker notes",
  "More powerful language",
];
const STEP_1 = ["Answer a few simple", "questions about your", "audience and your goal"];
const STEP_2 = ["Sharpen every element", "of your presentation", "until it’s perfect"];

// Geometry, in the drawing's own units (1488 x 470), taken from the canvas.
const CY = 225;
const IN_Y = [73, 149, 225, 301, 377];
const OUT_Y = [60, 126, 192, 258, 324, 390];
const IN_X = 0; // input cards 0..280
const BUS_IN = 328;
const S1 = [376, 606]; // step 1 box
const HUB = { cx: 754, r: 100 };
const S2 = [902, 1132]; // step 2 box
const BUS_OUT = 1180;
const OUT_X = 1228; // output cards 1228..1488

// The routes the dots travel: each input to step 1, step 1 to the mark, the mark to step 2, step 2 to each output.
const inRoute = (y: number) => `M ${IN_X + 280} ${y} H ${BUS_IN} V ${CY} H ${S1[0] - 4}`;
const outRoute = (y: number) => `M ${S2[1]} ${CY} H ${BUS_OUT} V ${y} H ${OUT_X - 4}`;
const MID_1 = `M ${S1[1]} ${CY} H ${HUB.cx - HUB.r - 4}`;
const MID_2 = `M ${HUB.cx + HUB.r} ${CY} H ${S2[0] - 4}`;

const QUOTE =
  "M23.92 32.05Q27.18 32.05 28.92 33.84Q30.66 35.63 30.66 38.73Q30.66 42.14 28.33 44.27Q26.01 46.40 22.76 46.40Q18.94 46.40 16.45 43.66Q13.96 40.93 13.96 35.60Q13.96 31.28 15.46 27.75Q16.97 24.22 19.73 21.69Q22.50 19.17 26.24 17.91Q28.12 17.27 29.26 17.97Q30.41 18.68 30.61 20.01Q30.82 21.17 30.20 21.99Q29.57 22.81 27.93 23.47Q25.71 24.32 24.19 25.48Q22.67 26.64 21.91 27.89Q21.14 29.15 21.14 30.35Q21.14 31.15 21.54 31.60Q21.93 32.05 22.93 32.05ZM43.30 32.05Q46.55 32.05 48.30 33.84Q50.04 35.63 50.04 38.73Q50.04 42.14 47.71 44.27Q45.38 46.40 42.14 46.40Q38.32 46.40 35.83 43.66Q33.34 40.93 33.34 35.60Q33.34 31.28 34.84 27.75Q36.35 24.22 39.11 21.69Q41.87 19.17 45.62 17.91Q47.50 17.27 48.64 17.97Q49.78 18.68 49.99 20.01Q50.20 21.17 49.57 21.99Q48.95 22.81 47.30 23.47Q45.09 24.32 43.57 25.48Q42.05 26.64 41.28 27.89Q40.52 29.15 40.52 30.35Q40.52 31.15 40.91 31.60Q41.31 32.05 42.30 32.05Z";

function useInView<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return { ref, seen };
}

const REDUCED = "(prefers-reduced-motion: reduce)";
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(REDUCED);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

/** A line that draws itself after `delay` seconds. pathLength="1" lets one dash cover any length. */
function Draw({ d, stroke, delay }: { d: string; stroke: string; delay: number }) {
  return (
    <path
      d={d}
      pathLength={1}
      className="hiw-draw"
      style={{ ["--d" as string]: `${delay}s` }}
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** The arrowhead at a line's tip, shown once the line has drawn. */
function Tip({ x, y, head, delay, dir = "right" }: { x: number; y: number; head: string; delay: number; dir?: "right" | "left" | "down" }) {
  const d = dir === "left" ? `M ${x + 6} ${y} H ${x}` : dir === "down" ? `M ${x} ${y - 6} V ${y}` : `M ${x - 6} ${y} H ${x}`;
  return (
    <path
      d={d}
      className="hiw-fade"
      style={{ ["--d" as string]: `${delay}s` }}
      fill="none"
      stroke="transparent"
      strokeWidth={2}
      markerEnd={`url(#${head})`}
    />
  );
}

/** A dot that rides a route for ever, starting `begin` seconds after the drawing finishes. */
function Dot({ route, fill, begin, dur }: { route: string; fill: string; begin: number; dur: number }) {
  return (
    <circle r={4} fill={fill} opacity={0}>
      <animateMotion path={route} dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" calcMode="linear" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur={`${dur}s`} begin={`${begin}s`} repeatCount="indefinite" />
    </circle>
  );
}

// The phone layout, in its own units (360 wide). Two columns of cards either side of a spine at x = 180.
const P = { L: [0, 156], R: [204, 360], SPINE: 180 };
const P_IN: Array<{ lines: string[]; col: 0 | 1; y: number }> = [
  { lines: ["Your notes"], col: 0, y: 66 },
  { lines: ["Old slides", "and decks"], col: 1, y: 66 },
  { lines: ["Reports", "and papers"], col: 0, y: 124 },
  { lines: ["Photos and", "screenshots"], col: 1, y: 124 },
  { lines: ["Who is in", "the room"], col: 0, y: 182 },
];
const P_OUT: Array<{ lines: string[]; col: 0 | 1; y: number }> = [
  { lines: ["Your Big Idea"], col: 0, y: 662 },
  { lines: ["A three-act story"], col: 1, y: 662 },
  { lines: ["A strong start", "in 60 seconds"], col: 0, y: 720 },
  { lines: ["A clear, confident", "ending"], col: 1, y: 720 },
  { lines: ["Speaker notes"], col: 0, y: 778 },
  { lines: ["More powerful", "language"], col: 1, y: 778 },
];
const P_S1 = { top: 226, bottom: 290 };
const P_HUB = { cy: 366, r: 50 };
const P_S2 = { top: 532, bottom: 596 };
const edge = (col: 0 | 1) => (col === 0 ? P.L[1] : P.R[0]);
const pInRoute = (c: { col: 0 | 1; y: number }) => `M ${edge(c.col)} ${c.y} H ${P.SPINE} V ${P_S1.top - 4}`;
const pOutRoute = (c: { col: 0 | 1; y: number }) =>
  `M ${P.SPINE} ${P_S2.bottom} V ${c.y} H ${c.col === 0 ? P.L[1] + 4 : P.R[0] - 4}`;
const P_MID_1 = `M ${P.SPINE} ${P_S1.bottom} V ${P_HUB.cy - P_HUB.r - 4}`;
const P_MID_2 = `M ${P.SPINE} ${P_HUB.cy + P_HUB.r + 92} V ${P_S2.top - 4}`;

function PhoneCard({ c, fill, delay }: { c: { lines: string[]; col: 0 | 1; y: number }; fill: string; delay: number }) {
  const [x0, x1] = c.col === 0 ? P.L : P.R;
  return (
    <g className="hiw-pop" style={{ ["--d" as string]: `${delay}s` }}>
      <rect x={x0} y={c.y - 25} width={x1 - x0} height={50} rx={12} fill={fill} />
      {c.lines.map((l, k) => (
        <text key={l} x={x0 + 14} y={c.y + 5 + (k - (c.lines.length - 1) / 2) * 18} fontSize={14.5} fontWeight={600} fill={INK}>
          {l}
        </text>
      ))}
    </g>
  );
}

function PhoneDiagram({ play }: { play: boolean }) {
  const FLOW = 3.0;
  const label = { paintOrder: "stroke", stroke: "#f5f4f2", strokeWidth: 8, strokeLinejoin: "round" } as const;
  return (
    <svg
      viewBox="-2 0 364 812"
      className="block w-full md:hidden"
      role="img"
      aria-label="Input everything you've got: your notes, old slides and decks, reports and papers, photos and screenshots, and who is in the room. Answer a few simple questions about your audience and your goal. StoryMachine. Sharpen every element of your presentation until it's perfect. Output a fully worked presentation: your Big Idea, a three-act story, a strong start in 60 seconds, a clear, confident ending, speaker notes and more powerful language."
      style={{ fontFamily: "'Instrument Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" }}
    >
      <defs>
        {[["hiwp-g", LINE], ["hiwp-k", INK], ["hiwp-r", RED]].map(([id, c]) => (
          <marker key={id} id={id} orient="auto" markerWidth="5" markerHeight="5" refX="2" refY="2" overflow="visible">
            <path d="M0 0 L4 2 L0 4 Z" fill={c} />
          </marker>
        ))}
      </defs>

      <text x={0} y={22} fontSize={15} fontWeight={600} fill={RED} className="hiw-fade" style={{ ["--d" as string]: "0s" }}>
        Input everything you&rsquo;ve got
      </text>

      {P_IN.map((c, i) => (
        <Draw key={`pil${i}`} d={pInRoute(c)} stroke={LINE} delay={0.5 + i * 0.08} />
      ))}
      <Tip x={P.SPINE} y={P_S1.top - 4} head="hiwp-g" delay={1.2} dir="down" />
      <Draw d={P_MID_1} stroke={INK} delay={1.5} />
      <Tip x={P.SPINE} y={P_HUB.cy - P_HUB.r - 4} head="hiwp-k" delay={1.8} dir="down" />
      <Draw d={P_MID_2} stroke={INK} delay={2.0} />
      <Tip x={P.SPINE} y={P_S2.top - 4} head="hiwp-k" delay={2.3} dir="down" />
      {P_OUT.map((c, i) => (
        <Draw key={`pol${i}`} d={pOutRoute(c)} stroke={RED} delay={2.4 + i * 0.08} />
      ))}
      {P_OUT.map((c, i) => (
        <Tip key={`pot${i}`} x={c.col === 0 ? P.L[1] + 4 : P.R[0] - 4} y={c.y} head="hiwp-r" delay={3.0 + i * 0.08} dir={c.col === 0 ? "left" : "right"} />
      ))}

      {P_IN.map((c, i) => (
        <PhoneCard key={c.lines.join(" ")} c={c} fill={SUNK} delay={i * 0.08} />
      ))}

      <g className="hiw-pop" style={{ ["--d" as string]: "1.1s" }}>
        <rect x={24} y={P_S1.top} width={312} height={P_S1.bottom - P_S1.top} rx={12} fill="#fff" stroke={RULE} />
        <text x={180} y={P_S1.top + 28} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK}>Answer a few simple questions</text>
        <text x={180} y={P_S1.top + 48} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK}>about your audience and your goal</text>
      </g>

      <g className="hiw-hub" style={{ ["--d" as string]: "1.7s", transformOrigin: `${P.SPINE}px ${P_HUB.cy}px` }}>
        <circle className="hiw-pulse" cx={P.SPINE} cy={P_HUB.cy} r={P_HUB.r} fill="none" stroke={RED} strokeWidth={2} />
        <circle cx={P.SPINE} cy={P_HUB.cy} r={P_HUB.r} fill={RED} />
        <svg x={P.SPINE - 33} y={P_HUB.cy - 33} width={66} height={66} viewBox="10 10 44 44" aria-hidden="true">
          <path d={QUOTE} fill="#fff" />
        </svg>
        <text x={P.SPINE} y={P_HUB.cy + P_HUB.r + 24} textAnchor="middle" fontSize={12.5} fill={MUTED}>Jim Harvey&rsquo;s</text>
        <text x={P.SPINE} y={P_HUB.cy + P_HUB.r + 50} textAnchor="middle" fontSize={24} fontWeight={600} fill={INK} letterSpacing="-0.02em">StoryMachine</text>
        <text x={P.SPINE} y={P_HUB.cy + P_HUB.r + 74} textAnchor="middle" fontSize={16} fill={INK} style={{ fontFamily: "Fraunces, Georgia, serif" }}>Story first. Then slides.</text>
      </g>

      <g className="hiw-pop" style={{ ["--d" as string]: "2.1s" }}>
        <rect x={24} y={P_S2.top} width={312} height={P_S2.bottom - P_S2.top} rx={12} fill="#fff" stroke={RED} strokeWidth={1.5} />
        <text x={180} y={P_S2.top + 28} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK}>Sharpen every element of your</text>
        <text x={180} y={P_S2.top + 48} textAnchor="middle" fontSize={15} fontWeight={600} fill={INK}>presentation until it&rsquo;s perfect</text>
      </g>

      <text x={180} y={P_S2.bottom + 31} textAnchor="middle" fontSize={15} fontWeight={600} fill={RED} className="hiw-fade" style={{ ["--d" as string]: "2.5s", ...label }}>
        Output a fully worked presentation
      </text>

      {P_OUT.map((c, i) => (
        <PhoneCard key={c.lines.join(" ")} c={c} fill={SOFT} delay={2.7 + i * 0.08} />
      ))}

      {play && (
        <g aria-hidden="true">
          {P_IN.map((c, i) => (
            <Dot key={`pid${i}`} route={pInRoute(c)} fill={LINE} begin={FLOW + i * 0.5} dur={1.8} />
          ))}
          <Dot route={P_MID_1} fill={INK} begin={FLOW + 1.4} dur={0.9} />
          <Dot route={P_MID_2} fill={INK} begin={FLOW + 2.0} dur={0.9} />
          {P_OUT.map((c, i) => (
            <Dot key={`pod${i}`} route={pOutRoute(c)} fill={RED} begin={FLOW + 2.4 + i * 0.4} dur={1.8} />
          ))}
        </g>
      )}
    </svg>
  );
}

export function HowItWorksDiagram() {
  const { ref, seen } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const state = reduced ? "still" : seen ? "play" : "wait";
  const FLOW = 3.2; // seconds before the dots start

  return (
    <section className="mt-20 border-t border-rule pt-16 sm:mt-28" aria-labelledby="hiw-title">
      <p className="eyebrow">How StoryMachine works</p>
      <h2 id="hiw-title" className="display mt-3 max-w-4xl text-3xl leading-tight sm:text-[2.6rem]">
        StoryMachine takes your thinking and turns it into a finished presentation.
      </h2>

      <div ref={ref} className="hiw mt-12" data-state={state}>
        {/* Wide screens: the drawing */}
        <svg
          viewBox="-8 -40 1504 520"
          className="hidden w-full md:block"
          role="img"
          aria-label="Input everything you've got: your notes, old slides and decks, reports and papers, photos and screenshots, and who is in the room. Answer a few simple questions about your audience and your goal. StoryMachine. Sharpen every element of your presentation until it's perfect. Output a fully worked presentation: your Big Idea, a three-act story, a strong start in 60 seconds, a clear, confident ending, speaker notes and more powerful language."
          style={{ fontFamily: "'Instrument Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" }}
        >
          <defs>
            {[["hiw-g", LINE], ["hiw-k", INK], ["hiw-r", RED]].map(([id, c]) => (
              <marker key={id} id={id} orient="auto" markerWidth="5" markerHeight="5" refX="2" refY="2" overflow="visible">
                <path d="M0 0 L4 2 L0 4 Z" fill={c} />
              </marker>
            ))}
          </defs>

          <text x={0} y={-14} fontSize={16} fontWeight={600} fill={RED} className="hiw-fade" style={{ ["--d" as string]: "0s" }}>
            Input everything you&rsquo;ve got
          </text>
          <text x={1488} y={-14} textAnchor="end" fontSize={16} fontWeight={600} fill={RED} className="hiw-fade" style={{ ["--d" as string]: "2.3s" }}>
            Output a fully worked presentation
          </text>

          {/* Lines first, so cards sit over their ends */}
          {IN_Y.map((y, i) => (
            <Draw key={`il${i}`} d={inRoute(y)} stroke={LINE} delay={0.5 + i * 0.08} />
          ))}
          <Tip x={S1[0] - 4} y={CY} head="hiw-g" delay={1.2} />
          <Draw d={MID_1} stroke={INK} delay={1.5} />
          <Tip x={HUB.cx - HUB.r - 4} y={CY} head="hiw-k" delay={1.9} />
          <Draw d={MID_2} stroke={INK} delay={2.0} />
          <Tip x={S2[0] - 4} y={CY} head="hiw-k" delay={2.4} />
          {OUT_Y.map((y, i) => (
            <Draw key={`ol${i}`} d={outRoute(y)} stroke={RED} delay={2.3 + i * 0.08} />
          ))}
          {OUT_Y.map((y, i) => (
            <Tip key={`ot${i}`} x={OUT_X - 4} y={y} head="hiw-r" delay={3.0 + i * 0.08} />
          ))}

          {/* Inputs */}
          {INPUTS.map((t, i) => (
            <g key={t} className="hiw-pop" style={{ ["--d" as string]: `${i * 0.08}s` }}>
              <rect x={IN_X} y={IN_Y[i] - 28} width={280} height={56} rx={14} fill={SUNK} />
              <text x={IN_X + 20} y={IN_Y[i] + 6} fontSize={18} fontWeight={600} fill={INK}>
                {t}
              </text>
            </g>
          ))}

          {/* Step 1 */}
          <g className="hiw-pop" style={{ ["--d" as string]: "1.1s" }}>
            <rect x={S1[0]} y={CY - 60} width={S1[1] - S1[0]} height={120} rx={14} fill="#fff" stroke={RULE} />
            {STEP_1.map((l, k) => (
              <text key={l} x={(S1[0] + S1[1]) / 2} y={CY - 18 + k * 24} textAnchor="middle" fontSize={17} fontWeight={600} fill={INK}>
                {l}
              </text>
            ))}
          </g>

          {/* The mark */}
          <g className="hiw-hub" style={{ ["--d" as string]: "1.7s", transformOrigin: `${HUB.cx}px ${CY}px` }}>
            <circle className="hiw-pulse" cx={HUB.cx} cy={CY} r={HUB.r} fill="none" stroke={RED} strokeWidth={2} />
            <circle cx={HUB.cx} cy={CY} r={HUB.r} fill={RED} />
            <svg x={HUB.cx - 64} y={CY - 64} width={128} height={128} viewBox="10 10 44 44" aria-hidden="true">
              <path d={QUOTE} fill="#fff" />
            </svg>
            <text x={HUB.cx} y={CY + HUB.r + 42} textAnchor="middle" fontSize={15} fill={MUTED}>
              Jim Harvey&rsquo;s
            </text>
            <text x={HUB.cx} y={CY + HUB.r + 78} textAnchor="middle" fontSize={32} fontWeight={600} fill={INK} letterSpacing="-0.02em">
              StoryMachine
            </text>
            <text x={HUB.cx} y={CY + HUB.r + 112} textAnchor="middle" fontSize={21} fill={INK} style={{ fontFamily: "Fraunces, Georgia, serif" }}>
              Story first. Then slides.
            </text>
          </g>

          {/* Step 2 */}
          <g className="hiw-pop" style={{ ["--d" as string]: "2.1s" }}>
            <rect x={S2[0]} y={CY - 60} width={S2[1] - S2[0]} height={120} rx={14} fill="#fff" stroke={RED} strokeWidth={1.5} />
            {STEP_2.map((l, k) => (
              <text key={l} x={(S2[0] + S2[1]) / 2} y={CY - 18 + k * 24} textAnchor="middle" fontSize={17} fontWeight={600} fill={INK}>
                {l}
              </text>
            ))}
          </g>

          {/* Outputs */}
          {OUTPUTS.map((t, i) => (
            <g key={t} className="hiw-pop" style={{ ["--d" as string]: `${2.6 + i * 0.08}s` }}>
              <rect x={OUT_X} y={OUT_Y[i] - 26} width={260} height={52} rx={14} fill={SOFT} />
              <text x={OUT_X + 18} y={OUT_Y[i] + 6} fontSize={17} fontWeight={600} fill={INK}>
                {t}
              </text>
            </g>
          ))}

          {/* The flow: only once the drawing has played, never with reduced motion */}
          {state === "play" && (
            <g aria-hidden="true">
              {IN_Y.map((y, i) => (
                <Dot key={`id${i}`} route={inRoute(y)} fill={LINE} begin={FLOW + i * 0.55} dur={2.2} />
              ))}
              <Dot route={MID_1} fill={INK} begin={FLOW + 1.6} dur={1.1} />
              <Dot route={MID_2} fill={INK} begin={FLOW + 2.2} dur={1.1} />
              {OUT_Y.map((y, i) => (
                <Dot key={`od${i}`} route={outRoute(y)} fill={RED} begin={FLOW + 2.6 + i * 0.45} dur={2.2} />
              ))}
            </g>
          )}
        </svg>

        {/* Phones: the same drawing turned upright, so it reads top to bottom at full width (Jim, 23 October). */}
        <PhoneDiagram play={state === "play"} />
      </div>
    </section>
  );
}
