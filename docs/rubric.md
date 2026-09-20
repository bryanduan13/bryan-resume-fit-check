# Judgment Rubric: Reject vs. Reword

This is the rubric the app's fit-check prompt mirrors. The canonical editable copy lives in the Claude project; keep the page's prompt, this doc, and that copy in sync.

## Core principle
Distinguish a capability gap (the person cannot do the job) from an evidence gap (they can, but the resume doesn't say so in the JD's language). Capability gaps reject; evidence gaps reword. Never fabricate: tailoring may only rephrase, reorder, emphasize, or surface experience already present.

## Reject (NOT_A_FIT) when any of these hold
1. A required degree or certification is absent and not in progress by the start date.
2. A required years-of-experience bar is missed by more than half.
3. A required core skill has no evidence AND no adjacent equivalent anywhere.
4. The role's fundamental domain is absent entirely.
5. Seniority mismatch of more than one level.

## Reword (TAILOR) when the gaps look like
1. Keyword mismatch: the skill is demonstrated under a different name.
2. Adjacent equivalent: JD prefers X, resume shows equivalent Y at real depth.
3. Buried evidence: the top requirement exists but sits low or misplaced.
4. Soft requirements: satisfied by pointing at concrete existing bullets.
5. Summary misalignment: reframe using only true facts.

## Borderline rules
- A "preferred" gap never rejects on its own.
- A skill present only as a naked keyword counts as weak evidence: tailor and flag as thin.
- In-progress education counts if completion precedes the start date.
- When uncertain, choose reword and name the weak requirements plainly.

## Evidence sources
Single-user deployment: a background bank of verified experience counts as evidence alongside the resume; evidence not on the resume is flagged in the UI. The bank itself is personal data and is not in this repo.

## Scoring
Each requirement: STRONG / PARTIAL / MISSING. Required weighs 3x preferred. Reject if any reject rule fires; otherwise a 0-100 weighted match score.
