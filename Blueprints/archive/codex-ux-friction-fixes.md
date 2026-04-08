# Codex Task — UX Friction Fixes: Tools Marketplace & Tool Detail

**Scope:** Three targeted fixes to remove the most critical friction points in the student "search and launch" flow before the MVP demo. No new packages. No schema changes.

---

## Fix 1 — Move the Tab Switcher Above the Search Bar

**File:** `app/tools/page.tsx`

**Problem:** The Marketplace/Community tab switcher currently sits *below* the search bar in the JSX. A student types a search query, gets zero results, and only then discovers they were searching the wrong tab. The control that determines *what* is being searched must appear *before* the input that searches it.

**Desired JSX order inside the "Browse All" white section (currently ~lines 349–405):**

```
1. "Browse All Tools" heading row
2. Tab switcher  ← move this ABOVE the search input
3. Search input + clear button
4. "Not sure? Ask Sandy →" hint line
```

Currently the tab switcher (the `<div className="mb-4 flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">` block) appears between the heading and the search input — which is correct order — but visually the search bar draws the eye first because it is full-width and more prominent. Ensure the tab switcher has enough visual weight to be read before the search bar. Consider adding a `text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1` label "Filter by source:" directly above the tab toggle to make the hierarchy explicit.

---

## Fix 2 — Change Default Tab to "Community"

**File:** `app/tools/page.tsx`, line 156

**Problem:** The default is `'community'`, which is correct. **However**, confirm this is still the case and has not been changed. If it was ever switched to `'marketplace'`, students searching for course-specific faculty tools (which have `approvalStatus: COMMUNITY` or `PENDING`) will get zero results and assume the tool doesn't exist.

**Verify current state:**
```ts
// This line should read:
const [activeTab, setActiveTab] = useState<'marketplace' | 'community'>('community')
```

If it reads `'marketplace'`, change it to `'community'`.

**Also rename the tab labels** to reduce the cognitive load of choosing between them. Students should not need to know what "Marketplace" vs "Community" means:

```tsx
// Before
{tab === 'marketplace' ? 'Marketplace' : 'Community'}

// After
{tab === 'marketplace' ? 'Verified Only' : 'All Tools'}
```

Update the subtitle text (~lines 293–296) to match:

```tsx
// Before
? 'Verified tools selected for the main marketplace.'
: 'Published tools from the full Sandbox community.'

// After
? 'Officially verified tools only.'
: 'All published tools — including course-specific faculty tools.'
```

---

## Fix 3 — Fix the Tool Detail "Launch" Experience

**File:** `app/tools/[id]/page.tsx`

> **IMPORTANT — read before coding:**
> A previous review suggested changing `useState(false)` → `useState(true)` for `showChatbot`. **Do not make that change.** The state is already initialized to `true` on line 90:
> ```ts
> const [showChatbot, setShowChatbot] = useState(true)
> ```
> The chatbot IS rendered on page load. The actual problems are different.

### Problem A — Button label says "Hide Chatbot" on first paint

Because `showChatbot` starts as `true`, the primary blue CTA button immediately reads **"Hide Chatbot ↑"**. A student who just arrived reads this as a warning or a toggle to close something, not as an invitation to start. They hesitate or click it by accident and collapse the chatbot they wanted.

**Fix:** The label should indicate the current *session state*, not the toggle action. When the chatbot is open, the button should read "Session Open" or simply collapse cleanly. Concretely, change the label logic for the non-EXTERNAL case (~lines 558–565):

```tsx
// Before
{showChatbot
  ? (tool.toolType === 'STUDY_BUDDY' ? 'Hide Study Buddy' : 'Hide Chatbot')
  : (tool.toolType === 'STUDY_BUDDY' ? 'Launch Study Buddy' : 'Launch Chatbot')}

// After
{showChatbot
  ? (tool.toolType === 'STUDY_BUDDY' ? 'Study Buddy Active' : 'Session Active')
  : (tool.toolType === 'STUDY_BUDDY' ? 'Launch Study Buddy' : 'Launch Chatbot')}
```

When `showChatbot` is `true`, also reduce the button's visual weight so it reads as a status indicator rather than a primary CTA. Change the class from `bg-[#0033A0] text-white` → `bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/30` for the "active" state, and keep `bg-[#0033A0] text-white` only for the "launch" (closed) state.

```tsx
className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors shadow-sm ${
  showChatbot
    ? 'bg-[#0033A0]/10 text-[#0033A0] border border-[#0033A0]/30 hover:bg-[#0033A0]/15'
    : 'bg-[#0033A0] text-white hover:bg-[#002580]'
}`}
```

### Problem B — No scroll to chatbot on initial page load

The `#chatbot-section` div is below the action bar. On a typical laptop screen, the chatbot interface is below the fold on first paint. There is currently a `useEffect` that scrolls to it only when `?launch=true` is in the URL (lines 207–220). A student arriving via a normal card click never gets that scroll.

**Fix:** Add a `useEffect` that fires once after the tool loads, scrolling to `#chatbot-section` unconditionally when the tool type is not EXTERNAL:

```tsx
// Add this effect after the existing fetchTool useEffect (around line 157)
useEffect(() => {
  if (!tool || tool.toolType === 'EXTERNAL') return
  window.setTimeout(() => {
    document
      .getElementById('chatbot-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 150)
}, [tool?.id]) // fires once when tool first loads
```

The 150ms delay ensures the chatbot component has rendered before the scroll fires.

---

## Summary of Changes

| File | Change | Line(s) |
|---|---|---|
| `app/tools/page.tsx` | Move tab switcher label above search; add "Filter by source:" micro-label | ~349–370 |
| `app/tools/page.tsx` | Confirm default tab is `'community'` | ~156 |
| `app/tools/page.tsx` | Rename tab labels to "All Tools" / "Verified Only" | ~362–368 |
| `app/tools/page.tsx` | Update subtitle text to match new labels | ~293–296 |
| `app/tools/[id]/page.tsx` | Change active-state button label from "Hide Chatbot" → "Session Active" | ~558–565 |
| `app/tools/[id]/page.tsx` | Reduce button visual weight when chatbot is open (blue outline, not filled) | ~556–566 |
| `app/tools/[id]/page.tsx` | Add `useEffect` to auto-scroll to `#chatbot-section` on initial tool load | after ~157 |

**Do not change** `useState(true)` for `showChatbot` — it is already correct.
