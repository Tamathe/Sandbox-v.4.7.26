# RAG + Gradebook Architecture
### The Sandbox — University of Kentucky
### Status: Ready to build. Azure-ready abstraction layers included.

---

## Part 1: RAG / Knowledge Base

### Goal
Replace full-document context injection with semantic chunk retrieval. Every `CourseDocument` gets embedded on upload. At inference time, the query is embedded and the top-k relevant chunks are injected — not the full document.

---

### Data Model Changes

```prisma
// Add to schema.prisma

model DocumentChunk {
  id           String   @id @default(cuid())
  documentId   String
  document     CourseDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex   Int
  content      String   // raw text of this chunk
  tokenCount   Int
  embedding    Unsupported("vector(1536)")  // pgvector; Azure AI Search when migrated
  createdAt    DateTime @default(now())

  @@index([documentId])
}

// Add to CourseDocument:
//   chunks     DocumentChunk[]
//   embeddedAt DateTime?        // null = not yet embedded
```

**pgvector setup** (one-time migration):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

### New Files

```
app/lib/
  embedding-service.ts     ← provider abstraction (OpenAI now, Azure OpenAI later)
  vector-store.ts          ← store abstraction (pgvector now, Azure AI Search later)
  document-chunker.ts      ← splits text into ~512-token chunks with 64-token overlap
  document-processor.ts   ← orchestrates: parse → chunk → embed → store
```

---

### Embedding Service Abstraction

```typescript
// app/lib/embedding-service.ts
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  dimensions: number
}

class OpenAIEmbedder implements EmbeddingProvider {
  dimensions = 1536
  // uses OPENAI_API_KEY, model: text-embedding-3-small
}

class AzureOpenAIEmbedder implements EmbeddingProvider {
  dimensions = 1536
  // uses AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY + AZURE_OPENAI_EMBEDDING_DEPLOYMENT
}

export const embeddingProvider = process.env.EMBEDDING_PROVIDER === 'azure'
  ? new AzureOpenAIEmbedder()
  : new OpenAIEmbedder()
```

---

### Vector Store Abstraction

```typescript
// app/lib/vector-store.ts
interface VectorStore {
  upsertChunks(documentId: string, chunks: ChunkWithEmbedding[]): Promise<void>
  similaritySearch(queryEmbedding: number[], courseId: string, topK: number): Promise<ChunkResult[]>
  deleteByDocument(documentId: string): Promise<void>
}

// PgvectorStore — queries Neon via raw SQL with <=> cosine distance operator
// AzureSearchStore — queries Azure AI Search vector index (future)
```

---

### Chunking Strategy

- Target: **512 tokens** per chunk (~2000 chars)
- Overlap: **64 tokens** between adjacent chunks (preserves context at boundaries)
- Split on: paragraph breaks first, then sentence boundaries, then hard cut
- Metadata stored per chunk: `documentId`, `chunkIndex`, `tokenCount`

---

### Upload Flow (Synchronous)

```
POST /api/courses/[courseId]/documents  (existing upload route)
  ↓
1. Save CourseDocument record (existing)
2. Extract text (pdf-parse / plain text)
3. document-chunker.ts → array of text chunks
4. embedding-service.ts → embedBatch(chunks) → vector arrays
5. vector-store.ts → upsertChunks() → DocumentChunk records
6. Update CourseDocument.embeddedAt = now()
7. Return response
```

For large documents (>50 chunks), step 4 uses batch API calls in groups of 20.

---

### Inference Flow (My TA / Avatar)

```
User sends message to /api/chat/[sessionId]
  ↓
1. Embed the user's message → query vector
2. vector-store.similaritySearch(queryVector, courseId, topK=5)
3. Build context block from top-5 chunks (with source labels)
4. Inject into system prompt:
   "Use the following course material excerpts to answer..."
5. Stream response (existing stream logic unchanged)
```

---

## Part 2: Gradebook + Rubric System

### Goal
Structured assignments with educator-defined rubrics, dual submission types (legacy file/text + AI chat session), AI-drafted feedback, faculty approval workflow, and Canvas grade push.

---

### Data Model

```prisma
model Assignment {
  id              String           @id @default(cuid())
  courseId        String
  course          Course           @relation(fields: [courseId], references: [id])
  title           String
  description     String?
  type            AssignmentType   // LEGACY_SUBMISSION | AI_EXPERIENCE
  toolId          String?          // if AI_EXPERIENCE, which tool
  tool            Tool?            @relation(fields: [toolId], references: [id])
  rubricId        String?
  rubric          Rubric?          @relation(fields: [rubricId], references: [id])
  dueAt           DateTime?
  pointsPossible  Float
  canvasAssignmentId String?       // for grade push to Canvas
  createdAt       DateTime         @default(now())
  submissions     Submission[]
}

enum AssignmentType {
  LEGACY_SUBMISSION   // student uploads a file or pastes text
  AI_EXPERIENCE       // student completes a chat session with a tool
}

model Rubric {
  id          String           @id @default(cuid())
  courseId    String
  course      Course           @relation(fields: [courseId], references: [id])
  title       String
  description String?
  criteria    RubricCriterion[]
  assignments Assignment[]
  createdAt   DateTime         @default(now())
}

model RubricCriterion {
  id          String  @id @default(cuid())
  rubricId    String
  rubric      Rubric  @relation(fields: [rubricId], references: [id], onDelete: Cascade)
  title       String
  description String?
  maxPoints   Float
  order       Int
  bands       RubricBand[]
}

model RubricBand {
  id          String          @id @default(cuid())
  criterionId String
  criterion   RubricCriterion @relation(fields: [criterionId], references: [id], onDelete: Cascade)
  label       String          // e.g. "Excellent", "Proficient", "Developing", "Beginning"
  minPoints   Float
  maxPoints   Float
  description String          // what this band looks like
}

model Submission {
  id             String           @id @default(cuid())
  assignmentId   String
  assignment     Assignment       @relation(fields: [assignmentId], references: [id])
  studentId      String
  student        User             @relation(fields: [studentId], references: [id])
  type           AssignmentType   // mirrors assignment type
  // For LEGACY_SUBMISSION:
  textContent    String?          // pasted text submission
  fileUrl        String?          // uploaded file URL (Azure Blob when migrated)
  fileName       String?
  // For AI_EXPERIENCE:
  sessionId      String?          // ChatSession id
  session        ChatSession?     @relation(fields: [sessionId], references: [id])
  submittedAt    DateTime         @default(now())
  gradebookEntry GradebookEntry?
}

model GradebookEntry {
  id               String              @id @default(cuid())
  submissionId     String              @unique
  submission       Submission          @relation(fields: [submissionId], references: [id])
  status           GradebookStatus     @default(AI_DRAFT)
  // AI-generated draft
  aiScore          Float?
  aiRawFeedback    String?             // full narrative
  aiCriteriaScores Json?               // { criterionId: { score, rationale } }
  // Faculty review
  facultyScore     Float?
  facultyFeedback  String?
  facultyCriteriaScores Json?
  reviewedBy       String?             // User id
  reviewer         User?               @relation(fields: [reviewedBy], references: [id])
  reviewedAt       DateTime?
  // Canvas sync
  canvasPushedAt   DateTime?
  canvasPushStatus String?             // "success" | "error" | null
  createdAt        DateTime            @default(now())
  updatedAt        DateTime            @updatedAt
}

enum GradebookStatus {
  AI_DRAFT          // AI has scored, faculty hasn't reviewed
  PENDING_REVIEW    // submitted to faculty queue
  FACULTY_REVIEWING // faculty has opened it
  APPROVED          // faculty approved, not yet released to student
  RELEASED          // student can see grade + feedback
  NEEDS_REVISION    // faculty sent back for more work
}
```

---

### New API Routes

```
/api/courses/[courseId]/assignments
  GET  — list assignments (faculty: all; student: only their own)
  POST — create assignment (faculty only)

/api/assignments/[assignmentId]
  GET    — assignment detail + rubric
  PATCH  — update assignment (faculty only)

/api/assignments/[assignmentId]/submit
  POST — student submits (file or text); triggers AI scoring job

/api/gradebook/[entryId]
  GET    — entry detail (faculty: full AI draft; student: only if RELEASED)
  PATCH  — faculty approves/edits and sets status

/api/gradebook/[entryId]/release
  POST — releases grade to student + triggers Canvas push

/api/gradebook/[entryId]/canvas-push
  POST — (re)push grade to Canvas API
```

---

### AI Scoring Flow

```
Student submits → Submission record created
  ↓
1. Load rubric criteria + bands
2. Load submission content (text, file text, or chat transcript)
3. Build scoring prompt:
   "You are grading a student submission against the following rubric.
    For each criterion, assign a score within the band range and write
    2-3 sentences of specific, constructive feedback. Return JSON."
4. Call Claude Sonnet → structured JSON response
5. Parse → store in GradebookEntry (aiScore, aiCriteriaScores, aiRawFeedback)
6. Set status = AI_DRAFT
7. Notify faculty (email or in-app)
```

---

### Canvas Integration

```typescript
// app/lib/canvas-client.ts
class CanvasClient {
  // POST /api/v1/courses/:courseId/assignments/:assignmentId/submissions/:studentId/comments
  // PUT  /api/v1/courses/:courseId/grades  (bulk grade push)
  async pushGrade(params: {
    canvasCourseId: string
    canvasAssignmentId: string
    canvasStudentId: string
    score: number
    comment: string
  }): Promise<{ success: boolean; error?: string }>
}
```

**Env vars needed:**
- `CANVAS_BASE_URL` — e.g. `https://uk.instructure.com`
- `CANVAS_API_TOKEN` — faculty/admin token or OAuth
- `CANVAS_COURSE_ID` mapping stored on the `Course` model

Canvas becomes a **write-only sink** for now. When Sandbox becomes system of record, Canvas sync becomes optional/legacy.

---

### Rubric Extraction (from Syllabus)

Faculty can either:
1. **Build manually** — UI form to create rubric criteria + bands
2. **Extract from syllabus** — "Import from document" button triggers:
   - Load the syllabus `CourseDocument`
   - Ask Claude Sonnet to extract rubric structure as JSON
   - Pre-populate the rubric form for faculty to review/confirm

---

### Faculty UI Pages Needed

```
/courses/[courseId]/assignments        — list + create assignments
/courses/[courseId]/assignments/[id]   — assignment detail, submission list
/courses/[courseId]/gradebook          — review queue (AI_DRAFT and PENDING_REVIEW entries)
/courses/[courseId]/gradebook/[entryId] — grading interface: AI draft + faculty edit side-by-side
/courses/[courseId]/rubrics            — manage rubrics
```

---

### Student UI Pages Needed

```
/courses/[courseId]/assignments        — student's assignment list with due dates + status
/courses/[courseId]/assignments/[id]   — submit work (upload or link AI session)
/courses/[courseId]/grades             — released grades + feedback
```

---

## Build Order

### Phase 1 — RAG
1. `prisma migrate` — add `DocumentChunk` model + pgvector extension
2. `app/lib/document-chunker.ts`
3. `app/lib/embedding-service.ts` (OpenAI, Azure-ready interface)
4. `app/lib/vector-store.ts` (pgvector, Azure-ready interface)
5. `app/lib/document-processor.ts` (orchestrator)
6. Wire into existing document upload route
7. Update `/api/chat` inference to use similarity search instead of full-doc injection
8. Test with My TA / avatar flow

### Phase 2 — Gradebook Data Model
1. Prisma schema: `Assignment`, `Rubric`, `RubricCriterion`, `RubricBand`, `Submission`, `GradebookEntry`
2. Migration + seed data (add sample assignments to TEK-100)
3. API routes: assignments CRUD, submit, gradebook entry review

### Phase 3 — AI Scoring + Faculty UI
1. AI scoring service (`app/lib/grading-service.ts`)
2. Faculty gradebook review UI
3. Rubric builder UI (manual + extract from syllabus)

### Phase 4 — Canvas Integration + Student UI
1. `app/lib/canvas-client.ts`
2. Grade release flow + Canvas push
3. Student grades/assignments pages
