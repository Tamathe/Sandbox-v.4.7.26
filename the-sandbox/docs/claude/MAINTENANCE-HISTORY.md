# Maintenance History Reference Doc

> **Claude Code reference document** extracted from the project's `CLAUDE.md`.
> Read this file when performing maintenance tasks, cleaning up dead code, or checking what has been intentionally deleted and must not be rebuilt.

---

## Do Not Rebuild (Intentionally Deleted)

### Gamification System (removed 2026-03-19)

Do NOT recreate any of the following:
- XP system, Sand currency, Quests, Challenges, Leaderboards, Leagues
- All schema models, API routes (`/api/xp/`, `/api/quests/`, `/api/challenges/`, `/api/leagues/`), lib files (`xp.ts`, `sand.ts`, `platform-quests.ts`), and components (`QuestPanel`, `StudentQuestWidget`, `ActionItems`, `SandTooltip`, etc.) are gone
- `app/lib/ui-mode.ts` has a scaffolded `'gamified'` branch -- do NOT activate it

### Easter Egg System (removed 2026-03-29)

Deleted: Konami code, "go cats" paw prints, confetti, fireworks, retro mode, milestones, scroll-bottom messages, Snake game arcade. Hidden pages `/sandbox/credits`, `/sandbox/arcade`, `/sandbox/philosophy` removed. 9 components deleted (Confetti, Fireworks, PawPrints, KonamiOverlay, RetroTheme, SnakeGame, MilestoneToast, SandyBlink, ScrollBottomMessage). Only `LogoVideoOverlay` survives.

### Merged / Replaced Components

- `BuildHubHero.tsx`, `ToolLaunchModal.tsx`, `SimpleToolCard.tsx` -- all deleted and merged into unified `ToolCard` (single mode, no `compact` prop)

### Duplicate Messaging System (killed 2026-03-24)

- `app/components/chat/` (6 files) + 16 `/api/chat/{channels,groups,unread-count}` routes -- duplicate messaging system killed. Sandy panel "Chat" tab removed; ConciergePanel links to `/messages` instead. Only `/api/chat/route.ts` (Sandy streaming) survives. Do NOT recreate a chat system inside Sandy's panel.

### Dead Routes Cleaned Up (2026-03-24)

- 2 workshop command center routes (`/api/workshop/command-center/{course-health,deadlines}`) -- feature dissolved
- 1 empty stub (`/api/tools/[id]/leaderboard`) -- gamification remnant
- Note: `/api/assistant/` routes (18 files: email/*, calendar, rules, tasks) and 15 `/api/cron/` routes remain active and functional

### Dead Routes Cleaned Up (2026-03-26)

- 17 orphaned routes: `/api/admin/{flagged,study-groups}`, `/api/live-rooms/{auto-rally,import-quiz,streak}`, `/api/audio/{episodes,jobs}`, `/api/book-recommender/digest`, `/api/brackets/digest`, `/api/courses/share`, `/api/courses/[id]/course-map/embed-config`, `/api/memories/extract`, `/api/sandy/campus-digest`, `/api/tools/recommended`, `/api/competency/cohort`, `/api/workshop/command-center/{engagement-trend,concept-gaps}`
- 1 dead page: `/admin/ux-audit` (referenced deleted `ux-audit-script.md`)
- 9 stale root docs deleted (ARCHITECT_PLAN, COURSE-HUB-IMPROVEMENTS, COURSE_UX_FIXES, etc.)
- 1 dead route: `/api/crisis-comms/reputation-pulse/deep-dive` (never called by hook)
- 3 dead services: `sentiment-analysis-service.ts`, `theme-clustering-service.ts`, `ai-detection-service.ts` (replaced by seeded data)

---

## Maintenance Sprints (All Complete 2026-03-29)

### MAINT-01: Streaming Helper Extraction

- `app/lib/streaming.ts` -- shared `streamHaikuInterview()` helper replacing 13+ copy-pasted streaming blocks
- 40-line inline `ReadableStream` + `content_block_delta` loop consolidated into single parameterized function
- All wellness-hub, write-room, meeting-machine, data-desk interview routes migrated

### MAINT-02: Modal Shell Extraction

- `app/components/ui/ModalShell.tsx` -- shared modal wrapper (fixed overlay, centered card, header with icon + title + X)
- Props: `title`, `icon?`, `onClose`, `children`, `maxWidth?`, `zIndex?`
- Escape key + backdrop click close. 19+ modals migrated from inline chrome to `<ModalShell>`

### MAINT-03: Type Consolidation

- 15 duplicate type groups consolidated to canonical exports (~60+ files updated)
- `ChatMessage` --> single source in `app/lib/types.ts` (13+ importers)
- `RubricCriterion` + `RubricBand` --> `app/components/courses/course-types.ts`
- `ToolPreflightData`, `ServiceResult<T>`, `UserRole` --> `app/lib/types.ts`
- Barrel files created for `staff/`, `commons/`, `assistant/`, `registrar/`, `fingerprint/`

### MAINT-04: API Error Handling Migration

- All ~340 route files with manual try/catch migrated to `withErrorHandling` -- zero `export async function` handlers remain
- ~25 files had inline `try { await req.json() } catch` replaced with `parseRequestBody`
- Preflight routes collapsed: data-desk (6-->1), meeting-machine (4-->1), wellness-hub (4-->1) via dynamic `[tool]/preflight/route.ts`
- `requireUserByEmail` helper added to `server-auth.ts`
- Inner try/catch blocks preserved in streaming routes (ReadableStream callbacks)

### MAINT-05: Chart & Component Deduplication

- `useChartData` hook + `ChartPanel` wrapper replace inline fetch/loading/error/card boilerplate in all 10 analytics charts
- `ModuleProgress` replaces `PromptLabProgress` + `OutputEvalProgress` (deleted)
- Shared `SkeletonCard` (`app/components/ui/SkeletonCard.tsx`) replaces 3 local copies
- `useForkTool` hook extracts identical fork logic from `ToolCard` + `StorefrontToolCard`
- `StaffCard` wrapper extracts card chrome from `TodayScheduleCard` + `AlertsCard`

### MAINT-06: Convention Drift Fixes

- Phase 1: All 288 POST/PUT/PATCH routes migrated from `req.json()` --> `parseRequestBody` (zero remaining)
- Phase 4A: `isLoading` --> `loading` standardized across 33 files (zero remaining)
- Phase 4A-2: `ErrorBoundary` component added (`app/components/ErrorBoundary.tsx`), wired into `ClientProviders.tsx`
- Phase 5B: `font-bold` --> `font-extrabold` on 64 heading elements across 46 files
- Phase 5C: 42 page containers standardized to `max-w-6xl`
- Phase 6A: 3 `load*` functions renamed to `get*` (`getCollabSession`, `getTemplate`, `getReputationPulseSnapshot`)
- Phase 6B: 4 dedicated type files created (`assistant/types.ts`, `commons/types.ts`, `concierge-types.ts`, `course-map/types.ts`), 38 source files updated
- Phase 6C: 6 barrel files created (`staff/`, `commons/`, `assistant/`, `registrar/`, `course-map/`, `fingerprint/`)
- Naming Conventions section added to CLAUDE.md (verbs, files, component suffixes, state naming)
- **Deferred**: Phase 3 (fetch-->apiFetch, 214 components -- semantic change needs per-site judgment), Phase 5A (card rounded-2xl, 1171 elements -- needs visual judgment)

---

## Other Cleanup Records

### Architecture Consistency Audit Cleanup (2026-03-28)

- 5 orphan Prisma models removed: `MicroCourse`, `MicroLesson`, `MicroCourseEnrollment`, `MicroLessonProgress`, `MicroCourseRating` + `MicroCourseStatus` enum
- Dead feature "Teach It" removed: `teach-it-service.ts`, 5 routes (`/api/teach-it/*`), page, Header nav link
- Dead feature "My Path" removed: `my-path-service.ts`, 3 routes (`/api/my-path/*`), page, Header quick link, concierge goals injection
- `sandy/suggestions/route.ts` field typos fixed: `peakHour`-->`peakHours`, `socialStyle`-->`socialOrientation`
- Shared utilities: `api-client.ts`, `Button.tsx`, `LoadingSpinner.tsx`, `ErrorBanner.tsx`, UK color `@theme` tokens
- 33 routes wrapped with `withErrorHandling`, 5 new service files, 654 UK color tokens, 57 apiFetch migrations, 14 AbortController cleanups

### API Hygiene Fixes (2026-03-29)

- `withErrorHandling` no longer leaks `error.message` in production (568 routes)
- 4 routes wrapped with `withErrorHandling`: `sessions/[id]/messages`, `assignments/[id]/submissions`, `assignments/[id]/workspace`, `cron/campus-sync`
- `cron/news-fetch` POST extracted shared `fetchNews()` -- admin "Fetch Now" no longer hits `verifyCronSecret`
- 7 ghost cron entries removed from `vercel.json` (deleted routes: brackets/digest, book-recommender/digest, uknow-ingest/digest, review-expiry, consent-expiry, ferpa-reminder)
- `requireDemoUser` in `playground-storage.ts` now checks `suspended` status (matches `requireRequestUser` behavior)
- Broken import in `cron/fingerprint-refresh/route.ts` fixed

### Homepage Dynamic Imports & Dead Code Removal (2026-03-31)

- `app/page.tsx` rewritten: 729-->210 lines. All 4 role homepages + landing page use `next/dynamic` -- only the active role's JS bundle downloads
- Landing page extracted to `app/components/landing/RoleAwareLanding.tsx` (guests only)
- 6-7 dead `useEffect` fetches removed (enrollment, library, dashboard, suggested-tools, UKNow, recommendations, objectives)
- Dead constants/types/helpers removed: `STUDENT_PROFILES`, `GENERIC_STUDENT`, `StudentDashboardData`, `scoreColor()`, `typeBadgeStyle()`, `buildUpcomingDue()`, `pickedForYou`
- `set-state-in-effect` lint errors fixed by converting `useEffect` --> lazy `useState` initializers

### Briefing Widget Consolidation (2026-03-29)

- Unified Email/Calendar/Tasks widgets across all 4 homepages using shared `EmailBrief`, `CalendarBrief`, `TaskBrief` from `app/components/briefing/`
- 5 role-specific components deleted: `TodayTimeline.tsx`, `InboxPreview.tsx`, `MiniCalendar.tsx` (student), `EmailPreviewCard.tsx`, `NextUpCard.tsx` (staff)
- New shared hook `useBriefing()` from `app/hooks/useBriefing.ts` -- all roles fetch from `GET /api/briefing`
- Layout: Email (2/3 left) + Calendar + Tasks stacked (1/3 right) -- identical on all homepages

### Dead Code Cleaned Up (2026-03-28)

- 5 dead components: `UxAuditRunner.tsx`, `ToolRequestModal.tsx`, `ToolUsageNotification.tsx`, `UpcomingMeetingsCard.tsx`, `ViewingAsBanner.tsx`
- 2 dead exports: `slugify()` (admin-control-tower.ts), `PHASE_ONE_PORTFOLIO_TYPES` (portfolio.ts)
