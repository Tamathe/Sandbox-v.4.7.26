# Handoff Prompt — Sprint M16: Complementary Study Matching UI + Integration

## Context
You are building "Magic Moments" for The Sandbox — an AI-powered educational marketplace
at the University of Kentucky. The full architecture is documented in:
`c:\AA Code\Educator marketplace\Blueprints\magic-moments-architecture.md`

Read that file FIRST for complete context, component hierarchy, and design specs. You are
executing Sprint M16 (Tasks 31-32). This is the **final Magic Moments sprint**. Sprints M1-M15 are complete.

The Sandbox uses:
- Next.js 16.1.6 App Router, TypeScript, Tailwind v4
- Prisma v7 with PostgreSQL (Neon), generated client at `app/generated/prisma`
- Auth via `x-demo-user-email` header; client-side: `useAuth()` from `app/lib/auth-context.tsx`
- AI: Anthropic — Haiku (`claude-haiku-4-5-20251001`) for chat, Sonnet (`claude-sonnet-4-6`) for analysis
- Icons: lucide-react ONLY
- UI pattern: `border-2 rounded-2xl border-gray-200` cards, `font-extrabold` h1/h2, UK Blue `#0033A0`
- No new npm dependencies
- Read `the-sandbox/CLAUDE.md` for all coding constraints

## Sprint M15 Complete — Available Files & Exports

**Schema models** (in `prisma/schema.prisma`):

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

**Study Match Service:** `the-sandbox/app/lib/study-match-service.ts`
- `upsertMatchProfile(userId, data)` → `StudyMatchProfile`
  - Create/update opt-in status, available hours, preferred group size
- `getMatchProfile(userId)` → `StudyMatchProfile | null`
  - Returns current opt-in profile or null
- `getSuggestions(userId, courseId)` → `StudyMatchSuggestion[]`
  - Complementarity algorithm: concept vectors with decay, greedy clustering, Haiku-generated match reasons
  - Returns top 3 match suggestions with members, scores, reasons
- `respondToMatch(matchId, userId, action)` → `{ status: string, chatGroupId?: string }`
  - Accept/decline; auto-creates ChatGroup when all members accept

**Exported types from study-match-service.ts:**
```typescript
interface StudyMatchMember {
  userId: string
  name: string                    // first name only (FERPA)
  strengths: string[]             // concept labels (not scores)
  canHelpWith: string[]           // concepts this person can teach
  needsHelpWith: string[]         // concepts this person needs
  accepted?: boolean              // per-member acceptance tracking
}

interface StudyMatchSuggestion {
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

**API Routes (3 endpoints):**
- `POST /api/study-match/opt-in` — Body: `{ optedIn, availableHours?, preferredSize? }` → `upsertMatchProfile`
- `GET /api/study-match/opt-in` — Returns current `StudyMatchProfile`
- `GET /api/study-match/suggestions?courseId=X` → `getSuggestions` — returns `StudyMatchSuggestion[]`
- `POST /api/study-match/[matchId]/respond` — Body: `{ action: "accept" | "decline" }` → `respondToMatch`

**Existing chat system** (already fully built):
- `ChatGroup` model (line 2804 in schema) with `ChatGroupType` enum (`COURSE`, `ORG`, `PRIVATE` — M15 added `STUDY`)
- `ChatMembership` model (line 2863) — `@@unique([userId, groupId])`
- `ChatChannel` model — channels within groups
- `app/lib/group-chat-service.ts` — `getEligibleGroups()`, `generateSandyReply()`, `publishToChannelStream()`
- Group chat UI already exists — accepted study matches link to `/chat` with the created group

## Prior Magic Moments (M1-M12) — Reference Only

| Sprint | Feature | Key Integration Points |
|--------|---------|----------------------|
| M1-M4 | Knowledge Constellation | `/constellation` page, `constellation-service.ts` |
| M5-M6 | Learning Time Machine | `/timeline` page, `TimelineCard` on homepage |
| M7-M8 | Interstitial Micro-Reviews | `MicroReviewModal` triggers on course selection |
| M9-M10 | Exam Forge | `/exam-forge` pages, `ExamForgePanel` in course page |
| M11-M12 | Teach It Back | `/teach-back/[sessionId]` page, `TeachBackSection` in course page |

## Key Files to Read Before Starting
- `app/lib/study-match-service.ts` — the service you are building UI for
- `app/lib/auth-context.tsx` — `useAuth()` hook: `user`, `fetchWithAuth()`, `role`
- `app/courses/page.tsx` — course detail page (integration target); see lines ~863 and ~906 for how `TeachBackSection` and `ExamForgePanel` are integrated
- `app/components/teach-back/TeachBackSection.tsx` — pattern for a course-page-integrated section
- `app/components/exam-forge/ExamForgePanel.tsx` — pattern for a course-page-integrated panel
- `app/teach-back/[sessionId]/page.tsx` — pattern for a full-page feature with loading/error/empty states
- `app/components/PageHeader.tsx` — standard page header component

## The Goal
Execute ONLY these 2 tasks, then STOP:

### Task 31: StudyMatchPage + Core Components

1. **Create `the-sandbox/app/study-match/page.tsx`:**
   - Full `/study-match` page — the study matching dashboard
   - Uses `useAuth()` for user context and `fetchWithAuth()` for API calls
   - Sections (top to bottom):
     a. **PageHeader** — title "Study Partners", subtitle "Find classmates whose strengths complement your gaps"
     b. **OptInCard** — opt-in toggle, availability editor, preferred size selector
     c. **CourseSelector** — dropdown of enrolled courses (fetch from existing `/api/courses` or similar)
     d. **MatchSuggestions** — list of `MatchCard` components (one per suggestion)
     e. **ActiveMatches** — list of accepted/active matches with chat links
   - State management:
     - On load: fetch `GET /api/study-match/opt-in` for profile status
     - When opted in + course selected: fetch `GET /api/study-match/suggestions?courseId=X`
     - Track loading, error, empty states for each section
   - If not opted in: show OptInCard prominently, hide suggestions
   - If opted in but no course selected: prompt to select a course
   - If opted in + course selected but no suggestions: empty state "No complementary matches found yet"

2. **Create `the-sandbox/app/components/study-match/OptInCard.tsx`:**
   - Props: `{ profile: StudyMatchProfile | null, onUpdate: (profile) => void }`
   - Toggle switch for opt-in/out (calls `POST /api/study-match/opt-in`)
   - When opted in, show:
     - **Preferred group size** — radio buttons or slider: 2, 3, or 4
     - **Available hours** — simple day-of-week checkboxes (Mon-Sun) with optional time range display
   - Card style: `border-2 rounded-2xl` with Users icon header
   - When toggling off: confirm dialog "This will hide you from matching. Continue?"

3. **Create `the-sandbox/app/components/study-match/MatchCard.tsx`:**
   - Props: `{ match: StudyMatchSuggestion, currentUserId: string, onRespond: (matchId, action) => void }`
   - Layout:
     - **Member avatars row** — initials circles (first letter of first name) with names below
     - **Complementarity score** — visual meter/bar (0-100%, colored: green > 70%, yellow > 40%)
     - **Match reason** — the Haiku-generated explanation text
     - **TopicOverlap** — inline `TopicOverlap` component showing complementary topics
     - **Action buttons** — "Accept" (green) + "Decline" (gray outline), disabled if already responded
   - If match status is "active": show "Chat with Group" link to `/chat` instead of action buttons
   - Expiry indicator: "Expires in X days" badge if within 3 days of `expiresAt`

4. **Create `the-sandbox/app/components/study-match/TopicOverlap.tsx`:**
   - Props: `{ members: StudyMatchMember[], currentUserId: string }`
   - Visual showing complementary topic coverage:
     - "You can help with:" — list of concepts the current user is strong in that others need
     - "They can help you with:" — list of concepts others are strong in that the current user needs
     - Use colored pills/tags: green for strengths, amber for needs
   - Keep it compact — 2-column layout or side-by-side lists
   - Capitalize concept slugs for display (replace hyphens with spaces)

### Task 32: Course Page Integration

1. **Create `the-sandbox/app/components/study-match/StudyMatchCTA.tsx`:**
   - Props: `{ courseId: string }`
   - A lightweight card that appears on the course detail page for STUDENT users
   - Fetches `GET /api/study-match/opt-in` to check if student is opted in
   - **If not opted in:** Show invite card — "Find study partners whose strengths cover your gaps" with "Get Started" button linking to `/study-match`
   - **If opted in:** Show summary — number of pending suggestions for this course + "View Matches" link to `/study-match?courseId=X`
   - Card style: `border-2 rounded-2xl` with Users icon, UK Blue accent
   - Compact — similar size to TeachBackSection

2. **Integrate into `app/courses/page.tsx`:**
   - Import `StudyMatchCTA`
   - Add it near the existing `TeachBackSection` and `ExamForgePanel` integrations (around lines 863-906)
   - Only render for STUDENT role users
   - Place it after the existing learning path sections

## Design Specifications
- Follow `PLATFORM-CONSISTENCY-MANIFEST.md` patterns:
  - Cards: `border-2 rounded-2xl border-gray-200 bg-white`
  - Headers: `font-extrabold text-gray-900`
  - Buttons: primary `bg-[#0033A0] text-white rounded-xl`, secondary `border-2 rounded-xl`
  - Use `size-N` not `w-N h-N` for square elements
- Loading states: `Loader2` spinner from lucide-react with `animate-spin`
- Error states: `AlertCircle` icon with red message + retry button
- Empty states: descriptive message with relevant icon (Users, Search)
- Member avatars: colored circles with initials (use consistent color from user ID hash)
- All interactive elements need hover/focus/disabled states

## FERPA — Critical Constraints
- Display **first names only** for matched students — never full names, emails, or IDs
- Display **concept labels only** — never numeric mastery scores or percentages
- The complementarity score (0-1) is a **match quality** score, not a student's personal score — it is safe to display
- Never show: individual grades, GPA, session counts, assessment results, or any PII beyond first name

## Key Constraints
- No new npm dependencies
- Tailwind v4 only (no @apply, utility classes in JSX)
- lucide-react ONLY for icons
- Follow ALL constraints from CLAUDE.md
- Handle loading/empty/error states for every async operation
- Run `npx tsc --noEmit` after to verify 0 errors

## This Is the Final Sprint
Sprint M16 completes the Magic Moments initiative. After Tasks 31-32, all 7 features
(Knowledge Constellation, Learning Time Machine, Micro-Reviews, Exam Forge, Teach It Back,
Prerequisite Unpacker, Complementary Study Matching) will be fully implemented. No further
handoff prompt is needed.
