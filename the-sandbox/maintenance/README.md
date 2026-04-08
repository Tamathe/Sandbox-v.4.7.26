# Maintenance Prompts

Reusable prompts for keeping the codebase healthy. Copy-paste any prompt file into a Claude session to run it.

## Why This Exists

This codebase was built primarily by AI coding agents during fast sprints. That creates specific failure modes that don't happen (or happen differently) in human-written code:

- **Duplication drift** — Different sessions solve the same problem independently, creating 2-3 near-identical implementations
- **Convention inconsistency** — Session A uses one pattern, Session B uses another. Both work, but the codebase looks like it has multiple authors (it does)
- **Orphan accumulation** — Abandoned approaches, stub files, and dead code pile up because the AI doesn't clean up previous sessions' work
- **Over-abstraction** — AI loves creating helpers, utilities, and wrapper functions for things used exactly once
- **Shallow error handling** — Generic try/catch blocks that swallow errors or return vague messages
- **Import/export bloat** — Barrel files that re-export everything, unused imports, circular dependencies
- **Copy-paste signatures** — Functions with identical or near-identical signatures that should be consolidated
- **Stale comments/docs** — AI writes comments and docstrings that describe what the code *used to do* before another session changed it

## Prompt Categories (18 prompts)

### Every Session (Quick — 5 min)
| Prompt | What It Does |
|--------|-------------|
| [01-quick-health.md](01-quick-health.md) | TypeScript check, unused imports, console.logs, build |

### Weekly
| Prompt | What It Does |
|--------|-------------|
| [02-dead-code-and-wip.md](02-dead-code-and-wip.md) | Unused exports, orphan files, dead routes, half-finished work, placeholders |
| [03-duplication-and-components.md](03-duplication-and-components.md) | Near-duplicate components/utilities + component inventory & consolidation |
| [04-api-hygiene.md](04-api-hygiene.md) | Auth guards, error handling, response consistency, shared pattern adoption |

### Biweekly
| Prompt | What It Does |
|--------|-------------|
| [05-convention-drift.md](05-convention-drift.md) | Naming, patterns, file structure consistency |
| [06-dependency-health.md](06-dependency-health.md) | Vulnerabilities, unused packages, version drift |
| [07-prisma-schema-queries.md](07-prisma-schema-queries.md) | Schema drift, missing indexes, N+1 queries, unused models |
| [20-environment-hygiene.md](20-environment-hygiene.md) | Env var inventory, .env.example sync, secret leakage, consistency |

### Monthly
| Prompt | What It Does |
|--------|-------------|
| [09-architecture-review.md](09-architecture-review.md) | Does reality match the blueprints? |
| [10-performance-audit.md](10-performance-audit.md) | Bundle size, N+1 queries, unnecessary re-renders |
| [12-route-ui-wiring.md](12-route-ui-wiring.md) | Verify all pages are reachable and layout-consistent |
| [13-type-sprawl.md](13-type-sprawl.md) | Inventory types, flag `any` casts, find duplication |
| [14-prompt-audit.md](14-prompt-audit.md) | Audit all AI system prompts for staleness and conflicts |
| [16-styling-consistency.md](16-styling-consistency.md) | Tailwind violations, hardcoded colors, spacing drift |
| [17-error-ux.md](17-error-ux.md) | Raw error leaks, silent swallowing, missing boundaries |
| [19-security-deep-dive.md](19-security-deep-dive.md) | Auth bypass, injection, JWT, CORS, rate limiting, secret exposure |
| [21-data-integrity-audit.md](21-data-integrity-audit.md) | Seed freshness, demo accounts, referential integrity, data growth |
| [22-accessibility-audit.md](22-accessibility-audit.md) | WCAG 2.1 AA: keyboard nav, ARIA, alt text, contrast, forms, semantics |

### On-Demand (catch-all)
| Prompt | What It Does |
|--------|-------------|
| [08-deep-sweep.md](08-deep-sweep.md) | Full 15-category audit — use when behind on maintenance or as final sprint pass |

---

## Full Cleanup Sprint Guide

For a comprehensive codebase cleanup, see **[CLEANUP-SPRINTS.md](CLEANUP-SPRINTS.md)** — a 5-sprint plan that runs all 18 prompts in dependency order across multiple sessions.
