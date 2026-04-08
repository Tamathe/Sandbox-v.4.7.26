# Student Home Page Redesign
### The Sandbox — Blueprint
**Status:** Ready to implement
**Date:** 2026-03-18

---

## Problem Statement

The current student home page is ordered by historical convention, not by what students actually need. The most actionable content (My Courses with objective mastery) is buried in position 4. The least actionable content (Recent Sessions history log, Profile card) occupies positions 2–3. ActionItems — the highest-intelligence widget on the page — sits at the very bottom of the right column where almost no one sees it.

Students operate on two psychological drivers:
- **Deadline anxiety** — "What's due and when?"
- **Progress validation** — "Am I improving or falling behind?"

The current page partially serves deadline anxiety (Coming Up widget exists and is good) but almost completely ignores progress validation. There's no momentum signal, no score trend, no explicit call-out of what they're struggling with.

---

## What's Staying (and Why)

| Widget | Location | Verdict |
|--------|----------|---------|
| Greeting | Left col, top | Keep — orienting, cheap |
| Jump Back In | Left col, #1 | Keep — fastest return path |
| My Courses mastery cards | Left col | Keep — move up to #2 |
| Coming Up deadlines | Right col | Keep exactly where it is |
| Due-date tool suggestion | Right col | Keep — smart contextual nudge |
| Quick Access links | Right col | Keep — shrink visually |

---

## What's Being Cut or Replaced

### 1. Profile Card → Learning Snapshot strip
**Current:** Large card showing avatar, name, role badge, year/major, dept/college, "Latest focus."
**Problem:** Students know who they are. It's decorative. "Latest focus" is derived from the last session topic — not meaningful enough to justify a full card.
**Replacement:** Inline identity line in the greeting (`Good morning, Ian · 1L · Juris Doctor`) plus a compact **Learning Snapshot** strip showing streak, sessions this week, and score trend. Three numbers, no card chrome.

### 2. Recent Sessions feed → "Where to Focus" section
**Current:** List of last 8 sessions — tool name, topic, date, score.
**Problem:** Students already know what they just did. A history log adds no information. It answers "what did I do?" when the real question is "what should I do next?"
**Replacement:** **"Where to Focus"** — surfaces the specific struggling objectives (the yellow bar items from the mastery chart) by name, with a "find a tool" CTA. Example: *"Hearsay Exceptions (FRE 803) · Needs work · 2 attempts · Find a tool →"*
This turns passive mastery bar data into an explicit to-do list.

### 3. "Suggested For You" position → demoted
**Current:** Position 2 in the left column, before My Courses and before the profile card.
**Problem:** Discovery content occupying prime real estate above mission-critical content. A student with an exam in 3 days doesn't need tool recommendations first.
**Change:** Move to bottom of left column, below My Courses and Where to Focus. Still visible, but subordinate to what matters.

### 4. ActionItems position → promoted to top of right column
**Current:** Bottom of right column, below Quick Access and Coming Up — almost certainly below the fold on most screens.
**Problem:** This is the most intelligent widget on the page (AI-recommended next steps) and almost nobody sees it.
**Change:** Move to top of right column, above Coming Up. It earns that slot.

---

## New Layout

### Left Column
```
Greeting (with inline identity: "Good morning, Ian · 1L · Juris Doctor")
└── Learning Snapshot strip  [NEW]
    streak / sessions this week / avg score with trend arrow

Jump Back In  [KEEP — position unchanged]
└── Up to 4 saved library tools

My Courses  [MOVED UP from position 4]
└── Per-course mastery card (mastered / needs work / not started bar)
└── Next objective line

Where to Focus  [NEW — replaces Recent Sessions]
└── Struggling objectives surfaced by name across all courses
└── "Find a tool →" CTA on each

Suggested For You  [DEMOTED from position 2 to bottom]
└── 3 unseen tool cards
```

### Right Column
```
Action Items  [PROMOTED — was at bottom, now at top]
└── AI-recommended next steps

Coming Up  [KEEP — position unchanged]
└── Upcoming assignment/exam deadlines with urgency highlighting

Due-date tool suggestion  [KEEP]
└── Contextual nudge when urgent essay or exam is within 3 days

Quick Access  [KEEP — visual weight reduced]
└── Courses, Tools, Services, Community, Build, My Progress
```

---

## New Components / Data

### Learning Snapshot Strip
A single horizontal row of 3 stat pills, placed directly under the greeting line.

| Stat | Data source | Display example |
|------|-------------|-----------------|
| Streak | `studentProfile.streak` | `🔥 12-day streak` |
| Sessions this week | Derived from `recentSessions` (count sessions in last 7 days) | `5 sessions this week` |
| Avg score trend | `studentProfile.avgScore` + direction from recent vs. overall | `85% avg ↑` |

The trend arrow (`↑` / `↓` / `—`) compares the last 3 session scores to the overall avg. Green if improving, amber if declining, gray if flat/insufficient data. Synthetic data will hardcode a plausible direction per demo user.

### "Where to Focus" Section
Pulls from `enrollmentCourses` — specifically the `struggling` objective count. Each course contributes a list of objectives marked as needs-work. Displayed as a simple list of pill rows:

```
[course code badge]  [objective title]  [attempt count]  [Find a tool →]
```

If no objectives are struggling across all courses: show a green "You're on track across all courses" state instead.

For the demo, synthetic struggling objectives are added per user:
- **Ian McClure:** Hearsay Exceptions (FRE 803), Confrontation Clause analysis, Rule 404(b) Character Evidence
- **Tiana The:** Postcolonial theory application, Close reading of modernist texts

---

## What This Does NOT Do

- Does not add any new API routes. All data is either already fetched (enrollment, dashboard, library) or derived from it.
- Does not change the student analytics page (`/analytics/student`).
- Does not remove the profile card entirely — the identity information moves inline to the greeting; the large avatar card is dropped.
- Does not change the student data model or seed.

---

## Files Changed

| File | Change |
|------|--------|
| `app/page.tsx` | Reorder sections, add Snapshot strip, add Where to Focus, promote ActionItems in JSX, demote Suggested For You |

No new components, no new API routes, no schema changes.
