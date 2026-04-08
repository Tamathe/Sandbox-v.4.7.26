# UX Friction Review — Educator Onboarding Path
### The Sandbox MVP | Pre-Demo Assessment

---

## Summary Verdict

The friction analysis is **directionally correct** but **misreads the existing codebase** in two of three cases, and proposes far more engineering than the problems require. Below is a fact-checked breakdown of each point, what already exists, and the actual minimal fixes worth shipping before the demo.

---

## Point 1: Gamification Noise — ✅ Valid, but the fix is a 5-line change

### What the review says
XP, Sand, Level bars, and Quests signal "toy" or "game" to educators and should be hidden for the `EDUCATOR` role.

### What's actually in the code
- **`QuestPanel` is already student-only.** `app/page.tsx:589-596` wraps `<StudentQuestWidget>` in `{isStudent && xpData && levelInfo && (...)}`. Educators never see it.
- **XP level and progress bar are NOT role-gated.** `app/page.tsx:404-429` renders the `Lv {n}` display and the purple/blue gradient bar for anyone who has XP data. Since the seed script grants starting XP to all users, an educator sees "Lv 4 Wizard" on their dashboard. This is the real bug.
- **Badges panel** (`app/page.tsx:559-587`) is also visible to all roles.
- **Sand balance** shows in the header for all roles — check `app/components/Header.tsx`.

### Recommended fix
Gate the XP/level block, progress bar, and badges panel on `isStudent`. This is not a new component; it's wrapping existing JSX in a role check. Estimated change: ~8 lines across two files.

```tsx
// app/page.tsx — wrap level display
{isStudent && levelInfo && xpData && (
  <div className="text-right flex-shrink-0">
    <div className="text-2xl font-extrabold text-[#0033A0]">Lv {levelInfo.level}</div>
    <div className="text-xs text-gray-500">{levelInfo.name}</div>
  </div>
)}

// Same gate on the XP progress bar block (lines ~412-429)
// Same gate on the Badges panel block (lines ~559-587)
```

**Do not build `FacultyDashboard.tsx`.** The educator home already has exactly what the review proposes — role-appropriate stats (Tools Published, Active Students, Total Sessions, Avg Score) at `app/page.tsx:432-466` and a recent student activity feed. The only problem is the XP noise bleeding through.

---

## Point 2: Ambiguous Input / Blank Page — ⚠️ Partially valid, misreads existing solution

### What the review says
The free-text conversational input in the builder requires the educator to know how to prompt the system. Replace it with labeled buttons for common tasks (`QuickActionGrid.tsx`).

### What's actually in the code
The "blank page" critique applies to the **home dashboard** text box (`app/page.tsx:288-315`), not the Build Hub.

The **Build Hub** (`app/build/page.tsx`) already ships an experience gallery that is functionally identical to the proposed `QuickActionGrid`:
- 8 category pill tabs (Practice, Assessment, Research, etc.)
- 30+ labeled experience type cards with titles and descriptions
- Click → routes to `/builder?prompt=<pre-filled template>`

The problem is **information hierarchy**: the conversational text box appears first in the hero section, and the experience gallery is below the fold. A first-time user sees the blank box, not the gallery.

### Recommended fix
**Reorder the Build Hub hero.** Move the experience gallery above (or alongside) the text input, or change the placeholder text to reference the gallery below. Do not build `QuickActionGrid.tsx` — it already exists as a richer, categorized version.

Consider changing the hero layout so the category tabs are visible without scrolling:

```
BEFORE: [Text box hero] → [scroll] → [Category gallery]
AFTER:  [Category gallery, prominent] → [Text box as "or describe your own..."]
```

This is a CSS/JSX reorder, not a new component. The proposed route `/builder?template=${id}&mode=fast_track` also does not exist and would require new builder logic — unnecessary when the prompt pre-fill already works.

---

## Point 3: One-Click Bot from Course Materials — ✅ Valid, this is a genuine gap

### What the review says
Invert the flow: let educators upload course materials first, then generate a tool automatically. Add a "Create Bot Now" CTA on the course detail page.

### What's actually in the code
The Course Build Workspace in `app/build/page.tsx:243-346` allows selecting a course and running AI gap analysis — but this requires the educator to navigate to `/build` and understand the workspace. There is **no shortcut on the course page itself**.

The `OneClickBot` component concept is the only genuinely new idea in the review. It is well-targeted and addresses real friction: an educator who has uploaded course materials has no obvious path from "I have materials" to "I have a bot."

### Recommended fix
Add a contextual CTA banner to the course detail page (`app/courses/[id]/page.tsx`) that shows when `materialCount > 0`. The API backend for this (`/api/courses/${courseId}/generate-bot`) does not exist and will need to be built — this is the one piece that requires real engineering. Scope it as:

1. Gather text from the course's `CourseMaterial` records
2. POST to `/api/build-tool` with a pre-constructed prompt (the existing build-tool endpoint already handles this pattern)
3. Redirect to the published draft

The `OneClickBot.tsx` component from the review is a solid starting point — the only change worth making is using UK Blue (`bg-[#0033A0]`) instead of Indigo to stay on-brand.

---

## What NOT to Do

| Proposed Change | Why to Skip |
|---|---|
| Build `FacultyDashboard.tsx` as a new page/route | The educator home already does this — just remove the gamification bleed-through |
| Build `QuickActionGrid.tsx` as a new component | The experience gallery in `app/build/page.tsx` already is this, better |
| Add `/builder?mode=conversational` escape hatch route | The existing `/builder` route IS the conversational mode; this adds confusion |
| Replace the builder's conversational input entirely | Wrong diagnosis — the builder page isn't the blank-page problem, the home page mini-box is |

---

## Prioritized Action List (by demo impact)

| Priority | Change | Effort | Files |
|---|---|---|---|
| 1 | Hide XP level, progress bar, and badges from EDUCATOR/ADMIN roles | 30 min | `app/page.tsx` |
| 2 | Check and suppress Sand balance in header for non-student roles | 15 min | `app/components/Header.tsx` |
| 3 | Reorder Build Hub hero so experience gallery is above the fold | 45 min | `app/build/page.tsx` |
| 4 | Add `OneClickBot` CTA to course detail page + `/api/courses/[id]/generate-bot` route | 3–4 hrs | `app/courses/[id]/page.tsx` + new API route |

Items 1–3 can ship before the demo. Item 4 is the highest value but needs the API work.

---

## On the Broader Diagnosis

The review's core insight is sound: **gamification elements signal the wrong audience to an educator who lands on the platform for the first time.** The platform is built role-aware throughout — student quests, student-only analytics, student library — but XP/level/Sand bleed through to the educator view and that's the thing that will make a faculty member close the tab.

The fix is surgical, not architectural. The components described in the review (a new dashboard, a new grid, a new builder mode) would take days and duplicate what's already built. The actual changes are hours of targeted work.

---

*Review based on reading `app/page.tsx`, `app/build/page.tsx`, `app/components/QuestPanel.tsx`, and `CLAUDE.md` — March 2026.*
