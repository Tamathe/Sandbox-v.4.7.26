# Deep Sweep (On-Demand Catch-All)

**Frequency:** On-demand (run when weekly/biweekly prompts have been skipped, or as final pass after cleanup sprints)
**Time:** ~45 minutes
**Note:** Do NOT run this as a standalone regular audit. Run the weekly/biweekly prompts (01, 02, 03, 04, 05, 06, 07, 20) first. This sweep catches what slipped through the cracks.

## When to Use

- You've fallen behind on weekly/biweekly maintenance and need a catch-up pass
- After completing cleanup sprints 1-4, as a final verification
- Before a major release or demo to verify overall health
- **NOT** as a replacement for the individual prompts

## Prompt

```
Run a full maintenance sweep on this codebase. For each category, SKIP if you know
it was recently audited (check maintenance-log.md). Focus on deeper issues:

1. **TypeScript Health** — `npx tsc --noEmit`. Fix all type errors.
2. **Dead Code** — unused exports, orphan files, dead routes/pages. Remove them.
3. **Duplication** — near-duplicate components, utilities, types, API patterns. Consolidate.
4. **Import Cleanup** — unused imports across the project. Remove them.
5. **Console Pollution** — stray console.log/warn/error. Remove (keep intentional ones).
6. **TODO/FIXME/HACK** — list all with file locations. Flag stale/completed ones.
7. **Dependency Check** — `npm audit` and `npx depcheck`. Fix vulnerabilities, remove unused.
8. **ENV Consistency** — compare .env.example against actual env var usage. Flag gaps.
9. **API Route Review** — auth guards, error handling, response consistency across all routes.
10. **Dead Routes/Pages** — pages not linked from anywhere.
11. **Prisma Drift** — schema vs usage, missing indexes, N+1 queries.
12. **Convention Consistency** — naming, file structure, component patterns. Flag drift.
13. **Security Scan** — look for:
    - Hardcoded secrets, API keys, or tokens
    - Unvalidated user input reaching database queries
    - Missing CSRF/XSS protections
    - Exposed internal error messages
14. **Bundle Size** — check for unnecessarily large imports (importing all of lodash,
    heavy components not lazy-loaded, etc.)
15. **Accessibility** — spot-check key pages for missing alt text, ARIA labels,
    keyboard navigation issues.

For each category: Issue | File | Status (Fixed / Needs Discussion / Skipped).
Fix anything safe and obvious. Flag anything that needs my input.
At the end, provide an overall health score (A-F) with a 3-sentence summary.
```
