# Sprint Handoff — Interrupt Recovery Document

> **Purpose:** If a build session is interrupted mid-execution, paste the "Resume Prompt" at the bottom of this document into a new Claude Code session. Update this file after every 2 completed tasks.
>
> **Maintained by:** Update the fields below as tasks are completed. Never let this file fall more than 2 tasks behind reality.

---

## Active Sprint

**No active sprint.** Last completed sprint was Cross-Tool Intelligence (Phases A–F, CTI-01 through CTI-12), finished 2026-03-22.

Previous: Syllabus Architect Enhancement (Phases A–D), finished 2026-03-22. Blueprint archived to `Blueprints/archive/SYLLABUS-ARCHITECT-ENHANCEMENT.md`.

**Candidate next sprints:**
- `Blueprints/zen-ux-overhaul.md` — Zen UX Overhaul (22 tasks, 9 phases) — needs re-evaluation against completed UX audits

---

## Architecture Constraints (never violate)

Copy these into any resume prompt verbatim — they are standing rules.

- **Prisma v7** — no `url` in datasource block; connection string lives in `prisma.config.ts`; runtime client must use `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- **Tailwind v4** — no `@apply`; utility classes in JSX only
- **Auth** — all protected routes must call `requireRequestUser()` from `app/lib/server-auth.ts`
- **Icons** — lucide-react only; no heroicons, no react-icons
- **Rate limiting** — `checkRateLimit()` from `app/lib/rate-limit.ts` on every mutation route
- **No `window.confirm()`** — use inline React confirmation patterns
- **No hardcoded emails or user IDs** — all role checks must be data-driven
- **Build command** — `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\`
- **Generated Prisma client** — import from `../generated/prisma` (relative to `app/lib/`)
- **UK Blue** — `#0033A0` as primary brand color throughout
- **Route logic** — routes must be thin (auth → parse → call lib → return); no business logic in route files
- **UI standard** — all pages must conform to `PLATFORM-CONSISTENCY-MANIFEST.md` (max-w-6xl, border-2 cards, rounded-2xl, Pattern A/B headers, font-extrabold h2)

---

## Resume Prompt Template

> Copy everything inside the fence and paste it into a new Claude Code session.
> Fill in the bracketed fields before pasting.

```
You are resuming an active implementation sprint on "The Sandbox" — an AI-powered
educational tool marketplace for the University of Kentucky.

## Sprint
Name: [Sprint Name]
Plan file: c:\AA Code\Educator marketplace\Blueprints\[blueprint-file.md]

## Completed so far
[Copy the ✅ rows from the Task Tracker, with file paths and migration status]

## What to do next
- Task [N]: [Task name] — [one-line goal]
- Task [N+1]: [Task name] — [one-line goal]
(After these two, stop and ask for review before continuing.)

## Files modified this sprint (read these before touching anything)
[List modified files]

## Pending migrations (run these if not yet applied)
[List any pending migrations]

## Decisions already made (respect these)
[List decisions]

## Open issues to be aware of
[List any blockers]

## Architecture constraints (non-negotiable)
- Prisma v7 — no url in datasource; use prisma.config.ts; PrismaPg adapter at runtime
- Tailwind v4 — no @apply; utility classes in JSX only
- Auth — requireRequestUser() from app/lib/server-auth.ts on all protected routes
- Icons — lucide-react only
- Rate limiting — checkRateLimit() on all mutation routes
- No window.confirm() — inline React confirmation patterns only
- No hardcoded emails/IDs
- Build command: npm run build from c:\AA Code\Educator marketplace\the-sandbox\
- Prisma client import: ../generated/prisma (relative to app/lib/)
- UK Blue: #0033A0
- UI standard: PLATFORM-CONSISTENCY-MANIFEST.md (max-w-6xl, border-2, rounded-2xl, Pattern A/B headers)

## Instructions
1. Read CLAUDE.md at c:\AA Code\Educator marketplace\the-sandbox\CLAUDE.md
2. Read each file listed in "Files modified this sprint" to get current state
3. Read the blueprint plan to understand the full task list
4. Execute Task [N] only
5. Run npm run build — fix any errors before proceeding
6. Execute Task [N+1]
7. Run npm run build again
8. Stop, report results, and update SPRINT-HANDOFF.md at
   c:\AA Code\Educator marketplace\Blueprints\SPRINT-HANDOFF.md
9. Output the updated Resume Prompt for the next handoff
```

---

## How to Keep This Document Current

After every 2 completed tasks, Claude should:

1. Mark completed tasks ✅ in the Task Tracker
2. Add all modified files to the Files Modified table
3. Clear any migrations that have been applied
4. Add any decisions made to the Decisions Made list
5. Note any new blockers
6. Update the Build Status field
7. Refresh the Resume Prompt with current task numbers and file lists

> This document is the source of truth for sprint state. If it's out of date, the handoff fails.
