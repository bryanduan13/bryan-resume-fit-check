# Resume Fit Check

An AI-powered, ATS-style resume checker that tells you honestly whether you fit a job, and if you do, tailors your resume for it without inventing anything. It is a single-file web app, built almost entirely by directing an AI coding agent.

Paste a job description and your resume (or upload a PDF/DOCX). You get one of two verdicts:

- **Not a fit:** the hard gaps are named, each tied to the rubric rule it breaks.
- **Fit with tailoring:** a rewritten resume aimed at this posting, plus a requirement-by-requirement evidence table, the keywords you're missing, and a 0–100 match score.

## Features

- **Rubric-based fit analysis.** Every requirement in the posting is rated STRONG, PARTIAL, or MISSING, with the evidence quoted. Required items weigh 3x preferred.
- **Tailored resume.** Rephrased, reordered, and re-emphasized for the posting, using only facts from your resume or background bank.
- **Add evidence.** Under any PARTIAL or MISSING requirement you can state a true fact the resume left out, and it gets woven in at exactly the strength you gave it.
- **Background bank.** Verified experience that isn't on your resume. It counts as evidence, and anything drawn from it is flagged "not on resume" so you can see it.
- **Application answers and cover letters.** Drafted from your resume and bank. Anything the sources can't support is listed as a gap for you to fill instead of being made up.
- **Exports.** A one-page PDF and a LaTeX file, both in the Jake's Resume format.

## How it judges

The full rubric is in [`docs/rubric.md`](docs/rubric.md). The core idea is to separate a **capability gap** (you can't do the job) from an **evidence gap** (you can, but the resume doesn't say so in the posting's language). Capability gaps reject. Evidence gaps get reworded.

- **Reject** when a required degree is missing, a years-of-experience bar is missed by more than half, a core skill has no evidence or adjacent equivalent, the domain is absent, or seniority is off by more than one level.
- **Tailor** for keyword mismatches, adjacent equivalents, buried evidence, and a misaligned summary.
- **Soft skills** (communication, ownership, teamwork, leadership) are graded, but a skill only counts as STRONG when a bullet shows it in action. Tailoring rewrites bullets to name who you worked with and what you owned, never adds adjectives like "strong communicator".
- **Attitude traits** ("willingness to learn", passion, curiosity, self-starter) aren't graded. A resume can't prove them, so they're listed as "not graded" instead of dragging the score down. If your experience shows the trait (a tool you picked up and shipped with, self-taught projects), tailoring can surface that.
- **No fabrication, ever.** Every prompt in the app follows the same rule: outputs may only rephrase, reorder, or surface facts you supplied.

## Using it

The app runs as a [Claude artifact](https://claude.ai). The platform provides hosting, sign-in, and the AI calls; the page has no server of its own. Opening the HTML file locally won't work, because `window.claude` exists only inside the claude.ai artifact viewer.

1. Publish `resume-fit-check.html` as your own artifact with the `sample` and `downloads` capabilities. Add `db` and `user` if you want your background bank saved between sessions.
2. Paste your background bank into the "Background bank" pane and hit Save. Be specific and verifiable: the no-fabrication rule means vague entries produce vague tailoring. A `KNOWN GAPS` section is worth keeping honest, since the rubric uses it to flag gaps rather than paper over them. With `db` and `user` granted, the bank is saved to your account and is private to you, even from the artifact's owner.
3. Paste a job description and your resume, then run the check.

`SAMPLE_RESUME`, near the top of the script, is an optional test resume for the "Load saved test inputs" button, which hides itself when it's empty. If you fill it in, keep that copy out of version control (`*.local.js` and `*.local.txt` are gitignored).

## Architecture

The whole app is one file, `resume-fit-check.html`: vanilla HTML, CSS, and JS, with no framework and no build step.

- **AI calls:** five prompt pipelines, each a standalone structured call: fit analysis (JSON with a strict schema), application-question drafting, cover letter drafting, resume structuring for export, and evidence-based resume revision.
- **Document parsing:** pdf.js and mammoth.js, loaded on demand from a CDN, parse PDF and DOCX uploads in the browser.
- **Exports:** the tailored resume is converted once to structured JSON, then rendered two ways. The PDF is drawn in the browser with pdf-lib (standard Times fonts, Jake's Resume layout). The LaTeX file is built on the verbatim Jake's Resume template (MIT) and compiles with pdflatex.

## Design decisions worth knowing

- **The AI never writes LaTeX.** An early version asked the model to emit LaTeX inside JSON, and escaping failures made whole responses unparseable. Both exports now render deterministically from structured data, so that failure class is gone rather than rare.
- **The PDF is one page by construction.** Layout runs as a measuring pass over a type scale and takes the largest scale that fits. Below a readable floor (`PDF_COMFORT_SCALE`, 0.85) it stops shrinking and drops the weakest bullet instead, then re-searches from full size. It never empties an entry and names every bullet it cut in the UI, because silently deleting resume content is worse than a second page. Cutting is scored without an AI call: term overlap with the posting (weighted by the analysis's own required/preferred grading), a bonus for hard numbers, and a small capped tiebreak for older jobs and lower bullets. The cap matters: an uncapped per-job penalty outranks what a bullet says once a resume runs long, and starts cutting real evidence ahead of filler.
- **The rubric is mirrored.** `docs/rubric.md` and the prompt in the page must say the same thing; change both together.
- **No personal data in the repo.** The background bank is pasted in at runtime and saved per viewer, never in the source, and `SAMPLE_RESUME` ships empty.

## Tests

```sh
node tests/build-latex.test.js
node tests/build-pdf.test.js
```

- `build-latex.test.js` extracts the LaTeX builder from the HTML and checks its output. If `pdflatex` is installed, it also compiles the result and fails on any TeX error.
- `build-pdf.test.js` renders resumes of several lengths and checks that each comes out a single page, that section titles clear their rules, and that when bullets have to go it's the filler that goes, never a bullet with a metric or a keyword from the posting. It needs `pdf-lib` (`npm i pdf-lib@1.17.1`) and skips if that isn't installed.

## Deploying

The artifact page is the deploy target. Republishing the updated `resume-fit-check.html` to the same artifact URL is the whole release process.

## License

MIT; see [`LICENSE`](LICENSE). The LaTeX export builds on Jake's Resume template, also MIT.
