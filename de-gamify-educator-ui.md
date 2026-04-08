# Codex Task: De-Gamify the Educator/Admin UI

## Context

The Sandbox uses a gamification layer (XP, Sand, levels, quests, badges) that is appropriate for students but looks unprofessional for faculty and admins during a university stakeholder demo.

**Good news:** Most of the heavy lifting is already done:
- `Header.tsx` already relabels XP → "Impact" and Sand → "Credits" for educators (`xpLabel` / `sandLabel` at lines 33–34).
- `StudentQuestWidget` is already student-only (rendered only when `isStudent` in `page.tsx`).
- The educator home view already shows professional analytics stats, not quests.

**What still needs fixing:** Four targeted changes. Do NOT rewrite these components from scratch — make surgical edits only.

---

## Change 1 — `app/components/Header.tsx`: Neutral styling for the XP pill (educators/admins)

**Problem:** The XP badge uses a purple gradient pill (`from-purple-100 to-blue-100`, `text-purple-700`) regardless of role. Even labeled "Impact Lv 3", this looks like a video game to a Provost.

**Fix:** For educators and admins, either hide the XP pill entirely (preferred — "Impact level" is not meaningful to faculty) or replace its styling with a neutral `bg-slate-100 text-slate-600 border-slate-200` pill.

Find this block (approximately lines 242–247):
```tsx
{userXP !== null && (
  <div className="flex items-center gap-0.5 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full px-2 py-0.5 ml-1">
    <Zap className="w-2.5 h-2.5 text-purple-600" />
    <span className="text-[10px] font-bold text-purple-700">{xpLabel} Lv {getLevelInfo(userXP).level}</span>
  </div>
)}
```

Replace with: hide entirely for non-students (educators/admins don't need a level display in the nav).

```tsx
{userXP !== null && currentUser.role === 'STUDENT' && (
  <div className="flex items-center gap-0.5 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-200 rounded-full px-2 py-0.5 ml-1">
    <Zap className="w-2.5 h-2.5 text-purple-600" />
    <span className="text-[10px] font-bold text-purple-700">{xpLabel} Lv {getLevelInfo(userXP).level}</span>
  </div>
)}
```

---

## Change 2 — `app/components/Header.tsx`: Neutral styling for the Sand/Credits pill (educators/admins)

**Problem:** The Sand balance uses amber/gold styling (`bg-amber-100`, `border-amber-200`, `text-amber-700`, `Coins` icon) for all roles. Even labeled "Credits", the gold coin color reads as game currency.

**Fix:** For educators/admins, replace amber with slate and swap the `Coins` icon for `Database` (already imported or available in lucide-react).

Find this block (approximately lines 248–252):
```tsx
{userSand !== null && (
  <div className="flex items-center gap-1 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
    <Coins className="w-2.5 h-2.5 text-amber-600" />
    <span className="text-[10px] font-bold text-amber-700">{userSand.toLocaleString()} {sandLabel}</span>
  </div>
)}
```

Replace with role-aware styling:
```tsx
{userSand !== null && (
  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
    currentUser.role === 'STUDENT'
      ? 'bg-amber-100 border border-amber-200'
      : 'bg-slate-100 border border-slate-200'
  }`}>
    {currentUser.role === 'STUDENT'
      ? <Coins className="w-2.5 h-2.5 text-amber-600" />
      : <Database className="w-2.5 h-2.5 text-slate-500" />
    }
    <span className={`text-[10px] font-bold ${
      currentUser.role === 'STUDENT' ? 'text-amber-700' : 'text-slate-600'
    }`}>
      {userSand.toLocaleString()} {sandLabel}
    </span>
  </div>
)}
```

Make sure `Database` is included in the import from `lucide-react` at the top of the file (it is already imported there).

---

## Change 3 — `app/page.tsx`: Hide the XP level + progress bar from the profile card for educators/admins

**Problem:** The home page profile card shows "Lv X / Scholar" and a purple XP progress bar for ALL roles with no guard. Educators see their "level" in a university professional tool, which is off-brand.

**Find** the two blocks that render level info in the profile card. They are gated only on `levelInfo && xpData`, not on role.

**Block A** — the "Lv X / Name" display in the profile card header (approximately lines 404–410):
```tsx
{levelInfo && xpData && (
  <div className="text-right flex-shrink-0">
    <div className="text-2xl font-extrabold text-[#0033A0]">Lv {levelInfo.level}</div>
    <div className="text-xs text-gray-500">{levelInfo.name}</div>
  </div>
)}
```

**Block B** — the XP progress bar below the profile info (approximately lines 412–429):
```tsx
{levelInfo && xpData && (
  <div className="mt-4">
    ...XP progress bar...
  </div>
)}
```

**Fix for both blocks:** Add `isStudent &&` to the condition.

```tsx
{isStudent && levelInfo && xpData && (
  ...
)}
```

Apply to both Block A and Block B independently.

---

## Change 4 — `app/page.tsx`: Make the Badges panel student-only (or rename for educators)

**Problem:** The "Badges" panel with a `Trophy` icon and amber styling appears in the right column for all users. For a faculty stakeholder, seeing an empty badge case labeled "Complete sessions to earn badges" reads as juvenile.

**Option A (preferred — simpler):** Wrap the entire badges panel in `{isStudent && ...}`.

Find the badges block (approximately lines 560–587):
```tsx
{/* Badges */}
<div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
  <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
    <Trophy className="w-4 h-4 text-amber-500" />
    <span className="font-bold text-gray-900 text-sm">Badges</span>
    ...
  </div>
  ...
</div>
```

Wrap with:
```tsx
{isStudent && (
  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
    ...
  </div>
)}
```

---

## What NOT to change

- Do **not** rename or restructure the `QuestPanel` or `StudentQuestWidget` components — they are already student-only.
- Do **not** introduce a new `GovernanceMode` enum or abstraction layer — the existing `isStudent` / `isEducator` / `isAdmin` booleans in `page.tsx` and `currentUser.role` checks in `Header.tsx` are sufficient.
- Do **not** rename Sand to Credits platform-wide in the database or API layer — the label swap is UI-only and already handled by `sandLabel`.
- Do **not** touch the `/avatar` page — that is a faculty teaching assistant builder, not a game avatar.
- Do **not** rewrite Header.tsx or page.tsx from scratch — these are surgical, line-level changes.

---

## Summary of changes

| File | Change | Lines (approx) |
|---|---|---|
| `app/components/Header.tsx` | Hide XP pill for non-students | ~242–247 |
| `app/components/Header.tsx` | Slate styling for Sand/Credits pill for non-students | ~248–252 |
| `app/page.tsx` | Guard `Lv X` display in profile card with `isStudent` | ~404–410 |
| `app/page.tsx` | Guard XP progress bar in profile card with `isStudent` | ~412–429 |
| `app/page.tsx` | Guard Badges panel with `isStudent` | ~560–587 |
