---
name: data-integrity
description: Audit seed scripts, demo account integrity, referential integrity, stale reference data, migration chain, data growth concerns. Monthly.
allowed-tools: Read, Grep, Glob, Bash(npx prisma *, npm run *)
context: fork
agent: Explore
effort: high
---

# Data Integrity & Seed Freshness Audit

Prerequisite: Run `/prisma-audit` first to catch schema drift.

## Checks

1. **Seed Script Health** — for every seed script in `scripts/` and `prisma/seed*`:
   - References to renamed/removed models or fields
   - Idempotent re-runs (upsert/createMany, no duplicate data)
   - Hardcoded ID conflicts
   - Foreign key dependency ordering

2. **Demo Account Integrity** — verify all 4 demo users:
   - `heath.price@uky.edu` (ADMIN), `katie.thompson@uky.edu` (EDUCATOR), `tiana.the.student@uky.edu` (STUDENT), `morgan.rivera@uky.edu` (STAFF)
   - Correct role assignments
   - Enough related data to demo each role's features
   - No orphaned references to deleted models

3. **Referential Integrity**:
   - Relations without `onDelete`/`onUpdate` cascade rules
   - Optional relations that should be required (or vice versa)
   - Models accumulating orphan records (messages for deleted conversations, enrollments for deleted courses)
   - Missing cleanup strategies for dependents

4. **Stale Reference Data**:
   - Policy document URLs still valid
   - UKNow articles — no placeholder/lorem text
   - Academic advisor docs, committee data, communication templates — flag outdated or placeholder content

5. **Migration Chain**:
   - `npx prisma validate` confirms sync
   - No manually edited migration files
   - Destructive ops (DROP COLUMN/TABLE) have data migration
   - Descriptive migration names

6. **Data Growth Concerns** — at 70K users:
   - Tables growing unbounded (chat messages, session logs, AI interactions, audit logs)
   - Retention/archival strategies
   - Tables missing `created_at`/`updated_at` timestamps
   - Which tables hit millions of rows first

## Output

Table: `Area | Finding | File(s) | Severity (High/Medium/Low) | Status (Fixed/Needs Review)`

Fix seed script bugs where safe. Flag schema changes and growth concerns for review.