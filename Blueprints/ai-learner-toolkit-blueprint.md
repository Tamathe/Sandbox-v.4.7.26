# Blueprint: AI Learner Toolkit
## Codex Implementation Guide — RAG Course Tutor + Speech Grader

---

## Overview

Two standalone but architecturally parallel tools:

| Tool | Core Pipeline | Primary AI Models |
|------|--------------|-------------------|
| **Course Tutor** | Retrieval-Augmented Generation (RAG) | Embedding model + LLM |
| **Speech Grader** | Audio Processing + Rubric Analysis | ASR + LLM |

Both tools share the same backend API, relational database, and authentication layer. They diverge at the AI engine and storage layers.

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | Next.js 16 App Router (TypeScript) | Matches existing Sandbox stack |
| Backend API | Next.js API Routes (route handlers) | Co-located; no separate server needed |
| Relational DB | PostgreSQL via Neon + Prisma v7 | Already in use; add new models |
| Vector DB | pgvector (Postgres extension) | Single DB, no extra infra; Neon supports it |
| Embedding Model | `text-embedding-3-small` (OpenAI) OR Voyage AI | 1536-dim vectors; cheap per token |
| LLM | Claude claude-sonnet-4-6 (Anthropic) | Tutor reasoning + speech rubric analysis |
| ASR | OpenAI Whisper API | High accuracy; handles MP3/WAV/WebM |
| File Storage | Vercel Blob | Serverless; handles audio uploads |
| Auth | Existing mock auth (`x-demo-user-email`) | Swap to Shibboleth in production |

---

## Project Structure

All new code lives inside the existing `the-sandbox/` project.

```
the-sandbox/
├── app/
│   ├── api/
│   │   ├── tutor/
│   │   │   ├── ingest/route.ts          # POST: upload + chunk + embed course docs
│   │   │   ├── query/route.ts           # POST: RAG query → streaming LLM response
│   │   │   └── sessions/route.ts        # GET/POST: chat history
│   │   └── speech-grader/
│   │       ├── submit/route.ts          # POST: upload audio → transcribe → grade
│   │       ├── sessions/route.ts        # GET: past submissions for a user
│   │       └── rubrics/route.ts         # GET/POST: manage grading rubrics (admin)
│   ├── tools/
│   │   ├── course-tutor/
│   │   │   └── page.tsx                 # Tutor chat UI
│   │   └── speech-grader/
│   │       └── page.tsx                 # Audio capture + feedback UI
│   └── lib/
│       ├── embeddings.ts                # Embedding model wrapper
│       ├── vector-search.ts             # pgvector similarity search
│       └── whisper.ts                   # Whisper ASR wrapper
├── prisma/
│   └── schema.prisma                    # Add new models below
```

---

## Data Models

### Add to `prisma/schema.prisma`

```prisma
// ─── Course Tutor (RAG) ───────────────────────────────────────────────────────

model KnowledgeBase {
  id          String          @id @default(cuid())
  courseId    String?
  name        String                          // e.g. "LAW 756 Materials"
  createdById String
  createdBy   User            @relation(fields: [createdById], references: [id])
  chunks      KnowledgeChunk[]
  tutorSessions TutorSession[]
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
}

model KnowledgeChunk {
  id              String        @id @default(cuid())
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id], onDelete: Cascade)
  content         String        @db.Text         // raw text of the chunk
  sourceFile      String?                        // original filename
  chunkIndex      Int                            // position within the source doc
  // Vector stored as raw float array in a separate table (pgvector)
  // See: KnowledgeChunkVector
  createdAt       DateTime      @default(now())
}

// pgvector table — managed via raw SQL migration (Prisma doesn't support vector type natively)
// CREATE TABLE knowledge_chunk_vectors (
//   id TEXT PRIMARY KEY REFERENCES "KnowledgeChunk"(id) ON DELETE CASCADE,
//   embedding vector(1536)
// );
// CREATE INDEX ON knowledge_chunk_vectors USING ivfflat (embedding vector_cosine_ops);

model TutorSession {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  knowledgeBaseId String
  knowledgeBase   KnowledgeBase @relation(fields: [knowledgeBaseId], references: [id])
  messages        TutorMessage[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model TutorMessage {
  id        String       @id @default(cuid())
  sessionId String
  session   TutorSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String                        // "user" | "assistant"
  content   String       @db.Text
  sources   Json?                         // array of { chunkId, sourceFile, snippet }
  createdAt DateTime     @default(now())
}

// ─── Speech Grader ────────────────────────────────────────────────────────────

model SpeechRubric {
  id          String            @id @default(cuid())
  name        String
  description String?
  criteria    Json              // array of { name, description, maxScore, weight }
  createdById String
  createdBy   User              @relation(fields: [createdById], references: [id])
  submissions SpeechSubmission[]
  createdAt   DateTime          @default(now())
}

model SpeechSubmission {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  rubricId    String
  rubric      SpeechRubric @relation(fields: [rubricId], references: [id])
  audioUrl    String                    // Vercel Blob URL
  transcript  String?      @db.Text     // Whisper output
  feedback    Json?                     // { totalScore, maxScore, criteria: [...], summary }
  status      String       @default("PENDING") // PENDING | TRANSCRIBING | GRADED | ERROR
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}
```

> **Note:** After adding models, run:
> ```bash
> npx prisma migrate dev --name add_tutor_and_speech_grader
> npx prisma generate
> ```
> Then run the raw SQL for pgvector manually or in a separate migration file.

---

## Environment Variables

Add to `.env` and Vercel dashboard:

```env
# Embeddings (choose one)
OPENAI_API_KEY=sk-...                   # for text-embedding-3-small + Whisper

# Vercel Blob (for audio file storage)
BLOB_READ_WRITE_TOKEN=...               # from Vercel dashboard → Storage → Blob

# Existing
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...neon.tech/...
```

---

## Pipeline 1: Course Tutor (RAG)

### Step 1 — Lib: Embedding wrapper (`app/lib/embeddings.ts`)

```typescript
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),        // token safety cap
  })
  return res.data[0].embedding          // 1536-dim float array
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.slice(0, 8000)),
  })
  return res.data.map(d => d.embedding)
}
```

### Step 2 — Lib: Vector search (`app/lib/vector-search.ts`)

```typescript
import { prisma } from './prisma'

// Raw SQL — pgvector cosine similarity search
export async function searchSimilarChunks(
  knowledgeBaseId: string,
  queryEmbedding: number[],
  topK = 5
): Promise<{ id: string; content: string; sourceFile: string | null; similarity: number }[]> {
  const vectorStr = `[${queryEmbedding.join(',')}]`

  const results = await prisma.$queryRaw<
    { id: string; content: string; source_file: string | null; similarity: number }[]
  >`
    SELECT
      kc.id,
      kc.content,
      kc."sourceFile" AS source_file,
      1 - (kcv.embedding <=> ${vectorStr}::vector) AS similarity
    FROM "KnowledgeChunk" kc
    JOIN knowledge_chunk_vectors kcv ON kcv.id = kc.id
    WHERE kc."knowledgeBaseId" = ${knowledgeBaseId}
    ORDER BY kcv.embedding <=> ${vectorStr}::vector
    LIMIT ${topK}
  `

  return results.map(r => ({
    id: r.id,
    content: r.content,
    sourceFile: r.source_file,
    similarity: r.similarity,
  }))
}
```

### Step 3 — API: Document ingestion (`app/api/tutor/ingest/route.ts`)

**Request:** `multipart/form-data` with fields `knowledgeBaseId` + `file` (text/markdown/pdf)

```typescript
// Execution flow:
// 1. Parse uploaded file → extract raw text
// 2. Split into chunks (~500 tokens each, 50-token overlap)
// 3. Embed all chunks in batches of 100
// 4. INSERT into KnowledgeChunk (Prisma) + knowledge_chunk_vectors (raw SQL)

export async function POST(req: NextRequest) {
  // 1. Auth check
  // 2. Parse multipart form — get knowledgeBaseId + file buffer
  // 3. Extract text (use pdf-parse for PDFs, read directly for .txt/.md)
  // 4. Chunk text:
  //    const chunks = chunkText(rawText, { size: 500, overlap: 50 })
  // 5. Embed:
  //    const embeddings = await embedBatch(chunks)
  // 6. Save chunks to Prisma:
  //    const saved = await prisma.knowledgeChunk.createMany({ data: [...] })
  // 7. Save vectors via raw SQL:
  //    for each chunk: INSERT INTO knowledge_chunk_vectors (id, embedding) VALUES (...)
  // 8. Return { chunksCreated: N }
}

// Chunking helper — split by sentence, accumulate to ~500 words, add overlap
function chunkText(text: string, { size = 500, overlap = 50 } = {}) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  const chunks: string[] = []
  let current: string[] = []
  let wordCount = 0

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length
    if (wordCount + words > size && current.length > 0) {
      chunks.push(current.join(' '))
      // overlap: keep last N words
      const overlapSentences = current.slice(-Math.ceil(overlap / 10))
      current = overlapSentences
      wordCount = overlapSentences.join(' ').split(/\s+/).length
    }
    current.push(sentence.trim())
    wordCount += words
  }
  if (current.length) chunks.push(current.join(' '))
  return chunks
}
```

### Step 4 — API: RAG query (`app/api/tutor/query/route.ts`)

**Request body:**
```json
{
  "sessionId": "string",
  "knowledgeBaseId": "string",
  "question": "string"
}
```

```typescript
// Execution flow:
// 1. Auth + validate
// 2. Embed the user's question
// 3. Search vector DB → top 5 chunks
// 4. Build prompt:
//    SYSTEM: "Answer using ONLY the provided context. If the answer is not in the context, say so."
//    USER: "Context:\n{chunks}\n\nQuestion: {question}"
// 5. Stream Claude response
// 6. On stream end: save TutorMessage (user + assistant) to DB with sources[]
// 7. Return streaming text/plain response

export async function POST(req: NextRequest) {
  const { sessionId, knowledgeBaseId, question } = await req.json()

  // Embed question
  const queryEmbedding = await embedText(question)

  // Retrieve top-K chunks
  const chunks = await searchSimilarChunks(knowledgeBaseId, queryEmbedding, 5)

  const context = chunks
    .map((c, i) => `[${i + 1}] ${c.sourceFile ?? 'Document'}: ${c.content}`)
    .join('\n\n')

  // Build Claude prompt
  const systemPrompt = `You are a course tutor AI. Answer student questions using ONLY the provided course materials below.
If the answer is not contained in the materials, say: "I don't have information about that in the course materials."
Always cite the source number (e.g. [1]) when referencing specific content.
Be concise, clear, and pedagogically helpful.`

  // Stream from Claude
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      { role: 'user', content: `Course Materials:\n${context}\n\nStudent Question: ${question}` }
    ],
  })

  // Return as streaming response + save to DB asynchronously after stream ends
}
```

### Step 5 — UI: Tutor chat (`app/tools/course-tutor/page.tsx`)

```
Layout:
┌─────────────────────────────────────────────────────┐
│  [Knowledge Base selector dropdown]                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Chat messages (user + assistant bubbles)            │
│  Assistant messages show source citations            │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [Text input]                    [Send]              │
└─────────────────────────────────────────────────────┘

Components needed:
- KnowledgeBaseSelector: dropdown to pick which course KB to query
- ChatMessage: renders markdown + collapsible "Sources" section listing chunk citations
- IngestButton: (admin/educator only) file upload → POST /api/tutor/ingest
```

---

## Pipeline 2: Speech Grader

### Step 1 — Lib: Whisper ASR (`app/lib/whisper.ts`)

```typescript
import OpenAI from 'openai'
import { toFile } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,          // e.g. "speech.webm"
  mimeType: string           // e.g. "audio/webm"
): Promise<string> {
  const file = await toFile(audioBuffer, filename, { type: mimeType })

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'text',
    language: 'en',
  })

  return transcription
}
```

### Step 2 — API: Submit speech (`app/api/speech-grader/submit/route.ts`)

**Request:** `multipart/form-data` with fields `rubricId` + `audio` (WebM/MP3/WAV, max 25MB)

```typescript
// Execution flow:
// 1. Auth + validate file size (Whisper limit: 25MB)
// 2. Upload audio to Vercel Blob → get public URL
// 3. Create SpeechSubmission record with status PENDING
// 4. Return { submissionId } immediately (so UI can poll)
// 5. Kick off background processing (or process inline for MVP):
//    a. transcribeAudio() → raw transcript
//    b. Update submission: transcript + status TRANSCRIBING
//    c. Grade transcript with LLM (see grading prompt below)
//    d. Update submission: feedback JSON + status GRADED
```

**Grading prompt structure:**

```typescript
const rubricCriteria = rubric.criteria as {
  name: string; description: string; maxScore: number; weight: number
}[]

const systemPrompt = `You are a speech evaluation AI. Grade the following speech transcript against this rubric.
Return a JSON object with this exact shape:
{
  "totalScore": number,
  "maxScore": number,
  "summary": "string — 2-3 sentence overall assessment",
  "criteria": [
    {
      "name": "string",
      "score": number,
      "maxScore": number,
      "feedback": "string — specific critique referencing the transcript"
    }
  ]
}

Rubric Criteria:
${rubricCriteria.map(c => `- ${c.name} (${c.maxScore} pts): ${c.description}`).join('\n')}

Be specific. Quote from the transcript when explaining a score. Return ONLY the JSON object.`

const userMessage = `Transcript:\n${transcript}`
```

### Step 3 — API: Poll status / get results (`app/api/speech-grader/sessions/route.ts`)

**GET** `/api/speech-grader/sessions?submissionId=xxx`
Returns `{ status, transcript, feedback }` — frontend polls until `status === 'GRADED'`

**GET** `/api/speech-grader/sessions`
Returns all past submissions for current user

### Step 4 — UI: Speech grader (`app/tools/speech-grader/page.tsx`)

```
Layout — 3 states:

STATE 1: Record / Upload
┌─────────────────────────────────────────────────────┐
│  [Rubric selector]                                   │
├─────────────────────────────────────────────────────┤
│  🎙️  [Record]  OR  [Upload file]                    │
│       Recording timer: 0:00                          │
│  [Stop]  [Preview]  [Submit for grading]             │
└─────────────────────────────────────────────────────┘

STATE 2: Processing (poll every 3s)
  Transcribing audio... ████░░░░░░
  Analyzing against rubric...

STATE 3: Results
┌───────────────────────┬─────────────────────────────┐
│ Transcript            │ Feedback                     │
│                       │ Total: 87/100                │
│ "Good morning. My     │                              │
│  topic today is..."   │ ● Language Complexity: 22/25 │
│                       │   "Strong vocabulary, but... │
│                       │ ● Rhetorical Strategy: 18/25 │
│                       │   "Consider more..." ...     │
│                       │ ● Pacing: 20/25              │
│                       │ ● Structure: 27/25            │
│                       │                              │
│                       │ Summary: "Well-organized..."  │
└───────────────────────┴─────────────────────────────┘
```

**Audio recording — browser API:**

```typescript
// In the React component:
const mediaRecorder = useRef<MediaRecorder | null>(null)
const chunks = useRef<Blob[]>([])

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' })
  mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data)
  mediaRecorder.current.onstop = () => {
    const blob = new Blob(chunks.current, { type: 'audio/webm' })
    setAudioBlob(blob)
    chunks.current = []
  }
  mediaRecorder.current.start()
}

function stopRecording() {
  mediaRecorder.current?.stop()
}

async function submitAudio() {
  const form = new FormData()
  form.append('audio', audioBlob, 'speech.webm')
  form.append('rubricId', selectedRubricId)
  const res = await fetch('/api/speech-grader/submit', {
    method: 'POST',
    headers: { 'x-demo-user-email': currentUser.email },
    body: form,
  })
  const { submissionId } = await res.json()
  startPolling(submissionId)
}
```

---

## Shared Admin: Rubric Manager

Educators/admins can create and manage speech rubrics.

**POST `/api/speech-grader/rubrics`** — create rubric

Request body:
```json
{
  "name": "Public Speaking 101 — Persuasive Speech",
  "description": "Rubric for 5-minute persuasive speeches",
  "criteria": [
    { "name": "Language Complexity", "description": "Vocabulary range, sentence variety, clarity", "maxScore": 25, "weight": 1 },
    { "name": "Rhetorical Strategy",  "description": "Use of ethos, pathos, logos; call to action", "maxScore": 25, "weight": 1 },
    { "name": "Pacing & Delivery",    "description": "Speaking rate, pauses, filler words", "maxScore": 25, "weight": 1 },
    { "name": "Structure",            "description": "Clear intro, body, conclusion; logical flow", "maxScore": 25, "weight": 1 }
  ]
}
```

---

## pgvector Migration SQL

Create this file at `prisma/migrations/manual_pgvector.sql` and run it manually on Neon:

```sql
-- Enable pgvector extension (Neon supports this)
CREATE EXTENSION IF NOT EXISTS vector;

-- Vector storage table (linked to KnowledgeChunk by ID)
CREATE TABLE IF NOT EXISTS knowledge_chunk_vectors (
  id   TEXT PRIMARY KEY REFERENCES "KnowledgeChunk"(id) ON DELETE CASCADE,
  embedding vector(1536)
);

-- IVFFlat index for fast approximate nearest-neighbor search
-- Run AFTER you have at least a few hundred rows for better index quality
CREATE INDEX IF NOT EXISTS knowledge_chunk_vectors_embedding_idx
  ON knowledge_chunk_vectors
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

Run via Neon SQL editor or:
```bash
psql $DATABASE_URL -f prisma/migrations/manual_pgvector.sql
```

---

## Implementation Order for Codex

Tackle in this sequence to keep things testable at each step:

1. **Schema** — Add all Prisma models → migrate → generate
2. **pgvector SQL** — Run manual migration on Neon
3. **`embeddings.ts`** — Test embedding a sample string, log the vector length (should be 1536)
4. **`vector-search.ts`** — Test raw SQL query with a dummy vector
5. **`/api/tutor/ingest`** — Upload a `.txt` file, confirm chunks appear in DB + vectors in pgvector table
6. **`/api/tutor/query`** — Test a question, confirm relevant chunks are returned, Claude responds correctly
7. **`whisper.ts`** — Upload a test audio clip, confirm transcript is returned
8. **`/api/speech-grader/submit`** — End-to-end: audio in → transcript + JSON feedback out
9. **`/api/speech-grader/rubrics`** — Rubric CRUD
10. **Tutor UI** — Chat interface with KB selector and source citations
11. **Speech Grader UI** — Record/upload → polling → results panel

---

## Key Constraints & Gotchas

| Constraint | Detail |
|-----------|--------|
| Whisper max file size | 25MB. Enforce on frontend before upload. Typical 5-min speech at 128kbps ≈ 5MB — well within limit. |
| pgvector IVFFlat index | Needs data before it's useful. Build index after first batch of documents are ingested. |
| Embedding dimensions | `text-embedding-3-small` = 1536 dims. If switching models, re-embed all chunks and update vector column type. |
| Streaming vs polling | Tutor uses streaming (SSE). Speech grader uses submit→poll because Whisper + LLM grading can take 10-30s total. |
| Chunk size | ~500 words keeps chunks within token budget while maintaining enough context for retrieval. Overlap prevents splitting key sentences. |
| Claude context window | Retrieved chunks × 500 words ≈ 2,500 words of context. Stay well within claude-sonnet-4-6's 200K limit. |
| Neon connection | Use `?sslmode=require&channel_binding=require` in DATABASE_URL for Neon. |
| Prisma + raw SQL | `prisma.$queryRaw` is needed for all vector operations. Prisma does not natively support `vector` type in v7. |
