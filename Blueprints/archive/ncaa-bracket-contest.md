# Blueprint: "The Bracket" — NCAA March Madness Contest
> Status: 🔵 Designing
> Created: 2026-03-20
> Feature type: Standalone featured experience (lives alongside Playground tools in Hub)

---

## CRITICAL CONSTRAINTS (inherit from CLAUDE.md)
- Tailwind v4 — no `@apply`, utility classes in JSX only
- Prisma v7 — PrismaPg adapter, import from `../generated/prisma`
- Icons — lucide-react only
- Auth — every route.ts MUST call `require*User` before ANY DB access
- Routes — thin: auth → parse → call lib → return; business logic in lib only
- UI — Pattern A/B header, `max-w-6xl`, `border-2 rounded-2xl` cards, `font-extrabold` h1/h2

---

## Product Overview

A standalone featured experience that lets demo users create private NCAA March Madness bracket contests, invite friends via access code, walk through their picks, and compete over the tournament. An AI "March Madness Host" personality drives engagement via in-app chat commentary and commissioner-triggered email updates.

**Dual purpose:**
1. Demonstrate what the Playground *could* build — a fully featured community tool
2. Demonstrate AI as community glue — not answering questions, but animating social experiences

---

## User Roles

| Role in Contest | Who Can Hold It | Capabilities |
|---|---|---|
| Commissioner | Game creator (any demo user) | Enter round results, fire emails, lock picks, manage settings |
| Player | Any user who joins via code | Make picks, view leaderboard, post in chat, receive emails |

All three demo user types (STUDENT, EDUCATOR, ADMIN) are peers — platform role hierarchy does not apply inside a contest.

---

## Game Lifecycle

```
Create Contest → Share Access Code → Players Join & Make Picks
→ Commissioner Locks Picks → Commissioner Enters Round Results
→ Scores Recalculate → Commissioner Fires Email → Repeat per Round
→ Champion Crowned → Contest marked COMPLETE
```

---

## Data Models

Add to `prisma/schema.prisma`:

```prisma
model BracketContest {
  id              String              @id @default(cuid())
  name            String
  accessCode      String              @unique
  commissionerId  String
  commissioner    User                @relation("BracketCommissioner", fields: [commissionerId], references: [id])
  status          BracketStatus       @default(PICKING)
  notifyFrequency BracketNotifyFreq   @default(AFTER_ROUND)
  nudgeIntensity  BracketNudgeLevel   @default(GENTLE)
  allowAiNudges   Boolean             @default(true)
  picksLockedAt   DateTime?
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt

  entries         BracketEntry[]
  results         BracketResult[]
  messages        BracketMessage[]
  emailLogs       BracketEmailLog[]
}

model BracketEntry {
  id           String         @id @default(cuid())
  contestId    String
  contest      BracketContest @relation(fields: [contestId], references: [id], onDelete: Cascade)
  userId       String
  user         User           @relation("BracketEntries", fields: [userId], references: [id])
  picks        Json           // Record<gameId, teamId>
  score        Int            @default(0)
  maxPossible  Int            @default(192)
  isEliminated Boolean        @default(false)
  lastScoredAt DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  @@unique([contestId, userId])
}

model BracketResult {
  id          String         @id @default(cuid())
  contestId   String
  contest     BracketContest @relation(fields: [contestId], references: [id], onDelete: Cascade)
  gameId      String         // references slot id in static bracket data
  winnerId    String         // team id from static data
  round       Int            // 1=R64, 2=R32, 3=S16, 4=E8, 5=F4, 6=Championship
  enteredAt   DateTime       @default(now())
  enteredById String         // commissioner user id

  @@unique([contestId, gameId])
}

model BracketMessage {
  id        String          @id @default(cuid())
  contestId String
  contest   BracketContest  @relation(fields: [contestId], references: [id], onDelete: Cascade)
  userId    String?         // null = AI Host
  user      User?           @relation("BracketMessages", fields: [userId], references: [id])
  content   String          @db.Text
  isAiHost  Boolean         @default(false)
  parentId  String?
  parent    BracketMessage? @relation("BracketThread", fields: [parentId], references: [id])
  replies   BracketMessage[] @relation("BracketThread")
  createdAt DateTime        @default(now())
}

model BracketEmailLog {
  id             String         @id @default(cuid())
  contestId      String
  contest        BracketContest @relation(fields: [contestId], references: [id], onDelete: Cascade)
  round          Int?
  subject        String
  aiNarrative    String         @db.Text
  sentAt         DateTime       @default(now())
  recipientCount Int
}

enum BracketStatus {
  PICKING
  LOCKED
  IN_PROGRESS
  COMPLETE
}

enum BracketNotifyFreq {
  AFTER_ROUND
  WEEKLY
  BOTH
}

enum BracketNudgeLevel {
  OFF
  GENTLE
  ACTIVE
}
```

**Back-relations to add on User model:**
```prisma
bracketContestsCommissioned BracketContest[] @relation("BracketCommissioner")
bracketEntries              BracketEntry[]   @relation("BracketEntries")
bracketMessages             BracketMessage[] @relation("BracketMessages")
```

---

## Static Bracket Data

**File:** `app/lib/bracket/bracket-2026.ts`

This is a pure TypeScript constant — no DB, no API. Hardcoded 2026 NCAA Tournament field.

```typescript
export interface BracketTeam {
  id: string          // e.g. "duke-1"
  name: string        // "Duke"
  seed: number        // 1–16
  region: BracketRegion
  abbreviation: string
}

export interface BracketGame {
  id: string          // e.g. "east-r1-g1"
  round: number       // 1–6
  region: BracketRegion | 'final_four' | 'championship'
  slotA: string | null  // team id or upstream game id
  slotB: string | null
  slotAIsGame: boolean  // true if slotA is a gameId (not a team)
  slotBIsGame: boolean
}

export type BracketRegion = 'east' | 'west' | 'south' | 'midwest'

export const BRACKET_2026: { teams: BracketTeam[], games: BracketGame[] } = { ... }
```

Structure: 64 teams (4 regions × 16 seeds), 63 games total.
- Round 1: 32 games (8 per region)
- Round 2: 16 games
- Sweet 16: 8 games
- Elite 8: 4 games
- Final Four: 2 games
- Championship: 1 game

---

## Scoring Logic

**File:** `app/lib/bracket/scoring-service.ts`

```typescript
const ROUND_POINTS: Record<number, number> = {
  1: 1, 2: 2, 3: 4, 4: 8, 5: 16, 6: 32
}
// MAX = 32+16+8+4+2+1 per game × games per round = 192 total

function scoreEntry(picks: Record<string, string>, results: BracketResult[]): number
function computeMaxPossible(picks: Record<string, string>, results: BracketResult[]): number
function recalculateAllEntries(contestId: string): Promise<void>
```

`recalculateAllEntries` is called automatically after each `BracketResult` is upserted.

---

## Contest Service

**File:** `app/lib/bracket/bracket-service.ts`

```typescript
// Contest CRUD
createContest(userId, input): Promise<BracketContest>
getContest(contestId, requestUserId): Promise<ContestWithLeaderboard>
getUserContests(userId): Promise<BracketContest[]>
joinContest(accessCode, userId): Promise<BracketEntry>
lockPicks(contestId, commissionerId): Promise<void>

// Picks
savePicks(contestId, userId, picks): Promise<BracketEntry>
getPicks(contestId, userId): Promise<BracketEntry | null>

// Results
enterResult(contestId, commissionerId, gameId, winnerId): Promise<void>
  // → upserts BracketResult → calls recalculateAllEntries

// Chat
getMessages(contestId): Promise<BracketMessage[]>
postMessage(contestId, userId, content, parentId?): Promise<BracketMessage>
```

Access code generation: `[ADJ]-[YEAR]` style — 6-character alphanumeric, unique check on insert.

---

## AI Host Service

**File:** `app/lib/bracket/host-service.ts`

Personality: "Bracket Buddy" — energetic, trash-talking-friendly March Madness announcer. Distinct from Sandy. Uses first names of players. Celebrates upsets. Gives hot takes.

```typescript
// Called after results are entered — generates round recap
generateRoundCommentary(contestId, round): Promise<string>
  // → Haiku, short (150–200 words), posts as BracketMessage (isAiHost: true)

// Called when commissioner fires email — generates full narrative
generateEmailNarrative(contestId, round?): Promise<string>
  // → Sonnet, full email body with standings table, player callouts, prediction

// Called on a schedule if nudgeIntensity !== OFF
generateNudgeMessage(contestId): Promise<string | null>
  // → Haiku, returns null if nudge not warranted (recent activity exists)
```

System prompt core:
```
You are Bracket Buddy, the March Madness host for this private contest.
You are energetic, fun, and lightly competitive. You know everyone's picks.
You celebrate upsets, call out the bracket busters, and hype up the leaders.
You use the players' first names. Keep it friendly — no genuine trash talk.
```

---

## Email Service

**File:** `app/lib/bracket/bracket-email-service.ts`

```typescript
sendRoundUpdateEmail(contestId, triggeredByUserId): Promise<BracketEmailLog>
```

Flow:
1. Fetch contest + all entries + user emails
2. Call `generateEmailNarrative()` from host-service
3. Build HTML email: AI narrative + standings table + CTA back to app
4. Send via Resend (`from: sandbox@uky.edu`) to all player emails
5. Create `BracketEmailLog` record
6. Falls back to `console.log` if `RESEND_API_KEY` missing

Email sections:
- Header: contest name + round number
- AI narrative (Sonnet-generated)
- Standings table: rank, name, score, max possible, eliminated badge
- Round results summary
- CTA: "Check your bracket →"
- Footer: "Opt out of emails" (no-op for demo, noted)

---

## API Routes

All routes: thin — `requireRequestUser` → parse → call lib → return.

```
POST   /api/bracket/contests                           → createContest
GET    /api/bracket/contests                           → getUserContests
POST   /api/bracket/contests/join                      → joinContest (body: { accessCode })
GET    /api/bracket/contests/[id]                      → getContest (leaderboard + status)
POST   /api/bracket/contests/[id]/lock                 → lockPicks (commissioner only)
GET    /api/bracket/contests/[id]/picks                → getPicks (own entry)
PUT    /api/bracket/contests/[id]/picks                → savePicks
POST   /api/bracket/contests/[id]/results              → enterResult (commissioner only)
POST   /api/bracket/contests/[id]/email                → sendRoundUpdateEmail (commissioner only)
GET    /api/bracket/contests/[id]/messages             → getMessages
POST   /api/bracket/contests/[id]/messages             → postMessage
POST   /api/bracket/contests/[id]/messages/[msgId]/reply → reply to message
```

---

## Page Routes

```
/bracket                              → Hub: user's contests + create/join entry points
/bracket/new                          → Create contest form
/bracket/join                         → Enter access code
/bracket/[contestId]                  → Contest home: leaderboard + chat
/bracket/[contestId]/picks            → Pick walkthrough (guided, step-by-step)
/bracket/[contestId]/manage           → Commissioner dashboard
```

---

## Component Architecture

```
app/components/bracket/
  ContestCard.tsx         → single contest in hub list (name, code, player count, status)
  BracketBoard.tsx        → visual 64-team bracket tree (read-only view)
  PickWalkthrough.tsx     → guided pick UX: one matchup at a time, animated team selection
  Leaderboard.tsx         → standings table: rank, name, score, max possible, eliminated
  GameChat.tsx            → Discord-style channel: message list + reply threads + input
  CommissionerPanel.tsx   → result entry form + "Send Update Email" button + lock button
  HostCommentaryCard.tsx  → AI host message bubble (distinct visual from user messages)
```

---

## Pick Walkthrough UX

`PickWalkthrough.tsx` drives `/bracket/[contestId]/picks`:

- **One matchup at a time** — no scrolling full bracket during picking
- Region selector at top: East / West / South / Midwest / Final Four / Championship
- Two team cards side by side — click to advance winner
- Animated: chosen team "flies" to next round slot
- Progress bar: X of 63 picks made
- Auto-saves after each pick (debounced 500ms PUT to picks API)
- Can navigate back to change picks (if not locked)
- Completion state: confetti + "View your full bracket" CTA

---

## Hub Integration

The Bracket appears in `/hub?tab=tools` via the `ToolsBrowser` component.
It is NOT a `Tool` record in the DB — it is a hardcoded featured entry in the tools browser catalog alongside Playground apps.

Additionally, add a featured card on `/hub` default view (services tab) — a "Featured Experience" section with The Bracket card.

Nav: no new top-level nav item. Access via Hub.

---

## Execution Plan

### Phase 1 — Data Foundation
- **Task 1.1:** Schema additions (4 models + 3 enums) + User back-relations + `npx prisma db push` + `npx prisma generate`. Create `app/lib/bracket/bracket-2026.ts` with full hardcoded 2026 field (64 teams, 63 games).
- **Task 1.2:** `app/lib/bracket/bracket-service.ts` — all contest/picks/chat functions. `app/lib/bracket/scoring-service.ts` — score + maxPossible calculation.

### Phase 2 — API Routes (Core)
- **Task 2.1:** `POST /api/bracket/contests`, `GET /api/bracket/contests`, `POST /api/bracket/contests/join`, `GET /api/bracket/contests/[id]`
- **Task 2.2:** `GET+PUT /api/bracket/contests/[id]/picks`, `POST /api/bracket/contests/[id]/lock`, `POST /api/bracket/contests/[id]/results`

### Phase 3 — Hub & Contest Home
- **Task 3.1:** `/bracket/page.tsx` (hub), `/bracket/new/page.tsx`, `/bracket/join/page.tsx`, `ContestCard.tsx`
- **Task 3.2:** `/bracket/[contestId]/page.tsx` (leaderboard + chat shell), `Leaderboard.tsx`

### Phase 4 — Pick Experience
- **Task 4.1:** `BracketBoard.tsx` (visual read-only bracket tree)
- **Task 4.2:** `PickWalkthrough.tsx` + `/bracket/[contestId]/picks/page.tsx`

### Phase 5 — Commissioner
- **Task 5.1:** `CommissionerPanel.tsx` — result entry UI wired to results API
- **Task 5.2:** `/bracket/[contestId]/manage/page.tsx` — full commissioner dashboard

### Phase 6 — Chat
- **Task 6.1:** `POST/GET /api/bracket/contests/[id]/messages` + reply route
- **Task 6.2:** `GameChat.tsx` + wire into `/bracket/[contestId]/page.tsx`

### Phase 7 — AI Host & Email
- **Task 7.1:** `app/lib/bracket/host-service.ts` (Haiku commentary + Sonnet email narrative). `app/lib/bracket/bracket-email-service.ts` (Resend integration).
- **Task 7.2:** `POST /api/bracket/contests/[id]/email` route. Wire AI host commentary auto-post after result entry. Wire nudge system.

### Phase 8 — Polish & Hub Integration
- **Task 8.1:** Add The Bracket to `/hub?tab=tools` ToolsBrowser hardcoded catalog entry. Add Featured Experience card to hub services tab.
- **Task 8.2:** Mobile pass, empty states, error handling, build verification (`npm run lint && npx tsc --noEmit && npm run build`).

---

## Environment Variables

No new env vars required. Uses existing:
- `ANTHROPIC_API_KEY` — AI host commentary + email narrative
- `RESEND_API_KEY` — emails (falls back to console.log)

---

## Out of Scope

- Live sports API (hardcoded bracket, manual result entry)
- Real calendar integration (soft AI suggestions only, no API calls)
- Marketplace publishing (separate sprint)
- Play-in games (start at Round of 64 for simplicity)
- Real-time WebSocket updates (SSE or polling on leaderboard is acceptable)
