---
name: duplication-and-components
description: Find near-duplicate components, utilities, API patterns, types, and copy-paste blocks. Inventory component clusters and recommend consolidation. Weekly.
allowed-tools: Read, Grep, Glob
context: fork
agent: Explore
---

# Duplication & Component Consolidation Audit

Scan for duplication and inventory component clusters for consolidation.

## Checks

### Duplication Scan

1. **Near-Duplicate Components** — React components rendering nearly identical UI or serving the same purpose (e.g., two "empty state" components, multiple card layouts). Compare props and markup.

2. **Duplicate Utility Functions** — functions across `lib/`, `utils/`, `helpers/` doing the same thing with different names (e.g., `formatDate` vs `formatDateString`).

3. **Duplicate API Patterns** — route handlers with identical auth/Prisma/error patterns that could share a helper.

4. **Duplicate Type Definitions** — types/interfaces describing the same shape under different names across feature directories.

5. **Copy-Paste Blocks** — 10+ lines appearing nearly identically in multiple files.

### Component Inventory

6. **Same-Purpose Clusters** — components in `app/components/` doing the same thing under different names (Modal vs Dialog, Card vs Panel). For each cluster:
   - File paths and line counts
   - Which version is most complete
   - Import locations (who uses each)

7. **Single-Use Candidates** — components used exactly once (inline candidate).

8. **Wrapper Bloat** — multiple wrappers around the same base, or components with nearly identical props but different names.

9. **Feature Folder Duplication** — utility components duplicated in feature folders instead of shared components.

## Output

Table: `File(s) | Issue | Category (Dupe/Cluster/Wrapper/Single-Use) | Recommendation (Consolidate to X / Inline / Keep Both / Remove)`

Consolidate clear wins. Flag ambiguous cases for review.

## Key Context
- Component suffixes: `*Card`, `*Panel`, `*Modal`, `*View`, `*Viewer` (see CLAUDE.md)
- Shared components: `PageHeader`, `TabNav`, `SegmentedControl`, `Button`, `LoadingSpinner`, `ErrorBanner`, `ModalShell`
- Don't merge components that look similar but serve genuinely different UX purposes