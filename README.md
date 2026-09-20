# Resume Fit Check

An AI-powered ATS-style resume checker, built as a single-file web app and developed almost entirely by directing an AI coding agent.

Paste a job description and a resume (or upload a PDF/DOCX). The app judges the fit against an explicit rubric and returns either "not a fit" with the hard gaps named, or a tailored resume, with a requirement-by-requirement evidence table, missing keywords, and a match score. It can also draft answers to application questions grounded in a background bank of real experience, accept user-supplied evidence for gaps, and export the tailored resume as a PDF or a LaTeX file in the Jake's Resume format.

## Architecture

The entire app is one file, `resume-fit-check.html`: vanilla HTML/CSS/JS, no framework, no build step.

- **Hosting/runtime:** published as a Claude artifact. The platform provides hosting, auth, and the AI runtime; the page has no server of its own.
- **AI calls:** four prompt pipelines, each a standalone structured call: fit analysis (JSON with a strict schema), application-question drafting, resume structuring for export, and evidence-based resume revision. A no-fabrication rule runs through all of them: outputs may only rephrase, reorder, or surface facts present in the resume or the background bank, never invent.
- **Document parsing:** pdf.js and mammoth.js, loaded on demand from CDN, run client-side for PDF/DOCX upload.
- **Exports:** the tailored resume is converted once to structured JSON, then rendered deterministically two ways: a PDF drawn in the browser with pdf-lib (standard Times fonts, Jake's Resume layout), and a LaTeX file built on the verbatim Jake's Resume template (MIT), which compiles with pdflatex.

## Design decisions worth knowing

- LaTeX is never written by the AI. An early version asked the model to emit LaTeX inside JSON; escaping failures made whole responses unparseable. Both exports now render deterministically from structured data, so that failure class is gone rather than rare.
- The judgment rubric (reject on capability gaps, tailor on wording gaps) lives in `docs/rubric.md` and is mirrored in the page's prompt.
- Personal data (the background bank, test resumes) is deliberately not in this repo; the deployed page carries it.

## Tests

`node tests/build-latex.test.js` extracts the LaTeX builder from the HTML and checks its output; if `pdflatex` is installed it also compiles the result and fails on any TeX error.

## Deploying

The artifact page is the deploy target. Republishing the updated `resume-fit-check.html` to the same artifact URL is the whole release process.
