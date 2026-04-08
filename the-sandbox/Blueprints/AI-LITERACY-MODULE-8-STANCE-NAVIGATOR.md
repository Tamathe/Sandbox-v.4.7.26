# Module 8: Instructor Stance Navigator — Blueprint

> **Sprint scope:** 1 sprint (~50 files touched)
> **Depends on:** AI Literacy Hub master infrastructure (Sprint 0)
> **Unlocks:** All other AI Literacy modules (stance personalizes everything downstream)
> **Route:** `/ai-literacy/stance`

---

## Context

### The Problem

The DUS survey revealed a faculty population caught between institutional enthusiasm for AI and their own uncertainty:

- *"One sometimes gets the impression that the university wants all of us to use it"*
- *"The university seems to be more willing to go all-in on AI than I and my colleagues are"*
- *"I don't know. But we are scared."*
- *"If you are confident, you are probably wrong and way behind."*

Faculty don't need to be told what to think about AI. They need **a structured way to figure out what they already think** and then translate that into concrete classroom decisions. The most AI-literate respondents were not less anxious — they were more articulate about *why* they were anxious. This is not a knowledge gap. It's a **clarity gap**.

### The Vision

The Instructor Stance Navigator is a **guided self-assessment** that helps faculty:
1. Reflect on their values, discipline, and teaching goals
2. Discover where they naturally fall on the AI stance spectrum
3. See what that stance means in practice (syllabus language, assignment implications, student communication)
4. Know they're not alone (anonymized peer stance distribution)
5. Evolve their stance over time as comfort and context change

**Critical design principle:** This tool supports ALL stances equally. A faculty member who lands on "Prohibit" gets the same quality of support as one who lands on "Require." The tool never nudges toward adoption. It meets faculty where they are.

---

## Features

### Feature 1: Guided Stance Reflection (10-Question Assessment)

**What:** A 10-question guided reflection that surfaces the faculty member's natural stance toward AI in their teaching. Not a quiz (no right answers) — a structured thinking exercise.

**How:**

The assessment uses a wizard-style flow (matching `CourseSetupWizard.tsx` pattern). Each question is a single screen with a prompt, context paragraph, and response options. Responses are weighted to compute a stance recommendation.

**Questions:**

Each question has 5 response options mapped to the 5 stances (PROHIBIT=1, CAUTIOUS=2, GUIDED=3, INTEGRATE=4, REQUIRE=5). The final score is the weighted average.

```
Q1: DISCIPLINE VALUES
"What does your discipline most value in student work?"
Context: "Different fields have different relationships with originality, process, and tools."
  a) Original voice and authentic expression (1)
  b) Demonstrated understanding of core concepts (2)
  c) Ability to analyze, evaluate, and synthesize (3)
  d) Practical skill application using industry tools (4)
  e) Efficiency and output quality regardless of method (5)

Q2: ASSESSMENT PHILOSOPHY
"When you grade student work, what matters most to you?"
Context: "This shapes how AI use intersects with your evaluation criteria."
  a) The writing/thinking process itself — drafts, revision, growth (1)
  b) Mastery of foundational knowledge and accuracy (2)
  c) Critical thinking and the student's own analysis (3)
  d) Creative problem-solving and tool fluency (4)
  e) Professional-quality deliverables that meet real-world standards (5)

Q3: LEARNING LOSS CONCERN
"How concerned are you that AI use prevents students from developing essential skills?"
Context: "78% of DUS leaders rated this concern 4 or 5 out of 5."
  a) Extremely — AI bypasses the exact skills my courses are designed to build (1)
  b) Very — most of what I teach requires unassisted practice (2)
  c) Moderately — some skills need protection, others can be augmented (3)
  d) Slightly — AI frees students to focus on higher-order skills (4)
  e) Not concerned — using AI effectively IS the skill students need (5)

Q4: INDUSTRY/PROFESSIONAL CONTEXT
"How do graduates of your program use AI in their careers?"
Context: "Some advisory boards explicitly expect AI fluency; others value unassisted expertise."
  a) They don't and shouldn't — the field requires unassisted human judgment (1)
  b) Minimally — the field is cautious about AI adoption (2)
  c) Selectively — some tasks use AI, core expertise does not (3)
  d) Regularly — AI is an expected tool in the profession (4)
  e) Extensively — AI fluency is a hiring criterion in our field (5)

Q5: CURRENT REALITY
"To the best of your knowledge, how are students in your courses currently using AI?"
Context: "48% of DUS leaders said students use AI on their own without guidance."
  a) I believe most are not using it, and I want to keep it that way (1)
  b) Some probably use it quietly; I'd rather not encourage it (2)
  c) Many use it — I'd rather guide the use than ignore it (3)
  d) Most use it — I want to channel it toward learning goals (4)
  e) Everyone uses it — it would be unrealistic to restrict it (5)

Q6: ENFORCEMENT COMFORT
"If a student submits work you suspect was AI-generated against your policy, how would you respond?"
Context: "Faculty describe confronting students about obvious AI misuse and losing."
  a) I want clear policy, enforcement tools, and institutional backing (1)
  b) I'd address it but I'm frustrated by the lack of reliable detection (2)
  c) I'd redesign the assignment rather than try to catch it after the fact (3)
  d) My assignments already account for AI use, so this wouldn't arise (4)
  e) I don't restrict AI, so this question doesn't apply (5)

Q7: INSTITUTIONAL CLIMATE
"How does the university's public enthusiasm about AI affect your teaching decisions?"
Context: "Several respondents felt institutional climate complicates their ability to restrict use."
  a) It makes me feel unsupported in my choice to limit AI (1)
  b) It creates tension — I want flexibility without feeling pressured (2)
  c) I try to find my own path regardless of institutional messaging (3)
  d) It encourages me, but I wish there were more practical support (4)
  e) It aligns with my own enthusiasm — I want to go further (5)

Q8: ASSIGNMENT RESILIENCE
"How would you describe the AI-completability of your current assignments?"
Context: "Traditional homework, take-home essays, and research papers are now routinely AI-completable."
  a) Most of my assignments require in-person, proctored, or embodied work (1)
  b) I've made some adjustments but many assignments are still vulnerable (2)
  c) I'm actively redesigning — it's a work in progress (3)
  d) I've integrated AI into the assignments themselves (4)
  e) AI is a required tool in my assignments (5)

Q9: PEDAGOGICAL IDENTITY
"Which statement best describes how you see your role as an educator in relation to AI?"
Context: "This is about your professional identity, not a policy question."
  a) I teach students to think without technological shortcuts (1)
  b) I teach foundational skills that must be learned before using tools (2)
  c) I teach students to know when to use AI and when not to (3)
  d) I teach students to use AI as a thinking partner and amplifier (4)
  e) I prepare students for a world where AI is as fundamental as the internet (5)

Q10: WHAT YOU NEED
"What would help you most right now?"
Context: "71% want workshops. 62% want assignment redesign help. 58% want integrity guidance."
  a) Institutional backing: enforcement that works when students violate AI policies (1)
  b) Practical examples: what other faculty in my discipline are doing (2)
  c) Assignment redesign: help rethinking assessments for an AI world (3)
  d) Curriculum integration: how to use AI as a pedagogical tool (4)
  e) Advanced strategies: pushing the frontier of AI-enhanced learning (5)
```

**Scoring:**
- Average of all 10 responses (1-5 scale)
- 1.0–1.8 → PROHIBIT
- 1.9–2.5 → CAUTIOUS
- 2.6–3.4 → GUIDED
- 3.5–4.2 → INTEGRATE
- 4.3–5.0 → REQUIRE

The score is a **starting point**, not a diagnosis. The results page explicitly says: "This reflects your responses today. You can adjust your stance at any time."

---

### Feature 2: Stance Spectrum Explainer

**What:** After assessment (or accessible directly), a visual explainer showing what each of the 5 stances means in practice. Not abstract definitions — concrete classroom implications.

**How:**

A horizontal spectrum with 5 labeled positions. Clicking/tapping any stance expands a detailed card:

```
┌─────────────────────────────────────────────────────────────────┐
│  THE AI STANCE SPECTRUM                                         │
│                                                                 │
│  ●━━━━━━━●━━━━━━━●━━━━━━━●━━━━━━━●                             │
│  Prohibit Cautious Guided Integrate Require                     │
│                      ▲                                          │
│               [Your stance]                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  GUIDED USE                                             │   │
│  │                                                         │   │
│  │  You believe AI has a place in education but students    │   │
│  │  need structure, guardrails, and explicit expectations.  │   │
│  │                                                         │   │
│  │  IN YOUR SYLLABUS:                                      │   │
│  │  "AI tools may be used for [specified tasks] with       │   │
│  │  disclosure. All other use must be approved by the      │   │
│  │  instructor. Students must cite AI contributions."      │   │
│  │                                                         │   │
│  │  YOUR ASSIGNMENTS:                                      │   │
│  │  • Mix of AI-allowed and AI-prohibited assignments      │   │
│  │  • Clear labeling per assignment (prohibited/limited/   │   │
│  │    guided/required)                                     │   │
│  │  • Reflection component: "How did you use AI here?"     │   │
│  │                                                         │   │
│  │  STUDENT COMMUNICATION:                                 │   │
│  │  "I expect you to learn to use AI wisely — that means   │   │
│  │  knowing when it helps and when it gets in the way."    │   │
│  │                                                         │   │
│  │  YOU MIGHT WORRY ABOUT:                                 │   │
│  │  • Students pushing boundaries beyond allowed use       │   │
│  │  • Inconsistency across your own assignments            │   │
│  │  • Time spent monitoring and adjusting policies         │   │
│  │                                                         │   │
│  │  THIS STANCE IS COMMON IN:                              │   │
│  │  Social sciences, education, health sciences,           │   │
│  │  interdisciplinary programs                             │   │
│  │                                                         │   │
│  │  FACULTY WHO CHOSE THIS ALSO:                           │   │
│  │  • Built per-assignment AI use scales                   │   │
│  │  • Required AI usage statements on submissions          │   │
│  │  • Combined take-home work with in-class defenses       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

Each stance card includes:
- **Philosophy** — 2-sentence description of the underlying belief
- **Syllabus language** — ready-to-copy paragraph
- **Assignment implications** — what this means for homework, papers, exams
- **Student communication** — how to frame this for students
- **Common concerns** — what faculty at this stance worry about
- **Discipline affinity** — which fields commonly adopt this stance
- **Peer practices** — real examples from the survey (anonymized)

---

### Feature 3: "What Does This Mean for My Courses?" Simulator

**What:** Given the faculty member's stance and their actual courses, show a concrete impact preview: which assignments need attention, what syllabus language to add, what to tell students.

**How:**

After stance selection, pull the instructor's courses and assignments from the database. For each course, generate:

```
┌─────────────────────────────────────────────────────────────┐
│  WHAT "GUIDED USE" MEANS FOR YOUR COURSES                   │
│                                                             │
│  ENG 101 — Introduction to Writing                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Policy needed: Yes (no AI policy found)       ⚠️    │   │
│  │  Assignments to review: 5 of 8                       │   │
│  │    • Essay 1: Take-home essay → HIGH AI risk    🔴   │   │
│  │    • Essay 2: Take-home essay → HIGH AI risk    🔴   │   │
│  │    • Research Paper → HIGH AI risk              🔴   │   │
│  │    • Reading Response → MEDIUM AI risk          🟡   │   │
│  │    • In-class Journal → LOW AI risk             🟢   │   │
│  │                                                       │   │
│  │  Suggested actions:                                   │   │
│  │  [Generate AI policy for this course →]               │   │
│  │  [Review flagged assignments →]                       │   │
│  │  [See process-based alternatives →]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  PHY 211 — General Physics                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Policy needed: No (policy exists)              ✓    │   │
│  │  Assignments to review: 2 of 6                       │   │
│  │    • Problem Set 3: Take-home → MEDIUM AI risk  🟡   │   │
│  │    • Lab Report: Template → LOW AI risk         🟢   │   │
│  │                                                       │   │
│  │  [Update existing policy to match new stance →]       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**AI Risk Assessment (lightweight — not the full Module 1 scanner):**
Uses assignment `category` and `type` fields plus title heuristics:
- `take-home essay/paper/response` → HIGH if stance < INTEGRATE
- `homework/problem-set` → MEDIUM-HIGH depending on discipline
- `in-class exam/quiz` → LOW
- `presentation/lab/discussion` → LOW-MEDIUM
- `project with process checkpoints` → LOW

This is a quick heuristic, not the deep Claude-powered analysis from Module 1. It's enough to show "here's what your stance means concretely."

---

### Feature 4: Peer Stance Distribution

**What:** Anonymized view of where other faculty have landed on the stance spectrum. Reduces isolation ("I'm not the only one who feels this way").

**How:**

```
┌─────────────────────────────────────────────────────────────┐
│  WHERE FACULTY STAND                                        │
│                                                             │
│  All Faculty (n=127)                                        │
│  Prohibit  ████░░░░░░░░░░░░░░░░  12%                      │
│  Cautious  ████████░░░░░░░░░░░░  28%                      │
│  Guided    ████████████░░░░░░░░  38%  ← You are here      │
│  Integrate ██████░░░░░░░░░░░░░░  16%                      │
│  Require   ██░░░░░░░░░░░░░░░░░░   6%                      │
│                                                             │
│  Your discipline family: Humanities (n=23)                  │
│  Prohibit  ████████░░░░░░░░░░░░  30%                      │
│  Cautious  ████████████░░░░░░░░  39%                      │
│  Guided    ██████░░░░░░░░░░░░░░  22%  ← You are here      │
│  Integrate ██░░░░░░░░░░░░░░░░░░   9%                      │
│  Require   ░░░░░░░░░░░░░░░░░░░░   0%                      │
│                                                             │
│  💡 "You're in the most common stance overall and among     │
│  the more progressive end for your discipline. That's a     │
│  valid and supported position."                             │
└─────────────────────────────────────────────────────────────┘
```

**Privacy:** Only show distributions when n ≥ 10 for a group. Below that, show "Not enough data yet" to prevent re-identification. Never show department-level if department has fewer than 10 faculty who've completed the assessment.

---

### Feature 5: Stance Evolution Tracker

**What:** Faculty can revisit and update their stance over time. The system tracks changes and reflects growth.

**How:**

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR STANCE JOURNEY                                        │
│                                                             │
│  Jan 2026    Cautious  ○━━━━━━━━━━━━━━━━━━━━━━━            │
│  "I wasn't sure AI had a place in my writing courses."      │
│                                                             │
│  Mar 2026    Guided    ○━━━━━━━━━━━━━━━━━━━━━━━  ← Now     │
│  "After redesigning two assignments, I see how structured   │
│   AI use can work alongside close reading."                 │
│                                                             │
│  [Retake assessment]  [Update stance manually]              │
└─────────────────────────────────────────────────────────────┘
```

Model: `StanceHistory` records each change with timestamp, previous stance, new stance, and optional reflection note.

```prisma
model StanceHistory {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  previousStance AIStance?
  newStance     AIStance
  score         Float              // Raw assessment score
  responses     Json               // Full Q&A for reference
  reflectionNote String?           // Optional: why they changed
  createdAt     DateTime @default(now())
}
```

---

### Feature 6: Sandy Integration

**What:** Sandy can guide the entire stance navigation experience conversationally.

**Triggers:**
- Faculty visits `/ai-literacy/stance` → Sandy offers to walk them through it
- Faculty hasn't taken assessment → Sandy mentions it at natural moments (course setup, assignment creation)
- Faculty retakes assessment with different result → Sandy acknowledges the shift

**Sandy conversation example:**
```
Sandy: "I see you haven't explored your AI teaching stance yet.
        This isn't a quiz — it's a 10-question reflection that
        helps you figure out where you stand and what that means
        for your courses. Takes about 5 minutes. Want to start?"

Faculty: "Sure, but I'm pretty against AI in my writing courses."

Sandy: "That's a completely valid position, and this tool supports
        it fully. Let's work through the questions — they'll help
        you articulate *why* you hold that view, which makes it
        easier to write policy and talk to students about it.

        Here's the first question..."
```

Sandy tool additions (extend `ai-literacy-tools.ts`):

```typescript
{
  name: 'get_stance_profile',
  description: 'Get the faculty member\'s current AI stance, score, and when they last assessed',
  parameters: {},
  permission: 'auto',
  roles: ['EDUCATOR'],
}

{
  name: 'start_stance_assessment',
  description: 'Begin the guided stance reflection. Returns the first question.',
  parameters: {},
  permission: 'auto',
  roles: ['EDUCATOR'],
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `app/(pages)/ai-literacy/stance/page.tsx` | Main stance navigator page |
| `app/components/ai-literacy/StanceAssessment.tsx` | 10-question wizard component |
| `app/components/ai-literacy/StanceResult.tsx` | Results page with stance + explanation |
| `app/components/ai-literacy/StanceSpectrum.tsx` | Interactive spectrum visualization |
| `app/components/ai-literacy/StanceDetailCard.tsx` | Expanded detail for each stance position |
| `app/components/ai-literacy/CourseImpactPreview.tsx` | Per-course impact simulator |
| `app/components/ai-literacy/PeerDistribution.tsx` | Anonymized stance bar chart |
| `app/components/ai-literacy/StanceTimeline.tsx` | Evolution tracker |
| `app/lib/stance-service.ts` | Scoring, course impact analysis, peer distribution |
| `app/api/ai-literacy/stance/route.ts` | GET current stance, POST new assessment |
| `app/api/ai-literacy/stance/distribution/route.ts` | GET anonymized distribution |
| `app/api/ai-literacy/stance/history/route.ts` | GET stance history |

---

## API Endpoints

### `GET /api/ai-literacy/stance`
Returns current stance profile for authenticated user.

**Response:**
```json
{
  "stance": "GUIDED",
  "score": 3.1,
  "stanceUpdatedAt": "2026-03-15T10:00:00Z",
  "stanceRationale": "I want structured AI use with clear boundaries",
  "disciplineFamily": "HUMANITIES",
  "hasCompletedAssessment": true,
  "historyCount": 2
}
```

### `POST /api/ai-literacy/stance`
Submit assessment responses and save stance.

**Request:**
```json
{
  "responses": [
    { "questionId": "q1_discipline_values", "selectedOption": 2, "optionLabel": "Demonstrated understanding..." },
    { "questionId": "q2_assessment_philosophy", "selectedOption": 3, "optionLabel": "Critical thinking..." },
    ...
  ],
  "disciplineFamily": "HUMANITIES",
  "reflectionNote": "I realized I care more about process than I thought"
}
```

**Response:**
```json
{
  "stance": "GUIDED",
  "score": 3.1,
  "breakdown": {
    "disciplineValues": 2,
    "assessmentPhilosophy": 3,
    "learningLossConcern": 2,
    ...
  },
  "stanceDetail": { ... },
  "courseImpact": [ ... ]
}
```

### `GET /api/ai-literacy/stance/distribution`
Returns anonymized stance distribution.

**Query params:** `?disciplineFamily=HUMANITIES` (optional filter)

**Response:**
```json
{
  "total": 127,
  "distribution": {
    "PROHIBIT": 15,
    "CAUTIOUS": 36,
    "GUIDED": 48,
    "INTEGRATE": 20,
    "REQUIRE": 8
  },
  "filtered": {
    "label": "Humanities",
    "total": 23,
    "distribution": {
      "PROHIBIT": 7,
      "CAUTIOUS": 9,
      "GUIDED": 5,
      "INTEGRATE": 2,
      "REQUIRE": 0
    }
  },
  "sufficientData": true
}
```

### `GET /api/ai-literacy/stance/history`
Returns the user's stance evolution.

**Response:**
```json
{
  "history": [
    {
      "stance": "CAUTIOUS",
      "score": 2.3,
      "reflectionNote": "First time thinking about this systematically",
      "createdAt": "2026-01-15T10:00:00Z"
    },
    {
      "stance": "GUIDED",
      "score": 3.1,
      "reflectionNote": "After redesigning two assignments...",
      "createdAt": "2026-03-15T10:00:00Z"
    }
  ]
}
```

### `GET /api/ai-literacy/stance/course-impact`
Returns per-course impact analysis for the user's current stance.

**Response:**
```json
{
  "courses": [
    {
      "courseId": "...",
      "courseCode": "ENG 101",
      "title": "Introduction to Writing",
      "hasAIPolicy": false,
      "assignments": [
        {
          "id": "...",
          "title": "Essay 1",
          "category": "paper",
          "aiRisk": "HIGH",
          "riskReason": "Take-home essay with no process checkpoints"
        }
      ],
      "flaggedCount": 3,
      "totalAssignments": 8
    }
  ]
}
```

---

## Acceptance Criteria

- [ ] `/ai-literacy/stance` renders the stance navigator page
- [ ] 10-question assessment works as wizard: one question per screen, back/next, progress indicator
- [ ] Each question shows context paragraph sourced from DUS survey findings
- [ ] Assessment scoring correctly maps average to stance (5 buckets)
- [ ] Results page shows: recommended stance, score, per-question breakdown
- [ ] Stance spectrum is interactive: click any stance to see full detail card
- [ ] Detail cards include: philosophy, syllabus language, assignment implications, student communication, common concerns, discipline affinity
- [ ] Course impact preview loads instructor's actual courses and assignments
- [ ] Assignment AI risk heuristic categorizes by type/category (not Claude-powered — lightweight)
- [ ] Peer distribution shows bar chart with user's position marked
- [ ] Distribution hidden when n < 10 for a group (privacy)
- [ ] Stance history saved on each assessment completion
- [ ] Timeline view shows stance evolution with reflection notes
- [ ] "Retake assessment" and "Update stance manually" both available
- [ ] Manual stance update skips assessment, just picks from spectrum
- [ ] Sandy tools (`get_stance_profile`, `start_stance_assessment`) registered and functional
- [ ] `AILiteracyProfile` updated with stance on save
- [ ] All syllabus language in stance detail cards is copy-to-clipboard
- [ ] Mobile responsive: assessment is full-screen, spectrum scrolls horizontally
- [ ] No institutional bias: Prohibit and Require get equal quality of support content

---

## Content: Stance Detail Cards

### PROHIBIT
**Philosophy:** You believe students must develop skills without AI assistance. The learning process itself — struggling with ideas, finding your own voice, building from scratch — is the education. AI shortcuts that process.

**Syllabus language:** *"The use of generative AI tools (ChatGPT, Claude, Copilot, etc.) is not permitted for any assignment in this course unless explicitly stated otherwise. Work submitted must be entirely your own. Use of AI to generate, substantially edit, or restructure any portion of submitted work will be treated as academic misconduct under university policy. If you have questions about what constitutes permitted use, ask before submitting."*

**Assignment implications:**
- Favor in-class, proctored, or embodied assessments
- Process documentation (drafts, outlines, revision history) as evidence of authentic work
- Consider oral exams or presentations as alternative assessment
- Handwritten components where discipline-appropriate

**Student communication:** *"I'm asking you not to use AI in this course because the skills you're building here — [writing/analyzing/calculating/creating] — can only develop through practice. There are no shortcuts to learning to think. AI tools have their place, but not in this learning process."*

**Common concerns:**
- Students will use it anyway and you can't prove it
- You may feel out of step with institutional messaging
- Some students may view the policy as outdated

**Disciplines:** Creative writing, philosophy, foreign languages, mathematics (foundations), fine arts

**Peer practices from survey:**
- Shifting weight from take-home to in-class assessments
- Requiring handwritten drafts before typed submissions
- Designing assignments AI literally cannot do (embodied, experiential, community-based)

---

### CAUTIOUS
**Philosophy:** You allow AI for limited, low-stakes tasks (brainstorming, grammar checking, idea generation) but want students to do the substantive intellectual work themselves. AI is a tool in the toolbox, not a collaborator.

**Syllabus language:** *"You may use generative AI tools for brainstorming ideas, checking grammar, or clarifying concepts. You may NOT use AI to generate draft text, answer assignment questions, summarize readings, or produce any content that you submit as your own work. When in doubt, ask. Undisclosed AI use beyond these boundaries will be treated as a violation of academic integrity."*

**Assignment implications:**
- Clearly label which tasks allow AI and which don't
- "AI-free" zones for core skill-building assignments
- Require disclosure of any AI use, even permitted use
- Consider adding "How did you approach this?" reflection questions

**Student communication:** *"AI can help you brainstorm or clean up your writing, but the ideas, analysis, and arguments need to be yours. If you're not sure whether something crosses the line, that's a sign to stop and ask."*

**Common concerns:**
- The line between brainstorming and composing is fuzzy for students
- Enforcement is difficult for even "limited" use policies
- Students may not understand the distinction you're drawing

**Disciplines:** Sciences (lab courses), social sciences, education, general education/UK Core

**Peer practices:**
- "AI Use Scale" per assignment (adapted from CELT)
- Requiring first drafts before any AI editing
- In-class writing samples as baseline for comparison

---

### GUIDED
**Philosophy:** You believe AI should be part of the learning experience, but with explicit structure. Students need to learn *how* to use AI responsibly — when it helps, when it misleads, and how to maintain their own critical judgment alongside it.

**Syllabus language:** *"This course incorporates generative AI as a learning tool. Each assignment will specify the level of AI use permitted: Prohibited, Limited, Guided, or Required. When AI use is permitted, you must disclose how you used it and cite AI contributions. You are responsible for the accuracy and quality of all submitted work, regardless of whether AI was involved. Learning to use AI wisely is part of your education."*

**Assignment implications:**
- 4-level framework per assignment (Prohibited / Limited / Guided / Required)
- AI usage statements required on submissions
- Mix of AI-prohibited and AI-guided assignments within a course
- Reflection/critique components ("What did AI get wrong? What did you change?")

**Student communication:** *"I expect you to learn to use AI wisely — that means knowing when it helps and when it gets in the way of your learning. Some assignments in this course use AI; others don't. Pay attention to the expectations on each one."*

**Common concerns:**
- Managing a mix of policies within one course is complex
- Students may apply "guided" assumptions to "prohibited" assignments
- More grading work when evaluating AI usage statements

**Disciplines:** Social sciences, education, health sciences, interdisciplinary programs

**Peer practices:**
- Co-writing AI policy with students on first day
- Having students critique AI-generated outputs for accuracy
- Pairing AI-assisted take-home work with in-class oral defenses

---

### INTEGRATE
**Philosophy:** AI is a pedagogical tool, like a calculator or a library database. Your focus is on teaching students to use it *well* — to prompt effectively, evaluate outputs critically, and produce better work because of AI, not instead of their own thinking.

**Syllabus language:** *"Generative AI is integrated into this course as a learning tool. You will use AI in multiple assignments to brainstorm, draft, analyze, and iterate. You are expected to critically evaluate all AI-generated content, verify information, and take full responsibility for what you submit. Simply pasting AI output is not acceptable — the goal is to learn to work with AI, not to have AI work for you. Specific AI requirements will be noted on each assignment."*

**Assignment implications:**
- AI is the default for most assignments (some may still be AI-free for baseline skills)
- Assignments designed around AI interaction: prompt → evaluate → revise → reflect
- Assessment focuses on the student's judgment and additions, not just the final product
- Portfolio approaches that show the human-AI collaboration process

**Student communication:** *"AI is a powerful tool and you'll use it throughout this course. But using AI well is a skill — it takes practice, judgment, and critical thinking. I'll teach you how to evaluate what AI gives you, spot its weaknesses, and combine it with your own expertise."*

**Common concerns:**
- Students may lean on AI too heavily and miss foundational learning
- Hard to assess what the student actually contributed
- Staying current with rapidly evolving AI capabilities

**Disciplines:** Business, engineering, computer science, data science, journalism, design

**Peer practices:**
- Students build AI simulations and verify against their own calculations
- AI-generated first drafts that students must substantially revise with tracked changes
- Comparative analysis: student solution vs. AI solution vs. expert solution

---

### REQUIRE
**Philosophy:** AI fluency is a core learning outcome. Your graduates will use AI daily in their careers, and your course prepares them for that reality. Assessment focuses on AI-augmented output quality, prompt engineering skill, and professional judgment.

**Syllabus language:** *"This course requires the use of generative AI tools as part of your professional preparation. You will be assessed on your ability to effectively prompt AI systems, critically evaluate their outputs, and produce professional-quality work using human-AI collaboration. All AI use must be documented. You are responsible for accuracy, ethics, and quality of all submitted work. AI fluency is a course learning objective."*

**Assignment implications:**
- AI is mandatory for most/all assignments
- Prompt engineering is explicitly taught and assessed
- Output evaluation rubrics include AI collaboration quality
- Industry-standard AI tools may be specified
- Ethics component: bias, hallucination, appropriate use boundaries

**Student communication:** *"Your future employers expect you to work with AI. This course teaches you how — not just the mechanics, but the judgment. You'll learn what AI is good at, where it fails, and how to be the expert in the loop."*

**Common concerns:**
- Equity: not all students have equal AI tool access (cost, familiarity)
- Discipline may split on whether this is appropriate
- Rapidly changing tools make curriculum unstable

**Disciplines:** Business (analytics, strategy), software engineering, data science, digital marketing, instructional design

**Peer practices:**
- Advisory board-aligned AI competency frameworks
- Students document full prompt-response chains as part of submission
- Cross-comparison assignments: solve with AI vs. solve without → reflect on differences

---

## Privacy & FERPA Notes

- Individual stance data is private to the faculty member
- Peer distribution is anonymized and only shown when n ≥ 10
- Course impact preview uses only the instructor's own courses
- Assessment responses stored in `StanceHistory.responses` JSON — not shared
- DUS/department views see only aggregate counts, never individual faculty stances
- Sandy references stance only in private conversations with the faculty member
