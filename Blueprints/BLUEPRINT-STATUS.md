# Blueprint Status Index
> **Ground truth is the codebase, not the blueprints.**
> All completed blueprints have been moved to `archive/`. Only forward-looking specs remain in this directory.
> Last reconciled: **2026-03-22** (Full triage — 14 files deleted, 34 archived, 3 kept)

---

## Active Blueprints

| Blueprint | What It Describes | Status | Notes |
|---|---|---|---|
| ~~cross-tool-intelligence-sprint.md~~ | Cross-tool intelligence: student context API, study plans, fork promotion, tool request board. 12 tasks, 6 phases. | ✅ Complete | All 12 tasks done 2026-03-22. Archived to `archive/`. |
| [zen-ux-overhaul.md](zen-ux-overhaul.md) | Principal UX audit: 22 tasks across 9 phases. Demo users, Hub Workshop, ToolsBrowser, quick-launch, course tabs, spacing, Sandy, empty states, breadcrumbs, mobile nav. | ⚠️ Needs Re-evaluation | Written before 10+ UX audit sprints were completed. Many tasks may already be done. Needs diff against current codebase before execution. |
| [vibe-tools-ideas.md](vibe-tools-ideas.md) | Ideation doc: Coffee Roulette, and other lightweight social tools following the bracket-contest pattern. | 💡 Ideation Only | Not a build spec. Keep as inspiration for future features. |

---

## Supporting Documents (not blueprints)

| File | Purpose |
|---|---|
| [SPRINT-HANDOFF.md](SPRINT-HANDOFF.md) | Interrupt recovery template for active sprints. Currently idle (no active sprint). |

---

## Divergences from Spec (Known)

| Blueprint | Spec Said | What Was Built Instead |
|---|---|---|
| `ncaa-bracket-contest.md` | Send Email button in `manage/page.tsx` directly | `manage/page.tsx` was already refactored to delegate to `CommissionerPanel.tsx`; Send Email button added there instead |
| `rag-gradebook-architecture.md` | Azure AI Search for vector store | pgvector in Neon (Azure swap is env-var switchable via `VECTOR_STORE=azure-ai-search`) |
| `platform-hardening-architecture.md` | Redis pub/sub for collab | Used Redis Streams (`xadd`/`xread`) instead of pub/sub — same cross-instance result, polling at 200ms cadence |
| `onboarding-magic-signup-core.md` | SSE streaming profile reveal during enrichment | Built in Student Intelligence Sprint: `StreamingStep` in `/onboard/page.tsx` uses `useEnrichmentStream` hook |
| `demo-to-product-architecture.md` | Full synthetic replacement for `EDUCATOR_PROFILES` | `EDUCATOR_PROFILES_FALLBACK` remains as loading-state fallback only; `courseHealth.avgScore` and `atRisk` are now real |

---

## Archive

~79 files in [`archive/`](archive/) — all completed blueprints, handoff docs, and superseded specs. Preserved as reference but the codebase is ground truth.

**Deleted outright (2026-03-22):**
- `codex-blueprint.md`, `mvp-readiness-blueprint.md`, `MVP spec/` folder — ancient March 15 specs, fully superseded
- `CODEX-QA-BLUEPRINT.md` — March 15 QA fixes, long since addressed
- `league-engine-blueprint.md`, `codex-prompt-league-engine.md` — gamification deleted, never coming back
- `canvas-killer-strategy.md`, `build-student-contexts.md` — referenced Sand/bounties, structurally incompatible
- `study-buddy-*.md` (5 files), `A/B/C-study-buddy-*.md` — "Study Buddy" renamed to Sandy; functionality rebuilt

---

## How to Keep This Current

When you build something from a blueprint:
1. Update the **Status** column here
2. Note any **Divergences** (the spec never survives first contact with implementation)
3. When complete, move the blueprint to `archive/`

When you start designing a new feature:
1. Create the blueprint in `Blueprints/`
2. Add a row here with status `🔵 Ready to Build` or `🔵 Designing`
3. Move to `🟡 Partial` when first code lands, `✅ Complete` when done, then archive
