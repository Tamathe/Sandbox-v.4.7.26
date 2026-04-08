# Evaluator Experience — Architecture Plan

**Audience:** UK Provost + VP Finance evaluating whether to invest in The Sandbox
**Delivery:** Live 10-min demo (presenter-led) + self-guided URL
**Core message:** "This is the AI-powered university of the future."
**First aha:** Build a working AI tool in 2–3 minutes
**Second aha:** Upload a syllabus → entire course becomes AI-powered

---

## Two Workstreams

### Workstream A: Evaluator Mode (new dedicated path)
### Workstream B: Default FTUE Cleanup (improve existing first-time experience)

---

## Workstream A: Evaluator Mode

### A1. Activation

**Trigger:** URL parameter `?evaluator=true` on any route, or direct navigation to `/evaluate`

**Implementation:**
- New `evaluatorMode` state in `auth-context.tsx` (boolean, defaults to false)
- Detected in `ClientProviders.tsx` via `useSearchParams().get('evaluator')`
- Once activated, persisted to `sessionStorage` key `sandbox-evaluator-mode` (survives page navigations within session, clears on tab close)
- When active:
  - `OnboardingModal` suppressed (never fires)
  - Cold Start proactives suppressed
  - Sandy scroll-idle triggers suppressed (same `isFirstSessionUser` pattern from UX sprint)
  - Demo mode launcher hidden

**Files to modify:**
| File | Change |
|------|--------|
| `app/lib/auth-context.tsx` | Add `evaluatorMode: boolean` to context, `setEvaluatorMode()`, detect from URL |
| `app/components/ClientProviders.tsx` | Read `evaluatorMode`, suppress OnboardingModal + Cold Start + Sandy proactives |

### A2. Evaluator Interstitial Page

**Route:** `/evaluate` (new page)
**Also triggered:** Landing on `/` with `?evaluator=true`

**Design:** Full-screen, minimal, high-impact. NOT a modal — a proper page.

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [CATS-AI Logo]                                         │
│                                                         │
│  THE SANDBOX                                            │
│  ─────────────                                          │
│  The AI-powered university platform                     │
│                                                         │
│  Faculty describe a learning experience.                │
│  The Sandbox builds it in minutes.                      │
│  Every course becomes AI-powered.                       │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │        Build your first AI tool  →              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  University of Kentucky · CATS-AI                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Blue gradient background (UK blue #0033A0 → sky-600), white text
- Single CTA: "Build your first AI tool →"
- Click → navigates to `/build?evaluator=true`
- Auto-sets `evaluatorMode = true` in auth context
- No header, no nav, no Sandy — just the message and the door
- 3-line value prop uses the narrative: describe → builds → AI-powered
- Subtle animation: text fades in staggered (0.3s intervals)

**New file:** `app/evaluate/page.tsx` (~60 lines)

### A3. Evaluator Build Experience

When evaluator lands on `/build?evaluator=true` (or `/build` with `evaluatorMode` active):

**Changes to `app/build/page.tsx`:**

1. **Hero prompt headline changes:**
   - Default: "What experience do you want to create for your students?"
   - Evaluator: "See how fast a faculty member can build an AI tool."

2. **Three pre-loaded prompt BUTTONS replace the example cards:**
   ```
   ┌──────────────────────────────────────────────┐
   │  🏥  A patient intake simulator for           │
   │      nursing students                         │
   │                          Click to build →     │
   └──────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────┐
   │  💼  A mock job interview coach for           │
   │      business students                        │
   │                          Click to build →     │
   └──────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────┐
   │  📖  A study buddy session on                 │
   │      Constitutional Law                       │
   │                          Click to build →     │
   └──────────────────────────────────────────────┘
   ```
   - Larger than default example cards (more padding, bigger text)
   - One click launches the builder with that prompt (same `openBuilderWithPrompt()`)
   - These replace the default 3 cards ONLY in evaluator mode

3. **Sentence builder and "not sure" option hidden in evaluator mode**
   - Evaluators don't need scaffolding — they need speed
   - The three buttons ARE the scaffolding

4. **Branching flow section hidden in evaluator mode**
   - Too many choices. Evaluators should click one button and go.

5. **Course Build Workspace hidden in evaluator mode**
   - No courses exist yet. Confusing.

**Implementation:** Conditional rendering gated on `evaluatorMode` from auth context.

**Files to modify:**
| File | Change |
|------|--------|
| `app/build/page.tsx` | Conditional hero text, evaluator prompt buttons, hide branching/workspace/sentence-builder |

### A4. Evaluator Post-Build Flow

After the tool is built and published, the evaluator sees a DIFFERENT post-build experience than regular users.

**Current flow (regular users):**
Build → "Try Your Tool →" → navigate to `/tools/[id]?launch=true`

**Evaluator flow:**
Build → "Try Your Tool →" → try the chatbot → **guided next-step banner**

**New component: `EvaluatorNextStep.tsx`**

After the tool is built and the evaluator tries it, a persistent banner appears at the bottom of the tool page:

```
┌─────────────────────────────────────────────────────────┐
│  ✨ You just built that in [X] minutes.                  │
│                                                         │
│  Now see what happens when faculty upload a syllabus.    │
│                                                         │
│  [ Upload a Syllabus → ]                                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Shows only in evaluator mode, on `/tools/[id]` page
- Timer starts from when evaluator first clicked "Build your first AI tool" on interstitial
- "Upload a Syllabus →" navigates to `/courses` with `?evaluator=true&action=create`
- The timer display is the proof point: "You just built that in 2 minutes."

**Implementation:**
- Track `evaluatorStartTime` in sessionStorage (set on interstitial CTA click)
- `EvaluatorNextStep.tsx` reads it, computes elapsed time, renders banner
- Appears after a 5-second delay (let them interact with the tool first)

**New file:** `app/components/EvaluatorNextStep.tsx` (~50 lines)

**File to modify:**
| File | Change |
|------|--------|
| `app/tools/[id]/page.tsx` | Render `<EvaluatorNextStep />` when evaluatorMode active |

### A5. Evaluator Syllabus Flow

When the evaluator clicks "Upload a Syllabus →":

**Route:** `/courses?evaluator=true&action=create`

**Changes to courses page:**
- If `evaluatorMode && action=create`: auto-open the "Create Course" modal
- Pre-fill course code with "DEMO-101" and title with "Introduction to AI in Education"
- After course creation, auto-open `CourseSetupWizard` (syllabus upload step)
- Evaluator uploads any PDF (or we provide a sample syllabus in `/public/sample-syllabus.pdf`)

**After syllabus parse completes:**
- The existing wizard shows "We created N materials from your syllabus"
- Then "Create AI Teaching Assistant" step
- This IS the second aha moment — a PDF became a full course with an AI tutor

**Evaluator summary banner after wizard completes:**
```
┌─────────────────────────────────────────────────────────┐
│  That's two AI tools from one syllabus.                  │
│                                                         │
│  Now see what students experience.                       │
│                                                         │
│  [ Switch to Student View → ]                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**"Switch to Student View →"** triggers user switch to Ian McClure (STUDENT) via `setCurrentUser()`

**Files to modify:**
| File | Change |
|------|--------|
| `app/courses/page.tsx` | Detect evaluator params, auto-open create modal |
| `app/components/courses/CourseSetupWizard.tsx` | After completion in evaluator mode, show summary banner |

**New file:** `app/components/EvaluatorSyllabusBanner.tsx` (~40 lines)

### A6. Evaluator Role Switching

After student view, a persistent floating bar appears:

```
┌─────────────────────────────────────────────────────────┐
│  👁️ Evaluator View    [Student ✓] [Educator] [Admin]     │
└─────────────────────────────────────────────────────────┘
```

**Design:**
- Fixed bottom bar, z-40, only in evaluator mode
- Shows which role is currently active (checkmark)
- Click any role → switches demo user + navigates to role-appropriate home
- Replaces the need to find the tiny avatar dropdown
- Subtle, doesn't block content (narrow height, semi-transparent bg)

**New component:** `EvaluatorRoleBar.tsx` (~60 lines)

**Integration:** Rendered in `ClientProviders.tsx` when `evaluatorMode` is active.

---

## Workstream B: Default FTUE Cleanup

### B1. Replace OnboardingModal with Inline Welcome

**Problem:** Three sequential interruptions (modal → card → Sandy) before the user sees the app.

**Solution:** Delete the forced OnboardingModal. Replace with:

1. **Welcome banner** (inline, dismissible) at top of home page:
   ```
   Welcome to The Sandbox, [FirstName].
   [Build your first tool →]  [Take a quick tour]  [✕]
   ```
2. "Take a quick tour" opens a lightweight slideout (reuses Sandy panel) with the 3 "How it works" steps
3. Dismissed via X or CTA click → sets localStorage key (same as before)

**Files to modify:**
| File | Change |
|------|--------|
| `app/components/OnboardingModal.tsx` | Rewrite as `WelcomeBanner.tsx` (inline, not modal) |
| `app/components/ClientProviders.tsx` | Replace modal trigger with banner trigger |
| `app/page.tsx` | Render WelcomeBanner at top of dashboard |

### B2. Consolidate Cold Start Hero + Educator Setup Banner

**Problem:** Two cards saying "create a course" in different styles.

**Solution:** One card. The Cold Start Hero stays (it's better designed). The Educator Setup Banner is removed.

**File to modify:**
| File | Change |
|------|--------|
| `app/page.tsx` | Remove Educator Setup Banner, keep Cold Start Hero only |

---

## New Files Summary

| File | Lines (est.) | Purpose |
|------|-------------|---------|
| `app/evaluate/page.tsx` | ~60 | Evaluator interstitial page |
| `app/components/EvaluatorNextStep.tsx` | ~50 | Post-build "now upload a syllabus" banner |
| `app/components/EvaluatorSyllabusBanner.tsx` | ~40 | Post-syllabus "switch to student view" banner |
| `app/components/EvaluatorRoleBar.tsx` | ~60 | Floating role-switch bar |
| `app/components/WelcomeBanner.tsx` | ~60 | Inline welcome (replaces OnboardingModal) |

## Modified Files Summary

| File | Changes |
|------|---------|
| `app/lib/auth-context.tsx` | Add `evaluatorMode` state + detection |
| `app/components/ClientProviders.tsx` | Suppress modal/proactives in eval mode, render EvaluatorRoleBar |
| `app/build/page.tsx` | Evaluator hero text, 3 prompt buttons, hide branching/workspace |
| `app/tools/[id]/page.tsx` | Render EvaluatorNextStep banner |
| `app/courses/page.tsx` | Auto-open create modal in eval mode |
| `app/components/courses/CourseSetupWizard.tsx` | Post-completion banner in eval mode |
| `app/page.tsx` | WelcomeBanner replaces modal, remove Educator Setup Banner |
| `app/components/OnboardingModal.tsx` | Deprecated (replaced by WelcomeBanner) |

## Schema Changes

**None.** All evaluator state lives in sessionStorage (ephemeral) and auth context (in-memory).

---

## Deployment Order

```
A1 (auth context) → A2 (interstitial) → A3 (build experience) → A4 (post-build)
                                                                       ↓
B1 (welcome banner) → B2 (consolidate cards)                    A5 (syllabus flow)
                                                                       ↓
                                                                 A6 (role bar)
```

| Phase | Tasks | Depends On |
|-------|-------|-----------|
| 1 | A1 (evaluator mode in auth) + A2 (interstitial page) | Nothing |
| 2 | A3 (evaluator build experience) + B2 (consolidate cards) | Phase 1 |
| 3 | A4 (post-build banner) + A5 (syllabus flow) | Phase 2 |
| 4 | A6 (role bar) + B1 (welcome banner) | Phase 3 |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Evaluator mode leaking into production UX | Medium | sessionStorage clears on tab close; no localStorage persistence |
| Syllabus upload failing during demo | High | Provide a tested sample PDF at `/public/sample-syllabus.pdf` |
| Builder AI taking too long (>2 min) | Medium | Pre-loaded prompts are tested to build fast; Haiku is fast |
| Role switch losing evaluator context | Low | evaluatorMode in sessionStorage survives user switches |
| Timer showing embarrassing number | Low | Only show "X minutes" if under 5 min; otherwise hide timer |
