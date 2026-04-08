# Data Integrity & Seed Freshness Audit

**Frequency:** Monthly
**Time:** ~30 minutes
**Prerequisite:** Run #07 Prisma & Data first to catch schema drift.

## Prompt

```
Audit seed scripts, demo data integrity, and data layer correctness:

1. **Seed Script Health** — for every seed script in scripts/ and prisma/seed*:
   - Does it run without errors against a fresh database? (read the code, check
     for model/field references that may have been renamed or removed in migrations)
   - Does it use upsert or createMany correctly? (idempotent re-runs shouldn't
     duplicate data)
   - Flag any seed that references hardcoded IDs that might conflict
   - Check seed execution order — do scripts with foreign key dependencies run
     after their parent data is seeded?

2. **Demo Account Integrity** — verify all 4 demo users:
   - heath.price@uky.edu (ADMIN), katie.thompson@uky.edu (EDUCATOR),
     tiana.the.student@uky.edu (STUDENT), morgan.rivera@uky.edu (STAFF)
   - Each has the correct role assignment
   - Each has enough related data (courses, enrollments, messages, etc.) to
     demonstrate their role's features
   - No demo user has orphaned references to deleted models or features

3. **Referential Integrity** — check the schema for:
   - Relations without onDelete/onUpdate cascade rules (what happens when a
     parent record is deleted?)
   - Optional relations that should be required (or vice versa)
   - Models that can accumulate orphan records over time (e.g., messages for
     deleted conversations, enrollments for deleted courses)
   - Flag any model that lacks a cleanup strategy for its dependents

4. **Stale Reference Data** — check seeded reference data:
   - Policy documents (seed-policies.ts) — are URLs still valid? Is content
     current?
   - UKNow articles (seed-uknow) — check for placeholder/lorem text
   - Academic advisor docs, committee data, communication templates — flag
     anything obviously outdated or placeholder

5. **Migration Chain** — verify the migration history:
   - Run `npx prisma validate` to confirm schema/migration sync
   - Check for migration files that were manually edited after creation
   - Flag any migration that does destructive operations (DROP COLUMN, DROP TABLE)
     without a corresponding data migration
   - Verify migration names are descriptive (not just timestamps)

6. **Data Growth Concerns** — flag tables that will grow unbounded:
   - Chat messages, session logs, AI interaction history, audit logs
   - Check if any of these have retention/archival strategies
   - Flag tables missing created_at/updated_at timestamps
   - Estimate: at 70K users, which tables will hit millions of rows first?

Output a table: Area | Finding | File(s) | Severity (High/Medium/Low) | Status (Fixed/Needs Review).
Fix seed script bugs where safe. Flag schema changes and data growth concerns for my review.
```
