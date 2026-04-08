# Resume Prompt — Cross-Tool Intelligence Sprint (CTI-07 through CTI-12)

> Copy everything below the line into a new Claude Code session.

---

```
You are executing the Cross-Tool Intelligence Sprint on "The Sandbox" — an AI-powered
educational tool marketplace for the University of Kentucky.

## Sprint
Name: Cross-Tool Intelligence Sprint
Plan file: c:\AA Code\Educator marketplace\Blueprints\cross-tool-intelligence-sprint.md

## Read These First
1. c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md — all coding constraints
2. c:\AA Code\Educator marketplace\Blueprints\cross-tool-intelligence-sprint.md — full spec

## What Is Already Complete (DO NOT REBUILD)

Phases A–C (CTI-01 through CTI-06) are fully implemented. Here is what exists:

| Task | What Was Built | Key Files |
|------|---------------|-----------|
| CTI-01 | Schema: StudyPlanLog, ToolRequest, ToolRequestUpvote models + Tool.forkedFromId self-relation | prisma/schema.prisma |
| CTI-02 | `getStudentContextJSON()` + `getStudentContextForTool()` — structured student intelligence | app/lib/student-context-api.ts |
| CTI-03 | `GET /api/student-context` — returns student's own context JSON | app/api/student-context/route.ts |
| CTI-04 | `chat-service.ts` calls `getStudentContextForTool()` and injects cross-tool context into tool sessions | app/lib/chat-service.ts (line ~463) |
| CTI-05 | `study-plan-service.ts` — generates AI study plans via Sonnet, logs to StudyPlanLog | app/lib/study-plan-service.ts |
| CTI-06 | `concierge-service.ts` has `StudyPlanSummary` type, `studyPlanSummary` param on `buildSystemPrompt()`, study plan awareness section for STUDENT role | app/lib/concierge-service.ts |

**Partial work on CTI-07:** The concierge route (`app/api/concierge/route.ts`) already queries
`prisma.studyPlanLog.findFirst()` and passes `studyPlanSummary` to `buildSystemPrompt()`. However,
it does NOT yet have:
- Plan intent regex detection on the last user message
- Conditional `max_tokens` bump from 600 → 1000 on plan intent
- Fire-and-forget `logStudyPlan()` after stream when 2+ ACTION tags in response

## What You Are Building (6 remaining tasks)

Execute these in order, 2 tasks per phase. Run `npm run build` from
`c:\AA Code\Educator marketplace\the-sandbox\` after each phase. Fix any errors before proceeding.

### Phase D: Study Plan Live + Fork Visible (CTI-07 + CTI-08)

**CTI-07: Concierge Route — Plan Intent Detection**
File: `app/api/concierge/route.ts`
- Add plan intent regex on the last user message. Match keywords like:
  study plan, help me study, prepare for exam, what should I study, review plan,
  catch up, how should I prepare, make me a plan, study schedule
- If STUDENT + plan intent detected: lazy-import `getStudyPlanContext` from
  `study-plan-service.ts`, pass available tools array, build richer context
- Pass enriched `studyPlanContext` into `buildSystemPrompt()`
- If `isPlanIntent`: change `max_tokens` from 600 to 1000
- After stream completes: if response contains 2+ ACTION tags, fire-and-forget
  `logStudyPlan()` with extracted concepts and tool IDs
- Non-fatal: wrap all plan logic in try/catch, fall back to normal behavior

**CTI-08: Fork Button Promotion**
File: `app/tools/[id]/page.tsx`
- Move Fork from the overflow "More" menu (currently line ~795) to the primary action bar
- Place after the Favorite button, before the "More" menu
- Style: `border border-gray-300 rounded-xl px-2.5 py-2` (match Upvote/Favorite pattern)
- Icon: `GitFork` (already imported) + "Fork" label text
- Condition: only show if `tool.toolType !== 'EXTERNAL'`
- Remove the fork option from the overflow menu to avoid duplication

### Phase E: Fork Polish + Request Backend (CTI-09 + CTI-10)

**CTI-09: Fork Polish**
3 files to modify:
1. `app/components/ToolCard.tsx` — show `GitFork` icon + fork count (from `_count.forks`)
   in the metadata row if count > 0. Import GitFork from lucide-react.
2. `app/build/page.tsx` — show "Forked from: [name]" attribution on drafts that have
   `toolSpec.forkedFromId`. Style: small text-gray-500 line below draft title.
3. `app/api/builder/[sessionId]/publish/route.ts` — when creating the Tool record,
   copy `forkedFromId` from the BuildSession spec to the new `Tool.forkedFromId` field.

**CTI-10: Tool Request API Routes**
Create 2 new route files:
1. `app/api/tool-requests/route.ts`
   - POST: create request (validate title 5–100 chars, description 10–500 chars,
     optional category string, optional courseId). Auth: `requireRequestUser`.
     Rate limit: 3 creates per day per user.
   - GET: list requests with upvote counts, `hasUpvoted` boolean for current user,
     requester name. Sort by upvote count desc. Optional `?status=OPEN` filter,
     optional `?courseId=` filter. Paginate with `?limit=20&offset=0`.

2. `app/api/tool-requests/[id]/upvote/route.ts`
   - POST: toggle upvote (upsert/delete pattern using @@unique constraint).
     Return `{ upvoted: boolean, count: number }`. Auth: `requireRequestUser`.

Auth: `requireRequestUser` on all routes. Follow thin route pattern (auth → parse → call lib → return).

### Phase F: Request Board UI (CTI-11 + CTI-12)

**CTI-11: Request UI Components**
Create 2 new components:
1. `app/components/ToolRequestModal.tsx`
   - Modal overlay form with: title input, description textarea, category dropdown
     (use existing tool categories), optional course selector (dropdown of user's courses).
   - Submit → POST /api/tool-requests → close modal + call onCreated callback.
   - Style: fixed overlay with backdrop, white card, `rounded-2xl border-2 border-gray-200`,
     max-w-lg centered. Close on backdrop click or X button.

2. `app/components/ToolRequestCard.tsx`
   - Card showing: title, description (2-line truncate), requester name, course badge
     (if courseId), category pill, upvote button + count, "Build This →" link
     (visible to EDUCATOR/ADMIN only → navigates to `/build?prompt={encodeURIComponent(title + ': ' + description)}`).
   - Upvote button calls POST /api/tool-requests/[id]/upvote, optimistic UI update.
   - Style: `rounded-2xl border-2 border-gray-200 p-4` card pattern.

**CTI-12: Page Integration + Sandy Educator Context**
3 integration points:
1. `app/hub/page.tsx` — In the Tools tab:
   - Add "Request a Tool" button → opens ToolRequestModal
   - Add "Most Requested" collapsible section showing top 5 OPEN requests
     (fetch from GET /api/tool-requests?status=OPEN&limit=5)

2. `app/build/page.tsx` — Add "Requests" tab after existing tabs.
   - Paginated list of OPEN ToolRequestCards
   - Fetch from GET /api/tool-requests?status=OPEN&limit=20

3. `app/lib/concierge-service.ts` + `app/api/concierge/route.ts` —
   For EDUCATOR role only: query top 5 unfulfilled ToolRequests matching the
   educator's course IDs. Inject as `## COMMUNITY TOOL REQUESTS` block in
   Sandy's system prompt (< 100 tokens). Include title + upvote count for each.

## Architecture Constraints (non-negotiable)

- Prisma v7 — no `url` in datasource; connection string in `prisma.config.ts`; PrismaPg adapter
- Tailwind v4 — no `@apply`; utility classes in JSX only; `size-N` not `w-N h-N`
- Auth — `requireRequestUser()` from `app/lib/server-auth.ts` on all protected routes
- Icons — lucide-react only
- Rate limiting — `checkRateLimit()` from `app/lib/rate-limit.ts` on mutation routes
- No `window.confirm()` — inline React confirmation patterns
- No hardcoded emails/IDs — all role checks data-driven
- Build command: `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\`
- Prisma client import: `../generated/prisma` (relative to `app/lib/`)
- Route logic: thin handlers (auth → parse → call lib → return)
- UK Blue: `#0033A0`
- UI: `PLATFORM-CONSISTENCY-MANIFEST.md` (max-w-6xl, border-2 cards, rounded-2xl, font-extrabold headers)
- No gamification (XP, points, badges, leaderboards) — deleted 2026-03-19

## A/B Testing Note

The cross-tool context injection (CTI-04, already done) is gated by `User.studyGroup === 'treatment'`.
Sandy study plan orchestration is NOT A/B gated — all students get study plans.

## FERPA Compliance

- Student context API: user can only fetch own data
- All session queries filter `sensitiveSession: false`
- Tool request board: only shows requester name, no academic data
- Study plan logs: analytics-only, never exposed to other users

## Instructions

1. Read CLAUDE.md at c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md
2. Read the full blueprint at c:\AA Code\Educator marketplace\Blueprints\cross-tool-intelligence-sprint.md
3. Read each file you will modify before touching it
4. Execute Phase D (CTI-07 + CTI-08)
5. Run `npm run build` — fix any errors before proceeding
6. Execute Phase E (CTI-09 + CTI-10)
7. Run `npm run build` — fix any errors before proceeding
8. Execute Phase F (CTI-11 + CTI-12)
9. Run `npm run build` — fix any errors before proceeding
10. Report results: which tasks completed, files created/modified, any divergences from spec
11. Update the Status Tracker at the bottom of the blueprint file
12. Update SPRINT-HANDOFF.md at c:\AA Code\Educator marketplace\Blueprints\SPRINT-HANDOFF.md
```
