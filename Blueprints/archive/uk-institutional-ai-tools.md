# UK Institutional AI Tools — Build Plan
### The Sandbox — University of Kentucky
### Status: Architecture ready. Build demo first; Deloitte builds production.
### Last reviewed: March 2026 — optimized for ease of use + impact.

---

## Context: Demo → Deloitte → Production

**What we're building:** A working demo compelling enough that UK says yes and engages Deloitte to build the production system. This is not a production build. It is a proof of concept with real code — not slides, not wireframes, but a live, clickable product that demonstrates the full vision.

**What Deloitte inherits:** The architecture decisions in this document, the abstraction layers already built for Azure, and the working demo as a reference implementation. The cleaner our code and the more complete our specs, the cheaper and faster Deloitte's production build will be.

**What changes for the demo:**
- Legal/compliance review is Deloitte's problem for production — not a blocker for us
- Document content scraped from public uky.edu pages — not exhaustive, but real enough to answer real questions
- We build all 8 tools fully loaded with scraped content — infinite resources, full scope
- Real auth is not required — demo mode is acceptable
- Azure is the production target, but OpenAI direct is fine for the demo today
- The demo is self-guided: someone receives a link + a starter folder and discovers it themselves

**Embedding provider:** OpenAI `text-embedding-3-small` (1536 dimensions) via the `embedding-service.ts` abstraction layer already spec'd in the Azure migration plan. When Deloitte deploys to Azure, the swap to Azure OpenAI Service is a single env var change (`EMBEDDING_PROVIDER=azure`). The schema's `vector(1536)` is correct for this model.

**PDF parsing:** `pdf-parse` for the demo. Azure Document Intelligence (Form Recognizer) for production — handles scanned PDFs, tables, and handwriting far better. This matters for Financial Aid and FAFSA forms specifically.

**Vector store:** pgvector on Neon for the demo. Azure AI Search for production (hybrid BM25 + vector retrieval). Same abstraction layer, swap via `VECTOR_STORE=azure-ai-search` env var.

> See `Blueprints/azure-migration-plan.md` for the full component-by-component migration plan.

---

## Demo Day Strategy

### The Room
Everyone from IT leadership to the Provost. This is the highest-stakes demo possible — one room, one shot, maximum decision-making authority present. The demo must land for each of these personas simultaneously:

| Persona | What they care about | Their "aw" moment |
|---|---|---|
| Provost (DiPaola) | Student success, institutional reputation, strategic differentiation | Financial Aid bot answers a real student question accurately in seconds |
| Finance (Monday) | Cost reduction, ROI, staff efficiency | ITS deflection numbers, advisor hour savings |
| IT Leadership | Infrastructure, security, maintainability, Azure alignment | Azure abstraction layers, the admin panel, document management |
| Department heads | Their department's specific pain | Seeing their department's tool already working |
| Faculty | Their own courses, their own students | Act 1 — building a course assistant in 2 minutes |

The demo has to hit all of them. That means two distinct acts.

---

### Act 1 — The Personal "Aw" (2 minutes)

**Setup:** Before the demo, a starter folder is prepared and emailed/shared. It contains:
- A sample UK course syllabus (TEK-100 or similar)
- 2–3 course documents (readings list, assignment descriptions, grading rubric)
- A one-sentence instruction: *"Log in, create a new course, upload these files, and see what happens."*

**The experience:**
1. Someone in the room — ideally a faculty member or department head, not an IT person — gets the link
2. They log into The Sandbox as `heath.price@uky.edu` (educator demo user)
3. They create a new course, upload the starter folder files
4. Within 60 seconds, Sandy knows the syllabus, the assignments, the rubric
5. They ask Sandy: "When is the first assignment due?" — Sandy answers from the syllabus
6. They ask Sandy: "Write me a quiz on week 3 content" — Sandy does it

**Why this works:** The person doing it isn't a developer. They just uploaded files and got a working AI teaching assistant. No configuration. No prompt engineering. No IT ticket. That's the moment.

**The message this sends to the room:** *"Any faculty member at UK can do this tomorrow."*

---

### Act 2 — The Institutional Vision (5–8 minutes)

After the personal "aw," transition: *"Now let us show you what we've already built for your institution."*

Navigate to `/institutional` — the unified landing page. Walk through each tool in this order, tailored to who's watching:

**Opening (30 seconds):** Show the landing page grid — 8 department assistants, all live, all pre-loaded with UK content. Let the grid land visually before saying anything.

**Tool 1: Financial Aid** (90 seconds — leads because it's emotionally resonant for a Provost)
- Ask: *"What documents do I need for FAFSA verification?"*
- Ask: *"How do I appeal a financial aid suspension?"*
- Watch it cite the actual UK Financial Aid documentation
- Message: *"Every student who finds this instead of waiting in line is a student who doesn't drop out over paperwork."*

**Tool 2: ITS Help Desk** (60 seconds — for IT leadership)
- Ask: *"How do I set up the VPN on my Mac?"*
- Watch it give OS-specific steps, citing TechHelpCenter
- Show the admin panel: session count, deflection rate dashboard
- Message: *"Every tier-1 ticket this handles is a ticket your help desk doesn't."*

**Tool 3: ISSS** (45 seconds — for international programs)
- Click the CPT/OPT decision tree wizard
- Walk through 3 steps, arrive at a clear result
- Message: *"2,000 international students. One of the most stressful questions in their lives — answered correctly, instantly, at 2am."*

**Quick tour** (remaining tools, 15 seconds each):
- Registrar: "Get my transcript" → instant routing to correct portal
- Graduate School: "What's my deadline after I defend?" → cites the 60-day rule with source
- HR Benefits: "How does the employee tuition waiver work?" → accurate, versioned answer
- IRB: Run the determination wizard — show how a grad student learns if they need review
- Research Grants: "Does my NIH grant need ClinicalTrials.gov registration?" → accurate answer with agency-specific mode

**Close:**
> "Every one of these tools is backed by real UK documentation. Every answer cites its source. Every tool has an escalation path to a human advisor. This isn't replacing your staff — it's making them available for the work that actually needs a human."

---

### Act 1 Delivery: One-Click Starter Course, Not a Zip File

The original concept was a downloadable zip. Scrapping that. Here's why: a zip requires a download, an unzip, and an upload. That's three opportunities for friction before the "aw" moment. If the demo WiFi is slow or the person is on a phone, it breaks.

**Better approach: One-click "Load Starter Course" per college, built into The Sandbox onboarding.**

```
New Course flow → Step: "Start from a template"
  → "Choose your college:" [dropdown of all 16 UK colleges]
  → Click "Load Starter"
  → Course is pre-populated with a syllabus, 2 readings, and a rubric
  → Sandy is instantly ready
  → Total time: 15 seconds, zero uploads
```

The starter content lives in the DB, seeded at deploy time. The person in the room picks their college, clicks once, and has a working AI course assistant before they've finished reading the screen.

**The one-sentence instruction becomes:** *"Pick your college and hit Load."*

That's it. That's the entire onboarding for Act 1.

---

### Per-College Starter Content

One starter course per UK college. Each contains: a realistic course title + number, a 1-page syllabus with assignments and due dates, one reading list, one grading rubric. Content must be calibrated so Sandy can answer at least 10 meaningful questions without hitting "I don't know."

| College | Demo Course | Course # | Sample Sandy Questions |
|---|---|---|---|
| Arts & Sciences | Introduction to Psychology | PSY 100 | "When is the first paper due?" / "What's the late policy?" / "Summarize the week 3 reading topics" |
| Gatton Business & Economics | Financial Accounting | ACC 201 | "How many exams are there?" / "What percentage is participation?" / "Explain the group project requirements" |
| Pigman Engineering | Introduction to Engineering | EGR 101 | "What software do I need for this course?" / "What are the lab safety requirements?" / "When is the design project due?" |
| Education | Human Development in Educational Contexts | EDC 280 | "What are the field observation requirements?" / "How is the lesson plan graded?" / "What's the attendance policy?" |
| Nursing | Foundations of Professional Nursing | NUR 201 — | "What clinical hours are required?" / "What's the minimum grade to pass?" / "When are skills checkoffs?" |
| Rosenberg College of Law | Civil Procedure | LAW 501 | "What's the Socratic method policy?" / "How are final exams structured?" / "What citation format is required?" |
| Agriculture, Food & Environment | Introduction to Animal Sciences | ANS 101 | "Are there farm visits in this course?" / "What's the lab schedule?" / "How is the species presentation graded?" |
| Communication & Information | Introduction to Communication | COM 101 | "What's the speech requirements?" / "How is peer evaluation scored?" / "When is the final presentation?" |
| Health Sciences | Introduction to Athletic Training | AT 200 | "What certifications are required?" / "Describe the clinical rotation component" / "What's the CPR requirement?" |
| Public Health | Introduction to Public Health | PHE 201 | "What community project is required?" / "How is the policy memo graded?" / "What epidemiology tools do we use?" |
| Social Work | Introduction to Social Work | SW 200 | "What are the field placement requirements?" / "How is the case study paper evaluated?" / "What's the NASW Code of Ethics assignment?" |
| College of Design | Foundations of Architecture | ARC 151 | "What materials are needed for studio?" / "How are portfolio reviews graded?" / "What's the studio attendance policy?" |
| College of Fine Arts | Drawing I | ART 101 | "What supplies do I need?" / "How is the final portfolio evaluated?" / "What's the critique schedule?" |
| College of Medicine | Gross Anatomy | COM 601 | "What's the lab practical format?" / "How many required dissections are there?" / "What's the remediation policy?" |
| College of Pharmacy | Pharmaceutical Sciences I | PHR 601 | "What's the minimum passing score?" / "How many attempts are allowed on OSCEs?" / "What lab coat requirements exist?" |
| Graduate School | Research Methods in Education | EDP 601 | "What's the IRB requirement for the thesis project?" / "How is the literature review evaluated?" / "What citation style is required?" |
| Lewis Honors College | Honors Seminar: Humanities | HON 251 | "What's the thesis requirement?" / "How many honors credits do I need to graduate?" / "What's the contract learning policy?" |

**Content authoring note:** Each starter course's syllabus must include: course description, weekly schedule (8 weeks minimum), assignment list with point values, grading scale, late policy, and office hours. These are the fields Sandy gets asked about most. Thin syllabi produce weak demos.

---

---

## Bulletproof Demo Engineering

The Provost is clicking. No one is narrating. It has to work perfectly on the first try, in a conference room, possibly on a phone, possibly on slow WiFi. This section defines the specific engineering requirements that make that possible. These are not nice-to-haves.

---

### Rule 1: Streaming on Every Response, No Exceptions

Nothing kills a live demo like a white screen for 3 seconds while the API responds. Every Claude response — Sandy, institutional tools, all of it — must stream token by token. The user sees text appearing immediately. The perception of speed is as important as actual speed.

- Use `ReadableStream` with `StreamingTextResponse` on all chat routes
- First token must appear within 800ms — if retrieval is slow, stream a "Looking through the documents…" prefix while RAG runs in parallel
- Never await the full response before beginning to stream

---

### Rule 2: Suggested Questions Are Pre-Validated, Not Aspirational

Every question chip shown in the UI must be a question we have personally tested and confirmed produces a good answer from the loaded knowledge base. Not "probably works." Tested. If a chip produces a weak, vague, or "I don't have information about that" response — it gets pulled before demo day.

**Pre-validation process:**
```
For each institutional tool:
  1. Ask all 6 suggested question chips
  2. Grade each response: Pass (accurate, cited, specific) / Fail (vague, wrong, not found)
  3. Any Fail → replace the chip with a tested question
  4. Run this again 24 hours before the demo in case content changed

For each starter course (Act 1):
  1. Load the course
  2. Ask all sample Sandy questions from the per-college table above
  3. Same Pass/Fail grading
  4. Thin out any syllabus content that's producing weak answers
```

---

### Rule 3: The "I Don't Know" Case Must Look Intentional

When the bot can't answer, it cannot look broken. A raw "I don't have information about that in my knowledge base" with nothing else is a dead end. It must look like a designed feature.

**Required format for all "not found" responses:**

```
"I don't have that specific detail in the documents I have access to.

Here's what might help:
→ [Department Name]: [phone] | [email] | [walk-in hours]
→ Or ask me something else — here are questions I can answer:"
[Re-render the 3 most relevant question chips]
```

The chips re-rendering after a "not found" turns a failure into a navigation moment. The user is never stuck.

---

### Rule 4: Zero Raw Error States

The Provost must never see:
- A stack trace
- A "500 Internal Server Error"
- A blank white screen
- A spinning loader with no progress indication
- An empty chat with no guidance

**Implementation:**
```typescript
// Wrap every API route in a top-level try/catch that returns a graceful message:
catch (error) {
  return new Response(
    JSON.stringify({
      role: 'assistant',
      content: "I'm having trouble connecting right now. Please try again in a moment, or contact [dept contact] directly."
    }),
    { status: 200 } // intentionally 200 — client renders it as a chat message, not an error
  )
}
```

For the demo specifically, add a `DEMO_MODE=true` env var. In demo mode:
- Errors return graceful messages instead of error codes
- Any response taking > 5 seconds shows a "Still thinking…" indicator (not a spinner — actual text)
- The user switcher is prominently visible and labeled (not hidden in a menu)

---

### Rule 5: The User Switcher Is the Remote Control

The Provost may want to see the student view, then the faculty view, then the admin view. The demo user switcher is the most important navigation element on the page. It must be:

- Visible on every page — not buried in a menu
- Labeled with names and roles, not just emails: **"Dr. DiPaola (Provost)"**, not "bob.dipaola@uky.edu"
- One click to switch — no confirmation dialog, no reload
- The active user's name shows in the header at all times

Add a `DemoUserBar` component pinned to the top of every page in demo mode:
```
[The Sandbox]  Viewing as: [Dr. DiPaola — Provost ▼]  [Switch User]
```

The dropdown shows all 6 demo users with their role and a one-line description of their perspective:
- Alex Admin (Platform Admin) — sees everything
- Dr. DiPaola (Provost) — sees the full institutional picture
- Eric Monday (Finance) — sees cost and ROI dashboards
- Dr. Heath Price (Faculty) — builds courses, sees educator tools
- Ian McClure (1L Student) — law student, sees student experience
- Tiana The (Student) — undergrad, Arts & Sciences

---

### Rule 6: Mobile Must Work Without Degradation

Someone in that room will pull out their phone. Not as the primary demo device — but they'll want to try it themselves. The experience on iPhone Safari must be identical to desktop, not a broken subset.

**Non-negotiable mobile requirements:**
- Input field stays above keyboard (`env(safe-area-inset-bottom)` padding)
- Suggested question chips scroll horizontally, never wrap to two lines
- Streaming text renders without layout thrash
- The `DemoUserBar` collapses to an avatar icon + name on mobile (not full bar)
- The one-click starter course picker works with a tap — no hover states required
- All tap targets ≥ 44px (Apple HIG minimum)
- Test on iPhone Safari specifically — it has the strictest viewport/scroll behavior

---

### Rule 7: Pre-Warm Before the Demo

On demo day, the first person to use the platform should not be the Provost. Pre-warm every tool 30 minutes before the meeting.

**Pre-warm script** (run manually before demo):
```bash
# Hit every institutional tool with 2 questions each
# Hit the Financial Aid tool with the 6 chip questions
# Load each starter course and ask 2 Sandy questions
# This warms the connection pool, CDN cache, and any cold-start latency
```

Document this as a pre-demo checklist item. The person running the demo runs the pre-warm, not the Provost.

---

### Rule 8: Network Resilience

Conference room WiFi is unreliable. Plan for it.

- **Vercel Edge Network:** Deploy to Vercel Edge for minimum latency regardless of network conditions
- **Response caching:** Cache the most likely demo question responses client-side (sessionStorage). If the same question is asked twice, serve from cache instantly — especially useful if the demo is being run multiple times in the same session.
- **Timeout handling:** If a Claude API call exceeds 8 seconds, show: *"Taking a bit longer than usual — still working…"* At 15 seconds, gracefully surface the escalation card.
- **Offline indicator:** If `navigator.onLine` is false, show a banner: *"Connection interrupted — some features may be limited"* rather than letting API calls silently fail.

---

### Demo Environment Checklist

Run this 24 hours before, then again 30 minutes before the meeting. Both runs must be clean.

**Content & Knowledge Base**
- [ ] All 8 institutional tools: embeddings complete, `embeddedAt` populated on all documents
- [ ] All 6 question chips per tool tested and passing (accurate, cited, specific response)
- [ ] Any failing chips replaced with tested alternatives
- [ ] All 17 starter courses seeded in the DB and tested (pick college → load → ask 3 Sandy questions)
- [ ] Thin syllabi padded out — Sandy can answer at least 10 meaningful questions per course

**Core UX**
- [ ] `/institutional` landing page: all 8 tool cards render, search/routing works
- [ ] One-click course load: pick any college → course loads in < 3 seconds → Sandy responds
- [ ] Sandy routing: ask Sandy a financial aid question → routes to Financial Aid tool with question pre-filled
- [ ] ISSS CPT/OPT wizard: runs all branches cleanly, back button works, skip works
- [ ] IRB determination wizard: all result paths complete cleanly
- [ ] EscalationCard: appears on wizard results and "not found" responses
- [ ] CrossToolSuggestion: out-of-scope question in one tool routes to correct tool with question pre-filled

**Bulletproof Requirements**
- [ ] `DEMO_MODE=true` set in environment — graceful error messages, no stack traces
- [ ] Streaming: first token appears within 800ms on all chat routes
- [ ] "Not found" format: shows contact info + re-renders relevant chips (never a dead end)
- [ ] Zero blank screens: every page has a loading skeleton before content appears
- [ ] DemoUserBar visible on every page, all 6 users labeled with name + role
- [ ] User switch: one click, no reload, no confirmation

**Mobile**
- [ ] Full demo tested on iPhone Safari (not Chrome — Safari is stricter)
- [ ] Input stays above keyboard during chat
- [ ] Question chips scroll horizontally on mobile (no wrapping)
- [ ] DemoUserBar collapses correctly on mobile
- [ ] All tap targets pass 44px minimum

**Network**
- [ ] Pre-warm script run: all tools hit with 2 questions each, all respond within 3s
- [ ] Timeout handling: 8s shows "still working", 15s shows escalation card
- [ ] Offline banner tested: disconnect network → banner appears within 2s

**Final Sanity**
- [ ] Full Act 1 run-through: pick a college → load course → ask 5 Sandy questions → all pass
- [ ] Full Act 2 run-through: hit Financial Aid, ITS, ISSS wizard, Registrar routing — all pass
- [ ] Switch user to Ian McClure → see student view → switch to Heath Price → see faculty view
- [ ] Open on a phone simultaneously while on desktop — both work without interference

---

### Web Scraping Strategy (Demo Document Ingestion)

All 8 tools are loaded from public uky.edu pages. For the demo, depth beats breadth — 10 high-quality, well-formatted documents per tool that cover the most common questions beats 100 partially-parsed PDFs.

**Per-tool scrape targets (demo minimum):**

| Tool | Priority Pages to Scrape | Est. Documents |
|---|---|---|
| Financial Aid | FAQ, verification requirements, forms list, SAP policy, appeals | 6–8 |
| ISSS | F-1 maintenance, CPT guide, OPT guide, travel checklist, iCAT FAQ | 7–9 |
| IRB | FAQ, review type guide, SOPs (top sections), determination policy | 6–8 |
| ITS | Top 20 TechHelpCenter articles by estimated traffic | 20 |
| Registrar | Transcript guide, enrollment verification, tuition appeal, forms | 5–6 |
| Grad School | Thesis prep guide, degree forms, Bulletin (key sections), deadlines | 6–8 |
| HR Benefits | Benefits overview, retirement guide, tuition waiver, open enrollment | 6–7 |
| Research Grants | Proposal guide, NIH budget guide, COI procedures, F&A rates | 5–7 |

**Scraping rules:**
- Respect `robots.txt` — all target pages are public-facing, this is standard web crawling
- HTML pages: extract main content only (strip nav, footer, sidebar)
- PDFs: `pdf-parse` for text extraction; flag < 200 words extracted as "low quality — review manually"
- Store `sourceUrl` on every document — citations link back to the real UK page
- Re-scrape is manual for demo; Deloitte builds the automated refresh pipeline for production

---



Before the spec, here's the honest engineering opinion on all 13 proposed use cases. Building the wrong thing is worse than building nothing — it creates maintenance debt, erodes trust, and wastes the RAG infrastructure.

### ✅ Build These (8 tools)

| Tool | Why |
|---|---|
| Financial Aid Assistant | Highest student-facing volume, well-defined documents, clear decision paths |
| ISSS Immigration Navigator | High stakes, structured decision trees, 2,000+ users with no good self-service today |
| IRB Research Integrity | "Do I need IRB review?" is perfectly suited for AI decision trees |
| ITS Help Desk Bot | Largest ticket volume, most repetitive questions, knowledge base already exists |
| Registrar Assistant | Serves 100% of students + all alumni, repetitive routing questions |
| Graduate School Guide | Thesis deadlines and formatting are well-documented, high confusion, graduation-critical |
| HR Benefits Navigator | Policy documents are stable, enrollment period spikes are predictable |
| Research Grants (OSPA) | Federal compliance changes fast, faculty PIs need instant answers |

### ❌ Do Not Build (5 tools) — Here's Why

**UK HealthCare Patient Navigation & MyChart** — Hard no for v1. HIPAA exposure, medical advice liability, and the "what symptoms do I have?" drift are serious legal risks requiring a compliance review before a line of code is written. An AI that misroutes someone with a cardiac event is a lawsuit. When UK's legal team blesses a health navigation AI, revisit.

**Law School Admissions Chatbot** — ~100 1L admits per year. Volume does not justify a dedicated RAG tool. The admissions process is relationship-driven. A FAQ page does the same job.

**Student Success / Academic Advising** — "Who is my advisor?" is a *directory problem*, not a chatbot problem. Advisor assignments change every semester. Any RAG tool over this data goes stale in 4 months. The right solution is a SIS data connector, not a chatbot. Build that later.

**Graduate Admissions Policy** — Entirely overlaps with the Graduate School Guide. Merged in.

---

## Part 1: Ease of Use — Engineering Decisions

These are the specific UX and architectural choices that determine whether these tools get used or die with low adoption. Each one was a deliberate decision.

### 1.1 Unified Landing Page, Not 8 Siloed URLs

**Problem:** If each tool is only reachable at `/institutional/financial-aid`, users must already know which department handles their problem. They don't. A student dealing with an aid suspension might not know whether to visit Financial Aid, the Registrar, or Student Success.

**Solution:** Build `/institutional` as a smart intake page first.

```
Route: /institutional
Layout:
  - Hero: "What do you need help with at UK?"
  - Search bar: freetext → semantic routing to the right tool
  - Tool grid: 8 cards with name, icon, 1-sentence description
  - "Not sure?" → intake wizard (3 questions, routes to tool)
```

The intake search bar uses a lightweight Claude call (Haiku, not Sonnet) with a classification prompt:
```typescript
// Route user query to the right department
const DEPARTMENT_ROUTING_PROMPT = `
You are a routing assistant for University of Kentucky services.
Given a user's question, return ONLY the department slug that best handles it.
Valid slugs: financial-aid, isss, irb, its, registrar, graduate-school, hr-benefits, research-grants
If unclear, return "unknown".

User question: "${query}"
`
```

Cost: ~$0.0001 per routing call. Worth it to prevent users from landing on the wrong tool.

### 1.2 Suggested Questions Chips — Universal Pattern

**Problem:** Every tool launches with a blank chat input. The blank cursor is a conversion killer. Users who don't know the "right" way to ask a question will close the tab.

**Solution:** Every tool shows 5–6 clickable question chips above the input, always visible. These are the most common questions, hardcoded per department — not AI-generated, not dynamic. They must be fast.

```typescript
// Component: SuggestedQuestionChips.tsx
// Props: questions: string[], onSelect: (q: string) => void
// Renders as pill buttons. Clicking one fires it as a chat message.
// Disappears after first message (the user is now in conversation mode).
```

Example chips per tool:
- **Financial Aid:** "What's my verification deadline?" / "How do I appeal?" / "What is SAP?" / "I got an outside scholarship" / "Adjust my loan amount"
- **ITS:** "Reset my linkblue password" / "Set up VPN" / "MFA/Duo not working" / "Connect to eduroam" / "Is Office free?"
- **Registrar:** "Get my transcript" / "I'm an alumni" / "Enrollment verification" / "Tuition appeal" / "Name change"

This eliminates the blank-cursor problem and teaches users what the bot can do in a single glance.

### 1.3 Progressive Disclosure for Disclaimers (Not a Wall)

**Problem:** The original spec called for non-dismissible full disclaimers on every page load. This trains users to ignore them (banner blindness) and creates friction before a single question is asked.

**Solution:** Progressive disclosure — prominent once, persistent but small thereafter.

```
Entry state (before first message):
  - Full disclaimer visible above chat input, styled as an info card
  - Not a modal, not a blocker — part of the page layout
  - User starts typing → disclaimer slides up into a persistent mini-badge pinned to the top of the chat

Active chat state:
  - Persistent mini-badge: "⚠ General guidance only — verify with [dept]"
  - Always visible, never blocks content
  - Clicking it expands back to full disclaimer
```

The ISSS tool is the exception: every response from Claude that mentions CPT, OPT, visa status, or I-20 must append a single sentence: *"Verify this with an ISSS advisor before acting."* This is injected by the prompt, not the UI.

### 1.4 Decision Tree UX — Designed, Not Just Logic

The CPT/OPT wizard (ISSS) and IRB determination wizard need to feel polished, not like a flowchart printed to HTML. Spec:

```
Component: DecisionTreeWizard.tsx
Props:
  tree: WizardNode[]       // branching logic
  onComplete: (result) =>  // fires with result + branches taken
  onSkip: () =>            // user can always skip to freeform chat

WizardNode {
  id: string
  question: string
  context?: string         // optional explanatory sentence under the question
  options: {
    label: string
    next: string | 'result'
    result?: WizardResult
  }[]
}

WizardResult {
  headline: string         // "You are likely CPT-eligible"
  body: string             // explanation of what that means
  cta: string              // "Ask the assistant about next steps"
  escalate?: boolean       // true = always show EscalationCard alongside result
}

UI requirements:
  - Progress bar (step X of Y)
  - Back button on every step (users change their answers)
  - "Skip this — I'll just ask" link always visible
  - Result shown as a card, not an alert box
  - EscalationCard always shown below any wizard result
```

The tree is authored as JSON in a config file — not hardcoded in the component. ISSS or IRB staff could theoretically update it without a deploy (future: move to DB).

### 1.5 Session Continuity — Resume Your Last Conversation

**Problem:** A student asks three questions about FAFSA verification on Monday, closes the tab, and comes back Thursday with a follow-up. Right now they start from scratch, re-explain context, and potentially get inconsistent answers.

**Solution:** Sessions persist and are resumable. This is a 3-hour build with outsized UX impact.

```
UI: Left sidebar (collapsible on mobile)
  - "Recent conversations" list — last 5 sessions per department
  - Each item shows: department name, first user message (truncated), date
  - Clicking resumes the full conversation with history re-injected into context

Data: InstitutionalChatSession already stores messages as Json
  - Add: title String? (first user message, auto-populated)
  - Add: lastMessageAt DateTime (for sorting)

Session injection: When resuming, inject last 6 messages into context window
  (not all — context window has limits, and stale context can confuse Claude)
```

### 1.6 Inline Response Feedback — Thumbs Up / Down

**Problem:** Without per-response feedback, the only signal for document gaps is quarterly session log reviews. That's too slow — a bad answer to a visa question could mislead 50 students before anyone notices.

**Solution:** 👍 / 👎 on every AI response. One click, no modal.

```typescript
// Add to InstitutionalChatSession.messages JSON schema:
// { role, content, id, feedback?: 'positive' | 'negative', feedbackAt?: string }

// API: POST /api/institutional/[department]/feedback
// Body: { sessionId, messageId, feedback }
// Requires: x-demo-user-email header
```

Admin dashboard shows: "15 negative feedback events in the last 7 days for the ISSS tool." Clicking through shows the exact questions + responses that got thumbs-down. This is the fastest path to finding document gaps.

**Negative feedback threshold alert:** If any document's retrieved chunks appear in 3+ negative-feedback responses in 7 days, send an alert email to the department admin. Catches bad documents before they do real damage.

### 1.7 Cross-Tool Routing — Don't Dead-End Users

**Problem:** A Financial Aid bot that says "I don't know about enrollment verification — contact the Registrar" is only half-useful. The user still has to find the Registrar tool themselves.

**Solution:** When Claude indicates a question is out of scope, the UI renders a `CrossToolSuggestion` card instead of just text.

```typescript
// In chat-engine.ts, parse Claude's response for out-of-scope signals:
// Keywords: "registrar", "ISSS", "financial aid", "ITS", "HR", "graduate school", "research"
// When detected: append a structured suggestion to the response stream

// Component: CrossToolSuggestion.tsx
// Renders: "That's handled by [Department Name] → [Open that assistant]"
// Button navigates to /institutional/[dept-slug] with the original question
//   pre-populated in the input (pass as query param: ?q=...)
```

The cross-population of the question means the user doesn't have to retype — they just land on the right tool with their question already there.

### 1.8 Frustration Detection — Don't Let Users Give Up Silently

**Problem:** Users who get bad answers often don't escalate — they just leave. That's a missed intervention and a missed signal.

**Solution:** Keyword-based frustration detection on every user message, client-side.

```typescript
const FRUSTRATION_SIGNALS = [
  "not helpful", "useless", "doesn't work", "that's wrong", "give up",
  "frustrated", "confused", "makes no sense", "still don't understand",
  "just want to talk to someone", "need a human", "this is terrible"
]

// In InstitutionalChatShell.tsx:
// Before sending message to API, check for frustration signals
// If detected: show EscalationCard immediately, THEN still send the message
// The escalation card appears above Claude's response
// Don't block the API call — the user may get a good answer despite frustration
```

### 1.9 Mobile-First Layout

Not mentioned in the original spec but non-negotiable. UK students use phones. The chat shell must be built mobile-first:

```
Mobile layout (< 768px):
  - Full viewport height: 100dvh (dvh not vh — accounts for iOS Safari chrome)
  - Input pinned to bottom with padding above keyboard (env(safe-area-inset-bottom))
  - No sidebar — session history accessible via a drawer triggered by a header icon
  - Suggested question chips scroll horizontally (not wrap)
  - EscalationCard: full-width card with tap targets ≥ 44px
  - Source footer: collapsed by default, expand on tap

Desktop layout (≥ 768px):
  - Two-column: session history sidebar (240px) + chat (flex-1)
  - Suggested questions wrap
  - EscalationCard: inline below response
```

---

## Part 2: Impact — Engineering Decisions

These are the architectural decisions that determine whether these tools just exist or actually change outcomes for students and faculty.

### 2.1 Financial Aid Moves to Phase 1

The original phases put Financial Aid in Phase 2. That is wrong. Financial Aid is the highest-impact tool by student count, by consequence of failure (missed deadlines = lost aid), and by volume. Registrar should still be the first tool built (lowest risk, validates infrastructure), but Financial Aid follows immediately — not after Graduate School.

Revised Phase 1: Shared infra → Registrar → Financial Aid.

### 2.2 Proactive Notifications — From Reactive to Proactive

The highest-impact intervention isn't answering a question — it's preventing the problem before the student knows to ask. Resend is already in the stack. Use it.

```typescript
// New cron routes (add to vercel.json alongside existing crons):

// Financial Aid: weekly email to students with pending verification items
// Route: /api/institutional/financial-aid/digest
// Trigger: Every Monday 8am ET
// Logic: [Future, when account-level data integration exists]
//   - Query students with verification deadlines within 14 days
//   - Email: "Your FAFSA verification deadline is [date].
//             Have questions? → [Open Financial Aid Assistant]"

// HR Benefits: open enrollment reminder series
// Route: /api/institutional/hr-benefits/digest
// Trigger: Daily during open enrollment window (Oct 15 – Nov 15)
// Logic: Email all employees who have NOT completed enrollment
//         "Open enrollment closes in X days. Questions? → [Open HR Benefits Navigator]"

// Graduate School: post-defense deadline tracker
// Route: /api/institutional/graduate-school/digest
// Trigger: Weekly
// Logic: Email students who defended within last 45 days with no submission on record
//         "Your 60-day thesis submission window closes [date]."
```

> **Note:** Full proactive alerts require account-level data integration (SIS, HR system) which is Phase 5+ work. Build the cron infrastructure and email templates now. They activate when the data integrations exist.

### 2.3 Sandy Integration — Surface Tools Contextually

Sandy (the existing concierge at `ConciergePanel.tsx` → `/api/concierge`) currently answers general questions. Sandy should route to institutional tools when the question matches.

```typescript
// In /api/concierge/route.ts — add institutional routing detection:
const INSTITUTIONAL_ROUTING = {
  "financial-aid": ["fafsa", "financial aid", "verification", "loan", "scholarship", "SAP", "aid appeal"],
  "isss": ["visa", "F-1", "J-1", "OPT", "CPT", "I-20", "international student", "work authorization"],
  "irb": ["IRB", "human subjects", "research review", "exempt", "expedited"],
  "its": ["VPN", "linkblue", "duo", "password", "wifi", "eduroam", "microsoft office"],
  "registrar": ["transcript", "enrollment verification", "diploma", "tuition appeal", "FERPA"],
  "graduate-school": ["thesis", "dissertation", "defense", "degree form", "graduate school"],
  "hr-benefits": ["tuition waiver", "benefits", "retirement", "open enrollment", "health insurance"],
  "research-grants": ["grant", "NIH", "NSF", "sponsored project", "F&A rate", "conflict of interest"]
}

// When Sandy detects a routing match, respond with:
// "That's a great question for the [Department] assistant, which has the full
//  policy documents loaded. → [Open [Department] Assistant]"
// Link navigates to /institutional/[slug]?q=[user's original question]
// The ?q= param pre-fills the question in the tool, so user doesn't retype.
```

Sandy becomes a soft entry point into all 8 tools. Every Sandy user is a potential institutional tool user.

### 2.4 Delegated Admin — Prevent Document Staleness

**Problem:** If every document update requires a Sandbox admin, documents will go stale. The Financial Aid office changes their verification requirements twice a year. They cannot wait for an admin to update the tool.

**Solution:** Department-scoped admin delegation.

```prisma
// Add to InstitutionalDepartment:
model InstitutionalDepartment {
  // ... existing fields
  adminEmails  String[]   // department staff who can manage their docs
  // A Financial Aid staff member's email goes here — they get access only to
  // their department's document management panel, not other departments or platform settings
}
```

```
Admin panel: /admin/institutional/[department-slug]
Access: any email in adminEmails[] for that department, OR platform ADMIN role
Features:
  - Upload/replace/deprecate documents for this department only
  - View feedback events (anonymized) for their department
  - "Freshness report" — which docs haven't been updated in 6+ months
  - Cannot access other departments' panels
```

This is the difference between tools that stay accurate and tools that become liabilities in 18 months.

### 2.5 ITS Partnership — Ingest from Ticket Data, Not Just Knowledge Articles

**Problem:** Scraping TechHelpCenter gives broad coverage but doesn't guarantee the highest-volume questions are covered.

**Solution:** Partner with ITS to get their **top 50 ticket categories by volume**. Prioritize ingesting articles that cover those 50 categories before touching anything else. This guarantees the bot handles 80%+ of volume before launch.

In the admin panel, tag documents with `coverageCategory`:
```typescript
// When ingesting ITS docs, tag each article with the ticket category it covers:
// "MFA/Duo", "VPN", "Password Reset", "Wi-Fi", etc.
// Admin panel shows coverage map: "Top 50 categories → 43 covered, 7 gaps"
```

The gaps become a doc request list — hand it to ITS and ask them to write articles or point to existing content.

### 2.6 Response Quality Measurement Beyond Deflection

The original metrics tracked deflection rate as the primary success signal. Deflection is necessary but insufficient — a bot that confidently gives wrong answers will have a great deflection rate until the phone starts ringing.

Revised metric hierarchy:

| Tier | Metric | How Measured |
|---|---|---|
| 1 — Trust | Positive feedback rate | 👍 / (👍 + 👎) per tool |
| 1 — Trust | "Not found" rate | % responses where Claude says it can't answer |
| 2 — Volume | Sessions / month | DB query |
| 2 — Volume | Unique users / month | Distinct emails |
| 3 — Efficiency | Deflection rate | Sessions without escalation |
| 3 — Efficiency | Avg messages to resolution | Session message count |
| 4 — Health | Doc freshness score | % docs updated within 180 days |
| 4 — Health | Negative feedback alerts fired | Alert log |

Tier 1 metrics are the gates. If positive feedback rate is below 75% for any tool, that tool is under review before further promotion. Don't market a tool that isn't trusted.

### 2.7 "Not Found" Answers Are Signal, Not Failure

When Claude says it cannot find an answer in the knowledge base, that is valuable data. Track every "not found" response with the user's question attached:

```typescript
// In chat-engine.ts:
// When Claude's response contains "I don't have information about" or
// "isn't covered in the documents I have access to" or similar —
// Log to InstitutionalGap model:

model InstitutionalGap {
  id           String   @id @default(cuid())
  departmentId String
  question     String   // the user's question that wasn't answered
  sessionId    String
  createdAt    DateTime @default(now())
  resolved     Boolean  @default(false)  // set to true when a covering doc is ingested
}
```

Admin dashboard: **"Unanswered Questions"** tab — sorted by frequency (same question asked multiple times = top of the list). This is a living document request queue. The most frequently unanswered question should become a new document within 2 weeks.

---

## Part 3: Shared Infrastructure

### Data Model

```prisma
model InstitutionalDepartment {
  id           String   @id @default(cuid())
  slug         String   @unique  // "financial-aid", "isss", "irb", etc.
  name         String
  description  String
  color        String           // hex — UK blue variants for theming
  adminEmails  String[]         // department staff with doc management access
  documents    InstitutionalDocument[]
  sessions     InstitutionalChatSession[]
  gaps         InstitutionalGap[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model InstitutionalDocument {
  id             String   @id @default(cuid())
  departmentId   String
  department     InstitutionalDepartment @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  title          String
  sourceUrl      String?          // original uky.edu URL if scraped
  fileType       String           // "pdf", "html", "markdown"
  rawText        String   @db.Text
  version        String           // "2025-01" — for staleness tracking
  coverageCategory String?        // for ITS ticket coverage mapping
  isActive       Boolean  @default(true)  // false = deprecated but preserved
  embeddedAt     DateTime?
  chunks         InstitutionalChunk[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([departmentId, isActive])
}

model InstitutionalChunk {
  id           String   @id @default(cuid())
  documentId   String
  document     InstitutionalDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex   Int
  content      String   @db.Text
  tokenCount   Int
  embedding    Unsupported("vector(1536)")
  createdAt    DateTime @default(now())

  @@index([documentId])
}

model InstitutionalChatSession {
  id             String   @id @default(cuid())
  departmentId   String
  department     InstitutionalDepartment @relation(fields: [departmentId], references: [id])
  userEmail      String
  title          String?          // first user message, auto-set
  messages       Json             // { id, role, content, feedback?, feedbackAt? }[]
  lastMessageAt  DateTime         @default(now())
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([departmentId, userEmail, lastMessageAt])
}

model InstitutionalGap {
  id           String   @id @default(cuid())
  departmentId String
  department   InstitutionalDepartment @relation(fields: [departmentId], references: [id])
  question     String
  sessionId    String
  resolved     Boolean  @default(false)
  createdAt    DateTime @default(now())

  @@index([departmentId, resolved])
}
```

### File Structure

```
app/
  institutional/
    page.tsx                         ← Unified landing: search + tool grid
    layout.tsx
    [department]/
      page.tsx                       ← Chat shell for this department
      layout.tsx
    _components/
      InstitutionalChatShell.tsx     ← Main chat UI (shared across all 8 tools)
      SuggestedQuestionChips.tsx     ← Pre-typed question chips
      DecisionTreeWizard.tsx         ← Branching wizard (ISSS, IRB, Registrar routing)
      DocumentSourceFooter.tsx       ← "Sources: [doc title]" per response
      DisclaimerBanner.tsx           ← Progressive disclosure disclaimer
      EscalationCard.tsx             ← "Need a human?" — phone/email/hours
      CrossToolSuggestion.tsx        ← Out-of-scope routing card
      InlineFeedback.tsx             ← 👍👎 per response
      SessionHistorySidebar.tsx      ← Recent conversations list
      DeptHeader.tsx                 ← Dept name, icon, contact strip
  api/
    institutional/
      route/route.ts                 ← GET: list all departments (for landing page)
      [department]/
        chat/route.ts                ← POST: streaming chat with RAG
        feedback/route.ts            ← POST: thumbs up/down
        ingest/route.ts              ← POST: admin upload + chunk + embed
        documents/route.ts           ← GET/DELETE: admin doc management
        gaps/route.ts                ← GET: admin unanswered questions log
  lib/
    institutional/
      rag-retrieval.ts               ← Semantic search over InstitutionalChunk
      chat-engine.ts                 ← Prompt builder, streaming, gap detection
      document-ingestor.ts           ← Reuses document-processor.ts from RAG blueprint
      routing-classifier.ts          ← Sandy integration + landing page routing
      dept-config.ts                 ← Static config: slugs, chips, wizard trees, disclaimers
  admin/
    institutional/
      page.tsx                       ← Platform admin: all departments
      [department]/
        page.tsx                     ← Dept admin: docs, feedback, gaps
```

### System Prompt Architecture

```typescript
const buildSystemPrompt = (
  dept: DeptConfig,
  chunks: RetrievedChunk[],
  sessionContext?: string
) => `
You are the official AI assistant for the University of Kentucky's ${dept.name}.
You help students, faculty, and staff get accurate answers about ${dept.description}.

${sessionContext ? `PRIOR CONVERSATION CONTEXT:\n${sessionContext}\n` : ''}

KNOWLEDGE BASE (retrieved documents — use only these to answer):
${chunks.map(c => `[${c.documentTitle}]\n${c.content}`).join('\n\n---\n\n')}

RULES:
1. Only answer from the knowledge base. Never invent policies, deadlines, or dollar amounts.
2. Cite the source document by name when stating a rule or deadline.
3. If the answer is not in the knowledge base, say exactly:
   "I don't have information about that in the documents I have access to."
   Then direct them to ${dept.contactInfo}.
4. ${dept.escalationRule}  ← injected per-dept (e.g., ISSS: "Never give immigration legal advice")
5. Be direct. Lead with the answer, then explain.
6. If the question belongs to a different UK department, say which one.
7. Plain language. Define jargon when you use it.
`
```

The `escalationRule` is the one field that varies meaningfully by department:
- ISSS: "Never give immigration legal advice. Always include: 'Verify this with an ISSS advisor before acting.'"
- IRB: "Never make a binding IRB determination. Always recommend ORI confirmation for ambiguous cases."
- Financial Aid: "Never quote specific dollar amounts or account balances. Direct account-specific questions to the Financial Aid office."
- OSPA: "When discussing specific federal agency requirements, note that policies change frequently and direct them to verify with OSPA."
- All others: "Direct complex or individual-specific cases to a human advisor."

---

## Part 4: Tool Specifications

### Tool 1: Financial Aid Assistant
**Route:** `/institutional/financial-aid`
**Audience:** All students
**Volume:** Highest — every enrolled student is a potential user

**Source Documents:**
- Financial aid FAQ and verification requirements guide
- All 8 downloadable forms (PDF-parsed, each tagged with form name as metadata)
- SAP (Satisfactory Academic Progress) policy
- Appeals process documentation
- FAFSA timeline and deadlines
- Education abroad financial aid guide
- Outside scholarship notification procedures

**Suggested Question Chips:**
"What's my verification deadline?" / "How do I appeal?" / "What is SAP?" / "I received an outside scholarship" / "Adjust my loan amount" / "FAFSA verification documents"

**Special Feature: Forms Quick-Access Panel**
Sidebar (desktop) or expandable drawer (mobile) showing the 8 most common forms with direct download links. This panel is always visible — the user doesn't have to ask for a form, they can see it immediately. Forms are tagged with the scenario they address ("Loan too high?" → Loan Adjustment Request form).

**PDF parsing note:** Many FAFSA forms are scanned PDFs (image-only). `pdf-parse` will return empty text. Flag these for manual text entry. Don't silently ingest a blank document — the admin panel must show a "parsing quality: low" warning.

**Complexity:** Medium

---

### Tool 2: ISSS Immigration Navigator
**Route:** `/institutional/isss`
**Audience:** International students (F-1, J-1) and scholars (H-1B, J-1)
**Volume:** ~2,000 active international community members

**Source Documents:**
- F-1 and J-1 status maintenance guides
- CPT authorization guide and eligibility requirements
- OPT guide (pre- and post-completion) + STEM OPT extension
- International travel checklist and I-20 signature requirements
- Reduced course load (RCL) authorization procedures
- H-1B employer hiring guide
- iCAT request system FAQ
- DS-2019 eligibility and request procedures

**Suggested Question Chips:**
"Am I eligible for CPT?" / "CPT vs OPT difference" / "I-20 travel signature" / "Reduced course load" / "STEM OPT extension" / "My OPT is pending, can I work?"

**Decision Tree: CPT/OPT Eligibility Wizard**

```
Step 1: "What are you trying to do?"
  [Get an internship or job] → CPT/OPT branch
  [Travel internationally]  → Travel signature branch
  [Take fewer classes]      → RCL branch
  [Something else]          → Skip to freeform chat

CPT Branch:
  Step 2: "Are you currently in a degree program at UK?" [Yes/No]
  Step 3: "Have you been enrolled full-time for at least one full academic year?" [Yes/No]
  Step 4: "Is this position directly related to your major?" [Yes/No]
  Step 5: "Is it part of your curriculum (required or for elective credit)?" [Yes/No]
  → Result: "Likely CPT-eligible" with next steps + ISSS contact + EscalationCard

OPT Branch:
  Step 2: "When do you want to start working — before or after graduation?" [Before/After]
  Step 3 (before): "Have you used 12+ months of full-time CPT?" [Yes/No]
    → Yes: "Full-time CPT likely used your OPT — verify with ISSS immediately"
    → No: "Pre-completion OPT may be available" + details + EscalationCard
  Step 3 (after): "Post-completion OPT" result with timeline + EscalationCard
```

**Non-Negotiable Disclaimer Behavior:**
- Shown prominently before first message
- Collapses to persistent badge after first interaction
- The Claude prompt injects the verification reminder on every response mentioning visa terms
- The EscalationCard appears on every wizard result and every response about status/work authorization

**Complexity:** High — Have an ISSS advisor review 20+ test conversations before launch.

---

### Tool 3: IRB Research Integrity Guide
**Route:** `/institutional/irb`
**Audience:** Graduate students, faculty, honors thesis undergrads
**Volume:** Every UK researcher touching human subjects

**Source Documents:**
- "When Do Activities Require IRB Review?" policy
- IRB determination flowchart
- Exempt / Expedited / Full Board review type guide
- Standard Operating Procedures (all sections)
- IRB FAQ
- Training requirements for study personnel
- E-IRB submission guide
- HIPAA research review guidance
- "IRB Survival Handbook"
- Continuing review and amendment procedures

**Suggested Question Chips:**
"Does my study need IRB review?" / "What review type do I need?" / "What training is required?" / "How to submit an amendment" / "Does a survey count?" / "Exempt vs Expedited difference"

**Decision Tree: IRB Determination Wizard**

```
Step 1: "Does your research involve living human beings?" [Yes/No/Not Sure]
Step 2: "Are you obtaining data, samples, or information from or about them?" [Yes/No]
Step 3: "Will any information be identifiable (name, ID, email, etc.)?" [Yes/No]
Step 4: "Is this solely for a class assignment with no intent to publish or present?" [Yes/No]
Step 5: "Does it involve any of these sensitive areas?" [checkboxes: minors, prisoners,
         pregnant women, cognitive impairment, deception, clinical intervention]

Results:
  - "IRB review is likely NOT required" → always followed by "Confirm with ORI"
  - "IRB review is likely required — here's the review type that probably applies"
  - "This is complex — contact ORI before proceeding" (any sensitive area checked)

Every result ends with: EscalationCard + ORI contact info
```

**Complexity:** Medium — the wizard carries most of the weight; RAG handles follow-up questions.

---

### Tool 4: ITS Help Desk Bot
**Route:** `/institutional/its`
**Audience:** All students, faculty, staff
**Volume:** Largest absolute volume

**Source Documents:**
- TechHelpCenter knowledge base (scraped — all articles)
- VPN setup guides (Mac, Windows, iOS, Android — separate articles)
- MFA/Duo setup and troubleshooting
- linkblue password reset procedures
- Microsoft 365 licensing guide
- Wi-Fi guide (eduroam, UKY-WiFi)
- Printing on campus
- Remote desktop / virtual lab access
- Software licensing catalog
- Phishing awareness guide

**Ingestion Strategy:** Before scraping everything, get ITS's top 50 ticket categories. Build a coverage map in the admin panel. Ingest top-50-covering articles first. Launch when top 50 are covered, not when every article is scraped.

**Suggested Question Chips:**
"Reset linkblue password" / "VPN setup" / "MFA/Duo not working" / "Connect to eduroam" / "Is Office 365 free?" / "Phishing email"

**Special Feature: OS Detection**

```typescript
// In chat-engine.ts, before sending to Claude:
const detectOS = (message: string): 'mac' | 'windows' | 'ios' | 'android' | 'unknown' => {
  if (/mac|macbook|macos|apple/i.test(message)) return 'mac'
  if (/windows|pc|surface/i.test(message)) return 'windows'
  if (/iphone|ipad|ios/i.test(message)) return 'ios'
  if (/android/i.test(message)) return 'android'
  return 'unknown'
}

// If unknown AND question is procedural (VPN, MFA, printing):
// Claude is instructed to ask "What device/OS are you using?" before answering
// This is in the system prompt, not hardcoded UI — keeps it conversational
```

**Cron: Quarterly Re-Ingest**
IT procedures change with software updates. Add to vercel.json:
```json
{ "path": "/api/institutional/its/reingest-check", "schedule": "0 9 1 1,4,7,10 *" }
```
Runs quarterly, checks `updatedAt` on source URLs (HEAD request), flags articles that have changed for re-ingestion.

**Complexity:** Low-Medium

---

### Tool 5: Registrar Assistant
**Route:** `/institutional/registrar`
**Audience:** All students + alumni
**Volume:** High — every student and graduate eventually needs registrar services

**Source Documents:**
- Transcript request guide (current vs. alumni pathways)
- Enrollment verification procedures
- Tuition appeal process + forms
- Diploma replacement guide
- Name change procedures
- FERPA / records release authorization
- Degree audit and graduation application
- Withdrawal and leave of absence procedures
- Academic calendar (structured data, not PDF)

**Suggested Question Chips:**
"Get official transcript" / "I'm an alumnus" / "Enrollment verification" / "Tuition appeal" / "Duplicate diploma" / "Name change"

**Routing Gate (before open chat):**
```
"Are you currently enrolled at UK?"
  [Yes — current student] → myUK portal pathway
  [No — alumnus/recent grad] → getmytranscript.com (National Student Clearinghouse)
  [Not sure] → open chat
```
This one question resolves ~40% of all Registrar questions before Claude responds.

**Complexity:** Low — best candidate to build first for infrastructure validation.

---

### Tool 6: Graduate School Guide
**Route:** `/institutional/graduate-school`
**Audience:** Current graduate students (master's and doctoral)
**Volume:** ~7,000 graduate students at UK

**Source Documents:**
- Graduate School Bulletin (full PDF — chunk by section number, preserve section IDs as metadata)
- Thesis and dissertation preparation guide
- Formatting requirements by department/style manual
- Degree forms catalog with submission timeline
- Graduation application guide and deadlines
- 60-day post-defense submission rule + extension procedures
- Time-to-degree policies (6-year master's, up to 10-year doctoral)
- Writing camp and defense scheduling guide
- DGS/DGC policy manual

**Suggested Question Chips:**
"Thesis deadline after defense" / "60-day rule" / "Forms before I defend" / "Time-to-degree extension" / "Plan A vs Plan B master's" / "Schedule my defense"

**Chunking Note:** The Graduate School Bulletin has numbered sections (4.2.1, 5.1, etc.). Preserve section numbers in chunk metadata:
```typescript
// In document-ingestor.ts, detect Bulletin section headers:
// "4.2.1 Time Limits for Degree Completion" → tag chunk with { section: "4.2.1" }
// This makes citations precise: "Per section 4.2.1 of the Graduate School Bulletin..."
```

**Complexity:** Medium-High — test retrieval quality extensively on formatting questions (very specific: margin widths, font sizes, citation styles per discipline).

---

### Tool 7: HR Benefits Navigator
**Route:** `/institutional/hr-benefits`
**Audience:** UK employees (faculty and staff)
**Volume:** Medium — spikes hard October–November (open enrollment)

**Source Documents:**
- Health/dental/vision plan comparison charts
- Retirement plan guide (200% match mechanics)
- Employee Education Program (up to 18 credit hours/year tuition waiver)
- Family Education Program (dependent tuition discount tiers)
- Housing Assistance Program (forgivable loan)
- Benefits enrollment and life-event change procedures
- FMLA and leave policies
- New employee benefits enrollment guide

**Suggested Question Chips:**
"Employee tuition waiver" / "Dependent tuition discount" / "Retirement match" / "Change benefits — life event" / "Housing assistance loan" / "Open enrollment dates"

**Versioned Documents — Critical:**
```typescript
// Every HR document tagged with plan year: "2025-2026"
// System prompt includes: "Always cite the document version in your response."
// When ingesting new plan year docs: deprecate old (isActive: false) but preserve
// Chat retrieval: only queries isActive: true documents
// Admin panel: shows both active and deprecated — deprecated visible for audit
```

**Alert: Pre-Open-Enrollment Warning**
The admin panel shows a red banner from September 15 onward if the new plan year documents haven't been uploaded. HR Benefits is the one tool where stale documents directly cost employees money.

**Complexity:** Low-Medium — versioning is the main engineering complexity.

---

### Tool 8: Research Grants Assistant (OSPA)
**Route:** `/institutional/research-grants`
**Audience:** Faculty PIs, co-investigators, department research administrators
**Volume:** Lower absolute volume, highest-value individual interactions

**Source Documents:**
- Grant proposal development guide
- NIH budget development and justification guide
- NSF budget and compliance guide
- Conflict of Interest disclosure procedures
- ClinicalTrials.gov registration requirements
- Export Control compliance guide
- NIH Research Security Training (RST) requirements (2025 CHIPS Act)
- Subaward management procedures
- Cost-share policy
- F&A rate agreement

**Suggested Question Chips:**
"Budget justification for R01" / "ClinicalTrials.gov — do I need to register?" / "NIH Research Security Training" / "Disclose conflict of interest" / "UK F&A rate" / "Subaward setup"

**Agency-Specific Mode:**
```
On tool entry, before chat opens:
"Which agency is your grant with?"
[NIH] [NSF] [DOD/DoE] [Private Foundation] [Multiple/Not Sure]

Selected agency is injected into system prompt:
"The user is working on [NIH]-funded research. Prioritize NIH-specific guidance.
 When NSF or other agency rules differ, note the difference explicitly."
```

**Compliance Change Alert:**
Federal regulations change without warning (the 2025 RST requirement was ~60 days' notice). Build an admin notification:
- When any OSPA document is replaced, the admin panel shows: "⚠ Updated: [doc title]. Review open chat sessions from the last 30 days that cited this document."
- Optionally: auto-email OSPA staff with the list of affected sessions.

**Complexity:** High — quarterly document refresh cadence required at minimum.

---

## Part 5: Build Phases (Demo-Optimized)

All 8 tools. Full scope. Sequenced so the demo is shippable as early as possible and each phase produces something testable.

### Phase 0 — Demo Foundation (Build First, Nothing Else Ships Without This)

Everything in this phase is a prerequisite for every tool. Do not start Phase 1 until Phase 0 is complete and tested.

1. **DB schema** — all models: `InstitutionalDepartment`, `InstitutionalDocument`, `InstitutionalChunk`, `InstitutionalChatSession`, `InstitutionalGap`. Run migration.
2. **pgvector extension** — confirm enabled on Neon: `CREATE EXTENSION IF NOT EXISTS vector;`
3. **Embedding service** — `embedding-service.ts` with OpenAI `text-embedding-3-small` (1536d). Abstraction layer ready for Azure swap.
4. **RAG retrieval** — `rag-retrieval.ts`: embed query → cosine similarity search over `InstitutionalChunk` → return top-k chunks with document titles
5. **Document ingestor** — `document-ingestor.ts`: scrape URL or parse PDF → chunk at ~512 tokens with 64-token overlap → embed → store
6. **Streaming chat API** — `api/institutional/[department]/chat/route.ts`: retrieve chunks → build system prompt → stream Claude response
7. **`InstitutionalChatShell.tsx`** — shared chat UI: streaming renderer, suggested chips, disclaimer banner, source footer, escalation card, inline feedback, cross-tool suggestion
8. **`DecisionTreeWizard.tsx`** — reusable branching wizard with back button, progress bar, skip link, result card
9. **`DemoUserBar`** — pinned to every page, all 6 users with name + role labels, one-click switch
10. **`/institutional` landing page** — tool grid + Haiku-powered routing classifier
11. **One-click starter course** — college picker in new course flow, 17 seeded starter courses with full syllabus content, Sandy responds on first load
12. **Web scraping pipeline** — script to scrape uky.edu target URLs, extract main content, strip nav/footer/sidebar, store as `InstitutionalDocument`
13. **Admin panel** — `/admin/institutional/[slug]`: upload docs, view feedback events, unanswered gaps, freshness warnings
14. **`DEMO_MODE`** — env flag enabling graceful error messages, DemoUserBar, pre-warm script

Phase 0 deliverable: One tool (Registrar) fully working end-to-end. The shell, the RAG pipeline, the streaming chat, and the admin panel all proven before building 7 more.

---

### Phase 1 — First 4 Tools (Highest Volume / Clearest Documents)

Load scraped content, configure chips, test all chips, ship.

5. **Registrar** — current/alumni routing gate, transcript and enrollment questions
6. **Financial Aid** — forms quick-access panel, verification + SAP + appeals questions
7. **ITS Help Desk** — scrape top 20 TechHelpCenter articles, OS detection in prompt
8. **Graduate School** — section-numbered chunking of Bulletin, 60-day deadline focus

Phase 1 deliverable: 4 tools fully loaded and chip-validated. Act 2 demo walkthrough is possible with these 4.

---

### Phase 2 — Decision Tree Tools (Higher Complexity)

9. **ISSS** — CPT/OPT wizard (all branches tested), J-1/travel/RCL in RAG chat
10. **IRB** — determination wizard (all result paths tested), SOP + review types in RAG chat

Phase 2 deliverable: Both wizards run cleanly. Act 2 ISSS + IRB segments are demo-ready.

---

### Phase 3 — Specialist Tools

11. **Research Grants (OSPA)** — agency-specific mode (NIH/NSF/DOD selector), federal compliance docs
12. **HR Benefits** — versioned document tagging, plan year citations in every response

Phase 3 deliverable: All 8 tools live. Full Act 2 run-through passes the complete demo checklist.

---

### Phase 4 — Demo Polish (Run Concurrently With Phase 3)

These run in parallel with Phase 3 — not sequential. The demo is only as good as its finish.

- Pre-validation run on all chips across all 8 tools — replace any failures
- All 17 starter courses tested (every college, 3 Sandy questions each)
- Mobile testing on iPhone Safari — fix any layout or scroll issues
- Network resilience: timeout handling, offline banner, pre-warm script
- Session history sidebar working and tested
- Full demo checklist run-through — clean pass required before any stakeholder sees it

---

### Phase 5 — Post-Demo / Deloitte Handoff

These activate after UK signs off and Deloitte engagement begins:

- Azure OpenAI swap (`EMBEDDING_PROVIDER=azure`) — one env var change, abstraction layer handles the rest
- Azure AI Search swap (`VECTOR_STORE=azure-ai-search`) — same
- Azure Document Intelligence for PDF parsing — replaces `pdf-parse` for production
- Azure Container Apps deployment — replaces Vercel
- Real authentication (Azure AD / UK SSO) — replaces demo mode
- Proactive notification crons — activate when SIS/HR data integration exists
- OSPA tool: Grants.gov / NIH Reporter API integration
- Automated quarterly re-ingest pipeline for ITS articles

---

## Part 6: Admin Interface

**Route:** `/admin/institutional` (platform admin — all departments)
**Route:** `/admin/institutional/[slug]` (department admin — scoped to one dept)

### Platform Admin Features
- Dashboard: all 8 departments with session counts, positive feedback rates, doc freshness scores
- Tier 1 alert feed: any tool with positive feedback rate < 75% flagged in red
- New department creation
- Assign department admin emails

### Department Admin Features
- Document list: title, version, `embeddedAt`, `isActive`, feedback-event count
- Upload new document (PDF or URL)
- Re-embed button (re-chunks without losing old version)
- Deprecate button (sets `isActive: false`)
- Freshness warnings: yellow at 180 days, red at 365 days
- **Unanswered Questions tab** — `InstitutionalGap` records sorted by frequency, with `resolved` toggle
- **Feedback Events tab** — thumbs-down responses (anonymized) with the question and AI response visible
- **Coverage Map tab** (ITS only) — ticket category → covered/not covered

---

## Part 7: Data Privacy

- No PII sent to Claude. System prompt and retrieved chunks contain policy documents only — no student records, grades, financial account data, or immigration document numbers.
- `userEmail` stored on sessions for continuity only. Never used to pull account-level data.
- All 8 tools operate at **policy/procedure level**, not **account/individual level**. That line requires a proper identity verification system and explicit UK authorization — neither of which exists in this phase.
- Chat session logs in admin panel are anonymized (email shown as "user@uky.edu" pattern, not the actual address).

---

## Part 8: Success Metrics

### Tier 1 — Trust (gates to promotion/marketing)
| Metric | Threshold | Action if Below |
|---|---|---|
| Positive feedback rate | ≥ 75% | Tool under review — find and fix bad documents before promoting |
| "Not found" rate | ≤ 20% | Document gap review — top unanswered questions → new docs |

### Tier 2 — Volume
| Metric | Target |
|---|---|
| Sessions / month | Baseline month 1, +10% MoM |
| Unique users / month | Track trend |
| Sessions via Sandy routing | Track % of sessions that started from Sandy |

### Tier 3 — Efficiency
| Metric | Target |
|---|---|
| Deflection rate | ≥ 60% in month 3 |
| Avg messages to resolution | ≤ 4 messages |
| Cross-tool routing clicks | Track — indicates question boundary coverage gaps |

### Tier 4 — Health
| Metric | Target |
|---|---|
| Doc freshness score | 100% of docs updated within 180 days |
| Negative feedback alerts fired | < 1/week per tool (steady state) |
| Unanswered gap resolution rate | Avg gap age < 30 days |

Report Tier 1 and Tier 4 to department heads monthly. Full dashboard quarterly. These numbers are the institutional sales pitch — they either validate expansion or demand improvement.

---

## What Comes After These 8

Once the infrastructure is battle-tested and Tier 1 metrics are green across all 8 tools:

- **College of Business** — program advising, career resource navigation
- **Disability Resource Center** — accommodations process guide
- **Dean of Students** — conduct process, emergency fund eligibility
- **Writing Center** — async writing guidance between human tutor appointments
- **Career Center (Stuckert)** — resume review, major-to-career mapping

The "what comes after" list grows every semester. The infrastructure built here supports any department with stable policy documents. The expansion pitch to a new department is: "Give us your documents and an admin email. We'll have a pilot running in two weeks."
