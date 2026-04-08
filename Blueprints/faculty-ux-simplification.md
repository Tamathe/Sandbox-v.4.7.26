# Faculty UX Simplification Sprint

**Goal:** Make the build experience intuitive enough for a middle-aged faculty member who's never used AI to get on and very quickly understand how the system works.

**Scope:** 6 UI/UX changes. Zero schema changes. Zero new API routes.

**Video (out of scope):** User will create a 60-second muted screen recording for the onboarding modal showing: prompt → AI building → student using tool.

---

## The 6 Changes

### Change 1: Merge Build → Publish into One Flow
**Complexity: Large**

**Problem:** Faculty build a tool in the Builder (chat + preview), then must navigate to a separate 5-step `/publish` form to finalize — two entirely different interfaces for one task.

**Solution:** After the Builder creates the tool, show a "Review & Publish" screen *inside* the same `BuilderLayout` flow.

**New component:** `ReviewPublishPanel.tsx`
- Accepts `spec: BuilderSpec`, `sessionId`, `documents`, `onPublish`, `onBack`
- Scrollable summary card with sections: Name, Description, Tool Type, System Prompt (collapsed/expandable), Welcome Message, Starter Questions, Learning Objectives, Difficulty, Audience
- Each section has a pencil icon → inline text editing (not a modal)
- Course-linking dropdown (reuses existing fetch pattern)
- Big "Publish" button at bottom triggers `BuildMomentOverlay`

**State machine change in `BuilderLayout.tsx`:**
- Add `phase: 'building' | 'review' | 'published'` state
- When `spec.ready === true`, show "Review" button in top bar
- In review phase, right panel replaced by `ReviewPublishPanel`
- Clicking Publish triggers `BuildMomentOverlay` (same API call as today)

**What happens to `/publish`:**
- Keep alive as manual fallback (linked from "My Drafts")
- Remove "or use form" links from gap suggestions in `build/page.tsx`
- De-emphasized, not deleted

**Files:**
| Action | File |
|--------|------|
| Modify | `app/components/BuilderLayout.tsx` — add phase state, Review button, conditional render |
| Create | `app/components/ReviewPublishPanel.tsx` — inline review/edit component |
| Modify | `app/build/page.tsx` — remove "or use form" links from gap suggestions |

---

### Change 2: Replace 8 Experience Types with 3-Question Branching Flow
**Complexity: Medium**

**Problem:** Gallery shows 8 categories (Practice, Roleplay, Socratic, Writing, Tutoring, Reflection, Comprehension, Domain-Specific). Faculty who've never used AI don't know what these mean.

**Solution:** A 3-question "What do you want?" flow using their language:

| Step | Question | Options |
|------|----------|---------|
| Q1 | "What should students **do**?" | Answer questions · Practice a conversation · Write something · Get feedback on work |
| Q2 | "How structured?" | Freeform · Guided · Scored |
| Q3 | "How long?" | 5 min · 15 min · 30+ min |

Maps answers to 2–3 best-matching templates from existing `EXPERIENCE_CATEGORIES`. Shows recommended cards with "Use this" button + "None of these — describe your own" fallback.

**Mapping logic:** New `branchingTemplateMap` in `app/lib/branching-flow.ts` maps `{q1, q2, q3}` → best-matching templates from the 33 existing `ExperienceType` objects.

**Files:**
| Action | File |
|--------|------|
| Create | `app/components/BuildBranchingFlow.tsx` — the 3-question card UI |
| Create | `app/lib/branching-flow.ts` — mapping logic |
| Modify | `app/build/page.tsx` — replace experience gallery section with `<BuildBranchingFlow>` |

---

### Change 3: Make Hero Prompt Less Blank-Page Scary
**Complexity: Small**

**Problem:** Blank textarea with 3 small text pills below. Blank page = anxiety for someone who doesn't know what's possible.

**Solution — three additions:**

**a) Clickable example cards** (replace small pills):
```
┌─────────────────────────────────────────────┐
│ 💬  A Socratic tutor that quizzes on        │
│     contract law                             │
│                         Click to start →     │
└─────────────────────────────────────────────┘
```

**b) "Not sure" escape hatch:**
```
"I'm not sure yet — help me figure it out"
```
Opens Builder with: `"I'm not sure what I want to build yet. Help me figure out what kind of learning experience would work for my course."`

**c) Sentence builder** (above the textarea):
```
I want my students to [practice ▾] _______ by [answering questions ▾]
```
Dropdowns: verbs = practice, write, discuss, analyze, simulate. Methods = answering questions, role-playing, getting feedback, debating. Selecting fills the textarea.

**Files:**
| Action | File |
|--------|------|
| Modify | `app/build/page.tsx` — hero prompt section (lines ~168-237) |

---

### Change 4: Add Visible 4-Step Journey Map
**Complexity: Medium**

**Problem:** No persistent indicator showing where you are in the build process. Faculty don't know: Am I 20% done? What happens next?

**Solution:** Horizontal 4-step progress bar:

```
 ● Describe  ──→  ○ Refine  ──→  ○ Review  ──→  ○ Publish
```

| Step | Active When | Complete When |
|------|------------|---------------|
| Describe | On `/build` Create tab | `builderPrompt` is set |
| Refine | `BuilderLayout` open, chatting | `spec.ready === true` |
| Review | Review panel showing (Change 1) | User clicks Publish |
| Publish | `BuildMomentOverlay` running | `builtToolId` is set |

Current step = UK blue + bold. Completed = checkmark. Future = gray.

**Files:**
| Action | File |
|--------|------|
| Create | `app/components/BuildProgressBar.tsx` — the 4-step visual |
| Modify | `app/build/page.tsx` — render above hero prompt |
| Modify | `app/components/BuilderLayout.tsx` — render in top bar, derive step from phase |

---

### Change 5: Simplify Sandy's Modes During First Session
**Complexity: Large**

**Problem:** Sandy appears as onboarding guide, concierge panel, scroll-idle popup, cold-start nudger, page-aware helper, AND personality micro-moments — all simultaneously. New users can't form a mental model of who Sandy is.

**Solution — two distinct modes:**

**Guide Mode** (first session, before `firstToolBuilt`):
- New `SandyGuide.tsx` component renders *inline in main content* (not in sidebar)
- Sandy avatar + speech bubble with step-specific guidance
- All proactive popup triggers suppressed
- Appears at anchor points:
  - `/build` Create tab: "First time? Let me walk you through this..."
  - Inside `BuilderLayout`: "Great start! Try telling me about your course..."
  - Review step: "Almost there! Check everything looks right..."

**Assistant Mode** (after first tool built):
- Standard `ConciergePanel` sidebar behavior (unchanged)
- Proactive messages resume

**Implementation:**
- Add `isFirstSession(email): boolean` helper to `cold-start.ts`
- In `ClientProviders.tsx`: when `isFirstSession`, suppress scroll-idle triggers and pass `mode='guide'` context
- `ConciergePanel` accepts `disabled` prop — still renders toggle but doesn't auto-open

**Files:**
| Action | File |
|--------|------|
| Create | `app/components/SandyGuide.tsx` — inline guide component |
| Modify | `app/lib/cold-start.ts` — add `isFirstSession()` helper |
| Modify | `app/components/ClientProviders.tsx` — suppress proactive triggers when first session |
| Modify | `app/components/ConciergePanel.tsx` — accept mode/disabled prop |
| Modify | `app/build/page.tsx` — render `<SandyGuide>` conditionally |
| Modify | `app/components/BuilderLayout.tsx` — render `<SandyGuide>` conditionally |

---

### Change 6: Post-Build — One Clear Next Step
**Complexity: Small**

**Problem:** After building, faculty see 3 equal-weight CTAs (Try it now, Save to Library, Share). Three choices = decision paralysis after an unfamiliar accomplishment.

**Solution:**
```
┌─────────────────────────────────────────────┐
│          Try Your Tool  →                    │
│                                              │
│  You can share or save anytime from          │
│  your dashboard.                             │
└─────────────────────────────────────────────┘
```

One full-width UK blue button. Small gray helper text beneath. Course-linking section remains (separate concern).

**Files:**
| Action | File |
|--------|------|
| Modify | `app/components/BuilderLayout.tsx` — replace 3-button grid (lines ~629-766) with single CTA |

---

## Implementation Order

```
 Change 6 ──→ Change 3 ──→ Change 4 ──→ Change 1 ──→ Change 2 ──→ Change 5
 (Single    (Hero       (Progress   (Merge      (Branching  (Sandy
  CTA)       cards)      bar)        build/pub)  flow)       modes)
```

| Order | Change | Rationale | Depends On |
|-------|--------|-----------|------------|
| 1st | **6 — Single CTA** | Smallest change, immediate win | Nothing |
| 2nd | **3 — Hero prompt** | Small, improves first impression | Nothing |
| 3rd | **4 — Progress bar** | Creates infrastructure for Changes 1 & 5 | Nothing |
| 4th | **1 — Merge build/publish** | Large, uses progress bar step 3/4 | Change 4 |
| 5th | **2 — Branching flow** | Replaces gallery in same area as Change 3 | Change 3 |
| 6th | **5 — Sandy modes** | Touches most files, uses progress bar + review phase | Changes 1 & 4 |

---

## New Files Summary

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `app/components/ReviewPublishPanel.tsx` | ~200 | Inline review/edit of spec before publishing |
| `app/components/BuildBranchingFlow.tsx` | ~180 | 3-question "what do you want?" flow |
| `app/lib/branching-flow.ts` | ~80 | Maps branching answers → templates |
| `app/components/BuildProgressBar.tsx` | ~80 | 4-step visual progress indicator |
| `app/components/SandyGuide.tsx` | ~100 | Inline Sandy guide for first session |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Breaking `/publish` for users mid-draft | Medium | Keep `/publish` alive; only remove prominent links |
| Builder spec missing fields at Review step | Low | `ReviewPublishPanel` validates required fields before enabling Publish |
| Sandy guide conflicting with cold-start logic | Medium | Feature-flag guide mode; test with all 3 demo users |
| Branching flow doesn't map well to all 33 templates | Low | "Describe your own" fallback always available |
| Progress bar state sync between pages | Medium | Shared React context or derive from existing state |

---

## What's NOT Changing

- **Schema**: Zero Prisma migrations
- **APIs**: No new routes, no route changes
- **`/publish` route**: Stays alive as fallback
- **Builder AI (Haiku)**: Same model, same prompts
- **`BuildMomentOverlay`**: Same publish mechanism
- **Confetti on first build**: Stays
- **Cold-start 5-step tracking**: Stays (Sandy modes layer on top)
- **Course gap analysis**: Stays (just removing "or use form" link)
