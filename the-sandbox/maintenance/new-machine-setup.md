# New Machine Setup — University of Kentucky Platform

Run through this checklist step by step. Verify each step before moving to the next.

---

## 1. Prerequisites

- [ ] Install **Node.js** (check `package.json` `engines` field for version, or use latest LTS)
- [ ] Install **Git** and configure auth for GitHub (SSH key or credential manager)
- [ ] Install **VS Code** with the **Claude Code** extension

## 2. Clone & Configure

```bash
git clone <repo-url> "c:\AA Code\Educator marketplace\the-sandbox"
cd "c:\AA Code\Educator marketplace\the-sandbox"
```

- [ ] Copy `.env` from old machine or Vercel dashboard. Required vars:

| Variable | Source | Required? |
|---|---|---|
| `DATABASE_URL` | Neon dashboard | Yes |
| `ANTHROPIC_API_KEY` | Anthropic console | Yes |
| `AUTH_JWT_SECRET` | Generate 256-bit random string or copy from old machine | Yes |
| `OPENAI_API_KEY` | OpenAI dashboard (embeddings + TTS) | For AI features |
| `STORAGE_JWT_SECRET` | Copy from old machine | For Playground |
| `SANDCASTLE_WS_SECRET` | Copy from old machine | For Sandcastle |
| `CRON_SECRET` | Copy from old machine | For cron routes |
| `RESEND_API_KEY` | Resend dashboard | Optional (logs to console if missing) |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard | For rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard | For rate limiting |
| `DEMO_MODE` | Set to `true` | Yes (NOT `NEXT_PUBLIC_DEMO_MODE`) |
| `NEXT_PUBLIC_DEMO_MODE` | Set to `true` | Yes (for UI demo indicator) |

## 3. Install & Build

```bash
npm install
npx prisma generate
npm run build
```

- [ ] Build completes with zero errors
- [ ] If build fails on Prisma, check that `DATABASE_URL` is set and the Neon DB is accessible

## 4. Verify Dev Server

```bash
npm run dev
```

- [ ] Dev server starts (default port 3000, may use 3002 if 3000 is occupied)
- [ ] Open `http://localhost:3000` in browser
- [ ] Demo user switcher appears in header — switch between all 4 users:
  - `heath.price@uky.edu` (ADMIN)
  - `katie.thompson@uky.edu` (EDUCATOR)
  - `tiana.the.student@uky.edu` (STUDENT)
  - `morgan.rivera@uky.edu` (STAFF)
- [ ] Navigate to `/virtual-clinic` — cases load for both DNP Psychiatry and College of Medicine tabs

## 5. Restore Claude Code Context

- [ ] Copy `C:\Users\<old-user>\.claude\` directory to `C:\Users\<new-user>\.claude\`
  - This preserves: global `CLAUDE.md`, project memory files, `MEMORY.md`, settings, plugins
- [ ] If you can't copy the directory, the project `CLAUDE.md` in `the-sandbox/CLAUDE.md` has all critical project rules. Memory will rebuild over time.

## 6. Resume Virtual Clinic Improvement Plan (Phase 24)

The ongoing Virtual Clinic improvement plan is at Phase 24 (Tasks 47+). Phases 1-23 are complete. Use this handoff prompt to continue:

> Virtual Clinic v2 "The Learning Bridge" — Phase 24: [NEXT PHASE TITLE]
>
> Context: You are implementing Phase 24 of an ongoing improvement plan for the Virtual Clinic feature. Phases 1-23 completed. Key recent additions:
> - Phase 22: Consolidated AI model names + token limits into `app/lib/virtual-clinic/ai-config.ts`; extracted JSON-from-markdown regex to shared `extractJsonFromAIResponse()` utility
> - Phase 23: Extracted HTML comment marker regex to `app/lib/virtual-clinic/marker-utils.ts` (stripMarkers, extractDomainMarkers, extractManeuverMarkers); refactored affect-engine.ts to use shared `callHaikuJSON<T>()` with optional maxTokens parameter
>
> Goal: Execute ONLY the next 2 tasks from the improvement plan, then STOP and generate the next handoff prompt.

## 7. Resume DNP/COM Separation Work

The design spec is approved and ready for implementation planning:

```
docs/superpowers/specs/2026-04-04-virtual-clinic-program-separation-design.md
```

**Tell Claude:**

> Read the spec at `docs/superpowers/specs/2026-04-04-virtual-clinic-program-separation-design.md` and create an implementation plan for it. The design is already approved — go straight to planning.

This will separate the DNP (psychiatry) and COM (general medicine) Virtual Clinic systems with:
- Program-specific phase sequences (MSE + Treatment Plan for DNP, Physical Exam + Diagnostic Plan for COM)
- Program Config Registry as the single source of truth
- New Prisma fields: `mentalStatusFindings`, `keyMSEDomains`, `treatmentPlanKey`
- Program-aware scoring, patient prompts, and UI

## 8. Run Page Walkthrough (Batch 8+)

Batches 1–8 of the page walkthrough are complete. State and report files are in `maintenance/`. To continue from Batch 9:

**Tell Claude:**

> Run the `/page-walkthrough` skill to execute the next pending batch. The dev server must be running on port 3002 (`npm run dev`). Use `NODE_OPTIONS="--max-old-space-size=16384"` if the server crashes during cold compilation.

- State file: `maintenance/walkthrough-state.json`
- Report file: `maintenance/walkthrough-report-2026-04-04.md`
- Batch prompts: `maintenance/batch-*-prompt.md`

## 9. Resume Crisis Command Center v2 (Phase 4+)

Phases 1–3 are complete. The Phase 4 handoff prompt is ready:

```
docs/superpowers/specs/phase-4-handoff.md
```

**Tell Claude:**

> Read the handoff prompt at `docs/superpowers/specs/phase-4-handoff.md` and execute Phase 4. Read `CLAUDE.md` for conventions and the full spec at `docs/superpowers/specs/2026-04-04-crisis-command-center-v2-design.md` for architecture context.

Phase 4 covers:
- Task 7: Per-document status controls (badges, action buttons, read-only lock, timeline events)
- Task 8: Print stylesheet + View/Edit Assessment panel

## 10. Run Accessibility Audit

The platform has a WCAG 2.1 AA accessibility audit skill. Run it monthly or after major UI changes:

**Tell Claude:**

> Run the `accessibility-audit` skill to audit the platform for WCAG 2.1 AA compliance — keyboard navigation, ARIA labels, alt text, color contrast, form accessibility, semantic HTML, and motion/media.

- Skill location: `.claude/skills/accessibility-audit/SKILL.md`
- Checks 7 categories: keyboard nav, ARIA, alt text, contrast, forms, semantic HTML, motion
- Key reference: UK Blue `#0033A0` on white = 8.5:1 (passes contrast)

## 11. Resume Performance Audit (Sprint 7)

Sprints 1–6 are complete. The audit doc and all prior sprint results are in:

```
docs/claude/PERF-AUDIT-2026-04-03.md
```

**Tell Claude:**

> the-sandbox/docs/claude/PERF-AUDIT-2026-04-03.md
>
> Sprint 6 is complete. All 4 tasks are done and verified — Cache-Control coverage pushed from 60% to 92% (1,035/1,129 routes), 29 files migrated from raw apiFetch to useApiFetch bringing total to ~95 instances across 59 files, 10 more pages converted to ISR (now 19 total), and Prisma query logger created with dev/prod slow-query detection via `$extends`. Build passes clean. All caching maturity scorecard targets met.
>
> Sprint 7 has 4 tasks:
>
> Clean up stale AbortControllers and dead fetch patterns left behind by SWR migrations: Sprints 3, 5, and 6 migrated ~59 files from raw apiFetch to useApiFetch, but there are still ~50 files with `AbortController` patterns and ~47 with `Promise.all`/`Promise.allSettled` compound fetches in client components. Many of these are now stale — the useEffect they protected was removed but the controller or parallel fetch wrapper survived, or a file was partially migrated (some fetches moved to SWR, others left as manual useEffect). Scan all non-API, non-lib `.tsx` files containing `AbortController` for ones where the controller no longer protects an active fetch (i.e., the fetch it was paired with has been replaced by useApiFetch). Remove dead AbortControllers, dead cleanup functions, and simplify any `Promise.allSettled` calls that now wrap a single remaining fetch. Do NOT remove AbortControllers that still protect active raw apiFetch calls or streaming connections. Target: reduce stale AbortController instances by 30+.
>
> Continue SWR migration — next 30 files: There are still ~47 files using the old useState+useEffect+apiFetch GET pattern that haven't been migrated. Same rules as previous sprints: only replace GET fetches, keep POST/PATCH/DELETE as raw apiFetch, use null key for conditional fetches, remove manual loading/error state, remove AbortController cleanup. Priority order: files with 2+ GET calls first, then single-fetch files. After this sprint, the remaining raw GET apiFetch files should be under 20 — edge cases that genuinely need imperative fetch patterns (debounced search, streaming, on-demand user-triggered loads). Files to migrate include but are not limited to: audio/episode/[id], audio/scenarios/[id], audio/session/[id], VoiceSessionPanel, BuildingSidebar, CampusMapClient, ConceptHeatmap, CrossSectionTable, EffectivenessChart, InsightCardList, InterventionTimeline, MiniInsightBanner, PulseHistoryChart, WeeklyPulseView, ConceptBridgeMap, CourseTimeline, SandyInsightsCard, JourneyTimeline, ImpactReport, StudySpotWidget, RecommendedNextCard, courses/page, courses/[id]/assessment-canvas, my-path, useAccreditationStandards, useCoursePreferences, NarrativeEditor, MasteryGateDesigner, MasteryGatePanel, accreditation/peer-review.
>
> Add Suspense boundaries and loading.tsx skeletons to high-traffic routes: Currently only 23 routes have `loading.tsx` files and 13 pages use `<Suspense>`. The highest-traffic routes — `/courses`, `/build`, `/hub`, `/analytics`, `/admin`, `/study`, `/audio` — should all have route-level `loading.tsx` with appropriate skeleton UIs so that navigation between major sections shows instant visual feedback while server components or client data loads. Create `loading.tsx` files for 10 high-traffic route groups that don't have them yet. Each should render a lightweight skeleton using the existing `<SkeletonCard>` and `<LoadingSpinner>` components. Match the page's actual layout structure (e.g., PageHeader placeholder + grid of SkeletonCards for hub-like pages, PageHeader + tabs placeholder for tabbed pages). Do NOT add Suspense boundaries inside components — just route-level loading.tsx files.
>
> Add `React.memo` to 20 heavy chart/dashboard components: Sprint 3 added `React.memo` and `useMemo` to 23 dashboard chart components, but there are still ~25 components using `React.memo` across the whole app vs hundreds of chart and panel components that re-render on every parent state change. Identify and wrap 20 more chart/dashboard/panel components in `React.memo` — specifically components in `/components/analytics/`, `/components/accreditation/`, `/components/virtual-clinic/analytics/`, `/components/classroom-intelligence/`, `/components/course-map/`, and `/components/success/` that receive props from parent state and render expensive `<ResponsiveContainer>` + recharts trees. Also add `useMemo` to any data transform operations (`.map().filter().sort()`) inside these components that don't already use it.
>
> 4 tasks: clean up stale fetch patterns, continue SWR expansion, add route-level loading skeletons, and memoize heavy render trees.

Sprint 7 covers:
- Stale AbortController / dead fetch pattern cleanup (30+ removals)
- SWR migration batch 4 (30 more files → under 20 remaining raw GET apiFetch)
- Route-level `loading.tsx` skeletons for 10 high-traffic routes
- `React.memo` + `useMemo` for 20 chart/dashboard components

---

## Quick Smoke Test Commands

After setup, run these to verify the stack is healthy:

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Full build
npm run build

# Verify Virtual Clinic API
curl -s -H "x-demo-user-email: tiana.the.student@uky.edu" http://localhost:3000/api/virtual-clinic/cases?published=true | head -c 200
```
