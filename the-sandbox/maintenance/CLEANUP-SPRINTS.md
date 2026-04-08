# Full Codebase Cleanup — Sprint Guide

A structured approach to cleaning up a large, multi-agent codebase. Run these sprints in order — each builds on the previous one.

---

## Prerequisites

Before starting, commit or stash any in-progress work. Each sprint should start from a clean git state so you can review and revert changes per-sprint if needed.

---

## Sprint 1 — Clean Slate
**Goal:** Get to a green build, remove dead weight, inventory what's left.
**Time:** ~1 hour
**Prompts:** 01, 02, 13

| Step | Prompt | What It Does | Why First |
|------|--------|-------------|-----------|
| 1 | [01-quick-health](01-quick-health.md) | Fix tsc errors, unused imports, console.logs, build | Can't audit code that doesn't compile |
| 2 | [02-dead-code-and-wip](02-dead-code-and-wip.md) | Remove unused exports, orphan files, dead routes, half-finished work, stale placeholders | Don't waste time auditing dead code |
| 3 | [13-type-sprawl](13-type-sprawl.md) | Inventory all type definitions, flag `any` casts, find duplication | Types are the skeleton — understand the shape before restructuring |

**Commit checkpoint:** `chore: cleanup sprint 1 — clean slate`

---

## Sprint 2 — Consolidate
**Goal:** Merge duplicates, enforce shared patterns, align conventions.
**Time:** ~1 hour
**Prompts:** 03, 05

| Step | Prompt | What It Does | Why Now |
|------|--------|-------------|---------|
| 1 | [03-duplication-and-components](03-duplication-and-components.md) | Find near-duplicate components, utilities, API patterns + inventory component clusters | Consolidate before standardizing |
| 2 | [05-convention-drift](05-convention-drift.md) | Align naming, file structure, component patterns | Now that code is consolidated, standardize it |

**Commit checkpoint:** `chore: cleanup sprint 2 — consolidation`

---

## Sprint 3 — Harden
**Goal:** Fix error handling, secure API routes, audit security, clean up styling and prompts.
**Time:** ~2 hours
**Prompts:** 04, 19, 20, 17, 14, 16

| Step | Prompt | What It Does | Why Now |
|------|--------|-------------|---------|
| 1 | [04-api-hygiene](04-api-hygiene.md) | Verify auth guards, error handling, response consistency, shared pattern adoption | Security and reliability first |
| 2 | [19-security-deep-dive](19-security-deep-dive.md) | Auth bypass, injection, JWT, CORS, rate limiting, secret exposure | Deep adversarial check after surface hygiene |
| 3 | [20-environment-hygiene](20-environment-hygiene.md) | Env var inventory, .env.example sync, secret leakage, consistency | Config security before UX pass |
| 4 | [17-error-ux](17-error-ux.md) | Fix raw error leaks, silent swallowing, missing error boundaries | User-facing quality |
| 5 | [14-prompt-audit](14-prompt-audit.md) | Audit all AI system prompts for staleness, duplication, conflicts | Prompts reference code — now that code is clean, fix the prompts |
| 6 | [16-styling-consistency](16-styling-consistency.md) | Fix Tailwind violations, hardcoded colors, spacing drift | Visual polish pass |

**Commit checkpoint:** `chore: cleanup sprint 3 — hardening`

---

## Sprint 4 — Infrastructure
**Goal:** Dependencies, database, data integrity, performance, accessibility.
**Time:** ~1.5 hours
**Prompts:** 06, 07, 21, 10, 12, 22

| Step | Prompt | What It Does | Why Now |
|------|--------|-------------|---------|
| 1 | [06-dependency-health](06-dependency-health.md) | npm audit, remove unused packages, check versions | Dependencies are stable now that dead code is gone |
| 2 | [07-prisma-schema-queries](07-prisma-schema-queries.md) | Schema drift, missing indexes, N+1 queries, unused models | Data layer health |
| 3 | [21-data-integrity-audit](21-data-integrity-audit.md) | Seed freshness, demo accounts, referential integrity, data growth | Data correctness after schema check |
| 4 | [10-performance-audit](10-performance-audit.md) | Bundle size, lazy loading, unnecessary re-renders | Optimize what survived cleanup |
| 5 | [12-route-ui-wiring](12-route-ui-wiring.md) | Verify all pages are reachable, layout-consistent, not orphaned | Final wiring check |
| 6 | [22-accessibility-audit](22-accessibility-audit.md) | WCAG 2.1 AA: keyboard nav, ARIA, alt text, contrast, forms, semantics | Compliance and usability |

**Commit checkpoint:** `chore: cleanup sprint 4 — infrastructure`

---

## Sprint 5 — Final Pass
**Goal:** Catch anything the targeted sprints missed.
**Time:** ~45 minutes
**Prompts:** 08, 09

| Step | Prompt | What It Does | Why Last |
|------|--------|-------------|----------|
| 1 | [08-deep-sweep](08-deep-sweep.md) | Full 15-category audit — the catch-all | Runs fast now that most issues are already fixed |
| 2 | [09-architecture-review](09-architecture-review.md) | Does the codebase match the blueprints? | Strategic check after tactical cleanup |

**Commit checkpoint:** `chore: cleanup sprint 5 — final pass`

---

## Tips

- **One sprint per session.** Context windows and attention degrade over long sessions. Fresh eyes on each sprint.
- **Commit after each sprint.** Makes it easy to review changes and revert if something breaks.
- **Don't skip Sprint 1.** Everything else assumes dead code is already gone.
- **Sprint 2 creates the most merge conflicts.** If others are working on the codebase, coordinate timing.
- **Read the prompt output before approving fixes.** AI cleanup can be overzealous — review consolidation recommendations before merging.
- **Run the build after each sprint.** `npm run lint && npx tsc --noEmit && npm run build` — don't let fixes introduce new breaks.
