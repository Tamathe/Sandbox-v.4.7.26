---
name: deep-sweep
description: Full 15-category on-demand codebase audit. Use when behind on maintenance or as final pass after cleanup sprints. Not a regular scheduled audit.
allowed-tools: Read, Grep, Glob, Bash(npx *, npm *)
context: fork
agent: Explore
effort: high
---

# Deep Sweep — On-Demand Catch-All Audit

**When to use:** Run when weekly/biweekly prompts have been skipped, OR as Sprint 5 final pass after cleanup sprints 1-4. Do NOT run this as a standalone regular audit — use the individual prompts instead.

Run `/health`, `/dead-code`, `/api-hygiene`, `/convention-drift` first when possible. This sweep catches what slipped through.

## 15 Categories

For each category, SKIP if recently audited (check `maintenance-log.md`):

1. **TypeScript Health** — `npx tsc --noEmit`. Fix all type errors.
2. **Dead Code** — unused exports, orphan files, dead routes/pages. Remove them.
3. **Duplication** — near-duplicate components, utilities, types, API patterns. Consolidate.
4. **Import Cleanup** — unused imports across the project. Remove them.
5. **Console Pollution** — stray console.log/warn/error. Remove (keep intentional).
6. **TODO/FIXME/HACK** — list all with file locations. Flag stale/completed ones.
7. **Dependency Check** — `npm audit` and `npx depcheck`. Fix vulnerabilities, remove unused.
8. **ENV Consistency** — compare `.env.example` against actual `process.env` usage. Flag gaps.
9. **API Route Review** — auth guards, error handling, response consistency across all routes.
10. **Dead Routes/Pages** — pages not linked from anywhere.
11. **Prisma Drift** — schema vs actual usage, missing indexes, N+1 queries.
12. **Convention Consistency** — naming, file structure, component patterns. Flag drift.
13. **Security Scan** — hardcoded secrets, unvalidated input reaching DB, missing CSRF/XSS protections, exposed internal error messages.
14. **Bundle Size** — unnecessarily large imports, heavy components not lazy-loaded.
15. **Accessibility** — spot-check key pages for missing alt text, ARIA labels, keyboard nav.

## Output

For each category: `Issue | File | Status (Fixed / Needs Discussion / Skipped)`

Fix anything safe and obvious. Flag anything that needs input.

**End with an overall health score (A-F) and 3-sentence summary.**

## Key References
- Route pattern: `withErrorHandling` + `parseRequestBody` (see CLAUDE.md)
- Auth guards: `app/lib/server-auth.ts`
- Shared components: `Button`, `LoadingSpinner`, `ErrorBanner`, `ModalShell`, `PageHeader`
- DO NOT REBUILD: gamification, easter eggs, duplicate chat system
