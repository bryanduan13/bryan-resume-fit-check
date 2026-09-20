#!/usr/bin/env node
// Extracts the LaTeX builder out of resume-fit-check.html and checks that it
// produces compilable output with LaTeX-hostile input. If pdflatex is on the
// PATH, the output is actually compiled and any TeX error fails the test.
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const htmlPath = path.join(__dirname, "..", "resume-fit-check.html");
const html = fs.readFileSync(htmlPath, "utf8");

const cut = (start, end) => {
  const i = html.indexOf(start);
  if (i < 0) throw new Error("marker not found: " + start);
  const j = html.indexOf(end, i);
  if (j < 0) throw new Error("marker not found: " + end);
  return html.slice(i, j);
};

// Pull the preamble constant and the builder functions out of the page source.
const code =
  cut("const LATEX_PREAMBLE", "const STRUCT_GUIDE") +
  "\n" +
  cut("const texEsc", "let pdflibReady");
const factory = new Function(code + "\nreturn buildLatex;");
const buildLatex = factory();

const sample = {
  name: "Test Person",
  tagline: "Engineer | Systems & Tools, 100% Real",
  contact: ["City, ST", "test@example.com", "(000) 000-0000", "linkedin.com/in/test"],
  sections: [
    { title: "Summary", paragraph: "Text with $ & % # _ ~ ^ | specials, an em\u2014dash, an en\u2013dash, and a backslash: C:\\path." },
    { title: "Education", entries: [{ org: "State University", dates: "Jun 2026", line: "B.S. Computer Science", location: "City, ST", tech: null, bullets: [] }] },
    {
      title: "Experience",
      entries: [{
        org: "Company", dates: "Jul 2026 \u2013 Present", line: "Engineer (Part-Time)", location: null,
        tech: "Python, SQL, 50% #things_with & specials",
        bullets: ["Did A & B with 30% gain.", "Handled #edge _cases and $5 budgets."],
      }],
    },
    { title: "Technical Skills", pairs: [{ label: "Languages", text: "Python, C++" }, { label: "Tools", text: "Git & Docker" }] },
  ],
};

const tex = buildLatex(sample);

// Structural assertions.
const mustContain = [
  "\\documentclass[letterpaper,11pt]{article}",
  "\\resumeSubHeadingListStart",
  "\\resumeItem{",
  "\\titlerule",
  "\\textbf{\\Huge \\scshape Test Person}",
  "\\end{document}",
];
for (const m of mustContain) {
  if (!tex.includes(m)) { console.error("FAIL: output missing " + JSON.stringify(m)); process.exit(1); }
}
const forbidden = [/[^\\]%/, /[^\\$]&/];
if (/[\u2013\u2014]/.test(tex)) { console.error("FAIL: raw en/em dash survived escaping"); process.exit(1); }

// Compile if pdflatex is available.
let hasTex = true;
try { execSync("pdflatex --version", { stdio: "ignore" }); } catch { hasTex = false; }
if (hasTex) {
  const dir = fs.mkdtempSync(path.join(require("os").tmpdir(), "fitcheck-tex-"));
  fs.writeFileSync(path.join(dir, "t.tex"), tex);
  try {
    execSync("pdflatex -interaction=nonstopmode t.tex", { cwd: dir, stdio: "pipe" });
    const log = fs.readFileSync(path.join(dir, "t.log"), "utf8");
    const errors = log.split("\n").filter(l => l.startsWith("!"));
    if (errors.length) { console.error("FAIL: TeX errors:\n" + errors.join("\n")); process.exit(1); }
    console.log("PASS: built and compiled cleanly");
  } catch (e) {
    console.error("FAIL: pdflatex exited nonzero");
    process.exit(1);
  }
} else {
  console.log("PASS: built cleanly (pdflatex not installed; compile step skipped)");
}
