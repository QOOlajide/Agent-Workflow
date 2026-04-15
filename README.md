# Agent Workflow Builder

A visual, AI-powered job application pipeline built with Next.js and React Flow. The first node pulls recent roles from curated APIs (GitHub + Active Jobs DB) or accepts pasted JD text, then the system analyzes fit, generates tailoring suggestions, lets you review each change, and logs the application.

## What It Does

**One JD → one run → one tailored profile → one logged application.**

The pipeline has 7 nodes that execute in order:

| Node | What It Does |
|---|---|
| **Job Ingestion** | Loads jobs from GitHub/Active Jobs DB, or accepts pasted text |
| **JD Analysis** | Extracts structured fields (title, level, skills, responsibilities) via OpenAI |
| **Profile Loader** | Reads your master resume from `data/profile/profile.json` |
| **Fit Scoring** | Rule-based scoring: skills match, location, level, topics (0-100) |
| **Tailoring Suggestions** | OpenAI generates before/after diffs for your resume sections |
| **Review** | Human-in-the-loop: Approve, Edit, or Reject each suggestion |
| **Application Logger** | Saves to `data/applications.json` (+ Google Sheets if configured) |

## Tech Stack

- **Frontend:** Next.js 15 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, shadcn/Radix UI
- **Workflow Canvas:** React Flow (`@xyflow/react`) for visual node editor
- **State:** Zustand for pipeline state + linear executor
- **AI:** OpenAI Chat Completions (gpt-5.3 with gpt-5.2 fallback, JSON mode) for JD analysis & tailoring
- **Job Sources:** GitHub API + Active Jobs DB (RapidAPI)
- **Fallback Ingestion:** Paste full JD text directly (no scrape required when description is provided by source)
- **Caching:** Redis (ioredis) with graceful fallback
- **Observability:** Prometheus (`prom-client`) + Grafana dashboards
- **Load Testing:** k6 (load + stress test scripts)
- **CI:** GitHub Actions (lint, typecheck, build, bundle analysis, Lighthouse CI)
- **Infra:** Docker Compose (app, Redis, Prometheus, Grafana)
- **Logging:** Local JSON + Google Sheets API (optional)

## Getting Started

```bash
# Install dependencies
npm install

# Edit your profile (this is your master resume)
# Open data/profile/profile.json and fill in your real info

# Run locally
npm run dev

# Visit
# http://localhost:3000
```

### Optional: Redis for caching

```bash
docker-compose up redis -d
```

### Optional: Full observability stack

```bash
docker-compose up -d
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

### Optional: Google Sheets logging

Set these env vars in `.env.local`:

```
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## How to Use

1. Open `http://localhost:3000` — you'll see the 7-node pipeline on a canvas
2. In the **Job Ingestion** node, choose a source (`GitHub` or `Active Jobs DB`) and load listings
3. Select a role, or switch to paste mode and provide JD text manually
4. Click **Run Pipeline** — watch each node light up as it processes
5. When the **Review** node activates, approve/edit/reject each suggestion
6. Click **Finalize Review**
7. Click **Log Application** in the bottom node
8. Check `data/applications.json` for your logged applications

## Current MVP Product Decisions

- **Cache-first source reads:** prefer cached source responses before re-hitting external APIs.
- **API-first ingestion:** use provider description fields directly when available; avoid unnecessary scraping.
- **Freshness transparency:** show relative freshness only when timestamp semantics are trustworthy; otherwise show absolute/unverified labels.
- **Cost guardrails:** keep source filters narrow and cap repeated calls to the same source.
- **Planned usage limit:** 5 pipeline runs per user per day.
- **Near-term work:** revisit timestamp/timezone handling, add onboarding resume upload + OCR, and add OAuth account creation.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # React Flow canvas with 7 workflow nodes
│   └── api/
│       ├── workflow/
│       │   ├── ingest/route.ts           # Ingestion text passthrough / fallback
│       │   ├── github-jobs/route.ts      # GitHub internships source
│       │   ├── active-jobs/route.ts      # Active Jobs DB source (RapidAPI)
│       │   ├── analyze/route.ts          # OpenAI structured JD analysis
│       │   ├── profile/route.ts          # Read profile.json from disk
│       │   ├── score/route.ts            # Rule-based fit scoring
│       │   ├── suggest/route.ts          # OpenAI tailoring suggestions
│       │   └── log/route.ts              # Local JSON + Google Sheets logging
│       ├── firecrawl/scrape/route.ts     # Generic Firecrawl endpoint
│       ├── openai/chat/route.ts          # Generic OpenAI endpoint
│       ├── metrics/route.ts              # In-memory metrics dashboard
│       └── prometheus/route.ts           # Prometheus scrape endpoint
├── components/nodes/
│   ├── JobIngestionNode.tsx              # URL/text input + Run Pipeline
│   ├── JDAnalysisNode.tsx                # Displays extracted JD fields
│   ├── ProfileLoaderNode.tsx             # Shows loaded profile summary
│   ├── FitScoringNode.tsx                # Score bar + recommendation badge
│   ├── TailoringSuggestionNode.tsx       # Suggestion count + section badges
│   ├── ReviewNode.tsx                    # Before/After diffs + Approve/Edit/Reject
│   └── ApplicationLoggerNode.tsx         # Log button + confirmation
├── store/
│   ├── workflow-store.ts                 # Zustand pipeline state + linear executor
│   └── flow-store.ts                     # Legacy React Flow data store
├── types/
│   └── workflow.ts                       # All pipeline TypeScript interfaces
├── lib/
│   ├── prometheus.ts                     # Prometheus metrics registry
│   └── redis.ts                          # Redis caching with fallback
└── utils/
    ├── metrics.ts                        # In-memory metrics collector
    ├── uptime.ts                         # Uptime tracker
    └── logger.ts                         # Structured logger

data/
├── profile/profile.json                  # Your master resume (edit by hand)
└── applications.json                     # Logged applications (auto-generated)
```

## Roadmap

- [ ] Workflow execution engine for generic graph traversal (beyond linear)
- [ ] Persistent storage (database) for saving workflows and past results
- [ ] OAuth authentication + account creation
- [ ] Per-user rate limiting (5 pipeline runs/day)
- [ ] Resume onboarding upload + OCR parsing (outside the run workflow)
- [ ] Streaming OpenAI responses
- [ ] New node types: Resume Match scoring, Cover Letter generator, Job Board aggregator
- [ ] Batch/scheduled workflows (daily scrape + notify)
- [ ] Prometheus alerting rules + Loki log aggregation
- [ ] Kubernetes deployment manifests

## Scripts

| Command | What It Does |
|---|---|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm run load-test` | k6 load test |
| `npm run stress-test` | k6 stress test |
| `npm run redis` | Start Redis via Docker |

## Built With

Bootstrapped from the [Headstarter Next.js Template](https://github.com/team-headstart/nextjs-template).
