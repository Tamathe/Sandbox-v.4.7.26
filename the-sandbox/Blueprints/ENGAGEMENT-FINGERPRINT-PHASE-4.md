# Handoff Prompt: Engagement Fingerprint Engine — Phase 4 of 6

## Context

You are continuing the **Engagement Fingerprint & Hyper-Personalization Engine** build for the platform — the AI-powered operating system of the University of Kentucky.

**Full architecture blueprint:** `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` — read this for the complete service architecture, computation logic, consumer integration specs, and Sandy context builder.

**Phase 1 is COMPLETE** — Schema (`EngagementFingerprint`, `CourseFingerprint` models), type definitions (`types.ts`), and 14 data fetchers (`data-fetchers.ts`).

**Phase 2 is COMPLETE** — 5 pure computation modules (`temporal.ts`, `learning.ts`, `engagement.ts`, `social.ts`, `responsiveness.ts`), engine orchestrator (`fingerprint-engine.ts`), and persistence service (`fingerprint-service.ts`).

**Phase 3 is COMPLETE.** Here is what was built:

### Phase 3 Deliverables (already on disk)

1. **3 API Routes:**
   - `app/api/fingerprint/me/route.ts` — `GET`, `requireRequestUser`, returns `{ fingerprint }` or `{ fingerprint: null, message: '...' }`
   - `app/api/fingerprint/course/[courseId]/route.ts` — `GET`, `requireEducatorUser`, returns course-level aggregate fingerprint
   - `app/api/fingerprint/refresh/route.ts` — `POST`, `requireRequestUser`, body `{ courseId? }`, refreshes user or course fingerprint. Role-checks educator/admin for course refresh.

2. **LearningProfileCard component** (`app/components/student-home/LearningProfileCard.tsx`):
   - Fetches from `GET /api/fingerprint/me` via `useEffect` + `fetch` (project doesn't use SWR)
   - 6-tile grid: Chronotype (colored badge), Cadence, Velocity (with trend icons), Social Style, Deadline behavior, Top Study Modes
   - Confidence meter (thin progress bar with percentage)
   - Loading skeleton, empty state ("Keep using the platform to build your profile")
   - All lucide-react icons, `size-X` format, `border rounded-2xl shadow-sm` card

3. **StudentHomepage wiring** (`app/components/student-home/StudentHomepage.tsx`):
   - `LearningProfileCard` added to `'learning-profile'` section
   - Section order: appears after `quick-actions` in morning/afternoon/evening phases
   - Not shown in night phase (not in night section list)

**All Phase 3 files pass `npx tsc --noEmit` with zero errors.**

**Key codebase conventions (from CLAUDE.md):**
- Prisma v7 with PrismaPg adapter. Import from `../generated/prisma`.
- Business logic in `app/lib/`, never in route files.
- Auth guards required on every route.
- Tailwind v4, lucide-react icons only, `size-X` not `w-X h-X`.
- Sandy visual standard: `bg-[#0033A0]` header, `bg-white border border-gray-100 rounded-2xl rounded-tl-sm` assistant bubbles.

## The Goal

**Execute ONLY these two tasks, then STOP:**

### Task 4A: Sandy Fingerprint Integration

Inject the user's fingerprint into Sandy's system prompt across 3 chat surfaces so Sandy can personalize her responses. This requires:

1. **Create `app/lib/fingerprint/sandy-context.ts`** — A helper that builds a natural-language fingerprint summary for Sandy's system prompt:
   ```typescript
   export async function buildFingerprintBlock(userId: string): Promise<string>
   ```
   - Calls `getFingerprint(userId)` from `fingerprint-service.ts`
   - Returns empty string if fingerprint is null or confidence < 0.2
   - Builds a `<learner-profile>` XML block containing:
     - Chronotype, peak hours (formatted as "9 AM, 2 PM, 8 PM"), session cadence
     - Sessions/week, avg session minutes
     - Preferred study modes, modality, learning velocity
     - Collaboration style, social orientation
     - Deadline behavior, nudge response rate, mastery retention
     - Profile confidence percentage
   - Appends behavioral instructions for Sandy (adapt suggestions to chronotype/cadence, respect solo/group preference, adjust pushiness based on nudge response rate, etc.)
   - Export a helper `formatHour(h: number): string` that converts 0-23 to "12 AM", "1 PM", etc.

2. **Modify `app/lib/concierge-service.ts`** — In the system prompt builder:
   - Import and call `buildFingerprintBlock(userId)`
   - Append the result to the system prompt (after existing page-context blocks)
   - This is Sandy's concierge (sidebar) — the primary chat surface

3. **Modify `app/lib/chat-service.ts`** — In the system prompt builder for tool chat:
   - Import and call `buildFingerprintBlock(userId)`
   - Append the result to the system prompt
   - This is Sandy's tool chat (ChatInterface)

4. **Create `app/api/fingerprint/sandy-context/route.ts`** — Internal `GET` route:
   - Auth: `requireRequestUser(req)`
   - Calls `buildFingerprintBlock(auth.user.id)`
   - Returns `{ context: string | null }`
   - This enables Study Buddy and other client-side surfaces to fetch fingerprint context

**Files to read first:**
- `app/lib/concierge-service.ts` — find where system prompt is built, look for existing context injection patterns (page context, personality lines, etc.)
- `app/lib/chat-service.ts` — find system prompt construction for tool chat
- `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` lines ~864-913 — the `buildSandyContext()` reference implementation

### Task 4B: Hub Personalization

Create a personalization layer that reorders tools within Hub swim lanes based on the user's fingerprint.

1. **Create `app/lib/fingerprint/hub-personalization.ts`**:
   ```typescript
   export async function personalizeHubOrder(userId: string, lanes: HubLane[]): Promise<HubLane[]>
   ```
   - Calls `getFingerprint(userId)` from `fingerprint-service.ts`
   - Returns lanes unchanged if fingerprint is null or confidence < 0.3
   - For each lane, scores tools based on:
     - **Modality match**: tool tags containing user's preferred modality → +2
     - **Collaborative match**: tool tagged 'collaborative' + high collaboration index → +1.5
     - **Study mode match**: tool slug matches preferred study mode → +3
     - **Chronotype-appropriate**: tools tagged 'quick' for sprint-resters, 'deep-work' for daily-grinders → +1
   - Sort tools within each lane by score (descending), preserving original order for ties
   - Return the reordered lanes

2. **Modify the Hub page or API to use personalization**:
   - Find where Hub lanes/tools are assembled (likely `app/lib/hub-config.ts` or the Hub page)
   - Wire `personalizeHubOrder()` into the tool ordering pipeline
   - If Hub is client-side only (no server route), create a thin API route or add personalization to an existing Hub endpoint

**Files to read first:**
- `app/lib/hub-config.ts` or similar — Hub lane definitions, tool ordering
- `app/(pages)/hub/page.tsx` — Hub page component, how lanes are rendered
- `the-sandbox/Blueprints/ENGAGEMENT-FINGERPRINT-ENGINE.md` lines ~976-1023 — the `personalizeHubOrder()` reference implementation

## The Specs

**Files to create:**
- `app/lib/fingerprint/sandy-context.ts`
- `app/api/fingerprint/sandy-context/route.ts`
- `app/lib/fingerprint/hub-personalization.ts`

**Files to modify:**
- `app/lib/concierge-service.ts` — inject fingerprint block into system prompt
- `app/lib/chat-service.ts` — inject fingerprint block into system prompt
- Hub page or config — wire personalized tool ordering

**Files NOT to modify:**
- `prisma/schema.prisma` — no schema changes
- Any file in `app/lib/fingerprint/` except the new files above

## The Next Link

When you have completed ONLY Tasks 4A and 4B:
1. Verify all new/modified files have no TypeScript errors (`npx tsc --noEmit` and grep for `fingerprint/`)
2. Then generate the **next handoff prompt** for Phase 5 (Tasks 5A + 5B): Faculty course fingerprint dashboard (class-level aggregate visualization on the course analytics page) + notification timing optimization (schedule Sandy nudges based on user's peak hours). Include full context of what was completed in Phases 1-4, the exact files to create/modify, and the technical approach. The handoff prompt must follow the same format as this one (Context, Goal, Specs, Next Link).
