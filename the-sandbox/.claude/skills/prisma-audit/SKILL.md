---
name: prisma-audit
description: Audit Prisma schema vs usage, missing indexes, N+1 queries, select efficiency, raw SQL safety, migration health. Biweekly.
allowed-tools: Read, Grep, Glob, Bash(npx prisma *, npm run *)
context: fork
agent: Explore
---

# Prisma Schema & Query Audit

Audit the Prisma schema and data layer for drift, inefficiency, and safety issues.

## Checks

1. **Schema vs Usage** — compare every model and field in `schema.prisma` against actual usage:
   - Models never queried or written to
   - Fields never read or written (abandoned feature remnants)
   - Relations defined but never included/joined

2. **Missing Indexes** — look at WHERE clauses and ORDER BY in Prisma queries. Flag frequently-filtered fields lacking `@@index`.

3. **N+1 Queries** — find loops executing Prisma queries inside them. Recommend `include` or batch queries.

4. **Select Efficiency** — find queries fetching entire records when only 1-2 fields needed. Recommend `select` clauses.

5. **Raw SQL** — find `$queryRaw`/`$executeRaw` usage. Verify parameterized (not string-concatenated).

6. **Migration Health** — run `npx prisma validate`. Check migration chain integrity.

## Output

Table: `Location | Issue | Severity (High/Medium/Low) | Recommendation`

Fix N+1s and missing selects where safe. Flag schema changes for review.

## Key References
- Prisma client: `app/lib/prisma.ts` (singleton, PrismaPg adapter)
- Generated client: `app/generated/prisma`
- Raw SQL pool: `app/lib/pg-pool.ts`
- Schema: `prisma/schema.prisma` (~399 models, ~110 enums)
- DO NOT REBUILD: gamification models were intentionally deleted