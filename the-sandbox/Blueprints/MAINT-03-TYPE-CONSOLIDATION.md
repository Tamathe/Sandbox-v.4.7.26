# Blueprint: Type Definition Consolidation

> **Sprint Scope:** Eliminate 15 groups of duplicate type definitions by establishing canonical exports and importing everywhere.
> **Estimated Size:** Medium (1 prompt, ~30 min)
> **Origin:** Duplication Audit, 2026-03-28

---

## Context

Different AI sessions independently defined the same types, creating 15 groups of duplicates across 60+ files. The worst offender is the chat `Message` type (13+ identical definitions). Most consolidations are mechanical: pick the canonical location, export from there, delete the local copies, update imports.

---

## Implementation

### Priority A — High duplication count, trivial to fix

**A1. Chat `Message` type (13+ files)**
- **Canonical location:** `app/lib/types.ts`
- **Shape:** `{ id: string; role: 'user' | 'assistant'; content: string }`
- **Action:** Add to `app/lib/types.ts`. Delete local definitions in all 13+ files. Update imports.
- Files: `ChatInterface.tsx`, `StudyBuddyInterface.tsx`, `SandyInterviewPanel.tsx`, `BuilderChatPanel.tsx`, `ToolBuilderChat.tsx`, `assignments/WorkspaceToolPanel.tsx`, `workshop/[slug]/page.tsx`, `research-hub/[slug]/page.tsx`, `campus-navigator/[slug]/page.tsx`, `student-services/[slug]/page.tsx`, `student-services/academic-advisor/page.tsx`, `concierge/concierge-utils.ts`

**A2. `RubricCriterion` + `RubricBand` (7 + 5 files)**
- **Canonical location:** `app/components/courses/course-types.ts`
- **Shape:** `RubricBand { id, label, minPoints, maxPoints, description }` and `RubricCriterion { id, title, description|null, maxPoints, order?, bands: RubricBand[] }`
- **Action:** Add both to `course-types.ts`. Delete local copies in all assignment pages/components.
- Files: `assignments/[id]/page.tsx`, `courses/[id]/assignments/page.tsx`, `courses/[id]/assignments/new/page.tsx`, `AssignmentWorkspace.tsx`, `WorkspaceToolPanel.tsx`, `SubmissionPanel.tsx`, `AssignmentBrief.tsx`, `GradingPanel.tsx`

**A3. `PreflightData` (3 hooks, byte-for-byte identical)**
- **Canonical location:** `app/lib/types.ts` as `ToolPreflightData`
- **Shape:** `{ user: { name, email, role, department: string | null } }`
- **Action:** Export from types.ts. Import in `useTeamAnalyzer.ts`, `useSentimentAnalyzer.ts`, `useContractDrafter.ts`.

**A4. `UserRole` (3 files)**
- **Canonical location:** `app/lib/types.ts` (already there)
- **Action:** Delete re-definition in `app/lib/agent/agent-types.ts` and import from `types.ts`. Change `app/lib/enrichment/types.ts` to `type EnrichmentUserRole = UserRole | 'UNKNOWN'`.

### Priority B — Medium count, straightforward

**B1. `Announcement` (2 files, identical shape)**
- **Canonical location:** `app/lib/types.ts`
- **Shape:** `{ id, title, message, tone, dismissible }`
- **Action:** Export from types.ts. Delete from `PlatformAnnouncementBanner.tsx` and `student-home/AnnouncementsBanner.tsx`.

**B2. `Course` (4 files, 2 identical)**
- **Canonical location:** `app/components/courses/course-types.ts` (already has full Course type)
- **Action:** Delete local `Course` types in `NoteEditor.tsx` and `notes/page.tsx`. Import from `course-types.ts`. Fix `faculty-intelligence/page.tsx` to use `title` not `name`.

**B3. `SessionSummary` (2 files, identical)**
- **Action:** Export from `research-hub/SessionSidebar.tsx`. Import in `research-hub/[slug]/page.tsx`.

**B4. `ActionItem` (4 files, 2 domains)**
- **Staff domain:** Import `ActionItem` from `ActionItemRow.tsx` in `StaffHomepage.tsx`.
- **Analytics domain:** Import from `action-panel-service.ts` in `useFacultyIntelligence.ts`.

### Priority C — Structural improvements

**C1. `ServiceResult<T>` generic (14+ inline definitions)**
- **Canonical location:** `app/lib/types.ts`
- **Shape:** `type ServiceResult<T = void> = { success: true } & T | { error: string; status: number }`
- **Action:** Add to types.ts. Update return types in all `app/lib/messages/*` service files, `canvas-grade-service.ts`, `syllabus-architect/ai-map-service.ts`.

**C2. `User` / `UserProfile` overlap**
- **Action:** Refactor `UserProfile` to extend/pick from `User`: `type UserProfile = Pick<User, 'id' | 'name' | 'email' | 'role' | ...> & { tools: ..., favorites: ..., _count: ... }`

**C3. `Assignment` (3 diverging definitions)**
- **Action:** Create `BaseAssignment { id, title, description, type, dueAt, pointsPossible, isPublished }` in `course-types.ts`. Each context extends with its specific fields.

**C4. `CourseContext` (3 files)**
- **Action:** Merge into one type in `app/lib/types.ts` with optional fields. Import in all 3 service files.

**C5. Name collisions (no merge, just rename)**
- `WorkflowStep` in `WorkflowProgress.tsx` → rename to `AgentWorkflowStep`
- `StudentProfile` in `app/page.tsx` → rename to `StudentDashboardData`

---

## Execution Order

1. Add all canonical types to `app/lib/types.ts` and `course-types.ts`
2. Priority A (4 groups, ~30 files) — biggest duplication wins
3. Priority B (4 groups, ~10 files) — straightforward imports
4. Priority C (5 groups, ~20 files) — structural refactors
5. `npx tsc --noEmit` after each priority level

---

## Risk

**Low.** Type-only changes — no runtime behavior change. The main risk is missing an import somewhere, which TypeScript will catch immediately.

## Acceptance Criteria

- [ ] `ChatMessage` defined in exactly one place, imported in 13+ files
- [ ] `RubricCriterion` and `RubricBand` defined in exactly one place
- [ ] `PreflightData` defined in exactly one place
- [ ] `UserRole` defined in exactly one place (enrichment extends it)
- [ ] No duplicate type definitions with identical shapes remain
- [ ] `ServiceResult<T>` generic replaces inline `{ success, error }` patterns
- [ ] TypeScript compiles clean
