# Admin & Registrar — Claude Code Reference

> **Claude Code reference doc** extracted from `CLAUDE.md` for focused context loading.
> Covers: Registrar Command Center, Admin Command Center.

---

## Registrar Command Center (7 Features)

### Architecture

- Architecture doc: `ARCHITECTURE-REGISTRAR-COMMAND-CENTER.md`

### Features

1. **Graduation Clearance Pipeline** — 6-stage Kanban
2. **Enrollment Command Center**
3. **Student 360 Drawer**
4. **Sandy Triage Intelligence**
5. **Compliance Calendar** — 14 deadlines
6. **Academic Standing Processor**
7. **Holds Management Dashboard**

### Sub-routes

- `/registrar/{academic-standing,analytics,articulation,compliance,degree-audit,holds,petitions,programs,reports}`

---

## Admin Command Center (5/5 Phases)

### Components

8 in `app/components/admin-home/`:

| File | Purpose |
|------|---------|
| `useAdminHome.ts` | Data hook |
| `AdminHomePage.tsx` | Page shell |
| `AdminBriefingLayout.tsx` | Briefing layout |
| `AdminKPIStrip.tsx` | KPI strip |
| `ActionPriorityQueue.tsx` | Action priority queue |
| `PlatformPulseCards.tsx` | Platform pulse cards |
| `ComplianceRadar.tsx` | Compliance radar |
| `AdminQuickLinks.tsx` | Quick links |

### Routing

- `app/page.tsx` uses `next/dynamic`

### Data

- All synthetic client-side data, no API routes
