# Tool 1: Debate Arena

You are building a new standalone featured experience called **Debate Arena** for The Sandbox platform at `c:\AA Code\Educator marketplace\the-sandbox\`. This is a full sprint — schema, lib, API routes, pages, and hub card.

## Constraints (READ FIRST)
- Read `CLAUDE.md` before writing any code — it has rigid constraints.
- Tailwind v4: no `@apply`, use utility classes only, `size-4` not `w-4 h-4`
- Icons: lucide-react ONLY
- Every API route MUST call `requireRequestUser` before any DB access
- Business logic goes in `app/lib/`, not in route files
- Import Prisma from `../generated/prisma` (relative to app/lib/)
- Use the existing prisma singleton from `app/lib/prisma.ts` — never reinvent it
- All new pages follow `PLATFORM-CONSISTENCY-MANIFEST.md`: Pattern A white header, `max-w-6xl`, `border-2 border-gray-200 rounded-2xl` cards, `font-extrabold` h1/h2
- Auth is via `x-demo-user-email` header — use `useAuth()` from `app/lib/auth-context.tsx` on client, `requireRequestUser` on server

## What You Are Building
Debate Arena is a structured argument platform where an instructor posts a debate proposition, students join and are assigned PRO or CON sides, submit arguments with claim/evidence/reasoning, peers vote on argument quality, and AI (Haiku) renders a final verdict with scores.

**Audience:** Law students, Political Science, Philosophy, Humanities courses
**UI Vibe:** Courtroom/gladiator — PRO side UK blue (#0033A0), CON side amber/orange. Two-column layout. Formal card-based argument display.

---

## Step 1: Schema Changes

Add these models to `prisma/schema.prisma`:

```prisma
model DebateRoom {
  id            String          @id @default(cuid())
  title         String
  proposition   String          // The debate motion, e.g. "AI should replace human tutors"
  accessCode    String          @unique
  status        DebateStatus    @default(OPEN)
  hostId        String
  host          User            @relation("DebateRoomHost", fields: [hostId], references: [id])
  arguments     DebateArgument[]
  verdict       String?         // AI-generated verdict, nullable until generated
  verdictAt     DateTime?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
}

model DebateArgument {
  id        String        @id @default(cuid())
  roomId    String
  room      DebateRoom    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  authorId  String
  author    User          @relation("DebateArgumentAuthor", fields: [authorId], references: [id])
  side      DebateSide
  claim     String        // One sentence: what you assert
  evidence  String        // Supporting evidence or citation
  reasoning String        // Why the evidence supports the claim
  votes     DebateVote[]
  createdAt DateTime      @default(now())
}

model DebateVote {
  id         String         @id @default(cuid())
  argumentId String
  argument   DebateArgument @relation(fields: [argumentId], references: [id], onDelete: Cascade)
  voterId    String
  voter      User           @relation("DebateVoteVoter", fields: [voterId], references: [id])
  createdAt  DateTime       @default(now())

  @@unique([argumentId, voterId])
}

enum DebateStatus {
  OPEN
  JUDGING
  COMPLETE
}

enum DebateSide {
  PRO
  CON
}
```

Also add back-relations on the `User` model:
```
debateRoomsHosted  DebateRoom[]      @relation("DebateRoomHost")
debateArguments    DebateArgument[]  @relation("DebateArgumentAuthor")
debateVotes        DebateVote[]      @relation("DebateVoteVoter")
```

After editing the schema, run:
```
cd the-sandbox && npx prisma db push && npx prisma generate
```

---

## Step 2: Lib Files

### `app/lib/debate/debate-service.ts`
Create this file with the following functions:

- `generateAccessCode()` — returns a string like `LOGIC-247` (random adjective from a list + 3-digit number, unique in DB)
- `createRoom(hostId, title, proposition)` — creates a DebateRoom, returns it
- `getRoom(roomId, viewerId)` — returns room with arguments (each with vote count and `iMineVoted` bool), and `isHost` bool
- `listRoomsForUser(userId)` — returns all rooms where user is host or has submitted an argument
- `submitArgument(roomId, authorId, side, claim, evidence, reasoning)` — throws if room is not OPEN, throws if user already has an argument on this side, creates DebateArgument
- `voteArgument(argumentId, voterId)` — throws if voter is the argument author, upserts vote (toggle: if already voted, delete the vote)
- `requestVerdict(roomId, requesterId)` — throws if requester is not host, throws if fewer than 2 arguments total, sets status to JUDGING, calls `generateVerdict` fire-and-forget
- `generateVerdict(roomId)` — fetches all arguments, calls Anthropic Haiku with structured prompt (list all PRO arguments with votes, list all CON arguments with votes, ask for a verdict: which side argued more effectively and why, 3-4 sentences), saves verdict text + sets status to COMPLETE + saves verdictAt

For Anthropic calls use the pattern from `app/lib/chat-service.ts` — import Anthropic, use `claude-haiku-4-5-20251001`.

### `app/lib/debate/index.ts`
Re-export everything from debate-service.ts.

---

## Step 3: API Routes

All routes are thin: auth → parse → call lib → return. No business logic.

### `app/api/debate/rooms/route.ts`
- `GET` — requireRequestUser, call listRoomsForUser, return rooms
- `POST` — requireRequestUser, parse `{ title, proposition }` from body, call createRoom, return room

### `app/api/debate/rooms/[roomId]/route.ts`
- `GET` — requireRequestUser, call getRoom(roomId, user.id), return result. Return 404 if null.

### `app/api/debate/rooms/[roomId]/join/route.ts`
- `POST` — requireRequestUser, parse `{ accessCode }` from body, verify accessCode matches room, return room. This is just a verify — no join record needed.

### `app/api/debate/rooms/[roomId]/arguments/route.ts`
- `POST` — requireRequestUser, parse `{ side, claim, evidence, reasoning }`, call submitArgument, return argument

### `app/api/debate/rooms/[roomId]/arguments/[argumentId]/vote/route.ts`
- `POST` — requireRequestUser, call voteArgument(argumentId, user.id), return `{ ok: true }`

### `app/api/debate/rooms/[roomId]/verdict/route.ts`
- `POST` — requireRequestUser, call requestVerdict(roomId, user.id), return `{ status: 'JUDGING' }`

---

## Step 4: Pages

### `app/debate/page.tsx` — Hub page
'use client'. Uses `useAuth()`. Fetches GET `/api/debate/rooms` on mount.

Layout:
- PageHeader with `title="Debate Arena"`, `subtitle="Structured argument. AI verdict."`, icon Gavel (lucide)
- "How It Works" strip: 3 steps (Create a Proposition → Argue Your Side → AI Delivers Verdict)
- Two buttons: "Create Debate" → `/debate/new`, "Join with Code" → opens inline input
- Grid of DebateRoomCard components (see below)
- DebateRoomCard shows: proposition (truncated), status badge, side counts (X PRO / Y CON), host name, "View" button

### `app/debate/new/page.tsx` — Create room
'use client'. Form with:
- Title input (e.g. "PHI 110 — Week 3 Debate")
- Proposition textarea (the debate motion)
- Submit calls POST `/api/debate/rooms`
- On success, redirect to `/debate/[roomId]`

### `app/debate/join/page.tsx` — Join by code
'use client'. Single access code input. On submit, fetches GET `/api/debate/rooms` and finds the matching room by accessCode, then redirects to `/debate/[roomId]`. (Or POST to join route.)

### `app/debate/[roomId]/page.tsx` — Main debate view
'use client'. Fetches GET `/api/debate/rooms/[roomId]`. Polling every 10 seconds.

Layout — the main showpiece:
- Header: proposition in large bold text, status badge, access code shown to host
- **Two-column layout** (side by side on desktop, stacked on mobile):
  - LEFT column header: "PRO" in UK blue (#0033A0), argument count
  - RIGHT column header: "CON" in amber-600, argument count
  - Arguments listed as cards: claim (large), evidence (italic, smaller), reasoning (text-sm text-gray-600), vote count with thumbs-up button, author name + time
- Below columns:
  - If user has not submitted: "Submit Your Argument" button → `/debate/[roomId]/argue`
  - If host and status is OPEN: "Request AI Verdict" button (calls POST verdict route)
  - If status is JUDGING: pulsing "AI is deliberating..." indicator
  - If status is COMPLETE: AI verdict card — dark blue background, Sparkles icon, verdict text

### `app/debate/[roomId]/argue/page.tsx` — Submit argument
'use client'.
- Side selector: two large cards — PRO (blue) and CON (amber) — user picks one
- Three textareas: Claim (1-2 sentences), Evidence (quote, stat, or citation), Reasoning (why this evidence supports your claim)
- Submit calls POST `/api/debate/rooms/[roomId]/arguments`
- On success, redirect back to `/debate/[roomId]`

---

## Step 5: Hub Card

In `app/hub/page.tsx`, add a hub card in the existing services grid for Debate Arena:
```
{
  title: 'Debate Arena',
  description: 'Post a proposition, argue both sides, get an AI verdict.',
  icon: Gavel,
  color: 'bg-blue-50 border-blue-200',
  href: '/debate',
  roles: ['EDUCATOR', 'ADMIN', 'STUDENT'],
}
```

---

## Step 6: Verify

Run `npm run build` from the `the-sandbox/` directory. Fix any TypeScript errors before finishing. The build must pass with 0 errors.

If the build fails after 3 attempts to fix the error, write a file `night-shift-blockers.md` in the project root describing what failed and why, then STOP — do not continue to the next tool.
