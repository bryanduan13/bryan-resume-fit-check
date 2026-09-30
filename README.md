# Resume Fit Check

An AI-powered ATS-style resume checker, built as a single-file web app and developed almost entirely by directing an AI coding agent.

Paste a job description and a resume (or upload a PDF/DOCX). The app judges the fit against an explicit rubric and returns either "not a fit" with the hard gaps named, or a tailored resume, with a requirement-by-requirement evidence table, missing keywords, and a match score. It can also draft answers to application questions grounded in a background bank of real experience, draft a cover letter (from the tailored resume when there is one), accept user-supplied evidence for gaps, and export the tailored resume as a PDF or a LaTeX file in the Jake's Resume format.

## Architecture

The entire app is one file, `resume-fit-check.html`: vanilla HTML/CSS/JS, no framework, no build step.

- **Hosting/runtime:** published as a Claude artifact. The platform provides hosting, auth, and the AI runtime; the page has no server of its own.
- **AI calls:** five prompt pipelines, each a standalone structured call: fit analysis (JSON with a strict schema), application-question drafting, cover letter drafting, resume structuring for export, and evidence-based resume revision. A no-fabrication rule runs through all of them: outputs may only rephrase, reorder, or surface facts present in the resume or the background bank, never invent.
- **Document parsing:** pdf.js and mammoth.js, loaded on demand from CDN, run client-side for PDF/DOCX upload.
- **Exports:** the tailored resume is converted once to structured JSON, then rendered deterministically two ways: a PDF drawn in the browser with pdf-lib (standard Times fonts, Jake's Resume layout), and a LaTeX file built on the verbatim Jake's Resume template (MIT), which compiles with pdflatex. The PDF is always exactly one page (see below); the LaTeX export stays complete.

## Design decisions worth knowing

- LaTeX is never written by the AI. An early version asked the model to emit LaTeX inside JSON; escaping failures made whole responses unparseable. Both exports now render deterministically from structured data, so that failure class is gone rather than rare.
- The PDF is one page by construction, not by luck. The layout runs as a measuring pass over a type scale, taking the largest scale that fits. Below a readable floor (`PDF_COMFORT_SCALE`, 0.85) it stops shrinking and drops the weakest bullet instead, then re-searches from full size. It never empties an entry, never touches the caller's struct, and names every bullet it cut in the UI, because silently deleting resume content is worse than a second page. Cutting is scored deterministically, not by an AI call: term overlap with the JD (weighted by the analysis's own required/preferred grading), a bonus for hard numbers, and a small capped tiebreak for older jobs and lower bullets. The cap matters — an uncapped per-job penalty outranks what a bullet says once a resume runs long, and starts cutting real evidence ahead of filler.
- The judgment rubric (reject on capability gaps, tailor on wording gaps) lives in `docs/rubric.md` and is mirrored in the page's prompt.
- Personal data (the background bank, test resumes) is deliberately not in this repo. The background bank is pasted into the page at runtime and saved per viewer, never in the source; `SAMPLE_RESUME` ships empty.

## Using this yourself

This page is not runnable standalone: `window.claude` exists only inside the claude.ai artifact viewer, so opening the file locally gives you no AI calls and no exports. To use it, publish `resume-fit-check.html` as your own artifact with the `sample` and `downloads` capabilities, plus `db` and `user` if you want the background bank to persist.

Paste your background bank into the "Background bank" pane on the page and hit Save. It is the only material the model may draw on beyond the pasted resume, so be specific and verifiable; the no-fabrication rule means vague entries produce vague tailoring. A `KNOWN GAPS` section is worth keeping honest, since the rubric uses it to flag rather than invent. With `db` and `user` granted, the bank is saved to your account, private to you even from the artifact's owner; without them it lasts for the session.

`SAMPLE_RESUME`, near the top of the script, is an optional test resume for the "Load saved test inputs" button, which hides itself when it is empty. If you fill it in, keep that copy out of version control (`*.local.js` and `*.local.txt` are gitignored).

## Tests

`node tests/build-latex.test.js` extracts the LaTeX builder from the HTML and checks its output; if `pdflatex` is installed it also compiles the result and fails on any TeX error.

`node tests/build-pdf.test.js` does the same for the PDF builder: it renders resumes of several lengths and checks that every one comes out a single page, that each section title clears the rule under it, and that when bullets have to go it is the filler that goes and never a bullet carrying a metric or a JD keyword. It needs `pdf-lib` (`npm i pdf-lib@1.17.1`) and skips if it isn't installed.

## Deploying

The artifact page is the deploy target. Republishing the updated `resume-fit-check.html` to the same artifact URL is the whole release process.
