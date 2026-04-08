# Handoff Prompt — Sprint M15: Complementary Study Matching (Schema + Service + API)

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST for complete context, type definitions, and interfaces. You are
executing Sprint M15 (Tasks 29-30). Sprints M1-M12 are complete.

The Sandbox uses:
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; guards in `app/lib/server-auth.ts`
- AI: Anthropic — Haiku (`claude-haiku-4-5-20251001`) for chat/inference, Sonnet (`claude-sonnet-4-6`) for analysis
- Icons: lucide-react ONLY
- UI pattern: `border-2 rounded-2xl border-gray-200` cards, `font-extrabold` h1/h2, UK Blue `#0033A0`
- No new npm dependencies
- Read `the-sandbox/CLAUDE.md` for all coding constraints

## Completed Magic Moments Sprints

### M1-M4 — Knowledge Constellation (Complete):
- Service: `the-sandbox/app/lib/constellation-service.ts`
  - Exports: `getSemesterConstellation(userId, semester?)`, `getDegreeArc(userId)`
- API: `GET /api/constellation/semester?semester=X`, `GET /api/constellation/degree-arc`
- Page: `the-sandbox/app/constellation/page.tsx` — two-tab view (Semester / Degree Arc)
- 9 components in `the-sandbox/app/components/constellation/`:
  `SemesterConstellation.tsx`, `ConstellationNode.tsx`, `TransferEdgeLine.tsx`,
  `ConstellationLegend.tsx`, `ConstellationStats.tsx`, `DegreeArcTimeline.tsx`,
  `ArcCourseCard.tsx`, `MilestoneMarker.tsx`, `RequirementSidebar.tsx`

### M5-M6 — Learning Time Machine (Complete):
- Service: `the-sandbox/app/lib/timeline-service.ts`
  - Exports: `getTimeline`, types: `LearningTimeline`, `TimelineEvent`, `TimelineOptions`, `TimelineEventType`, `TimelineStats`
- API: `GET /api/timeline?courseId&from&to&limit&offset&types` — Auth: `requireStudentUser()`
- Page: `the-sandbox/app/timeline/page.tsx`
- 6 components in `the-sandbox/app/components/timeline/`:
  `TimelineFilters.tsx`, `TimelineChart.tsx`, `TimelineStream.tsx`,
  `TimelineEventCard.tsx`, `TimelineInsights.tsx`, `TimelineCard.tsx`

### M7-M8 — Interstitial Micro-Reviews (Complete):
- Schema: `MicroReview` model in `prisma/schema.prisma`
- Service: `the-sandbox/app/lib/micro-review-service.ts`
  - Exports: `getMicroReview(userId, courseId)`, `submitMicroReviewResponse(reviewId, userId, answer, skipped, responseTimeMs?)`
- API: `GET /api/micro-review?courseId=X`, `POST /api/micro-review/[id]/respond`
- Components: `MicroReviewModal.tsx`, `MicroReviewInlineCard.tsx`

### M9-M10 — Exam Forge (Complete):
- Schema: `PracticeExam` model in `prisma/schema.prisma`
- Service: `the-sandbox/app/lib/exam-forge-service.ts`
  - Exports: `generatePracticeExam()`, `submitPracticeExam()`, `listPracticeExams()`
- API: `GET/POST /api/exam-forge`, `GET /api/exam-forge/[examId]`, `POST /api/exam-forge/[examId]/submit`, `GET /api/exam-forge/stats`
- 6 components + 2 pages (`/exam-forge`, `/exam-forge/[examId]`)

### M11-M12 — Teach It Back (Complete):
- Schema: `TeachBackSession` model in `prisma/schema.prisma`
- Service: `the-sandbox/app/lib/teach-back-service.ts`
  - Exports: `startTeachBack(userId, courseId, conceptSlug?)`, `sendTeachBackMessage(sessionId, userId, message)`,
    `completeTeachBack(sessionId, userId)`, `listTeachBackSessions(userId, courseId?)`
- API: `GET /api/teach-back`, `POST /api/teach-back/start`, `POST /api/teach-back/[sessionId]/message`, `POST /api/teach-back/[sessionId]/complete`
- 4 components in `the-sandbox/app/components/teach-back/` + page at `/teach-back/[sessionId]`

## Key Files to Read Before Starting
- `prisma/schema.prisma` — existing models you'll need:
  - `StudentConceptMastery` (lines vary) — per-concept mastery with `updatedAt` for decay
  - `StudentDomainModality` (line 2598) — preferred learning modality per domain
  - `ConceptState` — Bloom levels, SR stability
  - `CourseEnrollment` — who is enrolled in which courses
  - `User` (line 1+) — has `studyGroup String?` field (A/B assignment: "treatment" | "control")
  - `ChatGroup` (line 2804) — existing Discord-style group chat system
  - `ChatChannel`, `ChatMembership` — chat infrastructure
- `app/lib/concept-mastery-service.ts` — `getConceptMasteries(userId)` returns enriched mastery records; `upsertConceptMastery()`
- `app/lib/mastery-decay.ts` — `applyMasteryDecay(mastery)` returns effective mastery (0-1), `isMasteryStale(mastery)` checks staleness
- `app/lib/group-chat-service.ts` — `getEligibleGroups()`, `generateSandyReply()`, `publishToChannelStream()` — existing chat plumbing
- `app/lib/server-auth.ts` — `requireStudentUser()`, `isAuthFailure()`
- `app/api/teach-back/start/route.ts` — thin route handler pattern reference
- `Blueprints/magic-moments-architecture.md` § "7. Complementary Study Matching" — full spec

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 29: StudyMatchProfile + StudyMatch Schema + study-match-service.ts + API Routes

1. **Add 2 models** to `prisma/schema.prisma`:

   ```prisma
   model StudyMatchProfile {
     id              String   @id @default(cuid())
     userId          String   @unique
     user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
     optedIn         Boolean  @default(false)
     availableHours  Json?                 // { "Mon": ["14:00-16:00"], ... }
     preferredSize   Int      @default(3)  // 2-4
     updatedAt       DateTime @updatedAt
     createdAt       DateTime @default(now())
   }

   model StudyMatch {
     id                   String   @id @default(cuid())
     courseId              String
     course               Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
     members              Json                  // StudyMatchMember[]
     complementarityScore Float                 // 0-1 how well gaps align
     matchReason          String   @db.Text     // human-readable explanation
     status               String   @default("suggested")  // "suggested" | "accepted" | "declined" | "active"
     createdAt            DateTime @default(now())
     expiresAt            DateTime              // matches expire after 2 weeks

     @@index([courseId])
   }
   ```

   - Add reverse relations:
     - On `User`: `studyMatchProfile StudyMatchProfile?`
     - On `Course`: `studyMatches StudyMatch[]`
   - Run: `npx prisma db push`
   - Run: `npx prisma generate`

2. **Create `the-sandbox/app/lib/study-match-service.ts`:**

   Exports:

   - `upsertMatchProfile(userId, data)` → `StudyMatchProfile`
     - Create or update `StudyMatchProfile` with `optedIn`, `availableHours`, `preferredSize`

   - `getMatchProfile(userId)` → `StudyMatchProfile | null`
     - Simple fetch for the student's opt-in status and preferences

   - `getSuggestions(userId, courseId)` → `StudyMatchSuggestion[]`
     1. Verify caller has `StudyMatchProfile.optedIn = true` — if not, throw "Opt in to study matching first"
     2. Fetch all students in the same course via `CourseEnrollment` who also have `optedIn = true`
     3. For each opted-in student: build concept vector using `getConceptMasteries()` + `applyMasteryDecay()`
        - `strengths`: concepts with effective mastery > 0.75
        - `weaknesses`: concepts with effective mastery < 0.5
     4. **Complementarity algorithm:**
        - For each pair (caller, candidate): `score = avg(caller.strength on candidate.weakness) + avg(candidate.strength on caller.weakness)`
        - Normalize by number of complementary concepts
        - Filter: keep only pairs where `complementarityScore > 0.4`
        - Bonus: `+0.1` if `availableHours` keys overlap (any shared day)
        - Bonus: `+0.05` if students have different `StudentDomainModality` for the course domain
     5. Group candidates into clusters of `preferredSize` using greedy matching:
        - Sort pairs by complementarity score descending
        - Greedily form groups, adding the next best complementary member until group is full
     6. For each group: generate `matchReason` via Haiku:
        - Prompt: "These students are in [courseCode]. [Name1] is strong in [X,Y] but weak in [A,B]. [Name2] is strong in [A,B] but weak in [X,Y]. Write a 1-2 sentence explanation of why they'd be good study partners. Use first names only. Do not mention scores."
     7. Create `StudyMatch` records with `status: "suggested"`, `expiresAt: now + 14 days`
     8. Return top 3 suggestions

   - `respondToMatch(matchId, userId, action)` → `{ status: string, chatGroupId?: string }`
     1. Fetch the `StudyMatch`, verify the user is in the `members` array
     2. If `action === "decline"`: update status to "declined", return
     3. If `action === "accept"`:
        - Mark this user as accepted in the members JSON
        - Check if ALL members have accepted
        - If all accepted: update status to "active", create a `ChatGroup` (type `STUDY`) with a `ChatChannel` (name: "general"), add all members as `ChatMembership`
        - Return the chatGroupId if group was created

   Types to export:
   ```typescript
   export interface StudyMatchMember {
     userId: string
     name: string                    // first name only (FERPA)
     strengths: string[]             // concept labels (not scores)
     canHelpWith: string[]           // concepts this person can teach the others
     needsHelpWith: string[]         // concepts this person needs help with
     accepted?: boolean              // track per-member acceptance
   }

   export interface StudyMatchSuggestion {
     id: string
     courseId: string
     courseCode: string
     members: StudyMatchMember[]
     complementarityScore: number
     matchReason: string
     expiresAt: string
     status: string
   }
   ```

3. **Create 3 API routes:**

   **`the-sandbox/app/api/study-match/opt-in/route.ts`:**
   - POST `{ optedIn: boolean, availableHours?: object, preferredSize?: number }`
   - Auth: `requireStudentUser()` → `upsertMatchProfile`
   - GET (no body) → `getMatchProfile` — return current opt-in status

   **`the-sandbox/app/api/study-match/suggestions/route.ts`:**
   - GET `?courseId=xxx`
   - Auth: `requireStudentUser()` → `getSuggestions`
   - Return 400 if no courseId

   **`the-sandbox/app/api/study-match/[matchId]/respond/route.ts`:**
   - POST `{ action: "accept" | "decline" }`
   - Auth: `requireStudentUser()` → `respondToMatch`
   - Return 400 if action is not "accept" or "decline"

### Task 30: (Reserved for Sprint M16 — UI)
This task is NOT part of this sprint. Stop after Task 29.

## FERPA — Critical Constraints
- **Never expose mastery scores to other students.** Members see only: first name, shared course, compatibility score, and complementary topic names (concept labels, NOT numeric mastery values)
- Matching algorithm runs entirely server-side
- Opt-in is required — no matching without `optedIn = true`
- Students can opt out at any time by setting `optedIn = false`
- The `StudyMatchMember.strengths/canHelpWith/needsHelpWith` arrays contain **concept label strings only**, never numeric scores
- `matchReason` is AI-generated using first names only — no PII, no grades, no scores

## Key Constraints
- No new npm dependencies
- Tailwind v4 only (no @apply, utility classes in JSX)
- lucide-react ONLY for icons
- Follow ALL constraints from CLAUDE.md
- Use Haiku (`claude-haiku-4-5-20251001`) for match reason generation
- Thin API routes: auth → parse → call lib → return
- The `ChatGroup` model already exists (line 2804 in schema) — the chat system is fully built. Use existing `ChatGroupType` enum (add `STUDY` variant if it doesn't exist). Use existing `ChatMembership` model for group members.
- `User.studyGroup` (line 84 in schema) is the A/B experiment group, NOT related to study matching. Do not cross-contaminate A/B groups in matching (only match students within the same `studyGroup` value).
- Run `npx tsc --noEmit` after to verify 0 errors

## The Next Link
After completing Task 29, generate a Handoff Prompt for Sprint M16 (Tasks 31-32):
- Task 31: StudyMatchPage (`/study-match`) with OptInCard, CourseSelector, MatchSuggestions, ActiveMatches
- Task 32: MatchCard, TopicOverlap components + course page "Find Study Partners" integration
Include full Context section noting M1-M15 are complete with file paths and exports.
