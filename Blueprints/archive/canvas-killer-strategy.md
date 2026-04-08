# Blueprint: The AI Course Layer for Canvas
### Internal strategy file: "Canvas killer" thesis, revised into an LTI-first adoption plan
### Scope: Product strategy, sequencing, buyer narrative, and architecture priorities
### Status: Strategic direction approved for follow-on PRDs and technical blueprints

---

## 1. Executive Summary

The Sandbox should not try to replace Canvas in one move.

The winning strategy is to become the AI execution layer inside Canvas first, through LTI 1.3, and let Canvas gradually collapse into a thin system-of-record shell.

This is the actual wedge:

1. Faculty install Sandbox tools inside Canvas without an IT fight
2. Students use Sandbox-powered assignments, coaching, grading, and revision flows inside their existing course shell
3. Faculty see better student work, less grading burden, and richer engagement data
4. Departments and provost offices see retention, accreditation, and program-level evidence value
5. At that point, Canvas still exists, but it is no longer where the learning intelligence lives

Externally, do not position this as "killing Canvas."
Externally, position it as:

- "The AI course layer for Canvas"
- "The intelligence layer your LMS is missing"
- "A faster way to add AI workflows to courses without replacing your LMS"

Internally, the thesis is still aggressive:
Canvas is the shell. Sandbox becomes the product.

---

## 2. Strategic Thesis

The correct framing is:

- Canvas = system of record
- Sandbox = system of engagement

But that framing is incomplete unless it includes the Trojan Horse:

- Do not sit beside Canvas as a separate destination
- Run inside Canvas through LTI 1.3
- Win faculty adoption course by course
- Use clear workflow superiority to make deeper migration obvious later

The major mistake would be trying to sell a net-new platform before proving institutional value.
The better move is to let institutions keep their LMS while shifting the most valuable workflows into Sandbox.

---

## 3. What The Sandbox Already Has

The strategy should build on existing strengths instead of re-architecting solved problems.

Already present in the product:

- Sandy as a 24/7 concierge and context-aware assistant
- My TA as the educator-owned AI support layer
- Course spaces, materials, linked tools, and course-specific context
- Session tracking and structured interaction data
- Rubric-oriented tool concepts and grading-adjacent patterns
- Builder and Playground workflows for creating new learning tools

Implication:

- The "communication gap" is not the main product gap
- The next wave should focus on workflow integration, data capture, and institutional outcomes

---

## 4. Priority Stack

### Tier 1: Adoption Wedge

These are the first three priorities because together they create the clearest path to faculty adoption and measurable academic value.

1. LTI 1.3 Bridge
2. Syllabus-to-Course Generator
3. AI Grading Loop

### Tier 2: Institutional Expansion

These become much stronger once Tier 1 is live and generating real course data.

4. AI Early Warning System
5. Accreditation Portfolio

### Tier 3: Platform Expansion

Only after the above should the team aggressively expand into broader LMS replacement territory:

- richer assignment orchestration
- full course shell authoring
- deeper gradebook views
- institution-wide analytics layers
- long-term migration paths away from LMS dependence

---

## 5. Tier 1 Detail

### 5.1 LTI 1.3 Bridge

This is the Trojan Horse.

The goal is simple:
make Sandbox tools feel native inside Canvas.

#### Must-have capabilities

- LTI 1.3 launch from Canvas into Sandbox
- OIDC login and role-aware identity mapping
- course context and assignment context from launch claims
- Names and Roles roster sync
- deep linking so faculty can place Sandbox experiences directly in Canvas modules
- Assignment and Grade Services for grade passback
- persistent linking between a Canvas course/assignment and a Sandbox course/tool/workflow

#### First release scope

Faculty should be able to:

- add a Sandbox activity inside Canvas
- launch students into that activity without separate sign-in friction
- receive grades back in Canvas when relevant
- keep all high-value AI interactions happening in Sandbox

#### Why it matters

Without LTI, adoption depends on behavior change.
With LTI, adoption depends on faculty curiosity.

That is a dramatically easier sale.

#### Deployment rule

If LTI 1.3 is the entry wedge, then the most important faculty and student workflows must also be deployable through that LTI surface.

That means we should not build Tier 1 features as "native Sandbox only" experiences and assume adoption will follow later.
For the adoption wedge to work, the following should be launchable or usable from inside Canvas:

- Sandbox assignments and AI grading loops
- Sandy / My TA course-grounded help inside assignment context
- syllabus-generated course activities that can be deep-linked into Canvas modules
- accessibility-remediated course assets and AI-remixed learning materials when used in linked assignments

Institution-wide surfaces such as accreditation reporting or cross-course analytics may still live primarily in Sandbox admin views.
But anything tied to day-to-day teaching and learning should work where faculty and students already are: inside Canvas via LTI.

#### Non-goals for v1

- full two-way course shell sync
- replacing Canvas discussions
- replacing Canvas files
- replacing every gradebook function
- custom institutional SIS integrations

The first goal is embedded execution, not full parity.

---

### 5.2 Syllabus-to-Course Generator

This is the strongest faculty-facing creation wedge in the strategy.

The faculty input:

- upload syllabus
- optionally upload rubric, schedule, reading list, or assignment docs

The Sandbox output:

- generated course shell
- modules or weeks
- extracted learning objectives
- assignment inventory
- suggested AI tools per module
- recommended Sandy / My TA context
- first-pass assessment map
- candidate rubric structures where missing

#### Why it matters

Faculty do not want to "configure an AI platform."
They want to start from the document they already have.

This turns the syllabus into a working course operating system instead of a static PDF.

#### Product promise

"Give us your syllabus and we will stand up the first usable version of your AI-supported course."

#### Required outputs

- editable course structure, not locked AI output
- explicit confidence flags where parsing is uncertain
- objective extraction with faculty override
- suggested tools linked to real course moments, not generic recommendations

---

### 5.3 AI Grading Loop

This should not stop at AI pre-grading.

Pre-grading alone saves time, but the bigger value is changing student behavior before final submission.

The real workflow is:

1. student submits draft
2. AI scores against rubric
3. AI explains gaps and suggests revisions
4. student revises and resubmits
5. faculty sees a stronger final submission
6. optional final score or feedback passes back to Canvas

#### Core value

- better student work
- faster faculty grading
- clearer rubric alignment
- richer evidence of learning progression

#### Product design principle

Faculty should never feel like AI has taken grading authority away.

The system must support:

- faculty-authored or faculty-approved rubrics
- transparent scoring rationale
- faculty override
- visible student revision history
- clear distinction between formative AI feedback and summative faculty judgment

#### Best initial use cases

- short essays
- discussion drafts
- reflection assignments
- case briefs
- lab writeups
- rubric-based presentations

Start where rubric-driven feedback is already natural.

---

## 6. Tier 2 Detail

### 6.1 AI Early Warning System

Canvas analytics are shallow.
Sandbox should use interaction patterns to identify risk before the midterm.

Potential signals:

- sudden drop in activity
- repeated failed attempts or low-confidence interactions
- rubric feedback patterns that do not improve across revisions
- students asking the same conceptual questions repeatedly
- incomplete learning objective coverage
- time-on-task changes
- missed assignment engagement relative to peers or to the student's own baseline

#### Product goal

Give faculty, advisors, and student-success teams a useful "who needs help now" view, not a passive dashboard.

#### Important principle

This should be framed as supportive intervention, not surveillance.

Risk flags should include:

- why the student was flagged
- what support action is recommended
- confidence level
- time window

---

### 6.2 Accreditation Portfolio

This is one of the strongest institutional buying stories.

Programs in law, medicine, business, nursing, and other accreditation-heavy fields spend enormous time assembling evidence.
Sandbox interactions can become structured evidence exhaust.

Potential outputs:

- learning objective coverage reports
- rubric-aligned performance evidence
- representative student artifact collections
- longitudinal skill progression
- engagement summaries by cohort, course, or program
- exportable packets mapped to accreditation standards

#### Why it matters

This is not just a faculty efficiency feature.
This is a dean, chair, and provost value story.

If Sandbox can materially reduce accreditation prep labor, it becomes budget-worthy at the program level.

---

## 7. Buyer Personas and Value Narrative

### Faculty

What they buy:

- less setup friction
- less grading time
- better student drafts
- better AI support embedded in the course they already teach

Best pitch:

"Use Sandbox inside Canvas to add AI-supported assignments, feedback, and coaching without rebuilding your whole course."

### Department Chair or Program Director

What they buy:

- better course consistency
- earlier student risk visibility
- reusable course templates
- program-level evidence

Best pitch:

"Standardize what good course support looks like, surface struggling students earlier, and generate better program evidence without adding more manual admin work."

### Dean or Provost

What they buy:

- measurable student success improvement
- faculty efficiency
- institutional differentiation
- accreditation leverage

Best pitch:

"Sandbox gives the university an AI layer for teaching, feedback, and evidence collection that sits on top of the LMS you already have."

### IT and Academic Technology

What they buy:

- standards-based integration
- manageable security posture
- lower change-management burden than full LMS replacement

Best pitch:

"This is LTI-first, permissioned, and auditable. It extends Canvas rather than asking the institution to rip and replace."

---

## 8. Core Product Principles

1. Land inside existing workflows before trying to replace them
2. Faculty control must remain explicit in all grading-related workflows
3. Every AI interaction should create structured, reusable institutional data
4. Student value and institutional value should be generated by the same workflow, not separate products
5. Trust, auditability, and permissions are not later add-ons; they are part of the core product

---

## 9. Technical Capability Map

To execute this strategy, Sandbox needs a stronger underlying model of courses, assignments, learning evidence, and institutional context.

### Core objects the platform should model explicitly

- institution
- LMS course linkage
- Canvas assignment linkage
- course objective
- module or week
- rubric
- rubric criterion
- submission artifact
- draft attempt
- feedback event
- revision event
- final assessment event
- risk signal
- intervention record
- accreditation standard
- evidence artifact

### Why this matters

These objects make it possible to support:

- LTI launches and passback
- revision-aware grading loops
- early warning analytics
- accreditation exports

Without this structured layer, the platform remains a set of useful tools instead of a defensible system.

---

## 10. Architecture Priorities

### 10.1 Integration Layer

Build a dedicated LTI service boundary that handles:

- OIDC login
- platform registration
- launch validation
- role mapping
- deep linking
- assignment linkage
- grade passback

This should be treated as a platform capability, not a one-off route.

### 10.2 Course Ingestion Layer

Build a syllabus and course-material ingestion pipeline that:

- parses syllabi and supporting docs
- extracts modules, objectives, assignments, schedules, and rubrics
- creates editable structured course objects
- generates suggested Sandbox workflows per course element

### 10.3 Feedback and Assessment Layer

Build a revision-aware grading system with:

- rubric authoring or import
- artifact submission storage
- AI scoring events
- feedback generation
- resubmission tracking
- faculty override and finalization

### 10.4 Analytics and Evidence Layer

Build downstream pipelines that transform course interactions into:

- risk signals
- objective mastery views
- cohort summaries
- accreditation evidence bundles

---

## 11. Trust, Policy, and Admin Controls

This strategy will fail at institutional scale without trust infrastructure.

Must-have controls:

- roster-aware permissions
- course and assignment scoping
- audit log for AI-generated feedback and scores
- faculty override on all score-bearing actions
- clear retention policies
- FERPA-conscious data handling
- explainable risk flags
- human-readable evidence lineage for accreditation outputs

The message to institutions should be:

"AI assistance, not black-box automation."

---

## 12. Success Metrics

### Tier 1 success metrics

- number of Canvas courses with active Sandbox LTI links
- number of faculty who create at least one linked assignment
- number of student launches from Canvas into Sandbox
- percent of assignments using draft-to-revision workflow
- average improvement between first AI-scored draft and final submission
- faculty time saved per assignment cycle

### Tier 2 success metrics

- early warning flag precision and recall against real course outcomes
- number of interventions triggered before midterm
- reduction in accreditation evidence prep time
- number of programs using evidence exports
- renewal or expansion decisions tied to program-level reporting

---

## 13. Recommended Roadmap

### Phase 1: Embedded Adoption

Goal:
prove that Sandbox can live inside Canvas and improve a real assignment workflow.

Build:

- LTI launch
- deep linking
- roster and role sync
- assignment linking
- grade passback
- one flagship AI grading loop
- one embedded Sandy / My TA support experience in course or assignment context

Success condition:
faculty can assign Sandbox activities without leaving their current LMS workflow.

### Phase 2: Course Generation

Goal:
make course setup dramatically faster.

Build:

- syllabus ingestion
- objective extraction
- module generation
- suggested tools per course
- My TA and Sandy course grounding
- deployment of generated activities back into Canvas through deep links or assignment placement

Success condition:
an educator can go from syllabus upload to usable AI-supported course workspace in one session.

### Phase 3: Student Success Intelligence

Goal:
turn course interaction data into actionable student-support signals.

Build:

- early warning dashboards
- intervention recommendations
- faculty and advisor views

Success condition:
faculty and support staff can identify struggling students meaningfully earlier than with Canvas alone.

### Phase 4: Institutional Evidence Layer

Goal:
make Sandbox valuable at the dean and accreditation level.

Build:

- standards mapping
- evidence packet generation
- objective coverage views
- export workflows for accreditation reporting

Success condition:
programs can point to measurable labor savings and clearer outcomes evidence.

---

## 14. What Not To Do Yet

- Do not rebuild the LMS discussion board
- Do not chase full Canvas feature parity
- Do not re-architect Sandy or My TA as if communication were the missing layer
- Do not over-invest in flashy analytics before assignment and revision workflows are generating trustworthy data
- Do not market "AI grading" as autonomous grading

The near-term win is superior workflow, not full platform replacement.

---

## 15. Sharp Positioning Statements

Use internally:

- "Canvas is the shell. Sandbox is the intelligence layer."
- "We are not replacing the LMS on day one. We are replacing its value center."
- "LTI is the Trojan Horse."

Use externally:

- "The AI course layer for Canvas"
- "AI-supported teaching and feedback without replacing your LMS"
- "From syllabus to assignment to evidence, inside your existing course workflow"

Do not use externally:

- "Canvas killer"
- "Replace your LMS"
- "Autonomous grading"

---

## 16. Immediate Next Documents To Write

This strategy file should lead directly to follow-on blueprints.

Recommended next docs:

1. `Blueprints/lti-bridge-blueprint.md`
   Scope: LTI 1.3 launch, deep linking, names and roles, AGS, assignment linkage

2. `Blueprints/syllabus-to-course-generator.md`
   Scope: syllabus ingestion, structured outputs, faculty editing workflow

3. `Blueprints/ai-grading-loop.md`
   Scope: draft submission, rubric scoring, revision loop, faculty override, grade passback

4. `Blueprints/early-warning-system.md`
   Scope: risk signals, dashboards, interventions, explainability

5. `Blueprints/accreditation-portfolio.md`
   Scope: evidence graph, standards mapping, exportable reports

---

## 17. Final Recommendation

The Sandbox should pursue an LTI-first wedge into higher education, not a direct LMS replacement bet.

The highest-leverage path is:

1. get inside Canvas
2. turn syllabi into AI-supported course structure
3. own the draft-feedback-revision loop
4. convert that activity exhaust into early warning and accreditation value

If executed well, Canvas remains installed but becomes strategically secondary.
That is the real replacement path.
