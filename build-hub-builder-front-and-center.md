# Blueprint: Build Hub — AI Builder Front and Center

## Goal
Make the AI-powered builder the dominant, immediate action on `/build`. Right now the hero has a small single-line `<input>` buried in a banner, and the experience scaffolding requires scrolling to reach. Fix both without restructuring the page.

---

## Background

### What Already Exists (don't recreate these)
- `app/components/BuildHubHero.tsx` — a standalone hero component with a textarea + TOOL_TYPES cards. **Do not use this.** It uses 7 generic types from `BuilderChatPanel` and is not integrated into the build page.
- `EXPERIENCE_CATEGORIES` in `app/lib/experience-types.ts` — 8 categories with 30+ typed experience cards, already imported in `build/page.tsx`. This is richer than TOOL_TYPES and is the right scaffolding to keep.
- `TOOL_TYPES` and `EXAMPLES` exported from `app/components/BuilderChatPanel.tsx` — **do not use these on the build page**.

### The Only File to Change
**`app/build/page.tsx`** — single file, three targeted edits.

---

## Changes

### Change 1: Default the experience gallery to open on first category

**Why:** The category cards are the best scaffolding for writer's block, but currently nothing shows until the user clicks a pill tab.

In the `useState` initialization (around line 68), change:
```tsx
// BEFORE
const [activeCategory, setActiveCategory] = useState<string | null>(null)

// AFTER
const [activeCategory, setActiveCategory] = useState<string | null>('practice')
```

`'practice'` is the first category's `id` in `EXPERIENCE_CATEGORIES`. This makes the Practice & Drilling cards visible on page load without any interaction.

---

### Change 2: Replace the hero `<input>` with a prominent `<textarea>`

**Why:** A single-line input feels like a search bar, not a builder. A tall textarea signals "describe something substantial here."

Replace the entire `<form>` block inside the hero (the form that wraps the `<input>` and submit button, roughly lines 210–236) with this:

```tsx
{/* Conversational starter */}
<div className="relative max-w-2xl">
  <div className="absolute top-3 left-4 z-10">
    <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
      <Sparkles className="w-3.5 h-3.5 text-white" />
    </div>
  </div>
  <textarea
    value={buildPrompt}
    onChange={(e) => setBuildPrompt(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        if (buildPrompt.trim()) {
          router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
        }
      }
    }}
    placeholder={'e.g. "A Socratic tutor for 1L Contracts students to practice offer and acceptance"'}
    rows={3}
    className="w-full rounded-2xl border-2 border-white/20 bg-white/10 text-white placeholder-blue-300 px-5 py-4 pl-14 pb-12 text-base focus:outline-none focus:border-white/50 backdrop-blur-sm resize-none"
  />
  <div className="absolute bottom-3 right-3 flex items-center gap-3">
    <span className="text-blue-200 text-xs hidden sm:inline">Shift+Enter for new line</span>
    <button
      type="button"
      onClick={() => {
        if (buildPrompt.trim()) {
          router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
        }
      }}
      disabled={!buildPrompt.trim()}
      className="w-9 h-9 rounded-xl bg-white text-[#0033A0] flex items-center justify-center disabled:opacity-40 hover:bg-blue-50 transition-colors flex-shrink-0"
    >
      <ArrowRight className="w-4 h-4" />
    </button>
  </div>
</div>
<p className="text-blue-200 text-xs mt-2">
  Most tools take less than 5 minutes to build.
</p>
```

Note: `Sparkles` is already imported in this file — no new imports needed.

---

### Change 3: Tighten spacing so the gallery is visible sooner

**Why:** Reduce whitespace so users can see the experience category cards without scrolling.

Two small padding tweaks:

```tsx
// Hero banner — reduce from py-10 to py-8
// BEFORE
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
// AFTER
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

// Main content wrapper — reduce from py-8 space-y-8 to py-6 space-y-6
// BEFORE
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
// AFTER
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
```

---

## What NOT to Change
- The blue gradient hero wrapper (`bg-gradient-to-r from-[#0033A0] via-blue-700 to-sky-600`)
- The heading and description text in the hero
- The `EXPERIENCE_CATEGORIES` pill tabs and card grid — keep exactly as-is
- Build surfaces section (Course Workspace / Marketplace / Sandcastle cards)
- Sand balance and transaction history
- Refiner + Collaborator sections
- Course Build Workspace section
- `BuilderChatPanel.tsx` — no changes needed
- `BuildHubHero.tsx` — leave it, don't import it

---

## Expected Result

On page load:
1. User sees a tall, prominent textarea with a Sparkles icon in the top-left corner
2. Directly below the hero, the "What can you build?" section is visible with **Practice & Drilling** cards already expanded
3. User can type and press **Enter** to go directly to `/builder?prompt=...`
4. User can click any experience type card to go to `/builder?prompt=...` with a pre-filled prompt
5. All other sections (build surfaces, Sand, Refiner, Course Workspace) are still accessible by scrolling

---

## Verification Checklist
- [ ] `/build` loads with a tall textarea (not a single-line input) in the hero
- [ ] Experience category cards are visible without scrolling (Practice & Drilling open by default)
- [ ] Typing a prompt and pressing Enter navigates to `/builder?prompt=<encoded>`
- [ ] Shift+Enter inserts a newline instead of submitting
- [ ] Clicking the ArrowRight button submits
- [ ] Clicking an experience type card navigates to `/builder?prompt=<encoded template>`
- [ ] All sections below the fold still render correctly
- [ ] TypeScript build passes (`npx tsc --noEmit`)
