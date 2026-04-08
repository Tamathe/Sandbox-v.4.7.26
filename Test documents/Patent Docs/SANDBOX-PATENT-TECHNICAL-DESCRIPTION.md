# The Sandbox: Technical Description for Patent Filing

## Prepared for Patent Counsel — University of Kentucky
## Date: March 24, 2026

---

## 1. THE PROBLEM

Universities today operate through fragmented data silos. A single institution may have student grades in one system (Canvas/Blackboard), email and calendars in another (Microsoft 365), student success data in a third, campus news on a separate server, advising records in yet another, and compliance documentation scattered across departments. No single system sees the whole picture.

This fragmentation creates three specific problems:

**Problem A: No unified intelligence.** When a student asks "What should I focus on this week?", no existing system can answer that question because the answer requires combining data from their course grades, upcoming assignments, calendar, financial aid deadlines, and campus events — all of which live in separate systems.

**Problem B: Faculty cannot build AI tools without coding expertise.** A chemistry professor who wants to create an AI-powered lab simulation for their students has no way to do so. Existing tools (ChatGPT custom GPTs, Microsoft Copilot Studio) produce simple chatbots but cannot generate sophisticated interactive applications, and they cannot access the professor's course materials or understand their learning objectives.

**Problem C: Institutional knowledge is inaccessible.** University policies, news articles, advising procedures, and service documentation exist as static documents. There is no system that can answer natural language questions about this content with citations and context.

Existing solutions (Canvas, Blackboard, ChatGPT, Microsoft Copilot Studio) each address at most one of these problems. None provides a unified platform that combines institutional data aggregation, AI-powered tool creation, and a context-aware intelligent agent.

---

## 2. THE UNDERLYING PRINCIPLE

The Sandbox solves these problems through a single architectural principle:

**A unified data layer that feeds a context-aware AI agent, which in turn powers a no-code tool-building pipeline, all operating within a single platform where every user action generates learning signals that flow back into the intelligence layer.**

This is not a collection of features. It is a hierarchy:

```
Level 1: UNIFIED DATA LAYER
    All institutional data (courses, materials, grades, policies,
    calendar, email, tasks, news) normalized into a single database
    with vector-searchable knowledge embeddings.

Level 2: CONTEXT-AWARE INTELLIGENT AGENT ("Sandy")
    A persistent AI agent that combines:
    - Who you are (role, department, learning history)
    - Where you are (current page/task)
    - What you know (mastery profile, concept states)
    - What the institution knows (policies, news, services)
    ...into a dynamically assembled context that makes every
    AI response specific to the user's situation.

Level 3: NO-CODE TOOL CREATION PIPELINE
    Using the data and intelligence from Levels 1 and 2,
    any faculty member can describe a tool idea in plain language
    and the system will build, preview, and deploy it —
    grounded in their actual course materials and learning objectives.

Level 4: FEEDBACK LOOP
    Every student interaction with every tool generates scored
    learning signals that flow back into Level 1, enriching the
    data layer, which improves the intelligence at Level 2,
    which improves the tools built at Level 3.
```

Any feature on the platform — whether it is a degree audit, a policy search, a morning briefing, a live quiz room, or a cardiac arrest simulator — is an expression of this hierarchy. The underlying principle enables an open-ended class of features, not a fixed set.

---

## 3. HOW SIGNALS TRAVEL THROUGH THE SYSTEM

### 3.1 The Authentication Signal Path

Every interaction with The Sandbox begins with the same signal path that establishes the user's identity.

**Input:** A raw HTTP request from a user's browser.

**Step 1 — Cookie Inspection:** The system's middleware layer intercepts the request and looks for a cryptographic session token stored as an HTTP-only cookie (named "sandbox-session"). This cookie was created when the user logged in with their email and password.

**Step 2 — Token Verification:** If the cookie exists, the system verifies it using HMAC-SHA256 signature validation (via the jose cryptographic library). This confirms the token was issued by The Sandbox and has not been tampered with. The system extracts the user's email address from the verified token payload.

**Step 3 — Header Injection:** The verified email address is injected into the request as an internal header ("x-demo-user-email"). This is a critical transformation: the system converts a cryptographic proof of identity (JWT cookie) into a simple, readable signal (email header) that all downstream services can consume without needing to repeat the cryptographic verification.

**Step 4 — Cached User Lookup:** Every API route reads this header and looks up the full user record. To avoid querying the database on every request, the system maintains an in-memory cache (LRU cache, 500 entries, 60-second expiration). This means the system can handle hundreds of requests per second while checking the user's identity, role, and suspension status on each one.

**Step 5 — Role-Based Gating:** Based on the user's role (Student, Educator, Admin, Staff, or Registrar), the system permits or denies access to specific routes. There are seven distinct guard functions, each enforcing a different role requirement.

**What this means:** Every single interaction — whether it's Sandy answering a question, a student submitting a quiz answer, or an administrator viewing analytics — passes through this same five-step signal path. The authentication layer is not a feature; it is the foundation that every feature depends on.

### 3.2 The Knowledge Embedding Pipeline (Document to Searchable Intelligence)

This is the process by which raw documents (PDFs, Word files, policy documents, news articles) become machine-searchable knowledge.

**Input:** A raw document file (PDF or DOCX) uploaded by a faculty member or ingested from an institutional source.

**Transformation 1 — Text Extraction:** The system extracts plain text from the document. For PDFs, it uses a parsing library that reads the PDF's internal structure. For DOCX files, it decompresses the file (which is internally a ZIP archive), walks the XML structure to find paragraph and text nodes, and concatenates them into plain text. If fewer than 100 characters are extracted, the document is rejected as likely being a scanned image rather than digital text.

**Transformation 2 — Chunking:** The extracted text is split into segments of approximately 512 tokens (roughly 2,000 characters). The system splits on paragraph boundaries first, then on sentence boundaries for oversized paragraphs, and applies a 256-character overlap between adjacent chunks. This overlap ensures that concepts spanning a paragraph break are captured in at least one chunk. Chunks exceeding 3,000 characters are hard-cut into 2,000-character blocks as a safety measure.

**Transformation 3 — Vector Embedding:** Each chunk is sent to an embedding model (OpenAI text-embedding-3-small) which converts the text into a 1,536-dimensional numerical vector. This vector captures the semantic meaning of the text — chunks about similar topics will have similar vectors, regardless of the specific words used.

**Transformation 4 — Vector Storage:** The chunk text and its vector are stored in the database using the pgvector extension, which enables mathematical similarity searches. Any previous chunks for the same source material are deleted first, ensuring the index stays current.

**What consumes this output:** When Sandy needs to answer a question about course material or institutional policy, she embeds the user's question into the same vector space and searches for the most similar stored chunks. The top results are injected into her context, giving her specific, citation-worthy knowledge rather than generic responses. This is the Retrieval-Augmented Generation (RAG) pipeline.

### 3.3 Sandy's Context Assembly (Fragmented Data to Unified Intelligence)

This is the core transformation that makes Sandy context-aware. Before every AI response, the system assembles a composite instruction set from 11 different data sources.

**Input:** A user's message, their identity, their current page, and their conversation history.

**Layer 1 — Base Instructions:** The system starts with either a tool-specific instruction set (if the user is chatting within a specific tool) or Sandy's default personality and rules.

**Layer 2 — Course Context:** If the user is working within a course, the system fetches the instructor's syllabus context, all learning objectives for the course (organized by module and sequence), and any adaptive difficulty settings the instructor has configured.

**Layer 3 — RAG Context Injection:** The system embeds the user's most recent message and performs a vector similarity search against the course's document chunks (or policy chunks, or news chunks, depending on context). The top 6 most relevant chunks are retrieved, each annotated with a similarity score (0 to 1), and formatted into a "Relevant Excerpts" section. For complex multi-hop questions (detected by keywords like "why," "how does," "prerequisite," "compare"), the system also queries a knowledge graph layer that maps entity relationships, providing structural context beyond what individual text chunks can offer.

**Layer 4 — Student Mastery Profile:** The system queries the student's progress against each learning objective in the course. Objectives are sorted into "mastered" and "struggling" categories. This profile is injected as a hidden annotation — Sandy is instructed to use it to shape her responses (scaffolding more for struggling concepts, pushing further on mastered ones) without explicitly revealing the profile to the student.

**Layer 5 — Bloom's Taxonomy Scaffolding:** The system reads the student's dominant cognitive level (on a 1-6 scale corresponding to Bloom's Taxonomy: Remember, Understand, Apply, Analyze, Evaluate, Create) and their average cognitive load. It then generates a pedagogical guardrail: for students at Bloom level 4-6 with low cognitive load, Sandy scaffolds lightly and pushes toward synthesis; for students at Bloom level 1-2 or with high cognitive load, Sandy breaks concepts into smaller steps and provides more structured support.

**Layer 6 — Misconception Awareness:** The system queries a misconception taxonomy for the course and checks whether the student has previously triggered any known misconception patterns. If so, it injects remediation hints — but instructs Sandy to address them gently only if they surface naturally, never lecturing unprompted.

**Layer 7 — Spaced Repetition State:** The system checks whether any concepts are due for review based on a modified SM-2 spaced repetition algorithm. Due concepts and their associated remediation hints are included in Sandy's context, allowing her to naturally weave review into conversation.

**Layer 8 — Cross-Session Learning Context:** For students in experimental treatment groups, the system pulls a cross-session learning summary that includes weak concepts, stale concepts needing review, domain modality preferences, risk scores, and learning velocity trends.

**Layer 9 — User Memories:** Any stored observations about the student (their goals, strengths, preferred learning style, personal context) are injected so Sandy can personalize her responses.

**Layer 10 — Page Awareness:** The system maps the user's current URL to a description of what that page does (from a registry of 100+ page descriptions). This allows Sandy to understand what the user is trying to accomplish — for example, that they are on the degree planning page exploring a major change, or that they are on the tool builder page creating a new simulation.

**Layer 11 — Time-of-Day Personality:** Sandy's personality shifts based on the time of day (warmer greetings in the morning, acknowledging late-night study in the evening) and the user's current context.

**Output:** A single composite instruction set, typically 2,000 to 4,000 tokens, that is sent to the AI model along with the user's conversation history. This instruction set is unique to this user, on this page, at this moment, with this learning history. No two requests produce the same instruction set.

**What this means:** Sandy does not simply "use AI to chat." The system performs an 11-layer data assembly process before each AI call, transforming fragmented data from courses, learning profiles, knowledge graphs, misconception taxonomies, spaced repetition schedules, user memories, and page context into a single unified instruction that produces a highly specific, educationally grounded response.

### 3.4 The Session Scoring Pipeline (Raw Interaction to Quantified Learning)

This is the process by which a student's conversation with an AI tool is transformed into structured learning data.

**Input:** A completed tool session — a sequence of messages between the student and the AI, along with metadata (tool type, course, learning objectives).

**Transformation 1 — Transcript Preparation:** The system extracts the last 20 messages from the session, truncating each to 500 characters. It also fetches all learning objectives associated with the tool's course.

**Transformation 2 — AI Scoring:** The prepared transcript and objectives are sent to a fast AI model (Claude Haiku) with a scoring prompt. The model returns a structured JSON assessment containing: a numerical score (0.0 to 1.0), a quality signal (strong/partial/minimal/incomplete), a count of hints the student needed, a list of concepts the student engaged with, and an exit reason (completed/abandoned/timeout).

**Transformation 3 — Mastery Level Computation:** The quality signal is mapped to a mastery level: "strong" becomes "proficient," "partial" becomes "developing," "minimal" or "incomplete" becomes "struggling." The student's progress records for each relevant learning objective are updated, but only upward — a new "developing" score will not overwrite an existing "proficient" score.

**Transformation 4 — Downstream Cascades (five parallel updates):**

- The student's overall profile is updated with rolling Bloom's level and cognitive load averages.
- The spaced repetition state for each touched concept is recalculated using a modified SM-2 algorithm (stability factor adjusted by score, next review date computed).
- Concept mastery records are updated (encounter count incremented, success/failure tallied, mastery level recomputed as success rate).
- The system checks for transfer events — whether the student successfully applied a concept learned in one course to a different course context.
- The student's overall profile (dominant Bloom level, learning velocity, risk score) is recalculated.

**What consumes this output:** Faculty analytics dashboards display aggregated mastery data. Sandy's context assembly (Layer 4 above) reads the mastery profile to shape future conversations. The proactive intelligence layer uses risk scores to identify at-risk students. The curriculum audit system uses aggregated scores to detect concept gaps and assessment drift.

### 3.5 The Real-Time Learning Observer (Conversation to Cognitive State)

Running in parallel with normal conversation — every third conversational turn — the system performs a lightweight cognitive state inference.

**Input:** The most recent user message (800 characters), the most recent AI response (800 characters), and the recent conversation history (~6 turns).

**Transformation 1 — Cognitive State Inference:** A fast AI model (Claude Haiku) analyzes the conversation excerpt and returns nine measurements: Bloom's Taxonomy level (1-6), cognitive load (0-1), frustration score (0-1), metacognition score (0-1), and whether the student is in productive struggle — each with a confidence score.

**Transformation 2 — Reformulation Detection:** Without using an AI model, the system computes Jaccard similarity (shared word overlap) across the student's last three messages. A similarity score above 0.35 indicates the student is rephrasing the same question repeatedly — a signal of confusion or frustration that the AI's confidence scores alone might miss.

**Transformation 3 — Escalation Logic:** If three consecutive readings show high cognitive load (>0.65) or high frustration (>0.65), the system marks the session as "escalated." Escalated sessions bypass the normal confidence thresholds — their readings are promoted to the scoring pipeline even if individual confidence scores are below the normal 0.85 threshold. This prevents the system from ignoring a struggling student just because the AI is uncertain about the severity.

**Transformation 4 — Misconception Pattern Matching:** The system tests the student's message against a taxonomy of known misconceptions for the course. Each misconception has trigger patterns (regular expressions). When a match fires, the misconception is logged to the student's concept state and its prevalence score is incremented. On the next message, Sandy's context assembly (Layer 6) will include remediation hints for this misconception.

**What this means:** The system does not wait for a session to end to assess learning. It continuously infers cognitive state during conversation, detects struggles through both AI analysis and statistical methods, and feeds these signals back into the context assembly loop in near-real-time.

### 3.6 The Tool Builder Pipeline (Idea to Deployed Application)

This is the process by which a faculty member with no coding knowledge describes a tool idea and receives a functional, deployed AI application.

**Input:** A faculty member's conversational description of what they want to build (e.g., "I want a hallucination spotter for my AI ethics module").

**Transformation 1 — Context Gathering:** The system fetches the faculty member's courses, uploaded documents, and any existing tool specifications. A 6,000+ token instruction set defines the rules for tool creation, including the available tool types (chatbot, simulation, quiz, interview, debate, study buddy, portfolio, game show, live poll, collaborative canvas, seminar) and the pedagogical requirements for each.

**Transformation 2 — Iterative Specification Refinement:** Through a back-and-forth conversation, the AI asks clarifying questions (domain focus, difficulty level, target audience) and progressively builds a tool specification. After each exchange, the AI embeds a structured specification in a hidden comment tag within its response. The system extracts this specification and tracks it across conversation turns.

**Transformation 3 — Complexity Detection:** If the tool requires features beyond a simple chatbot (file uploads, persistent state, multi-user interaction, audio, visual simulations), the system detects this via pattern matching in the specification and suggests switching to the Playground mode, which generates full interactive applications with HTML/JavaScript rather than just chat-based tools.

**Transformation 4 — Code Generation:** For Playground applications, the system generates the complete application code — HTML, CSS, JavaScript, and any necessary libraries — based on the specification. For chat-based tools, it generates the system prompt, welcome message, starter questions, and learning objectives.

**Transformation 5 — Publication:** The completed tool is stored in the database with all necessary metadata (name, description, category, type, system prompt, learning objectives, difficulty level, intended audience). It becomes immediately available to students enrolled in the faculty member's courses.

**What feeds back:** When students use the tool, their sessions are scored (Section 3.4), their learning is observed (Section 3.5), and the results flow back into the data layer. If the tool is linked to a course, faculty can see analytics on how students performed, which concepts they struggled with, and whether the tool is achieving its learning objectives.

### 3.7 The Syllabus Import Pipeline (PDF to Structured Course Graph)

**Input:** A PDF or DOCX syllabus file.

**Transformation 1 — Text Extraction:** Same as Section 3.2, Transformation 1.

**Transformation 2 — Three-Pass AI Analysis:**
- **Pass 1 (Structure Detection):** The syllabus text is sent to an AI model in 8,000-character windows. The model identifies section labels, unit types (lecture, lab, exam), and raw date strings.
- **Pass 2 (Date Normalization):** All detected date strings are batch-processed into standardized ISO 8601 format with confidence scores. Ambiguous dates (e.g., "next Thursday") are flagged as low-confidence.
- **Pass 3 (Prerequisite Detection):** The AI scans the prose for prerequisite language patterns ("requires knowledge of X," "must complete Y before Z") and outputs a graph of prerequisite, sequence, and concurrent relationships between units.

**Transformation 3 — Result Structuring:** The three passes are combined into a structured result: units (with nested modules and lessons), edges (prerequisite graph), policies (grading, attendance, late work), grading weights, layout hints (week-based vs. unit-based vs. topic-based), and semester date ranges.

**Transformation 4 — Database Materialization:** The structured result is written to the database as Assignment records, CourseMaterial records, LearningObjective records, and CoursePrerequisite edges. The raw text also enters the embedding pipeline (Section 3.2) to become searchable knowledge.

**What this means:** A faculty member uploads a single PDF and receives a fully structured course — with weeks, assignments, objectives, prerequisites, and policies all extracted and organized — plus a searchable knowledge base that Sandy can reference when helping students.

### 3.8 The Agent Dispatch Loop (Natural Language to Multi-Tool Orchestration)

**Input:** A user's natural language request (e.g., "Find me 30 minutes with Serenity this week").

**Transformation 1 — Tool Registry Assembly:** The system assembles a registry of available tools, filtered by the user's role. Each tool has a name, description, parameter schema, and permission level (auto-execute or require-approval). The current registry contains 33 tools across 7 modules (academic, communication, calendar, platform search, navigation, analytics, content).

**Transformation 2 — Intent Classification:** The AI model receives the user's request along with the tool registry and conversation history. It decides: (a) whether the request can be answered with a plain text response, or (b) whether one or more tools need to be invoked.

**Transformation 3 — Parallel Tool Execution:** If tools are needed, the AI emits tool invocation requests. Tools marked as "auto" permission execute immediately in parallel. Tools marked as "require-approval" trigger a confirmation prompt to the user — the system streams an approval request event, pauses execution, and waits for the user's response before proceeding.

**Transformation 4 — Result Integration:** Tool execution results are fed back to the AI model as additional context. The model can then invoke further tools based on the results (e.g., search for a person, then check their calendar, then propose meeting times). This loop continues for up to 10 iterations.

**Transformation 5 — Response Synthesis:** The AI model produces a final natural language response that incorporates all tool results. If navigation is needed, it embeds a structured action tag that the client interprets to navigate the user to the right page.

**What this means:** The user never needs to know which tool to use or where to find it. They state what they want in plain language, and the system classifies the intent, selects the right tools, executes them (with approval gates for sensitive actions), and synthesizes the results into a coherent response.

---

## 4. DATA TRANSFORMATIONS: OUTPUT-TO-INPUT CHAINS

The following are specific instances where the output of one process is transformed and becomes the input to another. These are the signal transformations that Matt requested.

### Chain A: Document to Embedding to RAG to System Prompt to AI Response

```
Raw PDF → [text extraction] → Plain text
Plain text → [chunking with overlap] → Text segments (~512 tokens each)
Text segments → [embedding model] → 1,536-dimensional vectors
Vectors → [stored in pgvector database] → Searchable knowledge index
User question → [embedding model] → Query vector
Query vector + Knowledge index → [cosine similarity search] → Top 6 relevant chunks
Top 6 chunks → [formatted with similarity scores] → RAG context block
RAG context block + 10 other context layers → [assembled] → Composite system prompt
Composite system prompt + conversation → [AI model] → Sandy's response
```

Each arrow represents a transformation where the data changes form. The raw PDF bears no resemblance to the final system prompt, yet the information is preserved and made accessible through seven successive transformations.

### Chain B: Student Interaction to Mastery Profile to Adapted Instruction

```
Student types message → [chat interface] → Raw text
Raw text → [learning observer, every 3rd turn] → Cognitive state reading
  (Bloom level, cognitive load, frustration, metacognition)
Cognitive state → [confidence thresholding + escalation logic] → Confirmed or rejected
Confirmed reading → [stored] → LearnerObservationLog
Session ends → [session scoring via AI] → Score, quality signal, concepts touched
Score → [mastery computation] → Updated StudentObjectiveProgress
Score → [SM-2 algorithm] → Updated spaced repetition schedule (next review date)
Score → [concept mastery formula] → Updated success rate per concept
All of the above → [next session, context assembly Layer 4-7] → Mastery profile in system prompt
Mastery profile → [AI model reads it] → Sandy adapts scaffolding, topic selection, difficulty
```

This chain means that a student who struggles with a concept on Monday will receive adapted instruction when they return on Wednesday — without any human intervention.

### Chain C: Faculty Email to Triaged Briefing to Sandy's Morning Context

```
Faculty email inbox → [API fetch, last 50 emails] → Raw email list
Raw email list → [AI triage via Haiku] → Bucketed emails
  (decision / waiting / FYI / noise), each with summary and quick replies
Calendar events → [conflict detection algorithm] → Annotated calendar
  (overlaps flagged, event types classified)
Pending tasks + overdue tasks → [sorted by urgency] → Task queue
Chat activity → [participation dates → consecutive day count] → Engagement streak
All of above → [assembled] → BriefingData structure
BriefingData → [custom browser event dispatched] → Sandy's ambient context
Sandy's ambient context → [context assembly] → Sandy's first message of the day
  ("Good morning, Katie. You have 3 unread emails needing decisions, a conflict
   at 2pm, and your evidence brief is due in 3 days.")
```

Raw email becomes a triaged action queue. Calendar events become conflict-flagged schedules. Scattered data becomes a synthesized morning briefing that Sandy delivers proactively.

### Chain D: Topic to Generated Quiz to Scored Response to Leaderboard

```
Chat slash command ("/challenge algorithms") → [parsed] → Topic + room type
Topic → [AI question generation via Haiku] → Multiple-choice question
  (question text, 4 options, correct index, explanation)
Question → [streamed via SSE to all participants] → Live display
Student answer → [compared to correct index] → Correct/incorrect
Correct/incorrect → [scoring: 100 base + speed bonus + streak] → Points
Points across rounds → [aggregated] → Final leaderboard
Leaderboard → [posted back to chat channel] → Results message
```

A two-word command produces a real-time multiplayer learning experience with AI-generated questions, live scoring, and social accountability.

### Chain E: Degree Audit with Transfer Mapping and Prerequisite Chain Detection

```
Student's completed courses → [fetched from transcript] → Course list with grades
Target program requirements → [fetched from catalog] → Requirement categories
Course list + Requirements → [matching algorithm] → Satisfied, in-progress, missing
For each completed course → [check target program's requirement map] → Transfers or lost
Transfer/lost tallies → [credit accounting] → Credits needed in new program
Missing courses → [prerequisite chain detection via DFS graph traversal] → Longest prerequisite chain
Longest chain length → [compared to credit-based estimate] → Bottleneck identification
All of above → [AI recommendation via Haiku] → Single-sentence actionable advice
```

This chain transforms raw transcript data into a comprehensive what-if analysis including credit transfer mapping, prerequisite bottleneck detection (using depth-first graph traversal), and a generated recommendation — all without human registrar involvement.

### Chain F: Curriculum Audit Feedback Loop

```
Student mastery data (aggregated across cohort) → [4 statistical detectors]:
  - Concept gap detector (< 20% cohort mastery)
  - Tool fatigue detector (sessions up + scores down)
  - Assessment drift detector (3-week sliding window, 15%+ shift)
  - Engagement cliff detector (this week < 30% of last week)
→ [threshold evaluation] → Alert candidates
Alert candidates → [deduplication against existing open alerts] → New alerts
New alerts → [batch AI narrative generation via Haiku] → Plain-English alert descriptions
Alert descriptions → [faculty dashboard] → Educator sees "Low mastery on 'Recursion':
  only 8% of students have demonstrated understanding. Consider adding a guided
  practice tool or revisiting the concept in your next lecture."
```

Student learning data flows through statistical detectors, gets filtered by thresholds, deduplicated, narrated by AI, and surfaced to the educator who can then create a new tool (Chain 3.6) to address the gap — completing a full feedback loop.

---

## 5. PREPROCESSING BEFORE THE AI MODELS ("BLACK BOXES")

Every AI model call in the system is preceded by specific data preparation. The AI models are never called with raw, unprocessed input.

### 5.1 Before Sandy's Conversational AI (Claude Sonnet)

The 11-layer context assembly described in Section 3.3 is the preprocessing. Specifically:

- **Course materials** are chunked, embedded, and retrieved by semantic similarity (not sent raw)
- **Learning objectives** are fetched and formatted with mastery annotations
- **Student profile** is queried and the dominant Bloom level + cognitive load are used to select a scaffolding strategy
- **Misconceptions** are matched against a taxonomy and only relevant ones are injected
- **User memories** are retrieved and formatted as personality hints
- **Page context** is looked up from a 100+ page description registry

None of this data exists in the form the AI model receives it. Each piece is fetched from a different database table, transformed into a specific textual format, and assembled into a composite instruction. The AI model sees the assembled result, not the raw data.

### 5.2 Before Session Scoring (Claude Haiku)

- Conversation messages are truncated to the last 20, each capped at 500 characters
- Learning objectives for the course are fetched and formatted
- The scoring prompt defines the exact JSON output format expected

### 5.3 Before Learning Observer (Claude Haiku)

- The most recent user message and AI response are truncated to 800 characters each
- Recent conversation history (~6 turns) is included for context
- A structured JSON schema is provided defining exactly what cognitive measurements to return
- The AI is never asked to "evaluate" — it produces numerical readings that are then processed by deterministic algorithms (thresholding, escalation logic, misconception matching)

### 5.4 Before Question Generation (Claude Haiku)

- The topic, course name, round number, total rounds, and difficulty are formatted into a structured prompt
- Previous question topics are listed to prevent repetition
- Strict rules for multiple-choice format (one correct answer, three plausible distractors, brief explanation) are provided
- A fallback mechanism exists: if the AI's output cannot be parsed as valid JSON with the expected structure, the system serves a pre-written question from a hardcoded set

### 5.5 Before Tool Builder (Claude Sonnet)

- A 6,000+ token instruction set defines all tool types, pedagogical requirements, and specification format
- Any uploaded documents are summarized (filename, word count, content excerpts)
- Any existing specification state is injected so the AI refines rather than restarts
- Simulation-type tools trigger additional instructions about act/scene structure

### 5.6 Before Policy Q&A (Claude Haiku)

- The question is embedded and used to search a policy-specific vector store
- Retrieved chunks are annotated with policy number, section title, effective date, responsible office, and relevance percentage
- The AI is explicitly instructed to cite specific policy numbers and not make up information
- If the embedding service is unavailable, the system falls back to text-based search

### 5.7 Before Email Triage (Claude Haiku)

- Emails are formatted with index numbers, sender, subject, category, and snippet
- The AI is asked to bucket each email (decision/waiting/FYI/noise), summarize it, and suggest quick replies
- Results are mapped back to email IDs for downstream use

### 5.8 Before Degree Recommendation (Claude Haiku)

- All numerical analysis (credit transfers, timeline estimation, prerequisite chains) is performed BEFORE the AI is called
- The AI receives only the pre-computed facts and is asked for a single sentence of actionable advice (max 40 words)
- A deterministic fallback generates advice if the AI call fails

**The pattern across all of these:** The AI models are not used for computation. They are used for natural language generation AFTER the system has performed the data retrieval, matching, scoring, and analysis. The preprocessing defines the quality and relevance of every AI response.

---

## 6. POSTPROCESSING AFTER THE AI MODELS

AI model outputs are not displayed raw. They pass through structured extraction processes.

### 6.1 Hidden Metadata Comments

Sandy's responses contain structured metadata embedded in HTML comment tags that are invisible to the user but parsed by the system:

- **`<!--OBJECTIVES:[{"id":"obj123","quality":"green"}]-->`**: After every response, Sandy annotates which learning objectives were addressed and how well. The client extracts these and updates StudentObjectiveProgress records.
- **`<!--QUIZ:correct-->`** or **`<!--QUIZ:incorrect-->`**: In quiz mode, Sandy appends a scoring tag. The client increments mastery statistics.
- **`<!--CHIPS:["Study for exam","Review notes","Ask about grading"]-->`**: Sandy embeds quick-reply suggestions. The client renders these as clickable buttons below the message.
- **`<!--PHASE:target-role-->`**: In interview mode (tool building, resume building), Sandy emits phase markers that drive a client-side state machine through the multi-step workflow.
- **`<!--ACTION:{"type":"navigate","href":"/explore-majors"}-->`**: Sandy embeds navigation commands. The client executes these to take the user to the right page.

This is a novel pattern: the AI model's output serves as both a human-readable response AND a machine-readable control signal, with the machine instructions hidden inside HTML comments that the user never sees.

### 6.2 Confidence-Gated Promotion

The Learning Observer's cognitive state readings are not blindly trusted. Each reading comes with a confidence score (0 to 1). The system only promotes a reading to the student's permanent learning record if:
- Bloom confidence is at least 0.85, OR
- Cognitive load confidence is at least 0.85, OR
- The session has been flagged as escalated (3 consecutive high readings)

Readings below these thresholds are logged for analysis but do not affect the student's profile. This prevents a single ambiguous interaction from distorting the system's understanding of the student.

### 6.3 Mastery Decay at Read Time

Concept mastery scores are not static. When the system reads a student's mastery data, it applies an exponential decay function based on time since last review. Critically, this decay is computed at read time and NEVER written back to the database. This means:
- The stored mastery represents the student's demonstrated performance
- The effective mastery (what Sandy sees) accounts for forgetting
- The decay model can be changed without migrating data

### 6.4 Response Streaming with Incremental TTS

When Sandy responds, the AI model streams tokens one at a time. The client simultaneously:
- Displays each token as it arrives (real-time text)
- Feeds each chunk to a text-to-speech engine for voice output
- Parses for hidden comment tags (above)
- Scrolls the chat window

This means the user hears Sandy start speaking before the full response has been generated — reducing perceived latency.

---

## 7. NOVEL ARCHITECTURAL CONTRIBUTIONS

The following are specific aspects of the system that, to our knowledge, do not exist in any prior system and represent novel combinations of known techniques.

### 7.1 The 11-Layer Dynamic Context Assembly

No existing educational platform assembles AI context from this many sources simultaneously. Learning management systems (Canvas, Blackboard) do not have AI agents. AI chatbots (ChatGPT, Copilot) do not have access to institutional data, learning profiles, or misconception taxonomies. The specific combination of RAG retrieval + knowledge graph traversal + Bloom-level scaffolding + misconception-aware remediation + spaced repetition state + page awareness + user memories + personality adaptation — all assembled dynamically per request — is novel.

### 7.2 Hidden Comment Metadata as Dual-Channel Output

Using HTML comments in AI responses to encode both human-readable text and machine-readable control signals (objective tracking, quiz scoring, navigation commands, interview phase control) is a specific technical approach that enables the AI to simultaneously communicate with the user and control the application's state without any visible artifacts.

### 7.3 The Confidence-Gated Escalation Pattern

The learning observer's approach of running every 3rd turn, producing confidence-scored readings, gating promotion at 0.85 confidence, but overriding that gate after 3 consecutive high readings (escalation) is a specific algorithmic design that balances accuracy against responsiveness for student safety.

### 7.4 The No-Code Tool Pipeline Grounded in Course Materials

The ability for a non-technical faculty member to describe a tool idea in conversation, have it automatically grounded in their actual course materials and learning objectives, and receive a deployable application — with student interactions feeding back into the learning analytics — is a complete loop that no existing system provides.

### 7.5 The Unified Agent with Role-Filtered Tool Access

Sandy operates as a single AI persona across the entire platform but her capabilities change based on the user's role. A student sees one set of tools; an educator sees another; a registrar sees a third. The tool registry is assembled dynamically per request, filtered by role, with separate permission levels (auto-execute vs. require-approval) for different action types. This means the same agent interface provides platform-appropriate capabilities to every user without requiring separate agent implementations.

### 7.6 Cross-Course Transfer Detection

When a student demonstrates mastery of a concept in one course and that same concept appears in a different course, the system detects the "transfer event" — evidence that the student can apply knowledge across contexts. This cross-course signal feeds back into the mastery model, potentially updating the student's concept state in the second course based on evidence from the first.

### 7.7 Reformulation Detection Without AI

The learning observer detects student confusion not only through AI inference but also through a lightweight statistical method: computing Jaccard similarity across the student's last three messages. A similarity above 0.35 means the student is rephrasing the same question — a signal of confusion that requires no AI call to detect and has no latency cost.

---

## 8. SYSTEM ARCHITECTURE SUMMARY (FOR CLAIMS DEVELOPMENT)

At its broadest, the system is:

**A method and platform for operating an educational institution comprising:**

1. A unified data layer that aggregates institutional information from multiple sources into a single database with vector-searchable knowledge embeddings.

2. A context-aware intelligent agent that dynamically assembles a composite instruction set from at least the user's role, current page context, learning mastery profile, institutional knowledge (retrieved by vector similarity), misconception awareness, spaced repetition state, and user memories — prior to each AI model invocation.

3. A no-code tool creation pipeline that converts a faculty member's natural language description into a deployed interactive learning application, grounded in the faculty member's actual course materials and learning objectives.

4. A continuous learning observation system that infers cognitive state from student interactions, gates observations by confidence scores with escalation override, and feeds confirmed observations back into the context assembly layer for subsequent interactions.

5. A dual-channel AI output mechanism that embeds machine-readable control signals within human-readable responses using hidden markup, enabling simultaneous communication with the user and state control of the application.

6. A role-filtered agent dispatch system that dynamically assembles available tools based on the user's institutional role and enforces approval gates for sensitive operations.

7. A multi-pass document analysis pipeline that transforms unstructured documents into structured course graphs with prerequisite relationships, learning objectives, and vector-searchable knowledge chunks.

Each of these elements exists in the context of the others. The unified data layer feeds the context-aware agent. The agent powers the tool creation pipeline. The tools generate learning data. The learning data feeds back into the data layer. The observation system continuously refines the agent's understanding. This circular dependency — where each layer both produces and consumes from the others — is the core architectural contribution.

---

*Prepared for Matt [Patent Attorney] by Tom [Platform Creator]. Supporting technical files (CLAUDE.md, SYSTEM-INTERDEPENDENCIES.md, Prisma schema, and source code) available upon request.*
