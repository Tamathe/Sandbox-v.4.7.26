# Build Experience Audit
### The Sandbox — Engineering & UX Review
**Date:** 2026-03-19
**Scope:** `/build`, `/builder`, `/build/refiner`, `/build/collaborator`
**Author:** Engineering + UX review (Claude Code)

---

## Executive Summary

The build experience is split across four surfaces that serve one mental job: **making a tool**. A user building their first tool today touches `/build` → `/builder` → `/build/refiner` → `/publish` — four navigations for a single creative workflow. Each hop interrupts momentum. The code is clean and the individual pieces work well; the problem is architectural: the pieces haven't been assembled into a unified flow.

---

## Files Reviewed

| File | Lines | Purpose |
|---|---|---|
| `app/build/page.tsx` | 567 | Build Hub — discovery, gallery, drafts, gap analysis |
| `app/components/BuilderLayout.tsx` | 352 | Conversational AI builder (split-pane) |
| `app/build/refiner/page.tsx` | 122 | Drafts grid with AI re-polish option |
| `app/build/collaborator/page.tsx` | 745 | Peer review request + Sandy-guided feedback |

---

## Engineering Findings

### 1. `/build/refiner` is a dead duplicate — delete it

`/build/refiner/page.tsx` and the "Your drafts" section in `/build/page.tsx` (lines 461–510) fetch **the exact same API endpoint** with the same filters and render the same data:

```
GET /api/tools?published=false&creatorEmail=...&sort=updated
```

The Refiner page adds exactly two things not already on `/build`:
- `formatDistanceToNow` timestamp on each card
- "Refine with AI" button → `router.push('/builder?prompt=Refine my draft...')`

**Fix:** Add those two elements to the existing drafts section on `/build/page.tsx`. Then redirect `/build/refiner` → `/build`. One page, no duplication, ~120 lines deleted.

---

### 2. Session created on mount before any user intent

`BuilderLayout.tsx` lines 131–145 — `createFreshSession()` fires immediately on every mount via `useEffect`, writing a `BuildSession` record to the database even if the user types nothing and navigates away immediately. The `savedAt` indicator only shows when `spec.name` is populated, but the empty session row already exists.

```tsx
// Current — fires on every mount
useEffect(() => {
  createFreshSession()  // ← DB write before user does anything
}, [currentUser.email, requestedSessionId])
```

**Fix:** Create the session lazily — on the first message sent, not on component mount. Pass a `sessionId` resolver to `BuilderChatPanel` that calls `POST /api/builder/sessions` on first submit.

---

### 3. Full page navigation for a prompt already typed

`build/page.tsx` lines 176–178:

```tsx
router.push(`/builder?prompt=${encodeURIComponent(buildPrompt.trim())}`)
```

The user typed something, hit Enter, and now watches a full page navigation + session creation + API cold-start before anything renders. Estimated dead time: 400–800ms on a warm Vercel edge.

**Short fix:** Add `router.prefetch('/builder')` on textarea `onFocus` to warm the route.
**Real fix:** Embed `BuilderLayout` as a slide-up panel triggered by prompt submission — no navigation required.

---

### 4. Student redirect fires in render body (React anti-pattern)

`build/refiner/page.tsx` lines 47–50:

```tsx
if (currentUser.role === 'STUDENT') {
  router.replace('/build')  // ← called during render
  return null
}
```

Calling `router.replace` synchronously during render causes a render cycle before the redirect fires. Should be in a `useEffect`. More importantly: students **can** publish tools (they land in COMMUNITY tier), so blocking them from the Refiner entirely is incorrect — they should see their own drafts just like educators do.

**Fix:**
```tsx
useEffect(() => {
  if (currentUser.role === 'STUDENT') router.replace('/build')
}, [currentUser.role, router])
```
Then remove the student role guard entirely once the redirect logic is corrected.

---

### 5. `mergeSpec` comment reveals a prompt engineering smell

`BuilderLayout.tsx` line 62:

```tsx
// Once ready, never go back — Claude often resets to false on follow-up turns
ready: previous.ready || incoming.ready || false,
```

The AI is returning `ready: false` in follow-up turns, forcing a defensive client-side override. This means the spec's `ready` flag is not reliable as an AI output — the client is patching around an inconsistent model behavior. The spec should be treated as **additive**: the client holds authoritative state, AI outputs are patches, not replacements. `mergeSpec` is doing the right thing but it's compensating for a structural prompt issue.

**Fix:** In the builder system prompt, instruct Claude to omit `ready` from follow-up responses entirely. Only emit it on the final turn when the tool is genuinely complete.

---

### 6. Collaborator's Sandy review uses the global concierge endpoint without guaranteed routing

`build/collaborator/page.tsx` lines 95–110 — `SandyReviewPanel` calls `/api/concierge` with a custom `mode: 'collab_review'` flag:

```tsx
body: JSON.stringify({
  messages: history,
  currentPage: '/build/collaborator',
  mode: 'collab_review',
  reviewContext: { toolName, toolDescription },
})
```

If the concierge API doesn't have a specific `case` for `mode: 'collab_review'`, Sandy will respond with her generic page-aware system prompt rather than a structured review protocol. This needs to be verified and hardened — a dedicated `/api/collab/review-chat` route would be cleaner and testable in isolation.

---

### 7. Three pages fetching the same drafts endpoint

| Page | Fetch |
|---|---|
| `/build/page.tsx` line 74 | `GET /api/tools?published=draft&creator=me` |
| `/build/refiner/page.tsx` line 38 | `GET /api/tools?published=false&creatorEmail=...` |
| `/build/collaborator/page.tsx` line 351 | `GET /api/tools?published=false&creatorEmail=...` |

Three independent fetches for the same data. Once the refiner is eliminated and collaborator is consolidated, this becomes one fetch.

---

### 8. Prompt text lost on Back navigation

When a user types in the hero textarea on `/build` and navigates to `/builder`, the typed text is URL-encoded in the query string. If they press Back, the textarea is empty again — the in-progress prompt is gone. No draft persistence.

**Fix:** Persist `buildPrompt` to `sessionStorage` on change. Restore it on mount if present.

---

## UX / Strategic Findings

### The core problem: four surfaces for one mental job

A user building a tool today follows this path:

```
/build → type prompt → [navigate] → /builder → build tool →
[navigate back] → /build → scroll to Refiner card → [navigate] →
/build/refiner → click "Continue Editing" → [navigate] → /publish
```

**4 navigations** for a single creative workflow. Every navigation is a context switch that interrupts creative momentum. The mental model users want is: **one place where I make things.**

---

### Section order on `/build` is backwards for educators

The **Course Build Workspace** (AI gap analysis) is the highest-value feature on this page for the primary user — educators. It currently sits as the **4th section**, buried below:

1. Hero prompt box (large)
2. Playground CTA card
3. Experience type gallery (8 tabs)
4. ← Course Build Workspace (AI gap analysis)

An educator landing on `/build` has to scroll past three sections before reaching the tool that analyzes their course and surfaces what's missing. This is the **signature differentiator** of the build experience — it should be the first thing educators see.

**Recommended section order:**
1. Course Build Workspace (for educators) / Hero prompt (for students — role-aware)
2. Experience type gallery
3. Playground CTA (smaller, secondary)
4. Drafts + Bounties

---

### "Refiner" and "Collaborator" are named for the system, not the user

| Current name | What users think | Better name |
|---|---|---|
| Refiner | Unclear — refine what? | My Drafts |
| Collaborator | Abstract | Get Feedback / Peer Review |
| Builder | Reasonably clear | Build (consistent with nav) |

These two entry-point cards are also buried **below** the drafts list and bounties section on `/build` — the least visible position on the page. They should be tabs or section headers, not cards you discover by scrolling.

---

### The 3-message minimum in Collaborator is a good guardrail — but invisible

`build/collaborator/page.tsx` lines 712–724 — the counter "Send 2 more messages to unlock feedback" only appears after the user has already started the chat. A new user opening a review request has no idea this requirement exists.

**Fix:** Show a visible orientation note **before** the first message:
> *"Try the tool for a few exchanges first — you'll be able to give feedback after 3 messages."*

---

### Students are treated as second-class builders

- `/build/refiner` redirects students away entirely (incorrectly — students can publish to COMMUNITY)
- The `/build` hero copy switches to a student variant but doesn't change the **layout** — the Course Build Workspace still shows a course selector for students, which is mostly empty and confusing
- The Collaborator tab defaults to "Review Others" for students (correct) but hides "Request Review" — students can't ask for feedback on their own drafts

**Fix:** Students should have full access to Refiner (their drafts), and the Course Build Workspace should either be hidden for students with no enrolled courses or replaced with a "Build for the Community" CTA.

---

## Recommended Implementation Plan

### Phase 1 — Quick wins (no architecture change, ~1 day)

| Item | File | Change |
|---|---|---|
| Delete `/build/refiner` | `build/refiner/page.tsx` | Redirect to `/build`; absorb timestamp + "Refine with AI" button into `/build` drafts section |
| Fix student redirect | `build/refiner/page.tsx` | Move `router.replace` into `useEffect`; remove student role gate |
| Reorder sections | `build/page.tsx` | Course Build Workspace → Gallery → Playground CTA → Drafts |
| Rename entry cards | `build/page.tsx` | "Refiner" → "My Drafts", "Collaborator" → "Get Feedback" |
| Prefetch builder | `build/page.tsx` | `router.prefetch('/builder')` on textarea focus |
| Persist prompt | `build/page.tsx` | `sessionStorage` save/restore for `buildPrompt` |
| Collaborator onboarding hint | `build/collaborator/page.tsx` | Show 3-message requirement before first send |

### Phase 2 — Route consolidation (~2–3 days)

- `/build` becomes a three-tab page: **Create \| My Drafts \| Peer Review**
- Submitting a prompt from Create tab opens an inline slide-up panel containing `BuilderLayout` — no page navigation
- `/builder` stays as the standalone full-screen route for deep-links and forks only
- Lazy session creation: `POST /api/builder/sessions` on first message sent, not on mount
- Single drafts fetch shared across all three tabs

### Phase 3 — Unified Build Studio (dedicated sprint)

- Single `/build` URL with a persistent left-rail workflow: **Discover → Create → Refine → Publish**
- The `/publish` form becomes "Advanced Settings" accessible from within the builder, not a separate page
- The three creation paths (Builder / Publish / Collaborator) are unified into one mental model
- Session creation tied to first meaningful interaction, not page load
- Role-aware layouts: educators see gap analysis first, students see community build framing

---

## Summary Scorecard

| Surface | Quality | Issue severity |
|---|---|---|
| `BuilderLayout.tsx` | Solid — clean split-pane, good mobile handling | Medium: premature session creation |
| `build/page.tsx` | Feature-rich but overloaded | Medium: section order, navigation hop |
| `build/refiner/page.tsx` | Duplicate — should not exist | High: delete and consolidate |
| `build/collaborator/page.tsx` | Best-in-class UX concept, well-built | Low: concierge mode verification, orientation hint |

The bones are excellent. The work is consolidation, not rewriting.
