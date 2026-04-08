Audit TypeScript types following `maintenance/13-type-sprawl.md`. Check:
1. Duplicate type definitions (same shape, different names)
2. Types that should be in canonical locations (app/lib/types.ts, domain-specific types.ts)
3. Inline type literals that appear 3+ times (should be extracted)
4. `any` types that could be properly typed

Report findings grouped by severity. Fix duplicates by consolidating to canonical exports.