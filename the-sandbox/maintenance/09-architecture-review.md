# Architecture Review

**Frequency:** Monthly
**Time:** ~30 minutes
**Why this matters:** AI agents build what you ask for in each session but don't maintain a holistic view of the architecture across sessions. Pieces drift apart.

## Prompt

```
Review the overall architecture of this codebase. Read CLAUDE.md first for context.

1. **Blueprint vs Reality** — compare any architecture docs or Blueprints/ against
   what's actually implemented. For each planned feature, classify as:
   Implemented / Partially Implemented / Not Started / Diverged From Plan

2. **Circular Dependencies** — trace the import graph and find any circular dependencies
   between modules/features. These often emerge when different AI sessions wire things
   up independently.

3. **Abstraction Assessment** — find:
   - Over-abstracted: wrapper functions/components that add no value (just pass through)
   - Under-abstracted: copy-pasted logic that should be shared
   - Wrong-level abstractions: business logic in components, UI logic in API routes

4. **Feature Boundaries** — are features properly isolated? Look for:
   - Feature A directly importing Feature B's internal files (not public API)
   - Shared state that couples unrelated features
   - God components/files that touch too many concerns

5. **Data Flow Clarity** — trace the main data flows (auth, course data, AI interactions).
   Flag anywhere the flow is unnecessarily complex, passes through too many layers,
   or is hard to follow.

6. **Scaling Concerns** — with 70K potential users, flag:
   - Unbounded queries (no pagination/limits)
   - Missing caching on expensive operations
   - Client-side operations that should be server-side

Don't fix anything. Produce a report with priority rankings (P0/P1/P2) so I can
decide what to address first.
```
