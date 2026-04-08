# Crisis Communications — Claude Code Reference

> **This file is a Claude Code reference doc**, extracted from the main CLAUDE.md to reduce context window usage. Canonical source: `the-sandbox/CLAUDE.md`.

---

## Spokesperson Trainer v2 (9 features, 2026-03-27)

AI-powered media training simulation in the **Crisis Comms** hub swim lane. Sandy plays "The Reporter" in a hot-seat interview drill, then debriefs with structured scoring.

- **Page**: `app/crisis-comms/spokesperson-trainer/page.tsx` — split-panel layout (scorecard left 7 cols, Sandy interview right 5 cols)
- **Hook**: `app/hooks/useSpokespersonTrainer.ts` — phase state machine (setup → interview → debrief → replay → model-response), coaching nudges, annotations
- **Services** (6 in `app/lib/crisis-comms/spokesperson-trainer/`): `types.ts`, `scenario-presets.ts` (5 presets with mid-interview injects), `interview-service.ts` (phase/difficulty-aware system prompts with bridge-and-block coaching, branching escalation, key message tracking), `scoring-service.ts` (score extraction + drill persistence), `preflight.ts`, `annotation-service.ts` (per-answer Haiku analysis for replay)
- **Components** (11 in `app/components/crisis-comms/spokesperson-trainer/`): `InterviewScorecard`, `ScenarioSelector`, `DifficultySelector`, `RoleSelector`, `KeyMessagesEditor`, `CoachingNudge`, `DebriefPanel`, `ScoreBar`, `DrillHistory`, `ReplayPanel`, `PrepSheetExport`
- **API**: 5 routes under `/api/crisis-comms/spokesperson-trainer/` — `preflight`, `interview`, `save`, `history`, `annotate`
- **Sandy Agent Tools**: 4 tools in `app/lib/agent/tools/crisis-comms-tools.ts` — `start_crisis_drill` (navigate + suggest scenario), `get_crisis_drill_history` (performance trends), `start_crisis_incident` (navigate to Command Center), `get_crisis_incidents` (recent incidents). Registered in `tool-registry.ts`
- **4 difficulty levels**: Warm-up (friendly local reporter, 5-6 Qs), Standard (skeptical beat reporter, 7-8 Qs), Hostile (national investigative, 9-10 Qs), Press Conference (4 rotating reporter personas, 10-12 Qs)
- **5 preset scenarios**: Campus Lockdown, Severe Weather, Data Breach, Student Death, Viral Reputational Allegation — each with mid-interview breaking news inject
- **9 features**: (1) Bridge & Block real-time coaching nudges (`<!--COACH:technique|label|suggestion-->`), (2) Key Messages editor (2-3 user-defined, scored in debrief), (3) Replay mode with per-answer annotations, (4) Branching escalation (adapts to response quality), (5) Press Conference mode (multi-reporter), (6) Mid-interview scenario injects (`<!--INJECT:delivered-->`), (7) Sandy agent integration, (8) Enhanced trend visualization (average line, trend summary, best/weakest), (9) Export prep sheet (printable HTML)
- **4 scoring dimensions**: Clarity, Empathy, Speculation Control, Message Discipline (1-10 each, `<!--SCORE:key:N-->` markers)
- **No schema changes** — uses existing `ToolSession` + `MetricEvent` models

---

## Reputation Pulse v2

AI-powered social media analysis tool in the **Crisis Comms** hub swim lane. Designed around Sprout Social data shape — runs on pre-computed synthetic demo data (no AI API calls on page load). Architecture doc: `ARCHITECTURE-REPUTATION-PULSE.md`.

- **Page**: `app/crisis-comms/reputation-pulse/page.tsx` — instant load with scenario picker, pipeline funnel + tabbed output (Brief / Posts / Timeline) + Sandy conversational panel
- **Hook**: `app/hooks/useReputationPulse.ts` — loads seeded data client-side (no analyze API call), seeded Sandy narration, live Haiku only for deep-dive Q&A
- **Services** (4 in `app/lib/crisis-comms/reputation-pulse/`): `reputation-pulse-service.ts` (returns seeded data), `interview-service.ts` (Sandy deep-dive prompts with per-post AI detection context), `preflight.ts`, `types.ts`
- **Synthetic data** (6 files in `synthetic-data/`): `sprout-7day-posts.ts` (48 posts), `seeded-analysis.ts` (pre-computed sentiment/themes/AI detection/brief/narration for Normal Week), `scenario-crisis-event.ts` (50 posts — Chemistry building gas leak, HIGH threat), `scenario-coordinated-campaign.ts` (50 posts — anti-DEI bot network, CRITICAL threat), `scenarios.ts` (registry), `index.ts` (re-export)
- **3 demo scenarios**: Normal Week (MODERATE), Crisis Event (HIGH), Coordinated Campaign (CRITICAL) — switchable via picker, instant load, no API calls
- **API**: 3 routes under `/api/crisis-comms/reputation-pulse/` — `preflight`, `interview`, `analyze`
- **Components** (5 in `app/components/crisis-comms/reputation-pulse/`): `PipelineFunnel` (3-stage narrowing visualization), `CrisisBriefPanel` (sentiment donut, AI authorship donut scoped to negatives, theme clusters expanded by default, threat banner, actions), `PostFeed` (filterable: All/Positive/Negative/AI Flagged + sortable), `PostCard` (sentiment badge + AI verdict badge with expandable explanation), `SpreadTimeline` (recharts stacked area by sentiment, daily buckets)
- **AI detection signals**: lexical uniformity, sentence structure variance, hedging patterns, discourse markers, error patterns, emotional authenticity, identity consistency, specificity, platform norms
- **No schema changes** — pure synthetic data, no database models
- **Future**: Swap synthetic data for live Sprout Social API when access is available

---

## Command Center

Real-time crisis response workspace in the **Crisis Comms** hub swim lane. Report an incident, get an AI severity assessment, then generate and collaboratively edit coordinated response documents.

- **Page**: `app/crisis-comms/command-center/page.tsx` — 3-phase flow (Initiation → Assessment → Workspace)
- **Hook**: `app/hooks/useCommandCenter.ts` — full state machine (phase, incident, assessment, documents, past incidents)
- **Service**: `app/lib/crisis-comms/command-center/command-center-service.ts` — incident CRUD, AI assessment, document generation, AI-assisted editing
- **Types**: `app/lib/crisis-comms/command-center/types.ts` — IncidentStatus (6 stages), SeverityLevel (1-3), DocumentType (8 channels), DocumentStatus (4 stages)
- **Demo scenarios**: `app/lib/crisis-comms/command-center/demo-scenarios.ts`
- **Prompts**: `app/lib/crisis-comms/command-center/prompts.ts` — AI assessment + document generation prompts
- **Components** (5 in `app/components/crisis-comms/command-center/`): `InitiationPhase`, `AssessmentPhase`, `WorkspacePhase`, `SeverityBadge`, `DocumentIcon`
- **API**: 7 routes under `/api/crisis-comms/command-center/` — `initiate`, `join`, `confirm`, `[incidentId]` (GET/status), `documents/[documentId]` (PATCH/ai-edit), `my-incidents`
- **Sandy Agent Tools**: `start_crisis_incident` + `get_crisis_incidents` in `crisis-comms-tools.ts`
- **Document types**: Press Statement, Internal Email, Social (Twitter/Instagram/Facebook), Parent Notification, Website Banner, Talking Points
- **Collaborative**: Room codes let team members join as Lead/Responder/Observer
- **No schema changes** — uses existing models

---

## Hub Visibility

Crisis Comms swim lane visible to EDUCATOR, ADMIN, and STAFF roles. Seed: `npx tsx scripts/seed-crisis-comms-tools.ts`.

| Tool | Route |
|------|-------|
| Spokesperson Trainer | `/crisis-comms/spokesperson-trainer` |
| Reputation Pulse | `/crisis-comms/reputation-pulse` |
| Crisis Command Center | `/crisis-comms/command-center` |
