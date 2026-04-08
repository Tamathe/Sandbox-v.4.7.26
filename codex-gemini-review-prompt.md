# Codex Task — Demo Polish: Welcome Modal + Coming Soon Feedback
**Repo:** `the-sandbox/` (Next.js 16 App Router, TypeScript, Tailwind CSS v4, Prisma v7, PostgreSQL)

---

## Context

Before touching any code, read `the-sandbox/CLAUDE.md` in full — it is the authoritative source of truth for architecture, file structure, data models, and patterns.

**Critical constraints:**
- Prisma client always imported from `app/lib/prisma.ts` — never instantiate `PrismaClient` directly
- Auth is mock: the `x-demo-user-email` request header identifies the current user
- **No new npm packages**
- No new Prisma migrations — no schema changes
- Do not refactor, restructure, or rename any existing files
- Do not modify any file not listed in a task below

---

## Creative Director Review of Gemini's Recommendations

**Already done — skip:**
- Builder "front and center": `BuildHubHero.tsx` already has the prominent textarea + prompt chips
- Seed enrichment: upvotes (16), comments (8), favorites (9) already seeded
- Sandcastle population: 17 experiences (12 live, 5 coming-soon) already defined in `sandcastle.ts`
- Educator activity feed: already handled via `EDUCATOR_PROFILES` synthetic data in `app/page.tsx`
- Library empty state: already has a well-designed empty state at line ~208 of `app/library/page.tsx`

**Rejected:**
- Marketplace "personalization" (full rewrite of tools/page.tsx): Too risky for demo prep, marginal value — the page already has Featured tools and two tabs. Not worth the risk.
- Universal skeleton/loading audit: Too broad, most important places already covered.
- Toast for coming-soon (react-hot-toast): Blocked by no-new-packages rule. Handled differently below.
- Form feedback audit: Scope too broad; publish and service-bot already have loading states.

**Approved for implementation — 2 tasks:**
1. Welcome Demo Modal on home page
2. Coming Soon click feedback in Sandcastle (no new packages)

---

## Task 1 — Welcome Demo Modal

**File:** `the-sandbox/app/page.tsx`

**Problem:** Stakeholders land on the home page with no indication that role-switching exists. The entire demo value depends on showing different views — but nothing tells them to try it.

**What to add:**

At the top of the `HomePage` component (before the return statement), add a `showWelcome` state gated by `localStorage`:

```tsx
const [showWelcome, setShowWelcome] = useState(false)

useEffect(() => {
  if (!localStorage.getItem('sandbox-demo-welcomed')) {
    setShowWelcome(true)
  }
}, [])

const dismissWelcome = () => {
  localStorage.setItem('sandbox-demo-welcomed', '1')
  setShowWelcome(false)
}
```

Then, as the **first child inside the outermost `<div>`** of the return (before any other content), add the modal:

```tsx
{showWelcome && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
      <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-[#0033A0]/10 px-3 py-1 text-xs font-bold text-[#0033A0] uppercase tracking-wider">
        Interactive Demo
      </div>
      <h2 className="mt-3 text-2xl font-extrabold text-gray-900">Welcome to The Sandbox</h2>
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">
        This is a live MVP demo of an AI-powered educational tool marketplace built for the University of Kentucky.
      </p>
      <p className="mt-3 text-sm text-gray-600 leading-relaxed">
        You're currently viewing as <span className="font-semibold text-gray-900">{currentUser.name}</span>. Use the avatar menu in the top-right to switch between:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-gray-700">
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500" />
          <span><span className="font-semibold">Ian McClure</span> — Student view (learning tools, XP, quests)</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span><span className="font-semibold">Heath Price</span> — Educator view (analytics, course management)</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#0033A0]" />
          <span><span className="font-semibold">Dr. DiPaola</span> — Admin view (approval queue, platform stats)</span>
        </li>
      </ul>
      <button
        type="button"
        onClick={dismissWelcome}
        className="mt-6 w-full rounded-xl bg-[#0033A0] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#002580]"
      >
        Got it — let's explore
      </button>
    </div>
  </div>
)}
```

**Important:**
- Read the full file before editing. Find where `currentUser` is destructured from `useAuth()` — it's already used in the file, do not add a duplicate destructure.
- The `showWelcome` state and its `useEffect` must be added at the top of the component, alongside the other state declarations.
- Do not change any other part of the file.

---

## Task 2 — Sandcastle Coming Soon Click Feedback

**File:** `the-sandbox/app/sandcastle/page.tsx`

**Problem:** Coming-soon cards are visually grayed out and have a static "Coming Soon" button div — but they don't respond to clicks at all. A stakeholder clicking one during a demo might think the page is broken or unresponsive.

**What to add:**

1. Add a new state variable at the top of the `SandcastlePage` component (alongside the existing `activeCategory` state):

```tsx
const [comingSoonClicked, setComingSoonClicked] = useState<string | null>(null)
```

2. In the card rendering loop, find the `isLive` check (around line 146). The current coming-soon card renders:

```tsx
<div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium text-center">
  Coming Soon
</div>
```

Replace this `<div>` with a `<button>` that shows brief inline feedback:

```tsx
<button
  type="button"
  onClick={() => {
    setComingSoonClicked(exp.slug)
    setTimeout(() => setComingSoonClicked(null), 2500)
  }}
  className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm font-medium text-center hover:bg-gray-200 transition-colors cursor-pointer"
>
  {comingSoonClicked === exp.slug ? '🏗️ This one is coming soon!' : 'Coming Soon'}
</button>
```

**Important:**
- Read the full file before editing. The card rendering loop is in the `{experiences.map(exp => { ... })}` block.
- Only change the coming-soon button div. Do not touch the live card rendering or any other part of the file.
- The `comingSoonClicked` state must be added alongside the existing `activeCategory` state declaration at the top of the component.

---

## Verification Checklist

- [ ] `cd the-sandbox && npx tsc --noEmit` — zero TypeScript errors
- [ ] No new files created
- [ ] Only the 2 files listed above were modified
- [ ] Home page: on first visit (clear localStorage), welcome modal appears and lists all 3 demo roles
- [ ] Home page: after clicking "Got it", modal dismisses and does not reappear on refresh
- [ ] Sandcastle: clicking a coming-soon card changes the button text to "🏗️ This one is coming soon!" for ~2.5 seconds, then resets
- [ ] Sandcastle: live cards are unaffected
