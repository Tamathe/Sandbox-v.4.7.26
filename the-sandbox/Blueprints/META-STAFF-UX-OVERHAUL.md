# Meta-Blueprint: Staff Daily Experience Overhaul

> **Purpose:** This document is a *blueprint for building blueprints*. It defines the methodology, sequencing, scope boundaries, and handoff protocol for executing a 4-scope UX overhaul of the Staff experience in the platform, driven by the Morgan Rivera day-in-the-life audit.
> **Origin:** UX audit conducted 2026-03-26, covering 18 friction points across Morgan's full workday.
> **Methodology:** Focused builds — each scope gets its own detailed blueprint, architecture doc, and chunked execution plan with 2-task handoff prompts for Claude Code agents.

---

## The Problem

The staff experience covers ~70% of Morgan's operational needs but fails at the connective tissue: triage speed, workflow continuity, time-awareness, and action density. The audit identified 18 friction points scoring an average of 5.4/10 across 12 dimensions.

## Agreed Decisions (From Phase 1 Scoping)

| Decision | Resolution |
|---|---|
| Scope structure | 4 focused builds, not one mega-sprint |
| KPI strip | Micro traffic lights per tile, not single tri-state |
| Time-aware briefing | Option C: cached morning + lightweight delta section |
| Sandy panel | **Stays open.** Sandy is persistent w-96. Never collapse. Sandy is the future primary interface. |
| Inline policy in approvals | Sandy-mediated (pre-populate concierge with action context) rather than dedicated inline RAG |
| Batch action design | Checkbox + floating bar; confirmation modal for audit-sensitive items; same-person batch delegation; snooze = temporary removal + return at same priority |
| Out of scope (all scopes) | Document collaboration, travel/expense integration, Google Docs-style co-editing |

## Success Metrics

1. **Orientation speed:** Morgan goes from "open the platform" to "know what's on fire" in <5 seconds
2. **Triage throughput:** 12 action items processed in <8 minutes with batch operations
3. **Time-awareness:** The 5 PM homepage shows meaningfully different state than 8 AM
4. **Workflow continuity:** Zero additional page navigations to check a policy during an approval

---

## The Four Scopes

### Scope A: Time-Aware Briefing & Triage Dashboard
**Audit Steps:** 1, 2, 14
**Theme:** Make the staff homepage a living instrument, not a morning snapshot.

| What Changes | Current State | Target State |
|---|---|---|
| KPI strip | Raw counts, no context | Micro traffic lights per tile (color + label + count) |
| Briefing narrative | Static morning generation, stale by noon | Morning cache + afternoon delta + evening wrap-up |
| Greeting | "Good morning" all day | Time-aware: morning/afternoon/evening variants |
| Sidebar | 7 cards, scroll zone, Sandy Recs buried at bottom | 3-card max: Next Up, Fires, Sandy Says (reordered) |
| Right sidebar structure | Action Center card duplicates left column | Remove redundant Action Center summary |

**Key Files (likely):** Staff homepage page, briefing API route, briefing service, staff homepage components (KPI strip, sidebar cards, briefing narrative).

**Dependencies:** None. Purely refactors existing staff homepage.
**Estimated Size:** Medium (1 blueprint, ~8-10 tasks, 4-5 handoff prompts)

---

### Scope B: Action Queue Power-Ups
**Audit Steps:** 3, 5, 6
**Theme:** Turn the action queue from a viewing list into a speed-triage machine.

| What Changes | Current State | Target State |
|---|---|---|
| List view | Click-to-open only | Checkbox column + inline audit trail (submitter + age) |
| Batch operations | None | Floating action bar: Approve All, Delegate, Snooze 24h |
| Detail panel | No policy context | "Ask Sandy" button pre-loads action context into concierge |
| Approval labels | Generic "Approval" | Source-typed: "Communication Approval", "Purchase Approval" |
| Post-approval flow | Stranded on source page | Toast with "Next item?" link |
| Delegation | Only from detail panel | Available from list view via batch bar |
| Escalation | Manual navigation to find VP | Auto-escalate button when policy requires it |

**Key Files (likely):** Action queue component, action queue API, staff action service, detail panel component, Sandy concierge integration.

**Dependencies:** Scope A should land first (the homepage layout changes affect where the action queue card sits), but Scope B can be built in parallel on the action queue page itself.
**Estimated Size:** Medium-Large (1 blueprint, ~10-12 tasks, 5-6 handoff prompts)

---

### Scope C: Committee Workflow Overhaul
**Audit Steps:** 7, 8, 9
**Theme:** Shift committees from a records archive to a meeting lifecycle tool.

| What Changes | Current State | Target State |
|---|---|---|
| Committee detail hero | Static info | "Next Meeting" hero: date, time, draft agenda, attached docs, "Prep with Sandy" |
| Agenda management | Doesn't exist | Editable agenda on next meeting card |
| Generate Minutes tab | Always visible, post-hoc only | Hidden until meeting marked complete; pre-populated from live notes |
| Live notes | Doesn't exist | Markdown editor with timestamps, auto-feeds minutes generation |
| Generated minutes | One-shot AI output, full replace on edit | Section-editable; "Revise this section" per block |
| Action item extraction | Text only, not linked to users | Auto-linked to committee members; confirm assignments before finalizing |
| Distribution | No preview, sends to unknown list | Preview recipients + email content before send |
| Cross-committee view | Doesn't exist | "All my action items across all committees" aggregation (could be a tab on /tasks or a widget) |

**Key Files (likely):** Committee detail page, committee meeting components, minutes generation service, committee API routes, committee action items.

**Dependencies:** Independent of A and B. Can be built in parallel.
**Estimated Size:** Large (1 blueprint, ~14-16 tasks, 7-8 handoff prompts)

---

### Scope D: Platform Chrome & Staff Navigation
**Audit Steps:** 15, 17 (Sandy step 16 is OUT — Sandy stays open)
**Theme:** Make the navigation staff-shaped and the Hub staff-useful.

| What Changes | Current State | Target State |
|---|---|---|
| Header nav | 11 links, role-agnostic structure | Staff sees 2 tiers: Primary (Home, Action Center, Hub, Sandy) + Secondary dropdown |
| Irrelevant links | Courses, Build, AI Literacy visible to staff | Hidden for STAFF role (accessible via Hub if needed) |
| Mobile nav | 11+ items in hamburger, no hierarchy | Grouped: primary tier visible, secondary in expandable section |
| Hub hero | "Tasks & Action Center" — redundant | Hidden for staff; replaced with "Your Toolkit" grid |
| Hub lanes | 14 lanes, 73 irrelevant tools visible | Staff sees 5-6 relevant lanes; "Your Toolkit" (8 most-used tools) at top |
| Hub recommendations | Buried below carousels | Elevated to top of Hub for staff role |

**Key Files (likely):** Header/nav component, Hub page, Hub lane configuration, role-based filtering logic.

**Dependencies:** Independent of A, B, C. Can run in parallel.
**Estimated Size:** Medium (1 blueprint, ~8-10 tasks, 4-5 handoff prompts)

---

## Execution Methodology: How to Use AI Agents Across 4 Scopes

### Principle 1: One Blueprint Per Scope, Written Before Any Code

Each scope gets a full blueprint document (like this project's existing blueprints — see `ENGAGEMENT-FINGERPRINT-ENGINE.md` for the gold standard). The blueprint contains:

```
1. Context & motivation (what's broken, why it matters)
2. Schema changes (new models, field additions — exact Prisma blocks)
3. API routes (path, method, request/response shape, auth guard)
4. Component hierarchy (parent → child tree, props, state)
5. Service functions (name, signature, logic description)
6. Integration points (what existing systems does this touch?)
7. Seed data changes (if any)
8. Files to create vs. files to modify (explicit list)
```

**Why before code:** The blueprint is the contract. Every handoff prompt references it. If a Claude Code agent needs to make a judgment call, the blueprint is the tiebreaker. Without it, agents drift.

### Principle 2: Two-Task Handoff Chains

Each blueprint is decomposed into sequential 2-task chunks. Each chunk produces a **handoff prompt** — a self-contained markdown code block that a fresh Claude Code instance can execute without any prior conversation context.

**Why 2 tasks?**
- 1 task = too granular, excessive overhead from context-loading between sessions
- 3+ tasks = risk of compounding errors; if task 2 goes wrong, task 3 builds on a broken foundation
- 2 tasks = the sweet spot. Enough work to be meaningful. Small enough to verify before continuing.

**Handoff prompt structure:**
```markdown
## Context
[What the project is, what's been built so far, link to blueprint]

## Goal
Execute ONLY these 2 tasks, then STOP:
1. [Task with exact file paths and technical approach]
2. [Task with exact file paths and technical approach]

## Specs
[Exact details: data models, component signatures, API shapes]

## Verification
[How to confirm these 2 tasks are done correctly]

## Next Link
When done, generate the next handoff prompt for Tasks [N+1] and [N+2]
using the blueprint at [path]. Include updated context reflecting
what you just built.
```

### Principle 3: Sequential Within a Scope, Parallel Across Scopes

```
Week 1:  [Scope A: Tasks 1-2] ──→ [A: Tasks 3-4] ──→ [A: Tasks 5-6] ...
         [Scope C: Tasks 1-2] ──→ [C: Tasks 3-4] ──→ [C: Tasks 5-6] ...

Week 2:  [Scope B: Tasks 1-2] ──→ [B: Tasks 3-4] ──→ ...
         [Scope D: Tasks 1-2] ──→ [D: Tasks 3-4] ──→ ...
```

Scopes A+C have no dependencies on each other — run them in parallel (two Claude Code sessions on different days or even different worktrees if you're ambitious).

Scope B benefits from Scope A landing first (homepage layout), so start B after A completes.

Scope D is fully independent — run it whenever.

**Recommended execution order:**
1. **Scope A** (Time-Aware Briefing) — highest impact, smallest blast radius
2. **Scope C** (Committee Overhaul) — independent, can overlap with A
3. **Scope B** (Action Queue) — depends on A's layout changes
4. **Scope D** (Nav & Hub) — independent, lowest urgency, do last

### Principle 4: Blueprint → Codebase Verification → First Handoff

Before generating the first handoff prompt for any scope, the blueprint-writing session must:

1. **Read the actual current files** that will be modified (not assumptions from memory)
2. **Verify the Prisma schema** for any models referenced
3. **Confirm component hierarchies** by reading the actual page files
4. **List every file to touch** with current line counts so handoff prompts reference real paths

This prevents the #1 failure mode of AI-agent chains: **blueprint drift** — where the blueprint describes code that doesn't match the actual codebase, and every handoff prompt propagates the error.

### Principle 5: Verification Gates Between Handoffs

After each 2-task handoff completes, before generating the next:

1. **Type check:** `npx tsc --noEmit` must pass
2. **Lint:** `npm run lint` must pass
3. **Visual check:** Load the affected page in the browser and confirm the change is visible
4. **No regressions:** Existing functionality on the page still works

If a handoff introduces a type error or lint failure, the *next* handoff prompt must include "Fix the following issues before proceeding" as Task 0.

### Principle 6: The Blueprint Author Session vs. Builder Sessions

| | Blueprint Author (this conversation pattern) | Builder (handoff executor) |
|---|---|---|
| **Goal** | Design, scope, decompose, generate handoff prompts | Execute exactly 2 tasks, verify, generate next handoff |
| **Reads** | Audit doc, codebase, schema, existing blueprints | Blueprint + previous handoff context + specific files |
| **Writes** | Blueprint doc, first handoff prompt | Code + next handoff prompt |
| **Judgment calls** | Yes — resolve ambiguity, make architectural decisions | Minimal — follow the blueprint; escalate if ambiguous |
| **Session length** | Long (full architecture discussion) | Short (2 tasks + verification) |

**The key insight:** The Blueprint Author session (what we're doing now) is where all the thinking happens. The Builder sessions should be nearly mechanical — the blueprint removes ambiguity so the builder can execute without re-deriving intent.

---

## Scope Build Order & Blueprint Generation Plan

| Phase | Action | Output |
|---|---|---|
| **Now** | Finalize this meta-blueprint | `META-STAFF-UX-OVERHAUL.md` (this file) |
| **Next** | Write Scope A blueprint (full architecture) | `STAFF-BRIEFING-TIME-AWARE.md` |
| | Write Scope C blueprint (can be parallel) | `COMMITTEE-WORKFLOW-OVERHAUL.md` |
| **Then** | Write Scope B blueprint | `ACTION-QUEUE-POWER-UPS.md` |
| | Write Scope D blueprint | `STAFF-NAV-AND-HUB.md` |
| **Per blueprint** | Generate chunked handoff prompts (2 tasks each) | Appended to each blueprint OR separate handoff files |

---

## What Each Blueprint Must Answer

Before a blueprint is considered "ready for handoff generation," it must answer these 12 questions:

1. **What pages are affected?** (exact routes)
2. **What API routes are created or modified?** (path, method, auth guard)
3. **What schema changes are needed?** (exact Prisma model additions/modifications)
4. **What service functions are created or modified?** (file path, function name, signature)
5. **What components are created or modified?** (file path, component name, props interface)
6. **What existing components are deleted or replaced?** (cleanup list)
7. **What seed data changes are needed?** (for demo users to see the feature)
8. **What Sandy tools or context are affected?** (concierge system prompt, tool registry)
9. **What's the data flow?** (user action → component → API → service → DB → response → UI update)
10. **What are the error states?** (loading, empty, error, partial data)
11. **What are the edge cases?** (no action items, no meetings today, budget data missing)
12. **What does "done" look like?** (acceptance criteria per task)

---

## Appendix: The Original Audit Scorecard

| Dimension | Score | Scope |
|---|---|---|
| Morning Orientation | 8/10 | A |
| Action Triage | 6/10 | B |
| Budget Management | 5/10 | B (partial — annotation only) |
| Policy Lookup | 7/10 | B (inline in approvals) |
| Communications | 7/10 | B (approval chain flexibility) |
| Committee Work | 5/10 | C |
| Survey Intelligence | 6/10 | Future scope |
| Task Management | 5/10 | B + C (unified aggregation) |
| End-of-Day | 3/10 | A |
| Navigation | 4/10 | D |
| Sandy Integration | 6/10 | A + B (contextual, not collapsed) |
| Hub Experience | 4/10 | D |

**Target:** Every dimension at 7/10+ after all 4 scopes ship.
