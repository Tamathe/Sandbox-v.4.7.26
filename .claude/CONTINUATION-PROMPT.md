# Continuation Prompt — Educational Intelligence Platform

Paste the block below into a new Claude Code instance to continue this work.

---

```
You are continuing work on "The Sandbox" — an AI-powered educational tool marketplace for the University of Kentucky. The project lives at `c:\AA Code\Educator marketplace\the-sandbox\`. Always read `CLAUDE.md` there first before making any changes.

## What was just completed

**Task 5 — GraphRAG: Entity-Graph Layer on Top of pgvector (2026-03-20)**

Augmented flat-chunk RAG with a lightweight knowledge graph. Complex multi-hop questions ("why", "how does", "relationship between", "prerequisite") now trigger graph traversal in addition to cosine similarity.

Files changed:
- `prisma/schema.prisma` — added `GraphEntity`, `GraphEdge`, `GraphCommunity` models (with `@@unique([courseId, name])` on GraphEntity)
- `app/lib/graph-rag-service.ts` — **new file** (full GraphRAG implementation):
  - `extractEntitiesFromChunks(courseId, chunks)` — batched Haiku extraction (8 entities / 10 relationships per chunk), raw SQL upsert with `ON CONFLICT`
  - `buildGraphCommunities(courseId)` — groups entities into 3–7 thematic communities via a single Haiku call
  - `graphRagSearch(courseId, query, topK)` — detects complex queries, picks relevant communities via Haiku, builds entity+edge context string
- `app/lib/document-processor.ts` — fire-and-forget `extractEntitiesFromChunks → buildGraphCommunities` after `upsertChunks` (uses synthetic `materialId-chunkIndex` IDs)
- `app/lib/chat-service.ts` — `graphRagSearch` imported and called inside `buildRagContext()` after vector similarity block; graph context appended when query is complex
- `app/api/courses/[id]/materials/route.ts` — DELETE handler now cleans up `GraphEntity` + `GraphCommunity` when last material for a course is deleted (edges cascade from entities)

Schema pushed via `npx prisma db push`. `npx tsc --noEmit` = 0 errors.

**Task 4 — Client-Side Telemetry / Affective Computing Foundation (2026-03-20)**

Files changed:
- `app/components/ChatInterface.tsx` — typing cadence (keystamps → avgMs/maxPauseMs/charCount), re-ask rate (djb2 hash + 80% Jaccard), message length trend (last-3 comparison → "up"|"down"|"flat")
- `app/api/telemetry/route.ts` — thin POST route, FERPA-safe
- `prisma/schema.prisma` — `SessionTelemetry` model

**Task 3 — Year 1 Data Foundation Sprint (2026-03-20)**

- Schema: `ToolSession.durationSeconds`, `hintCount`, `exitReason`, `conceptsTouched`; `StudentProfile` model
- `app/lib/student-profile-service.ts` — upserts StudentProfile after scored sessions

**Prior sprints** — all complete as of 2026-03-20; see `CLAUDE.md` sprint history and `Blueprints/BLUEPRINT-STATUS.md`.

## Next priorities (in order)

### 1. Multi-Agent Orchestration for chat-service.ts
Upgrade `app/lib/chat-service.ts` from a single Haiku call to a 3-agent pipeline:
- Agent 1 (Router): classifies student intent — "factual lookup" vs. "concept explanation" vs. "problem-solving" vs. "logistics"
- Agent 2 (Retrieval): already done (pgvector + graph RAG)
- Agent 3 (Pedagogy): selects Socratic strategy based on intent classification and StudentProfile

Use the Anthropic SDK's multi-turn pattern (not a streaming Agent SDK — just sequential calls within `buildChatSystemPrompt`). Inject pedagogy strategy into the system prompt. Keep the external API contract unchanged.

Reference: `c:\AA Code\Educator marketplace\.claude\DATA-EXTRACTION-STRATEGY.md` — Multi-Agent Orchestration section.

### 2. Personalized Tool Recommendation Engine
`/api/tools/recommended` exists but uses simple filtering. Upgrade to:
- Query the calling student's `StudentProfile` (preferredModality, learningVelocity)
- Query their `ToolSession` history (which tool types they've used, avg score per type)
- Score candidate tools: prefer modality match + unexplored tools + high-scoring tools for similar-profile students
- No schema changes needed — all data is present

### 3. Knowledge Gap Map
Cross `StudentObjectiveProgress` failures with GraphRAG entities:
- For each failing objective, find GraphEntity nodes in the course matching that objective's name
- Traverse `inEdges` (depends_on) to find prerequisite concepts the student may be missing
- Surface this as a new `/api/courses/[id]/knowledge-gaps?studentId=...` endpoint
- Wire into the existing `LearningPathTab` component on course pages

### 4. Real `/api/dashboard` for EDUCATOR_PROFILES
Replace the `EDUCATOR_PROFILES_FALLBACK` constant in `app/page.tsx` with live DB queries. The `/api/dashboard` route already returns most fields; synthetic ones remaining are `title`, `toolsPublished`, `activeStudents` in the loading state.

### 5. MCP Server Layer (larger lift)
Build a thin MCP-compatible server that exposes Canvas grade data, SIS enrollment, and course materials as tools that any Claude agent can call. Reference: `DATA-EXTRACTION-STRATEGY.md` — MCP Server Layer section.

## Handoff checklist before ending your session

When you finish a task, write a new version of this file at the same path:
`c:\AA Code\Educator marketplace\.claude\CONTINUATION-PROMPT.md`

The updated file must:
1. Move completed tasks into the "What was just completed" section with exact file names changed
2. Update "Next priorities" to reflect what remains
3. End with this same handoff checklist
4. Be fully self-contained — someone with zero prior context should paste it and go
```