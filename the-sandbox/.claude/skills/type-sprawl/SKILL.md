---
name: type-sprawl
description: Inventory TypeScript types, flag any/as any casts, find duplicate and near-duplicate type definitions, check Prisma type redundancy. Monthly.
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Type Sprawl Audit

Find all TypeScript type/interface definitions and flag sprawl, duplication, and unsafe casts.

## Checks

1. **Inline Types That Should Be Shared** — types defined inside component files used by more than one file, or representing domain concepts (User, Course, Tool, etc.).

2. **Near-Duplicate Types** — types with the same shape but different names (e.g., `ToolData` vs `ToolInfo` vs `ToolPayload`).

3. **Over-Imported Types** — types imported by 3+ files that should live in a centralized types file.

4. **`any` and `as any` Casts** — list every occurrence with `file:line`. Categorize as:
   - **Lazy** — could be properly typed
   - **Necessary** — third-party/dynamic data
   - **Dangerous** — user input or DB results

5. **Redundant with Prisma** — types that manually redefine what Prisma already generates in `app/generated/prisma`. Should import from generated client instead.

## Output

Table: `Type Name | File | Issue | Category | Recommendation`

Report only — don't move types yet. Produce inventory for review.

## Key References
- Generated Prisma types: `app/generated/prisma`
- Multi-file domain pattern: `{domain}.ts` (types/constants) + `{domain}-service.ts` (functions)
- TypeScript strict mode is enforced