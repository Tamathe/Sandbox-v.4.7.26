# BIO 201 — The Programmable Syllabus
### The Sandbox — University of Kentucky
### Status: Architecture draft. Pending answers to open questions below.

---

## What This Document Is

`Bio 201.litcoffee` is a fully-formed University of Kentucky course syllabus for *Introduction to Molecular and Cellular Biology*. On its face, it's a demo course document. Architecturally, it is something more significant.

The `.litcoffee` extension is not incidental. **Literate CoffeeScript** is a format where the entire file is valid Markdown — human-readable prose — but code blocks within it are executable CoffeeScript. The grading scale, rubric bands, and weekly schedule are not just text. They are *data waiting to be evaluated*.

This is the seed of a new concept for The Sandbox: **the Programmable Syllabus**.

---

## The Core Architectural Insight

Traditional LMS syllabi are static PDFs. They get uploaded, stored, and displayed. Faculty manually re-enter grading formulas, assignment due dates, and rubric criteria into separate system fields.

A `.litcoffee` syllabus breaks that pattern. If the grading scale is:

```coffeescript
computeGrade = (percentage) ->
  if percentage >= 90 then 'A'
  else if percentage >= 80 then 'B'
  else if percentage >= 70 then 'C'
  else if percentage >= 60 then 'D'
  else 'E'
```

...then The Sandbox can **read the grading logic**, not just display it.

The implication: a `LITERATE_SYLLABUS` document type could be parsed — either by executing the code blocks or by Claude reading the structured markdown — to auto-populate:

- `LearningObjective` records from the numbered SLOs
- `Assignment` records (4 exams + final + quizzes) with week-relative due dates
- `Rubric` + `RubricCriterion` + `RubricBand` records from the appendix
- A grading function that lives in the platform, not just in the document
- The course schedule as structured timeline data

This is a materially different value proposition from "upload a PDF and we'll extract text." It's a **course-as-code** paradigm.

---

## Mapping Syllabus Elements to Existing Data Models

### 1. Learning Outcomes → `LearningObjective`

The syllabus defines 5 Student Learning Outcomes. These map directly to the existing `LearningObjective` model:

| SLO | Title | Module |
|---|---|---|
| 1 | Chemical properties of water, carbon, and macromolecules | 1–3 |
| 2 | Cellular organelles and roles in eukaryotic/prokaryotic cells | 4–5 |
| 3 | Enzymatic catalysis and thermodynamics | 6–7 |
| 4 | Cellular respiration and photosynthesis pathways | 7–8 |
| 5 | DNA replication, transcription, and translation | 12–13 |

These can be seeded automatically on syllabus import. The platform already has `StudentObjectiveProgress` to track mastery per student.

---

### 2. Grade Breakdown → `Assignment` records

| Assignment | Weight | Count | Points Each | Due (Week) |
|---|---|---|---|---|
| Exam 1 | 15% | 1 | 15 pts | 4 |
| Exam 2 | 15% | 1 | 15 pts | 8 |
| Exam 3 | 15% | 1 | 15 pts | 12 |
| Exam 4 | 15% | 1 | 15 pts | 16 |
| Final Exam | 20% | 1 | 20 pts | 16 |
| Quizzes/Assignments | 10% | TBD | — | Rolling |
| Participation (TopHat) | 10% | — | — | Weekly |

These populate `Assignment` records with `type: LEGACY_SUBMISSION` (or `AI_EXPERIENCE` where appropriate). The `week` field on `CourseMaterial` already exists for module grouping — week-relative due dates can resolve to absolute dates once the `Course.startDate` is set.

---

### 3. Appendix Rubric → `Rubric` + `RubricCriterion` + `RubricBand`

The Exam 1 appendix is the most architecturally valuable part of this document. It contains a fully-specified, point-valued rubric for 3 free-response questions and an answer key for 2 multiple-choice questions. This maps precisely to the `Rubric` schema already defined in `rag-gradebook-architecture.md`:

**Rubric: BIO 201 Exam 1 — Free Response**

```
Criterion: Buffer System (Q1)                          5 pts total
  Band: Identifies bicarbonate binding H+              2 pts
  Band: Explains formation of carbonic acid            2 pts
  Band: Concludes H+ reduction raises pH               1 pt

Criterion: Deep-Sea Macromolecule (Q2)                 4 pts total
  Band: Identifies class as carbohydrate               2 pts
  Band: States primary function                        2 pts

Criterion: Cellulose vs. Glycogen (Q3)                 6 pts total
  Band: Beta-glycosidic linkage in cellulose           2 pts
  Band: Alpha-glycosidic linkage in glycogen           2 pts
  Band: Connects structure to function                 2 pts
```

**Multiple Choice Key:** Q4 = B, Q5 = B

This is the clearest demonstration yet of what the gradebook system is for. The rubric is not just descriptive — it is a *scoring specification* that an LLM can apply to a student's written response and produce a structured JSON score with per-criterion rationale. See `rag-gradebook-architecture.md` → AI Scoring Flow.

---

## The Programmable Cell: Weeks 14–15

Weeks 14 and 15 are architecturally notable. They deviate from the standard biology curriculum into:

- **Week 14:** NGS (Next-Generation Sequencing) and CRISPR-Cas9
- **Week 15:** AlphaFold, Computational Biology, and Molecular Diagnostics

These are not traditional lecture topics. They are AI-native, tool-native subjects. A student learning CRISPR doesn't need to read about it — they need to *simulate guide RNA design*. A student learning AlphaFold needs to interact with a protein structure predictor, not a textbook.

**These weeks are a showcase argument for The Sandbox.** The curriculum is explicitly structured so that the last two weeks before the final cannot be taught well in Canvas. They require interactive tools.

### Proposed Tools for Weeks 14–15

| Tool | Type | Week |
|---|---|---|
| CRISPR Guide RNA Designer | Simulation | 14 |
| CRISPR Off-Target Risk Analyzer | Case Analyzer | 14 |
| AlphaFold Structure Explorer | Adaptive Quiz + Chat | 15 |
| Molecular Diagnostics Case Simulator | Simulation | 15 |

Each of these can be built with the existing Tool Builder and would be auto-linked to BIO 201 via `CourseToolLink`.

---

## The 5 AI Tools Auto-Generated from SLOs

`CourseMagicButton` (`POST /api/courses/[id]/generate-bot`) currently generates a single chatbot from course materials. With structured SLO data, this can be extended to **suggest one tool per learning outcome**:

| SLO | Suggested Tool Type | Tool Name |
|---|---|---|
| 1 | Adaptive Quiz | Macromolecule Structure & Function Quiz |
| 2 | Simulation | Cell Organelle Identification Lab |
| 3 | Case Analyzer | Enzyme Kinetics Problem Set |
| 4 | Simulation | Cellular Respiration Pathway Tracker |
| 5 | Chatbot Tutor | Central Dogma Step-by-Step Explainer |

This becomes the "Generate Tools from My Syllabus" educator workflow — a single click that reads the SLOs and proposes a tool for each one. The educator reviews, edits system prompts, and publishes. **This is a 10-minute workflow to a fully-equipped course.**

---

## TopHat Replacement Surface

The syllabus explicitly requires a TopHat subscription for in-class participation (10% of grade). This is a direct integration point.

TopHat's core value: real-time in-class polling and participation tracking. The Sandbox already has:
- `ToolSession` tracking (who used what, when)
- `MetricEvent` for custom events
- `LeaderboardEntry` for per-tool rankings
- Real-time collab sessions with presence

**What's needed for parity:**
- An "In-Class Mode" flag on tools (hides tool from marketplace, only accessible during a live session window)
- Instructor-controlled session open/close (start class → open tool → end class → close)
- Participation score computed from session presence within the window

This is low-model-complexity work (a few new fields on `Tool` and `ToolSession`) with high strategic value — TopHat costs faculty money and The Sandbox could absorb the use case.

---

## Open Questions

These need answers before building begins.

### 1. The `.litcoffee` Format — Is This Intentional?

**This is the most important question.** If the `.litcoffee` extension is deliberate design intent, then the "Programmable Syllabus" concept is a planned feature and we should build a parser for it. If it's just the file format that happened to be used, then we treat it as rich Markdown and extract via Claude.

The two paths have different build costs:
- **Intentional:** Build a `SyllabusParser` that evaluates code blocks to extract structured data. Medium complexity, unique to The Sandbox.
- **Incidental:** Use the existing `import-syllabus` AI extraction path. Low cost, already partially built.

### 2. Dr. Ian McClure vs. Ian McClure (Student)

The demo student is `ian.mcclure.student@uky.edu` — a 1L law student. The instructor of BIO 201 is `Dr. Ian McClure` at `ian.mcclure@uky.edu`. Same character, different time? Intentional narrative continuity in the demo universe? This affects:
- Whether we add a new demo user (`ian.mcclure@uky.edu`, role: EDUCATOR)
- How the demo story is told (Ian as a student today, educator tomorrow)
- Whether `ian.mcclure.student@uky.edu` gets enrolled in BIO 201

### 3. Is BIO 201 a Second Demo Course?

Currently only TEK-100 (Heath Price) is seeded. Is BIO 201 meant to:
- **Replace TEK-100** as the primary demo course?
- **Sit alongside it** to show multi-course educator workflows?
- **Be Dr. McClure's course** as part of a new demo persona?

This affects seed data, the demo script, and which stakeholder persona (Heath = engineering educator, Ian = biology educator) leads the educator demo.

### 4. The Programmable Cell Weeks — Custom Tools or Curriculum Design?

Are weeks 14–15 (CRISPR, AlphaFold) in the syllabus because:
- **Custom tools will be built** for these weeks as part of the demo?
- **It's curriculum design** showing that the course is AI-ready by nature?
- Both?

If custom tools, they should be built and seeded before any UK stakeholder demo involving BIO 201.

### 5. The Participation/TopHat Surface

Is there intent to position The Sandbox as a TopHat replacement? This is a real revenue displacement argument for UK administrators (TopHat has institutional licensing costs). If yes, the "In-Class Mode" feature should be on the near-term roadmap and demoed explicitly with BIO 201.

### 6. The Rubric as the AI Grading Seed

The Exam 1 rubric in the appendix is ready to power the AI scoring flow from `rag-gradebook-architecture.md` with zero additional design work. Should this be the **first seeded rubric in the platform** — the concrete proof that AI grading works against a real UK Biology exam?

---

## Recommended Build Sequence

Given the existing `rag-gradebook-architecture.md`, BIO 201 integration proceeds in layers:

### Layer 0 — Seed Data (No New Code)
- Add Dr. Ian McClure as a new demo EDUCATOR user (pending Q2 above)
- Create BIO 201 course record
- Seed 5 `LearningObjective` records from the SLOs
- Seed 16 `CourseMaterial` records organized by module week
- Seed 7 `Assignment` records (4 exams, final, quizzes, participation)
- Seed the Exam 1 `Rubric` + all `RubricCriterion` + `RubricBand` records

### Layer 1 — Syllabus Import UX
- `POST /api/courses/[id]/materials/import-syllabus` (already planned)
- AI extraction prompt that reads a `.litcoffee` or `.md` syllabus and returns structured JSON: objectives, assignments, rubric, schedule
- Faculty reviews extracted data in a confirmation UI before committing

### Layer 2 — Generate Tools from SLOs
- Extend `CourseMagicButton` to call a new route: `POST /api/courses/[id]/suggest-tools-from-objectives`
- Returns 1 tool configuration per SLO: name, type, system prompt draft, learning objective link
- Faculty can accept/edit/discard each suggestion before publishing

### Layer 3 — AI Grading Demo
- Build the Exam 1 rubric into the gradebook system (Layer 0 seeds this)
- Create a demo submission from Ian McClure (student) for Q1–Q3
- Run AI scoring against the Exam 1 rubric → show faculty review interface
- This is the demo moment: "Here is an AI-drafted grade with per-criterion feedback, ready for your review."

### Layer 4 — Programmable Syllabus (If Q1 = Intentional)
- `SyllabusParser` class that evaluates `.litcoffee` code blocks
- Grading scale becomes a live function on the `Course` model
- Rubric bands are parsed directly from code, not via AI extraction
- This is the long-term vision: the syllabus *is* the course configuration

---

## Relationship to Existing Blueprints

| Blueprint | Relationship |
|---|---|
| `rag-gradebook-architecture.md` | BIO 201 is the **first concrete implementation target** for the entire gradebook system. The Exam 1 rubric seeds the `RubricCriterion` model. |
| `canvas-killer-strategy.md` | BIO 201 + Programmable Syllabus + TopHat replacement = the three-part argument for Canvas displacement in a single course. |
| `lti-bridge-blueprint.md` | If BIO 201 is live, LTI becomes the path for students to access it from Canvas during the transition period. |
| `ai-learner-toolkit-blueprint.md` | The 5 SLO-generated tools populate the student toolkit for BIO 201 specifically. |

---

## Summary Statement

BIO 201 is not just a demo course. It is a complete argument for The Sandbox's thesis, compressed into one document:

1. A **structured syllabus** that can auto-generate assignments, objectives, and rubrics
2. A **rubric-ready AI grading target** that demonstrates human-in-the-loop review
3. **AI-native curriculum weeks** (CRISPR, AlphaFold) that Canvas cannot serve
4. A **TopHat replacement surface** with institutional cost implications
5. A possible **Programmable Syllabus** paradigm that makes The Sandbox uniquely code-native

Answer the open questions. Then seed Layer 0. The demo writes itself from there.
