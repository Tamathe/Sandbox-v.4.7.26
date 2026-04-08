# Student First-Run Experience — Fast-Follows Design Spec

**Date:** 2026-04-04
**Status:** Draft
**Depends on:** `2026-04-03-student-first-run-experience-design.md` (fully implemented)
**Scope:** Context-aware beacon CTAs, collapsible non-academic sections

## Problem

The first-run experience shipped Focus View, Sandy intro, and MetricExplainer. Two UX gaps remain:

1. **Beacon CTAs are generic.** The beacon says "You have an overdue assignment" but the CTA is always "Start Studying" — even when the student needs to "View Assignment" or "Submit Draft." The action doesn't match the context.
2. **Non-academic sections take equal weight.** Campus Life, Dining, and UKNow get full-height cards identical to courses and study tools. For returning students in Full Dashboard mode, these crowd the academic signal.

## Solution

### Part 1: Context-Aware Beacon CTAs

**File:** `app/components/student-home/BeaconCard.tsx`

Replace the single "Start Studying" CTA with context-matched actions based on `BeaconItem` data:

| Beacon Type | Condition | CTA Label | Action |
|---|---|---|---|
| assignment-overdue | Has submission URL | "Submit Now" | Link to assignment |
| assignment-overdue | No submission URL | "View Assignment" | Link to course page |
| assignment-due-today | Has submission URL | "Submit Now" | Link to assignment |
| assignment-due-today | No submission URL | "Start Working" | Sandy prefill: "Help me with {assignment}" |
| exam-upcoming | Within 24h | "Last-Minute Review" | Sandy prefill: "Quick review for {courseCode} exam" |
| exam-upcoming | 24-72h out | "Start Studying" | Navigate to /study with course pre-selected |
| low-studied | Studied % < 20% | "Catch Up" | Sandy prefill: "Quiz me on {courseCode}" |
| low-studied | Studied % 20-40% | "Keep Going" | Navigate to /study with course pre-selected |
| all-clear | — | "Explore Something New" | Navigate to /hub |
| morning-briefing | — | "See Full Briefing" | Scroll to briefing strip |

**Data requirement:** Extend `BeaconItem` type with optional `assignmentUrl?: string` and `assignmentId?: string` fields. `computeBeacon()` in `student-home-data.ts` populates these from the stakes data when available.

**Sandy prefill mechanism:** Dispatch `window.dispatchEvent(new CustomEvent('sandy-prefill', { detail: { message, autoSend: true } }))` — already wired from the Smart Study CTA on beacon.

### Part 2: Collapsible Non-Academic Sections

**File:** `app/components/student-home/StudentHomepage.tsx`

In Full Dashboard mode only, group 3 sections (Campus Life, Dining, UKNow) into a single collapsible "Campus & News" summary row:

**Collapsed state (default for returning users):**
```
Campus & News  ·  2 events today  ·  Dining: 3 open  ·  1 new article  ▸
```
A single line with inline summary counts. Click anywhere to expand.

**Expanded state:**
Shows the 3 sections as they appear today, with a "Collapse ▾" link.

**Persistence:** `localStorage` key `uky-campus-collapsed` (boolean). Not DB-backed — this is a minor layout preference, not worth a schema field.

**Implementation:**
- New component: `app/components/student-home/CampusSummaryRow.tsx`
- Receives: `campusLifeItems`, `diningStatus`, `uknowCount` as props
- Renders the collapsed summary line with computed counts
- StudentHomepage replaces the 3 individual section renders with `<CampusSummaryRow>` when `homepageView === 'full'`
- In Focus View, these sections are already hidden — no change needed

**Summary count computation:**
- Events: count of `simData.campusLife` items with dates matching today
- Dining: count from `simData.dining` where `isOpen === true`
- Articles: `simData.uknowCount` (already in bundle, or use `uknowEvents.length`)

---

## Files Touched

| File | Change |
|---|---|
| `app/components/student-home/BeaconCard.tsx` | Context-aware CTA rendering based on beacon type + data |
| `app/lib/student-home-data.ts` | Extend `BeaconItem` type, populate `assignmentUrl`/`assignmentId` in `computeBeacon()` |
| `app/components/student-home/StudentHomepage.tsx` | Replace campus/dining/uknow sections with `CampusSummaryRow` in full mode |
| `app/components/student-home/CampusSummaryRow.tsx` | New file — collapsible summary row |

## Success Criteria

1. Beacon CTA label and action match the specific context (overdue → "Submit Now", exam → "Start Studying", etc.)
2. Sandy prefill fires correctly for study-oriented beacon types
3. Campus & News row shows accurate inline counts
4. Collapse/expand persists across page navigations within the same session
5. Focus View is unaffected — no regressions

## Non-Goals

- No changes to beacon types or urgency logic
- No new API routes
- No schema changes
- No changes to individual section components (CampusLife, DiningWidget, etc.)
