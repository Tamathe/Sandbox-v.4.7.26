# Deploy & What's Next
### The Sandbox · Sprint 1 Handoff
### Date: 2026-03-18

---

## Deploy Checklist

Sprint 1 touched 6 files. No schema changes. No new dependencies. Safe to deploy as-is.

### Files Changed This Sprint
| File | What Changed |
|---|---|
| `app/components/ChatInterface.tsx` | Session summary panel (End Session → summary → rate → journal) |
| `app/page.tsx` | Empty dashboard fix + GENERIC_STUDENT reset + Get Started block |
| `app/components/ConciergePanel.tsx` | Sandy subtitle on tool pages |
| `app/components/StudentQuestWidget.tsx` | Claim button, tooltips, "Browse Tools" link, "Today's Goals" label |
| `app/signup/page.tsx` | Email help text, trust lines, Admin removed from dropdown, course-based referred step |
| `app/tools/page.tsx` | Course search shortcut, default sort → Most Used, Play tab tooltip |

### Pre-Deploy Verification (manual, ~10 min)
Walk through these in the browser as each demo user:

**As `tiana.the@uky.edu` (Student, first-time feel):**
- [ ] Home dashboard shows "Welcome to The Sandbox" Get Started block (not empty stats)
- [ ] Tools page shows course search bar above filters
- [ ] Tools page defaults to Most Used sort
- [ ] StudentQuestWidget shows "Today's Goals" and Claim button on completed quest
- [ ] Sand balance updates on claim, toast fires

**As `ian.mcclure.student@uky.edu` (Student, active user):**
- [ ] Home dashboard shows streak + sessions stats (totalSessions > 0)
- [ ] Open any tool → chat 2+ messages → click End Session
- [ ] Summary panel shows time, exchanges, XP — "Keep Chatting" dismisses, "Rate & Close" proceeds
- [ ] Rating → Journal → completes cleanly

**On any `/tools/[id]` page:**
- [ ] Sandy panel subtitle reads "Platform guide · different from the tool's AI"

**Signup flow `/signup`:**
- [ ] Email step shows UK email help text + trust line
- [ ] Profile confirm step: role dropdown has only Student / Educator (no Admin)
- [ ] Profile confirm step: interest label says "we guessed these"
- [ ] "My professor recommended a tool" intent → asks for course number, not tool name

### Deploy Command
```bash
cd "c:\AA Code\Educator marketplace\the-sandbox"
npm run build   # verify no build errors
# then deploy via your normal channel (Vercel / Railway / etc.)
```

---

## Sprint 2 — What's Next

These are the remaining items from the blueprint, ordered by impact.

### S2-1: Tool Card — Streamlined Launch (P1, ~4h)
**Problem:** Two clicks to launch (card → modal → Launch Tool button).
**Fix:** Convert tool launch modal to a bottom sheet / side drawer. Show only: name, 1-sentence description, star rating, full-width "Start →". Move upvote/favorite/fork to the post-session summary modal (already built in Sprint 1).
**Files:** `app/components/ToolLaunchModal.tsx`, `app/tools/page.tsx`

### S2-2: Post-Session Upvote Prompt (P1, ~2h)
**Problem:** Upvote/favorite buttons appear before the student has used the tool.
**Fix:** After the End Session → Rating flow completes, show a prompt: "Found this useful? Give it a thumbs up →" with upvote button. Wire to existing upvote API.
**Files:** `app/components/ChatInterface.tsx` — add to the `sessionJustCompleted` banner.

### S2-3: Fork Button Role-Gated (P2, ~1h)
**Problem:** Students see the GitFork "Customize" button on tool detail pages — confusing.
**Fix:** Show fork button only for `currentUser.role === 'EDUCATOR'`. For students, replace with "Save to Library" (heart icon).
**Files:** `app/tools/[id]/page.tsx`

### S2-4: Enrichment Loading — Student-Aware Steps (P2, ~3h)
**Problem:** Students see "Searching UK faculty directory" during enrichment — doesn't apply to them.
**Fix:** The enrichment API already infers role. Pass a `role` hint to the step labels so student-inferred flows show: "Checking your enrollment... → Identifying your college... → Suggesting interests..."
**Files:** `app/signup/page.tsx` (step label display), `app/api/onboarding/enrich-stream/route.ts`

### S2-5: Sandy Collapse Default on First Visit (P2, ~1h)
**Problem:** Sandy panel defaults to `open: true`. On first visit to a tool, two chat surfaces visible.
**Fix:** Read `localStorage.getItem('sandbox-sandy-seen')` — if null, default Sandy to closed with a labeled FAB: "Ask Sandy for help →". After first open, save the key and let open state persist.
**Files:** `app/components/ConciergePanel.tsx` — `useState(true)` → `useState(() => typeof window !== 'undefined' && !!localStorage.getItem('sandbox-sandy-seen'))`

### S2-6: "Sand" Currency Rename (Discuss First, ~2h if approved)
**Problem:** "Sand" is an internal metaphor that doesn't resonate with students.
**Options to decide before building:**
- **Blue Bucks** — ties to UK blue, familiar college feel
- **Wildcats** — mascot, immediately UK-branded
- **Keep Sand** — leans into The Sandbox identity, internal consistency
**If approved:** global find-replace across `StudentQuestWidget.tsx`, `page.tsx`, `tools/page.tsx`, database seed, any API responses.

### S2-7: Streak Grace Period Messaging (P3, ~30min)
**Problem:** Students don't know the streak has a grace period — causes anxiety.
**Fix:** Add one line to the streak tooltip (already added in Sprint 1) and to the first streak loss notification: "Your streak is protected for 24 hours — come back tomorrow to keep it going."
**Files:** `app/components/StudentQuestWidget.tsx` (already has the tooltip, just verify copy is there)

---

## Backlog — Sprint 3+

These require more planning or depend on Sprint 2 being shipped:

| Item | Notes |
|---|---|
| RAG + Gradebook integration | See `Blueprints/rag-gradebook-architecture.md` |
| Azure migration prep | See `Blueprints/azure-migration-plan.md` — build abstraction layers |
| UK Institutional AI Tools (8 dept chatbots) | See `Blueprints/uk-institutional-ai-tools.md` |
| Magic Signup — full enrichment for students | Needs UK student directory API access (pending) |
| Onboarding intent → real course routing | Needs course catalog API integration |

---

## Context for New Window

When opening a fresh Claude context for Sprint 2, paste this:

> We're building **The Sandbox** — an AI-powered educational tool marketplace for University of Kentucky (CATS-AI). Codebase: `c:\AA Code\Educator marketplace\the-sandbox\`. Architecture: `CLAUDE.md`. Tool registry: `TOOLS-REGISTRY.md`. Sprint plans: `Blueprints/deploy-next-plan.md`.
>
> **State as of 2026-03-19:**
> - Build is **clean** (133 pages, 0 errors) — ready to deploy
> - XP, Quests, Bounties, and Sand currency are **hidden from the UI** (backend/DB intact)
> - The "Sand" rename discussion is open — no decision yet
> - Sandy (the concierge AI) keeps her name for now — separate from the currency question
> - Sandcastle experiences stay as-is
>
> **Sprint 2 priorities (in order):**
> 1. **S2-1** Single-click tool launch — remove `ToolLaunchModal`, make card a direct `<Link>` (`ToolCard.tsx`, `tools/page.tsx`)
> 2. **S2-2** Post-session upvote prompt — after rating completes, show thumbs-up CTA (`ChatInterface.tsx`)
> 3. **S2-3** Fork button hidden from students — show only to EDUCATOR role (`tools/[id]/page.tsx`)
> 4. **S2-4** Sandy collapsed by default on first tool visit (`ConciergePanel.tsx`)
>
> Start with S2-1.
