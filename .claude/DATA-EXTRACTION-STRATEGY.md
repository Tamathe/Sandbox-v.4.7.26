# Data Extraction & Platform Mapping Strategy
## Goal: Build the One Brain — Beat the Instructor in 5 Years

---

## THE MASTER PROMPT

Use this to drive any planning session, sprint, or feature conversation:

---

> **Context:** The Sandbox is the AGI University platform built for the University of Kentucky. It is architected around three pillars: **One Brain** (every interaction feeds a single institutional intelligence), **Proactive Agency** (the system acts, not just responds), and **Generative Campus** (the AI creates learning experiences, not just assists with existing ones). It runs Next.js + Prisma + pgvector on Neon PostgreSQL. The platform already captures ToolSession data (score, qualitySignal, scoredAt), StudentObjectiveProgress, LTI 1.3 grade passback to Canvas, Avatar RAG (pgvector), and multi-role users (Student/Educator/Admin). The 5-year goal is to build a system that outperforms a human instructor at personalized learning delivery — not to replace the instructor, but to be measurably better at identifying what a specific student needs, when they need it, and delivering it in the right modality.
>
> **Task:** Given The Sandbox's current schema and data pipeline, identify:
> 1. Every data signal we are already capturing or could capture with zero schema changes
> 2. Every inference we can make from that data TODAY using existing AI (Haiku/Sonnet)
> 3. The minimum schema additions needed to unlock the next tier of insight
> 4. A ranked roadmap (Easy → Hard → Possible-with-investment) toward building the One Brain — a system that can predict and improve a student's learning outcome better than an unaided human instructor can
>
> Anchor every recommendation to the EIP blueprint principles: GraphRAG over naive RAG, multi-agent orchestration, affective computing signals, Socratic scaffolding (never solve — only guide), and MCP-style interoperability. Every data signal should feed the brain. Every inference should enable agency. Every new capability should expand the generative surface.

---

## WHAT WE CAN DO RIGHT NOW (Easy — Zero or Near-Zero Schema Changes)

### Data We're Already Capturing
| Signal | Source | What It Tells Us |
|---|---|---|
| `ToolSession.score` | Post-session Haiku scoring | Mastery per tool per student |
| `ToolSession.qualitySignal` | Session scorer | Engagement quality, not just completion |
| `ToolSession.scoredAt` vs `createdAt` | Both fields | Time-on-task per session |
| `StudentObjectiveProgress` | Gradebook | Objective-level mastery gaps |
| `Assignment.dueAt` + completion | Gradebook | Time management, procrastination patterns |
| `ToolSession` tool type + frequency | Relationships | Learning style (prefers visual? roleplay? quiz?) |
| Petition history | PetitionType enum | Life circumstances affecting performance |
| `sensitiveSession` flag | Student Services tools | Wellbeing signals (counseling, DRC, financial aid usage) |
| Course RAG chunks (pgvector) | Avatar deploy | What knowledge exists per course |
| Tool usage sequence per session | ToolSession ordering | Learning path self-selection patterns |

### Inferences We Can Make TODAY
1. **At-Risk Prediction** — already partially built. Extend: combine low scores + missed due dates + sensitive sessions + no tool usage in 5+ days → composite risk score.
2. **Learning Style Profile** — count tool type usage per student (roleplay tools vs. quiz tools vs. document tools) → infer preferred modality → Sandy can recommend matching tools first.
3. **Knowledge Gap Map** — cross `StudentObjectiveProgress` failures with course RAG chunks → identify which *concepts* are poorly understood, not just which *assignments* are incomplete.
4. **Instructor Effectiveness Signal** — aggregate student scores per tool per educator → identify which tools drive learning vs. which are used but don't move the needle.
5. **Engagement Velocity** — sessions per week trending up/down → early warning before score drops.
6. **Optimal Session Length** — correlate `scoredAt - createdAt` with score → find the "sweet spot" duration per tool type per student profile.

### Prompt Pattern for Sandy (Today)
Sandy already has page-aware ProactiveConfig. Extend her context injection to include:
- Student's lowest-scoring objective this week
- Last tool used + score
- Days since last session
- Number of upcoming due dates in 72 hours

This makes Sandy a **personalized academic advisor** with zero new schema work.

---

## WHAT WE CAN DO WITH MODERATE EFFORT (Medium — Schema Additions)

### Add These Fields
```prisma
model ToolSession {
  // Already exists:
  score         Float?
  qualitySignal String?

  // Add:
  durationSeconds  Int?        // time-on-task (createdAt delta)
  hintCount        Int?        // how many times student asked for hints
  reformulationCount Int?      // how many times student rephrased their question
  exitReason       String?     // "completed" | "abandoned" | "time-limit"
  conceptsTouched  String[]    // extracted concept tags from conversation
}

model StudentProfile {
  userId           String   @unique
  user             User     @relation(...)
  preferredModality String? // "visual" | "dialogue" | "practice" | "reading"
  avgSessionLength Int?     // minutes, rolling 30-day
  peakEngagementHour Int?   // 0-23, hour of day with best scores
  riskScore        Float?   // composite 0-1
  riskUpdatedAt    DateTime?
  learningVelocity Float?   // score improvement rate per week
}
```

### With This Data You Can Build
1. **Personalized Tool Recommendation Engine** — "Students with your profile who struggled with this objective scored 23% higher after using [Tool X]"
2. **Optimal Timing Nudges** — "Your best sessions happen between 2-4pm. You have a due date in 36 hours. Start now?"
3. **Hint Rate as Mastery Signal** — high hint count + high score = scaffolding worked. High hint count + low score = concept not yet internalized.
4. **Abandonment Pattern Detection** — students who abandon sessions on specific tools → flag those tools for educator review.
5. **Concept Coverage Heatmap** — per student, per course: which concepts have been touched by AI sessions vs. which remain unexplored.

---

## WHAT WE CANNOT DO YET, BUT HAVE THE CAPABILITY PATH (Hard — Investment Required)

### GraphRAG (vs. Current Naive pgvector RAG)
**What it unlocks:** Multi-hop reasoning across course materials. Currently Sandy retrieves top-5 similar chunks. GraphRAG would let her answer "How does the concept from Week 3 relate to what's on the final?" by traversing a knowledge graph.

**Path:** Replace `ServiceChunk`/`AvatarChunk` ingestion pipeline with a GraphRAG ingestion step that extracts entities + relationships and stores them in a graph structure. Neo4j or pgvector with explicit relationship edges. Microsoft's GraphRAG library is open source.

**5-year relevance:** This is the core of beating instructors. An instructor remembers the curriculum holistically. Naive RAG doesn't. GraphRAG does.

---

### Affective Computing (Cognitive Load Detection)
**What it unlocks:** Real-time detection of frustration, confusion, boredom from interaction patterns — without biometrics.

**What we can do WITHOUT webcam/biometrics (FERPA-safe):**
- **Typing cadence** (long pauses before submitting → confusion)
- **Message length trends** (student messages getting shorter → disengagement)
- **Re-ask rate** (same concept asked 3 times → not getting it)
- **Time of day + session duration** (late night short sessions → stress)
- **Vocabulary shift** (simpler words over time → cognitive overload)

**Path:** Add client-side telemetry to `ChatInterface.tsx` that sends anonymized interaction metadata (not content) to a `/api/telemetry` endpoint. No biometrics. No FERPA risk. Pure behavioral signals.

**5-year relevance:** This is what makes the platform feel like it *knows* the student. Human instructors pick up on this in office hours. We can do it at scale, 24/7.

---

### Multi-Agent Orchestration
**What it unlocks:** Instead of one Haiku call per chat turn, a coordinated system where:
- Agent 1 (Router): classifies the student's intent
- Agent 2 (Retrieval): pulls relevant KB chunks
- Agent 3 (Pedagogy): selects the Socratic scaffolding strategy
- Agent 4 (Assessment): decides if this moment warrants a formative check

**Path:** The Anthropic Claude Agent SDK supports multi-agent coordination natively. The Sandbox's `chat-service.ts` is already structured as a lib function — it can be upgraded to an agent pipeline without changing the API contract.

**5-year relevance:** This is architecturally what separates a chatbot from an AI instructor. The human instructor runs all these mental processes simultaneously. Multi-agent orchestration replicates that.

---

### MCP Server Layer
**What it unlocks:** Any AI agent in the platform can call:
- Canvas grade data live
- UK's SIS (student schedule, enrollment, major requirements)
- Library databases
- Academic calendar
- Financial aid status

**Path:** Build internal MCP servers for each data source. The LTI 1.3 integration already handles Canvas auth — MCP would extend this to real-time data queries, not just grade passback.

**5-year relevance:** An instructor knows the whole student. They know if someone is taking 18 credit hours and working part-time. MCP gives the AI the same contextual awareness.

---

### Outcome-Based Scoring (Beating the Instructor Metric)
**The key question:** How do you *prove* the AI outperforms the instructor?

**Define the metric now:**
- Control: students with access to instructor only (office hours, Canvas)
- Treatment: students with Sandbox AI tools
- Measure: final exam score delta, grade distribution shift, at-risk student retention rate, time-to-mastery per objective

**Path:** The gradebook + LTI passback already captures final grades. Add a `studyGroup` flag to User (control/treatment) and run internal A/B analysis. This is the data that wins the argument in 5 years.

---

## THE 5-YEAR ROADMAP TO THE AGI UNIVERSITY

Each year maps to the trajectory defined in VISION.md. Years 1-2 build the One Brain. Years 3-4 enable Proactive Agency. Year 5 is the Generative Campus at full power.

### Year 1 (Now → 2027): Data Foundation → One Brain Infrastructure
- [ ] Extend ToolSession with duration, hintCount, exitReason
- [ ] Build StudentProfile with riskScore + learningVelocity
- [ ] Wire all signals into Sandy's context injection
- [ ] Start A/B tracking for outcome measurement
- [ ] Concept tagging on all RAG chunks (structured metadata)

### Year 2 (2027-2028): Intelligence Layer → One Brain Reasoning
- [ ] GraphRAG ingestion pipeline for course materials
- [ ] Behavioral telemetry (typing cadence, re-ask rate — no biometrics)
- [ ] Personalized tool recommendation engine
- [ ] Optimal timing nudge system

### Year 3 (2028-2029): Agent Orchestration → Proactive Agency
- [ ] Multi-agent chat pipeline (Router → Retrieval → Pedagogy → Assessment)
- [ ] MCP server for Canvas + SIS live data
- [ ] Socratic guardrails hardwired into all tool system prompts
- [ ] Cognitive load detection from behavioral signals

### Year 4 (2029-2030): Prediction & Proof → Agency at Scale
- [ ] Learning velocity prediction (will this student pass the final?)
- [ ] Intervention recommendation engine (what should the educator do?)
- [ ] Outcome-based reporting dashboard for provost
- [ ] Publish internal A/B results showing score delta

### Year 5 (2030-2031): The AGI University
- [ ] GraphRAG + multi-agent + affective = personalized 24/7 tutoring (Generative Campus fully realized)
- [ ] Predictive intervention catches at-risk students before the educator notices (Proactive Agency at scale)
- [ ] Measurable: AI-assisted students outperform on objective assessments (One Brain delivers outcomes)
- [ ] Platform becomes the evidence base for institutional AI adoption
- [ ] The distinction between "the platform" and "the university's academic support infrastructure" has dissolved

---

## THE ARGUMENT (For Stakeholders)
> "The human instructor is rate-limited: 1 office hour per week, 30 students per course, no memory of last week's chat session, no visibility into whether the student engaged with the material at 11pm. The Sandbox sees every interaction, scores every session, remembers every concept gap, and is available at 3am before the exam. We're not replacing the instructor. We're giving students a 24/7 version of the best office-hours conversation the instructor could ever have — at scale."

> "Other universities are bolting chatbots onto their LMS. That's Phase 1. The Sandbox is intelligence-first — every tool, every session, every concept feeds One Brain. That brain doesn't just respond — it acts. It doesn't just assist with existing content — it creates. That's the difference between using AI and being the AGI University."
