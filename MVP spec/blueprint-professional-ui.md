# Blueprint: Professional Utility UI Mode
**The Sandbox — Gamification Desescalation**
*Status: Proposal | Date: 2026-03-15*

---

## 1. Objective

Shift the UI language from **RPG game** to **SaaS professional tool** while preserving the two engagement mechanisms that drive real behavior:

| Mechanism | Before | After |
|-----------|--------|-------|
| Sand economy | "Gold coins" with particle animations | "Credit balance" in a wallet display |
| Achievements | "Quest complete! Level up!" | "Milestone reached" in Profile > Credentials |

Everything else — XP bars, level titles ("Scholar", "Master"), Daily Quest panels, streak counters — is removed from primary surfaces.

---

## 2. What Changes, What Stays

### REMOVE from UI (not from DB)
- XP progress bars and level names displayed in the header or dashboard
- "Daily Quests" / `QuestPanel.tsx` / `StudentQuestWidget.tsx` from the home dashboard
- Streak counters on the student dashboard
- `StudentQuestWidget` static demo component
- The "Lvl X" badge from `Header.tsx`
- Any copy like "Quest Complete!", "XP Earned!", "Level Up!"

> **Note:** Keep the underlying DB tables (`XPEvent`, `PlatformQuest`, `UserBadge`, `Badge`) and API routes intact. Quests and XP still accrue silently in the background. This is a *presentation* change, not a data model change.

### KEEP (with redesign)
- Sand balance → moved to a clean "Balance" pill in the header
- Badges/Achievements → moved to `Profile > Credentials` tab
- Quest completion → triggers a toast notification only ("Milestone reached: First Course Uploaded")
- Leaderboards → remain on individual tool pages (competitive context is appropriate there)

---

## 3. Architecture: `uiMode` Utility

Introduce a single source of truth for which rendering mode is active. This keeps all conditionals in one place rather than scattered across components.

### 3.1 New File: `app/lib/ui-mode.ts`

```typescript
// app/lib/ui-mode.ts

export type UIMode = 'professional' | 'gamified'

/**
 * Returns the UI mode for a given role.
 * EDUCATOR and ADMIN always get the professional mode.
 * STUDENT defaults to professional; can be extended later via user preference.
 */
export function getUIMode(role: 'EDUCATOR' | 'STUDENT' | 'ADMIN'): UIMode {
  if (role === 'EDUCATOR' || role === 'ADMIN') return 'professional'
  // Future: read from user settings for STUDENT
  return 'professional'
}

export const IS_GAMIFIED = (mode: UIMode) => mode === 'gamified'
export const IS_PROFESSIONAL = (mode: UIMode) => mode === 'professional'
```

All components that branch on role for gamification UI import `getUIMode` instead of checking `user.role === 'STUDENT'` directly. This means a future "opt-in gamification" setting is a one-line change.

---

## 4. Component-Level Changes

### 4.1 `app/components/Header.tsx`

**Current state:** Shows `[Zap icon] XP Lv 4` + `[Coins icon] 500 Sand` for students.

**Target state:**

```
[ Balance: 500 Sand ]   [ Ian M. ▾ ]
```

**Changes:**
- Remove the XP level badge entirely (the `<div>` containing `levelName` and `totalXP`)
- Rename the Sand display label from icon-only to `Balance: {n} Sand`
- Remove the `/api/xp` fetch call from Header — Sand balance is sufficient; XP level data is no longer needed in the nav
- Sand balance can remain fetched from `/api/xp` (same endpoint already returns `sandBalance`)

**Diff sketch:**

```tsx
// REMOVE this block in Header.tsx
{xpData && user.role === 'STUDENT' && (
  <div className="xp-badge">
    <Zap size={14} />
    <span>XP Lv {xpData.level}</span>
  </div>
)}

// KEEP but relabel
{xpData && (
  <div className="sand-balance">
    <span>Balance: {xpData.sandBalance} Sand</span>
  </div>
)}
```

---

### 4.2 `app/page.tsx` (Home Dashboard)

**Current student layout (right column):**
1. `StudentQuestWidget` (static quest demo with streak)
2. `QuestPanel` (daily/weekly quests with progress bars)
3. Badge showcase

**Target student layout (right column):**
1. **Action Items** — a plain checklist of recommended next steps (replaces quests)
2. Badge showcase is removed from the dashboard surface (see §4.4)

**Action Items Component** — new `app/components/ActionItems.tsx`:

```tsx
// app/components/ActionItems.tsx
// Replaces QuestPanel and StudentQuestWidget on the home dashboard.
// Derives items from quest completion status but renders as a plain checklist,
// not as a reward-seeking progress bar.

interface ActionItem {
  id: string
  label: string
  completed: boolean
  href?: string
}

// Items are sourced from /api/quests but displayed without XP/Sand reward framing.
// Completed items show a checkmark. Uncompleted items link to the relevant page.
```

**Items to show (sourced from existing quest conditions):**
| Quest Condition | Action Item Label |
|----------------|-------------------|
| `COMPLETE_ANY_SESSION` | Complete your first tool session |
| `LAUNCH_MARKETPLACE_TOOL` | Browse a tool in the marketplace |
| `COMPLETE_COURSE_TOOL` | Finish a course-assigned tool |
| `LEAVE_COMMENT` | Leave feedback on a tool |
| `SCORE_ABOVE_THRESHOLD` | Score above 80% in any session |

No XP/Sand reward is shown. Completed items are checked off. The section heading is **"Getting Started"** for new users and **"Recommended"** for returning users.

**Remove from `page.tsx`:**
- `QuestPanel` import and usage
- `StudentQuestWidget` import and usage
- The XP level progress bar in the student profile card
- The "Streak" counter
- Badge showcase grid (move to Profile page)

**Keep in `page.tsx`:**
- Learning Vitals grid (sessions, time, avg score, rank, Sand balance)
- Recent sessions feed with scores

---

### 4.3 `app/components/QuestPanel.tsx`

No changes to the component itself. It is simply **no longer rendered** on `page.tsx`. It can remain in the codebase for potential future opt-in gamification mode.

---

### 4.4 `app/profile/[id]/page.tsx` (Profile Page)

**Add a new "Credentials" tab** alongside the existing "Tools" tabs.

**Credentials tab content:**
- Grid of earned badges rendered as `<BadgeCard>` items
- Each card: icon + name + description + date earned (formatted as "March 2026")
- Empty state: "No milestones yet. Complete sessions and courses to earn credentials."

**Remove from profile page (if present):**
- Any XP level display
- Any raw XP number display

**Notification language update (wherever badge award notifications appear):**

```
BEFORE: "Quest Complete! You earned the Scholar Badge! +50 XP"
AFTER:  "Milestone reached: Scholar — Completed 250 learning sessions."
```

---

### 4.5 `app/lib/xp.ts` — Level Names

The level name strings (`Explorer`, `Learner`, `Scholar`, `Analyst`, `Expert`, `Master`) are used nowhere visible in professional mode after the header change. No code deletion needed — they simply aren't rendered.

If a future email or notification references level names, use neutral language: "You've reached a new proficiency tier."

---

## 5. Toast / Notification Language

All XP and badge award toasts (triggered in `/api/xp` POST and badge checking logic) should use professional language. The API routes themselves don't render toasts — those fire client-side. Audit any `toast()` calls in:

- `app/tools/[id]/session/page.tsx` (session completion)
- `app/components/GamificationBuilderChat.tsx`

**Replace patterns:**

| Old copy | New copy |
|----------|----------|
| `"Quest Complete! +{n} XP"` | `"Milestone reached: {quest.title}"` |
| `"Level Up! You are now Level {n}"` | (remove entirely) |
| `"You earned the {badge.name} badge! +{n} XP"` | `"Credential earned: {badge.name}"` |
| `"Daily Quest Claimed!"` | (remove — action items don't show rewards) |

---

## 6. Copy / Label Audit

Global find-and-replace targets (case-insensitive):

| Find | Replace with |
|------|-------------|
| "Daily Quest" | "Action Item" |
| "Weekly Quest" | "Weekly Recommendation" |
| "Earn XP" | (remove) |
| "XP Reward" | (remove from user-facing copy; keep in DB) |
| "Claim Reward" | (remove — rewards accrue silently) |
| "Level Up" | (remove) |
| "Your Level" | (remove) |
| "Sand Balance" (as a header label) | "Balance" |
| "Quest Complete" | "Milestone reached" |

---

## 7. Files Touched — Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `app/lib/ui-mode.ts` | **CREATE** | UIMode utility — single source of truth |
| `app/components/Header.tsx` | **EDIT** | Remove XP level badge; relabel Sand as "Balance" |
| `app/page.tsx` | **EDIT** | Remove QuestPanel, StudentQuestWidget, XP bar, streak counter; add ActionItems |
| `app/components/ActionItems.tsx` | **CREATE** | Plain checklist replacement for QuestPanel |
| `app/profile/[id]/page.tsx` | **EDIT** | Add Credentials tab with badge grid |
| Session/tool pages | **EDIT** | Update toast copy (no XP/level language) |

**Files NOT changed:**
- All API routes (data model unchanged)
- `app/lib/xp.ts` (logic stays, just not rendered)
- `app/lib/sand.ts` (unchanged)
- `app/lib/platform-quests.ts` (unchanged — quests still accrue silently)
- Prisma schema (no DB changes)
- `QuestPanel.tsx` (kept but unused on main dashboard)

---

## 8. Implementation Order

```
1. Create app/lib/ui-mode.ts
2. Edit Header.tsx — remove XP badge, relabel Sand
3. Create app/components/ActionItems.tsx
4. Edit app/page.tsx — swap QuestPanel/StudentQuestWidget for ActionItems
5. Edit app/profile/[id]/page.tsx — add Credentials tab
6. Audit and update toast copy in session pages
```

Each step is independently shippable. Steps 1–4 produce the most visible change.

---

## 9. Non-Goals

- Do **not** delete XP, Quest, or Badge data from the database.
- Do **not** remove the `/api/quests`, `/api/xp`, or `/api/xp/badges` routes.
- Do **not** change the Gamification Builder for educators — that product surface is appropriate for its context (tool configuration, not student-facing).
- Do **not** add a user toggle for gamification mode in this pass. That is a future enhancement enabled by `ui-mode.ts`.
