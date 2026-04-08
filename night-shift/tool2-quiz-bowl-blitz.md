# Tool 2: Quiz Bowl Blitz

You are building a new standalone featured experience called **Quiz Bowl Blitz** for The Sandbox platform at `c:\AA Code\Educator marketplace\the-sandbox\`. This is a full sprint — schema, lib, API routes, pages, and hub card.

## Constraints (READ FIRST)
- Read `CLAUDE.md` before writing any code.
- Tailwind v4: no `@apply`, use utility classes only, `size-4` not `w-4 h-4`
- Icons: lucide-react ONLY
- Every API route MUST call `requireRequestUser` before any DB access
- Business logic goes in `app/lib/`, not in route files
- Import Prisma from `../generated/prisma` (relative to app/lib/)
- Use existing prisma singleton from `app/lib/prisma.ts`
- All new pages follow `PLATFORM-CONSISTENCY-MANIFEST.md`
- Auth via `x-demo-user-email` header

## What You Are Building
Quiz Bowl Blitz is a live, hosted quiz game. The host picks a topic and the number of questions, AI generates the questions (Haiku), students join with a code, and when the host starts the game, questions are revealed one at a time. Players answer, see the correct answer, and a leaderboard updates. Fast, fun, Kahoot-style.

**Audience:** Any large lecture course — intro courses, review sessions, pre-exam prep
**UI Vibe:** Game show / neon energy. Dark background (#0a0a0a or slate-900), bright colored answer buttons (A=blue, B=green, C=amber, D=red), big countdown timer, confetti on correct answer, live leaderboard with rank movement arrows.

---

## Step 1: Schema Changes

Add to `prisma/schema.prisma`:

```prisma
model QuizBowl {
  id          String             @id @default(cuid())
  title       String
  topic       String             // Subject for AI question generation
  accessCode  String             @unique
  status      QuizBowlStatus     @default(LOBBY)
  hostId      String
  host        User               @relation("QuizBowlHost", fields: [hostId], references: [id])
  questions   QuizBowlQuestion[]
  players     QuizBowlPlayer[]
  currentQ    Int                @default(0)  // index of current question (0-based)
  createdAt   DateTime           @default(now())
}

model QuizBowlQuestion {
  id            String          @id @default(cuid())
  quizId        String
  quiz          QuizBowl        @relation(fields: [quizId], references: [id], onDelete: Cascade)
  orderIndex    Int
  questionText  String
  options       String[]        // 4 options
  correctIndex  Int             // 0-3
  explanation   String          // Why this is correct — shown after answer
  answers       QuizBowlAnswer[]
}

model QuizBowlPlayer {
  id          String            @id @default(cuid())
  quizId      String
  quiz        QuizBowl          @relation(fields: [quizId], references: [id], onDelete: Cascade)
  userId      String
  user        User              @relation("QuizBowlPlayer", fields: [userId], references: [id])
  displayName String
  score       Int               @default(0)
  answers     QuizBowlAnswer[]
  joinedAt    DateTime          @default(now())

  @@unique([quizId, userId])
}

model QuizBowlAnswer {
  id           String           @id @default(cuid())
  questionId   String
  question     QuizBowlQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  playerId     String
  player       QuizBowlPlayer   @relation(fields: [playerId], references: [id], onDelete: Cascade)
  selectedIndex Int
  isCorrect    Boolean
  answeredAt   DateTime         @default(now())

  @@unique([questionId, playerId])
}

enum QuizBowlStatus {
  LOBBY
  GENERATING
  READY
  IN_PROGRESS
  COMPLETE
}
```

Add back-relations to User:
```
quizBowlsHosted  QuizBowl[]      @relation("QuizBowlHost")
quizBowlPlayers  QuizBowlPlayer[] @relation("QuizBowlPlayer")
```

After editing schema:
```
cd the-sandbox && npx prisma db push && npx prisma generate
```

---

## Step 2: Lib Files

### `app/lib/quiz-bowl/quiz-bowl-service.ts`

Functions:
- `generateAccessCode()` — e.g. `BLITZ-419` — unique in DB
- `createQuiz(hostId, title, topic, questionCount)` — creates QuizBowl with status GENERATING, fires `generateQuestions` fire-and-forget, returns quiz
- `generateQuestions(quizId)` — fetches quiz, calls Haiku to generate `questionCount` multiple-choice questions on the topic. Prompt: "Generate {n} multiple-choice quiz questions about {topic}. For each question return: questionText, options (array of 4 strings), correctIndex (0-3), explanation (1 sentence). Return as JSON array." Parse response, create QuizBowlQuestion records in order, set status to READY.
- `getQuiz(quizId, userId)` — returns quiz with questions (without revealing correctIndex unless status is COMPLETE or question has been revealed), players with scores, `isHost` bool, `myPlayer` record
- `joinQuiz(quizId, userId, displayName)` — throws if status is not LOBBY or READY, upserts QuizBowlPlayer
- `listQuizzesForUser(userId)` — quizzes hosted or played in
- `startQuiz(quizId, hostId)` — throws if not host, throws if status is not READY, sets status IN_PROGRESS, currentQ = 0
- `advanceQuestion(quizId, hostId)` — throws if not host, increments currentQ. If currentQ exceeds question count, sets status COMPLETE.
- `submitAnswer(quizId, questionId, userId, selectedIndex)` — finds player, finds question, creates QuizBowlAnswer, marks isCorrect, if correct adds 100 points to player score, returns `{ isCorrect, correctIndex, explanation }`

### `app/lib/quiz-bowl/index.ts`
Re-export everything.

---

## Step 3: API Routes

### `app/api/quiz-bowl/route.ts`
- `GET` — requireRequestUser, call listQuizzesForUser
- `POST` — requireRequestUser, parse `{ title, topic, questionCount }` (default questionCount to 5 if not provided, cap at 10), call createQuiz, return quiz

### `app/api/quiz-bowl/[quizId]/route.ts`
- `GET` — requireRequestUser, call getQuiz(quizId, user.id), 404 if null

### `app/api/quiz-bowl/[quizId]/join/route.ts`
- `POST` — requireRequestUser, parse `{ displayName }`, call joinQuiz, return player

### `app/api/quiz-bowl/[quizId]/start/route.ts`
- `POST` — requireRequestUser, call startQuiz(quizId, user.id), return quiz

### `app/api/quiz-bowl/[quizId]/advance/route.ts`
- `POST` — requireRequestUser, call advanceQuestion(quizId, user.id), return `{ currentQ, status }`

### `app/api/quiz-bowl/[quizId]/answer/route.ts`
- `POST` — requireRequestUser, parse `{ questionId, selectedIndex }`, call submitAnswer, return result

---

## Step 4: Pages

### `app/quiz-bowl/page.tsx` — Hub
'use client'. Fetches GET `/api/quiz-bowl`.

Layout:
- PageHeader: title="Quiz Bowl Blitz", subtitle="AI-generated quizzes. Live competition."
- "How It Works": 3 steps (Pick a Topic → Students Join → Play Live)
- Buttons: "Create Quiz" → `/quiz-bowl/new`, "Join with Code" → shows inline access code input
- List of QuizBowlCard components: title, topic, status badge, player count, "Continue" / "View Results" button

### `app/quiz-bowl/new/page.tsx` — Create
'use client'. Form:
- Title (e.g. "Midterm Review — CHEM 105")
- Topic (free text — this is what AI generates questions about)
- Number of questions: 1–10, default 5 (number input or simple slider)
- Submit → POST `/api/quiz-bowl` → redirect to `/quiz-bowl/[quizId]`
- While status is GENERATING, poll and show spinner: "AI is writing your questions..."

### `app/quiz-bowl/[quizId]/page.tsx` — Game view (host + player combined)
'use client'. Polls GET `/api/quiz-bowl/[quizId]` every 3 seconds.

**Game show aesthetic:** dark slate-900 background on the game area, bright colored elements.

States:
1. **LOBBY / GENERATING / READY:**
   - Show access code large in the center
   - List of joined players with avatars/names
   - If host + READY: "Start Quiz!" button (calls POST start)
   - If GENERATING: "Generating questions..." spinner
   - If not host: "Waiting for host to start..."

2. **IN_PROGRESS:**
   - Current question number + total (e.g. "Question 2 of 5")
   - Question text, large, centered
   - Four answer buttons in a 2×2 grid:
     - A = bg-blue-600, B = bg-green-600, C = bg-amber-500, D = bg-red-600
     - All white text, rounded-xl, py-4, text-lg
     - After answering: show correct answer (green outline) + explanation
   - If host: "Next Question →" button after a 5-second delay
   - Mini leaderboard sidebar (top 5 players, score + rank)

3. **COMPLETE:**
   - Podium display: 1st/2nd/3rd place
   - Full leaderboard table
   - "Play Again" button (creates new quiz with same topic)

---

## Step 5: Hub Card

In `app/hub/page.tsx`, add:
```
{
  title: 'Quiz Bowl Blitz',
  description: 'AI-generated live quizzes. Pick a topic and compete.',
  icon: Zap,
  color: 'bg-yellow-50 border-yellow-200',
  href: '/quiz-bowl',
  roles: ['EDUCATOR', 'ADMIN', 'STUDENT'],
}
```

---

## Step 6: Verify

Run `npm run build`. Fix all TypeScript errors. Build must pass with 0 errors before you are done.

If build fails after 3 fix attempts, write `night-shift-blockers.md` describing the blocker and STOP.
