# Audio Suite v2 — Sequential Implementation Guide

**Project:** the platform / University of Kentucky
**Status:** Pre-implementation — architect reference
**Target Stack:** Next.js 16 App Router · Prisma v7 / Neon · Redis · Azure Blob + CDN · Azure Cognitive Services TTS · Anthropic SDK (Haiku + Sonnet)

---

## Architectural North Star

The four phases resolve a single economic tension: **personalization costs money, caching saves money**. Each phase adds a cache tier that absorbs progressively more of the request load before it reaches the expensive tier above it.

```
Phase 4 (Haiku delta, per-student)     ← lightweight real-time personalization
    ↑ miss
Phase 3 (Azure Blob MP3 + CDN)         ← ~90% hit rate after first render
    ↑ miss
Phase 2 (Adapted script JSON by duration) ← ~80% hit rate after first request
    ↑ miss
Phase 1 (Base annotated script JSON)   ← shared by all users, one Sonnet pass per doc
    ↑ miss
Full generation pipeline (45–90s, async job)
```

A student on their second listen of a popular episode never touches Phases 1 or 2 — they hit the CDN in Phase 3 directly. Personalization (Phase 4) runs as a lightweight Haiku post-processing pass *on the cached Tier 2 script*, not a full regeneration.

---

## Existing Foundation — Do Not Rebuild

Before writing new code, know what already exists:

| Asset | Location | Role in Audio Suite |
|---|---|---|
| `useAudioPlayer.ts` | `app/hooks/useAudioPlayer.ts` | Queue-based chunk playback — Phase 4 UX extends this |
| `/api/audio/synthesize` | `app/api/audio/synthesize/route.ts` | Current OpenAI TTS — Phase 3 replaces for podcast mode; keep for interactive voice |
| `audio-experience.ts` | `app/lib/audio-experience.ts` | Voice configs — `AudioEngine` type already includes `'azure'`; extend, don't replace |
| `document-chunker.ts` | `app/lib/document-chunker.ts` | Existing RAG chunker — reuse directly for PDF preprocessing |
| `embedding-service.ts` | `app/lib/embedding-service.ts` | Existing embedding pipeline — reuse for hallucination source lookup |
| `vector-store.ts` | `app/lib/vector-store.ts` | pgvector RAG — Phase 2 hallucination check uses this |
| `redis.ts` | `app/lib/redis.ts` | Upstash Redis client — Phase 1 uses for L1 script cache |
| `server-auth.ts` | `app/lib/server-auth.ts` | All `require*User` guards — every new route must use this |
| `prisma.ts` | `app/lib/prisma.ts` | Canonical PrismaPg singleton — never reinvent |

---

## ─── KICKOFF PROMPT: Start Phase 1 ───

> Copy this entire block into a new Claude Code conversation to begin Phase 1.

```
You are beginning work on the platform — Audio Suite v2 for the University of Kentucky.

This is a greenfield feature sprint. Nothing audio-suite-related exists yet beyond what is listed below.

CODEBASE CONTEXT:
- Next.js 16 App Router, TypeScript, Tailwind v4 (no @apply, utility classes only)
- Prisma v7 with Neon PostgreSQL. Schema: prisma/schema.prisma. NO `url` in datasource block.
- Runtime DB client: always import from app/lib/prisma.ts (PrismaPg adapter singleton). Never instantiate PrismaClient directly.
- Generated client output: app/generated/prisma
- Auth: every API route.ts MUST call requireRequestUser (or requireStudentUser/requireAdminUser) from app/lib/server-auth.ts before any DB access. No exceptions.
- Icons: lucide-react only
- Build check: npm run lint && npx tsc --noEmit && npm run build

EXISTING FILES YOU MUST READ BEFORE WRITING ANYTHING:
1. prisma/schema.prisma — read the full file so you append correctly and don't duplicate enums or break relations
2. app/lib/prisma.ts — understand the singleton pattern; you will import this, not modify it
3. app/lib/server-auth.ts — understand requireRequestUser signature for the API routes you will create

YOUR TASK — EXECUTE THESE TWO TASKS IN ORDER. DO NOT PROCEED TO TASK 1.2 UNTIL TASK 1.1 IS VERIFIED.

─────────────────────────────────────────────
TASK 1.1 — Add Audio Suite schema to prisma/schema.prisma
─────────────────────────────────────────────

Append the following models to the END of prisma/schema.prisma. Do not modify any existing model except adding the `audioHistory StudentAudioHistory[]` relation to the User model.

Models to add:

AudioEpisode:
  id              String   @id @default(cuid())
  contentHash     String   -- sha256 of normalized source text (Tier 1 cache key)
  sourceType      String   -- "pdf" | "session_transcript" | "course_material" | "custom_text"
  sourceName      String
  courseId        String?
  toolId          String?
  baseScriptPath  String?  -- Azure Blob: /scripts/{hash}/base.json
  baseScriptAt    DateTime?
  script5minPath  String?
  script15minPath String?
  script30minPath String?
  script5minAt    DateTime?
  script15minAt   DateTime?
  script30minAt   DateTime?
  hallucinationCheckPassed Boolean @default(true)
  hallucinationFlaggedClaims Json? -- array of { claim, segment, verdict }
  isStale         Boolean  @default(false)
  staleAt         DateTime?
  staleReason     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  Relations: audioRenders AudioRender[], generationJobs AudioGenerationJob[], studentHistory StudentAudioHistory[]
  Indexes: contentHash, courseId, isStale

AudioRender:
  id           String   @id @default(cuid())
  episodeId    String   (FK → AudioEpisode, onDelete: Cascade)
  scriptHash   String   -- sha256 of the AdaptedScript JSON (Tier 3 cache key)
  duration     String   -- "5min" | "15min" | "30min" | "full"
  voiceAId     String
  voiceBId     String
  blobPath     String
  cdnUrl       String
  fileSizeBytes Int
  durationSecs  Int
  isStale      Boolean  @default(false)
  createdAt    DateTime @default(now())
  Unique: [scriptHash, voiceAId, voiceBId]
  Index: episodeId, isStale

AudioGenerationJob:
  id          String   @id @default(cuid())
  episodeId   String?  (nullable FK → AudioEpisode)
  requestedBy String   -- userId
  sourceText  String   @db.Text
  sourceType  String
  sourceName  String
  duration    String
  voiceAId    String
  voiceBId    String
  courseId    String?
  toolId      String?
  status      AudioJobStatus @default(PENDING)
  stage       String?
  progressPct Int      @default(0)
  error       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  startedAt   DateTime?
  completedAt DateTime?
  Indexes: [requestedBy, status], [status, createdAt]

StudentAudioHistory:
  id             String   @id @default(cuid())
  studentId      String   (FK → User, onDelete: Cascade)
  episodeId      String   (FK → AudioEpisode, onDelete: Cascade)
  completedPct   Float    @default(0)
  lastPositionMs Int      @default(0)
  listenCount    Int      @default(0)
  markedTimestamps Int[]
  completedAt    DateTime?
  firstListenAt  DateTime @default(now())
  lastListenAt   DateTime @default(now())
  Unique: [studentId, episodeId]
  Indexes: [studentId, lastListenAt], episodeId

Enum to add:
  enum AudioJobStatus { PENDING, PROCESSING, COMPLETED, FAILED }

After editing the schema file, run:
  npx prisma migrate dev --name add-audio-suite
  npx prisma generate

Verify: the migration completes without error and `app/generated/prisma` contains the new types.

─────────────────────────────────────────────
TASK 1.2 — Create app/lib/audio-content-hash.ts
─────────────────────────────────────────────

Create this file. It must export two functions:

1. normalizeSource(text: string): string
   - Strip: standalone page numbers (lines matching /^\d+$/ or /^Page \d+/i), bibliography/references sections (everything after a line matching /^references$/i or /^bibliography$/i), figure captions (lines matching /^Figure \d+[:.]/i or /^Fig\. \d+/i), running headers that repeat across pages (detect by finding lines that appear 3+ times and are < 80 chars)
   - Collapse multiple whitespace/newlines to single space
   - Trim and lowercase the result
   - Return the normalized string

2. contentHash(text: string): string
   - Accepts raw or pre-normalized text
   - Internally calls normalizeSource(text)
   - Returns sha256 hex digest using Node's built-in `crypto` module: createHash('sha256').update(normalized).digest('hex')
   - This must be deterministic: same input → same output, always

3. scriptHash(scriptJson: unknown): string
   - JSON.stringify the input, then sha256 hex digest
   - Used for Tier 3 cache keys (AudioRender.scriptHash)

No external dependencies. Use only Node built-ins (crypto). This file has no side effects.

After creating the file, verify:
  npx tsc --noEmit

COMPLETION CRITERIA:
- Migration applied, Prisma types generated, no migration errors
- audio-content-hash.ts exists with all three exported functions, zero TypeScript errors
- Run: npm run lint && npx tsc --noEmit
- Report back with: (1) the migration name Prisma assigned, (2) confirmation that AudioGenerationJob and StudentAudioHistory types are visible in app/generated/prisma, (3) a sample hash output for the input string "Hello World" to confirm the function works
```

---

## Phase 1: The Data Foundation & Caching Registry

### Technical Objectives

1. Define the complete Prisma schema for all Audio Suite models — episode registry, generation jobs, student history, and stale-content tracking.
2. Implement Azure Blob Storage integration for script JSON and MP3 file storage.
3. Build the content hashing utility that generates deterministic, normalized cache keys from source documents.
4. Stand up the `audio_generation_jobs` polling infrastructure (DB-backed async queue, no external queue service in v1).
5. Deliver a working `POST /api/audio/generate` endpoint that enqueues a job and returns a `jobId`, and a `GET /api/audio/jobs/[jobId]` status endpoint.

### Files to Create / Modify

#### Schema — `prisma/schema.prisma`

Add the following models at the end of the existing schema:

```prisma
// ─────────────────────────────────────────────
// Audio Suite v2
// ─────────────────────────────────────────────

model AudioEpisode {
  id              String   @id @default(cuid())
  contentHash     String   // sha256(normalizedSourceText) — Tier 1 key
  sourceType      String   // "pdf" | "session_transcript" | "course_material" | "custom_text"
  sourceName      String   // Display name for the source document
  courseId        String?  // Optional course association
  toolId          String?  // Optional tool association (for session recaps)

  // Tier 1 — Base script (shared by all users)
  baseScriptPath  String?  // Azure Blob path: /scripts/{contentHash}/base.json
  baseScriptAt    DateTime?

  // Tier 2 — Duration variants (generated on first request for each duration)
  script5minPath  String?  // Azure Blob path: /scripts/{contentHash}/5min.json
  script15minPath String?  // Azure Blob path: /scripts/{contentHash}/15min.json
  script30minPath String?  // Azure Blob path: /scripts/{contentHash}/30min.json
  script5minAt    DateTime?
  script15minAt   DateTime?
  script30minAt   DateTime?

  // Tier 3 — Rendered audio (per voice pair)
  audioRenders    AudioRender[]

  // Staleness tracking
  isStale         Boolean  @default(false)
  staleAt         DateTime?
  staleReason     String?  // "source_updated" | "manual_invalidation"

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  generationJobs  AudioGenerationJob[]
  studentHistory  StudentAudioHistory[]

  @@index([contentHash])
  @@index([courseId])
  @@index([isStale])
}

model AudioRender {
  id           String   @id @default(cuid())
  episodeId    String
  episode      AudioEpisode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  scriptHash   String   // sha256(scriptJSON) — Tier 3 key
  duration     String   // "5min" | "15min" | "30min" | "full"
  voiceAId     String   // Azure voice name for Host A
  voiceBId     String   // Azure voice name for Host B

  blobPath     String   // Azure Blob path: /audio/{scriptHash}/{voiceA}-{voiceB}.mp3
  cdnUrl       String   // Public CDN URL
  fileSizeBytes Int
  durationSecs Int

  isStale      Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@unique([scriptHash, voiceAId, voiceBId])
  @@index([episodeId])
  @@index([isStale])
}

model AudioGenerationJob {
  id          String   @id @default(cuid())
  episodeId   String?  // null until episode record is created
  episode     AudioEpisode? @relation(fields: [episodeId], references: [id])

  requestedBy String   // userId
  sourceText  String   // @db.Text — the raw source content
  sourceType  String
  sourceName  String
  duration    String   // "5min" | "15min" | "30min" | "full"
  voiceAId    String
  voiceBId    String
  courseId    String?
  toolId      String?

  // Job state machine
  status      AudioJobStatus @default(PENDING)
  stage       String?        // Current pipeline stage description for UI
  progressPct Int            @default(0)

  // Results and errors
  error       String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  startedAt   DateTime?
  completedAt DateTime?

  @@index([requestedBy, status])
  @@index([status, createdAt])
}

model StudentAudioHistory {
  id             String   @id @default(cuid())
  studentId      String
  student        User     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  episodeId      String
  episode        AudioEpisode @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  // Playback state
  completedPct   Float    @default(0)   // 0.0–1.0
  lastPositionMs Int      @default(0)   // Resume from here
  listenCount    Int      @default(0)

  // Annotation pins
  markedTimestamps Int[]  // Array of millisecond timestamps the student pinned

  // Completion tracking
  completedAt    DateTime?               // Set when completedPct >= 0.9

  firstListenAt  DateTime @default(now())
  lastListenAt   DateTime @default(now())

  @@unique([studentId, episodeId])
  @@index([studentId, lastListenAt])
  @@index([episodeId])
}

enum AudioJobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}
```

Also add to the `User` model:
```prisma
  audioHistory    StudentAudioHistory[]
```

#### New Files

| File | Purpose |
|---|---|
| `app/lib/audio-content-hash.ts` | `normalizeSource(text): string` + `contentHash(normalized): string` |
| `app/lib/azure-blob-storage.ts` | `uploadScript()`, `getScript()`, `uploadAudio()`, `getAudioCdnUrl()`, `markStale()` — wraps `@azure/storage-blob` |
| `app/lib/audio-generation-queue.ts` | `enqueueJob()`, `getJobStatus()`, `claimNextPendingJob()` — DB-backed queue logic |
| `app/api/audio/generate/route.ts` | `POST` — validate request, hash content, check Tier 1–3 cache, enqueue job if miss, return `{ jobId, episodeId? }` |
| `app/api/audio/jobs/[jobId]/route.ts` | `GET` — returns `{ status, stage, progressPct, episodeId?, cdnUrl? }` |
| `app/api/audio/episodes/route.ts` | `GET` — list episodes for current user's courses (for /audio home screen queue) |

#### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add models above |
| `app/lib/audio-experience.ts` | Add `AZURE_TTS_VOICES` constant + `PodcastHostPair` interface; keep existing OpenAI voices for interactive mode |
| `package.json` | Add `@azure/storage-blob` dependency |

### Key Implementation Details

**Content hash normalization (`audio-content-hash.ts`):**
```typescript
// Strip: footnotes, page numbers (^\d+$), bibliography entries,
// figure captions (Figure \d+:...), running headers/footers.
// Collapse whitespace. Lowercase. Return normalized string.
// Then: crypto.createHash('sha256').update(normalized).digest('hex')
```
The hash must be deterministic — the same PDF uploaded twice with different metadata must produce the same hash. Hash the *extracted text body only*, not the file bytes.

**Azure Blob Storage structure:**
```
Container: sandbox-audio (private, CDN-fronted for /audio/ prefix)
├── scripts/{contentHash}/base.json
├── scripts/{contentHash}/5min.json
├── scripts/{contentHash}/15min.json
├── scripts/{contentHash}/30min.json
└── audio/{scriptHash}/{voiceA}-{voiceB}.mp3
```

**Job queue (no external service in v1):**
The `AudioGenerationJob` table is the queue. A background route (`/api/audio/process-job`) is called by the generation endpoint itself via a fire-and-forget `fetch` with `waitUntil` pattern — or by a cron route on Vercel. In v1, the generation endpoint kicks off processing immediately in a non-blocking fashion. Polling via `GET /api/audio/jobs/[jobId]` is the client contract.

**Stale content handling:**
When a source document changes (detected by hash mismatch on re-upload), mark the existing `AudioEpisode.isStale = true`, set `staleAt`. Do NOT delete existing `AudioRender` records — in-progress listeners need 7 days of continued access. New generation creates a fresh `AudioEpisode` with the new hash. Stale episodes are excluded from the home screen queue but remain accessible via direct URL.

**Required env vars for Phase 1:**
```
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONTAINER_NAME=sandbox-audio
AZURE_CDN_HOSTNAME=          # e.g. sandbox-audio.azureedge.net
```

### Success Criteria

Phase 1 is complete when all of the following pass:

1. `npx prisma migrate dev --name add-audio-suite` runs without error and `npx prisma generate` produces updated types.
2. `POST /api/audio/generate` with a valid text payload and user auth returns `{ jobId: "...", status: "PENDING" }` within 200ms.
3. `GET /api/audio/jobs/[jobId]` returns `{ status: "PENDING", progressPct: 0, stage: "Queued" }` immediately after enqueueing.
4. A 2000-character test string produces a stable SHA-256 hash (same input → same output across calls).
5. `uploadScript(contentHash, 'base', jsonPayload)` stores a file in Azure Blob and `getScript(contentHash, 'base')` retrieves the same JSON without data loss.
6. `GET /api/audio/episodes` returns a `200` with an empty array `[]` for a new user (no crash).
7. `npm run lint && npx tsc --noEmit && npm run build` passes with zero errors.

---

## ─── SEQUENTIAL HANDOFF PROMPT: Phase 1 → Phase 2 ───

> Copy this entire block into a new Claude Code conversation when starting Phase 2.

```
You are continuing work on the platform — Audio Suite v2 for the University of Kentucky.

WHAT WAS BUILT IN PHASE 1:
Phase 1 is complete and passing build. The following now exists:

Schema models (in prisma/schema.prisma, migration applied):
- AudioEpisode: content registry keyed by sha256(normalizedSourceText), tracks Azure Blob paths for base script and three duration variants (5min/15min/30min), has isStale flag
- AudioRender: Tier 3 cache record — one row per (scriptHash, voiceA, voiceB) combination with Azure CDN URL
- AudioGenerationJob: DB-backed async job queue with status enum (PENDING/PROCESSING/COMPLETED/FAILED) and progressPct
- StudentAudioHistory: per-student listen records with completedPct, lastPositionMs, markedTimestamps[]

Key lib files (fully implemented):
- app/lib/audio-content-hash.ts — normalizeSource(text) + contentHash(text): both exported
- app/lib/azure-blob-storage.ts — uploadScript(hash, variant, json), getScript(hash, variant), uploadAudio(scriptHash, voiceA, voiceB, buffer), getAudioCdnUrl(scriptHash, voiceA, voiceB)
- app/lib/audio-generation-queue.ts — enqueueJob(params): Promise<AudioGenerationJob>, getJobStatus(jobId): Promise<...>, claimNextPendingJob(): Promise<AudioGenerationJob | null>

Working API routes:
- POST /api/audio/generate — validates input, hashes content, checks Tier 1/2 cache in DB, enqueues job if miss, kicks off background processing via fire-and-forget fetch('/api/audio/process-job'), returns { jobId, episodeId? }
- GET /api/audio/jobs/[jobId] — returns { status, stage, progressPct, episodeId?, cdnUrl? }
- GET /api/audio/episodes — returns user's available episodes (currently empty for new users)

Env vars configured: AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_CONTAINER_NAME=sandbox-audio, AZURE_CDN_HOSTNAME
Build: PASSING. 0 TypeScript errors.

FILE CONTEXT YOU NEED:
- app/lib/document-chunker.ts — existing RAG chunker (reuse directly for PDF preprocessing; ~1000-token chunks with overlap)
- app/lib/embedding-service.ts — existing embedding pipeline (reuse for hallucination source lookup)
- app/lib/audio-content-hash.ts — normalizeSource, contentHash
- app/lib/audio-generation-queue.ts — claimNextPendingJob, enqueueJob
- app/lib/azure-blob-storage.ts — uploadScript, getScript
- app/lib/prisma.ts — canonical DB singleton
- app/lib/server-auth.ts — requireRequestUser (all new routes must use this)

YOUR TASK — EXECUTE THESE TWO TASKS IN ORDER:

TASK 2.1 — Create app/lib/audio-script-generator.ts
This is the core Tier 1 generation pipeline. Implement:
1. preprocessSource(text: string): AnnotatedSource — uses document-chunker.ts for chunking, runs parallel Haiku calls to get 2-sentence summaries per chunk, builds hierarchical section summaries, extracts key concepts (5-10) and hook candidates (surprising stats, named individuals, contrarian claims, causal claims), scores each paragraph for density (key terms per sentence → [DENSE] marker), returns a structured AnnotatedSource object with: chunks, chunkSummaries, sectionSummaries, keyConcepts, hookCandidates, densityMap, jargonTerms
2. generateBaseScript(source: AnnotatedSource, sourceName: string): Promise<BaseScript> — single Sonnet call using source.sectionSummaries + source.keyConcepts + source.hookCandidates to produce a full annotated script JSON with: hosts (A/B), segments (hook, context_bridge, chapter[], callback, lightbulb, so_what, cliffhanger), each segment has text, [DENSE]|[HOOK]|[CALLBACK_CANDIDATE] markers, estimatedDurationSecs
3. generateDurationVariant(base: BaseScript, duration: '5min'|'15min'|'30min'): Promise<AdaptedScript> — Haiku call that applies editorial filter rules from the brainstorm: 5min = hook only + top concept + punchy prose; 15min = hook + 3 chapters + callback + so_what + cliffhanger; 30min = 15min + fourth concept + tangent section + nuance debate
4. runHallucinationCheck(script: AdaptedScript, sourceChunks: string[]): Promise<HallucinationResult> — Second Haiku pass: for each specific factual claim in the script (statistics, named individuals, formulas, case citations, specific dates), verify it appears in sourceChunks. Returns { passed: boolean, flaggedClaims: Array<{ claim: string, segment: string, verdict: 'verified'|'unverified' }> }. If passed=false, mark the episode as needing review but do NOT block generation — log the flagged claims to the AudioEpisode record.

TASK 2.2 — Create app/api/audio/process-job/route.ts
This is the background job processor called fire-and-forget by /api/audio/generate. It must:
1. Use requireRequestUser for auth (or verify a shared CRON_SECRET header for background invocation — match the existing pattern in app/api/news-fetch/route.ts)
2. Call claimNextPendingJob() — if no job, return 200 immediately
3. Run the full Tier 1 + Tier 2 pipeline for the claimed job:
   - preprocessSource → generateBaseScript → runHallucinationCheck → uploadScript(hash, 'base', baseScript)
   - In parallel: generateDurationVariant('5min'), generateDurationVariant('15min'), generateDurationVariant('30min')
   - uploadScript for all three variants
   - Update AudioGenerationJob progressPct at each stage (20% → chunking complete, 40% → base script done, 60% → hallucination check done, 80% → duration variants done, 100% → complete)
   - On completion: set job.status = COMPLETED, create/update AudioEpisode record with blob paths
4. Error handling: wrap entire pipeline in try/catch — on any failure set job.status = FAILED, job.error = message

ARCHITECTURE CONSTRAINTS (same as always):
- Thin routes: move all business logic into lib files
- requireRequestUser or CRON_SECRET on every route
- Use the shared prisma singleton from app/lib/prisma.ts
- Anthropic SDK: Haiku for cheap/parallel steps (chunking summaries, duration variants, hallucination check), Sonnet for base script generation only
- No TypeScript errors — run npx tsc --noEmit before reporting done
```

---

## Phase 2: The Generation Pipeline

### Technical Objectives

1. Build the PDF/text preprocessing pipeline that produces `AnnotatedSource` objects with density scores, hook candidates, key concepts, and jargon maps.
2. Implement Tier 1 base script generation (Sonnet — expensive, runs once per unique content hash).
3. Implement Tier 2 duration variant generation (Haiku — three parallel editorial filter passes on the Tier 1 base).
4. Ship the mandatory hallucination check (second Haiku pass validating every specific claim traces to the source document).
5. Wire the full pipeline into `POST /api/audio/process-job` with stage-by-stage progress tracking.

### Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `app/lib/audio-script-generator.ts` | **Create** | Full Tier 1 + Tier 2 generation pipeline |
| `app/lib/audio-script-types.ts` | **Create** | Shared TypeScript types: `AnnotatedSource`, `BaseScript`, `AdaptedScript`, `ScriptSegment`, `HallucinationResult` |
| `app/api/audio/process-job/route.ts` | **Create** | Background job processor — claims job from queue, runs full pipeline, updates progress |
| `app/api/audio/generate/route.ts` | **Modify** | Wire to `audio-script-generator.ts`; cache check logic (hit Tier 1 → skip to Tier 2; hit Tier 2 → skip to Tier 3) |

### Generation Pipeline Sequence

```
PDF text / session transcript / course material
    ↓
normalizeSource() → contentHash()         [audio-content-hash.ts — Phase 1]
    ↓
documentChunker()                          [document-chunker.ts — existing]
    ↓ parallel Haiku calls
chunkSummaries[]: 2-sentence summaries
    ↓
hierarchicalSummary(): section summaries
    ↓
extractKeyConceptsAndHooks(): Haiku pass
    ↓
scoreParaDensity(): [DENSE] markers
    ↓
AnnotatedSource object
    ↓
generateBaseScript(): Sonnet call          [EXPENSIVE — run once, cache forever]
    ↓ upload → Azure Blob /scripts/{hash}/base.json
    ↓ parallel Haiku calls
[5min variant] [15min variant] [30min variant]
    ↓
runHallucinationCheck(): Haiku pass        [NON-OPTIONAL for academic content]
    ↓ upload → Azure Blob /scripts/{hash}/{duration}.json
    ↓
Update AudioEpisode + AudioGenerationJob   [status: COMPLETED]
```

### Sonnet Prompt Architecture (Tier 1 Base Script)

The Sonnet call is the highest-leverage prompt in the system. It must receive:

```
SYSTEM:
You are a podcast script writer producing two-host educational audio for university students.
Host A is "Alex" — the curious, eager-to-understand voice who asks the questions the listener is thinking.
Host B is "Sam" — the calm, precise explainer who never condescends.

The script structure is FIXED:
1. HOOK (30-90s): Most surprising/counterintuitive fact. NEVER "Today we cover Chapter X."
2. CONTEXT_BRIDGE (30-60s): Why this matters RIGHT NOW to a student in this course.
3. CHAPTER_1: Core concept 1 — explained, illustrated, connected.
4. CALLBACK: Reference back to the hook ("This is exactly why...")
5. CHAPTER_2: Core concept 2, building on Chapter 1.
6. LIGHTBULB: Hosts synthesize the connection. PERFORMED, not stated.
7. CHAPTER_3 (optional for 30min+): Surprising corollary.
8. SO_WHAT: Practical applications and exam implications.
9. CLIFFHANGER: End on one open question. The NEXT episode must resolve this.

Mark dense passages: [DENSE]
Mark callback opportunities: [CALLBACK_CANDIDATE]
Mark hook material: [HOOK]
Output format: JSON matching the BaseScript type.

USER:
Source name: {sourceName}
Key concepts to cover (mandatory): {keyConcepts}
Hook candidates (use the strongest): {hookCandidates}
Dense passages to slow-walk: {densityMap}
Jargon to define on first use: {jargonTerms}
Section summaries: {sectionSummaries}
```

### Hallucination Check — Non-Optional Design

The hallucination check runs as a separate Haiku pass after script generation. It:

1. Extracts all specific factual claims from the script: statistics (`"73% of..."`, formulas, case citations, specific dates, named individuals with attributed statements).
2. For each claim, searches `sourceChunks` for matching text (fuzzy, not exact).
3. Returns a `HallucinationResult` with `flaggedClaims[]`.

**Critical design decision:** A failed hallucination check does NOT block episode delivery. It:
- Sets `AudioEpisode.hallucinationCheckPassed = false`
- Logs `flaggedClaims` to the DB
- Appends a disclaimer to the episode metadata that the player UI must display: _"One or more claims in this episode could not be directly traced to the source document. Verify before exams."_

This is the academically responsible approach — blocking delivery over one uncertain claim creates poor UX; surfacing the uncertainty creates informed students.

### Success Criteria

Phase 2 is complete when:

1. `POST /api/audio/generate` with a 500-word source text completes the full pipeline within 90 seconds (async — the client polls; the job reaches `COMPLETED` within that window).
2. The Azure Blob container contains `/scripts/{contentHash}/base.json` and all three duration variant files after a successful job.
3. A second `POST /api/audio/generate` with the **same source text** returns immediately with `{ episodeId: "...", cdnUrl: null, status: "CACHED_SCRIPT" }` — the job does not re-run Sonnet.
4. The `runHallucinationCheck()` function flags a deliberately injected false claim ("The boiling point of water is 150°C") when the source text says 100°C.
5. A `BaseScript` JSON produced by Sonnet successfully parses against the `BaseScript` TypeScript type with zero casting errors.
6. `npm run lint && npx tsc --noEmit && npm run build` passes.

---

## ─── SEQUENTIAL HANDOFF PROMPT: Phase 2 → Phase 3 ───

> Copy this entire block into a new Claude Code conversation when starting Phase 3.

```
You are continuing work on the platform — Audio Suite v2 for the University of Kentucky.

WHAT WAS BUILT IN PHASES 1 & 2:
Phases 1 and 2 are complete and passing build. The system can now:
- Hash and normalize source content (app/lib/audio-content-hash.ts)
- Store and retrieve script JSON from Azure Blob Storage (app/lib/azure-blob-storage.ts)
- Enqueue and claim generation jobs via DB queue (app/lib/audio-generation-queue.ts)
- Run the full Tier 1 + Tier 2 generation pipeline (app/lib/audio-script-generator.ts):
  - preprocessSource(): document chunking → Haiku summaries → AnnotatedSource
  - generateBaseScript(): Sonnet → full annotated BaseScript JSON, uploaded to Blob
  - generateDurationVariant(): Haiku → AdaptedScript for 5min/15min/30min, uploaded to Blob
  - runHallucinationCheck(): Haiku → verifies claims against source chunks, flags unverified
- Process jobs in background via POST /api/audio/process-job with stage-by-stage progressPct

Schema models (migration applied, Prisma generated):
AudioEpisode, AudioRender, AudioGenerationJob, StudentAudioHistory

Build: PASSING. 0 TypeScript errors.

CRITICAL FILE CONTEXT YOU NEED:
- app/lib/audio-script-types.ts — AdaptedScript, BaseScript, ScriptSegment types
- app/lib/azure-blob-storage.ts — uploadAudio(scriptHash, voiceA, voiceB, buffer): Promise<string cdnUrl>, getScript(hash, variant)
- app/lib/audio-experience.ts — existing AudioEngine type (already includes 'azure'), OPENAI_AUDIO_VOICES — ADD Azure voices here
- app/api/audio/synthesize/route.ts — existing OpenAI TTS route (DO NOT DELETE — still used for interactive voice chat; podcast mode gets a separate renderer)
- prisma/schema.prisma — AudioRender model (fields: scriptHash, duration, voiceAId, voiceBId, blobPath, cdnUrl, fileSizeBytes, durationSecs)
- app/lib/prisma.ts — canonical DB singleton
- app/lib/server-auth.ts — requireRequestUser

YOUR TASK — EXECUTE THESE TWO TASKS IN ORDER:

TASK 3.1 — Create app/lib/azure-tts.ts
Azure Cognitive Services TTS integration for podcast-mode audio rendering. Implement:

1. renderScriptToAudio(script: AdaptedScript, voiceAId: string, voiceBId: string): Promise<Buffer>
   - Accepts an AdaptedScript with segments each having { speaker: 'A'|'B', text: string, markers: string[] }
   - Builds an SSML document for the full episode (Azure TTS accepts SSML, not plain text)
   - Apply rate/prosody adjustments for [DENSE] segments: add <prosody rate="slow"> wrapping, increase pauses between sentences
   - Apply natural pauses between speaker turns: <break time="500ms"/> between A and B exchanges
   - Apply longer pauses at structural breaks (chapter transitions): <break time="1200ms"/>
   - Call Azure Cognitive Services REST API: POST https://{region}.tts.speech.microsoft.com/cognitiveservices/v1
     Headers: Ocp-Apim-Subscription-Key, Content-Type: application/ssml+xml, X-Microsoft-OutputFormat: audio-48khz-96kbitrate-mono-mp3
   - Stream response → collect full MP3 buffer
   - Target: full 15-min episode renders in under 45 seconds (Azure TTS streams synthesis; collect chunks)
   - Wrap in AbortSignal.timeout(120_000) for a 2-minute ceiling

2. synthesizeChunk(text: string, voiceId: string, speakingStyle?: string): Promise<Buffer>
   - Single-segment synthesis for interactive voice mode (future use)
   - Reuses Azure auth; returns raw MP3 buffer

3. buildSSML(segments: ScriptSegment[], voiceAId: string, voiceBId: string): string
   - Pure function, no side effects — testable in isolation
   - Handles [DENSE], [HOOK], [CALLBACK_CANDIDATE] markers
   - Produces valid Azure SSML with <speak version="1.0"> root

Required env vars (add to .env.example):
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_KEY=

TASK 3.2 — Create app/api/audio/render/route.ts
Background route that handles Tier 3 rendering — called after Tier 2 scripts are cached. Implement:

1. POST /api/audio/render
   - Auth: verify CRON_SECRET header (same pattern as app/api/news-fetch/route.ts — crypto.timingSafeEqual)
   - Body: { episodeId: string, duration: '5min'|'15min'|'30min', voiceAId: string, voiceBId: string }
   - Check AudioRender table for existing render with matching scriptHash + voiceAId + voiceBId — return { cdnUrl } immediately if found
   - If no existing render:
     a. Fetch AdaptedScript JSON from Azure Blob via getScript(contentHash, duration)
     b. Compute scriptHash: sha256(JSON.stringify(adaptedScript))
     c. Check AudioRender again with scriptHash (script may be shared across episodes if content was identical)
     d. Call renderScriptToAudio(script, voiceAId, voiceBId) → MP3 buffer
     e. uploadAudio(scriptHash, voiceAId, voiceBId, buffer) → cdnUrl
     f. Create AudioRender record: { episodeId, scriptHash, duration, voiceAId, voiceBId, blobPath, cdnUrl, fileSizeBytes, durationSecs }
     g. Update AudioGenerationJob to COMPLETED with final cdnUrl
   - Return { cdnUrl, durationSecs, fileSizeBytes }

2. GET /api/audio/render/[episodeId]
   - Auth: requireRequestUser
   - Return all AudioRender records for this episode (for the player to select voice pair)
   - Include: { id, duration, voiceAId, voiceBId, cdnUrl, durationSecs, isStale }

ARCHITECTURE CONSTRAINTS:
- Thin routes — all SSML and rendering logic lives in app/lib/azure-tts.ts
- requireRequestUser or CRON_SECRET on every route — no exceptions
- Use shared prisma singleton
- No TypeScript errors
- The existing /api/audio/synthesize route must continue to function unchanged (OpenAI TTS for interactive voice)
```

---

## Phase 3: The Audio Rendering Engine

### Technical Objectives

1. Integrate Azure Cognitive Services TTS as the rendering engine for podcast-mode audio (replacing OpenAI TTS for this use case only — interactive voice chat keeps OpenAI).
2. Build an SSML generation layer that maps `AdaptedScript` segment markers (`[DENSE]`, `[HOOK]`, speaker turns) to Azure prosody controls.
3. Implement Tier 3 caching: render MP3 once per `(scriptHash, voiceA, voiceB)` tuple, upload to Azure Blob, serve via CDN URL.
4. Wire `POST /api/audio/render` into the job processor so generation jobs automatically trigger rendering.
5. Add CDN cache-control headers and stale-audio invalidation logic (mark old renders stale when source content changes; do not delete for 7 days).

### Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `app/lib/azure-tts.ts` | **Create** | Azure Cognitive Services TTS: SSML builder + renderScriptToAudio() + synthesizeChunk() |
| `app/api/audio/render/route.ts` | **Create** | POST: background renderer (CRON_SECRET auth). GET: list renders for episode |
| `app/api/audio/process-job/route.ts` | **Modify** | After Tier 2 scripts are cached, fire-and-forget POST /api/audio/render |
| `app/lib/audio-experience.ts` | **Modify** | Add `AZURE_TTS_VOICES` array + `PodcastHostPair` type. Add `azurePodcastPersonas` preset list |
| `app/lib/azure-blob-storage.ts` | **Modify** | Add `invalidateRender(scriptHash, voiceA, voiceB)` — sets CDN Cache-Control purge header on stale renders |

### SSML Architecture

Azure Cognitive Services TTS accepts SSML (Speech Synthesis Markup Language). The SSML generator must handle:

```xml
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
  <!-- HOOK segment — Host A voice, slightly faster, energetic -->
  <voice name="{voiceAId}">
    <prosody rate="medium" pitch="+5%">
      {hookText}
    </prosody>
    <break time="800ms"/>
  </voice>

  <!-- DENSE segment — slow down, Host B explaining -->
  <voice name="{voiceBId}">
    <prosody rate="slow" pitch="0%">
      {denseText}
    </prosody>
    <break time="600ms"/>
  </voice>

  <!-- Chapter break -->
  <break time="1200ms"/>

  <!-- Callback — Host A, with slight upward inflection -->
  <voice name="{voiceAId}">
    <prosody contour="(0%,+5%) (50%,+2%) (100%,+0%)">
      {callbackText}
    </prosody>
  </voice>
</speak>
```

**Prosody rules by marker:**

| Marker | Rate | Pause After | Notes |
|---|---|---|---|
| `[HOOK]` | `medium` | `800ms` | Slightly faster — grabs attention |
| `[DENSE]` | `slow` | `600ms` | Gives listener time to process |
| `[CALLBACK_CANDIDATE]` | `medium` | `500ms` | Reference to earlier content |
| Speaker turn (A→B) | — | `500ms` | Natural conversation gap |
| Chapter break | — | `1200ms` | Structural breathing room |
| Cliffhanger close | `slow` | `1500ms` | Let it land |

### CDN Architecture

Azure Blob Storage is the origin. Azure CDN fronts it with:
- `Cache-Control: public, max-age=2592000` (30 days) on all MP3 files
- On stale invalidation: call Azure CDN purge API for specific paths — do NOT purge all audio
- CDN URL pattern: `https://{AZURE_CDN_HOSTNAME}/audio/{scriptHash}/{voiceA}-{voiceB}.mp3`

The key insight: CDN purge is targeted to the **script hash**, not the content hash. If the script changes (source updated → new Tier 1/2 generation → new scriptHash), the old CDN-cached MP3 remains accessible at its original URL for 7 days (for in-progress listeners), while all new requests generate against the new scriptHash.

### Voice Pair Defaults

Add to `app/lib/audio-experience.ts`:
```typescript
export const AZURE_PODCAST_VOICE_PAIRS: PodcastHostPair[] = [
  {
    id: 'alex-sam-default',
    label: 'Alex & Sam (Default)',
    voiceA: 'en-US-AndrewMultilingualNeural',   // Host A: curious, energetic
    voiceB: 'en-US-AvaMultilingualNeural',        // Host B: calm, precise
  },
  {
    id: 'morgan-jordan',
    label: 'Morgan & Jordan',
    voiceA: 'en-US-BrianMultilingualNeural',
    voiceB: 'en-US-EmmaMultilingualNeural',
  },
  // Add more pairs — each pair creates a distinct Tier 3 cache entry
]
```

### Success Criteria

Phase 3 is complete when:

1. `POST /api/audio/render` called with a valid `episodeId` and voice pair completes within 90 seconds for a 15-minute episode and returns a valid `cdnUrl`.
2. The CDN URL is publicly accessible (no auth required) and plays valid MP3 audio with correct duration.
3. A second `POST /api/audio/render` with the **same** `episodeId` + voice pair returns immediately with the cached `cdnUrl` — no Azure TTS call made.
4. A `[DENSE]`-marked segment in the SSML output contains `<prosody rate="slow">` wrapping.
5. The existing `POST /api/audio/synthesize` (OpenAI TTS) continues to function and return audio for interactive voice chat.
6. `npm run lint && npx tsc --noEmit && npm run build` passes.

---

## ─── SEQUENTIAL HANDOFF PROMPT: Phase 3 → Phase 4 ───

> Copy this entire block into a new Claude Code conversation when starting Phase 4.

```
You are continuing work on the platform — Audio Suite v2 for the University of Kentucky.

WHAT WAS BUILT IN PHASES 1, 2 & 3:
Phases 1–3 are complete and the full generation-to-audio pipeline works end to end. Specifically:

Data layer (Phase 1):
- Schema: AudioEpisode, AudioRender, StudentAudioHistory, AudioGenerationJob (all migrated)
- app/lib/audio-content-hash.ts — normalizeSource(), contentHash()
- app/lib/azure-blob-storage.ts — uploadScript, getScript, uploadAudio, getAudioCdnUrl, invalidateRender
- app/lib/audio-generation-queue.ts — enqueueJob, getJobStatus, claimNextPendingJob

Generation pipeline (Phase 2):
- app/lib/audio-script-types.ts — AnnotatedSource, BaseScript, AdaptedScript, ScriptSegment, HallucinationResult
- app/lib/audio-script-generator.ts — preprocessSource, generateBaseScript (Sonnet), generateDurationVariant (Haiku), runHallucinationCheck (Haiku)
- POST /api/audio/generate — enqueues job, fires background processor
- POST /api/audio/process-job — runs full Tier 1 + Tier 2 pipeline with progressPct updates

Rendering engine (Phase 3):
- app/lib/azure-tts.ts — buildSSML(segments, voiceA, voiceB), renderScriptToAudio(script, voiceA, voiceB), synthesizeChunk(text, voiceId)
- POST /api/audio/render — renders MP3 to Azure Blob, creates AudioRender record with cdnUrl
- GET /api/audio/render/[episodeId] — lists all renders for an episode
- app/lib/audio-experience.ts — extended with AZURE_PODCAST_VOICE_PAIRS, PodcastHostPair type

User flow that works today:
POST /api/audio/generate → job queued → background processing → Tier 1 base script → Tier 2 duration variants → Tier 3 MP3 render → AudioGenerationJob.status = COMPLETED → cdnUrl available

Build: PASSING. 0 TypeScript errors.

CRITICAL FILE CONTEXT YOU NEED:
- app/lib/audio-script-types.ts — all shared types
- app/lib/audio-script-generator.ts — generateDurationVariant() (Haiku) — you will add a personalization delta on top of its output
- app/lib/prisma.ts — DB singleton
- app/lib/server-auth.ts — requireRequestUser, requireStudentUser
- app/lib/redis.ts — Upstash Redis client (for caching personalized delta scripts in memory)
- prisma/schema.prisma — StudentAudioHistory model (fields: studentId, episodeId, completedPct, markedTimestamps[], listenCount)
- app/hooks/useAudioPlayer.ts — existing queue-based player (DO NOT REBUILD — the /audio home screen wraps this)
- app/lib/gradebook-service.ts (if it exists) or relevant gradebook query patterns — for weak-area detection
- app/components/Header.tsx — for adding the /audio nav link (student role only)

YOUR TASK — EXECUTE THESE TWO TASKS IN ORDER:

TASK 4.1 — Create app/lib/audio-personalization.ts
Tier 4 Haiku delta pass — lightweight personalization on top of a cached AdaptedScript. DO NOT generate a new script from scratch. This is a post-processing pass only.

Implement:
1. getStudentPersonalizationContext(studentId: string, episodeId: string, courseId?: string): Promise<PersonalizationContext>
   - Query StudentAudioHistory for this student+episode (prior listen data)
   - If courseId: query gradebook entries for this student in this course, find topics with score < 0.70
   - If studentId has prior AudioHistory for episodes in the same course, get the last 3 episode titles + completion status
   - Return: { previouslyHeard: string[], weakTopics: string[], listenCount: number, lastPositionMs: number }

2. applyPersonalizationDelta(script: AdaptedScript, ctx: PersonalizationContext): Promise<AdaptedScript>
   - Haiku call that modifies (not replaces) the AdaptedScript:
     a. PREVIOUSLY_ON opener: if ctx.previouslyHeard.length > 0, prepend a 30-second "Previously on..." segment referencing the last episode. If listenCount > 0 (returning listener), adjust opener: "Welcome back — picking up where we left off..."
     b. WEAK_TOPIC expansion: for each segment whose topic appears in ctx.weakTopics, append an [EXPANDED] marker and add a brief (2-3 sentence) deeper explanation at the end of that segment
     c. COMFORTABLE_SKIP: identify segments covering topics NOT in ctx.weakTopics and where ctx.listenCount > 1 — mark them [SKIPPABLE] (the player can offer "skip this section?" UI in Phase 4)
   - Return the modified AdaptedScript (do not mutate the original — return a new object)
   - Cache the personalized script in Redis for 1 hour: key = `audio:personalized:{episodeId}:{studentId}`
   - Total Haiku call should be < 2000 tokens — keep the delta small

3. recordListenEvent(studentId: string, episodeId: string, positionMs: number, completedPct: number): Promise<void>
   - Upsert StudentAudioHistory record
   - If completedPct >= 0.9 and history.completedAt is null, set completedAt = now()

4. recordAnnotationPin(studentId: string, episodeId: string, timestampMs: number): Promise<void>
   - Append timestampMs to StudentAudioHistory.markedTimestamps[]
   - Prisma: use { push: timestampMs } for array append

TASK 4.2 — Create the /audio home screen
File: app/audio/page.tsx (server component with client island)
File: app/audio/AudioHomeClient.tsx (client component)

The home screen has exactly THREE sections (from the brainstorm — do not add more):

Section 1 — "Continue Listening" (top, largest visual weight):
- Query StudentAudioHistory where completedPct < 0.9 AND completedPct > 0.05, ordered by lastListenAt DESC, limit 1
- Show: episode title, source name, progress bar (completedPct), estimated time remaining (durationSecs * (1 - completedPct))
- "Resume" button → /audio/player/[episodeId]?t={lastPositionMs}

Section 2 — "Your Queue" (3–5 episodes):
- Priority order: (1) episodes for courses with exams within 72 hours, (2) episodes where gradebook has weak topics, (3) recently generated but unheard episodes
- Show each as a card: title, course name, duration badge, one-line AI-generated summary from the episode's HOOK segment text
- "Listen" button → /audio/player/[episodeId]

Section 3 — "New From Your Courses":
- AudioEpisode records for courses the student is enrolled in, where StudentAudioHistory.listenCount = 0 (never heard), ordered by createdAt DESC, limit 5
- Show educator-published episodes first (they will have a flag in Phase 4 backlog — for now just show all unheard episodes)

Floating action button (fixed bottom-right):
- "Generate New" → opens a slide-up sheet (or navigates to /audio/create) with: text area for source text OR file upload input, duration selector (5 / 15 / 30 / Full), voice pair selector, "Generate" button that calls POST /api/audio/generate and shows job progress via polling GET /api/audio/jobs/[jobId]

Styling:
- UK blue (#0033A0) hero header: "Your Audio Studio" — match the Student Services Hub page header style
- Tailwind v4 utilities only (no @apply, no inline styles)
- lucide-react icons only
- Mobile-first: sections stack vertically on sm:, side-by-side queue+new on md:+

API endpoints needed for this page:
- GET /api/audio/history — returns in-progress episodes for "Continue Listening"
- GET /api/audio/queue — returns prioritized queue (implement priority logic in lib, not route)
Both routes: requireStudentUser, thin route → lib call

Also add to app/components/Header.tsx:
- STUDENT nav: add "Audio" link → /audio, roles: ['STUDENT']

ARCHITECTURE CONSTRAINTS:
- Server component for the page shell (data fetching), client island for interactive elements
- requireStudentUser on all new API routes
- No TypeScript errors — npx tsc --noEmit before reporting done
- Follow existing page patterns: see app/student-services/page.tsx for the hero + grid layout reference
```

---

## Phase 4: The Personalization Layer & UX

### Technical Objectives

1. Implement Tier 4 personalization delta — a lightweight Haiku post-processing pass that injects "previously on" openers, expands weak-area segments, and marks comfortable sections as skippable. Never a full regeneration.
2. Build the `/audio` home screen with the three-section triage layout (Continue Listening, Your Queue, What's New).
3. Wire the student listening history (progress tracking, resume position, annotation pins).
4. Add the "Generate New" flow with real-time job progress polling.
5. Connect gradebook weak-topic data to the personalization context.

### Files to Create / Modify

| File | Action | Purpose |
|---|---|---|
| `app/lib/audio-personalization.ts` | **Create** | Tier 4 delta: getStudentPersonalizationContext, applyPersonalizationDelta, recordListenEvent, recordAnnotationPin |
| `app/audio/page.tsx` | **Create** | Server component: data fetching for all three home sections |
| `app/audio/AudioHomeClient.tsx` | **Create** | Client island: Generate New sheet, job polling, interactive queue |
| `app/audio/player/[episodeId]/page.tsx` | **Create** | Full player page: CDN audio, chapter nav, transcript, progress sync |
| `app/api/audio/history/route.ts` | **Create** | GET: in-progress episodes for Continue Listening |
| `app/api/audio/queue/route.ts` | **Create** | GET: prioritized episode queue (exam urgency → gradebook gaps → new episodes) |
| `app/api/audio/history/[episodeId]/route.ts` | **Create** | PATCH: update listen position + completedPct (called every 10s during playback) |
| `app/api/audio/history/[episodeId]/pins/route.ts` | **Create** | POST: add annotation pin at timestamp |
| `app/components/Header.tsx` | **Modify** | Add "Audio" nav link for STUDENT role |

### Personalization Delta — Economic Model

The critical insight is that Tier 4 is economically viable *only* because it runs on the cached Tier 2 script, not the raw source document. The delta is small:

```
Input to Haiku: AdaptedScript JSON (~3-8KB) + PersonalizationContext (~200 tokens)
Output from Haiku: Modified AdaptedScript (~3-8KB)
Total Haiku tokens: ~2,000-4,000 per request
Cost per personalization: ~$0.001 at current Haiku pricing
```

Compare to Tier 1 Sonnet generation: ~50,000-100,000 tokens for a 60-page PDF → ~$1.50-3.00. Personalization costs 1,000x less.

**Cache the personalized delta in Redis:**
- Key: `audio:personalized:{episodeId}:{studentId}`
- TTL: 3600 seconds (1 hour)
- Rationale: Student's gradebook doesn't change minute-to-minute. A cached personalized script is fresh enough.
- On gradebook grade change: invalidate the Redis key for that student (hook into gradebook update route).

### /audio Home Screen Layout

```
┌─────────────────────────────────────┐
│  🎧 Your Audio Studio    [Generate] │  ← UK blue hero, FAB in header
├─────────────────────────────────────┤
│  CONTINUE LISTENING                 │
│  ┌───────────────────────────────┐  │
│  │ [Episode title]               │  │
│  │ [Course name]     [15 min 🔊] │  │
│  │ ████████████░░░░  64% · 5m left│  │
│  │              [▶ Resume]       │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  YOUR QUEUE                         │
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ card │ │ card │ │ card │        │  ← horizontal scroll on mobile
│  └──────┘ └──────┘ └──────┘        │
├─────────────────────────────────────┤
│  NEW FROM YOUR COURSES              │
│  [episode] [episode] [episode]...   │
└─────────────────────────────────────┘
                     ╔═══════════╗
                     ║ + Generate║  ← floating action button
                     ╚═══════════╝
```

**Design constraint from the brainstorm:** The home screen is a triage surface, not a discovery surface. Students who open `/audio` have already decided to study. Do not make them decide what to do next. Every section presents a ready-to-listen item with zero additional decisions required.

### Queue Priority Algorithm

Implement in `app/lib/audio-queue-service.ts`:

```
Priority score for each available episode:
  +100 if course has exam within 24 hours
  +75  if course has exam within 72 hours
  +50  if episode covers a gradebook weak topic (score < 0.70)
  +25  if episode covers a gradebook moderate topic (score 0.70–0.84)
  +10  if episode was generated in last 48 hours (fresh)
  -50  if student has already heard > 90% of this episode

Sort descending by priority score.
Filter: only episodes for courses the student is enrolled in.
Limit: 5 episodes in the queue.
```

### Player Page — Minimum Viable Spec

`app/audio/player/[episodeId]/page.tsx` must deliver:

1. **Play controls:** Play/pause, skip back 30s, skip forward 30s (matches lock screen Media Session API in `useAudioPlayer.ts`).
2. **Chapter navigation:** List of episode segments from `AdaptedScript.segments` — tap to jump to timestamp.
3. **Synchronized transcript:** Highlight the current segment text as audio plays (approximate — based on elapsed time vs. estimated segment duration).
4. **Progress sync:** Every 10 seconds of playback, `PATCH /api/audio/history/[episodeId]` with current `positionMs` and `completedPct`.
5. **Pin annotation:** Tap "📌" button → calls `POST /api/audio/history/[episodeId]/pins` with current timestamp. Player shows a visual pin marker on the progress bar.
6. **Stale banner:** If `AudioEpisode.isStale = true`, show amber banner: _"This episode was generated from an earlier version of this material. [Regenerate?]"_
7. **Hallucination disclaimer:** If `AudioEpisode.hallucinationCheckPassed = false`, show disclaimer banner per the Phase 2 design.
8. **Source check toggle:** Button that shows/hides which transcript segments are `[DENSE]` or have unverified claims.

### allowAudio Guard

From the brainstorm: _"Student Services sessions must never be audiofied."_

Enforce in `app/lib/student-services.ts` — the existing `ServiceTool` catalog already has a structure. Add `allowAudio: false` to all 5 service tool definitions. The `/api/audio/generate` route must check: if `sourceType === 'session_transcript'` and the session's `toolId` matches a service tool with `allowAudio: false`, return `403 Forbidden` with message `"Audio generation is not available for this session type."`.

### Success Criteria

Phase 4 is complete when:

1. `GET /audio` renders the three-section home screen without errors for `tiana.the.student@uky.edu` (student demo user).
2. "Generate New" flow: entering 200 words of text, selecting 5min duration, tapping Generate → shows a progress bar that polls `GET /api/audio/jobs/[jobId]` and reaches 100% within 90 seconds.
3. A generated episode appears in "Your Queue" section after generation completes (page refresh or live polling).
4. Clicking "Listen" navigates to `/audio/player/[episodeId]` and the audio plays from the CDN URL.
5. After 15 seconds of listening, a `PATCH /api/audio/history/[episodeId]` request is confirmed in browser DevTools Network tab with `{ positionMs: ~15000, completedPct: ~0.05 }`.
6. Refreshing `/audio` shows the episode in "Continue Listening" with the correct progress bar.
7. Tapping "📌" while playing creates a visible pin marker on the progress bar and confirms the DB record via `GET /api/audio/history/[episodeId]`.
8. Attempting to generate audio from a Student Services session transcript returns `403 Forbidden`.
9. "Audio" nav link appears in the Header for the STUDENT role and links to `/audio`.
10. `npm run lint && npx tsc --noEmit && npm run build` passes with zero errors and 153+ pages compiled.

---

## Cross-Phase Architecture Notes

### Azure Service Dependencies Summary

| Service | Purpose | Required From |
|---|---|---|
| Azure Blob Storage (Hot tier) | Script JSON + MP3 storage | Phase 1 |
| Azure CDN | MP3 delivery with 30-day cache | Phase 3 |
| Azure Cognitive Services TTS | Podcast-mode audio rendering | Phase 3 |
| Azure Speech Studio (Custom Neural Voice) | Sandy's branded voice (P3 feature) | Backlog |
| Azure AI Foundry Document Intelligence | Multi-modal PDF parsing for STEM (equations, tables) | Backlog |
| Azure Container Apps | Live Radio stateful session management | Backlog |

### Environment Variable Additions by Phase

```bash
# Phase 1
AZURE_STORAGE_ACCOUNT_NAME=
AZURE_STORAGE_ACCOUNT_KEY=
AZURE_STORAGE_CONTAINER_NAME=sandbox-audio
AZURE_CDN_HOSTNAME=                    # e.g. sandbox-audio.azureedge.net

# Phase 3
AZURE_SPEECH_REGION=eastus
AZURE_SPEECH_KEY=
```

### What This Architecture Intentionally Defers

The following features from the brainstorm are architecturally compatible but explicitly out of scope for Phases 1–4:

- **Live Radio** — requires Azure Container Apps session management; defer to Phase 5
- **Morning Brief** — requires cron + push notification; add a nightly cron route after Phase 4
- **Commute Mode** — requires mobile motion detection; PWA/native app concern
- **Custom Sandy Neural Voice** — Azure Speech Studio training; 30-minute audio recording sprint required
- **Audio Assignments** — requires educator-side rubric builder + AI pre-grading; separate sprint
- **Synchronous Listening Room** — Redis Streams collab bus (already built) + WebSocket fan-out; Phase 5
- **LTI Grade Passback for Audio Assignments** — depends on LTI OIDC sprint completing first

---

---

## ─── COMPLETION PROMPT: After Phase 4 ───

> Copy this entire block into a new Claude Code conversation for post-Phase 4 work (bug fixes, Phase 5 planning, or backlog items).

```
You are continuing work on the platform — Audio Suite v2 for the University of Kentucky.

ALL FOUR PHASES ARE COMPLETE. The full Audio Suite v2 pipeline is live and passing build.

WHAT WAS BUILT ACROSS ALL PHASES:

Phase 1 — Data Foundation:
- Schema: AudioEpisode, AudioRender, AudioGenerationJob, StudentAudioHistory (migrated, Prisma generated)
- app/lib/audio-content-hash.ts — normalizeSource(), contentHash(), scriptHash()
- app/lib/azure-blob-storage.ts — uploadScript, getScript, uploadAudio, getAudioCdnUrl, invalidateRender
- app/lib/audio-generation-queue.ts — enqueueJob, getJobStatus, claimNextPendingJob
- POST /api/audio/generate — cache-check + job enqueue
- GET /api/audio/jobs/[jobId] — status polling
- GET /api/audio/episodes — user's available episodes

Phase 2 — Generation Pipeline:
- app/lib/audio-script-types.ts — AnnotatedSource, BaseScript, AdaptedScript, ScriptSegment, HallucinationResult
- app/lib/audio-script-generator.ts — preprocessSource (Haiku), generateBaseScript (Sonnet), generateDurationVariant (Haiku), runHallucinationCheck (Haiku)
- POST /api/audio/process-job — background job processor with stage-by-stage progressPct (20/40/60/80/100)

Phase 3 — Rendering Engine:
- app/lib/azure-tts.ts — buildSSML(), renderScriptToAudio(), synthesizeChunk()
- POST /api/audio/render — Tier 3 MP3 rendering to Azure Blob + CDN URL; CRON_SECRET auth
- GET /api/audio/render/[episodeId] — list all renders for an episode
- app/lib/audio-experience.ts — extended with AZURE_PODCAST_VOICE_PAIRS, PodcastHostPair type
- Existing POST /api/audio/synthesize (OpenAI TTS) still live for interactive voice chat

Phase 4 — Personalization & UX:
- app/lib/audio-personalization.ts — getStudentPersonalizationContext, applyPersonalizationDelta (Haiku delta), recordListenEvent, recordAnnotationPin
- app/lib/audio-queue-service.ts — priority queue algorithm (exam urgency +100/+75, gradebook gaps +50/+25, freshness +10, heard -50)
- app/audio/page.tsx + AudioHomeClient.tsx — three-section home screen (Continue Listening, Your Queue, New From Your Courses) + Generate New FAB
- app/audio/player/[episodeId]/page.tsx — full player (play/pause, chapter nav, synchronized transcript, 10s progress sync, pin annotations, stale/hallucination banners)
- GET /api/audio/history — in-progress episodes for Continue Listening
- GET /api/audio/queue — prioritized episode queue
- PATCH /api/audio/history/[episodeId] — listen position + completedPct update
- POST /api/audio/history/[episodeId]/pins — annotation pin creation
- Header.tsx — "Audio" nav link added for STUDENT role
- Student Services allowAudio: false guard — service session transcripts return 403 on generate

Env vars in use:
AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_CONTAINER_NAME=sandbox-audio, AZURE_CDN_HOSTNAME, AZURE_SPEECH_REGION, AZURE_SPEECH_KEY

Build: PASSING. 0 TypeScript errors. 153+ pages compiled.

BACKLOG ITEMS (explicitly deferred — see AUDIO_SUITE_ARCHITECTURE.md Cross-Phase Notes):
- Live Radio (Azure Container Apps session management)
- Morning Brief cron + push notifications
- Commute Mode (PWA motion detection)
- Custom Sandy Neural Voice (Azure Speech Studio training sprint)
- Audio Assignments (educator rubric + AI pre-grading, separate sprint)
- Synchronous Listening Room (Redis Streams + WebSocket fan-out)
- LTI Grade Passback for Audio Assignments (depends on LTI OIDC sprint)

CODEBASE CONTEXT (unchanged from all prior phases):
- Next.js 16 App Router, TypeScript, Tailwind v4 (no @apply)
- Prisma v7 + Neon. Import DB client from app/lib/prisma.ts only.
- Auth: requireRequestUser (or requireStudentUser/requireAdminUser) on every route.ts. No exceptions.
- Icons: lucide-react only
- Build check: npm run lint && npx tsc --noEmit && npm run build

STATE YOUR TASK before writing any code.
```

---

*Document ready. Confirm when you are ready to begin Phase 1, Task 1.*
