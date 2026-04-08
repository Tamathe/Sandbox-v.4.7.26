# Tool 3: Case Pitch

You are building **Case Pitch** for The Sandbox platform at `c:\AA Code\Educator marketplace\the-sandbox\`. Full sprint — schema, lib, API, pages, hub card.

## Constraints (READ FIRST)
- Read `CLAUDE.md` before writing any code.
- Tailwind v4: no `@apply`, utility classes only
- Icons: lucide-react ONLY
- Every API route MUST call `requireRequestUser` first
- Business logic in `app/lib/`, not routes
- Prisma: import from `../generated/prisma`, use singleton from `app/lib/prisma.ts`
- Page pattern: PageHeader, `max-w-6xl`, `border-2 border-gray-200 rounded-2xl` cards, `font-extrabold` headings
- Auth via `x-demo-user-email`

## What You Are Building
Case Pitch is a business case competition platform. An instructor posts a case prompt (a business problem), student teams submit their solution pitch (executive summary + recommendation + rationale), peers can vote for the most compelling pitch, and AI (Claude Sonnet) generates a structured executive-style feedback card for each pitch.

**Audience:** Business school, MBA programs, entrepreneurship courses, strategy courses
**UI Vibe:** Professional boardroom / VC pitch aesthetic. Dark navy (`#0F172A` / slate-900) headers, gold (`#D97706` / amber-600) accents, card-based pitch display like a pitch deck cover, crisp sans-serif. Feels like a real competition, not a classroom exercise.

---

## Step 1: Schema Changes

Add to `prisma/schema.prisma`:

```prisma
model PitchRoom {
  id          String           @id @default(cuid())
  title       String           // e.g. "MBA 640 Case Competition — Week 8"
  casePrompt  String           // The business problem/case description
  accessCode  String           @unique
  status      PitchRoomStatus  @default(OPEN)
  hostId      String
  host        User             @relation("PitchRoomHost", fields: [hostId], references: [id])
  pitches     PitchSubmission[]
  createdAt   DateTime         @default(now())
  closedAt    DateTime?
}

model PitchSubmission {
  id            String        @id @default(cuid())
  roomId        String
  room          PitchRoom     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  authorId      String
  author        User          @relation("PitchAuthor", fields: [authorId], references: [id])
  teamName      String
  summary       String        // Executive summary (2-3 sentences)
  recommendation String       // Their specific recommendation
  rationale     String        // Why this is the right call
  votes         PitchVote[]
  aiFeedback    String?       // AI-generated feedback, null until generated
  aiFeedbackAt  DateTime?
  createdAt     DateTime      @default(now())
}

model PitchVote {
  id           String          @id @default(cuid())
  pitchId      String
  pitch        PitchSubmission @relation(fields: [pitchId], references: [id], onDelete: Cascade)
  voterId      String
  voter        User            @relation("PitchVoter", fields: [voterId], references: [id])
  createdAt    DateTime        @default(now())

  @@unique([pitchId, voterId])
}

enum PitchRoomStatus {
  OPEN
  VOTING
  COMPLETE
}
```

Add back-relations to User:
```
pitchRoomsHosted  PitchRoom[]       @relation("PitchRoomHost")
pitchSubmissions  PitchSubmission[] @relation("PitchAuthor")
pitchVotes        PitchVote[]       @relation("PitchVoter")
```

Run:
```
cd the-sandbox && npx prisma db push && npx prisma generate
```

---

## Step 2: Lib Files

### `app/lib/pitch/pitch-service.ts`

- `generateAccessCode()` — e.g. `PITCH-583`, unique in DB
- `createRoom(hostId, title, casePrompt)` — create PitchRoom, return it
- `getRoom(roomId, userId)` — return room with pitches (each with vote count, `iVoted` bool, author name), `isHost` bool, `myPitch` record or null
- `listRoomsForUser(userId)` — rooms hosted or pitched in
- `submitPitch(roomId, authorId, teamName, summary, recommendation, rationale)` — throws if room status is not OPEN, throws if user already submitted, creates PitchSubmission, then fire-and-forget calls `generateAiFeedback`
- `generateAiFeedback(pitchId)` — fetch pitch + room casePrompt, call **Claude Sonnet** (`claude-sonnet-4-6`) with prompt: "You are a seasoned executive judge at a case competition. Here is the case: {casePrompt}. Here is the team's pitch — Team: {teamName}, Summary: {summary}, Recommendation: {recommendation}, Rationale: {rationale}. Provide concise executive feedback in exactly this format: **Strengths:** [2-3 bullets] **Weaknesses:** [1-2 bullets] **Verdict:** [1 sentence overall assessment]". Save result to `aiFeedback` field, set `aiFeedbackAt`.
- `votePitch(pitchId, voterId)` — throws if voter is pitch author, upserts vote (toggle: delete if exists)
- `closeRoom(roomId, hostId)` — throws if not host, sets status COMPLETE, saves closedAt
- `openVoting(roomId, hostId)` — throws if not host, sets status VOTING

### `app/lib/pitch/index.ts` — re-export

---

## Step 3: API Routes

### `app/api/pitch/rooms/route.ts`
- `GET` — requireRequestUser → listRoomsForUser
- `POST` — requireRequestUser → parse `{ title, casePrompt }` → createRoom → return

### `app/api/pitch/rooms/[roomId]/route.ts`
- `GET` — requireRequestUser → getRoom → 404 if null

### `app/api/pitch/rooms/[roomId]/pitches/route.ts`
- `POST` — requireRequestUser → parse `{ teamName, summary, recommendation, rationale }` → submitPitch → return pitch

### `app/api/pitch/rooms/[roomId]/pitches/[pitchId]/vote/route.ts`
- `POST` — requireRequestUser → votePitch → return `{ ok: true }`

### `app/api/pitch/rooms/[roomId]/status/route.ts`
- `POST` — requireRequestUser → parse `{ action }` ('open_voting' | 'close') → call openVoting or closeRoom → return room status

---

## Step 4: Pages

### `app/pitch/page.tsx` — Hub
'use client'.

Layout:
- PageHeader: title="Case Pitch", subtitle="Present your strategy. Win the room."
- "How It Works" strip: 3 cards (Read the Case → Submit Your Pitch → AI Judges, Peers Vote)
- Buttons: "Host a Competition" → `/pitch/new`, "Join with Code" → inline code input
- Grid of PitchRoomCard components: case title (truncated), status badge, pitch count, "View" button

**Aesthetic:** The hub itself uses the standard white Pattern A layout, but pitch cards have a dark navy left border accent (`border-l-4 border-slate-800`).

### `app/pitch/new/page.tsx` — Create
'use client'. Two-field form:
- Title (e.g. "Strategy Final — Team Presentations")
- Case Prompt: large textarea — instructor pastes the full business case (or a summary)
- Submit → POST → redirect to `/pitch/[roomId]`

### `app/pitch/[roomId]/page.tsx` — Main view
'use client'. Polls GET `/api/pitch/rooms/[roomId]` every 8 seconds.

**Header area:** Dark slate-900 banner with:
- Case title (white, `font-extrabold text-2xl`)
- Status badge
- Access code (shown as `PITCH-583`, monospace, copyable)

**Case Prompt display:** Expandable card showing full case prompt. Collapsed by default showing first 150 chars + "Read full case →"

**Pitch grid:** 2-3 column responsive grid of pitch cards. Each card:
- Team name (bold, amber-600)
- Summary text (2-3 sentences)
- Recommendation (callout box — dark border)
- Rationale (smaller text)
- Vote count + vote button (thumbs up, disabled if own pitch)
- AI Feedback section: if `aiFeedback` present, show it with a Sparkles icon in a subtle amber-50 box; if not, show "AI review in progress..."

**Host controls (only shown to host):**
- If OPEN: "Open Voting" button
- If VOTING: "Close Competition" button
- Status shown: "X pitches submitted"

**If user hasn't submitted + status is OPEN:**
Show prominent "Submit Your Pitch →" button linking to `/pitch/[roomId]/submit`

### `app/pitch/[roomId]/submit/page.tsx` — Submit pitch
'use client'. Shows the case prompt at top for reference. Then form:
- Team Name
- Executive Summary (2-3 sentences: what is the core problem and your approach)
- Recommendation (your specific, actionable recommendation)
- Rationale (why your recommendation is the right call)
- Submit → POST → redirect to `/pitch/[roomId]`

---

## Step 5: Hub Card

In `app/hub/page.tsx`:
```
{
  title: 'Case Pitch',
  description: 'Post a business case. Teams pitch. AI judges.',
  icon: Briefcase,
  color: 'bg-slate-50 border-slate-200',
  href: '/pitch',
  roles: ['EDUCATOR', 'ADMIN', 'STUDENT'],
}
```

(Import Briefcase from lucide-react)

---

## Step 6: Verify

Run `npm run build`. Fix all TypeScript errors. Build must pass 0 errors.

If build fails after 3 fix attempts, write `night-shift-blockers.md` and STOP.
