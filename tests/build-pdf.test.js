#!/usr/bin/env node
// Extracts the PDF builder out of resume-fit-check.html and checks what the
// layout has to guarantee: the export is always one page; a section title sits
// just above its rule; and when content has to go, it is the bullet that speaks
// least to the posting, never the tail of the page.
// Needs pdf-lib (npm i pdf-lib@1.17.1); skips cleanly if it isn't installed.
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

let PDFLib;
try { PDFLib = require("pdf-lib"); }
catch { console.log("SKIP: pdf-lib not installed (npm i pdf-lib@1.17.1)"); process.exit(0); }
const { PDFDocument, StandardFonts, PDFName } = PDFLib;

const htmlPath = path.join(__dirname, "..", "resume-fit-check.html");
const html = fs.readFileSync(htmlPath, "utf8");

const cut = (start, end) => {
  const i = html.indexOf(start);
  if (i < 0) throw new Error("marker not found: " + start);
  const j = html.indexOf(end, i);
  if (j < 0) throw new Error("marker not found: " + end);
  return html.slice(i, j);
};

const JD = `Software Engineer. Required: Java and Spring, React and TypeScript on the front end,
SQL databases, automated testing, CI pipelines, observability. Preferred: Docker, Kubernetes, AWS.`;
const ANALYSIS = {
  requirements: [
    { requirement: "Java and Spring services", type: "required", verdict: "STRONG" },
    { requirement: "React and TypeScript front end", type: "required", verdict: "PARTIAL" },
    { requirement: "SQL databases", type: "required", verdict: "STRONG" },
    { requirement: "Automated testing and CI", type: "preferred", verdict: "PARTIAL" },
  ],
  missing_keywords: ["Kubernetes", "observability"],
};

// The page's own globals, as the builder expects to find them.
global.window = { PDFLib: { PDFDocument, StandardFonts, PDFName, PDFString: PDFLib.PDFString } };
const preamble = `const jdEl = { value: ${JSON.stringify(JD)} };\nlet lastAnalysis = ${JSON.stringify(ANALYSIS)};\n`;
const buildPdfBlob = new Function(
  "loadScript",
  preamble + cut("  // The PDF export is always exactly one page", "  (async () => {") + "\nreturn buildPdfBlob;"
)(async () => {});

// Bullets the posting rewards, and filler it does not. Same length either way,
// so length alone can't be what decides.
const STRONG = [
  "Built Java and Spring services backing a React and TypeScript client, cutting p95 latency by 40 percent.",
  "Designed the SQL schema and query layer for a 2 million row dataset, dropping report time from 30s to 4s.",
  "Added automated testing and a CI pipeline with observability dashboards, catching 12 regressions pre-release.",
];
const FILLER = [
  "Attended recurring team meetings and helped out with assorted tasks whenever they came up during the week.",
  "Participated in general discussions about priorities and supported colleagues with their day to day items.",
  "Helped keep shared notes tidy and followed up on assorted loose ends as they surfaced across the group.",
];
const entry = (bullets) => ({
  org: "Some Company, Inc.", dates: "Jul 2024 - Present",
  line: "Software Engineer", location: "City, ST",
  tech: "Java, Spring, React, TypeScript, SQL",
  bullets,
});
const resume = (entries) => ({
  name: "Test Person",
  tagline: "Software Engineer",
  contact: ["City, ST", "test@example.com", "(000) 000-0000", "linkedin.com/in/test"],
  sections: [
    { title: "Summary", paragraph: "Engineer across backend services, test automation, and data pipelines. ".repeat(3) },
    { title: "Education", entries: [{ org: "State University", dates: "Jun 2026", line: "B.S. Computer Science", location: "City, ST", bullets: [] }] },
    { title: "Work Experience", entries },
    { title: "Skills", pairs: [{ label: "Languages", text: "Java, TypeScript, Python, SQL" }] },
  ],
});
// Long enough that it cannot fit, with both kinds of bullet in every job.
const mixed = (n) => resume(Array.from({ length: n }, () => entry([...STRONG, ...FILLER])));

const contentStream = async (bytes) => {
  const doc = await PDFDocument.load(bytes);
  const node = doc.context.lookup(doc.getPages()[0].node.get(PDFName.of("Contents")));
  const streams = node.constructor.name === "PDFArray"
    ? node.asArray().map((r) => doc.context.lookup(r))
    : [node];
  return streams.map((st) => {
    const data = Buffer.from(st.getContents ? st.getContents() : st.contents);
    try { return zlib.inflateSync(data).toString("latin1"); } catch { return data.toString("latin1"); }
  }).join("\n");
};

let failures = 0;
const check = (ok, msg) => { if (!ok) failures++; console.log(`${ok ? "  ok  " : "  FAIL"} ${msg}`); };
const pagesOf = async (blob) =>
  (await PDFDocument.load(Buffer.from(await blob.arrayBuffer()))).getPageCount();

(async () => {
  console.log("one page at every length:");
  for (const [jobs, bullets] of [[1, 2], [2, 3], [4, 5], [6, 6], [10, 8]]) {
    const r = resume(Array.from({ length: jobs }, () => entry(
      Array.from({ length: bullets }, (_, i) => STRONG[i % STRONG.length]))));
    const { blob, fitted, dropped } = await buildPdfBlob(r);
    const pages = await pagesOf(blob);
    check(pages === 1, `${jobs} jobs x ${bullets} bullets -> ${pages} page(s), cut ${dropped.length}, fitted=${fitted}`);
  }

  console.log("it cuts the weakest bullets, not the last ones:");
  // Six jobs of six is past what one page holds at a readable size; three is not.
  const fits = await buildPdfBlob(mixed(3));
  check(fits.dropped.length === 0, "a resume that fits loses nothing");
  const src = mixed(6);
  const { blob, fitted, dropped } = await buildPdfBlob(src);
  check(await pagesOf(blob) === 1, "an overlong resume still comes out one page");
  check(dropped.length > 0, `something was cut (${dropped.length} bullet(s))`);
  check(fitted === true, "it reports a clean fit rather than a truncation");
  check(dropped.every((d) => FILLER.includes(d)), "every cut bullet is filler, none is JD-relevant");
  const text = await contentStream(Buffer.from(await blob.arrayBuffer()));
  const rendered = text.replace(/<([0-9A-Fa-f]+)>/g, (_, h) => Buffer.from(h, "hex").toString("latin1"));
  check(STRONG.every((b) => rendered.includes(b.slice(0, 40))), "all three strong bullets survived");

  // Regression: the position penalty used to grow per job without limit, so on a
  // long resume it outweighed the content score and started cutting real
  // evidence out of old jobs while filler sat untouched in recent ones.
  const deep = await buildPdfBlob(mixed(7));
  check(deep.dropped.length > 12, `a seven-job resume cuts deeply (${deep.dropped.length} bullets)`);
  check(deep.dropped.every((d) => FILLER.includes(d)),
    "even seven jobs deep, position never outranks substance: only filler goes");

  console.log("guardrails:");
  check(JSON.stringify(src) === JSON.stringify(mixed(6)),
    "the caller's struct is untouched, so the .tex export keeps every bullet");
  const oneEach = await buildPdfBlob(resume(Array.from({ length: 24 }, () => entry([FILLER[0]]))));
  check(oneEach.dropped.length === 0, "never empties an entry: nothing cut when each job has one bullet");
  check(await pagesOf(oneEach.blob) === 1, "and that resume is still capped at one page");
  check(oneEach.fitted === false, "with nothing droppable left, it reports the overrun honestly");
  // Older jobs lose bullets before recent ones, all else equal.
  const twoJobs = await buildPdfBlob(resume([entry([...STRONG, ...FILLER]), entry([...STRONG, ...FILLER])]));
  check(twoJobs.dropped.length === 0 || twoJobs.dropped.every((d) => FILLER.includes(d)),
    "a two-job resume also only gives up filler");

  console.log("section title sits above its rule:");
  const plain = await buildPdfBlob(resume([entry(STRONG.slice(0, 2))]));
  const stream = await contentStream(Buffer.from(await plain.blob.arrayBuffer()));
  const WANT = ["SUMMARY", "EDUCATION", "WORK EXPERIENCE", "SKILLS"];
  const titles = [...stream.matchAll(/1 0 0 1 ([\d.-]+) ([\d.-]+) Tm\s*<([0-9A-Fa-f]+)>\s*Tj/g)]
    .map((m) => ({ baseline: parseFloat(m[2]), title: Buffer.from(m[3], "hex").toString("latin1") }))
    .filter((t) => WANT.includes(t.title));
  const rules = [...stream.matchAll(/([\d.-]+) ([\d.-]+) m\s+([\d.-]+) ([\d.-]+) l/g)].map((m) => parseFloat(m[2]));
  check(titles.length === WANT.length, `found all ${WANT.length} section titles (got ${titles.length})`);
  for (const t of titles) {
    const rule = rules.filter((r) => r < t.baseline).sort((a, b) => b - a)[0];
    const gap = rule === undefined ? NaN : t.baseline - rule;
    check(gap > 2 && gap < 6, `${t.title}: ${gap.toFixed(2)}pt between baseline and rule`);
  }

  console.log(failures ? `\nFAIL: ${failures} check(s) failed` : "\nPASS: one page, weakest bullets cut, titles clear of their rules");
  process.exit(failures ? 1 : 0);
})();
