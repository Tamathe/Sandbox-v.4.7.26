# Duplication & Component Consolidation

**Frequency:** Weekly
**Time:** ~25 minutes
**Why:** AI agents in different sessions solve the same problem independently, creating 2-3 near-identical implementations that diverge over time. This combined audit finds the duplication AND inventories component clusters for consolidation.

## Prompt

```
Run a duplication audit and component inventory:

**Duplication Scan**

1. **Near-Duplicate Components** — find React components that render nearly identical UI
   or serve the same purpose (e.g., two different "empty state" components, multiple card
   layouts with slight variations). Compare their props and markup.
2. **Duplicate Utility Functions** — find functions across lib/, utils/, helpers/ that do
   the same thing with different names or slightly different signatures (e.g., formatDate
   vs formatDateString vs dateToString).
3. **Duplicate API Patterns** — find API route handlers that follow identical patterns
   (same auth check, same Prisma query shape, same error handling) that could share a
   common helper.
4. **Duplicate Type Definitions** — find types/interfaces that describe the same shape
   under different names, especially across different feature directories.
5. **Copy-Paste Blocks** — find blocks of 10+ lines that appear nearly identically in
   multiple files.

**Component Inventory**

6. **Same-Purpose Clusters** — scan app/components/ for components that do the same thing
   under different names (e.g., Modal vs Dialog, Card vs Panel, Button variants). For each:
   - List the files and their line counts
   - Identify which version is most complete / best implemented
   - Show where each is imported (which pages/components use it)
7. **Single-Use Candidates** — flag components only used once (candidate for inlining).
8. **Wrapper Bloat** — multiple wrapper components around the same base (e.g., 3 different
   "card" wrappers). Components with nearly identical props but different names.
9. **Feature Folder Duplication** — utility components duplicated across feature folders
   instead of living in shared components.

For each finding:
- Show the duplicate locations side-by-side
- Recommend: Consolidate (into what?) / Inline / Keep Both (why?) / Remove One (which?)
- If consolidating, do it. If ambiguous, flag for my review.
```
