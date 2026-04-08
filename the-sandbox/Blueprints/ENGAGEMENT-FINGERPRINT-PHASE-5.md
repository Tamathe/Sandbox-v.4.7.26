# Handoff Prompt: Engagement Fingerprint Engine — Phase 5 of 6

## Context

You are continuing the **Engagement Fingerprint & Hyper-Personalization Engine** build for the platform — the AI-powered operating system of the University of Kentucky.

**Full architecture blueprint:** `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` — read this for the complete service architecture, computation logic, consumer integration specs, and UI component wireframes.

**Phase 1 is COMPLETE** — Schema (`EngagementFingerprint`, `CourseFingerprint` models in `prisma/schema.prisma`), type definitions (`app/lib/fingerprint/types.ts`), and 14 data fetchers (`app/lib/fingerprint/data-fetchers.ts`).

**Phase 2 is COMPLETE** — 5 pure computation modules (`temporal.ts`, `learning.ts`, `engagement.ts`, `social.ts`, `responsiveness.ts`), engine orchestrator (`fingerprint-engine.ts`), and persistence service (`fingerprint-service.ts`).

**Phase 3 is COMPLETE** — 3 API routes (`/api/fingerprint/me`, `/api/fingerprint/course/[courseId]`, `/api/fingerprint/refresh`), `LearningProfileCard.tsx` student component wired into `StudentHomepage.tsx`.

**Phase 4 is COMPLETE.** Here is what was built:

### Phase 4 Deliverables (already on disk)

1. **Sandy Context Builder** (`app/lib/fingerprint/sandy-context.ts`):
   - `buildFingerprintBlock(userId: string): Promise<string>` — returns `<learner-profile>` XML block or empty string if confidence < 0.2
   - `formatHour(h: number): string` — converts 0-23 to "12 AM", "1 PM", etc.
   - Generates natural-language profile with: chronotype, peak hours, session cadence, sessions/week, avg session minutes, preferred study modes, modality, learning velocity, mastery retention guidance, collaboration style, deadline behavior, nudge response rate, confidence
   - Appends behavioral instructions for Sandy (adapt timing to chronotype, respect solo/group preference, adjust pushiness based on nudge response rate, cadence-specific advice for binge-learners/crammers)

2. **Sandy Context API Route** (`app/api/fingerprint/sandy-context/route.ts`):
   - `GET`, `requireRequestUser`, returns `{ context: string | null }`
   - Enables client-side surfaces (Study Buddy, etc.) to fetch fingerprint context

3. **Concierge Integration** (`app/lib/concierge-service.ts` + `app/api/concierge/route.ts`):
   - `buildSystemPrompt()` gained new optional param `fingerprintContext?: string | null`
   - Injected at end of context chain: `${universitySystemsContext ?? ''}${fingerprintContext ?? ''}`
   - Concierge route computes `fingerprintContext` via dynamic `import('../../lib/fingerprint/sandy-context')` with non-fatal try/catch
   - Passed as final arg to `buildSystemPrompt()`

4. **Chat Service Integration** (`app/lib/chat-service.ts`):
   - `buildChatSystemPrompt()` calls `buildFingerprintBlock(userId)` after user memories section
   - Appended via `systemPrompt = \`${systemPrompt}${fpBlock}\`` pattern
   - Non-fatal try/catch — chat works without fingerprint

5. **Hub Fingerprint Personalization** (`app/lib/fingerprint/hub-personalization.ts`):
   - `personalizeCollectionOrder<T>(userId, collections): Promise<T[]>` — generic over any collection shape with `tools` array
   - Returns collections unchanged if fingerprint null or confidence < 0.3
   - Pinned tools always stay first; unpinned tools reordered by affinity score
   - `computeToolAffinity()` scores based on: modality match (+2, keyword scan against tool name/description/category), collaborative match (+1.5 for high collab users), study mode match (+3), cadence-appropriate boosts (+1 for quick/deep tools)

6. **Hub API Wiring** (`app/api/hub/personalized/route.ts`):
   - Imports `personalizeCollectionOrder` from fingerprint hub-personalization
   - After `getPersonalizedCollections()`, applies `personalizeCollectionOrder()` with non-fatal try/catch
   - Tools within each collection reordered by fingerprint affinity

**All Phase 4 files pass `npx tsc --noEmit` with zero errors.**

**Key codebase conventions (from CLAUDE.md):**
- Prisma v7 with PrismaPg adapter. Import from `../generated/prisma`.
- Business logic in `app/lib/`, never in route files.
- Auth guards required on every route.
- Tailwind v4, lucide-react icons only, `size-X` not `w-X h-X`.
- Charts: recharts library.
- Card style: `border rounded-2xl shadow-sm`, `font-extrabold` headings.
- Sandy visual standard: `bg-[#0033A0]` header, `bg-white border border-gray-100 rounded-2xl rounded-tl-sm` assistant bubbles.

## The Goal

**Execute ONLY these two tasks, then STOP:**

### Task 5A: Faculty Course Fingerprint Dashboard

Create a faculty-facing component that visualizes the class-level aggregate fingerprint on the analytics page. This shows class distributions, not individual students (FERPA-safe).

1. **Create `app/components/analytics/ClassFingerprintPanel.tsx`** — A dashboard panel showing:
   - **Header**: "Class Profile — {courseCode}" with student count badge
   - **Chronotype distribution**: Horizontal bar chart (recharts `BarChart`) showing percentage of early-bird / night-owl / steady / weekend-warrior
   - **Study cadence distribution**: Horizontal bar chart for daily-grinder / binge-learner / sprint-rester / crammer / minimal
   - **Social orientation breakdown**: 3 segments (solo / small-group / community-active) with percentages
   - **Summary stats row**: Avg sessions/week, avg session minutes, avg retention (3 stat cards)
   - **Risk signals**: Amber warning badges from `riskSignals` array (e.g., "40% crammers", "Low nudge response")
   - **Top study modes**: Pill badges for the dominant study modes
   - Fetches from `GET /api/fingerprint/course/{courseId}` via `useEffect` + `fetch`
   - Loading skeleton, empty state ("Not enough student data to build a class profile")
   - Card style: `border rounded-2xl shadow-sm p-6`, `font-extrabold` heading
   - Uses recharts for charts, lucide-react icons only

2. **Wire into faculty analytics page**:
   - Read `app/(pages)/analytics/faculty/page.tsx` to understand the tab structure
   - Add a new tab or section: "Class Profile" (or integrate into existing course-level view)
   - Import and render `ClassFingerprintPanel` with the selected courseId
   - Only visible to EDUCATOR and ADMIN roles

**Files to read first:**
- `app/(pages)/analytics/faculty/page.tsx` — current tab structure and course selection
- `app/lib/fingerprint/fingerprint-service.ts` — `getCourseFingerprint()` return shape
- `app/api/fingerprint/course/[courseId]/route.ts` — existing route (already built in Phase 3)
- `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` lines ~1112-1137 — `ClassFingerprintPanel` wireframe

### Task 5B: Notification Timing Optimization

Create a service that determines the optimal time to send Sandy nudges based on the user's peak activity hours from their fingerprint.

1. **Create `app/lib/fingerprint/notification-timing.ts`**:
   ```typescript
   export async function getOptimalNotificationWindow(userId: string): Promise<{ hour: number; day: number } | null>
   ```
   - Calls `getFingerprint(userId)` from `fingerprint-service.ts`
   - Returns `null` if fingerprint is null or confidence < 0.3
   - Returns `{ hour: peakHours[0], day: peakDays[0] }` — the user's primary peak hour and day
   - Export a helper: `isWithinPeakWindow(userId: string): Promise<boolean>` — returns true if current hour is within +/- 1 hour of any peak hour

2. **Create `app/api/fingerprint/optimal-timing/route.ts`** — `GET`:
   - Auth: `requireRequestUser(req)`
   - Calls `getOptimalNotificationWindow(auth.user.id)`
   - Returns `{ timing: { hour, day } | null }`

3. **Wire into Sandy proactive nudges** — modify `app/lib/concierge-service.ts`:
   - In the SR nudge section (where `srNudgeSection` is built), add a timing check: if the user has a fingerprint with peak hours, only inject the SR nudge if the current hour is within +/- 1 of a peak hour
   - Use `isWithinPeakWindow()` for this check
   - This ensures Sandy's nudges arrive when the student is most likely to act on them

**Files to read first:**
- `app/lib/concierge-service.ts` — find the `srNudgeSection` construction (around line 356-397) and the existing throttle logic
- `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` lines ~1044-1057 — notification timing reference implementation

## The Specs

**Files to create:**
- `app/components/analytics/ClassFingerprintPanel.tsx`
- `app/lib/fingerprint/notification-timing.ts`
- `app/api/fingerprint/optimal-timing/route.ts`

**Files to modify:**
- `app/(pages)/analytics/faculty/page.tsx` — add ClassFingerprintPanel
- `app/lib/concierge-service.ts` — timing-aware SR nudges

**Files NOT to modify:**
- `prisma/schema.prisma` — no schema changes
- Any file in `app/lib/fingerprint/` except the new `notification-timing.ts`
- Any Phase 1-4 file

## The Next Link

When you have completed ONLY Tasks 5A and 5B:
1. Verify all new/modified files have no TypeScript errors (`npx tsc --noEmit` and grep for `fingerprint/`)
2. Then generate the **next handoff prompt** for Phase 6 (Tasks 6A + 6B): Sandy agent tool (`get_learner_profile` + `get_class_profile` tools registered in agent tool registry) + nightly cron job (refreshes all fingerprints and course aggregates on a schedule). Include full context of what was completed in Phases 1-5, the exact files to create/modify, and the technical approach. The handoff prompt must follow the same format as this one (Context, Goal, Specs, Next Link).
