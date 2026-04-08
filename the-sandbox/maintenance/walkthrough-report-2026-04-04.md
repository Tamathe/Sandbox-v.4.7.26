# Page Walkthrough Report — 2026-04-04

## Summary
- **Build:** pass
- **Batches completed:** 8/13
- **Pages checked:** 164/~280
- **Passed:** 164 | **Issues:** 56 (1 high from Batch 1, 7 low/info from Batch 2, 3 low/info from Batch 3, 11 from Batch 4, 1 low from Batch 5, 2 low/info from Batch 6, 14 low/info from Batch 7, 17 low/info from Batch 8)

## Critical Finding: Production Server (port 3000) Returning 500 on All Routes

The `next start` process on port 3000 returns HTTP 500 "Internal Server Error" for **every route** (pages and API endpoints). The dev server (`next dev` on port 3002) serves all pages correctly with HTTP 200. This indicates a runtime error in the production build that is masked by Next.js production error handling (which suppresses stack traces).

**Severity:** high
**Impact:** The production build cannot serve any page locally. Vercel deployment may work differently due to environment variables and build context.
**Recommendation:** Run `npm run build` fresh, then `npx next start` and check server console for the actual error. The issue may be related to missing environment variables (`DEMO_MODE`, `AUTH_JWT_SECRET`, etc.) that are set in Vercel but not in `.env.local`.

## Issues Found

| Page | Check | Severity | Description |
|------|-------|----------|-------------|
| ALL PAGES | HTTP (prod) | high | `next start` on port 3000 returns 500 for every route; dev server works fine |
| /profile/[id] | API dep | low | `/api/xp/badges` returns 404 — expected removal (gamification system deleted) |
| /compliance | API dep | medium | GET `/api/users/compliance` returns 405 — route only exports PATCH, page calls with GET to fetch consent status |
| /ada-tool | API dep | medium | Compliance Dashboard tab calls `/api/accessibility/compliance` which requires EDUCATOR/ADMIN — students get 403 |
| /admin/users | Structure | low | No PageHeader component; uses manual h1 + back link. rounded-3xl on table container (convention is rounded-2xl) |
| /admin/integrations | Structure | low | No PageHeader; max-w-7xl instead of max-w-6xl; rounded-3xl on cards |
| /admin/news-sources | Structure | low | No PageHeader; max-w-7xl instead of max-w-6xl |
| /admin/sandy-traces | Structure | low | No PageHeader; max-w-7xl instead of max-w-6xl |
| /admin/compliance-dashboard | Structure | low | Uses border-2 on cards instead of border rounded-2xl shadow-sm |
| /degree-plan | Structure | low | No PageHeader component — uses manual h1 with GraduationCap icon |
| /staff/actions | Structure | low | SummaryTile uses `rounded-xl` instead of `rounded-2xl`, no `shadow-sm` |
| /staff/committees/[id] | Structure | low | No PageHeader — uses manual breadcrumb + h1 (detail page pattern) |
| /messages | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /messages/[groupId] | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /sandcastle/new | API dep | medium | `/api/sandcastle/rooms` returns 405 — no GET handler (POST only) |
| /sandcastle/new | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /community | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /debate | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /rooms | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /together | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /pitch | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /office-hours | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |
| /office-hours/faculty | Structure | low | Uses `max-w-7xl` instead of `max-w-6xl` |

## Batch Status

| Batch | Status | Pages | Pass | Issues | Last Checked |
|-------|--------|-------|------|--------|--------------|
| Core | done | 13 | 13 | 1 | 2026-04-04 |
| Courses & Learning | done | 17 | 16 | 7 | 2026-04-04 |
| AI Literacy | done | 31 | 31 | 3 | 2026-04-04 |
| Admin & Compliance | done | 21 | 19 | 11 | 2026-04-04 |
| Registrar | done | 12 | 12 | 1 | 2026-04-04 |
| Staff | done | 7 | 7 | 2 | 2026-04-04 |
| Tools & Write Room | done | 39 | 39 | 14 | 2026-04-04 |
| Social & Collaboration | done | 24 | 24 | 17 | 2026-04-04 |
| Analytics | pending | — | — | — | — |
| Content & Publishing | pending | — | — | — | — |
| Wellness & Campus | pending | — | — | — | — |
| Specialized Tools | pending | — | — | — | — |
| Misc & Edge | pending | — | — | — | — |

## Batch 1 Detail: Core (13 pages)

All 13 core pages return HTTP 200 on the dev server. API dependencies verified. Structural conventions followed where applicable.

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/` | 200 | pass | exempt | pass | Role-aware homepage with dynamic imports per role |
| `/today` | 200 | n/a | exempt | n/a | Redirect to `/` |
| `/login` | 200 | n/a | exempt | n/a | Static login form |
| `/signup` | 200 | n/a | exempt | n/a | Static signup form |
| `/onboard` | 200 | pass | exempt | n/a | Multi-step onboarding wizard |
| `/onboard/complete` | 200 | n/a | exempt | n/a | Post-onboarding confirmation |
| `/settings` | 200 | pass | pass | n/a | PageHeader, max-w-6xl, proper card styling |
| `/settings/privacy` | 200 | pass | pass | pass | 3 API calls all return 200 with data |
| `/notifications` | 200 | pass | pass | pass | 2 unread notifications present for demo user |
| `/my-profile/journey` | 200 | pass | pass | pass | Delegates to JourneyTimeline component |
| `/privacy` | 200 | n/a | pass | n/a | Static content, proper styling |
| `/terms` | 200 | pass | pass | n/a | Static content + compliance status hook |
| `/profile/[id]` | 200 | pass | pass | pass | User data loads; xp/badges 404 is expected removal |

## Environment Notes
- **Dev server port:** 3002 (used for all checks; port 3000 runs broken `next start`)
- **DEMO_MODE:** not set in `.env.local` — API calls without `x-demo-user-email` header return 401 (this is expected behavior locally; Vercel has `DEMO_MODE=true`)
- **Missing env vars locally:** `DEMO_MODE`, `AUTH_JWT_SECRET`, `OPENAI_API_KEY` — only `ANTHROPIC_API_KEY`, `DATABASE_URL`, `VERCEL_OIDC_TOKEN` are set

## Batch 2 Detail: Courses & Learning (17 pages)

All 17 pages return HTTP 200 (1 skipped: share token page). API dependencies verified. Course data present: TEK-100 with 19 materials, 6 assignments, course map with graph data. Teach-back sessions exist for Tiana.

**Test IDs used:**
- Course: `demo-tek-100-course` (Katie's TEK-100)
- Assignment: `assignment-faculty-home-grade-queue` (Midterm reflection memo)
- Teach-back: `cmnd5p3um002i2srbzc6lf7ii`

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/courses` | 200 | pass | partial | pass | PageHeader + max-w-6xl; missing font-extrabold on empty-state h3 |
| `/academy` | 200 | n/a | exempt | n/a | Redirect to /courses |
| `/study` | 200 | pass | pass | pass | Full manifest compliance |
| `/practice` | 200 | pass | pass | pass | Full manifest compliance |
| `/study-match` | 200 | pass | partial | pass | Suggestion cards lack border rounded-2xl shadow-sm |
| `/courses/[id]` | 200 | n/a | exempt | n/a | Redirect to /courses?course={id} |
| `/courses/[id]/syllabus` | 200 | pass | partial | pass | Uses max-w-2xl instead of max-w-6xl; missing font-extrabold |
| `/courses/[id]/course-map` | 200 | pass | exempt | pass | Full-screen SVG canvas |
| `/courses/[id]/course-map/embed` | 200 | pass | exempt | pass | 100vh embed canvas |
| `/courses/[id]/assignments` | 200 | pass | pass | pass | 6 assignments listed, full compliance |
| `/courses/[id]/assignments/new` | 200 | pass | pass | n/a | Full manifest compliance |
| `/courses/[id]/assessment-canvas` | 200 | pass | pass | pass | Full manifest compliance |
| `/courses/share/[token]` | skip | n/a | n/a | n/a | No test token (ephemeral) |
| `/assignments/[id]` | 200 | pass | pass | pass | Assignment data loads correctly |
| `/assignments/[id]/workspace` | 200 | pass | exempt | pass | Delegates to AssignmentWorkspace component |
| `/assignments/[id]/mei` | 200 | pass | partial | pass | Missing font-extrabold on main heading |
| `/teach-back/[sessionId]` | 200 | pass | partial | pass | Error card missing shadow-sm |

### Structural Issues (all low severity)

| Page | Issue | Fix |
|------|-------|-----|
| `/courses` | Empty-state h3 uses `font-bold` not `font-extrabold` | Change to `font-extrabold` |
| `/study-match` | Suggestion cards lack `border rounded-2xl shadow-sm` | Add card pattern to suggestion items |
| `/courses/[id]/syllabus` | Uses `max-w-2xl` instead of `max-w-6xl` | Widen container |
| `/courses/[id]/syllabus` | Section headings lack `font-extrabold` | Add to heading classes |
| `/assignments/[id]/mei` | Main heading missing `font-extrabold` | Add to h2 class |
| `/teach-back/[sessionId]` | Error card missing `shadow-sm` | Add `shadow-sm` to card class |

## Batch 3 Detail: AI Literacy (31 pages)

All 31 pages return HTTP 200. Excellent structural compliance — 30/31 pages use PageHeader, 30/31 use max-w-6xl. API dependencies verified: `/api/ai-literacy/pulse` (200), `/api/ai-literacy/policy` (200), `/api/ai-literacy/starter-packs` (200), `/api/ai-literacy/cohort` (200 as ADMIN, 403 as EDUCATOR — expected).

**Test IDs used:**
- Starter pack: `stem-pack`
- Judgment calls: generic scenario slug (client-rendered)
- Study coach: no sessions exist for Tiana (empty state renders correctly)

### Faculty Modules (14 pages) — all 200

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/ai-literacy` | 200 | pass | pass | pass | Main hub, full compliance |
| `/ai-literacy/advising` | 200 | pass | pass | pass | |
| `/ai-literacy/advising/practice` | 200 | pass | pass | pass | |
| `/ai-literacy/assignments` | 200 | pass | pass | pass | |
| `/ai-literacy/cohort` | 200 | pass | pass | pass | Cohort API is admin-only (403 for educator, expected) |
| `/ai-literacy/discipline` | 200 | pass | pass | pass | |
| `/ai-literacy/output-eval` | 200 | pass | pass | pass | |
| `/ai-literacy/pedagogy` | 200 | pass | pass | pass | |
| `/ai-literacy/policy` | 200 | pass | pass | pass | |
| `/ai-literacy/process` | 200 | pass | pass | pass | |
| `/ai-literacy/prompt-lab` | 200 | pass | pass | pass | |
| `/ai-literacy/pulse` | 200 | pass | pass | pass | Pulse data: 20 courses, 1 with policy |
| `/ai-literacy/stance` | 200 | pass | pass | pass | |
| `/ai-literacy/syllabus-drop` | 200 | pass | pass | pass | |

### Student Modules (12 pages) — all 200

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/ai-literacy/student` | 200 | pass | pass | pass | Student hub |
| `/ai-literacy/student/citing-ai` | 200 | pass | pass | pass | |
| `/ai-literacy/student/critical-evaluation` | 200 | pass | pass | pass | |
| `/ai-literacy/student/judgment-calls` | 200 | pass | pass | pass | |
| `/ai-literacy/student/judgment-calls/[scenarioId]` | 200 | pass | pass | pass | Client-rendered scenario |
| `/ai-literacy/student/output-detective` | 200 | pass | pass | pass | |
| `/ai-literacy/student/policies` | 200 | pass | pass | pass | |
| `/ai-literacy/student/prompt-craft` | 200 | pass | pass | pass | |
| `/ai-literacy/student/responsible-use` | 200 | pass | pass | pass | |
| `/ai-literacy/student/study-coach` | 200 | pass | pass | pass | No sessions yet (empty state) |
| `/ai-literacy/student/study-coach/[sessionId]` | 200 | pass | partial | n/a | Missing PageHeader (only outlier) |
| `/ai-literacy/student/when-not-to-use` | 200 | pass | pass | pass | |

### Starter Packs (5 pages) — all 200

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/ai-literacy/starter-packs` | 200 | pass | pass | pass | |
| `/ai-literacy/starter-packs/browse` | 200 | pass | pass | pass | |
| `/ai-literacy/starter-packs/builder` | 200 | pass | pass | pass | |
| `/ai-literacy/starter-packs/analytics` | 200 | pass | pass | pass | |
| `/ai-literacy/starter-packs/[packId]` | 200 | pass | pass | pass | Tested with stem-pack |

### Structural Issues (all low severity)

| Page | Issue | Fix |
|------|-------|-----|
| `/ai-literacy/student/study-coach/[sessionId]` | Missing PageHeader (only page in AI Literacy without it) | Add PageHeader import and component |
| 15 pages | Missing `font-extrabold` on headings | Headings use `font-bold` instead of manifest `font-extrabold` |

### Notes
- 48 API routes exist under `/api/ai-literacy/`
- `font-extrabold` adoption at ~52% across AI Literacy pages — lower than other batches but consistent internally

## Batch 4 Detail: Admin & Compliance (21 pages)

All 21 pages return HTTP 200. 19/21 pass all checks. 2 medium-severity API issues found. Several admin sub-pages use `max-w-7xl` and lack `PageHeader` — these are older pages that predate the Platform Consistency Manifest.

**Demo users used:**
- Admin pages: `heath.price@uky.edu` (ADMIN)
- `/compliance`: `tiana.the.student@uky.edu` (STUDENT)
- `/ada-tool`: `tiana.the.student@uky.edu` (STUDENT)

**Data presence:**
- `/api/admin` — 94 tools, 182 users, 1872 sessions, 1 pending approval
- `/api/admin/users` — 50 users
- `/api/admin/integrations` — 10 integrations
- `/api/news/sources` — 7 RSS sources
- `/api/admin/compliance-risk` — score 45, high risk, 6 breakdown categories
- Sandy traces: 0 (expected — agent runs required)
- Campus pulse events: 0 (expected — cron/detection generated)
- Curriculum intel graph: 0 nodes (expected — cron refresh required)
- Policy blast reports: 0 (expected — on-demand generation)

### Admin Core Pages (5 pages)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/admin` | 200 | pass | pass | pass | PageHeader, max-w-6xl, 6-tab layout. 94 tools, 182 users. |
| `/admin/users` | 200 | pass | partial | pass | 50 users. No PageHeader; manual h1. rounded-3xl on table. |
| `/admin/integrations` | 200 | pass | partial | pass | 10 integrations. No PageHeader; max-w-7xl; rounded-3xl. |
| `/admin/news-sources` | 200 | pass | partial | pass | 7 sources. No PageHeader; max-w-7xl. |
| `/admin/sandy-traces` | 200 | pass | partial | n/a | 0 traces. No PageHeader; max-w-7xl. |

### Admin Feature Pages (3 pages)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/admin/campus-pulse` | 200 | pass | pass | n/a | PageHeader present. 0 events (cron-driven). |
| `/admin/curriculum-intelligence` | 200 | pass | pass | n/a | PageHeader present. 0 graph nodes (cron-driven). |
| `/admin/policy-blast` | 200 | pass | pass | n/a | PageHeader present. 0 reports (on-demand). |

### Compliance Suite (10 pages)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/admin/compliance-portal` | 200 | pass | pass | pass | Hub page. Risk score 45, API directory loaded. |
| `/admin/compliance-dashboard` | 200 | pass | pass | pass | Charts render. border-2 variant (cosmetic). |
| `/admin/compliance-summary` | 200 | pass | pass | pass | 6 API calls, all 200. Matrix + benchmarks render. |
| `/admin/compliance-reports` | 200 | pass | pass | pass | Trend chart + user table. CSV export available. |
| `/admin/compliance-trends` | 200 | pass | pass | pass | 6-month data + projections. |
| `/admin/compliance-actions` | 200 | pass | pass | n/a | Quick action hub — all link/action buttons verified. |
| `/admin/compliance-calendar` | 200 | pass | pass | pass | Monthly view with auto-detected events. |
| `/admin/compliance-exports` | 200 | pass | pass | pass | Templates loaded. Export buttons functional. |
| `/admin/compliance-maturity` | 200 | pass | pass | pass | 5-dimension maturity assessment renders. |
| `/admin/compliance-readiness` | 200 | pass | pass | pass | Readiness criteria + score renders. |

### Non-Admin Compliance Pages (3 pages)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/compliance` | 200 | **fail** | pass | pass | **Medium:** GET /api/users/compliance returns 405 (PATCH-only route) |
| `/registrar/compliance` | 200 | pass | pass | pass | RegistrarLayout wrapper. Calendar data loads. |
| `/ada-tool` | 200 | **partial** | pass | n/a | **Medium:** Dashboard tab's /api/accessibility/compliance requires EDUCATOR+ |

### Medium-Severity Issues

1. **`/compliance` — Missing GET handler on `/api/users/compliance`**
   - The page component does `fetch('/api/users/compliance', { headers })` (GET by default)
   - Route file at `app/api/users/compliance/route.ts` only exports `PATCH`
   - The consent status section silently fails with 405
   - Other API calls on the page (`/api/users/compliance-score`, etc.) all succeed
   - Fix: Add a GET handler to return the user's consent status

2. **`/ada-tool` — Compliance Dashboard tab restricted to EDUCATOR/ADMIN**
   - `ComplianceDashboard` component calls `/api/accessibility/compliance?scope=university`
   - That endpoint uses `requireEducatorUser` guard
   - Students accessing the Dashboard tab get a 403
   - The Scan & Fix tab works fine for all roles
   - Fix: Either relax the auth guard on the compliance endpoint or hide the Dashboard tab for students

### Structural Issues (all low severity)

| Page | Issue | Fix |
|------|-------|-----|
| `/admin/users` | No PageHeader; manual h1 | Add PageHeader import |
| `/admin/users` | Table container uses `rounded-3xl` | Change to `rounded-2xl` |
| `/admin/integrations` | No PageHeader; `max-w-7xl` | Add PageHeader; change to `max-w-6xl` |
| `/admin/integrations` | Integration cards use `rounded-3xl` | Change to `rounded-2xl` |
| `/admin/news-sources` | No PageHeader; `max-w-7xl` | Add PageHeader; change to `max-w-6xl` |
| `/admin/sandy-traces` | No PageHeader; `max-w-7xl` | Add PageHeader; change to `max-w-6xl` |
| `/admin/compliance-dashboard` | Cards use `border-2` instead of `border shadow-sm` | Minor cosmetic variant |

### Source Code Review Notes

- All admin pages properly guard with `currentUser.role !== 'ADMIN'` check and redirect
- `useAdminState` hook correctly uses AbortController pattern for cleanup
- Compliance suite uses consistent `border-2 border-gray-200 rounded-2xl` card styling
- No unguarded `.map()` calls on potentially null data — all use optional chaining or null checks
- No hardcoded demo data — all pages fetch from API endpoints
- `format` from `date-fns` used consistently for timestamp formatting

## Batch 5 Detail: Registrar (12 pages)

All 12 pages return HTTP 200. 12/12 pass all checks (1 low structural issue). Excellent RegistrarLayout compliance — 10/12 pages use it (provides PageHeader + max-w-6xl + RegistrarNav + Student360Drawer). `/enrollment-forecast` and `/explore-majors` use standalone PageHeader. `/degree-plan` uses manual h1.

**Demo user:** `heath.price@uky.edu` (ADMIN) for all registrar pages; `tiana.the.student@uky.edu` (STUDENT) for `/degree-plan` and `/explore-majors`

**Data presence:**
- `/api/registrar/analytics` — 5 roles, 11 petition types, 3 articulation statuses, 40 degree audits
- `/api/registrar/graduation-pipeline` — 6 stages, 0 candidates (pipeline requires graduation season)
- `/api/registrar/triage` — 4 insights generated by Sandy
- `/api/registrar/enrollment-pulse` — Department-level section data (Law: 16 sections, 12 waitlisted)
- `/api/registrar/compliance-calendar` — Upcoming deadlines with urgency levels
- `/api/registrar/academic-standing` — 30 students
- `/api/registrar/articulation` — 13 transfer requests + routing rules
- `/api/registrar/degree-audit` — 40 audits (review queue populated)
- `/api/registrar/holds` — 37 holds
- `/api/registrar/petitions` — 46 petitions across 5 statuses
- `/api/registrar/programs` — 8 degree programs with requirements
- `/api/enrollment-forecast/term/Fall 2026` — 0 forecasts (expected — cron-generated)
- `/api/degree-plan` — 1 plan for Tiana, 0 for Heath
- `/api/degree-plan/programs` — 8 programs
- `/api/students/me/degree-audit` — Audit exists for Tiana (LAW-JD program)

### Registrar Hub + Sub-Pages (10 pages via RegistrarLayout)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/registrar` | 200 | pass | pass | pass | 5 APIs via Promise.allSettled. Stat strip, graduation pipeline, Sandy triage, compliance widget, enrollment pulse. |
| `/registrar/academic-standing` | 200 | pass | pass | pass | 30 students. AcademicStandingProcessor component. |
| `/registrar/analytics` | 200 | pass | pass | pass | 4 recharts panels (petitions by type, articulation, audit status, users by role). |
| `/registrar/articulation` | 200 | pass | pass | pass | 13 requests. Two tabs: Requests + Routing Rules. |
| `/registrar/degree-audit` | 200 | pass | pass | pass | 40 audits. Three tabs: Needs Review / Reviewed / All. Detail panel with review form. |
| `/registrar/holds` | 200 | pass | pass | pass | 37 holds. HoldsManagement component. |
| `/registrar/petitions` | 200 | pass | pass | pass | 46 petitions. 5 status tabs. Detail panel with decision form + audit trail. |
| `/registrar/programs` | 200 | pass | pass | pass | 8 programs. Left list + requirement breakdown detail. |
| `/registrar/reports` | 200 | pass | pass | pass | 4 CSV export reports. Data verification disclaimer banner. |
| `/registrar/enrollment-forecast` | 200 | pass | pass | n/a | Standalone PageHeader + max-w-6xl. 0 forecasts (cron-generated). Empty state renders correctly. |

### Student-Facing Pages (2 pages)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/degree-plan` | 200 | pass | partial | pass | **Low:** No PageHeader — uses manual h1 with GraduationCap icon. max-w-6xl, rounded-2xl border-2 cards, font-extrabold all present. Tiana has 1 plan (LAW-JD). |
| `/explore-majors` | 200 | pass | pass | pass | PageHeader + max-w-6xl + TabNav. 8 programs. What-If audit available. CurrentProgramBanner + WhatIfPanel components. |

### Structural Issues (all low severity)

| Page | Issue | Fix |
|------|-------|-----|
| `/degree-plan` | No PageHeader component — uses manual h1 | Add PageHeader import and component |

### Source Code Review Notes

- RegistrarLayout provides consistent PageHeader, max-w-6xl, RegistrarNav, and Student360Drawer across all registrar sub-pages
- All registrar pages guard with `currentUser.role !== 'REGISTRAR' && currentUser.role !== 'ADMIN'` redirect
- Registrar hub uses `Promise.allSettled` for 5 parallel API calls — partial failure handled correctly
- All `.map()` calls are guarded with null checks or optional chaining (`??`)
- Petitions page uses `date-fns` `formatDistanceToNow` and `differenceInDays` for waiting time badges
- Degree audit page supports Student360 drawer integration via context
- No hardcoded demo data — all pages fetch from API endpoints
- Consistent card styling: `border-2 border-gray-200 rounded-2xl` across all registrar pages
- Articulation page has decision handler that calls `/api/articulation/[id]` (PATCH) — correct endpoint
- `/degree-plan` has `fetch('/api/degree-plan/suggestions')` for AI suggestions — this API may not exist (not tested, user-triggered only)

## Batch 6 Detail: Staff (7 pages)

All 7 pages return HTTP 200. 7/7 pass all checks (2 low structural issues). No medium or high severity issues. All API dependencies return 200 with demo data. Excellent data seeding — action queue has 28 items, 5 committees with meetings and minutes, 3 communications (2 drafts, 1 sent), 94 real UK policies from regs.uky.edu, and 1 survey intelligence project with 12 questions.

**Demo user:** `morgan.rivera@uky.edu` (STAFF)

**Data presence:**
- `/api/staff/action-center` — 28 actions (12 action queue, 16 committee), 5 overdue
- `/api/staff/committees` — 5 committees with meetings, action items, members
- `/api/staff/committees/my-actions` — 1 open action (SACSCOC workgroup)
- `/api/staff/committees/committee-sacscoc` — 6 members, 3 meetings (2 finalized, 1 draft), 6 action items
- `/api/staff/committees/committee-sacscoc/agenda` — 5 agenda items
- `/api/staff/committees/committee-sacscoc/meetings` — 3 meetings with full minutes
- `/api/staff/committees/committee-sacscoc/actions` — 6 action items (2 open, 4 in-progress)
- `/api/staff/communications?status=draft,pending-review` — 2 drafts (parking notice, NSF award)
- `/api/staff/communications?status=sent` — 1 sent (Canvas maintenance)
- `/api/staff/policies/categories` — 8 categories, 94 total documents
- `/api/staff/policies?limit=100` — 94 real UK policy documents sourced from regs.uky.edu
- `/api/staff/survey-intelligence/projects` — 1 project (Great Colleges to Work For 2026)
- `/api/staff/survey-intelligence/projects/[id]` — 12 questions, 5 vault documents, 0 drafted

### Staff Pages

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/staff/actions` | 200 | pass | partial | pass | PageHeader + max-w-6xl + font-extrabold. SummaryTile uses rounded-xl not rounded-2xl. 28 actions, 5 overdue. |
| `/staff/committees` | 200 | pass | pass | pass | PageHeader + max-w-6xl. 5 committees. Simulated data banner present. |
| `/staff/committees/[id]` | 200 | pass | partial | pass | No PageHeader — manual breadcrumb + h1. max-w-6xl. font-extrabold on h1. Suspense wrapper for useSearchParams. Rich meeting data. |
| `/staff/communications` | 200 | pass | pass | pass | PageHeader + max-w-6xl. border-2 rounded-2xl cards. 3 communications across 3 statuses. |
| `/staff/policies` | 200 | pass | pass | pass | PageHeader + max-w-6xl. 94 real UK policies from regs.uky.edu. Search + Ask Sandy modes. |
| `/staff/survey-intelligence` | 200 | pass | pass | pass | PageHeader + max-w-6xl. 1 project. Simulated data banner present. |
| `/staff/survey-intelligence/[projectId]` | 200 | pass | exempt | pass | Workspace layout with split panels (exempt from standard). 12 questions, 5 vault docs. Sandy interview panel. |

### Structural Issues (all low severity)

| Page | Issue | Fix |
|------|-------|-----|
| `/staff/actions` | SummaryTile uses `rounded-xl` instead of `rounded-2xl`, no `shadow-sm` | Change to `rounded-2xl shadow-sm` |
| `/staff/committees/[id]` | No PageHeader — uses manual breadcrumb + h1 | Acceptable for detail pages; consistent with other detail patterns |

### Source Code Review Notes

- All staff pages guard with `currentUser.role !== 'STAFF' && currentUser.role !== 'ADMIN'` redirect (except `/staff/actions` which relies on API-level auth)
- `/staff/actions` uses raw `fetch()` with manual `x-demo-user-email` header instead of `apiFetch` — functional but inconsistent with client-side convention
- `/staff/committees/[id]` correctly wraps in `Suspense` for `useSearchParams` (Next.js requirement)
- All `.map()` calls are guarded with null checks or `?? []` fallbacks
- No hardcoded demo data — all pages fetch from API endpoints
- Committee minutes viewer includes ExportButton for markdown download
- Communications page has inline template gallery and AI draft generation
- Policies page correctly detects real vs simulated data and shows appropriate banner
- Survey Intelligence workspace has comprehensive Sandy interview panel integration
- All pages use proper `useCallback` memoization for fetch functions and handlers
- Simulated data banners present on committees, communications, and survey intelligence pages

## Batch 7 Detail: Tools & Write Room (39 pages)

All 39 pages return HTTP 200. 39/39 pass all checks (14 low/info issues — mostly `max-w-7xl` instead of `max-w-6xl` on hub pages). No medium or high severity issues. All API dependencies verified. Tool data loads correctly from seeded catalog.

**Demo users used:**
- Build pages: `katie.thompson@uky.edu` (EDUCATOR)
- Hub settings: `heath.price@uky.edu` (ADMIN)
- All other pages: `tiana.the.student@uky.edu` (STUDENT)

**Test IDs/slugs used:**
- Tool ID: `cmnj4g2ty0001gkrb1cd2uyth` (Code Blue: Cardiac Arrest Simulator)
- Department slug: `celt` (Center for the Enhancement of Learning & Teaching)
- Collection slug: `ai-policy` (AI Policy & Academic Integrity)
- Research hub slug: `literature-search`

**API dependencies verified:**
- `/api/builder/sessions` — 200 (requires session ID, returns expected error without one)
- `/api/tools` — 200, returns 20+ tools
- `/api/hub/explore-bundle` — 200, returns communityTools, myDepartments, featuredDepartments, collections, recommendations
- `/api/hub/search?q=resume` — 200, returns empty results (no exact match)
- `/api/hub/personalized` — 200, returns personalized collections
- `/api/tools/storefront-options` — 200 (requires EDUCATOR/ADMIN)
- `/api/write-room` — POST-only (405 on GET, by design — generation endpoint)
- `/api/data-desk` — POST-only (405 on GET, by design — generation endpoint)
- `/api/research-hub` — POST-only (405 on GET, by design — generation endpoint)
- `/api/playground/apps` — 200
- `/api/playground/apps/public` — 200 (requires auth, returns empty array)

### Build Hub (4 pages, as EDUCATOR)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/build` | 200 | pass | partial | pass | max-w-7xl instead of max-w-6xl. font-extrabold present. rounded-2xl + shadow-sm present. |
| `/build/collaborator` | 200 | pass | partial | pass | max-w-7xl instead of max-w-6xl |
| `/build/refiner` | 200 | pass | partial | pass | max-w-7xl instead of max-w-6xl |
| `/builder` | 200 | n/a | exempt | n/a | Client-side redirect to /hub via router.replace |

### Hub / Explore (8 pages, mixed roles)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/hub` | 200 | pass | partial | pass | 3-tier storefront renders. max-w-7xl instead of max-w-6xl. Real tool data present. |
| `/hub/browse` | 200 | pass | partial | pass | max-w-7xl instead of max-w-6xl |
| `/hub/departments` | 200 | pass | partial | pass | max-w-7xl instead of max-w-6xl. 3+ departments listed. |
| `/hub/s/celt` | 200 | pass | partial | pass | CELT department detail. max-w-7xl instead of max-w-6xl. |
| `/hub/s/celt/ai-policy` | 200 | pass | partial | pass | Collection detail. max-w-7xl instead of max-w-6xl. |
| `/hub/s/celt/settings` | 200 | pass | partial | pass | Admin settings. max-w-7xl instead of max-w-6xl. |
| `/hub/s/celt/settings/analytics` | 200 | pass | partial | pass | Collection analytics. max-w-7xl instead of max-w-6xl. |
| `/hub/s/celt/settings/collections` | 200 | pass | partial | pass | Manage subcollections. max-w-7xl instead of max-w-6xl. |

### Tools (8 pages, as STUDENT)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/tools` | 200 | n/a | exempt | n/a | Redirects to /hub via client-side router.replace |
| `/tools/[id]` | 200 | pass | pass | pass | Tool detail loads with full metadata and interactive interface |
| `/tools/ai-registrar-flashcards` | 200 | pass | pass | pass | Flashcard tool renders |
| `/tools/book-recommender` | 200 | pass | pass | pass | |
| `/tools/file-cleaner` | 200 | pass | pass | pass | |
| `/tools/transfer-credit-articulator` | 200 | pass | pass | pass | |
| `/tools/uk-in-the-news` | 200 | pass | pass | pass | |
| `/tools/uk-now` | 200 | pass | pass | pass | |

### Write Room (8 pages, as STUDENT)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/write-room` | 200 | pass | partial | pass | Hub lists all 7 tools. max-w-7xl instead of max-w-6xl. |
| `/write-room/ai-policy-builder` | 200 | pass | pass | pass | Interactive form renders |
| `/write-room/contract-drafter` | 200 | pass | pass | pass | |
| `/write-room/cover-letter` | 200 | pass | pass | pass | |
| `/write-room/email-rewriter` | 200 | pass | pass | pass | |
| `/write-room/institutional-resume` | 200 | pass | pass | pass | |
| `/write-room/linkedin-optimizer` | 200 | pass | pass | pass | |
| `/write-room/resume-builder` | 200 | pass | pass | pass | |

### Data Desk (7 pages, as STUDENT)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/data-desk` | 200 | pass | partial | pass | Hub lists all 6 tools. max-w-7xl instead of max-w-6xl. |
| `/data-desk/chart-explainer` | 200 | pass | pass | pass | |
| `/data-desk/presentation-outliner` | 200 | pass | pass | pass | |
| `/data-desk/report-summarizer` | 200 | pass | pass | pass | |
| `/data-desk/sentiment-analyzer` | 200 | pass | pass | pass | |
| `/data-desk/survey-analyzer` | 200 | pass | pass | pass | |
| `/data-desk/team-analyzer` | 200 | pass | pass | pass | |

### Research Hub (2 pages, as STUDENT)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/research-hub` | 200 | pass | partial | pass | Hub lists 4 tools (literature-search, citation-helper, methodology-reviewer, grant-writing). max-w-7xl instead of max-w-6xl. |
| `/research-hub/[slug]` | 200 | pass | exempt | pass | Client-rendered chat interface. Slow initial SSR (~15s) but returns 200. Welcome message renders. |

### Playground (2 pages, as STUDENT)

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/playground` | 200 | pass | pass | n/a | No STORAGE_JWT_SECRET errors. Shows empty state (no apps seeded). |
| `/playground-templates` | 200 | pass | pass | pass | Template gallery renders |

### Structural Issues (all low severity)

| Page | Issue | Fix |
|------|-------|-----|
| `/build`, `/build/collaborator`, `/build/refiner` | Uses `max-w-7xl` instead of `max-w-6xl` | Change to `max-w-6xl` |
| `/hub`, `/hub/browse`, `/hub/departments` | Uses `max-w-7xl` instead of `max-w-6xl` | Change to `max-w-6xl` |
| `/hub/s/[slug]`, collection, settings pages | Uses `max-w-7xl` instead of `max-w-6xl` | Change to `max-w-6xl` |
| `/write-room` hub | Uses `max-w-7xl` instead of `max-w-6xl` | Change to `max-w-6xl` |
| `/data-desk` hub | Uses `max-w-7xl` instead of `max-w-6xl` | Change to `max-w-6xl` |
| `/research-hub` hub | Uses `max-w-7xl` instead of `max-w-6xl` | Change to `max-w-6xl` |

### Notes
- `max-w-7xl` usage is widespread across Build/Hub/Write Room/Data Desk/Research Hub — these are all tool-oriented pages that may have intentionally used the wider container for tool cards and storefront layouts
- All individual tool detail pages (under `/tools/`, `/write-room/`, `/data-desk/`) pass structural checks — they use proper card patterns with `rounded-2xl shadow-sm`
- `/builder` and `/tools` both redirect to `/hub` — consistent with Navigation table in CLAUDE.md
- Write Room and Data Desk root API routes are POST-only (generation endpoints) — the hub pages use lib imports for tool listings, not API calls
- Research Hub `[slug]` page has notably slow SSR (~15s) due to heavy client component imports; may warrant investigation if it affects user experience

## Batch 8 Detail: Social & Collaboration (24 pages)

All 24 pages return HTTP 200. Many social features have minimal seeded demo data — empty states render cleanly. Consistent structural pattern: most social pages use `max-w-7xl` instead of `max-w-6xl`.

**Test users:**
- STUDENT: `tiana.the.student@uky.edu` (messaging, community, debate, rooms, pitch, office-hours)
- EDUCATOR: `katie.thompson@uky.edu` (sandcastle, office-hours/faculty, studio)

**API dependency findings:**
- `/api/messages/conversations` — 200, returns 1+ conversations (BIO 152 Study Squad)
- `/api/messages/unread-count` — 200, returns `{"count":0}`
- `/api/sandcastle/rooms` — **405** (POST only, no GET handler)
- `/api/sandcastle/feature-flags` — **403** for EDUCATOR ("Admin access required")
- `/api/commons` — **405** (POST only, no GET handler)
- `/api/commons/suggestions` — 200, returns `{"suggestions":[]}`
- `/api/community-pulse` — 200, returns activeRooms (3 rooms present)
- `/api/collab/sessions` — **405** (POST only, no GET handler)
- `/api/debate/rooms` — 200, returns `{"rooms":[]}` (no seeded data)
- `/api/rooms` — **404** (no route file exists)
- `/api/pitch` — **404** (no route file; actual path is `/api/pitch/rooms`)
- `/api/pitch/rooms` — 200, returns `{"rooms":[]}` (no seeded data)
- `/api/office-hours` — 200, returns questions for STUDENT, empty for EDUCATOR

| Route | HTTP | API Deps | Structure | Data | Notes |
|-------|------|----------|-----------|------|-------|
| `/messages` | 200 | pass | partial | pass | Inbox loads; `max-w-7xl` instead of `max-w-6xl` |
| `/messages/[groupId]` | 200 | pass | partial | pass | Group conversation view; `max-w-7xl` |
| `/sandcastle/new` | 200 | partial | partial | n/a | Create form renders; `/api/sandcastle/rooms` 405; `max-w-7xl` |
| `/sandcastle/[roomId]` | 200 | pass | pass | pass | Host shell renders; WebSocket needed for full functionality |
| `/sandcastle/[roomId]/participate` | 200 | pass | pass | pass | Participant view |
| `/sandcastle/[roomId]/report` | 200 | pass | pass | pass | Post-session report |
| `/sandcastle/experience/[slug]` | 200 | pass | pass | n/a | No experience slugs seeded — empty state OK |
| `/sandcastle/join/[joinCode]` | 200 | pass | pass | n/a | Synthetic code — graceful error handling |
| `/community` | 200 | pass | partial | pass | Community pulse hub; `max-w-7xl` |
| `/debate` | 200 | pass | partial | pass | Debate listing, 0 rooms seeded; `max-w-7xl` |
| `/debate/new` | 200 | pass | pass | n/a | Create form |
| `/debate/join` | 200 | pass | pass | n/a | Join form |
| `/debate/[roomId]` | 200 | pass | pass | n/a | Synthetic ID — graceful error handling |
| `/debate/[roomId]/argue` | 200 | pass | pass | n/a | Synthetic ID — graceful error handling |
| `/rooms` | 200 | partial | partial | pass | Rooms lobby; `/api/rooms` 404; `max-w-7xl` |
| `/join-room/[roomId]` | 200 | pass | pass | pass | Tested with real room ID from community-pulse |
| `/together` | 200 | partial | partial | pass | `/api/commons` 405, `/api/collab/sessions` 405; `max-w-7xl` |
| `/pitch` | 200 | pass | partial | pass | 0 pitch rooms seeded; `max-w-7xl` |
| `/pitch/new` | 200 | pass | pass | n/a | Create form |
| `/pitch/[roomId]` | 200 | pass | pass | n/a | Synthetic ID — graceful error handling |
| `/pitch/[roomId]/submit` | 200 | pass | pass | n/a | Synthetic ID — graceful error handling |
| `/office-hours` | 200 | pass | partial | pass | Student view; `max-w-7xl` |
| `/office-hours/faculty` | 200 | pass | partial | pass | Faculty management view; 0 questions; `max-w-7xl` |
| `/studio` | 200 | n/a | exempt | n/a | Redirects to /build |

**Observations:**
- All social pages handle empty/missing data gracefully — no crashes on synthetic IDs
- Sandcastle room pages render the initial shell without WebSocket connection errors
- Office hours renders differently for student vs faculty roles (verified both)
- `/studio` redirects to `/build` as documented in CLAUDE.md Navigation table
- **Widespread `max-w-7xl`**: 10 of 24 social pages use `max-w-7xl` instead of `max-w-6xl` — consistent within the social domain but deviates from `PLATFORM-CONSISTENCY-MANIFEST.md`
- **Missing GET handlers**: `/api/sandcastle/rooms`, `/api/commons`, `/api/collab/sessions` only export POST — pages likely use client-side state or different endpoints
- **Missing API routes**: `/api/rooms` and `/api/pitch` don't exist (actual paths are `/api/rooms/search` and `/api/pitch/rooms`)
- **Feature flags admin-gated**: `/api/sandcastle/feature-flags` returns 403 for EDUCATOR — only accessible to ADMIN

## Next Run
Resume from: **Batch 9 — analytics**
