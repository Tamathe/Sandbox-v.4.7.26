# Maintenance Execution Log

Tracks when each maintenance prompt was last run, key findings, and resolution status. Updated after each maintenance session.

## Prompt Execution History

| # | Prompt | Frequency | Last Run | Findings | Status |
|---|--------|-----------|----------|----------|--------|
| 01 | Quick Health | Every session | 2026-04-03 | Covered in cleanup sprint 5 — tsc clean, build passing | Clean |
| 02 | Dead Code | Weekly | 2026-03-28 | 5 dead components, 2 dead exports, 17 orphan routes, 5 orphan Prisma models, 3 dead services removed | Clean |
| 03 | Duplication Audit | Weekly | 2026-03-29 | MAINT-05: Chart/component dedup — `useChartData`, `ChartPanel`, `ModuleProgress`, `SkeletonCard`, `useForkTool`, `StaffCard` | Clean |
| 04 | API Hygiene | Weekly | 2026-03-29 | `withErrorHandling` on all 568 routes, `parseRequestBody` on 288 POST routes, 7 ghost cron entries removed, `requireDemoUser` checks suspended | Clean |
| 05 | Convention Drift | Biweekly | 2026-03-29 | MAINT-06: `isLoading`→`loading` (33 files), `font-extrabold` (64 headings/46 files), `max-w-6xl` (42 pages), naming conventions codified. Deferred: `fetch`→`apiFetch` (214 components), card `rounded-2xl` (1171 elements) | Partial |
| 06 | Dependency Health | Biweekly | — | Not yet run as standalone prompt | Pending |
| 07 | Prisma & Data | Biweekly | 2026-03-28 | 5 orphan models removed (MicroCourse family), schema clean | Clean |
| 08 | Deep Sweep | Monthly | — | Not yet run as standalone prompt | Pending |
| 09 | Architecture Review | Monthly | — | Not yet run as standalone prompt | Pending |
| 10 | Performance Audit | Monthly | 2026-03-31 | Perf phases 1-5 completed: bundle APIs, dynamic imports, homepage rewrite (729→210 lines), `unstable_cache` wrappers | Clean |
| 11 | Component Inventory | Monthly | 2026-03-29 | MAINT-02/05: `ModalShell` (19 modals migrated), chart/component dedup | Clean |
| 12 | Route/UI Wiring | Monthly | 2026-04-04 | Page walkthrough batches 1-8 completed (164/280 pages checked, all passing) | In Progress |
| 13 | Type Sprawl | Monthly | 2026-03-29 | MAINT-03: 15 duplicate type groups consolidated, barrel files for 6 domains | Clean |
| 14 | Prompt Audit | Monthly | — | Not yet run as standalone prompt | Pending |
| 15 | Shared Util Adoption | Biweekly | 2026-03-29 | MAINT-01/05: `streamHaikuInterview()` (13 sites), `useChartData`, `useForkTool`, `useBriefing` | Clean |
| 16 | Styling Consistency | Monthly | 2026-03-29 | Part of MAINT-06: `font-extrabold` headings, `max-w-6xl` containers. Deferred: `rounded-2xl` cards (1171 elements) | Partial |
| 17 | Error UX | Monthly | 2026-03-29 | `withErrorHandling` no longer leaks `error.message` in prod; `ErrorBoundary` added to `ClientProviders.tsx` | Clean |
| 18 | WIP Cleanup | Weekly | 2026-04-03 | Covered in cleanup sprint 5 — stale placeholders and commented-out code cleared | Clean |
| 19 | Security Deep Dive | Monthly | 2026-04-04 | 6 critical, 8 high, 7 medium — see detail below | Fixed |
| 20 | Environment Hygiene | Biweekly | — | Not yet run as standalone prompt | Pending |
| 21 | Data Integrity Audit | Monthly | — | Not yet run as standalone prompt | Pending |

## Cleanup Sprint History

| Sprint | Goal | Prompts Used | Date | Commit |
|--------|------|-------------|------|--------|
| Sprint 1 | Clean Slate | 01, 02, 18, 13 | 2026-03-29 | Part of MAINT sprints |
| Sprint 2 | Consolidate | 03, 11, 15, 05 | 2026-03-29 | Part of MAINT sprints |
| Sprint 3 | Harden | 04, 17, 07 | 2026-03-29 | Part of MAINT sprints |
| Sprint 4 | Infrastructure | 10, 16, 14 | 2026-03-31 | `fe170b2`, `6bb2b3c` |
| Sprint 5 | Final Pass | 08, 09, 12 | 2026-04-03 | `395737a` |

## Other Maintenance Events

| Date | Event | Commit | Notes |
|------|-------|--------|-------|
| 2026-03-19 | Gamification removal | `9f4a300` | XP, Sand, Quests, Leagues — all models, routes, components deleted |
| 2026-03-23 | Code health sprint | `8cfa7d2` | CI, tests, middleware, error handling, decomposition |
| 2026-03-24 | Full-stack audit | `0a87797` | 19 HIGH severity issues resolved |
| 2026-03-24 | Duplicate messaging killed | — | 6 components + 16 routes removed |
| 2026-03-26 | Dead route cleanup | — | 17 orphan routes, 1 dead page, 9 stale docs, 3 dead services |
| 2026-03-28 | Architecture consistency | — | 5 orphan Prisma models, 2 dead features (Teach It, My Path) |
| 2026-03-29 | MAINT sprints 01-06 | `49e4365` | Streaming helper, ModalShell, type consolidation, API error handling, chart dedup, convention drift |
| 2026-03-29 | Briefing widget consolidation | — | Unified Email/Calendar/Tasks across all 4 homepages |
| 2026-03-29 | Easter egg removal | — | Konami code, confetti, fireworks, retro mode, Snake game — all deleted |
| 2026-03-31 | Homepage dynamic imports | — | `page.tsx` rewritten 729→210 lines, dead useEffect fetches removed |
| 2026-04-03 | Cleanup sprint 5 | `395737a` | Final pass — deep sweep, architecture review, route/UI wiring |
| 2026-04-03 | Rebrand | `37b3ed6` | "The Sandbox" → "University of Kentucky" across all files |
| 2026-04-04 | Security deep dive | `6fc66bf` | Demo whitelist, CORS fix, security headers, rate limiting, XSS fixes |
| 2026-04-04 | Page walkthrough batches 1-8 | — | 164/280 pages verified, 43 low/info issues noted |

## Page Walkthrough Status

| Batch | Status | Pages | Last Run |
|-------|--------|-------|----------|
| 1. Core | Done | 13 | 2026-04-04 |
| 2. Courses & Learning | Done | 17 | 2026-04-04 |
| 3. AI Literacy | Done | 31 | 2026-04-04 |
| 4. Admin & Compliance | Done | 21 | 2026-04-04 |
| 5. Registrar | Done | 12 | 2026-04-04 |
| 6. Staff | Done | 7 | 2026-04-04 |
| 7. Tools & Write Room | Done | 39 | 2026-04-04 |
| 8. Social & Collaboration | Done | 24 | 2026-04-04 |
| 9. Analytics | Pending | — | — |
| 10. Content & Publishing | Pending | — | — |
| 11. Wellness & Campus | Pending | — | — |
| 12. Specialized Tools | Pending | — | — |
| 13. Misc & Edge | Pending | — | — |

---

## Detail: #19 Security Deep Dive (2026-04-04)

**Commit:** `6fc66bf`

### Fixes Applied

| # | Category | Fix | Files Changed |
|---|----------|-----|---------------|
| 1 | Demo Mode | Added email whitelist — proxy only accepts 4 preset demo emails | `proxy.ts` |
| 2 | CORS | Replaced wildcard `*` origin with production + localhost allowlist | `app/lib/playground-storage.ts` + 4 playground store routes |
| 3 | Security Headers | Added X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection | `next.config.ts` |
| 4 | Rate Limiting | Added rate limits to 14 unprotected AI endpoints (builder, data-desk, research-hub, workshop, practice/chat, virtual-clinic/chat, playground/chat, preview-chat, onboarding/enrich, objectives, suggest-tools, discussions/suggest, course-map/generate) | 14 route files |
| 5 | Input Validation | Added orderBy field allowlist on student success endpoint | `app/api/success/course/[courseId]/students/route.ts` |
| 6 | XSS | Added HTML escaping to markdown renderer + search highlight matcher | `app/components/course-map/TeachingAssistantPanel.tsx`, `app/lib/course-map/search-filter-service.ts`, `app/components/course-map/SearchFilterPanel.tsx` |

### False Positives Identified
- SQL injection in `transfer-explorer-service.ts` — Prisma `$queryRaw` tagged template already parameterizes
- `/api/sessions` missing auth — intentionally supports anonymous tool sessions; proxy gates it
- `.env` committed to git ��� files aren't tracked (`.gitignore` works correctly)

### Remaining (Medium/Low — Future)
- Token revocation mechanism (relies on 60s cache TTL)
- `SameSite=Strict` on auth cookies (currently `Lax`)
- Content-Security-Policy header (needs careful tuning)
- File upload magic bytes validation

---

## What's Due Next

**Overdue (never run standalone):**
- #06 Dependency Health (biweekly)
- #08 Deep Sweep (monthly)
- #09 Architecture Review (monthly)
- #14 Prompt Audit (monthly)
- #20 Environment Hygiene (biweekly)
- #21 Data Integrity Audit (monthly)

**Coming due soon:**
- #02 Dead Code — last run 2026-03-28 (weekly cadence → overdue)
- #03 Duplication Audit — last run 2026-03-29 (weekly cadence → overdue)
- #04 API Hygiene — last run 2026-03-29 (weekly cadence → overdue)
- #18 WIP Cleanup — last run 2026-04-03 (weekly cadence → due ~2026-04-10)

**Page walkthrough:** 5 batches remaining (9-13, ~116 pages)
