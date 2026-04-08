# Parallel Blueprint Deployment Plan

> **Goal:** Deploy 38 unbuilt blueprints with maximum parallelism using isolated worktrees.
> **Strategy:** Build core features in isolated directories first, merge integration touchpoints after each wave.
> **Date:** 2026-04-03

---

## The Bottleneck Problem

Every blueprint creates its own isolated directory tree (`app/lib/X/`, `app/api/X/`, `app/components/X/`). These don't conflict. The conflicts happen in **7 shared integration files** that many blueprints touch:

| Shared File | Blueprints That Touch It | Risk |
|-------------|--------------------------|------|
| `concierge-service.ts` (PAGE_DESCRIPTIONS) | ~20 blueprints | HIGH — append-only, easy merge |
| `tool-registry.ts` (import + registerModule) | ~15 blueprints | HIGH — append-only, easy merge |
| `proactive-suggestions.ts` (new suggestion types) | ~12 blueprints | MEDIUM — type union + logic blocks |
| `briefing.ts` (data injection) | ~10 blueprints | MEDIUM — data gathering section |
| `StudentHomepage.tsx` | 7 student blueprints | HIGH — layout/ordering conflicts |
| `FacultyHomepage.tsx` + `homepage-aggregator.ts` | 4 faculty blueprints | MEDIUM — layout conflicts |
| `AnalyticsSubNav.tsx` (tab entries) | 3 blueprints | LOW — append-only |

**Solution:** Each agent builds ONLY its isolated directories. A dedicated integration wave merges all shared file changes after each batch.

---

## Dependency Graph

```
                         ENGAGEMENT FINGERPRINT (BUILT)
                                    |
                    +---------------+---------------+
                    |               |               |
            FACULTY-LOAD    LEARNING-WEATHER   CAMPUS-PULSE
            INTELLIGENCE        MAP            EARLY-WARNING
                    |                               |
                    +---> SANDY-BEHAVIORAL-META     |
                                                    |
                                            CURRICULUM-INTELLIGENCE
                                              (also needs CROSS-COURSE-CONCEPT-BRIDGE)

         FACULTY-HOMEPAGE-INTELLIGENCE
                    |
        +-----------+-----------+
        |           |           |
   DAY-LIFECYCLE  INLINE-    COURSE-COMM
                  ANALYTICS  ANNOUNCEMENTS

   BLUEPRINT-DEPT-STOREFRONTS
        |
   TOOL-DISCOVERY-BUILDER

   HANDOFF-SCOPE-C-TASK-7-8
        |
   HANDOFF-SCOPE-C-TASK-9-10

   STUDENT-RIGHT-NOW-CARD ----+
   STUDENT-TOMORROW-PREVIEW --+--> STUDENT-TIME-PHASE-HOMEPAGE
   STUDENT-FLASHCARD-QUICK-REVIEW --> STUDENT-JUST-STUDY-LAUNCHER
   STUDENT-SMART-GAP-PLANNER <-- STUDENT-DINING-INTEGRATION

   (All others: fully independent)
```

---

## Wave Plan — 6 Waves, 38 Blueprints

### Wave 1 — All Built (was 10, then 5)

> **Evaluated 2026-04-03.** All 10 features already built. No agents needed.

**All built (confirmed in codebase):**
- ~~CROSS-COURSE-CONCEPT-BRIDGE~~ — 2 models, `concept-bridge/` (4 lib files), `concept-bridge-tools.ts`, 4 API routes, 3 UI components
- ~~CURRICULUM-INTELLIGENCE-NETWORK~~ — 3 models, `curriculum-intel/` (6 lib files), `curriculum-intel-tools.ts`, 8 API routes, 4 UI components
- ~~CAMPUS-PULSE-EARLY-WARNING~~ — 2 models, `campus-pulse/` (3 lib files + extractors), `campus-pulse-early-warning-tools.ts`, 5 API routes, admin page, 5 UI components
- ~~POLICY-BLAST-RADIUS~~ — 2 models, `policy-blast/` (3 lib files), `policy-blast-tools.ts`, 4 API routes, admin page, 3 UI components
- ~~AGENTIC-OS-HANDOFFS~~ — 2 models, `agent/` (8 lib files), 7 API routes, browse+build pages, 7 UI components
- ~~STUDENT-ASSIGNMENT-WORKSPACE~~ — route, component, service all exist
- ~~STUDENT-STUDY-SHARE-LINKS~~ — join routes and join-code service exist
- ~~STUDENT-SANDY-USE-THIS-ACTION~~ — MessageActions, PinnedMessage, Toast fully built
- ~~BLUEPRINT-DEPARTMENT-STOREFRONTS~~ — department-service.ts, seed-departments.ts, hub storefront components
- ~~MEETING-MACHINE-COMMITTEE-INTEGRATION~~ — full elevation + committee service + 20+ API routes

**After Wave 1 — Integration merge:** Already wired (tools registered, pages described, proactive suggestions added).

---

### Wave 2 — Reduced to 1 Agent (was 6)

> **Evaluated 2026-04-03.** 5 of 6 features already built. Remaining 1 is fully isolated.

| # | Blueprint | Touches | Depends On | Est. Size |
|---|-----------|---------|------------|-----------|
| 1 | **LEARNING-WEATHER-MAP** | campus-map components | nothing | Large |

**Already built (removed from wave):**
- ~~FACULTY-HOMEPAGE-INTELLIGENCE~~ — `homepage-aggregator.ts` (7 sections), `FacultyHomepage.tsx`, `home-bundle` endpoint all exist
- ~~STUDENT-RIGHT-NOW-CARD~~ — `RightNowCard.tsx` deployed on student homepage (next class, email, deadline)
- ~~STUDENT-TOMORROW-PREVIEW~~ — `TomorrowPreview.tsx` deployed (schedule, walking time, prep hints, Sandy integration)
- ~~UNIVERSITY-SYSTEMS-INTEGRATION-HUB~~ — `university-systems-service.ts` (18 functions), 15 API routes, 10 Sandy tools, 7 tabbed integrations
- ~~ACTION-QUEUE-POWER-UPS~~ — `ActionQueueCard.tsx` with batch ops, priority filtering, delegate/snooze/resolve

**After Wave 2 — Integration merge:** Wire Learning Weather Map into `concierge-service.ts`, `tool-registry.ts`, `proactive-suggestions.ts`. One agent, ~10 min.

---

### Wave 3 — Reduced to 1 Agent (was 7)

> **Evaluated 2026-04-03.** 6 of 7 features already built. Remaining: 1 full build.

| # | Blueprint | Depends On (Wave) | Touches | Est. Size |
|---|-----------|-------------------|---------|-----------|
| 1 | **FACULTY-LOAD-INTELLIGENCE** | Eng. Fingerprint (BUILT) | `lib/faculty-load/` (new) | Medium |

**Already built (removed from wave):**
- ~~STUDENT-FLASHCARD-QUICK-REVIEW~~ — `FlashcardQuickReview.tsx`, `flashcard-quick-review-service.ts`, `/api/flashcards/due` + `/review` routes, wired into StudentHomepage
- ~~STUDENT-SMART-GAP-PLANNER~~ — `GapPlanCard.tsx`, `gap-planner.ts`, integrated into TodayTimeline
- ~~DAY-LIFECYCLE~~ — `day-lifecycle-service.ts` (18KB), `DaySummary.tsx`, `TomorrowPreview.tsx`, `CoursePrep.tsx`, 2 API routes, seed script
- ~~INLINE-ANALYTICS-STUDENT-INTELLIGENCE~~ — `InlineAnalyticsPanel.tsx`, engagement diagnostic API, wired into FacultyHomepage
- ~~STAFF-NAV-AND-HUB~~ — tiered nav in Header.tsx, `StaffToolkit.tsx`, staff hub config, mobile grouped drawer
- ~~TOOL-DISCOVERY-BUILDER-ENHANCEMENTS~~ — All 5 features complete: `course-tool-recommendations.ts` + widget, fork API (`/api/tools/[id]/fork`), "Build a tool" quick action, `ImportFromCoursePanel.tsx` + `FilesPanel.tsx` integration, builder pre-fill via query params

**After Wave 3 — Integration merge:** Wire Faculty Load Intelligence into shared files. One agent, ~10 min.

---

### Wave 4 — Reduced to 1 Agent (was 6)

> **Evaluated 2026-04-03.** 5 of 6 features already built. Remaining 1 is fully isolated.

| # | Blueprint | Depends On (Wave) | Touches | Est. Size |
|---|-----------|-------------------|---------|-----------|
| 1 | **SANDY-BEHAVIORAL-META-INTELLIGENCE** | Eng. Fingerprint (BUILT) | `lib/sandy-meta/` (new) | Large |

**Already built (removed from wave):**
- ~~STUDENT-DINING-INTEGRATION~~ — `dining-service.ts` (10 locations), `DiningWidget.tsx`, `/api/dining` + `/api/dining/menu`, Sandy `check_dining` tool
- ~~COURSE-COMMUNICATION-ANNOUNCEMENTS~~ — `CoursePost` + `CoursePostRead` models, `course-post-service.ts`, `CoursePostsFeed.tsx` on student homepage, `CoursePostComposer.tsx` on faculty homepage
- ~~HANDOFF-SCOPE-C-TASK-7-8~~ — `DistributionPreview.tsx` (Task 7), `my-actions` API + tab with count badge (Task 8)
- ~~STUDENT-JUST-STUDY-LAUNCHER~~ — `computeSmartStudyTarget` in `student-home-data.ts`, `handleSmartStudy` in `QuickActionChips.tsx` with all 5 action types (flashcard-quick-review, exam-prep, tutor, quiz, general-study)
- ~~CROSS-COURSE-GRADING-AND-RECOMMENDATIONS~~ — `grading-queue-service.ts`, `GradingQueue.tsx`, `/api/faculty/grading-queue`, `RecommendationDraft` model, `recommendation-draft-service.ts`, `RecommendationTable.tsx`, seed script

**After Wave 4 — Integration merge:** Wire Sandy Meta Intelligence into shared files (Header nav link). One agent, ~10 min.

---

### Wave 5 — Reduced to 2 Agents (was 5)

> **Re-evaluated 2026-04-03.** 3 of 5 features already built or redundant. Remaining: 2 full builds (can run in parallel).

| # | Blueprint | Depends On (Wave) | Touches | Est. Size |
|---|-----------|-------------------|---------|-----------|
| 1 | **STUDENT-JOURNEY-GENOME** | Eng. Fingerprint (BUILT) | `lib/journey/` (new) | Large |
| 2 | **PREDICTIVE-SPACE-ENROLLMENT** | Learning Weather Map (W2) | registrar pages | Large |

**Already built (removed from wave):**
- ~~STUDENT-TIME-PHASE-HOMEPAGE~~ — `TimePhase` type + `getTimePhase()`, `SECTION_ORDER` per phase, `PHASE_BG` gradients, night mode (5 sections only), visibility-change auto-detect
- ~~HANDOFF-SCOPE-C-TASK-9-10~~ — Tasks 1-8 complete, Task 9 Sandy integration in faculty-tools.ts (committee actions + context in agent-system-prompt), Task 10 UX polish
- ~~SYLLABUS-INTELLIGENCE~~ — Redundant with syllabus-architect/ (31 files: gap analysis, health, learning paths, AI recommendations, syllabus-drop-service). No separate build needed.

**After Wave 5 — Integration merge:** Wire 2 features into shared files. One agent, ~10 min.

---

### Wave 6 — All Built (was 2)

> **Re-evaluated 2026-04-03.** Both features already built. No agents needed.

**Already built:**
- ~~META-STAFF-UX-OVERHAUL~~ — `StaffHomepage.tsx` (380L), 62 staff components, StaffBriefingLayout, QuickActionsBar, ActionQueueCard, KPIStrip, BriefingInsightsCard, BudgetPulseCard, SandyRecommendationsCard, FiresCard
- ~~HANDOFF-SCOPE-C-TASK-7-8~~ — `DistributionPreview.tsx`, `my-actions` API + tab with count badge (confirmed built)

---

## Practical Execution Guide

### Per-Agent Prompt Template

Each agent should receive:

```
Build [BLUEPRINT-NAME] from `Blueprints/[FILE].md`.

Rules:
1. Create files ONLY in your own directories:
   - app/lib/[feature-name]/
   - app/api/[feature-name]/
   - app/components/[feature-name]/
   - app/[pages]/[feature-name]/
2. DO NOT modify these shared files (integration merge handles them):
   - concierge-service.ts
   - tool-registry.ts
   - proactive-suggestions.ts
   - briefing.ts
   - AnalyticsSubNav.tsx
   - StudentHomepage.tsx (unless this IS the homepage blueprint)
   - FacultyHomepage.tsx (unless this IS the homepage blueprint)
3. DO create Sandy tools file at app/lib/agent/tools/[feature]-tools.ts
   but DO NOT import it into tool-registry.ts
4. DO create your service, API routes, components, and pages
5. Export any integration hooks (buildSandyContext, buildBriefingBlock, etc.)
   from your main service file — integration merge will wire them
6. Follow existing patterns: withErrorHandling, requireEducatorUser, apiFetch,
   useAuth (currentUser), Tailwind v4, UK Blue #0033A0
7. Run `npx tsc --noEmit` filtered to your files before declaring done
```

### Integration Merge Prompt Template

After each wave:

```
Wire the following features into shared integration files:

Features to integrate: [list with Sandy tool file paths]

For each feature:
1. Import and register Sandy tools in tool-registry.ts
2. Add PAGE_DESCRIPTIONS entries in concierge-service.ts
3. Add proactive suggestion types in proactive-suggestions.ts
4. Add page starters in concierge-utils.ts
5. Wire briefing injection in briefing.ts (if applicable)
6. Add AnalyticsSubNav tab (if applicable)
7. Add homepage widget (if applicable)
8. Run full tsc --noEmit to verify zero errors
```

### Using Git Worktrees

For maximum safety, each Wave 1 agent runs in an isolated worktree:

```bash
# Create worktree per agent
git worktree add ../sandbox-cross-course-bridge feature/cross-course-bridge
git worktree add ../sandbox-curriculum-intel feature/curriculum-intelligence
git worktree add ../sandbox-campus-pulse feature/campus-pulse
# ... etc

# After all agents complete, merge sequentially
git checkout master
git merge feature/cross-course-bridge
git merge feature/curriculum-intelligence
# ... etc (resolve any conflicts in shared files)
```

---

## Summary

| Wave | Blueprints | Parallel Agents | Calendar Days |
|------|-----------|-----------------|---------------|
| **Wave 1** | All 10 built | 0 | — |
| **Wave 2** | LEARNING-WEATHER-MAP (built + integrated) | done | done |
| **Wave 3** | 1 remaining: FACULTY-LOAD-INTELLIGENCE | 1 | 0.5 day |
| Integration 3 | Wire 1 feature | 1 | 10 min |
| **Wave 4** | 1 remaining: SANDY-BEHAVIORAL-META-INTELLIGENCE | 1 | 0.5 day |
| Integration 4 | Wire 1 feature | 1 | 10 min |
| **Wave 5** | 2 remaining: JOURNEY-GENOME + PREDICTIVE-ENROLLMENT | 2 parallel | 1 day |
| Integration 5 | Wire 2 features | 1 | 10 min |
| **Wave 6** | All 2 built | 0 | — |
| **Total** | **4 remaining blueprints** (34 already built) | — | **~2 days** |

**34 of 38 blueprints are already built. 4 remain across Waves 3-5.**

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Schema conflicts (two agents add relations to Course model) | All schema changes go through a single migration after each wave |
| Shared file merge conflicts | Integration merge agent handles all shared files — never edited in parallel |
| Agent builds against stale code | Each wave starts from merged master |
| TypeScript errors accumulate | Each agent runs tsc on its own files; integration merge runs full tsc |
| Blueprint specs are stale | Agent reads blueprint + existing codebase patterns — adapts to current schema field names |
| Agent invents wrong patterns | Per-agent prompt template enforces existing conventions |
