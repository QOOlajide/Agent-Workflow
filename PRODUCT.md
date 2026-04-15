# Product direction

## North star

**One flow:** pick a job → run the workflow → review fit and tailored output → log or apply next step. **Profile** should come from onboarding (resume upload + parse), not from uploads mid-canvas.

## Today

- **Pick a job:** Internship list via GitHub (SimplifyJobs README) or paste full JD text.
- **Pipeline:** Ingest → analyze JD → load profile → score → suggest → review → log.
- **Profile:** Development uses `data/profile/profile.json`; production target is stored profile from sign-up.
- **Freshness:** List rows show **community list age** (not verified employer post time). Helpers in `src/lib/freshness.ts` support future **posted at** vs **seen by tracker** labels.

## Next (when ready)

1. Postgres + normalized jobs + dedupe + scheduled discovery (e.g. RapidAPI) with cost controls.
2. ATS enrichment (Greenhouse / Lever) when `apply_url` matches, with caching and caps.
3. Auth + resume at sign-up → OCR/parse → Profile API for the Profile step.

## What we skip for now

- Deep Workday enrichment by default.
- Multiple discovery vendors until one is stable.

See the codebase: `src/types/ui-job.ts`, `src/lib/freshness.ts`, `src/lib/adapters/github-internship-to-ui-job.ts`.
