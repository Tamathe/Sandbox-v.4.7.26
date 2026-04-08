# Full-Stack Performance Audit — The Sandbox

**Date:** 2026-04-03  
**Auditor:** Claude (automated deep analysis)  
**Codebase:** ~666 components, ~1,097 API routes, ~393 Prisma models

---

## Prioritized Findings Table

| # | Category | Finding | Impact | Effort | Files | Recommendation |
|---|----------|---------|--------|--------|-------|----------------|
| 1 | **Assets** | Three 5.9 MB PNGs in `/public/` (17.7 MB total) | **HIGH** | **S** | `public/cats-ai-logo.png`, `cats-ai-logo-v2.png`, `uk-wildcat-mark.png` | Convert to WebP/AVIF (~200-400 KB each). Delete duplicate `cats-ai-logo.png`. |
| 2 | **Assets** | Two 3.5 MB MP4 videos loaded eagerly | **HIGH** | **S** | `public/cats-ai-logo.mp4`, `public/logo-animation.mp4` | Add `preload="none"` on `<video>` tags. Offer WebM variant. Lazy-load on scroll/interaction. |
| 3 | **Bundle** | Recharts statically imported in 48 files — no dynamic loading | **HIGH** | **M** | 48 chart components across `/analytics/`, `/admin/`, `/components/` (see full list below) | Wrap each chart component in `next/dynamic({ ssr: false })`. Recharts is ~80-150 KB gzipped. |
| 4 | **Caching** | 93% of API routes (1,020/1,097) have zero `Cache-Control` headers | **HIGH** | **M** | All `app/api/**/route.ts` without headers | Add `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=3600` to reference-data routes. Private cache for user-specific routes. |
| 5 | **Caching** | No client-side cache layer — every navigation re-fetches | **HIGH** | **L** | All `'use client'` pages using `apiFetch` | Adopt SWR or TanStack Query for client fetches. Eliminates redundant requests within a session. |
| 6 | **Bundle** | react-markdown statically imported in 51 files | **HIGH** | **M** | Chat interfaces, tool pages, content viewers (see full list below) | Create a shared `<Markdown>` wrapper loaded via `next/dynamic({ ssr: false })`. react-markdown + remark-gfm is ~40-60 KB gzipped. |
| 7 | **Database** | N+1 in student home-bundle: `conceptState.findMany` called per enrollment in `.map()` | **HIGH** | **S** | `app/api/student/home-bundle/route.ts:28-33` | Batch: single `findMany({ where: { courseId: { in: ids } } })`, group in-memory. |
| 8 | **Database** | Loop-based individual UPDATEs in course-post-service (1 query per post) | **HIGH** | **S** | `app/lib/course-post-service.ts:232-246` | Replace loop with `updateMany({ where: { id: { in: ids } }, data: { publishedAt: now } })`. |
| 9 | **Database** | Missing composite index on LiveRoom `(type, createdAt)` | **HIGH** | **S** | `prisma/schema.prisma` (LiveRoom model) | Add `@@index([type, createdAt])` — community-pulse queries scan full table without it. |
| 10 | **Database** | Missing composite index on LiveRoom `(phase, endedAt)` | **HIGH** | **S** | `prisma/schema.prisma` (LiveRoom model) | Add `@@index([phase, endedAt])`. |
| 11 | **Database** | Nested loop CREATEs in canvas-sync-service (4N*M queries for N modules, M items) | **HIGH** | **M** | `app/lib/syllabus-architect/canvas-sync-service.ts:73-119` | Use `$transaction` + `createMany` for bulk operations. |
| 12 | **Rendering** | 69 framer-motion `whileInView` animations each spawn IntersectionObserver | **MED** | **M** | `app/components/personal-site/*.tsx` (7 files) | Consolidate into shared observer context or `useInView` hook. |
| 13 | **Rendering** | Dashboard chart components lack `React.memo` / `useMemo` for data transforms | **MED** | **M** | 23+ dashboard components in `/components/analytics/`, `/components/accreditation/` | Wrap chart panels in `React.memo()`. Memoize `.sort()` / `.filter()` transforms. |
| 14 | **Caching** | 0 pages use ISR (`export const revalidate`) — all 273 pages are dynamic | **MED** | **L** | All `app/**/page.tsx` | Convert reference pages (tool catalog, degree plans, compliance calendar) to ISR with `revalidate: 600-3600`. |
| 15 | **Middleware** | proxy.ts runs JWT verify on every `/api/*` request with no token cache | **MED** | **S** | `proxy.ts` | Cache verified tokens in LRU with 30-60s TTL (same pattern as `server-auth.ts`). |
| 16 | **Database** | Admin route fetches full User objects (incl. passwordHash) when only name + count needed | **MED** | **S** | `app/api/admin/route.ts:50-54` | Add `select: { id: true, name: true, _count: { select: { tools: true } } }`. |
| 17 | **Database** | community-pulse fetches unbounded `findMany` on 24h LiveRoom data (no `take` limit) | **MED** | **S** | `app/api/community-pulse/route.ts:60-72` | Add `take: 100, orderBy: { createdAt: 'desc' }`. |
| 18 | **Caching** | Accreditation standards fetched by 6+ components independently on same page | **MED** | **S** | `app/(pages)/accreditation/**/page.tsx` | Lift fetch to shared parent, pass via props/context, or use SWR dedup. |
| 19 | **Assets** | "Bebas Neue" font loaded via inline style in SiteBio — no preload/preconnect | **LOW** | **S** | `app/components/personal-site/SiteBio.tsx` | Add `next/font/google` import or `<link rel="preconnect">` + `<link rel="preload">` in layout. |
| 20 | **3rd Party** | Sentry client SDK loaded synchronously on every page (~50ms overhead) | **LOW** | **S** | `sentry.client.config.ts` | Monitor LCP. If > 3.5s, reduce `tracesSampleRate` from 0.1 to 0.05 or lazy-load Sentry. |

---

## What's Already Good

| Area | Status |
|------|--------|
| Monaco editor | Dynamically loaded via PlaygroundLayout — only on `/build` |
| Leaflet/react-leaflet | Campus map wrapped in `dynamic({ ssr: false })` with skeleton |
| AI SDKs (Anthropic, OpenAI) | 182+ imports, all server-only — zero client leakage |
| pdf-parse | Lazy `require()` in `pdf-extract.ts` — avoids DOMMatrix crash |
| @azure/storage-blob | Server-only attachment service |
| Sentry server/edge | Lazy-loaded via `instrumentation.ts` with runtime detection |
| Vercel Analytics | ~3-5 KB, minimal LCP impact |
| Auth caching | `lru-cache` in `server-auth.ts` (60s TTL, 500 entries) |
| Server caching | `unstable_cache` for 7 data types (degree programs, buildings, competencies, tools, announcements) |
| Connection pool | pg pool at 50 connections, idle timeout 5s, allowExitOnIdle |
| Transaction usage | 28 `$transaction` instances across codebase |
| No raw `<img>` tags | `next/image` used throughout |
| No external `<script>` tags | Zero CDN/third-party script injection |
| `'use client'` usage | Spot-checked 30 — all correctly use hooks/event handlers |

---

## Sprint Plan (Top 20 grouped by impact-to-effort ratio)

### Sprint 1 — Quick Wins (1-2 days, all effort S)

**Theme:** Eliminate the largest bytes and worst queries with minimal code changes.

| Task | Finding # | Impact | Effort |
|------|-----------|--------|--------|
| Convert 3 PNGs to WebP, delete duplicate | 1 | HIGH | S |
| Add `preload="none"` to video tags | 2 | HIGH | S |
| Batch conceptState query in home-bundle | 7 | HIGH | S |
| Replace loop UPDATE with `updateMany` | 8 | HIGH | S |
| Add `@@index([type, createdAt])` to LiveRoom | 9 | HIGH | S |
| Add `@@index([phase, endedAt])` to LiveRoom | 10 | HIGH | S |
| Add `select` to admin user query | 16 | MED | S |
| Add `take: 100` to community-pulse | 17 | MED | S |
| Cache JWT tokens in proxy.ts LRU | 15 | MED | S |
| Preload Bebas Neue font | 19 | LOW | S |

**Expected outcome:** ~18 MB saved in static assets, 2 missing indexes added, 3 N+1/loop queries fixed, proxy auth overhead reduced.

---

### Sprint 2 — Bundle Splitting (3-4 days, effort M)

**Theme:** Stop shipping chart and markdown libraries to every page.

| Task | Finding # | Impact | Effort |
|------|-----------|--------|--------|
| Create `DynamicChart` wrapper, migrate 48 recharts imports | 3 | HIGH | M |
| Create `<Markdown>` wrapper with `next/dynamic`, migrate 51 react-markdown imports | 6 | HIGH | M |
| Batch canvas-sync-service creates with `$transaction` + `createMany` | 11 | HIGH | M |
| Lift accreditation standards fetch to shared parent | 18 | MED | S |

**Expected outcome:** ~120-210 KB gzipped removed from non-analytics/non-chat routes. Canvas sync goes from 4N*M queries to 3 batched operations.

---

### Sprint 3 — Cache Layer (4-5 days, effort M-L)

**Theme:** Stop refetching data the server already computed.

| Task | Finding # | Impact | Effort |
|------|-----------|--------|--------|
| Add `Cache-Control` headers to top 50 reference-data API routes | 4 | HIGH | M |
| Adopt SWR for client-side fetch deduplication (start with 10 highest-traffic pages) | 5 | HIGH | L |
| Consolidate IntersectionObservers in personal-site | 12 | MED | M |
| Add `React.memo` + `useMemo` to 23 dashboard chart components | 13 | MED | M |

**Expected outcome:** 30-50% reduction in redundant API traffic. Dashboard re-renders cut significantly.

---

### Sprint 4 — Architecture (5-7 days, effort L)

**Theme:** Structural changes for long-term performance.

| Task | Finding # | Impact | Effort |
|------|-----------|--------|--------|
| Convert 5-10 reference pages to ISR (`revalidate`) | 14 | MED | L |
| Run `ANALYZE=true npm run build` and set CI bundle budget (warn > 200 KB gzipped) | — | MED | S |
| Evaluate Phase 5 bundle endpoints (faculty/hub/student/build) — implement or replace with SWR | — | MED | L |
| Audit remaining ~970 API routes for cache headers | 4 | MED | L |

**Expected outcome:** CDN-served static pages for catalog/degree/compliance. CI prevents bundle regression. Full cache coverage.

---

## Appendix A: Recharts Import Locations (48 files)

<details>
<summary>Click to expand</summary>

- `app/admin/compliance-dashboard/page.tsx`
- `app/admin/compliance-reports/ComplianceTrendChart.tsx`
- `app/admin/compliance-trends/page.tsx`
- `app/(pages)/ai-literacy/starter-packs/analytics/page.tsx`
- `app/wellness-hub/[slug]/page.tsx`
- `app/analytics/faculty/page.tsx`
- `app/analytics/ab-outcomes/page.tsx`
- `app/analytics/learning-science/page.tsx`
- `app/analytics/student/page.tsx`
- `app/courses/[id]/course-map/page.tsx`
- `app/components/BloomCoverageChart.tsx`
- `app/components/assignments/StudentMeiView.tsx`
- `app/components/assignments/MeiDashboard.tsx`
- `app/components/AnalyticsDashboard.tsx`
- `app/components/analytics/VelocityHeatmap.tsx`
- `app/components/analytics/DifficultyOutcomeChart.tsx`
- `app/components/analytics/CurriculumSignalsSection.tsx`
- `app/components/analytics/CourseHealthTrendChart.tsx`
- `app/components/analytics/ConceptVelocityChart.tsx`
- `app/components/analytics/CohortCompareChart.tsx`
- `app/components/analytics/ClassFingerprintPanel.tsx`
- `app/components/analytics/AtRiskTrendChart.tsx`
- `app/components/workshop/EngagementTrendChart.tsx`
- `app/components/virtual-clinic/analytics/StudentGrowthChart.tsx`
- `app/components/virtual-clinic/analytics/DomainRadarChart.tsx`
- `app/components/virtual-clinic/analytics/CaseAnalyticsPanel.tsx`
- `app/components/uknow/InsightsTab.tsx`
- `app/sandcastle/[roomId]/page.tsx`
- `app/components/timeline/TimelineChart.tsx`
- `app/components/success/SuccessScoreChart.tsx`
- `app/components/admin-home/PlatformPulseChart.tsx`
- `app/components/success/CourseRiskHeatmap.tsx`
- `app/components/study-buddy/MasteryTrendChart.tsx`
- `app/components/accreditation/ReadinessGauge.tsx`
- `app/registrar/analytics/RegistrarCharts.tsx`
- `app/components/accreditation/ComplianceTrendChart.tsx`
- `app/components/accessibility/ComplianceDashboard.tsx`
- `app/components/course-map/SmartAutomationPanel.tsx`
- `app/components/course-map/AnalyticsDashboardPanel.tsx`
- `app/components/classroom-intelligence/PulseHistoryChart.tsx`
- `app/components/classroom-intelligence/EffectivenessChart.tsx`
- `app/components/classroom-intelligence/CrossSectionDetail.tsx`
- `app/components/exam-forge/ConceptBreakdownChart.tsx`
- `app/components/curriculum-intel/BloomBreakdown.tsx`
- `app/components/crisis-comms/reputation-pulse/SpreadTimelineChart.tsx`
- `app/components/courses/course-map/SidePanelChart.tsx`
- `app/components/courses/course-map/AnalyticsSummaryChart.tsx`
- `app/hub/s/[slug]/settings/analytics/AnalyticsCharts.tsx`

</details>

## Appendix B: React-Markdown Import Locations (51 files)

<details>
<summary>Click to expand</summary>

- `app/components/ChatInterface.tsx`
- `app/components/concierge/SandyMessage.tsx`
- `app/components/BuilderChatPanel.tsx`
- `app/components/playground/PlaygroundChat.tsx`
- `app/components/collab/CollabChatInterface.tsx`
- `app/components/StudyBuddyInterface.tsx`
- `app/components/ToolBuilderChat.tsx`
- `app/components/publish/ToolPreviewChat.tsx`
- `app/components/SandyInterviewPanel.tsx`
- `app/components/ToolOverview.tsx`
- `app/components/assignments/AssignmentBrief.tsx`
- `app/components/assignments/SubmissionPanel.tsx`
- `app/components/assignments/WorkspaceToolPanel.tsx`
- `app/components/courses/DiscussionTab.tsx`
- `app/components/courses/CourseMaterialViewer.tsx`
- `app/components/courses/MaterialsTab.tsx`
- `app/components/faculty-home/OvernightSandyCard.tsx`
- `app/components/crisis-comms/spokesperson-trainer/InterviewScorecard.tsx`
- `app/write-room/[slug]/page.tsx`
- `app/write-room/resume-builder/page.tsx`
- `app/write-room/linkedin-optimizer/page.tsx`
- `app/write-room/institutional-resume/page.tsx`
- `app/write-room/contract-drafter/page.tsx`
- `app/data-desk/[slug]/page.tsx`
- `app/data-desk/team-analyzer/page.tsx`
- `app/data-desk/survey-analyzer/page.tsx`
- `app/data-desk/sentiment-analyzer/page.tsx`
- `app/data-desk/report-summarizer/page.tsx`
- `app/data-desk/presentation-outliner/page.tsx`
- `app/data-desk/chart-explainer/page.tsx`
- `app/workshop/[slug]/page.tsx`
- `app/workshop/grant-writer/page.tsx`
- `app/meeting-machine/[slug]/page.tsx`
- `app/meeting-machine/minutes-taker/page.tsx`
- `app/meeting-machine/follow-up-drafter/page.tsx`
- `app/meeting-machine/agenda-builder/page.tsx`
- `app/meeting-machine/action-items/page.tsx`
- `app/wellness-hub/[slug]/page.tsx`
- `app/wellness-hub/sleep/page.tsx`
- `app/wellness-hub/mindfulness/page.tsx`
- `app/wellness-hub/journal/page.tsx`
- `app/wellness-hub/habits/page.tsx`
- `app/campus-navigator/[slug]/page.tsx`
- `app/virtual-clinic/encounter/[encounterId]/page.tsx`
- `app/student-services/[slug]/page.tsx`
- `app/student-services/academic-advisor/page.tsx`
- `app/staff/survey-intelligence/[projectId]/page.tsx`
- `app/innovation-lab/idea-to-launch/page.tsx`
- `app/research-hub/[slug]/page.tsx`
- `app/publish/page.tsx`
- `app/portfolio/page.tsx`

</details>

## Sprint 4 Results (2026-04-04)

**Task 1 — ISR Conversion (Finding #14):** 8 reference pages converted to ISR with `export const revalidate = 3600`. Pages: showcase, campus-map, wellness-hub, write-room, data-desk, meeting-machine, research-hub, innovation-lab. Client-only pages were refactored to server component wrappers + PageClient.tsx pattern (matching the existing campus-map pattern). Metadata exports added to all 8.

**Task 2 — Bundle Analysis & CI Budget:** Ran `ANALYZE=true` build. 462 client chunks, 15.8 MB raw / 4.52 MB gzipped. Largest chunk is 122.4 KB gzipped — all within 200 KB budget. Created `scripts/check-bundle-size.ts` with two budgets: no single chunk > 200 KB gzipped, total < 6 MB gzipped. Added `npm run bundle-check` script. Currently passing clean.

**Task 3 — Phase 5 Bundle Evaluation:** All 4 bundle endpoints (faculty/home-bundle, hub/explore-bundle, student/home-bundle, build/bundle) evaluated and found STILL OPTIMAL. Each bundles user-specific data that shares the same auth context and TTL. SWR client-side caching (Sprint 3) handles dedup. Splitting would increase round-trips without improving cache granularity. PERF-AUDIT comment blocks added to each file documenting the evaluation and future optimization notes.

**Task 4 — Cache Header Audit (Finding #4 complete):** Added Cache-Control headers to 543 additional routes (total now 674 out of 1,121). 13 export/redirect/LTI routes correctly excluded. Two-tier pattern: 467 user-specific routes → `private, max-age=60, stale-while-revalidate=300`; 76 reference-data routes → `public, max-age=300, s-maxage=600, stale-while-revalidate=3600`. Automated via `scripts/add-cache-headers.ts`. Coverage: 60% of all routes (up from 12%).

---

### Sprint 5 — Deep Caching & SWR Expansion (4-5 days, effort M-L)

**Theme:** Close the remaining scorecard gaps — expand server-side caching, migrate more pages to SWR, and add LRU caching for hot reference data.

| Task | Finding # | Impact | Effort |
|------|-----------|--------|--------|
| Expand `unstable_cache` from 7 to 15+ data types in `cached-queries.ts` | — | MED | M |
| Migrate 20 more high-traffic pages from raw `apiFetch` to `useApiFetch` (SWR) | 5 | HIGH | L |
| Add in-process LRU cache for hot reference data (departments, tool catalog, standards) | — | MED | M |
| Lazy-load Sentry client SDK via `next/dynamic` or `requestIdleCallback` | 20 | LOW | S |

---

### Sprint 6 — Cache Coverage, SWR Expansion, ISR, Query Observability (4-5 days, effort M-L)

**Theme:** Push cache coverage to 90%+, expand SWR dominance, add more ISR pages, and add query-level observability.

| Task | Finding # | Impact | Effort |
|------|-----------|--------|--------|
| Push Cache-Control coverage from 60% to 90%+ | 4 | HIGH | M |
| Migrate 30 more pages from raw `apiFetch` to `useApiFetch` (SWR) | 5 | HIGH | L |
| Convert 10 more pages to ISR | 14 | MED | M |
| Add Prisma query logging and slow-query detection | — | MED | S |

## Sprint 6 Results (2026-04-04)

**Task 1 — Cache-Control Coverage (60%→92%):** Pushed Cache-Control headers from 678 to 1,035 of 1,129 routes (91.7%). One remaining GET route added with private cache header (voice-session/suggest). 357 mutation-only routes (POST/PUT/DELETE with no GET) received `Cache-Control: no-store` via automated script (`scripts/add-mutation-cache-headers.ts`). 94 routes correctly excluded: 40+ SSE/streaming interview routes, 10 Content-Disposition export routes, 3 redirect-only GET routes (courses/join, LTI), auth routes (login/logout/signup). 7 files required manual NextResponse import fix after script run.

**Task 2 — SWR Migration (33→~62 call sites):** Migrated 29 files from raw `apiFetch` GET pattern to `useApiFetch` (SWR wrapper). Files with 2+ compound GET fetches prioritized: useCommandCenter (skipped — imperative mutation pattern), together, reflect, ai-literacy/starter-packs, useAgentProfiles, CampusTipsTab, CollectionsTab, exam-forge, starter-packs/builder, output-detective, admin/users, agents/build, build, StandardDetailPanel, FeedbackTab, SuggestionsTab, MySandboxPanel, exam-forge/[examId], practice, study, virtual-clinic/case, ai-literacy/stance, accreditation/standard, teaching/interventions, ComplianceDashboard, EvidenceTable, GapList, BrowseGrid, CourseEpisodeList, ScenarioBrowser. Total useApiFetch usage: ~95 instances across 59 files. POST/PATCH/DELETE mutations remain as raw `apiFetch`.

**Task 3 — ISR Conversion (9→19 pages):** Added 10 more ISR pages. Client-only pages refactored to server component wrapper + PageClient.tsx pattern: student-services (3600s), campus-navigator (3600s), audio (600s), privacy (3600s), terms (3600s), contribute (3600s). Server pages with `export const revalidate = 3600` added directly: accessibility-compliance, tools/uk-now, playground-templates, tools/uk-in-the-news. Total ISR pages: 19.

**Task 4 — Prisma Query Logging:** Created `app/lib/prisma-query-logger.ts` using Prisma v7 `$extends` query component. Logs queries exceeding 200ms in dev (console warning) and 500ms in production (Sentry breadcrumb). Captures model name, operation, and duration. Where clause keys logged without values (PII-safe). Wired into `app/lib/prisma.ts` via `withQueryLogging()` wrapper around PrismaClient. Also fixed pre-existing broken imports in crisis-comms command-center routes (`createIncident`→`initiateIncident`, added missing `assessIncident` function).

---

## Appendix C: Caching Maturity Scorecard

| Metric | Current | Target |
|--------|---------|--------|
| Server-side caching (`unstable_cache`) | 16 data types ✅ | 15+ ✅ |
| HTTP `Cache-Control` headers | 1,035/1,129 routes (92%) ✅ | 90%+ ✅ |
| Client-side cache (SWR/React Query) | ~95 instances / 59 files ✅ | Dominant pattern ✅ |
| ISR pages | 19 reference pages ✅ | 15+ ✅ |
| In-process LRU cache | Auth + JWT + 5 reference data types ✅ | Auth + JWT + reference data ✅ |
| Query observability | Prisma slow-query logger (dev+prod) ✅ | Query-level monitoring ✅ |
