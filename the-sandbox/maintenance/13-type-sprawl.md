# Type Sprawl Cleanup

**Frequency:** Monthly
**Time:** ~15 minutes
**Why:** AI agents define types inline wherever they need them, creating duplicate and near-duplicate type definitions scattered across the codebase.

## Prompt

```
Find all TypeScript type and interface definitions across the codebase. Flag:

1. **Inline types that should be shared** — Types defined inside component files that are
   used by more than one file, or that represent domain concepts (User, Course, Tool, etc.)
2. **Near-duplicate types** — Types with the same shape but different names
   (e.g., ToolData vs ToolInfo vs ToolPayload)
3. **Over-imported types** — Types imported by 3+ files that should live in a
   centralized types file (app/types/ or similar)
4. **`any` and `as any` casts** — List every occurrence with file:line.
   Categorize as: Lazy (could be typed), Necessary (third-party/dynamic), or Dangerous (user input)
5. **Redundant with Prisma** — Types that manually redefine what Prisma already generates
   (should import from generated client instead)

Output a table: Type Name | File | Issue | Recommendation

Don't move anything yet — just produce the inventory for my review.
```
