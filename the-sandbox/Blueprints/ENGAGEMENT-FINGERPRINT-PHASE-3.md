# Handoff Prompt: Engagement Fingerprint Engine — Phase 3 of 6

## Context

You are continuing the **Engagement Fingerprint & Hyper-Personalization Engine** build for the platform — the AI-powered operating system of the University of Kentucky.

**Full architecture blueprint:** `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` — read this for the complete service architecture, computation logic, and API specs.

**Phase 1 is COMPLETE.** Here is what was built:

### Phase 1 Deliverables (already on disk)

1. **Schema changes** (`prisma/schema.prisma`):
   - `EngagementFingerprint` model (~line 6451) — one per user, stores temporal, learning, engagement, social, responsiveness, and meta fields. Indexes on `[userId]` (unique), `[userId, computedAt]`, `[chronotype]`, `[confidence]`.
   - `CourseFingerprint` model (~line 6502) — one per course, stores class-level aggregate distributions, averages, derived insights. Indexes on `[courseId]` (unique), `[courseId, computedAt]`.
   - `User.engagementFingerprint` relation added.
   - `Course.courseFingerprint` relation added.
   - Database synced via `prisma db push`. Prisma client regenerated.

2. **Type definitions** (`app/lib/fingerprint/types.ts`):
   - `TemporalProfile` — peakHours, peakDays, chronotype, sessionCadence
   - `LearningProfile` — preferredStudyModes, preferredModality, bloomProfile, learningVelocity, masteryRetention
   - `EngagementShape` — toolDiversity, consistencyScore, avgSessionMinutes, sessionsPerWeek, deadlineProximity
   - `SocialProfile` — collaborationIndex, socialOrientation, liveRoomWeekly, messagingWeekly, studyGroupCount
   - `ResponsivenessProfile` — nudgeResponseRate, announcementReadRate, sandyEngagementRate
   - `FingerprintMeta` — signalCount, confidence, windowDays, version
   - `ComputedFingerprint` — combines all 6 sub-interfaces

3. **Data fetchers** (`app/lib/fingerprint/data-fetchers.ts`):
   - 14 thin Prisma query wrappers, each takes `(userId: string, since: Date)`.
   - Key field adaptations: `ToolSession.startedAt` (not `createdAt`), `ToolSession.durationSeconds` (not `durationMinutes`), `ToolSession.bloomLevel` is `Int?` (not String), `FlashcardState.lastQuality` / `reviewCount`, `StudentConceptMastery.masteryLevel` / `lastSeenAt`, `Assignment.dueAt` (nullable), `Submission.studentId` / `submittedAt` (nullable)

**Phase 2 is COMPLETE.** Here is what was built:

### Phase 2 Deliverables (already on disk)

1. **5 Computation Modules** (pure functions, no Prisma/LLM):

   - **`app/lib/fingerprint/temporal.ts`** — `computeTemporalProfile(sessions, since, windowDays) → TemporalProfile`
     - Builds hour (0-23) and day (0-6) distributions from `session.startedAt`
     - Chronotype: weekend >50% → "weekend-warrior", morning >55% → "early-bird", evening >55% → "night-owl", else "steady"
     - Session cadence: <10% active days → "minimal", >60% + low burst → "daily-grinder", burst >5 → "binge-learner", >30% + burst >3 → "sprint-rester", else "crammer"
     - Exports helpers: `topN(counts, n)`, `sum(arr)`

   - **`app/lib/fingerprint/learning.ts`** — `computeLearningProfile(sessions, flashcardStats, conceptMastery, domainModalities) → LearningProfile`
     - Study modes parsed from `notes` field (`mode:\s*(\w+)` regex)
     - Modality from `domainModalities[0].preferredModality` (sorted by confidence desc), fallback "mixed"
     - Bloom profile: `masteryLevel` 0-5 maps to 6 Bloom buckets, normalized
     - Learning velocity: compare avg mastery in first vs second half of sorted concepts
     - Retention: `flashcardStats.filter(f => f.lastQuality >= 3).length / total`, fallback 0.5

   - **`app/lib/fingerprint/engagement.ts`** — `computeEngagementShape(sessions, submissions, assignments, since, windowDays) → EngagementShape`
     - toolDiversity: unique toolIds / 76, capped at 1.0
     - consistencyScore: inverted coefficient of variation of daily counts (CV ≥ 3 → 0)
     - avgSessionMinutes: `durationSeconds / 60` averaged
     - deadlineProximity: avg lead hours >72h → "planner", 24-72h → "steady", 0-24h → "crammer", >30% late → "late"

   - **`app/lib/fingerprint/social.ts`** — `computeSocialProfile(liveRooms, messageActivity, studyGroupMemberships, sessionCount, windowDays) → SocialProfile`
     - collaborationIndex: socialActivity / (sessionCount + socialActivity), capped [0,1]
     - socialOrientation: index <0.15 → "solo", <0.4 or (groups ≤ 2 and liveRoom < 2/week) → "small-group", else "community-active"

   - **`app/lib/fingerprint/responsiveness.ts`** — `computeResponsiveness(interventions, postReads, totalPosts, sandyTraces) → ResponsivenessProfile`
     - All three rates: accepted / total, fallback 0.5 if denominator is 0

2. **Engine Orchestrator** (`app/lib/fingerprint/fingerprint-engine.ts`):
   - `computeFingerprint({ userId, windowDays? }) → Promise<ComputedFingerprint>`
   - Calls all 14 data fetchers in parallel via `Promise.all`
   - Passes results to 5 computation modules
   - Computes signalCount from session + flashcard + concept + liveRoom + message + intervention + wellness counts
   - Confidence = `min(1, signalCount / 100)`

3. **Persistence Service** (`app/lib/fingerprint/fingerprint-service.ts`):
   - `getFingerprint(userId)` — returns cached if <24h old, else lazy-refreshes
   - `refreshFingerprint(userId)` — recomputes + upserts to DB
   - `getCourseFingerprint(courseId)` — cached or recomputes
   - `refreshCourseFingerprint(courseId)` — fetches enrolled students, gets each fingerprint, aggregates distributions + averages + risk signals
   - `flattenFingerprint(computed)` — maps nested interface to flat Prisma fields
   - `unflattenFingerprint(row)` — reconstructs ComputedFingerprint from DB row
   - `aggregateFingerprints(fps[])` — builds distributions, averages, dominant categories, risk signals, engagement trend

**All 7 Phase 2 files pass `npx tsc --noEmit` with zero errors.**

**Key codebase conventions (from CLAUDE.md):**
- Prisma v7 with PrismaPg adapter. Generated client at `app/generated/prisma`. Import from `../generated/prisma`.
- Business logic in `app/lib/`, never in route files.
- Auth guards required on every route (`requireRequestUser`, etc. from `app/lib/server-auth.ts`).
- Route pattern: `withErrorHandling` wrapper, auth → parse → call lib → return.
- Tailwind v4, lucide-react icons only, `size-X` not `w-X h-X`.
- PageHeader, border rounded-2xl shadow-sm cards, font-extrabold h1/h2.

## The Goal

**Execute ONLY these two tasks, then STOP:**

### Task 3A: Three API Routes

Create 3 thin API routes following the project's route pattern (`withErrorHandling`, auth guard, call service, return JSON):

1. **`app/api/fingerprint/me/route.ts`** — `GET`
   - Auth: `requireRequestUser(req)`
   - Calls `getFingerprint(user.id)` from `fingerprint-service.ts`
   - Returns the full `ComputedFingerprint` JSON
   - If null (new user, no data), return `{ fingerprint: null, message: 'Not enough data yet' }`

2. **`app/api/fingerprint/course/[courseId]/route.ts`** — `GET`
   - Auth: `requireEducatorUser(req)` (educators + admins can view class fingerprints)
   - Reads `courseId` from route params
   - Calls `getCourseFingerprint(courseId)` from `fingerprint-service.ts`
   - Returns the full course fingerprint JSON
   - If null, return `{ fingerprint: null, message: 'No enrolled students or insufficient data' }`

3. **`app/api/fingerprint/refresh/route.ts`** — `POST`
   - Auth: `requireRequestUser(req)`
   - Body: `{ courseId?: string }` — if provided, refreshes course fingerprint; else refreshes user's own
   - If `courseId` provided: check user is educator/admin via role check, call `refreshCourseFingerprint(courseId)`
   - If no `courseId`: call `refreshFingerprint(user.id)`
   - Returns the refreshed fingerprint

**Files to read first:**
- `app/lib/server-auth.ts` — auth guard signatures and return types
- `app/lib/api-utils.ts` — `withErrorHandling` wrapper
- Any existing route file for pattern reference (e.g., `app/api/dining/route.ts`)

### Task 3B: "My Learning Profile" Student Component

Create a student-facing component that visualizes the user's fingerprint on the student homepage:

1. **`app/components/student-home/LearningProfileCard.tsx`** — A compact card showing:
   - **Chronotype badge** — icon + label (e.g., Moon icon + "Night Owl")
   - **Session cadence** — descriptive label (e.g., "Daily Grinder")
   - **Top study modes** — pill badges for top 3
   - **Learning velocity** — arrow icon + label (TrendingUp/Minus/TrendingDown)
   - **Collaboration style** — icon + label (User/Users/Globe)
   - **Confidence meter** — small progress bar showing data confidence (0-100%)
   - **Deadline behavior** — icon + label (e.g., Calendar + "Planner")
   - Fetches from `GET /api/fingerprint/me` via `useSWR`
   - Shows skeleton/loading state while fetching
   - Shows "Keep using the platform to build your profile" if fingerprint is null
   - Card style: `border rounded-2xl shadow-sm p-6`, `font-extrabold` heading
   - Uses lucide-react icons only, `size-X` not `w-X h-X`

2. **Wire into `StudentHomepage.tsx`**:
   - Import and render `LearningProfileCard` in an appropriate section (after the greeting/beacon area, before Campus Life)
   - Only render for STUDENT role
   - Respect night mode: hide during `isLateNight`

**Files to read first:**
- `app/components/student-home/StudentHomepage.tsx` — current layout and section ordering
- `app/components/student-home/BeaconCard.tsx` — card style reference
- `app/components/student-home/SandyBriefing.tsx` — SWR fetch pattern reference
- `PLATFORM-CONSISTENCY-MANIFEST.md` — UI standards

## The Specs

**Files to create:**
- `app/api/fingerprint/me/route.ts`
- `app/api/fingerprint/course/[courseId]/route.ts`
- `app/api/fingerprint/refresh/route.ts`
- `app/components/student-home/LearningProfileCard.tsx`

**Files to modify:**
- `app/components/student-home/StudentHomepage.tsx` — add LearningProfileCard

**Files NOT to modify:**
- `prisma/schema.prisma` — no schema changes in Phase 3
- Any file in `app/lib/fingerprint/` — already complete from Phases 1-2

## The Next Link

When you have completed ONLY Tasks 3A and 3B:
1. Verify all new files have no TypeScript errors (`npx tsc --noEmit` and grep for `fingerprint/`)
2. Then generate the **next handoff prompt** for Phase 4 (Tasks 4A + 4B): Sandy fingerprint integration (inject fingerprint into Sandy's system prompt across concierge + Study Buddy + tool chat) + Hub personalization (reorder tool lanes based on fingerprint). Include full context of what was completed in Phases 1-3, the exact files to create/modify, and the technical approach. The handoff prompt must follow the same format as this one (Context, Goal, Specs, Next Link).
