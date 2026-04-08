# The Sandbox — Phase 2 Blueprint
> Implementation guide for Codex. Read this fully before writing any code.

---

## Context

"The Sandbox" is a Next.js 16 App Router / TypeScript / Tailwind CSS v4 / Prisma v7 / PostgreSQL application. The core marketplace, chatbot builder, courses, gamification (XP, Sand, Badges, Quests), collab system, and messaging are already implemented. This document covers the **Phase 2 feature set** only — do not refactor or change anything not listed here.

**Tech constraints to respect:**
- Prisma v7 with driver adapter pattern — schema has NO `url` in datasource; runtime client uses `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- Generated client is in `app/generated/prisma` — import from `../generated/prisma` relative to `app/lib/`
- Tailwind CSS v4 — utility-first, no config file needed for basic extensions
- All API routes authenticate via `x-demo-user-email` header
- Claude API for any AI generation: model `claude-haiku-4-5-20251001`, key from `ANTHROPIC_API_KEY` env var

---

## Feature 1: Syllabus Mode (Context Injection)

**Priority: Highest. This is the platform's key differentiator.**

When an educator links a tool to their course, they can attach a "Syllabus Context" — a short instructor note that gets silently injected into the chatbot's system prompt when a student launches the tool from the course page. The generic marketplace tool becomes a hyper-specific study aid for this week's material.

### Schema Change

Add one field to `CourseToolLink`:

```prisma
model CourseToolLink {
  id              String   @id @default(cuid())
  courseId        String
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  toolId          String
  tool            Tool     @relation(fields: [toolId], references: [id], onDelete: Cascade)
  syllabusContext String?  // NEW — educator's contextual note for this tool in this course
  weekLabel       String?  // NEW — e.g. "Week 5: Cardiovascular Cases" (display only)
  createdAt       DateTime @default(now())

  @@unique([courseId, toolId])
  @@index([courseId])
  @@index([toolId])
}
```

Run: `npx prisma migrate dev --name add_syllabus_context`

### API Changes

**`PUT /api/courses/[id]/tools/[toolId]`** — New endpoint (or extend existing link endpoint)
- Auth: educator who owns the course only
- Body: `{ syllabusContext?: string, weekLabel?: string }`
- Updates the `CourseToolLink` row

**`GET /api/tools/[id]`** — Extend response
- Accept optional query param `?courseId=xxx`
- If `courseId` provided, join `CourseToolLink` and include `syllabusContext` and `weekLabel` in response

**`POST /api/chat`** — Extend system prompt logic
- Accept optional body field `courseId`
- If `courseId` is provided, look up `CourseToolLink` for this `(toolId, courseId)` pair
- If `syllabusContext` exists, append it to the system prompt:
  ```
  ---
  INSTRUCTOR CONTEXT FOR THIS SESSION:
  {syllabusContext}
  ---
  ```
  Append this after the tool's base system prompt, before the conversation begins.

### UI Changes

**Course detail page (`app/courses/[id]/page.tsx`):**
- On each linked tool card, add an "Edit Context" button (pencil icon, educator-only)
- Opens an inline edit form / popover with:
  - `weekLabel` text input: "Week label (optional)" — e.g. "Week 5: Cardiovascular Cases"
  - `syllabusContext` textarea: "Syllabus context for students (injected into the AI)"
  - Save button → calls `PUT /api/courses/[id]/tools/[toolId]`
- Display the `weekLabel` badge on the tool card if set (e.g. a small UK-blue chip)
- When student clicks "Launch" from the course page, pass `courseId` to the chat payload

**`ChatInterface.tsx` component:**
- Accept a `courseId?: string` prop
- Pass it in the chat POST body

---

## Feature 2: Daily & Weekly Platform Quests

**The existing `Quest` model is tool-scoped and static. Build a separate platform-level quest system that refreshes on a cadence.**

### Schema Changes

```prisma
model PlatformQuest {
  id          String            @id @default(cuid())
  title       String
  description String
  cadence     QuestCadence      // DAILY or WEEKLY
  xpReward    Int
  sandReward  Int
  condition   PlatformQuestType // enum describing what action triggers completion
  targetValue Int               @default(1) // e.g. "complete 3 sessions" → targetValue: 3
  isActive    Boolean           @default(true)
  createdAt   DateTime          @default(now())
  userProgress UserPlatformQuest[]
}

enum QuestCadence {
  DAILY
  WEEKLY
}

enum PlatformQuestType {
  COMPLETE_ANY_SESSION      // finish any tool session
  COMPLETE_SESSIONS_N       // finish N sessions (targetValue = N)
  SCORE_ABOVE_THRESHOLD     // get a score metric >= targetValue on any tool
  LEAVE_COMMENT             // post a comment on any tool
  LAUNCH_MARKETPLACE_TOOL   // launch a tool from marketplace (not from course)
  COMPLETE_COURSE_TOOL      // launch a tool from a course page
  HIGH_SCORE_N_TOOLS        // score >= 90% on N different tools (targetValue = N)
}

model UserPlatformQuest {
  id            String        @id @default(cuid())
  userId        String
  user          User          @relation(fields: [userId], references: [id])
  questId       String
  quest         PlatformQuest @relation(fields: [questId], references: [id])
  periodStart   DateTime      // start of the daily/weekly window this progress belongs to
  progress      Int           @default(0)
  completedAt   DateTime?
  rewardClaimed Boolean       @default(false)
  createdAt     DateTime      @default(now())

  @@unique([userId, questId, periodStart])
  @@index([userId, periodStart])
}
```

Add to `User` model:
```prisma
userPlatformQuests UserPlatformQuest[]
```

Run: `npx prisma migrate dev --name add_platform_quests`

### Quest Progress Logic

Create `app/lib/platform-quests.ts`:
- `getPeriodStart(cadence: QuestCadence): Date` — returns start of today (UTC midnight) for DAILY, start of current week (Monday UTC midnight) for WEEKLY
- `awardQuestProgress(userId: string, type: PlatformQuestType, increment?: number): Promise<void>` — finds all active quests matching the type, upserts `UserPlatformQuest` for the current period, increments progress, marks `completedAt` when `progress >= quest.targetValue`, and if newly completed: creates XP event + Sand transaction for the rewards
- Call `awardQuestProgress` from the relevant action handlers:
  - Session end (`PUT /api/sessions/[id]`) → `COMPLETE_ANY_SESSION`, `COMPLETE_SESSIONS_N`
  - Metric event with `score` field (`POST /api/tools/[id]/metrics`) → `SCORE_ABOVE_THRESHOLD`, `HIGH_SCORE_N_TOOLS`
  - Comment creation (`POST /api/tools/[id]/comments`) → `LEAVE_COMMENT`
  - Session start from marketplace vs course context → `LAUNCH_MARKETPLACE_TOOL`, `COMPLETE_COURSE_TOOL`

### API Routes

**`GET /api/quests`**
- Returns active platform quests with current user's progress for today/this week
- Groups by cadence: `{ daily: [...], weekly: [...] }`
- Each quest item includes: `id, title, description, xpReward, sandReward, progress, targetValue, completedAt, rewardClaimed`

**`POST /api/quests/[id]/claim`**
- Marks `rewardClaimed: true` on the `UserPlatformQuest`
- Creates XP event + Sand transaction (if not already created automatically on completion — pick one approach and be consistent)

### Admin: Seed Default Quests

In the seed script or a new `prisma/seed-quests.ts`, create these starter quests:

| Title | Cadence | Type | Target | XP | Sand |
|---|---|---|---|---|---|
| Daily Explorer | DAILY | COMPLETE_ANY_SESSION | 1 | 25 | 10 |
| Comment Contributor | DAILY | LEAVE_COMMENT | 1 | 15 | 5 |
| Weekly Achiever | WEEKLY | COMPLETE_SESSIONS_N | 5 | 100 | 50 |
| High Scorer | WEEKLY | HIGH_SCORE_N_TOOLS | 3 | 150 | 75 |
| Course Learner | WEEKLY | COMPLETE_COURSE_TOOL | 3 | 75 | 35 |

### UI

**Quest Panel component (`app/components/QuestPanel.tsx`):**
- Shows daily quests and weekly quests in two sections
- Each quest shows: title, description, progress bar (progress/targetValue), rewards (XP + Sand icons), completion checkmark if done
- "Claim" button appears when `completedAt` is set and `!rewardClaimed` — calls `/api/quests/[id]/claim`
- Add `QuestPanel` to the student dashboard / library page in a sidebar or collapsible section

---

## Feature 3: Course-Scoped & Per-Tool Leaderboards

**No global leaderboard. Scope to: (a) within a course's enrolled students, (b) per-tool session rankings. This keeps competition healthy and contextually relevant.**

### Schema Change

```prisma
model LeaderboardEntry {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  toolId    String
  tool      Tool     @relation(fields: [toolId], references: [id])
  courseId  String?  // null = global tool leaderboard; set = course-scoped
  score     Float    // the metric value (e.g. percentage score)
  metricKey String   // which metric this score came from (e.g. "score", "questions_answered")
  sessionId String?  // link to ToolSession for context
  achievedAt DateTime @default(now())

  @@index([toolId, courseId])
  @@index([userId])
}
```

Add to `User` and `Tool` models:
```prisma
// User:
leaderboardEntries LeaderboardEntry[]
// Tool:
leaderboardEntries LeaderboardEntry[]
```

Run: `npx prisma migrate dev --name add_leaderboards`

### Leaderboard Population

In `POST /api/tools/[id]/metrics` (the webhook handler for external tools) and in session completion logic:
- If a metric event has `metricName` of `"score"` (or any metric defined as type `RATING` with a numeric value), write a `LeaderboardEntry` row
- If the session was launched from a course context (pass `courseId` in session metadata — see Session Changes below), set `courseId` on the entry

**Session metadata change:** Add `courseId String?` to `ToolSession` model so we can track which course context a session came from:
```prisma
model ToolSession {
  // existing fields...
  courseId  String?  // NEW — set when launched from a course page
}
```

### API Route

**`GET /api/tools/[id]/leaderboard`**
- Query params: `?courseId=xxx` (optional), `?metric=score` (optional, defaults to "score"), `?limit=10`
- Returns top N entries with user display name (anonymized to first name + last initial for privacy), score, achievedAt
- If `courseId` provided: only entries from users enrolled in that course
- Never return email addresses

### UI

**Tool detail page (`app/tools/[id]/page.tsx`):**
- Add a "Leaderboard" tab (alongside existing Analytics tab, but visible to all users, not just creator)
- Shows top 10 scores for that tool
- If user is viewing from a course context, default to course-scoped leaderboard with a toggle to "All Users"
- Highlight the current user's entry if they appear in the list

**Course detail page:**
- On each linked tool card that has leaderboard data, show a small "Top score: 94%" chip as a teaser

---

## Feature 4: AI Study Guide (In-Page, Not PDF)

**Scope: An AI-generated summary card on the Library or Course page. Not a PDF download — that's over-engineered for this phase.**

### API Route

**`POST /api/study/guide`**
- Auth: student only (their own data)
- Body: `{ courseId?: string }` — if provided, scopes to tools from that course; otherwise uses all library entries
- Server logic:
  1. Fetch all `ToolSession` records for this user (optionally filtered by tools in the course)
  2. Fetch all `MetricEvent` records for those sessions (especially score/rating metrics)
  3. Fetch all `LibraryEntry` records for this user
  4. Fetch `CourseMaterial` titles/descriptions for the course (if courseId provided)
  5. Build a structured prompt summarizing: tools used, scores achieved, tools not yet tried
  6. Call Claude (`claude-haiku-4-5-20251001`) with streaming
  7. Ask Claude to respond with:
     - **Strengths** (2-3 bullet points based on high scores)
     - **Areas for Review** (2-3 bullet points based on low/missing scores)
     - **Suggested Next Steps** (up to 3 specific tools from the course they haven't tried)
- Stream the response back as SSE

**Prompt template for Claude:**
```
You are a personalized study advisor for a university student using The Sandbox learning platform.

Based on the student's activity data below, generate a concise, encouraging study guide.

TOOLS USED AND SCORES:
{toolSessions}

TOOLS IN COURSE NOT YET TRIED:
{untriedTools}

COURSE MATERIALS COVERED:
{courseMaterials}

Respond with exactly three sections using these headers:
## Strengths
## Areas for Review
## Suggested Next Steps

Be specific, encouraging, and actionable. Reference tool names directly. Keep each section to 2-3 bullet points.
```

### UI

**`app/components/StudyGuideCard.tsx`** — New component:
- "Generate Study Guide" button with a sparkle/wand icon
- On click: calls `/api/study/guide` with optional courseId, streams response
- Renders the streamed markdown using `react-markdown` in a card with sections styled distinctly
- Shows a subtle "Powered by Claude AI" attribution line
- Add to: `app/library/page.tsx` (top of page) and `app/courses/[id]/page.tsx` (as a sidebar card for students)

---

## Feature 5: Challenge a Friend

**Scope: Only works for tools that emit a numeric `score` metric. No over-engineering — this is a targeted social motivator.**

### Schema Change

```prisma
model Challenge {
  id           String          @id @default(cuid())
  challengerId String
  challenger   User            @relation("ChallengesIssued", fields: [challengerId], references: [id])
  challengedId String
  challenged   User            @relation("ChallengesReceived", fields: [challengedId], references: [id])
  toolId       String
  tool         Tool            @relation(fields: [toolId], references: [id])
  challengerScore Float        // the score to beat
  status       ChallengeStatus @default(PENDING)
  challengedScore Float?       // filled in when the challenged user completes
  createdAt    DateTime        @default(now())
  expiresAt    DateTime        // 7 days after creation
  completedAt  DateTime?
}

enum ChallengeStatus {
  PENDING
  ACCEPTED  // challenged user has started the tool
  COMPLETED // challenged user finished and score recorded
  EXPIRED
}
```

Add to `User` model:
```prisma
challengesIssued   Challenge[] @relation("ChallengesIssued")
challengesReceived Challenge[] @relation("ChallengesReceived")
```

Add to `Tool` model:
```prisma
challenges Challenge[]
```

Run: `npx prisma migrate dev --name add_challenges`

### API Routes

**`POST /api/challenges`**
- Body: `{ toolId, challengedUserId, challengerScore }`
- Validates: tool must have at least one `MetricEvent` of type score from this user's sessions
- Creates `Challenge` row with `expiresAt = now + 7 days`
- Creates an in-platform `Message` to the challenged user (using existing Message model): "Alex challenged you to beat their score of 87% on 'Patient Interview Practice'! [Accept Challenge →]"

**`GET /api/challenges`**
- Returns pending challenges for the current user (`challengedId = me, status = PENDING`)
- Returns challenges I've issued (`challengerId = me`) with their current status

**`POST /api/challenges/[id]/complete`**
- Called when a session ends and there's an active challenge for this `(userId, toolId)` pair
- Updates `challengedScore` and `status = COMPLETED`
- Creates a message back to the challenger with the result

### UI

**Tool detail page — after a session ends with a score:**
- Show a "Challenge a Classmate" section
- Search/select a user from the existing `UserContact` system (people I'm connected to)
- Shows: "Your score: 87% — dare a classmate to beat it"
- "Send Challenge" button

**Library page / Header notifications area:**
- Show pending challenges with a count badge
- Each pending challenge shows: who challenged you, which tool, score to beat, expiry date
- "Accept" button launches the tool directly

---

## Feature 6: In-Tool Progress Indicators

**For built-in chatbots that define a specific number of interaction rounds/steps.**

### Schema Change

Add to `GamificationConfig`:
```prisma
model GamificationConfig {
  // existing fields...
  totalSteps    Int?    // NEW — if set, enables a step progress bar (e.g. 5 for a 5-round quiz)
  stepLabel     String? // NEW — e.g. "Round", "Question", "Case" (defaults to "Step")
}
```

Run: `npx prisma migrate dev --name add_progress_steps`

### Chat API Change

In `POST /api/chat` response, include current step count:
- Track `messageCount` from the `ToolSession`
- If `GamificationConfig.totalSteps` is set, include in the response: `{ currentStep: N, totalSteps: M, stepLabel: "Round" }`
- "Current step" = `Math.ceil(messageCount / 2)` (each round = 1 user message + 1 AI response)

### UI Change

**`ChatInterface.tsx`:**
- Accept `totalSteps?: number`, `stepLabel?: string` props (fetched when tool loads)
- If `totalSteps` is set, render a progress bar at the top of the chat:
  ```
  Round 3 of 5  [████████░░░░░]
  ```
- UK blue (`#0033A0`) fill, gray track, smooth width transition on each new step

**Publishing flow (`app/publish/page.tsx` or equivalent):**
- In the Built-in Chatbot configuration step, add optional field: "Number of rounds/steps (optional)" — maps to `totalSteps`
- Add "Step label" field (Round / Question / Case / Step) — maps to `stepLabel`

---

## Feature 7: Prominent Time Estimates on Tool Cards

**The `estimatedMinutes` field already exists in the database. This is purely a UI fix.**

### UI Change Only

**`app/components/ToolCard.tsx`:**
- If `estimatedMinutes` is set, display it prominently on the card — not buried in fine print
- Placement: bottom-left of card, before the upvote/favorite counts
- Format: clock icon + "15 min" — use a filled clock icon from lucide-react (`Clock` icon)
- Style: `text-sm font-medium text-slate-600` with the clock icon in UK blue
- On the tool detail page header, similarly make it prominent alongside difficulty level

---

## Migration & Seed Notes

After all schema changes, run migrations in order:
```bash
cd the-sandbox
npx prisma migrate dev --name phase2_features
```

Or run them individually in the order listed above if doing features incrementally.

**Update seed script** to include:
- 5 default `PlatformQuest` rows (see Feature 2 table above)
- At least 2 `LeaderboardEntry` demo rows on the quiz-type tools
- Set `totalSteps: 5` on the "Cross-Examination Simulator" GamificationConfig (or create one if it doesn't exist)
- Set `syllabusContext` on one `CourseToolLink` in the demo course as an example

---

## Build Order

Implement in this sequence (each is independently shippable):

1. **Feature 7** — Time estimates on cards (30 min, pure UI, no schema change)
2. **Feature 1** — Syllabus Mode (schema + API + UI, highest value)
3. **Feature 6** — Progress indicators (schema + chat API + UI)
4. **Feature 2** — Platform quests (schema + logic + UI)
5. **Feature 3** — Leaderboards (schema + API + UI)
6. **Feature 4** — AI Study Guide (API + streaming UI)
7. **Feature 5** — Challenge a Friend (schema + API + UI)

---

## What Is NOT In Scope for This Phase

- **Dark mode** — Tailwind v4 supports it but it's a cross-cutting concern requiring changes to every component. Treat as a separate focused sprint.
- **Live study sessions ("Study with a Friend")** — Real-time multi-user requires WebSocket infrastructure not currently in the project. The existing `StudyBuddyInterface.tsx` is a solo AI companion — do not conflate it with this feature. Defer.
- **Global XP leaderboard** — Discourages new users, creates "rich get richer" dynamics in an academic context. The course-scoped and per-tool leaderboards from Feature 3 are the right scope.
- **PDF generation for study guides** — Over-engineered. In-page streaming (Feature 4) covers the value.
