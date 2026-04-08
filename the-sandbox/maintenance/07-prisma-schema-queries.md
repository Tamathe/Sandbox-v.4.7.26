# Prisma Schema & Query Audit

**Frequency:** Biweekly
**Time:** ~15 minutes

## Prompt

```
Audit the Prisma schema and data layer:

1. **Schema vs Usage** — compare every model and field in schema.prisma against actual
   usage in the codebase. Flag:
   - Models never queried or written to
   - Fields never read or written (might be from an abandoned feature)
   - Relations defined but never included/joined

2. **Missing Indexes** — look at WHERE clauses and ORDER BY in Prisma queries.
   Flag any frequently-filtered fields that lack an @@index in the schema.

3. **N+1 Queries** — find loops that execute Prisma queries inside them
   (the classic N+1). Recommend includes or batch queries.

4. **Select Efficiency** — find queries that fetch entire records when only 1-2 fields
   are needed. Recommend adding `select` clauses.

5. **Raw SQL** — find any $queryRaw or $executeRaw usage. Verify it's parameterized
   (not string-concatenated) to prevent SQL injection.

6. **Migration Health** — check that prisma/migrations/ is in sync with schema.prisma.
   Run `npx prisma validate`.

Output a table: Location | Issue | Severity | Recommendation.
Fix N+1s and missing selects where safe. Flag schema changes for my review.
```
