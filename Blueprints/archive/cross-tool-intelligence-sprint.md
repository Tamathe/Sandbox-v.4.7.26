# Cross-Tool Intelligence Sprint
## The Sandbox · University of Kentucky
### Lead Engineer Document — Living Spec
**Created:** 2026-03-22
**Goal:** Make every tool on the platform smarter by exposing student intelligence cross-tool, give Sandy the ability to orchestrate multi-tool study plans, make the marketplace self-sustaining via tool forking discoverability and a student request board.

---

## Context-Handoff Protocol

**What was just completed (prior sprints):**
- Year 1 Data Foundation — `StudentProfile`, `ConceptMastery`, `DomainModality`, `TransferEvent`, mastery decay, session enrichment (durationSeconds, hintCount, exitReason, conceptsTouched, bloomLevel, cognitiveLoad, frustrationScore)
- Intelligence Surfaces — StudentProfile rendered in student/educator analytics, recommendations widget
- Personalization Ceiling — ConceptMastery, DomainModality, TransferEvent, episodic memory, mastery decay
- Sandy concierge — 10+ context blocks (StudentIntelligence, SRContext, FrustrationAlert, BloomAlert, episodic memory, domain modality, UKNow RAG, alerts)
- Tool forking — `POST /api/tools/[id]/fork` fully implemented, UI button exists in overflow menu
- Builder system — 30+ templates, spec JSON in `<!--SPEC:{...}-->`, publish pipeline

**The gap:**
1. **Tools are blind.** Sandy knows everything about a student (risk, concepts, modality, frustration). Individual tool sessions know almost nothing — only mastery profile and misconception context for the current course. A Flashcard Forge session doesn't know the student scored 30% on the same concept in a quiz yesterday.
2. **Sandy can't orchestrate.** Sandy can recommend a single tool via ACTION tags, but can't generate a sequenced multi-step study plan with context-preloaded tool launches.
3. **Fork is buried.** The fork button is hidden in an overflow "More" menu. Fork count isn't shown. No attribution on drafts.
4. **No demand signal.** Educators build tools in the dark. Students have no way to say "I wish this existed." The marketplace has no supply-demand feedback loop.

**What this sprint builds:**
Four features across six deployment phases (12 tasks, max 2 per phase).

---

## Why This Sprint Exists

The platform's data layer is richer than its experience layer. We have concept mastery, risk scores, Bloom levels, frustration detection, episodic memory, transfer events, mastery decay — and almost none of it reaches the student in an actionable way through tools. Sandy is the sole consumer.

This sprint turns 50+ disconnected tools into a coherent learning system by:
- Making every tool aware of the student's cross-tool learning state
- Giving Sandy the ability to create sequenced study plans
- Making the marketplace self-sustaining through fork virality and demand signals

Core principles served: **"The student is the point"**, **"Memory is a right, not a feature"**, **"The tools are a canvas, not a catalog"**

---

## What Already Exists (Do Not Rebuild)

| Component | File | What It Provides |
|---|---|---|
| `StudentProfile` model | `prisma/schema.prisma` | riskScore, learningVelocity, preferredModality, peakEngagementHour, topConceptsThisWeek, dominantBloomLevel, avgCognitiveLoad |
| `student-profile-service.ts` | `app/lib/` | Upserts StudentProfile after each scored session |
| `student-context-service.ts` | `app/lib/` | `getStudentContextString(userId, courseId?)` → formatted string for Sandy |
| `concept-mastery-service.ts` | `app/lib/` | `getConceptMasteries(userId)` → enriched masteries with decay applied |
| `mastery-decay.ts` | `app/lib/` | `applyMasteryDecay()`, `isMasteryStale()` — pure functions, read-time only |
| `domain-modality-service.ts` | `app/lib/` | `getDomainModalityBlock(userId, domain)` → modality preference string |
| `episodic-memory-service.ts` | `app/lib/` | `getEpisodicMemory(userId, concepts, limit)` → recent relevant sessions |
| `sr-scheduler.ts` | `app/lib/` | `getDueConcepts(userId)` → spaced-repetition due items |
| `intervention-service.ts` | `app/lib/` | Haiku-generated intervention recommendations |
| `concierge-service.ts` | `app/lib/` | `buildSystemPrompt()` with 10+ conditional context blocks |
| `/api/concierge/route.ts` | `app/api/` | Sandy route — parallel context queries, streaming, fire-and-forget post-processing |
| `chat-service.ts` | `app/lib/` | `buildChatSystemPrompt()` — tool session prompt with mastery profile, RAG, misconceptions, adaptive guardrail |
| `ConciergePanel.tsx` | `app/components/` | ACTION tag parsing (`navigate` + `launch` types), `inject` context base64-encoded |
| `/api/tools/[id]/fork/route.ts` | `app/api/` | Full fork implementation — clones spec to new BuildSession with `forkedFromId` |
| `builder-service.ts` | `app/lib/` | BuilderSpec interface includes `forkedFromId`, `forkedFromName` |
| Tool detail page | `app/tools/[id]/page.tsx` | Fork button in overflow menu (line ~789), handleFork(), ACTION bar |
| `ToolCard.tsx` | `app/components/` | Tool card with category badge, creator info, bookmark, session count |

---

## Decisions Made (Do Not Revisit)

| Decision | Rationale |
|---|---|
| **No StudyPlan persistence model** | Sandy generates plans ephemerally. StudyPlanLog is analytics-only. If student asks again, Sandy regenerates from current data (which may have changed). Stateless > stateful. |
| **No tool `contextAware` flag in V1** | All tools get context injection. If token costs spike, add opt-out flag later. |
| **No request status workflow in V1** | Requests are OPEN or FULFILLED. No IN_PROGRESS, no assignment, no notifications. Ship, measure, iterate. |
| **A/B gate on context injection** | Tool context injection gated by `User.studyGroup === 'treatment'` to measure impact. |
| **Token bump only on plan intent** | `max_tokens` goes from 600→1000 only when plan intent regex matches. Not globally. |
| **Gamification is dead** | Leaderboards, competitive elements, XP — all killed 2026-03-19. Do not rebuild under any framing. |

---

## Scope

| ID | Task | Phase | Schema? | Files | Priority |
|---|---|---|---|---|---|
| CTI-01 | Prisma schema migration (StudyPlanLog, ToolRequest, ToolRequestUpvote, Tool.forkedFromId) | A | **Yes** | `schema.prisma` | P0 |
| CTI-02 | Student Context API service (`student-context-api.ts`) | A | No | NEW: `app/lib/student-context-api.ts` | P0 |
| CTI-03 | Student Context API route (`GET /api/student-context`) | B | No | NEW: `app/api/student-context/route.ts` | P0 |
| CTI-04 | Chat service context injection (cross-tool awareness in tools) | B | No | MODIFY: `app/lib/chat-service.ts` | P0 |
| CTI-05 | Study Plan service (`study-plan-service.ts`) | C | No | NEW: `app/lib/study-plan-service.ts` | P0 |
| CTI-06 | Concierge service StudyPlanContext type + prompt block | C | No | MODIFY: `app/lib/concierge-service.ts` | P0 |
| CTI-07 | Concierge route plan intent detection + token bump + logging | D | No | MODIFY: `app/api/concierge/route.ts` | P0 |
| CTI-08 | Fork button promotion to primary action bar | D | No | MODIFY: `app/tools/[id]/page.tsx` | P1 |
| CTI-09 | Fork polish (ToolCard badge, Build drafts attribution, publish route) | E | No | MODIFY: `ToolCard.tsx`, `build/page.tsx`, `publish/route.ts` | P1 |
| CTI-10 | Tool Request API routes (create, list, upvote) | E | No | NEW: `app/api/tool-requests/` (3 files) | P1 |
| CTI-11 | Tool Request UI components (modal + card) | F | No | NEW: `ToolRequestModal.tsx`, `ToolRequestCard.tsx` | P1 |
| CTI-12 | Hub + Build page integration + Sandy educator request context | F | No | MODIFY: `hub/page.tsx`, `build/page.tsx`, `concierge-service.ts` | P1 |

---

## Phase Deployment Plan

### Phase A: Foundation (Schema + Context Service)

**CTI-01: Prisma Schema Migration**

Add to `prisma/schema.prisma`:

```prisma
model StudyPlanLog {
  id               String   @id @default(cuid())
  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId          String?
  course           Course?  @relation(fields: [courseId], references: [id])
  planType         String   // 'exam_prep' | 'concept_review' | 'catch_up' | 'general'
  conceptsTargeted String[]
  toolsRecommended String[] // tool IDs
  stepsCount       Int
  createdAt        DateTime @default(now())

  @@index([userId])
  @@index([courseId])
}

model ToolRequest {
  id              String              @id @default(cuid())
  title           String
  description     String
  category        String?
  courseId         String?
  course          Course?             @relation(fields: [courseId], references: [id])
  requesterId     String
  requester       User                @relation(fields: [requesterId], references: [id], onDelete: Cascade)
  status          String              @default("OPEN")  // OPEN | FULFILLED
  fulfilledToolId String?
  fulfilledTool   Tool?               @relation(fields: [fulfilledToolId], references: [id])
  upvotes         ToolRequestUpvote[]
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  @@index([courseId])
  @@index([requesterId])
  @@index([status])
}

model ToolRequestUpvote {
  id        String      @id @default(cuid())
  requestId String
  request   ToolRequest @relation(fields: [requestId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())

  @@unique([requestId, userId])
}
```

Add to existing `Tool` model:
```prisma
forkedFromId    String?
forkedFrom      Tool?     @relation("ToolForks", fields: [forkedFromId], references: [id])
forks           Tool[]    @relation("ToolForks")
```

Add back-relation arrays to `User` and `Course` models.

Run: `npx prisma migrate dev --name add-study-plan-tool-requests-fork-tracking && npx prisma generate`

**CTI-02: Student Context API Service**

Create `app/lib/student-context-api.ts` with:

```typescript
export interface StudentContextData {
  profile: {
    preferredModality: string | null
    riskScore: number | null
    learningVelocity: number | null
    dominantBloomLevel: number | null
    avgCognitiveLoad: number | null
    topConceptsThisWeek: string[]
    peakEngagementHour: number | null
    lastSessionAt: string | null
  } | null
  weakConcepts: { concept: string; effectiveMastery: number; isStale: boolean; encounterCount: number; lastSeenAt: string }[]
  strongConcepts: { concept: string; effectiveMastery: number; encounterCount: number }[]
  domainModality: { domain: string; preferredModality: string; confidenceScore: number } | null
  recentSessions: { toolName: string; courseCode: string | null; score: number | null; conceptsTouched: string[]; createdAt: string }[]
  dueConcepts: { conceptSlug: string; missedReviews: number; bloomHighWater: number | null }[]
}

export async function getStudentContextJSON(userId: string, courseId?: string): Promise<StudentContextData>
export async function getStudentContextForTool(userId: string, courseId?: string): Promise<string>
```

`getStudentContextJSON` calls existing services in parallel (StudentProfile, getConceptMasteries, StudentDomainModality, getEpisodicMemory, getDueConcepts). Each wrapped in try/catch.

`getStudentContextForTool` formats the JSON as a < 200 token prompt string with `[STUDENT LEARNING CONTEXT]` header. Returns empty string if no meaningful data.

---

### Phase B: Context API Live

**CTI-03: API Route**

Create `GET /api/student-context/route.ts`:
- Auth: `requireRequestUser(req)` — user can only fetch own context
- Query: `?courseId=<optional>`
- Calls `getStudentContextJSON(userId, courseId)`
- Rate limited via `checkRateLimit`

**CTI-04: Chat Service Integration**

Modify `app/lib/chat-service.ts` → `buildChatSystemPrompt()`:
- After misconception context block (~line 457), inject cross-tool context
- Lazy import `getStudentContextForTool`
- Gate: `User.studyGroup === 'treatment'` (add `studyGroup?: string | null` to `ChatSystemPromptParams`)
- Non-fatal try/catch

---

### Phase C: Study Plan Logic

**CTI-05: Study Plan Service**

Create `app/lib/study-plan-service.ts`:

```typescript
export type StudyPlanContext = {
  weakConcepts: { concept: string; effectiveMastery: number; isStale: boolean }[]
  dueConcepts: { conceptSlug: string; bloomHighWater: number | null }[]
  upcomingDeadlines: { title: string; dueAt: Date; courseCode: string }[]
  relevantTools: { id: string; name: string; toolType: string; category: string }[]
}

export async function getStudyPlanContext(
  userId: string, courseId?: string | null,
  tools?: { id: string; name: string; toolType: string; category: string }[]
): Promise<StudyPlanContext | null>

export function formatStudyPlanBlock(ctx: StudyPlanContext): string

export async function logStudyPlan(
  userId: string, courseId: string | null, planType: string,
  conceptsTargeted: string[], toolsRecommended: string[], stepsCount: number
): Promise<void>
```

`getStudyPlanContext` queries weak/stale concepts, SR due items, upcoming deadlines, and filters tool catalog to relevant matches. Returns null if no meaningful data.

`formatStudyPlanBlock` returns the `## STUDY PLAN ORCHESTRATION` prompt block (< 150 system prompt tokens) with instructions for Sandy to emit sequenced ACTION tags.

`logStudyPlan` is fire-and-forget to `prisma.studyPlanLog.create()`.

**CTI-06: Concierge Service Enhancement**

Modify `app/lib/concierge-service.ts`:
- Add `studyPlanContext?: StudyPlanContext | null` parameter to `buildSystemPrompt()`
- After `frustrationNudgeSection`, inject `formatStudyPlanBlock(studyPlanContext)` if non-null and STUDENT role

---

### Phase D: Study Plan Live + Fork Visible

**CTI-07: Concierge Route Enhancement**

Modify `app/api/concierge/route.ts`:
- Plan intent detection: regex on last user message for exam/study plan keywords
- If STUDENT + plan intent: lazy-import `getStudyPlanContext`, pass `tools` array, build context
- Pass `studyPlanContext` into `buildSystemPrompt()`
- If `isPlanIntent`: bump `max_tokens` from 600 to 1000
- After stream: if 2+ ACTION tags in response, fire-and-forget `logStudyPlan()`

**CTI-08: Fork Button Promotion**

Modify `app/tools/[id]/page.tsx`:
- Move Fork from overflow menu (lines 789-797) to primary action bar
- Place after Favorite button, before "More" menu
- Style: `border border-gray-300 rounded-xl px-2.5 py-2` matching Upvote/Favorite
- Icon: `GitFork` + "Fork" label
- Condition: `tool.toolType !== 'EXTERNAL'`

---

### Phase E: Fork Polish + Request Backend

**CTI-09: Fork Polish**

1. `app/components/ToolCard.tsx` — show `GitFork` icon + `_count.forks` if > 0
2. `app/build/page.tsx` — show "Forked from: [name]" on drafts with `toolSpec.forkedFromId`
3. `app/api/builder/[sessionId]/publish/route.ts` — copy `forkedFromId` from spec to new `Tool.forkedFromId`

**CTI-10: Tool Request API Routes**

Create:
1. `app/api/tool-requests/route.ts` — POST (create, validate title 5-100 / desc 10-500) + GET (list with upvote counts, hasUpvoted, requester name, sorted by upvotes desc)
2. `app/api/tool-requests/[id]/upvote/route.ts` — POST (toggle upvote, return { upvoted, count })

Auth: `requireRequestUser` on all routes. Rate limit creates to 3/day/user.

---

### Phase F: Request Board UI

**CTI-11: Request UI Components**

1. `app/components/ToolRequestModal.tsx` — modal form (title, description, category dropdown, optional course selector). Submit → POST /api/tool-requests → close + optimistic add. Style: fixed overlay, white card, `rounded-2xl border-2`.
2. `app/components/ToolRequestCard.tsx` — card with title, description (2-line truncate), requester, course badge, category pill, upvote button + count, "Build This →" (educator/admin only → navigates to `/build?prompt=...`).

**CTI-12: Page Integration + Sandy Educator Context**

1. `app/hub/page.tsx` — "Request a Tool" button in Tools tab → opens ToolRequestModal. "Most Requested" collapsible section with top 5 open requests.
2. `app/build/page.tsx` — "Requests" tab after "My Drafts". Paginated list of OPEN ToolRequestCards.
3. `app/lib/concierge-service.ts` + `app/api/concierge/route.ts` — EDUCATOR role: query top 5 unfulfilled requests for educator's courses. Inject as `## COMMUNITY TOOL REQUESTS` block.

---

## Data Models (Complete)

### New: StudyPlanLog
| Field | Type | Purpose |
|---|---|---|
| id | String (cuid) | PK |
| userId | String (FK→User) | Who requested the plan |
| courseId | String? (FK→Course) | Course context (nullable) |
| planType | String | exam_prep / concept_review / catch_up / general |
| conceptsTargeted | String[] | Concept slugs included in plan |
| toolsRecommended | String[] | Tool IDs Sandy recommended |
| stepsCount | Int | Number of steps in generated plan |
| createdAt | DateTime | When plan was generated |

### New: ToolRequest
| Field | Type | Purpose |
|---|---|---|
| id | String (cuid) | PK |
| title | String | Short request title (5-100 chars) |
| description | String | What the student wants (10-500 chars) |
| category | String? | Tool category suggestion |
| courseId | String? (FK→Course) | Associated course |
| requesterId | String (FK→User) | Who submitted |
| status | String | OPEN / FULFILLED |
| fulfilledToolId | String? (FK→Tool) | Tool that fulfilled this request |
| upvotes | ToolRequestUpvote[] | Upvote relation |
| createdAt | DateTime | Submission time |
| updatedAt | DateTime | Last update |

### New: ToolRequestUpvote
| Field | Type | Purpose |
|---|---|---|
| id | String (cuid) | PK |
| requestId | String (FK→ToolRequest) | Which request |
| userId | String (FK→User) | Who upvoted |
| createdAt | DateTime | When upvoted |
| **Unique:** requestId + userId | | One upvote per user per request |

### Modified: Tool
| Field | Type | Purpose |
|---|---|---|
| forkedFromId | String? (FK→Tool) | Source tool this was forked from |
| forkedFrom | Tool? | Self-relation (parent) |
| forks | Tool[] | Self-relation (children) |

---

## API Routes (Complete)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/student-context` | requireRequestUser (own data only) | Structured student intelligence JSON |
| POST | `/api/tool-requests` | requireRequestUser | Create tool request |
| GET | `/api/tool-requests` | requireRequestUser | List requests (filterable) |
| POST | `/api/tool-requests/[id]/upvote` | requireRequestUser | Toggle upvote |

**Modified routes:**
| Route | Change |
|---|---|
| `POST /api/concierge` | Plan intent detection, studyPlanContext injection, conditional max_tokens bump, StudyPlanLog fire-and-forget |
| `POST /api/builder/[sessionId]/publish` | Copy forkedFromId from spec to Tool record |

---

## Component Hierarchy

```
Hub Page (hub/page.tsx)
├── Tools Tab
│   ├── [Request a Tool] button → ToolRequestModal
│   ├── Most Requested section (collapsible)
│   │   └── ToolRequestCard × 5
│   └── (existing tool grid)

Build Page (build/page.tsx)
├── Create tab (existing)
├── My Drafts tab (existing + fork attribution)
├── Requests tab (NEW)
│   └── ToolRequestCard × paginated
└── Playground tab (existing)

Tool Detail (tools/[id]/page.tsx)
├── Action Bar
│   ├── [Launch] (existing)
│   ├── [Upvote ↑ N] (existing)
│   ├── [Favorite ♥] (existing)
│   ├── [Fork 🔀] (PROMOTED from overflow)
│   └── [More… → Audio, Share]

ToolCard (components/ToolCard.tsx)
└── Metadata row: sessions count + fork count (if > 0)

New Components:
├── ToolRequestModal.tsx (form: title, desc, category, course)
└── ToolRequestCard.tsx (display: title, desc, requester, upvotes, Build This →)
```

---

## A/B Testing Integration

The cross-tool context injection (CTI-04) is gated by `User.studyGroup === 'treatment'`:
- **Treatment group:** Tool sessions receive `[STUDENT LEARNING CONTEXT]` block with weak concepts, modality, risk, velocity
- **Control group:** Tool sessions have no cross-tool context (current behavior)
- **Measurement:** Compare session scores, completion rates, and mastery deltas between groups via existing `/api/analytics/ab-outcomes` dashboard

Sandy study plan orchestration (CTI-07) is NOT A/B gated — all students get study plans if they ask.

---

## FERPA Compliance

- Student context API: user can only fetch their own data (userId from auth must match)
- All session queries filter `sensitiveSession: false`
- Educator/Admin cannot access student context API
- Tool request board: only shows requester name (not academic data)
- Study plan logs: analytics-only, not exposed to other users

---

## Token Budget

| Feature | Token Impact | Mitigation |
|---|---|---|
| Tool context injection | +~150 tokens/session system prompt | A/B gated to treatment group |
| Study plan system prompt block | +~150 tokens when plan intent detected | Only injected on intent match |
| Study plan response | max_tokens 600→1000 | Only on plan intent regex match |
| Educator request context | +~100 tokens for EDUCATOR concierge | Max 5 requests shown |

---

## Handoff Prompt (Phase A)

The Phase A handoff prompt is ready to copy-paste into a fresh Claude Code instance. It contains:
- Full context summary
- Exact schema additions with Prisma syntax
- `student-context-api.ts` specification with types and function signatures
- Instructions to generate the Phase B handoff on completion

See the "Phase A Handoff Prompt" section in the planning conversation for the complete prompt text.

---

## Status Tracker

| Phase | Task | Status | Notes |
|---|---|---|---|
| A | CTI-01 Schema migration | ✅ Done | StudyPlanLog, ToolRequest, ToolRequestUpvote, Tool.forkedFromId all in schema |
| A | CTI-02 Student context service | ✅ Done | `app/lib/student-context-api.ts` — getStudentContextJSON + getStudentContextForTool |
| B | CTI-03 Context API route | ✅ Done | `GET /api/student-context` |
| B | CTI-04 Chat service integration | ✅ Done | chat-service.ts imports and calls getStudentContextForTool |
| C | CTI-05 Study plan service | ✅ Done | `app/lib/study-plan-service.ts` — Sonnet-generated plans, different shape than original spec (StudyPlan/StudyPlanItem, not StudyPlanContext) |
| C | CTI-06 Concierge prompt block | ✅ Done | StudyPlanSummary type, studyPlanSection in buildSystemPrompt for STUDENT role |
| D | CTI-07 Concierge route enhancement | ✅ Done | Plan intent regex, conditional max_tokens 600→1000, enriched studyPlanSummary on intent, fire-and-forget logStudyPlan on 2+ ACTION tags |
| D | CTI-08 Fork button promotion | ✅ Done | Fork button moved to primary action bar after Favorite, removed from overflow menu |
| E | CTI-09 Fork polish (ToolCard, Build, publish) | ✅ Done | GitFork + count on ToolCard, "Forked from" attribution on Build drafts, forkedFromId copied in publish route, TOOL_CARD_INCLUDE + TOOL_FULL_INCLUDE updated |
| E | CTI-10 Tool request API routes | ✅ Done | POST/GET `/api/tool-requests`, POST `/api/tool-requests/[id]/upvote` with toggle pattern, 3/day rate limit |
| F | CTI-11 Request UI components | ✅ Done | `ToolRequestModal.tsx` (form with title/desc/category/course), `ToolRequestCard.tsx` (upvote + Build This link) |
| F | CTI-12 Hub + Build integration + Sandy | ✅ Done | Hub: "Request a Tool" button + collapsible "Most Requested" in Tools tab. Build: "Requests" tab with paginated ToolRequestCards. Sandy: COMMUNITY TOOL REQUESTS block for EDUCATOR/ADMIN |
