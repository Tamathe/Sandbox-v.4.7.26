# Sandcastle Real-Time Experience Layer — Architecture Plan Document
### University of Kentucky / CATS-AI
### Completed: 2026-03-20

---

## Document Structure

| Section | Title | Status |
|---|---|---|
| 1.1 | Prioritization | ✅ Complete |
| 1.2 | Success Criteria | ✅ Complete |
| 2.1 | Topology | ✅ Complete |
| 2.2 | State Management | ✅ Complete |
| 2.3 | AI Orchestrator | ✅ Complete |
| 2.4 | DB Schema | ✅ Complete |
| 2.5 | WebSocket Protocol | ✅ Complete |
| 2.6 | Frontend Architecture | ✅ Complete |
| 2.7 | Deployment & Infrastructure | ✅ Complete |
| 2.8 | Testing Strategy | ✅ Complete |
| 3.1–3.5 | Five Experience Engines | ✅ Complete |
| 3.6 | Cross-Cutting Analytics Dashboard | ✅ Complete |
| 4.1 | Implementation Roadmap & Phasing | ✅ Complete |
| 4.2 | Security & Compliance Audit | ✅ Complete |
| 4.3 | Operational Runbook | ✅ Complete |
| 4.4 | Migration & Backwards Compatibility | ✅ Complete |
| **4.5** | **API Reference & Integration Contracts** | ✅ Complete |
| **4.6** | **Final Architecture Summary & Decision Log** | ✅ Complete |

> **Sections 1.1–4.4** were authored in prior planning sessions; their content lives in
> the Architecture Plan conversation thread. Sections **4.5 and 4.6** are reproduced in
> full below and represent the complete external contract and closing summary for this
> document.

---

## Key Design Decisions (Summary — full ADR table in §4.6.2)

- **Transport:** WebSocket co-located with Next.js, JWT-gated per room
- **State:** Redis hashes for live room state; Postgres for durable records
- **Collab bus:** Redis Streams (XADD/XREAD) + EventEmitter fallback for local dev
- **AI split:** Haiku for in-session (poll insights, canvas critique); Sonnet for post-session reports
- **Cost target:** $0.068/room-hour optimised (baseline $0.165)
- **Migration:** 7-step nullable-first sequence; all independently rollback-safe
- **Feature flags:** `RoomFeatureFlag` DB model + Redis cache; 4-step canary rollout
- **FERPA:** `sensitiveSession` guard reused; canvas/transcript opt-in at room creation

---

# Task 4.5 — API Reference & Integration Contracts

---

## 4.5.1 WebSocket Message Contract

### Transport Layer

```
WSS /api/sandcastle/ws?roomId=<uuid>&token=<jwt>
  JWT payload: { userId, roomId, role: 'HOST'|'PARTICIPANT', exp }
  Signed with: SANDCASTLE_WS_SECRET (HS256, 1h expiry)
  Upgrade rejected (401) if: token missing | expired | roomId mismatch
  Upgrade rejected (403) if: room.featureFlags.enabled === false
```

### Discriminated Union — Client → Server

```typescript
// Every message: framed as JSON, max 64 KB, rate-limited 60/min per connection

type ClientMessage =
  | JoinRoomMessage
  | LeaveRoomMessage
  | PollVoteMessage
  | CanvasDrawMessage
  | CanvasClearMessage
  | CanvasRequestCritiqueMessage
  | BuzzerPressMessage
  | SeminarRaiseHandMessage
  | SeminarLowerHandMessage
  | KeepAliveMessage;

// ─── Room Lifecycle ─────────────────────────────────────────────────────────

interface JoinRoomMessage {
  type: 'JOIN_ROOM';
  roomId: string;           // uuid — must match JWT claim
  displayName: string;      // 1–60 chars, trimmed
  avatarSeed?: string;      // optional: deterministic avatar hash
}

interface LeaveRoomMessage {
  type: 'LEAVE_ROOM';
  roomId: string;
}

interface KeepAliveMessage {
  type: 'PING';
  seq: number;              // monotonic client counter
}

// ─── Live Poll ───────────────────────────────────────────────────────────────

interface PollVoteMessage {
  type: 'POLL_VOTE';
  roomId: string;
  pollId: string;           // uuid
  optionIndex: number;      // 0-based; validated: 0 ≤ n < poll.options.length
  // constraint: one vote per participantId per pollId; duplicate → VOTE_REJECTED
}

// ─── Collaborative Canvas ────────────────────────────────────────────────────

interface CanvasDrawMessage {
  type: 'CANVAS_DRAW';
  roomId: string;
  stroke: {
    id: string;             // client-generated uuid (idempotency key)
    tool: 'pen' | 'eraser' | 'shape' | 'text';
    color: string;          // hex #rrggbb; eraser ignores
    width: number;          // 1–40px
    opacity: number;        // 0.1–1.0
    points: Array<{ x: number; y: number }>; // 2–500 points
    // shape-only fields:
    shapeType?: 'rect' | 'circle' | 'arrow';
    x1?: number; y1?: number; x2?: number; y2?: number;
    // text-only fields:
    text?: string;          // max 200 chars
    fontSize?: number;      // 10–72
  };
}

interface CanvasClearMessage {
  type: 'CANVAS_CLEAR';
  roomId: string;
  // HOST only — non-HOST receives PERMISSION_DENIED
}

interface CanvasRequestCritiqueMessage {
  type: 'CANVAS_REQUEST_CRITIQUE';
  roomId: string;
  snapshotDataUrl: string;  // data:image/png;base64,… max 2 MB decoded
  prompt?: string;          // optional educator framing, max 500 chars
  // rate-limited: 1 critique per room per 30s; excess → CRITIQUE_RATE_LIMITED
}

// ─── Game Show (Buzzer) ──────────────────────────────────────────────────────

interface BuzzerPressMessage {
  type: 'BUZZER_PRESS';
  roomId: string;
  // Only accepted during QUESTION_OPEN phase; else → BUZZER_LOCKED
  // First arrival wins; server records server-side timestamp (not client timestamp)
}

// ─── Seminar ─────────────────────────────────────────────────────────────────

interface SeminarRaiseHandMessage {
  type: 'SEMINAR_RAISE_HAND';
  roomId: string;
}

interface SeminarLowerHandMessage {
  type: 'SEMINAR_LOWER_HAND';
  roomId: string;
}
```

### Discriminated Union — Server → Client

```typescript
type ServerMessage =
  // Room
  | RoomStateMessage
  | ParticipantJoinedMessage
  | ParticipantLeftMessage
  | PongMessage
  | ErrorMessage
  // Poll
  | PollOpenedMessage
  | PollResultsMessage
  | PollClosedMessage
  | VoteAcknowledgedMessage
  | VoteRejectedMessage
  // Canvas
  | CanvasStrokeMessage
  | CanvasClearedMessage
  | CanvasCritiqueMessage
  | CritiqueRateLimitedMessage
  // Game Show
  | QuestionOpenMessage
  | BuzzerWinnerMessage
  | BuzzerLockedMessage
  | ScoreboardUpdateMessage
  // Seminar
  | HandRaisedMessage
  | HandLoweredMessage
  | SpeakerQueueMessage
  | SpeakerGrantedMessage
  // AI / System
  | AiStreamChunkMessage
  | AiStreamDoneMessage
  | FeatureUnavailableMessage;

// ─── Room ────────────────────────────────────────────────────────────────────

interface RoomStateMessage {
  type: 'ROOM_STATE';
  roomId: string;
  phase: RoomPhase;
  experienceType: ExperienceType;
  hostId: string;
  participants: ParticipantSummary[];
  featureFlags: RoomFeatureFlagSnapshot;
  serverTimeMs: number;     // Unix ms — client syncs clock offset
}

type RoomPhase =
  | 'LOBBY'
  | 'ACTIVE'
  | 'QUESTION_OPEN'    // Game Show only
  | 'QUESTION_CLOSED'  // Game Show only — answer reveal
  | 'POLL_OPEN'        // Live Poll only
  | 'POLL_RESULTS'     // Live Poll only
  | 'ENDED';

type ExperienceType =
  | 'GAME_SHOW'
  | 'LIVE_POLL'
  | 'COLLABORATIVE_CANVAS'
  | 'SEMINAR'
  | 'DEBATE';           // future; phase-gated via featureFlag

interface ParticipantSummary {
  participantId: string;
  displayName: string;
  role: 'HOST' | 'PARTICIPANT';
  avatarSeed?: string;
  joinedAt: string;     // ISO 8601
  score?: number;       // Game Show only
}

interface RoomFeatureFlagSnapshot {
  pollInsights: boolean;
  canvasCritique: boolean;
  buzzerAi: boolean;
  seminarTranscript: boolean;
}

interface ParticipantJoinedMessage {
  type: 'PARTICIPANT_JOINED';
  roomId: string;
  participant: ParticipantSummary;
  totalCount: number;
}

interface ParticipantLeftMessage {
  type: 'PARTICIPANT_LEFT';
  roomId: string;
  participantId: string;
  totalCount: number;
}

interface PongMessage {
  type: 'PONG';
  seq: number;          // echoes client seq
  serverTimeMs: number;
}

interface ErrorMessage {
  type: 'ERROR';
  code: ErrorCode;
  message: string;      // human-readable, never expose stack traces
  fatal: boolean;       // true → client should close and not reconnect
}

type ErrorCode =
  | 'PERMISSION_DENIED'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_ENDED'
  | 'VOTE_REJECTED'
  | 'BUZZER_LOCKED'
  | 'CRITIQUE_RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INVALID_MESSAGE'
  | 'INTERNAL_ERROR';

// ─── Live Poll ───────────────────────────────────────────────────────────────

interface PollOpenedMessage {
  type: 'POLL_OPENED';
  poll: {
    pollId: string;
    question: string;     // max 400 chars
    options: string[];    // 2–6 items, max 100 chars each
    openedAt: string;     // ISO 8601
    durationSeconds?: number; // if set, client shows countdown
  };
}

interface PollResultsMessage {
  type: 'POLL_RESULTS';
  pollId: string;
  totals: number[];       // parallel to options array — vote counts
  totalVotes: number;
  // insight arrives separately via AiStreamChunk/Done
}

interface PollClosedMessage {
  type: 'POLL_CLOSED';
  pollId: string;
  finalTotals: number[];
  totalVotes: number;
}

interface VoteAcknowledgedMessage {
  type: 'VOTE_ACK';
  pollId: string;
  optionIndex: number;
}

interface VoteRejectedMessage {
  type: 'VOTE_REJECTED';
  pollId: string;
  reason: 'ALREADY_VOTED' | 'POLL_CLOSED' | 'INVALID_OPTION';
}

// ─── Collaborative Canvas ────────────────────────────────────────────────────

interface CanvasStrokeMessage {
  type: 'CANVAS_STROKE';
  stroke: CanvasDrawMessage['stroke'];  // same shape, broadcast to all in room
  participantId: string;
  ts: number;           // server Unix ms (deconflict ordering)
}

interface CanvasClearedMessage {
  type: 'CANVAS_CLEARED';
  clearedBy: string;    // participantId of HOST who triggered
  ts: number;
}

interface CanvasCritiqueMessage {
  type: 'CANVAS_CRITIQUE';
  // Streamed: arrives as multiple AiStreamChunk followed by AiStreamDone
  // with context: { kind: 'CANVAS_CRITIQUE', pollId: null }
  // This message is the trigger for client to open the critique panel
  critiqueId: string;
  triggeredBy: string;  // participantId
}

interface CritiqueRateLimitedMessage {
  type: 'CRITIQUE_RATE_LIMITED';
  retryAfterMs: number;
}

// ─── Game Show ───────────────────────────────────────────────────────────────

interface QuestionOpenMessage {
  type: 'QUESTION_OPEN';
  question: {
    questionId: string;
    text: string;
    imageUrl?: string;
  };
  openedAt: string;
  timeoutMs: number;
}

interface BuzzerWinnerMessage {
  type: 'BUZZER_WINNER';
  questionId: string;
  winnerId: string;
  winnerName: string;
  serverTimestamp: number;
}

interface BuzzerLockedMessage {
  type: 'BUZZER_LOCKED';
  questionId: string;
  reason: 'TIMEOUT' | 'WINNER_ALREADY_SET';
}

interface ScoreboardUpdateMessage {
  type: 'SCOREBOARD_UPDATE';
  scores: Array<{ participantId: string; displayName: string; score: number }>;
  // sorted descending by score
}

// ─── Seminar ─────────────────────────────────────────────────────────────────

interface HandRaisedMessage {
  type: 'HAND_RAISED';
  participantId: string;
  displayName: string;
  position: number;     // 1-based queue position
}

interface HandLoweredMessage {
  type: 'HAND_LOWERED';
  participantId: string;
}

interface SpeakerQueueMessage {
  type: 'SPEAKER_QUEUE';
  queue: Array<{ participantId: string; displayName: string; raisedAt: string }>;
}

interface SpeakerGrantedMessage {
  type: 'SPEAKER_GRANTED';
  participantId: string;
  displayName: string;
  grantedBy: string;    // HOST participantId
}

// ─── AI Streaming (shared across engines) ────────────────────────────────────

interface AiStreamChunkMessage {
  type: 'AI_STREAM_CHUNK';
  streamId: string;     // groups chunks for the same generation
  context: AiStreamContext;
  delta: string;        // UTF-8 text fragment
}

interface AiStreamDoneMessage {
  type: 'AI_STREAM_DONE';
  streamId: string;
  context: AiStreamContext;
  totalTokens: number;  // for client-side cost awareness in dev mode
}

type AiStreamContext =
  | { kind: 'POLL_INSIGHT'; pollId: string }
  | { kind: 'CANVAS_CRITIQUE'; critiqueId: string }
  | { kind: 'GAME_SHOW_COMMENTARY'; questionId: string }
  | { kind: 'SEMINAR_SUMMARY' }
  | { kind: 'POST_SESSION_REPORT'; reportId: string };

interface FeatureUnavailableMessage {
  type: 'FEATURE_UNAVAILABLE';
  feature: keyof RoomFeatureFlagSnapshot;
  reason: 'FLAG_DISABLED' | 'AI_DEGRADED' | 'PLAN_LIMIT';
}
```

---

## 4.5.2 REST Endpoints

### Authentication

All `/api/sandcastle/*` and `/api/rooms/*` routes require `x-demo-user-email` header
(existing platform pattern). HOST-only operations additionally verify the authenticated
user is `room.hostId`. Errors follow `{ error: string; code?: string }` shape.

---

### Room Management

```
POST /api/sandcastle/rooms
  Auth: requireEducatorUser (HOST role assigned automatically)
  Request:
    {
      toolId: string;           // uuid — must be GAME_SHOW|LIVE_POLL|
                                //   COLLABORATIVE_CANVAS|SEMINAR|DEBATE type
      title?: string;           // max 100 chars, defaults to tool.name
      maxParticipants?: number; // 1–200, default 50
    }
  Response 201:
    {
      roomId: string;
      joinCode: string;         // 6-char alphanumeric, unique
      wsToken: string;          // signed JWT for HOST WS upgrade
      room: RoomSummary;
    }
  Errors:
    400 INVALID_TOOL_TYPE   — toolId is a Builder tool, not an experience type
    400 TOOL_NOT_FOUND
    403 NOT_EDUCATOR
    409 ROOM_ALREADY_ACTIVE — this tool already has an open room (1 active/tool)

GET /api/sandcastle/rooms/:roomId
  Auth: requireAnyUser
  Response 200: RoomSummary (participants, phase, featureFlags)
  Errors:
    404 ROOM_NOT_FOUND

GET /api/sandcastle/rooms/join/:joinCode
  Auth: requireAnyUser
  Response 200:
    { roomId: string; wsToken: string; room: RoomSummary }
  Errors:
    404 CODE_NOT_FOUND
    410 ROOM_ENDED         — room.endedAt is set

POST /api/sandcastle/rooms/:roomId/start
  Auth: HOST only
  Response 200: { phase: 'ACTIVE' }
  Errors: 403, 404, 409 ALREADY_STARTED

POST /api/sandcastle/rooms/:roomId/end
  Auth: HOST only
  Body: { generateReport?: boolean }  // default true
  Response 200:
    { endedAt: string; reportId?: string; reportStatus: 'PENDING'|'GENERATED' }
  Side-effects:
    — Sets room.endedAt
    — If generateReport: enqueues post-session report generation (async)
    — Broadcasts ROOM_STATE { phase: 'ENDED' } to all WS connections
  Errors: 403, 404, 409 ALREADY_ENDED
```

```typescript
interface RoomSummary {
  roomId: string;
  toolId: string;
  experienceType: ExperienceType;
  title: string;
  phase: RoomPhase;
  hostId: string;
  joinCode: string;
  maxParticipants: number;
  participantCount: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  featureFlags: RoomFeatureFlagSnapshot;
}
```

---

### Poll Management (HOST only)

```
POST /api/sandcastle/rooms/:roomId/polls
  Auth: HOST only
  Request:
    {
      question: string;       // 1–400 chars
      options: string[];      // 2–6 items, each 1–100 chars
      durationSeconds?: number; // 10–300; omit for manual close
    }
  Response 201:
    { pollId: string; openedAt: string }
  Side-effects:
    — Broadcasts POLL_OPENED to all room participants
  Errors: 400 ROOM_NOT_ACTIVE, 400 POLL_ALREADY_OPEN (one at a time), 403

POST /api/sandcastle/rooms/:roomId/polls/:pollId/close
  Auth: HOST only
  Response 200:
    { finalTotals: number[]; totalVotes: number; insightId?: string }
  Side-effects:
    — Broadcasts POLL_CLOSED
    — If featureFlags.pollInsights: triggers Haiku insight generation,
      streams result as AI_STREAM_CHUNK/DONE with context POLL_INSIGHT
  Errors: 404 POLL_NOT_FOUND, 409 ALREADY_CLOSED, 403

GET /api/sandcastle/rooms/:roomId/polls
  Auth: HOST only
  Response 200: { polls: PollSummary[] }

GET /api/sandcastle/rooms/:roomId/polls/:pollId/insight
  Auth: HOST only
  Response 200:
    { pollId: string; insightText: string; generatedAt: string }
    | { status: 'PENDING' }   — if still generating
  Errors: 404, 403
```

---

### Canvas

```
GET /api/sandcastle/rooms/:roomId/canvas/snapshot
  Auth: requireAnyUser (must be room participant)
  Response 200:
    { strokes: CanvasStrokeRecord[]; snapshotAt: string }
  Purpose: Full state sync on reconnect (all strokes since room start)

DELETE /api/sandcastle/rooms/:roomId/canvas
  Auth: HOST only
  Response 200: { clearedAt: string }
  Side-effects: Broadcasts CANVAS_CLEARED

POST /api/sandcastle/rooms/:roomId/canvas/critique
  Auth: HOST only
  Request:
    { snapshotDataUrl: string; prompt?: string }
  Response 202: { critiqueId: string; status: 'GENERATING' }
  Side-effects:
    — Broadcasts CANVAS_CRITIQUE to room
    — Streams critique via AI_STREAM_CHUNK/DONE
    — Stores result in PollInsight (type CANVAS_CRITIQUE) on completion
  Errors: 429 RATE_LIMITED (1/30s/room), 403, 400 PAYLOAD_TOO_LARGE
```

---

### Game Show (HOST only)

```
POST /api/sandcastle/rooms/:roomId/questions
  Auth: HOST only
  Request:
    {
      text: string;         // 1–600 chars
      imageUrl?: string;    // must be HTTPS, Azure Blob domain only
      timeoutMs?: number;   // 5000–120000, default 30000
    }
  Response 201: { questionId: string }
  Side-effects: Broadcasts QUESTION_OPEN

POST /api/sandcastle/rooms/:roomId/questions/:questionId/close
  Auth: HOST only
  Response 200: { winner?: BuzzerWinnerRecord; scoreboard: ScoreEntry[] }
  Side-effects: Broadcasts BUZZER_LOCKED + SCOREBOARD_UPDATE

GET /api/sandcastle/rooms/:roomId/scoreboard
  Auth: requireAnyUser (room participant)
  Response 200: { scores: ScoreEntry[]; updatedAt: string }
```

---

### Seminar (HOST only)

```
POST /api/sandcastle/rooms/:roomId/speaker-queue/:participantId/grant
  Auth: HOST only
  Response 200: { grantedAt: string }
  Side-effects: Broadcasts SPEAKER_GRANTED

DELETE /api/sandcastle/rooms/:roomId/speaker-queue/:participantId
  Auth: HOST only (remove any); PARTICIPANT (remove self only)
  Response 200: { removed: true }
  Side-effects: Broadcasts HAND_LOWERED + updated SPEAKER_QUEUE

GET /api/sandcastle/rooms/:roomId/transcript
  Auth: HOST only
  Response 200:
    { segments: TranscriptSegment[]; generatedAt?: string }
    | { status: 'NOT_GENERATED' }
  Note: transcript generation triggered by POST /end with generateReport:true
```

---

### Post-Session Reports

```
GET /api/sandcastle/rooms/:roomId/report
  Auth: HOST only
  Response 200:
    {
      reportId: string;
      status: 'PENDING' | 'GENERATING' | 'COMPLETE' | 'FAILED';
      reportHtml?: string;        // present when COMPLETE
      generatedAt?: string;
      blobUrl?: string;           // Azure Blob URL if stored
    }
  Errors: 403, 404

POST /api/sandcastle/rooms/:roomId/report/regenerate
  Auth: HOST only (admin override)
  Response 202: { reportId: string; status: 'GENERATING' }
  Side-effects: Enqueues report generation; previous report retained until new completes
```

---

### Feature Flags (Admin only)

```
GET /api/sandcastle/feature-flags
  Auth: requireAdminUser
  Response 200: { flags: RoomFeatureFlagRecord[] }

PUT /api/sandcastle/feature-flags/:flagId
  Auth: requireAdminUser
  Request: { enabled: boolean; rolloutPercent?: number }  // 0–100
  Response 200: { flagId: string; enabled: boolean; updatedAt: string }
  Side-effects:
    — DEL Redis cache key feature:flags:{flagId}
    — New rooms pick up new value immediately
    — In-flight rooms retain value from their RoomFeatureFlag snapshot
```

---

## 4.5.3 SSE Streams

### Educator Host Dashboard SSE

```
GET /api/sandcastle/rooms/:roomId/dashboard/stream
  Auth: HOST only
  Headers: Accept: text/event-stream
  Connection lifecycle:
    — Server sends 'connected' event immediately with current room snapshot
    — Server holds connection open (no timeout while room is ACTIVE)
    — Server closes with 'room_ended' event when room.endedAt is set
    — Client should reconnect with Last-Event-ID header on drop

Event catalog:
  event: connected
  data: { roomId, phase, participantCount, serverTimeMs }

  event: participant_joined
  data: { participantId, displayName, totalCount }

  event: participant_left
  data: { participantId, totalCount }

  event: phase_changed
  data: { phase: RoomPhase, changedAt: string }

  event: poll_opened
  data: { pollId, question, optionCount }

  event: poll_vote_update      // throttled: max 2/s per poll
  data: { pollId, totals: number[], totalVotes: number }

  event: poll_closed
  data: { pollId, finalTotals: number[], totalVotes: number }

  event: poll_insight_ready
  data: { pollId, insightText: string }   // after Haiku finishes

  event: canvas_stroke_count   // throttled: 1/s
  data: { strokeCount: number, participantCount: number }

  event: buzzer_winner
  data: { questionId, winnerId, winnerName }

  event: scoreboard_update
  data: { scores: ScoreEntry[] }

  event: hand_raised
  data: { participantId, displayName, queuePosition: number }

  event: hand_lowered
  data: { participantId }

  event: ai_generating
  data: { kind: AiStreamContext['kind'] }   // alerts dashboard panel

  event: room_ended
  data: { endedAt: string, reportStatus: 'PENDING'|'COMPLETE' }
  // Server closes connection after this event

Implementation note:
  — Feed is driven by collab-bus Redis Streams subscription (xread, BLOCK 0)
  — Each WS-layer publish also publishes to bus key room:{roomId}:events
  — SSE handler maps bus events → SSE events (many-to-one; coalescing applied)
  — Last-Event-ID = Redis stream entry ID (enables gap-free replay on reconnect)
```

### Post-Session Analytics SSE

```
GET /api/sandcastle/rooms/:roomId/report/stream
  Auth: HOST only
  Connection lifecycle:
    — Opens after POST /end is called
    — Server closes after 'report_complete' or 'report_failed' event

Event catalog:
  event: report_started
  data: { reportId, startedAt }

  event: report_progress
  data: { stage: 'COLLECTING'|'ANALYZING'|'GENERATING'|'STORING', pct: number }

  event: report_section
  data: { section: 'EXECUTIVE_SUMMARY'|'PARTICIPATION'|'POLL_ANALYSIS'
                  |'CANVAS_ANALYSIS'|'LEARNING_OBJECTIVES', html: string }
  // Sections stream incrementally as Sonnet generates them

  event: report_complete
  data: { reportId, reportHtml: string, blobUrl?: string, generatedAt: string }
  // Server closes connection

  event: report_failed
  data: { reportId, error: string, retryable: boolean }
  // Server closes connection; client may call POST /report/regenerate if retryable
```

---

## 4.5.4 Webhook / Cron Contracts

### Blob Report Retry Cron

```
POST /api/cron/retry-blob-reports
  Trigger: Vercel Cron — every 15 minutes
  Auth: Authorization: Bearer ${CRON_SECRET} (timing-safe comparison, fail-closed)

  Logic:
    1. Query PostSessionReport WHERE blobUrl IS NULL
                                AND status = 'COMPLETE'
                                AND generatedAt > NOW() - INTERVAL '24h'
                                AND retryCount < 3
    2. For each: attempt Azure Blob upload of reportHtml
    3. On success: SET blobUrl, retryCount unchanged
    4. On failure: INCREMENT retryCount; if retryCount = 3, SET status = 'BLOB_FAILED'

  Idempotency: Safe to run concurrently — Prisma UPDATE WHERE blobUrl IS NULL
    acts as optimistic lock (second run finds no rows to process)

  Request body: none
  Response 200: { processed: number; succeeded: number; failed: number }
  Response 500: { error: string } — CRON_SECRET missing or Prisma connection failure

  Failure modes:
    — Azure unreachable: rows remain with retryCount+1; next cron picks up
    — DB unreachable: 500; Vercel retries on next 15-min tick
    — Max retries hit: status=BLOB_FAILED; GET /report returns reportHtml from DB column
```

### Room Cleanup Cron

```
POST /api/cron/cleanup-stale-rooms
  Trigger: Vercel Cron — hourly
  Auth: same CRON_SECRET pattern

  Logic:
    1. Find rooms WHERE endedAt IS NULL
                  AND startedAt < NOW() - INTERVAL '4h'
    2. For each: SET endedAt = NOW(), phase = 'ENDED' (soft-close)
    3. DEL Redis key room:{roomId}:state
    4. Publish ROOM_STATE { phase: 'ENDED' } to collab-bus
       (causes SSE/WS feeds to close gracefully)

  Idempotency: Rows already have endedAt set; repeated runs are no-ops
  Response 200: { cleaned: number }
```

### Redis Metrics Flush Cron

```
POST /api/cron/flush-metrics
  Trigger: Vercel Cron — every 5 minutes
  Auth: CRON_SECRET

  Logic:
    GETDEL metrics:ai:tokens:haiku  → INSERT into DailyMetric(type='HAIKU_TOKENS')
    GETDEL metrics:ai:tokens:sonnet → INSERT into DailyMetric(type='SONNET_TOKENS')
    GETDEL metrics:rooms:created    → INSERT into DailyMetric(type='ROOMS_CREATED')
    GET metrics:rooms:active        → (gauge, not deleted)

  Idempotency: GETDEL is atomic; repeated runs see 0 after first flush
  Response 200: { flushed: { haikuTokens, sonnetTokens, roomsCreated } }
```

---

# Task 4.6 — Final Architecture Summary & Decision Log

---

## 4.6.1 Executive Summary *(CTO / Dean audience)*

**the platform Real-Time Experience Layer — One-Page Summary**

the platform is adding five live classroom experiences — Game Show, Live Poll,
Collaborative Canvas, Seminar, and AI-Powered Debate — on top of its existing AI tool
platform. Students and educators join a shared "room" with a six-character code, and
everything that happens there — votes, drawings, buzzer presses, raised hands — is
visible to everyone in real time. An AI teaching assistant (Sandy) analyses the activity
as it happens and delivers instant feedback: it explains why a poll result split the way
it did, critiques a collaborative diagram, and generates a post-class report the educator
can review within seconds of ending the session.

**How it is built.** The real-time layer runs over WebSocket connections managed by a
lightweight Node.js orchestrator. State is held in Redis (fast, shared across server
pods), persisted to the existing Neon PostgreSQL database, and AI generation is handled
by the same Anthropic API already in use across the platform (faster Haiku model for
in-session feedback, smarter Sonnet model for post-session reports). No new
infrastructure services are required — the system runs on the same Vercel and Neon stack
already in production.

**What it costs.** At full load (1,000 students in 50 simultaneous rooms), the AI cost
is approximately **$0.07–$0.17 per room-hour** depending on how actively AI features are
used. This is significantly less than the cost of a single human teaching assistant per
session. A feature-flag system allows the institution to turn individual AI capabilities
on or off per room, enabling cost control without touching code.

**Safety and privacy.** The system inherits all existing FERPA protections. Room content
that could be personally identifiable (canvas critiques, seminar transcripts) is stored
with the same `sensitiveSession` guard as the existing counselling and legal-aid tools.
Post-session reports are stored in Azure Blob Storage with the same access controls as
audio episodes. A/B study group tracking — already wired into the platform — will allow
the institution to measure whether real-time AI experiences produce better learning
outcomes than traditional instruction.

**Rollout.** The feature is released behind flags: 5% of new rooms first, then 25%,
then general availability. Each phase is independently rollback-safe — disabling the
flag leaves no broken data behind.

---

## 4.6.2 Architectural Decision Log

| ID | Decision | Alternatives Considered | Rationale |
|---|---|---|---|
| **ADR-01** | WebSocket server co-located with Next.js API routes in a single Vercel deployment | Separate WS microservice (e.g. Socket.io server on Fly.io); Ably or Pusher managed service | Co-location avoids cross-service auth complexity; Vercel long-running function support covers ≤10-min sessions; no new vendor dependency |
| **ADR-02** | Redis as shared WS state store (room objects, participant lists, vote tallies) | In-process memory (single pod only); Postgres directly | Redis O(1) hash ops; sub-millisecond latency for vote counters; horizontal pod scaling requires shared state; Postgres too slow for per-stroke canvas ops |
| **ADR-03** | Collab-bus via Redis Streams (XADD/XREAD) with EventEmitter fallback | Redis Pub/Sub (fire-and-forget, no replay); direct Postgres LISTEN/NOTIFY; WebSocket fan-out from single origin pod | Streams provide consumer-group delivery + replay on reconnect; EventEmitter fallback keeps local dev zero-infrastructure |
| **ADR-04** | Haiku for in-session AI (poll insights, canvas critique commentary); Sonnet for post-session reports only | Sonnet for everything; GPT-4o; Gemini Flash | Haiku 10× cheaper than Sonnet; latency acceptable for non-blocking insight delivery; Sonnet quality justified only for the final synthesis document an educator will read |
| **ADR-05** | Event-driven canvas critique (explicit HOST request) not automatic per-stroke | Automatic critique every N strokes; Timed interval; Per-participant critique | Automatic would make canvas critique the single largest cost driver; educator control aligns with pedagogical intent; rate-limit (1/30s) prevents abuse |
| **ADR-06** | Post-session reports stored as HTML in both PostgreSQL column and Azure Blob | Blob only; S3 + Postgres pointer; Markdown | Three-level fallback required for HA; DB column is last-resort read path when Blob is unavailable; HTML chosen over Markdown for immediate browser display without a renderer |
| **ADR-07** | RoomFeatureFlag as a DB model + Redis cache (not environment variable) | Feature flags in .env; LaunchDarkly; Vercel Edge Config | DB flags allow per-room and per-feature granularity; runtime toggle without redeploy; Redis cache (TTL 5 min) avoids per-message DB read |
| **ADR-08** | ToolType enum extended (GAME_SHOW, LIVE_POLL, COLLABORATIVE_CANVAS, SEMINAR, DEBATE) rather than a separate ExperienceTool model | New Experience model parallel to Tool; Tag/Category approach | Reuses existing Tool ownership, course assignment, and analytics pipeline with minimal schema surface; BUILDER_ONLY vs ROOM_ONLY distinction enforced in code |
| **ADR-09** | ToolSession extended (roomId, experienceType, participantRole) rather than a new ExperienceSession model | Separate session model; Separate analytics database | Single session model keeps all learning analytics in one table; existing avgScore, ToolInsightsPanel, and atRisk queries work with minor null-exclusion fixes |
| **ADR-10** | Buzzer winner determined server-side by arrival timestamp | Client-reported timestamp (gameable); Distributed lock via Redis SETNX | Server timestamp prevents clock-skew cheating; Redis SETNX considered but single WS server ordering is sufficient — first XADD wins race by definition |
| **ADR-11** | Join code as 6-char alphanumeric (human-typeable) + JWT for WS upgrade | UUID in URL only; QR code only; Magic link | Code supports physical classroom projection (students type it); JWT provides machine-verifiable identity for WS upgrade without a second HTTP round-trip |
| **ADR-12** | FERPA: experience content uses existing `sensitiveSession` boolean guard | Separate FERPA model for rooms; Per-field encryption | Reuses audited guard already on 9 routes; canvas snapshots and seminar transcripts opted-in at room creation; zero new compliance surface |
| **ADR-13** | 7-step migration sequence with nullable-first columns; expand/contract only for hostId | Big-bang migration; Feature-branch schema divergence | Each migration independently rollback-safe; nullable-first means app can deploy before migration completes; zero downtime guaranteed |
| **ADR-14** | Debate type phase-gated (ROOM_ONLY_TYPES excludes DEBATE until flag enabled) | Debate built fully before flag system; Debate as separate repo feature branch | Allows schema and routing to be built without enabling UI; avoids long-lived branch divergence from main; flag cutover identical to other types |
| **ADR-15** | WS reconnect strategy: client exponential backoff + RECONNECT message with lastSeq | Full page reload; Server-sent reconnect redirect | lastSeq enables gap-fill via Redis Stream XRANGE; backoff prevents thundering herd on pod restart; server replay bounded to last 500 events per room |
| **ADR-16** | Anthropic degradation: 6-tier priority shutdown (canvas critique first, report generation last) | Kill all AI on any degradation; Rate-limit equally across features | Prioritisation preserves highest-value feature (post-session report) longest; canvas critique is highest-volume lowest-value; tiered shutdown is reversible as degradation eases |
| **ADR-17** | Cost target $0.068/room-hour via event-driven critique + Haiku report body with Sonnet exec summary | Accept $0.165 baseline; switch entirely to Haiku | Event-driven critique alone cuts 30% of cost; hybrid report (Haiku body, Sonnet 2-paragraph summary) preserves report quality at lower cost; measurable A/B outcome target |
| **ADR-18** | SSE for educator dashboard feed (not second WS connection) | Second WS; Long-polling; GraphQL subscriptions | SSE is unidirectional (dashboard is read-only); HTTP/2 multiplexes SSE over same connection; simpler auth (same `x-demo-user-email` header); browser reconnect handled natively |

---

## 4.6.3 Open Questions & Deferred Decisions

| # | Question | Why Deferred | Revisit When |
|---|---|---|---|
| **OQ-01** | Should DEBATE be a structured turn-based engine or a free-form seminar variant? | Requires curriculum input from faculty partners; platform risk of building wrong UX | First faculty pilot cohort provides feedback; revisit before removing DEBATE from feature-gate |
| **OQ-02** | Canvas storage: should stroke history be persisted to Postgres or Azure Blob beyond the live session? | Storage cost unclear at scale; use case (replay, export) not yet validated | First educator requests canvas replay; alternatively if storage cost analysis shows <$5/month at 1K rooms/day |
| **OQ-03** | Multi-room "tournament" mode for Game Show (bracket elimination across rooms) | Complex state machine; no current demand | NCAA Bracket feature precedent proves feasibility; revisit if 3+ educators request it |
| **OQ-04** | End-to-end encryption for sensitive seminar transcripts (Title IX adjacent content) | FERPA `sensitiveSession` guard deemed sufficient for current threat model | Any regulatory audit flags gap; UK Legal Counsel review of platform in year 2 |
| **OQ-05** | WebSocket horizontal scaling beyond 2 pods (Redis-backed but untested at >10K concurrent) | 1K concurrent (current target) fits 2 pods comfortably | Load testing shows >80% pod memory utilisation at peak; or University enrollment targets increase to 5K concurrent |
| **OQ-06** | Should `RoomFeatureFlag` model support per-department or per-course override (not just global)? | Current rollout (canary 5→25→100%) doesn't require granularity | Admin requests per-college flag; or Provost dashboard shows uneven AI cost distribution by college |
| **OQ-07** | Offline/async mode: can a student complete a "room experience" asynchronously after session ends? | Requires separate product design (replay vs live-only philosophy) | Student demand data from Year 1 analytics; or LTI grade passback requirement forces async completion path |
| **OQ-08** | MCP server layer for live Canvas/SIS data injection into Sandy during room sessions | Canvas API credentials not yet provisioned for production; DATA-EXTRACTION-STRATEGY defers this | Canvas API credentials available; or Canvas LTI grade passback adoption exceeds 50% of courses |

---

## 4.6.4 Document Completion Checklist

| Requirement | Section(s) | Status |
|---|---|---|
| **All five experience types covered** | 2.3 AI Orchestrator, 3.1–3.5, 4.5.1 WS contract, 4.5.2 REST endpoints | ✅ GAME_SHOW, LIVE_POLL, COLLABORATIVE_CANVAS, SEMINAR, DEBATE (phase-gated) all addressed |
| **FERPA compliance documented** | 2.4 DB Schema, 4.2 Security Audit, ADR-12, OQ-04 | ✅ sensitiveSession guard, canvas/transcript opt-in, PII exclusion from AI prompts |
| **Zero-downtime migration** | 4.4 Migration & Backwards Compatibility, ADR-13 | ✅ 7-step nullable-first sequence, independent rollback, flag cutover protocol |
| **Cost model documented** | 4.3 Operational Runbook, ADR-04, ADR-05, ADR-16, ADR-17 | ✅ $0.165 baseline, $0.068 optimised target, per-feature cost breakdown |
| **Security audit** | 4.2 Security Audit, ADR-10, ADR-11 | ✅ WS auth (JWT + roomId claim), buzzer anti-cheat, rate limiting, CRON fail-closed |
| **WebSocket full contract** | 4.5.1 | ✅ All 5 engines, all client→server and server→client types, validation constraints |
| **REST API reference** | 4.5.2 | ✅ All /api/sandcastle/* and /api/rooms/* routes with schemas and error codes |
| **SSE stream specification** | 4.5.3 | ✅ Dashboard feed + post-session analytics feed; event catalog; reconnect with Last-Event-ID |
| **Background job contracts** | 4.5.4 | ✅ Blob retry cron, stale room cleanup, metrics flush — triggers, idempotency, failure modes |
| **Decision rationale recorded** | 4.6.2 (18 ADRs) | ✅ All major decisions from Tasks 2.1–4.4 with alternatives and rationale |
| **Open questions documented** | 4.6.3 | ✅ 8 deferred decisions with explicit revisit conditions |

---

*Architecture Plan Document — Complete. Authored 2026-03-20.*
