# Handoff Prompt: Engagement Fingerprint Engine — Phase 6 of 6

## Context

You are completing the **Engagement Fingerprint & Hyper-Personalization Engine** build for the platform — the AI-powered operating system of the University of Kentucky.

**Full architecture blueprint:** `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` — read this for the complete service architecture, computation logic, consumer integration specs, Sandy agent tool definitions, and cron job spec.

**Phase 1 is COMPLETE** — Schema (`EngagementFingerprint`, `CourseFingerprint` models in `prisma/schema.prisma`), type definitions (`app/lib/fingerprint/types.ts`), and 14 data fetchers (`app/lib/fingerprint/data-fetchers.ts`).

**Phase 2 is COMPLETE** — 5 pure computation modules (`temporal.ts`, `learning.ts`, `engagement.ts`, `social.ts`, `responsiveness.ts`), engine orchestrator (`fingerprint-engine.ts`), and persistence service (`fingerprint-service.ts`).

**Phase 3 is COMPLETE** — 3 API routes (`/api/fingerprint/me`, `/api/fingerprint/course/[courseId]`, `/api/fingerprint/refresh`), `LearningProfileCard.tsx` student component wired into `StudentHomepage.tsx`.

**Phase 4 is COMPLETE** — Sandy context builder (`sandy-context.ts`), Sandy context API route, concierge integration (`buildSystemPrompt` param + route wiring), chat-service integration (appends fingerprint block after user memories), hub fingerprint personalization (`hub-personalization.ts` with tool affinity scoring), hub API wiring.

**Phase 5 is COMPLETE.** Here is what was built:

### Phase 5 Deliverables (already on disk)

1. **ClassFingerprintPanel** (`app/components/analytics/ClassFingerprintPanel.tsx`):
   - Faculty-facing dashboard visualizing class-level aggregate fingerprint (FERPA-safe, no individual students)
   - Header with student count badge, risk signals (amber warning badges from `riskSignals` array)
   - 3 stat cards: avg session minutes, consistency %, nudge response rate %
   - Chronotype distribution horizontal bar chart (recharts `BarChart`, layout="vertical", color-coded)
   - Study cadence distribution horizontal bar chart
   - Social orientation breakdown (3 segments with percentages, color-coded cards)
   - Top study modes as pill badges
   - Engagement trend indicator (rising/stable/declining, color-coded)
   - Fetches from `GET /api/fingerprint/course/{courseId}` via `useEffect` + `fetch`
   - Loading skeleton, empty state with message
   - Card style: `border rounded-2xl shadow-sm p-6`, `font-extrabold` heading

2. **Faculty analytics page wiring** (`app/analytics/faculty/page.tsx`):
   - New "Class Profile" tab added to tab system (union type extended, button added after Transfer tab)
   - Tab renders `ClassFingerprintPanel` with `primaryCourseId` prop
   - Import added at top of file

3. **Notification Timing Service** (`app/lib/fingerprint/notification-timing.ts`):
   - `getOptimalNotificationWindow(userId)` — returns `{ hour, day }` from primary peak hour/day, null if confidence < 0.3
   - `isWithinPeakWindow(userId)` — returns true if current hour is within ±1 of any peak hour (wraps around midnight). Returns true (permissive) when no fingerprint data available.

4. **Optimal Timing API Route** (`app/api/fingerprint/optimal-timing/route.ts`):
   - `GET`, `requireRequestUser`, returns `{ timing: { hour, day } | null }`

5. **Concierge SR Nudge Timing** (`app/lib/concierge-service.ts` + `app/api/concierge/route.ts`):
   - `buildSystemPrompt()` gained new optional param `withinPeakWindow?: boolean`
   - SR nudge condition extended: `&& (withinPeakWindow !== false)` — only suppresses when explicitly outside peak window
   - Concierge route computes `withinPeakWindow` via `isWithinPeakWindow(user.id)` in parallel with fingerprint context (`Promise.all`)
   - Passed as final arg to `buildSystemPrompt()`

**All Phase 5 files pass `npx tsc --noEmit` with zero errors.**

**Key codebase conventions (from CLAUDE.md):**
- Prisma v7 with PrismaPg adapter. Import from `../generated/prisma`.
- Business logic in `app/lib/`, never in route files.
- Auth guards required on every route. Cron routes use `verifyCronSecret(req)`.
- Sandy agent tools: `ToolModule` interface with `tools: ToolDefinition[]` + `handlers: Record<string, ToolHandler>`. Categories: `'academic' | 'communication' | 'calendar' | 'analytics' | 'campus' | 'content' | 'sandy' | 'tasks'`. Tool modules registered in `app/lib/agent/tool-registry.ts` via `_registry.registerModule(module)`.
- `ToolHandler` signature: `(args, user) => Promise<Record<string, unknown>>`. `user` has `{ id, role, ... }`.
- Cron route pattern: `verifyCronSecret(req)` first, then business logic. `POST` method. Return JSON summary.

## The Goal

**Execute ONLY these two tasks, then STOP:**

### Task 6A: Sandy Agent Tools — `get_learner_profile` + `get_class_profile`

Register two fingerprint tools in Sandy's agent system so users can ask Sandy about learning patterns.

1. **Create `app/lib/agent/tools/fingerprint-tools.ts`** — A new ToolModule with two tools:

   **Tool 1: `get_learner_profile`**
   - Description: "Get the engagement fingerprint and learning profile for the current user. Shows chronotype, study cadence, preferred modes, collaboration style, and more."
   - Category: `'analytics'`
   - Permission: `'auto'`
   - Roles: all (`['STUDENT', 'EDUCATOR', 'ADMIN', 'STAFF']`)
   - Input schema: empty object (no parameters — always returns the current user's profile)
   - Handler: calls `getFingerprint(user.id)` from `fingerprint-service.ts`
   - If null: return `{ message: 'Not enough data yet to build a learning profile.' }`
   - If found: return a flat object with: chronotype, cadence, preferredModes, modality, collaborationStyle, deadlineBehavior, sessionsPerWeek, avgSessionMinutes, retention, consistency, confidence (see blueprint lines ~1180-1192 for exact field mapping)

   **Tool 2: `get_class_profile`**
   - Description: "Get the aggregated engagement fingerprint for a course section. Shows class-level patterns without identifying individual students."
   - Category: `'analytics'`
   - Permission: `'auto'`
   - Roles: `['EDUCATOR', 'ADMIN']`
   - Input schema: `{ courseId: { type: 'string', description: 'Course ID to analyze' } }`, required: `['courseId']`
   - Handler:
     - Verify course ownership: `prisma.course.findUnique({ where: { id: courseId }, select: { creatorId: true, title: true } })`
     - If not found: return error
     - If `course.creatorId !== user.id && user.role !== 'ADMIN'`: return error
     - Call `getCourseFingerprint(courseId)` from `fingerprint-service.ts`
     - If null: return `{ message: 'Not enough student data to build a class profile.' }`
     - Return: courseName, studentCount, dominantChronotype, dominantCadence, distributions (chronotype, cadence, social, deadline), topStudyModes, avgSessionMinutes, avgConsistency, riskSignals, engagementTrend (see blueprint lines ~1225-1242)

2. **Register in `app/lib/agent/tool-registry.ts`**:
   - Import `fingerprintTools` from `'./tools/fingerprint-tools'`
   - Add `_registry.registerModule(fingerprintTools)` in the initialization block (follow pattern of existing registerModule calls)

**Files to read first:**
- `app/lib/agent/agent-types.ts` — `ToolDefinition`, `ToolModule`, `ToolHandler`, `AgentUser` types
- `app/lib/agent/tools/analytics-tools.ts` — existing analytics tool module for pattern reference
- `app/lib/agent/tool-registry.ts` — import + registration pattern (find where `registerModule` calls are)
- `app/lib/fingerprint/fingerprint-service.ts` — `getFingerprint()` and `getCourseFingerprint()` return shapes
- `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` lines ~1152-1243 — exact tool definitions and handler logic

### Task 6B: Nightly Cron Job — Fingerprint Refresh

Create a cron route that refreshes all user fingerprints and course aggregates on a nightly schedule.

1. **Add batch refresh functions to `app/lib/fingerprint/fingerprint-service.ts`**:
   ```typescript
   export async function refreshAllFingerprints(): Promise<{ refreshed: number; errors: number }>
   ```
   - Query all users with at least 1 `ToolSession` in the last 90 days
   - For each user, call `refreshFingerprint(userId)` with try/catch (count errors, don't throw)
   - Return `{ refreshed, errors }`

   ```typescript
   export async function refreshAllCourseFingerprints(): Promise<{ refreshed: number; errors: number }>
   ```
   - Query all courses with at least 1 enrolled student
   - For each course, call `refreshCourseFingerprint(courseId)` with try/catch
   - Return `{ refreshed, errors }`

2. **Create `app/api/cron/fingerprint-refresh/route.ts`** — `POST`:
   - Auth: `verifyCronSecret(req)` — returns error response if invalid
   - Calls `refreshAllFingerprints()` and `refreshAllCourseFingerprints()` in parallel (`Promise.all`)
   - Returns JSON summary: `{ users: { refreshed, errors }, courses: { refreshed, errors }, durationMs }`
   - Wrap in try/catch for safety

**Files to read first:**
- `app/lib/server-auth.ts` — `verifyCronSecret` signature
- `app/api/cron/process-sandy-tasks/route.ts` — existing cron route pattern
- `app/lib/fingerprint/fingerprint-service.ts` — existing `refreshFingerprint()` and `refreshCourseFingerprint()` functions

## The Specs

**Files to create:**
- `app/lib/agent/tools/fingerprint-tools.ts`
- `app/api/cron/fingerprint-refresh/route.ts`

**Files to modify:**
- `app/lib/agent/tool-registry.ts` — import + register fingerprint tools
- `app/lib/fingerprint/fingerprint-service.ts` — add `refreshAllFingerprints()` and `refreshAllCourseFingerprints()`

**Files NOT to modify:**
- `prisma/schema.prisma` — no schema changes
- Any Phase 1-5 file except `fingerprint-service.ts` (adding batch functions only)

## The Engine is Complete

After Phase 6, the full Engagement Fingerprint Engine is operational:

| Phase | What | Files |
|---|---|---|
| 1 | Schema + types + data fetchers | 3 files |
| 2 | 5 computation modules + engine + service | 7 files |
| 3 | 3 API routes + student LearningProfileCard | 5 files |
| 4 | Sandy context + chat/concierge injection + hub personalization | 6 files |
| 5 | Faculty ClassFingerprintPanel + notification timing | 5 files |
| 6 | Sandy agent tools + nightly cron | 3 files created, 2 modified |

**Total: ~29 files, 6 consumers (student card, faculty dashboard, Sandy context, hub ordering, notification timing, agent tools), 1 cron job.**
