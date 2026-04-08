# The Commons — Community Experience Layer
### University of Kentucky
### Created: 2026-03-24 | Rebranded: 2026-03-29 | Expanded to 13 room types

---

## Vision

**The Commons** transforms the messaging system from a communication channel into a **community engine**. These are time-boxed, Sandy-hosted interactive experiences that happen *inside* existing group chats — turning study groups into quiz battles, dorm floors into simulations, and course channels into collaborative learning sessions. Rebranded from "Live Rooms" to "The Commons" (2026-03-29). Internal Prisma models remain `LiveRoom*` for migration stability; all user-facing strings and file paths use "Commons."

**Core insight:** Sandy knows the academic graph. She knows what everyone is studying, when exams are, and where strengths and weaknesses lie. That context turns a chat app into something Discord and GroupMe can never be.

**Three Pillars alignment:**
- **Learn** — Challenge Rooms are disguised exam prep; Study Rooms improve retention
- **Work** — Teach-Back sessions build communication skills
- **Share** — Every Live Room is a shared experience that builds real human connection

---

## Room Types (13 Total)

| Type | Description | Sandy's Role | Phase 1? |
|------|-------------|--------------|----------|
| `CHALLENGE` | Quiz battle — Sandy generates questions from course material, players race to answer | Host + Question Master | **Yes** |
| `STUDY` | Focus session — shared Pomodoro timer, presence, "stuck?" matching | Facilitator + Tutor | Phase 2 |
| `WATCH` | Shared viewing — game day, lecture replays, campus events with side chat | Color Commentator | Phase 3 |
| `TEACHBACK` | Teach-it-back circles — each person explains a concept, peers rate | Evaluator + Coach | Phase 3 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Messages Page                       │
│  ┌──────────────────────────────────────────────┐   │
│  │  Chat Messages                                │   │
│  │  ┌────────────────────────────────────────┐  │   │
│  │  │  💬 Regular message                     │  │   │
│  │  │  💬 Regular message                     │  │   │
│  │  │  ┌──────────────────────────────────┐  │  │   │
│  │  │  │  🎯 LIVE ROOM CARD               │  │  │   │
│  │  │  │  "Sandy's Challenge Room"        │  │  │   │
│  │  │  │  Topic: BIO 152 Ch. 7            │  │  │   │
│  │  │  │  3/4 players · Starting soon     │  │  │   │
│  │  │  │  [ Join Challenge ]              │  │  │   │
│  │  │  └──────────────────────────────────┘  │  │   │
│  │  │  💬 Regular message                     │  │   │
│  │  └────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  🎮 CHALLENGE ROOM OVERLAY (when joined)     │   │
│  │  ┌──────────┐  ┌─────────────────────────┐  │   │
│  │  │ Scoreboard│  │  Question Card           │  │   │
│  │  │ 1. Tiana 3│  │  "What is the function   │  │   │
│  │  │ 2. Katie 2│  │   of mitochondria?"      │  │   │
│  │  │ 3. Heath 1│  │                          │  │   │
│  │  │           │  │  ○ A) Cell wall           │  │   │
│  │  │           │  │  ○ B) Energy production   │  │   │
│  │  │           │  │  ○ C) Protein synthesis   │  │   │
│  │  │           │  │  ○ D) DNA replication     │  │   │
│  │  └──────────┘  │                          │  │   │
│  │                 │  ⏱️ 12s remaining         │  │   │
│  │                 └─────────────────────────┘  │   │
│  │  Sandy: "Tiana's on fire! 🔥 3 in a row!"   │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Data Model

### New Models

```prisma
// ─── Live Rooms — Community Experience Layer ────────────────────────────────

enum LiveRoomType {
  CHALLENGE
  STUDY
  WATCH
  TEACHBACK
}

enum LiveRoomPhase {
  LOBBY       // Waiting for players
  COUNTDOWN   // 3-2-1 before first round
  QUESTION    // Question is live, accepting answers
  REVEAL      // Showing correct answer + explanation
  SCOREBOARD  // Between rounds, showing standings
  COMPLETE    // Game over, final results posted
}

model LiveRoom {
  id           String         @id @default(cuid())
  channelId    String
  type         LiveRoomType
  title        String
  phase        LiveRoomPhase  @default(LOBBY)
  hostId       String                          // Creator (user who initiated or "sandy")
  courseId     String?                          // Optional course context for question gen
  config       Json           @default("{}")   // Type-specific: { rounds, timeoutMs, topic }
  currentRound Int            @default(0)
  startedAt    DateTime?
  endedAt      DateTime?
  createdAt    DateTime       @default(now())

  channel      ChatChannel    @relation(fields: [channelId], references: [id], onDelete: Cascade)
  host         User           @relation("LiveRoomHost", fields: [hostId], references: [id])
  course       Course?        @relation("LiveRoomCourse", fields: [courseId], references: [id], onDelete: SetNull)
  participants LiveRoomParticipant[]
  rounds       LiveRoomRound[]
  activityMessages ChannelMessage[] @relation("LiveRoomMessages")

  @@index([channelId, phase])
}

model LiveRoomParticipant {
  id       String   @id @default(cuid())
  roomId   String
  userId   String
  score    Int      @default(0)
  streak   Int      @default(0)           // Current consecutive correct answers
  joinedAt DateTime @default(now())

  room     LiveRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user     User     @relation("LiveRoomPlayer", fields: [userId], references: [id])
  responses LiveRoomResponse[]

  @@unique([roomId, userId])
}

model LiveRoomRound {
  id           String    @id @default(cuid())
  roomId       String
  roundNumber  Int
  question     String
  options      String[]                      // 4 choices for CHALLENGE
  correctIndex Int
  explanation  String                         // AI-generated explanation
  timeoutMs    Int       @default(15000)      // 15 seconds per question
  openedAt     DateTime?
  closedAt     DateTime?
  createdAt    DateTime  @default(now())

  room      LiveRoom          @relation(fields: [roomId], references: [id], onDelete: Cascade)
  responses LiveRoomResponse[]

  @@unique([roomId, roundNumber])
  @@index([roomId, roundNumber])
}

model LiveRoomResponse {
  id            String   @id @default(cuid())
  roundId       String
  participantId String
  selectedIndex Int                           // Which option they picked
  isCorrect     Boolean
  responseTimeMs Int                          // ms from question open to answer
  answeredAt    DateTime @default(now())

  round       LiveRoomRound       @relation(fields: [roundId], references: [id], onDelete: Cascade)
  participant LiveRoomParticipant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@unique([roundId, participantId])
}
```

### ChannelMessage Extension

```prisma
// Add to existing ChannelMessage model:
  messageType  String    @default("text")    // "text" | "live_room" | "system"
  liveRoomId   String?
  liveRoom     LiveRoom? @relation("LiveRoomMessages", fields: [liveRoomId], references: [id], onDelete: SetNull)
```

### User Model Extensions

```prisma
// Add to User model:
  liveRoomsHosted  LiveRoom[]            @relation("LiveRoomHost")
  liveRoomPlayers  LiveRoomParticipant[] @relation("LiveRoomPlayer")
```

---

## Challenge Room — Detailed Design

### Flow

```
1. INITIATE  → Someone types "/challenge" or Sandy suggests it
2. LOBBY     → Activity card appears in chat. Others tap "Join"
3. COUNTDOWN → 3-2-1 countdown, Sandy hypes the group
4. QUESTION  → Sandy shows question + 4 options, 15s timer
5. REVEAL    → Correct answer shown, Sandy explains + roasts/cheers
6. SCOREBOARD→ Updated standings between rounds
7. (repeat 4-6 for N rounds)
8. COMPLETE  → Final scoreboard, Sandy posts summary to chat
```

### Question Generation (Sandy/Haiku)

```typescript
// System prompt for question generation
const CHALLENGE_QUESTION_PROMPT = `
You are Sandy, the AI host of a Challenge Room quiz battle at the
University of Kentucky. Generate a multiple-choice question for a
group of students.

Course: {courseName}
Topic: {topic}
Difficulty: {difficulty} (adapts based on group performance)
Round: {roundNumber} of {totalRounds}

Rules:
- One clear correct answer
- Three plausible distractors
- Brief explanation (1-2 sentences)
- Keep it fun — this is a game, not an exam

Return JSON:
{
  "question": "...",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctIndex": 0-3,
  "explanation": "...",
  "difficulty": "easy|medium|hard"
}
`
```

### Scoring

| Event | Points |
|-------|--------|
| Correct answer | +100 |
| Speed bonus | +50 (first correct), +30 (second), +10 (third) |
| Streak bonus | +25 per consecutive correct (streak × 25) |

### Sandy's Commentary (per-round narration)

Sandy posts a commentary message after each reveal:
- Celebrates the winner: "Tiana got it in 3.2 seconds!"
- Encourages stragglers: "Don't worry Katie, that was a tough one"
- Tracks streaks: "Heath is on a 4-answer streak!"
- Final round drama: "It all comes down to this..."

---

## Real-Time Architecture

### Reuse: Room Bus (SSE + Redis Streams)

Live Rooms reuse the existing `room-bus.ts` pattern from Sandcastle:

```
Client ←─ SSE ←─ API Route ←─ subscribeToRoom() ←─ Redis Stream
                                                         ↑
Service layer ──→ publishToRoom() ──────────────────────→
```

### Event Types

```typescript
type LiveRoomEvent =
  | { type: 'player_joined';   data: { userId: string; name: string; count: number } }
  | { type: 'countdown';       data: { seconds: number } }
  | { type: 'question_open';   data: { roundNumber: number; question: string; options: string[]; timeoutMs: number } }
  | { type: 'player_answered'; data: { userId: string; name: string; answeredCount: number; totalPlayers: number } }
  | { type: 'reveal';          data: { correctIndex: number; explanation: string; scores: PlayerScore[]; fastestName: string } }
  | { type: 'scoreboard';      data: { standings: PlayerScore[]; roundNumber: number; totalRounds: number } }
  | { type: 'sandy_says';      data: { message: string } }
  | { type: 'complete';        data: { finalStandings: PlayerScore[]; summary: string } }
  | { type: 'phase_changed';   data: { phase: LiveRoomPhase } }

type PlayerScore = { userId: string; name: string; score: number; streak: number }
```

### SSE Stream Endpoint

```
GET /api/live-rooms/[roomId]/stream?participantId=<id>
  → SSE: event: connected, data: { room state snapshot }
  → SSE: event: player_joined, data: { ... }
  → SSE: event: question_open, data: { ... }
  → ...
```

---

## API Routes

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| POST | `/api/live-rooms` | Create a Live Room in a channel | `requireRequestUser` |
| GET | `/api/live-rooms/[roomId]` | Get room state + participants | `requireRequestUser` |
| POST | `/api/live-rooms/[roomId]/join` | Join as participant | `requireRequestUser` |
| POST | `/api/live-rooms/[roomId]/start` | Start the game (host only) | `requireRequestUser` |
| POST | `/api/live-rooms/[roomId]/answer` | Submit answer for current round | `requireRequestUser` |
| GET | `/api/live-rooms/[roomId]/stream` | SSE event stream | `requireRequestUser` |
| POST | `/api/live-rooms/[roomId]/end` | End room early | `requireRequestUser` |

---

## UI Components

### LiveRoomCard (in chat message list)

Renders inline in the chat when `messageType === 'live_room'`:

```
┌──────────────────────────────────────────┐
│  🎯 Challenge Room                       │
│  "BIO 152 — Chapter 7 Review"           │
│                                          │
│  👤 Tiana, Katie, Heath  ·  3/4 players  │
│  ⏱️ Starting in 45s                      │
│                                          │
│  [ Join Challenge ]                      │
└──────────────────────────────────────────┘
```

States:
- **LOBBY**: Shows participants, "Join" button
- **ACTIVE**: Shows "In Progress — 3/5 rounds", "Watch" button
- **COMPLETE**: Shows final standings, winner highlight

### ChallengeRoomOverlay

Full-screen overlay within the messages page:

```
┌─────────────────────────────────────────────────┐
│  ← Back to Chat          Round 3/5    ⏱️ 12s   │
│─────────────────────────────────────────────────│
│                                                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ SCOREBOARD  │  │  What process converts   │  │
│  │             │  │  glucose into ATP?        │  │
│  │ 🥇 Tiana 350│  │                          │  │
│  │ 🥈 Katie 275│  │  ┌────────────────────┐  │  │
│  │ 🥉 Heath 200│  │  │ A) Photosynthesis  │  │  │
│  │    You   150│  │  ├────────────────────┤  │  │
│  │             │  │  │ B) Cell. respiration│  │  │
│  │ Streak: 🔥3 │  │  ├────────────────────┤  │  │
│  │             │  │  │ C) Mitosis         │  │  │
│  └─────────────┘  │  ├────────────────────┤  │  │
│                    │  │ D) Fermentation    │  │  │
│                    │  └────────────────────┘  │  │
│                    └──────────────────────────┘  │
│                                                  │
│  Sandy: "This one separates the A students       │
│  from the B+ students... 👀"                     │
│─────────────────────────────────────────────────│
│  2/4 answered                                    │
└─────────────────────────────────────────────────┘
```

---

## Sandy Integration Points

### 1. Proactive Suggestion (via SandyAmbientContext)

Sandy can suggest Live Rooms based on context signals:
- "I noticed 4 of you in this group have a BIO 152 exam Thursday. Want me to spin up a Challenge Room?"
- "You've been studying for 2 hours — how about a 5-round break challenge?"

### 2. Question Generation

Sandy generates questions from:
- Course material (syllabus, assignments, uploaded content)
- Study buddy session history
- Exam Forge question banks
- Adaptive difficulty based on group performance

### 3. In-Game Commentary

Sandy narrates the experience with personality:
- Round openers: "Alright wildcats, round 3 — things are heating up!"
- Speed callouts: "3.1 seconds?! Tiana, are you even reading the question?"
- Comeback moments: "Katie just jumped from 4th to 2nd with that streak!"
- Final round: "Last question. Winner takes all bragging rights."

### 4. Post-Game Summary

Sandy posts a results card to chat after completion:
```
🏆 Challenge Complete — BIO 152 Ch. 7

1st 🥇 Tiana — 475 pts (5/5, fastest avg 4.2s)
2nd 🥈 Katie — 350 pts (4/5, 🔥 3 streak)
3rd 🥉 Heath — 200 pts (3/5)

Sandy says: "Tiana is absolutely terrifying. Katie,
that streak in rounds 2-4 was clutch. Heath, chapter 7
might need one more read-through 😉 Great game everyone!"

[ Play Again ] [ Review Answers ]
```

---

## File Structure

```
app/
├── lib/
│   └── live-rooms/
│       ├── live-room-service.ts       # CRUD, state machine, scoring
│       ├── question-service.ts        # AI question generation (Haiku)
│       ├── challenge-engine.ts        # Challenge Room game loop
│       └── commentary-service.ts      # Sandy's in-game narration
├── api/
│   └── live-rooms/
│       ├── route.ts                   # POST create
│       └── [roomId]/
│           ├── route.ts              # GET room state
│           ├── join/route.ts         # POST join
│           ├── start/route.ts        # POST start game
│           ├── answer/route.ts       # POST submit answer
│           ├── stream/route.ts       # GET SSE stream
│           └── end/route.ts          # POST end room
└── components/
    └── live-rooms/
        ├── LiveRoomCard.tsx           # Activity card in chat
        ├── ChallengeRoomOverlay.tsx   # Full game UI overlay
        ├── QuestionCard.tsx           # Question + options display
        ├── Scoreboard.tsx             # Real-time standings
        ├── CountdownTimer.tsx         # 3-2-1 + per-question timer
        └── ResultsCard.tsx            # Post-game summary

scripts/
└── seed-live-rooms.ts                # Demo data for evaluator walkthroughs
```

---

## Implementation Phases

### Phase 1: Foundation + Challenge Rooms (Current Sprint)
1. Prisma schema additions
2. Service layer (CRUD, state machine, question gen)
3. SSE stream (reuse room-bus)
4. API routes
5. LiveRoomCard component
6. ChallengeRoomOverlay
7. Messages page integration
8. Sandy commentary
9. Seed data

### Phase 2: Study Rooms
- Shared Pomodoro timer
- Presence indicators ("12 studying now")
- "Stuck?" button → Sandy matches helper
- Ambient focus mode

### Phase 3: Watch Rooms + Teach-Back
- Watch: Synchronized reactions, Sandy as color commentator
- Teach-Back: Concept assignment, peer rating, Sandy evaluation

---

## Decision Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Live Rooms live inside messaging, not as separate pages | Community happens where people already are — in chat |
| 2 | Reuse room-bus SSE pattern from Sandcastle | Proven, works without WebSocket, Redis fallback |
| 3 | Add `messageType` to ChannelMessage | Minimal schema change, enables rich cards in chat |
| 4 | Sandy hosts (not just assists) | AI as social catalyst — lowers activation energy |
| 5 | Haiku for questions, not pre-generated banks | Fresh, adaptive, course-specific questions |
| 6 | 15s default timeout | Fast enough to be exciting, slow enough to think |
| 7 | No persistent leaderboards/XP | Per decision: gamification was intentionally removed. Live Room scores are ephemeral — per-session only |
| 8 | Peer-to-peer creation (any role) | Students should be able to challenge each other |
