# CLAUDE.md Optimization Plan
## Dual-Role Evaluation & Guided Implementation Roadmap
### Master Software Architect + Head of UX Strategy & Campus Culture

**Project:** The Sandbox — CATS-AI / University of Kentucky
**Authored:** 2026-03-19
**Status:** 🔵 Active Spec
**Target:** CLAUDE.md structural improvements for AI-assisted development velocity

---

## Preface: Why This Matters

CLAUDE.md is not documentation — it is **the operating contract between this codebase and every future Claude session**. Every token Claude wastes re-deriving architecture is a token not spent on student-impacting code. This plan treats CLAUDE.md optimization as a first-class engineering task, not a housekeeping chore.

---

## Remark Evaluations

---

### Remark 1: "Run /init — Generate the Baseline"

**Recommendation:** Run `/init` if you haven't, to generate a baseline CLAUDE.md.

---

**Architect's Technical Solution:**

The current CLAUDE.md is already a high-fidelity living spec — far superior to anything `/init` would generate. Running `/init` now would either overwrite it or produce a parallel file of no value. The **Gold Standard fix** is not to run `/init` but to **restructure CLAUDE.md for load efficiency**.

Current problem: CLAUDE.md is ~1,100 lines with deep feature documentation scattered uniformly. Claude must parse the entire document on every session to locate critical constraints (Prisma v7 adapter pattern, auth guards, Tailwind v4 rules). This is high token cost with poor signal-to-noise at the top.

**Gold Standard:** Implement a **"Critical Fast-Path Header"** — a ≤30-line block at the very top of CLAUDE.md (before the Table of Contents) that contains:
1. The 5 non-negotiable technical constraints (Tailwind v4, Prisma v7 adapter, lucide-react, auth guards, thin routes)
2. The canonical file paths for each constraint's enforcement point
3. The exact build/run command sequence
4. The "DO NOT REBUILD" list (gamification system)

This means Claude gets the 80% of what it needs in the first 200 tokens of context loading, not buried after 800 lines of feature documentation.

**Compatibility:** No schema changes. Pure CLAUDE.md edit. Fully compatible with Prisma v7 and Tailwind v4.

**Brittle Code Identified:** The `EDUCATOR_PROFILES` synthetic data block in `app/page.tsx` is the single most dangerous "legacy area" not explicitly flagged in the current CLAUDE.md. It looks like real data to a new Claude session. It must be explicitly labeled as synthetic/deprecated in the boundary section.

---

**Strategist's UX Impact — Institutional Alignment:**

This remark surfaces a deeper truth about **educator burnout**: every time a faculty member or admin interacts with an AI feature that seems confused about the platform state, trust erodes. If Claude hallucinates a gamification component that was intentionally deleted, and a developer re-adds it, that's not a code bug — it's a **platform culture bug**. The fast-path header directly protects the institutional contract: "AI-native, but human-reviewed."

FERPA/PII relevance: the fast-path header should explicitly surface the `requireRequestUser` / auth guard mandate so Claude never accidentally creates a data-exposing route. This is a compliance guardrail, not just a code quality preference.

**Adoption impact:** Medium-indirect. Users don't see CLAUDE.md, but they experience the quality of features built with it.

---

### Remark 2: "Define Boundaries — Core, Legacy, Active Feature Slices"

**Recommendation:** Explicitly list Core Modules, Legacy Areas (to avoid), and Active Feature Slices.

---

**Architect's Technical Solution:**

This is the highest-value structural improvement and is entirely absent from the current CLAUDE.md. The document describes *what exists* but never classifies *what to protect vs. what to extend vs. what to avoid*.

**Gold Standard:** Add a `## Module Boundaries` section with three explicit tiers:

**TIER 1 — CORE (Stable, High-Risk to Modify):**
Files that, if broken, take down the entire platform or violate security contracts:
- `app/lib/prisma.ts` — canonical DB client; never reinvent, always import
- `app/lib/server-auth.ts` — all `require*User` guards live here; auth contract
- `app/lib/auth-context.tsx` — mock auth, demo user switching; `originalAdmin` state
- `prisma/schema.prisma` + `prisma.config.ts` — data contract; requires migration on change
- `app/api/chat/route.ts` — streaming Claude chat with sliding-window rate limiter
- `app/components/Header.tsx` — role-gated nav; touching this requires full role-matrix test

**TIER 2 — LEGACY (Synthetic/Deprecated, Replace Don't Extend):**
Code that is intentionally temporary but looks authoritative:
- `EDUCATOR_PROFILES` in `app/page.tsx` — synthetic hardcoded data. Do NOT extend. Replace with real `/api/dashboard` endpoint.
- Simulated data in `/analytics/faculty/page.tsx` — labeled with amber banner; do not add more synthetic fields
- `app/components/BuildHubHero.tsx` — orphaned component, not imported anywhere; candidate for deletion

**TIER 3 — ACTIVE FEATURE SLICES (Current Development Zones):**
Where velocity is expected; PRs are green-lit here:
- `/app/avatar/` + `app/lib/document-*.ts` + `app/lib/embedding-service.ts` + `app/lib/vector-store.ts` — Avatar RAG pipeline wiring sprint
- `/app/onboard/` + `app/lib/enrichment/` — SSE streaming profile reveal UI sprint
- `app/page.tsx` (educator/admin view only) — Real `/api/dashboard` data connection sprint
- `app/components/courses/GradebookTab.tsx` + `GradingPanel.tsx` — Gradebook next-sprint (undo release, bulk AI release)

**TIER 4 — DO NOT REBUILD (Intentionally Removed):**
Named explicitly to prevent accidental reconstruction:
- XP system, Sand currency, Quests, Challenges, Leaderboards, Leagues — all intentionally deleted 2026-03-19
- Schema models: `XPEvent`, `UserBadge`, `Badge`, `Quest`, `UserQuest`, `SandTransaction`, `GamificationConfig`, `Challenge`, `LeaderboardEntry`, `League` family — DO NOT re-add to `schema.prisma`
- The `ui-mode.ts` `'gamified'` mode is a scaffold only — do not activate it without an explicit sprint decision

**Compatibility:** CLAUDE.md edit only. No code changes. Fully compatible.

**Brittle Code Identified:**
The `collab-bus.ts` / Redis wiring is currently in a half-baked state — `redis.ts` exists but collab pub/sub uses polling. This is a TIER 2 area masquerading as TIER 1. Any future collab work must account for the polling fallback path, and CLAUDE.md should call this out explicitly.

---

**Strategist's UX Impact — Learning Flow & Friction:**

The "Legacy vs. Active" boundary directly maps to **educator cognitive load**. When Heath Price (our EDUCATOR demo user) sees the Gradebook and the Dashboard on the same screen, one powered by real data and one by synthetic, the dissonance breaks trust in the platform. Defining these boundaries in CLAUDE.md means engineers know exactly which surface to fix first.

The **Active Feature Slices** list is also a UX prioritization statement. The Avatar/RAG pipeline is the single highest-value student experience improvement — when a professor's voice and materials are embedded in the AI tutor, students stop using the AI as a search engine and start using it as a Socratic partner. That's the pedagogical leap. Calling this out as the top active slice ensures it doesn't get deprioritized.

FERPA note: The `EDUCATOR_PROFILES` legacy data contains realistic-looking student engagement numbers (e.g., `activeStudents: 1240`). Even though it's synthetic, it must not be mistaken for real student data in a FERPA audit. The boundary definition protects against this.

---

### Remark 3: "Standardize Commands — Exact Build, Test, Lint Commands"

**Recommendation:** Include exact commands for testing, linting, and building so Claude doesn't waste tokens guessing.

---

**Architect's Technical Solution:**

The current CLAUDE.md mentions `prisma generate && next build` in passing under "Deployment" and "Build script" notes, but there is no authoritative `## Dev Commands` section. A new Claude session must infer the full command chain by reading the entire document.

**Gold Standard:** Add a `## Dev Commands` section immediately after the Tech Stack table with the following canonical command registry:

```bash
# === DEVELOPMENT ===
npm run dev                          # Start dev server (port 3000)

# === BUILD PIPELINE (run in order) ===
npx prisma generate                  # Regenerate Prisma client → app/generated/prisma/
npm run build                        # Full Next.js build (includes prisma generate via package.json script)
npm run lint                         # ESLint check
npx tsc --noEmit                     # TypeScript type check (no output files)

# === DATABASE ===
npx prisma migrate dev               # Apply pending migrations + regenerate client
npx prisma migrate dev --name <name> # Create named migration from schema changes
npx prisma db push                   # Push schema to DB without creating migration (prototyping only)
npm run db:seed                      # Seed demo data (6 users + tools + courses + book profiles)
npx prisma studio                    # Open Prisma Studio (local DB browser)

# === AFTER EVERY SCHEMA CHANGE ===
# 1. Edit prisma/schema.prisma
# 2. npx prisma migrate dev --name <descriptive-name>
# 3. npx prisma generate
# 4. npm run build  ← verify zero TypeScript errors before committing

# === RECOMMENDED PRE-COMMIT SEQUENCE ===
npm run lint && npx tsc --noEmit && npm run build
```

**What's missing from current CLAUDE.md that causes real problems:**
- No mention of `npx tsc --noEmit` as the TypeScript gate (Claude currently has to guess whether the project uses `tsc` or relies on `next build` for type errors)
- No explicit note that `npm run build` calls `prisma generate` internally — meaning standalone `prisma generate` is only needed when working with the schema outside a build cycle
- No `db:seed` invocation path documented (referenced in memory but not in CLAUDE.md itself)

**Compatibility:** Documentation change only. Aligns with existing `package.json` scripts. Confirms Prisma v7 driver adapter pattern.

**Brittle Code Identified:**
The `embedding-service.ts` currently has a conditional path for Azure vs. pgvector via `VECTOR_STORE` env var, but there is no documented test command to verify which path is active in a given environment. The dev commands section should include a note: "To verify vector store target: check `VECTOR_STORE` in `.env` — if absent, defaults to pgvector."

---

**Strategist's UX Impact — Friction Analysis:**

Standardized commands address **developer onboarding friction**, which is a proxy for **platform evolution speed**. Every hour a new engineer or Claude session spends finding the right build command is an hour not spent on student-facing features.

More subtly, the schema migration command sequence is a **FERPA risk surface**. If a developer runs `prisma db push` instead of `prisma migrate dev` in production, they bypass the migration history that provides an audit trail for schema changes. Documenting the distinction — and labeling `db push` as "prototyping only" — is a compliance decision, not just a DX preference.

Sandy (the AI concierge) is not yet aware of tool-building workflows. Standardizing commands is step one toward eventually giving Sandy a "How do I build a new tool?" answer that includes the exact prisma → generate → build chain. That's an institutional adoption moment: faculty see that the AI understands its own technical stack.

---

### Remark 4: "Update Frequently — Add Findings to CLAUDE.md After Successful Sessions"

**Recommendation:** Use "Add new findings to CLAUDE.md" at the end of successful sessions to record architectural quirks and gotchas.

---

**Architect's Technical Solution:**

This is the most strategically important remark, and the one with the most room for systematic improvement. "Update frequently" is vague. The Gold Standard is a **Context Handoff Protocol** — a structured process that every Claude session must execute before closing, producing a context-transfer artifact that the next Claude session can consume immediately.

**Gold Standard: Context Handoff Protocol**

Add a `## Context Handoff Protocol` section to CLAUDE.md with the following:

**1. Session-End Checklist (Claude runs this before every conversation close):**
- [ ] Did the schema change? → Log the migration name and what models changed
- [ ] Were any files deleted intentionally? → Add to "Intentionally Deleted Files" section
- [ ] Were any lib functions created that other routes should use? → Log in `## Canonical Patterns`
- [ ] Did any environment variable name change? → Update the env var table
- [ ] Did the build fail for non-obvious reasons? → Add to `## Known Gotchas`
- [ ] Were any Sprint tasks completed? → Update Sprint History table

**2. Context Handoff Prompt Template:**

At the end of any session involving significant code changes, Claude must output the following prompt for the user to paste into the next conversation:

```
CONTEXT HANDOFF — [DATE]

Session summary: [1-2 sentences describing what was built]

Files changed:
- [file path]: [what changed]
- [file path]: [what changed]

Schema changes: [migration name if applicable, or "none"]

Build status: [PASSING / FAILING — with error if failing]

Active sprint position: [Task N of M from [blueprint-file.md]]

Gotchas discovered:
- [any new architectural constraint or env var issue discovered]

Next task: [exact next instruction from the architect plan]

---
To continue: Read CLAUDE.md + BLUEPRINT-STATUS.md, then execute the Next task above.
```

**3. CLAUDE.md Update Trigger Conditions:**

Only update CLAUDE.md when one of these is true:
- A new canonical pattern was established (e.g., new auth guard variant)
- An env variable name was corrected or added
- A file was intentionally deleted (add to deletion log)
- A "ghost code" / orphaned file was confirmed and marked
- A known gotcha was discovered (e.g., "prisma generate must run before tsc in CI")
- A sprint was completed and the Sprint History table needs updating

Do NOT update CLAUDE.md with: in-progress state, TODOs, per-session implementation details, or information already in git history. CLAUDE.md is a structural contract, not a changelog.

**Compatibility:** CLAUDE.md edit only. No code changes.

**Brittle Code / Process Identified:**
The current Sprint History table in CLAUDE.md has only one entry (Gamification Removal sprint) and the format is inconsistent with the Blueprint Status index. These two documents will diverge over time without a handoff protocol to keep them synchronized.

---

**Strategist's UX Impact — Institutional Knowledge Capture:**

The "update frequently" remark speaks directly to **educator burnout prevention**. Right now, every new conversation with Claude requires re-establishing: "We use Prisma v7 driver adapters," "Don't rebuild the gamification system," "The educator dashboard data is synthetic." That is repeated friction that degrades the human-AI collaboration experience.

The Context Handoff Protocol transforms this from an interruption into a **compounding investment**. Each session makes the next one faster. Over a semester, this means: features that took 3 sessions to build in January take 1 session in March. For Heath Price (our EDUCATOR), this translates to more AI tools in his TEK-100 course by midterms — which is the entire value proposition of the platform.

The handoff prompt also addresses a subtler issue: **Claude's tendency to over-engineer when context is ambiguous**. A Claude session with no context of the gamification removal sprint might "helpfully" add XP tracking back into a new feature. The handoff prompt's explicit "DO NOT REBUILD" reference prevents this.

---

## Architectural Refinement: Code Quality Audit

Based on the four remarks and deep review of the current codebase state:

### Brittle Patterns (Across `app/lib` and `app/components`)

| File / Pattern | Problem | Recommended Fix |
|---|---|---|
| `EDUCATOR_PROFILES` in `app/page.tsx` | Synthetic object hardcoded in page component; looks like real data | Move to a clearly-named `SYNTHETIC_DEMO_DATA` constant or delete after real `/api/dashboard` is wired |
| `collab-bus.ts` + `redis.ts` | Redis client exists; collab still polls. Half-baked infrastructure gives false confidence | Document explicitly as "polling fallback active" in CLAUDE.md; don't extend collab without wiring pub/sub first |
| `app/lib/document-processor.ts` + `document-chunker.ts` | RAG pipeline built but no live route consumes it. Risk of drift if schema changes | These files must be wired in the Avatar sprint or they will silently become incompatible with schema evolution |
| `app/components/BuildHubHero.tsx` | Orphaned; not imported anywhere | Delete immediately; it's in the "Ghost Code" list but hasn't been removed yet |
| `app/lib/ui-mode.ts` `'gamified'` branch | Returns `'gamified'` for nobody currently (all roles return `'professional'`), but the branch implies gamification could return | Add a comment: `// Gamification system removed 2026-03-19 — do not activate without explicit sprint decision` |
| Sandy system prompt in `/api/concierge` | Course materials truncated at 600 chars/material — arbitrary limit with no explanation | Document this as a known tradeoff in CLAUDE.md under Known Gotchas; future RAG integration will replace this pattern |
| Auth header `x-demo-user-email` | String-based header auth used in every API call — trivially spoofable | This is intentional for demo mode; CLAUDE.md should clearly state "replace with Shibboleth JWT in production" and link `server-auth.ts` as the single swap point |

### Redundant Patterns

| Pattern | Files | Issue |
|---|---|---|
| Duplicate `CollabChatInterface.tsx` path | Listed twice in CLAUDE.md file structure | Verify it's not actually duplicated in the filesystem; update CLAUDE.md |
| Both `prisma generate` and `npm run build` generate the client | Can cause confusion about which is canonical | CLAUDE.md should clarify: `npm run build` includes generation; standalone `prisma generate` is for schema-only work |

---

## Guided Implementation Plan

**Instructions for Claude:**

> Read this file, `CLAUDE.md`, and `BLUEPRINT-STATUS.md` in full before beginning. Execute tasks sequentially. After each task, run `npm run lint && npx tsc --noEmit && npm run build` to verify no regressions. Stop and request review after every 2 tasks. After the final task, output the Context Handoff Prompt using the template in Task 4.

---

### Task 1: Add Critical Fast-Path Header to CLAUDE.md

**Objective:** Create a ≤30-line block at the very top of CLAUDE.md (before all other content) that gives Claude critical constraints in the first 200 tokens.

**Action:** Insert the following block at line 1 of `CLAUDE.md`, before `# The Sandbox — Architecture & Product Specification`:

```markdown
---
## CRITICAL CONSTRAINTS — READ FIRST (before all other sections)

| Constraint | Rule | Enforcement Point |
|---|---|---|
| Tailwind v4 | No `@apply`. Use utility classes in JSX only. `size-4` not `w-4 h-4`. | Any `.css` or `.tsx` file |
| Prisma v7 | Use PrismaPg adapter. Import from `../generated/prisma`. No `url` in datasource. | `app/lib/prisma.ts` |
| Icons | lucide-react ONLY. No heroicons, react-icons, etc. | Any component file |
| Auth Guards | Every route.ts MUST call `require*User` before ANY DB access. No exceptions. | `app/lib/server-auth.ts` |
| Route Logic | API routes must be thin (auth → parse → call lib → return). No business logic in route files. | `app/api/**/*.ts` |
| DO NOT REBUILD | Gamification system (XP, Sand, Quests, Leagues) intentionally deleted 2026-03-19. Schema models gone. | See "Intentionally Deleted" section |
| SYNTHETIC DATA | `EDUCATOR_PROFILES` in `app/page.tsx` is fake. Do NOT extend it. Replace with `/api/dashboard`. | `app/page.tsx` |

**Build command:** `npm run lint && npx tsc --noEmit && npm run build`
**Schema change sequence:** Edit schema → `npx prisma migrate dev --name <name>` → `npx prisma generate` → `npm run build`
---
```

**Verify:** `npm run lint && npx tsc --noEmit && npm run build` — expect 0 errors (CLAUDE.md is not compiled; this baseline confirms the codebase is clean before changes begin).

---

### Task 2: Add Module Boundaries Section to CLAUDE.md

**Objective:** Add an explicit `## Module Boundaries` section immediately after the Sprint History table.

**Action:** After the Sprint History table in CLAUDE.md, insert:

```markdown
## Module Boundaries

### TIER 1 — CORE (Stable — High-Risk to Modify)
Modifying these files requires full build + manual role-matrix review. They are load-bearing for security, data integrity, or platform-wide behavior.

| File | Why It's Core |
|---|---|
| `app/lib/prisma.ts` | Canonical DB client — never reinvent, always import |
| `app/lib/server-auth.ts` | All `require*User` auth guards — sole security layer for demo auth |
| `app/lib/auth-context.tsx` | Mock auth + `originalAdmin` state for ViewingAsBanner |
| `prisma/schema.prisma` + `prisma.config.ts` | Data contract — changes require migration |
| `app/api/chat/route.ts` | Streaming chat with sliding-window rate limiter |
| `app/components/Header.tsx` | Role-gated nav — changes require full 4-role visual test |

### TIER 2 — LEGACY (Synthetic/Deprecated — Replace, Don't Extend)
These files contain intentionally temporary code. Do not add new fields or logic here; connect them to their real replacements instead.

| File / Area | What's Synthetic | Real Replacement |
|---|---|---|
| `EDUCATOR_PROFILES` in `app/page.tsx` | Hardcoded educator dashboard data | `/api/dashboard` route (built, not yet primary source) |
| `/analytics/faculty/page.tsx` simulated data | Amber-bannered demo analytics | Real session capture + `/api/analytics/platform` |
| `app/components/BuildHubHero.tsx` | Orphaned component — not imported anywhere | Delete; use Build Hub page directly |
| `collab-bus.ts` pub/sub path | Redis wired but collab uses polling | Wire Upstash pub/sub for real-time (platform-hardening sprint) |

### TIER 3 — ACTIVE FEATURE SLICES (Current Development Zones)
Active sprint work is greenlit here. PRs expected. Build fast.

| Area | Sprint | Files |
|---|---|---|
| Avatar RAG Pipeline | `rag-gradebook-architecture.md` | `/app/avatar/`, `lib/document-*.ts`, `lib/embedding-service.ts`, `lib/vector-store.ts` |
| SSE Onboarding UI | `onboarding-streaming-profile-reveal.md` | `/app/onboard/`, `lib/enrichment/` |
| Real Dashboard Data | `demo-to-product-architecture.md` | `app/page.tsx` (educator view), `/api/dashboard/` |
| Gradebook Next-Sprint | `CLAUDE.md` Gradebook section | `GradebookTab.tsx`, `GradingPanel.tsx` |

### TIER 4 — DO NOT REBUILD (Intentionally Removed 2026-03-19)
These systems were deliberately deleted. Do not recreate files, re-add schema models, or reference these in new code.

- XP system (`xp.ts`, `XPEvent` model, all `/api/xp/` routes)
- Sand currency (`sand.ts`, `SandTransaction` model)
- Quests system (`platform-quests.ts`, `Quest`/`UserQuest` models, `/api/quests/`)
- Challenges (`/api/challenges/`, `Challenge` model)
- Leaderboards (`LeaderboardEntry` model)
- Leagues (entire `app/lib/leagues/` dir, `app/components/leagues/`, all League schema models)
- GamificationConfig (`/api/gamification-config/`)
- `app/lib/ui-mode.ts` `'gamified'` branch — scaffolded but DO NOT activate
```

**Verify:** `npm run lint && npx tsc --noEmit && npm run build`

---

> **STOP AFTER TASK 2 — Request human review before proceeding.**

---

### Task 3: Add Dev Commands Section to CLAUDE.md

**Objective:** Add an authoritative `## Dev Commands` section immediately after the Tech Stack table.

**Action:** After the Tech Stack table (before "Critical Prisma v7 Notes"), insert:

```markdown
## Dev Commands

Run these in the `the-sandbox/` directory. These are canonical — do not guess variations.

```bash
# === DEVELOPMENT ===
npm run dev                                      # Start dev server (port 3000)

# === VERIFICATION (run before every commit) ===
npm run lint                                     # ESLint
npx tsc --noEmit                                 # TypeScript type check (no output files)
npm run build                                    # Full Next.js production build

# Full pre-commit gate:
npm run lint && npx tsc --noEmit && npm run build

# === BUILD PIPELINE ===
# npm run build includes prisma generate internally.
# Only run prisma generate standalone when editing schema outside a build cycle.
npx prisma generate                              # Regenerate client → app/generated/prisma/

# === DATABASE ===
npx prisma migrate dev                           # Apply pending migrations + regen client
npx prisma migrate dev --name <descriptive-name> # Create named migration from schema changes
# ⚠️  Do NOT use `prisma db push` in any environment with real data.
#     It skips migration history (FERPA audit trail risk).
npm run db:seed                                  # Seed demo data (6 users + tools + courses)
npx prisma studio                                # Open Prisma Studio browser

# === SCHEMA CHANGE SEQUENCE (always follow this order) ===
# 1. Edit prisma/schema.prisma
# 2. npx prisma migrate dev --name <descriptive-name>
# 3. (prisma generate runs automatically as part of migrate dev)
# 4. npm run build  ← verify 0 TypeScript errors before committing

# === ENVIRONMENT CHECK ===
# Vector store target: check VECTOR_STORE in .env
#   Missing / absent → pgvector (Neon)
#   VECTOR_STORE=azure-ai-search → Azure AI Search
# Audio mode: requires OPENAI_API_KEY (gracefully disabled if absent)
# Email: requires RESEND_API_KEY (logs to console if absent)
# Playground JWT: STORAGE_JWT_SECRET required — throws 503 if missing in production
```
```

**Verify:** `npm run lint && npx tsc --noEmit && npm run build`

---

### Task 4: Add Context Handoff Protocol Section to CLAUDE.md

**Objective:** Add a `## Context Handoff Protocol` section near the bottom of CLAUDE.md (before "For Teams Building This Out"). This makes every Claude session self-documenting.

**Action:** Before the `## For Teams Building This Out` section, insert:

```markdown
## Context Handoff Protocol

At the end of any session where code was changed, Claude must:

### 1. Session-End Checklist

- [ ] Did the schema change? → Log migration name in Sprint History
- [ ] Were any files intentionally deleted? → Add to "Intentionally Deleted Files" section and Tier 4 boundary list
- [ ] Were new lib functions created for shared use? → Add a row to Canonical Patterns below
- [ ] Did any environment variable name change? → Update the env var table
- [ ] Did the build reveal a non-obvious constraint? → Add to Known Gotchas below
- [ ] Was a sprint task completed? → Update Blueprint Status (`BLUEPRINT-STATUS.md`)

### 2. Known Gotchas

Record architectural surprises here so future sessions don't re-discover them.

| Date | Gotcha | Affected Files |
|---|---|---|
| 2026-03-19 | `STORAGE_JWT_SECRET` is the correct env var name — NOT `PLAYGROUND_JWT_SECRET` (CLAUDE.md previously had this wrong) | `app/lib/playground-storage.ts` |
| 2026-03-19 | Sandy course context is truncated at 600 chars/material — not a bug, an intentional token budget choice. Future RAG integration will replace this. | `/api/concierge/route.ts` |
| 2026-03-19 | `collab-bus.ts` Redis pub/sub is not wired — collab uses polling fallback. Do not build new real-time features assuming Redis pub/sub is live. | `app/lib/collab-bus.ts`, `app/lib/redis.ts` |

### 3. Canonical Patterns

Reference these before writing any new lib function — these are the established patterns.

| Pattern | File | When to Use |
|---|---|---|
| Prisma client instantiation | `app/lib/prisma.ts` | Always — never reinvent |
| Auth guard (generic user) | `app/lib/server-auth.ts` → `requireRequestUser()` | Every API route |
| Auth guard (admin only) | `app/lib/server-auth.ts` → `requireAdminUser()` | Admin routes |
| Auth guard (educator) | `app/lib/server-auth.ts` → `requireEducatorUser()` | Educator/admin routes |
| Notification creation | `app/lib/notifications.ts` → `createNotification()` | Any event triggering user notification |
| Reusable Prisma includes | `app/lib/prisma-includes.ts` | Complex queries needing nested relations |
| Input validation | `app/lib/validate.ts` + `app/lib/schemas.ts` | Request body parsing in route handlers |

### 4. Context Handoff Prompt Template

**Claude: Output this block at the end of any session with significant code changes.
The user will paste it into the next conversation to continue without context loss.**

---

```
SANDBOX CONTEXT HANDOFF — [DATE]

Session summary: [1-2 sentences — what was built or fixed]

Files changed:
- [relative/path/file.ts]: [what changed and why]

Schema changes: [migration name, e.g. "add-avatar-pipeline" — or "none"]

Build status: ✅ PASSING / ❌ FAILING — [error message if failing]

Active blueprint: [blueprint-filename.md], Task [N] of [M]

Gotchas discovered this session:
- [any new constraint, env issue, or architectural surprise — or "none"]

Next task:
> [Copy the exact next task instruction from the architect plan]

---
To continue: Claude should read CLAUDE.md + BLUEPRINT-STATUS.md first, then execute the Next task.
```

---
```

**Verify:** `npm run lint && npx tsc --noEmit && npm run build`

---

> **STOP AFTER TASK 4 — Request human review before proceeding.**

---

### Task 5: Delete Orphaned Component

**Objective:** Remove `app/components/BuildHubHero.tsx` — confirmed orphan (not imported anywhere, listed in CLAUDE.md Ghost Code section).

**Action:**
1. Grep the codebase for `BuildHubHero` — confirm zero imports outside the file itself
2. Delete `app/components/BuildHubHero.tsx`
3. Update CLAUDE.md Ghost Code / Tier 2 boundary table to note it was deleted
4. Update Sprint History table in CLAUDE.md with this cleanup

**Verify:** `npm run lint && npx tsc --noEmit && npm run build`

---

### Task 6: Add Gamification Guard Comment to `ui-mode.ts`

**Objective:** Add an explicit in-code comment to the `'gamified'` branch of `app/lib/ui-mode.ts` so no future Claude session or developer accidentally activates it, and update the Known Gotchas table in CLAUDE.md.

**Action:**
1. Read `app/lib/ui-mode.ts`
2. Locate the `'gamified'` branch or any reference to gamified mode
3. Add a comment: `// Gamification system intentionally removed 2026-03-19. Do NOT activate this branch without an explicit sprint decision. See CLAUDE.md Tier 4 boundaries.`
4. Add a row to the Known Gotchas table in CLAUDE.md:

| Date | Gotcha | Affected Files |
|---|---|---|
| 2026-03-19 | `ui-mode.ts` has a `'gamified'` branch that currently returns nothing — gamification system removed. Do NOT activate this without an explicit sprint. | `app/lib/ui-mode.ts` |

**Verify:** `npm run lint && npx tsc --noEmit && npm run build`

---

> **STOP AFTER TASK 6 — Request human review. At this point output the Context Handoff Prompt using the template from Task 4.**

---

## Remark-to-Outcome Mapping

| Remark | Architect Solution | UX/Culture Impact | Task |
|---|---|---|---|
| Run /init → generate baseline | Critical Fast-Path Header at top of CLAUDE.md | Reduces context drift that causes feature regressions visible to educators | Task 1 |
| Define Boundaries | `## Module Boundaries` with 4-tier classification | Protects stable educator-facing features; identifies Avatar as top-priority student experience | Task 2 |
| Standardize Commands | `## Dev Commands` canonical command registry with FERPA note on `db push` | Reduces onboarding friction; `db push` warning protects audit trail | Task 3 |
| Update Frequently | Context Handoff Protocol with session-end checklist + prompt template | Compounds platform intelligence across sessions; prevents gamification system from being re-added | Task 4 |
| Code Quality | Delete `BuildHubHero.tsx` + guard `ui-mode.ts` | Reduces surface area for accidental legacy feature resurrection | Tasks 5–6 |

---

## Handoff Prompt for Next Claude Context

**If you are starting fresh on this plan, paste this into your next conversation:**

```
SANDBOX CONTEXT HANDOFF — 2026-03-19

Session summary: Produced a CLAUDE.md Optimization Plan blueprint
(Blueprints/claude-md-optimization-plan.md). No code has been changed yet.

Files changed: none — planning phase only

Schema changes: none

Build status: ✅ PASSING (confirmed clean before this session)

Active blueprint: claude-md-optimization-plan.md, Task 1 of 6

Gotchas discovered this session: none

Next task:
> Task 1: Add Critical Fast-Path Header to CLAUDE.md. Insert the constraint table
> block at line 1 of `the-sandbox/CLAUDE.md`, before all existing content.
> Then run: npm run lint && npx tsc --noEmit && npm run build

---
To continue: Read CLAUDE.md + BLUEPRINT-STATUS.md + Blueprints/claude-md-optimization-plan.md,
then execute Task 1. Stop and request review after Task 2.
```
