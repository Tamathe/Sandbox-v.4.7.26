# PLAYGROUND SHOWCASE GALLERY — Architecture & Execution Plan

## What This Achieves

Adds 5 pre-built, visually stunning Playground templates that demonstrate the platform's capabilities across disciplines: Medicine, Law, Sciences, Business/Policy, and Fine Arts. These are designed for a leadership demo — each app is self-contained, immediately interactive, and optimized for a 60-90 second click-through on a laptop screen.

**Gallery Roster:**

| # | App | Category | College(s) | Demo Time |
|---|-----|----------|-----------|-----------|
| 1 | Pediatric Sepsis Triage Simulator | simulation | Medicine/Nursing | 90 sec |
| 2 | Constitutional Law Moot Court | quiz | Law | 60 sec |
| 3 | Chemistry Lab Safety Walkthrough | simulation | Sciences | 60 sec |
| 4 | University Budget Allocation Challenge | dashboard | Business/Policy | 90 sec |
| 5 | Music Theory Ear Training Lab | training (new) | Fine Arts | 60 sec |

**Recommended demo order:** Budget → Lab Safety → Moot Court → Ear Training → Pediatric Sepsis (closer/mic drop)

---

## Architectural Constraints

- **Zero schema changes.** All templates use the existing `PlaygroundTemplate` interface.
- **Zero new API routes.** Templates are static HTML loaded via the existing registry.
- **Zero new components.** Gallery page already exists at `/playground-templates`.
- **Single HTML files.** Each template is a self-contained HTML document with React 18 + Babel + Tailwind via CDN.
- **No external API calls.** All logic is pure JavaScript running in the iframe sandbox.
- **Laptop-first.** All layouts must work at 1366x768 minimum.
- **Tailwind v4** — utility classes in JSX only, no `@apply`.
- **lucide-react** — not applicable (templates are standalone HTML, no lucide dependency).

---

## Files to Create

| File | Purpose |
|------|---------|
| `app/lib/playground-templates/pediatric-sepsis.ts` | Template 1: Sepsis triage sim |
| `app/lib/playground-templates/moot-court.ts` | Template 2: Law moot court |
| `app/lib/playground-templates/lab-safety.ts` | Template 3: Chemistry lab safety |
| `app/lib/playground-templates/budget-allocation.ts` | Template 4: University budget sim |
| `app/lib/playground-templates/ear-training.ts` | Template 5: Music ear training |

## Files to Modify

| File | Change |
|------|--------|
| `app/lib/playground-templates/index.ts` | Extend category type with `'training'`, add 5 entries to `TEMPLATE_CATALOG`, add 5 cases to `loadTemplate()` switch |
| `app/playground-templates/page.tsx` | Add `'Training'` to `CATEGORIES` array, add `training` color to `CATEGORY_COLORS` |

---

## Shared HTML Skeleton

Every template follows this outer structure (matching `cardiac-arrest.ts`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{TITLE}}</title>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      window.parent.postMessage({ type: 'runtime-error', message: String(msg), source: src, line: line, column: col }, '*');
    };
    window.onunhandledrejection = function(e) {
      window.parent.postMessage({ type: 'runtime-error', message: String(e.reason) }, '*');
    };
  <\/script>
  <style>
    body { margin: 0; background: {{BG_COLOR}}; color: {{TEXT_COLOR}}; font-family: system-ui, sans-serif; }
    {{CUSTOM_KEYFRAMES}}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState, useReducer, useEffect, useRef, useCallback, useMemo } = React;
    {{APP_CODE}}
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  <\/script>
</body>
</html>
```

---

## Template 1: Pediatric Sepsis Triage Simulator

**Theme:** Dark medical monitor (`#0a0e1a` bg, `#00ff41` vitals green, `#ff3b3b` alarm red)
**`editorScrollTarget`:** `// 🩺 SEPSIS PROTOCOL ENGINE`

### State Machine
```
TRIAGE → ASSESSMENT → INTERVENTION → OUTCOME
```

### Core State (`useReducer`)
```typescript
{
  phase: 'triage' | 'assessment' | 'intervention' | 'outcome',
  clock: number,              // seconds elapsed (ticks every 1s)
  patient: {
    name: 'Maya Chen', age: 7,
    hr: 142, bp: [82, 48], spo2: 93, temp: 39.8, rr: 32, capRefill: 4,
    lactate: null, wbc: null, cultures: null,
    consciousness: 'irritable',
  },
  actions: string[],
  labsOrdered: string[],
  interventions: string[],
  goldenHourExpired: boolean,
  vitalsTrend: 'stable' | 'worsening' | 'improving' | 'critical',
}
```

### Vitals Drift Logic
- Every 15s without correct intervention: HR +3, BP -2, SpO2 -0.5
- Correct fluid bolus: stabilizes for 60s
- Antibiotics started: begins improvement trend after 30s delay
- If no antibiotics by 60 min (golden hour): outcome = poor regardless

### Component Tree
```
App
├── PatientBanner          (name, age, chief complaint, allergies)
├── VitalsMonitor          (6-panel grid: HR, BP, SpO2, Temp, RR, Cap Refill)
│   └── AnimatedWaveform   (SVG path, rhythm-driven via useRef + requestAnimationFrame)
├── ActionPanel            (4 tab groups)
│   ├── AssessTab          (Physical exam → reveals findings)
│   ├── LabsTab            (Order labs → results after delay)
│   ├── InterventionTab    (IV fluids, abx, vasopressors, O2)
│   └── EscalateTab        (Call attending, rapid response, PICU transfer)
├── EventLog              (scrollable timeline of actions + timestamps)
├── GoldenHourBar         (progress bar, green→yellow→red at 60 min)
└── OutcomeScreen         (scorecard: time-to-abx, bundle compliance, grade)
```

### Demo Flow (90s)
1. App loads → vitals animating, clock ticking, patient looks borderline
2. Click "Capillary Refill" in Assess → reveals "4 seconds, mottled extremities"
3. Click "Lactate" in Labs → spinner 3s → "4.2 mmol/L" (elevated)
4. Click "Blood Cultures" → "Collected"
5. Click "IV Normal Saline 20mL/kg" → vitals stabilize briefly
6. Click "Broad-Spectrum Antibiotics" → improvement trend begins
7. Vitals turn green, golden hour bar shows time-to-abx
8. Click "Finish" → scorecard: A grade, 8:32 to antibiotics, 5/6 bundle compliant

### Warm-Start Config
```typescript
{
  previewRatio: 0.65,
  autoRunPreview: true,
  chatCollapsed: true,
  bannerText: '🩺 A 7-year-old patient needs your help — assess vitals and intervene before the golden hour expires.',
  ctaLabel: '▶ Begin Triage',
  ctaPulseDurationMs: 30000,
}
```

---

## Template 2: Constitutional Law Moot Court

**Theme:** Light legal parchment (`#faf9f7` bg, `#1a1a2e` text, `#0033A0` UK blue accents, Georgia/serif headings)
**`editorScrollTarget`:** `// ⚖️ IRAC SCORING ENGINE`

### State Machine
```
READING → WRITING → SCORED → OPPOSITION
```

### Core State
```typescript
{
  phase: 'reading' | 'writing' | 'scored' | 'opposition',
  caseData: { title, facts, question, relevantPrecedents },
  studentArgs: { issue: '', rule: '', application: '', conclusion: '' },
  scores: { issue: 0, rule: 0, application: 0, conclusion: 0 },
  overallGrade: '',
  feedback: string[],
  opposingArg: string,
}
```

### Case: *Mercer v. State University*
A student athlete posted a TikTok criticizing the university president's handling of NIL policy. University suspended her from the team for 2 games citing "conduct detrimental." She sues claiming First Amendment violation. Key tension: public university (state actor) vs. team discipline authority. Relevant precedent: *Tinker v. Des Moines*, *Garcetti v. Ceballos*, *Mahanoy v. B.L.*

### IRAC Scoring Engine (keyword/heuristic, no LLM)
- **Issue (25 pts):** Keywords: "First Amendment", "free speech", "state actor", "student athlete rights." Length >20 words. Framed as question?
- **Rule (25 pts):** Citations: Tinker, Mahanoy, Garcetti. Legal standard: "material and substantial disruption", "off-campus speech". Multiple precedents = higher.
- **Application (30 pts):** References case facts (TikTok, NIL, suspension). Applies legal standard. Considers counterarguments.
- **Conclusion (20 pts):** Clear holding. Consistent with analysis. Addresses remedy.

**Pre-filled demo argument:** Competent but flawed (~72/100). Missing *Mahanoy* citation, weak off-campus distinction, thin conclusion. Click "Submit" immediately during demo.

### Component Tree
```
App
├── CaseHeader            (case title, court seal icon)
├── FactPattern           (scrollable case facts, serif typography)
├── IracEditor            (4-section structured input)
│   ├── SectionInput ×4   (label, placeholder, textarea, word count)
│   └── SubmitButton
├── ScorePanel            (4 animated SVG circular progress rings + grade)
│   └── FeedbackList      (per-section strengths/weaknesses)
└── OppositionPanel       (slide-in counter-argument card)
```

### Demo Flow (60s)
1. App loads → case facts visible, pre-filled IRAC argument
2. Scroll briefly to show fact pattern
3. Click "Submit Argument"
4. Score rings animate (issue: 80, rule: 65, application: 78, conclusion: 60 → B-)
5. Feedback: "Consider citing Mahanoy v. B.L. for off-campus speech"
6. Opposition panel slides in targeting weakest section

### Warm-Start Config
```typescript
{
  previewRatio: 0.65,
  autoRunPreview: true,
  chatCollapsed: true,
  bannerText: '⚖️ Read the case, write your argument using IRAC structure, then submit for scoring.',
  ctaLabel: '▶ Read the Case',
  ctaPulseDurationMs: 25000,
}
```

---

## Template 3: Chemistry Lab Safety Walkthrough

**Theme:** Clean lab environment (`#f8fafc` bg, `#1e293b` text, `#dc2626` hazard red, `#16a34a` safe green)
**`editorScrollTarget`:** `// 🧪 HAZARD DETECTION ENGINE`

### State Machine
```
BRIEFING → HAZARD_HUNT → SPILL_RESPONSE → RESULTS
```

### Core State (`useReducer`)
```typescript
{
  phase: 'briefing' | 'hunt' | 'spill' | 'results',
  timer: number,
  hazards: Hazard[],         // 6 total
  hazardsFound: number,
  spillSteps: string[],
  correctSpillOrder: string[],
  score: { hazardScore: number, spillScore: number, overall: string },
}
```

### 6 Hazards
| # | Hazard | Standard |
|---|--------|----------|
| 1 | Unlabeled beaker with clear liquid | GHS Art. 17 |
| 2 | Safety goggles on bench, not worn | OSHA 1910.133 |
| 3 | Chemicals stored above eye level | OSHA 1910.106 |
| 4 | Coffee cup near chemicals | OSHA 1910.141 |
| 5 | Blocked emergency eyewash station | ANSI Z358.1 |
| 6 | Cracked fume hood glass | OSHA 1910.1450 |

### Lab Bench Rendering
Pure HTML/CSS — no images. Gray bench surface with grid lines, colored div "beakers", emoji icons for equipment. Each hazard is a clickable hotspot with `position: absolute` and subtle `@keyframes hazard-pulse` animation.

### Spill Response
Animated acid spill (CSS gradient expanding). 6 draggable cards (HTML5 Drag & Drop API) into numbered slots:
1. Alert others → 2. Don PPE → 3. Contain spill → 4. Neutralize → 5. Clean up → 6. Report

### Component Tree
```
App
├── Briefing              (intro, "Begin Inspection" button, timer preview)
├── LabBench              (relative-positioned container)
│   ├── BenchSurface      (styled div grid)
│   ├── HazardHotspot ×6  (absolute-positioned, pulsing)
│   └── HazardDrawer      (slides up: description, standard, fix)
├── SpillScene            (animated spill + drag-and-drop steps)
├── TimerBar              (countdown, green→yellow→red)
└── ResultsScreen         (hazards table + spill accuracy + grade)
```

### Demo Flow (60s)
1. App loads → briefing, hit "Begin Inspection"
2. Lab bench appears, hotspots pulsing
3. Click 3-4 hazards → drawer slides up each time
4. Click "Trigger Spill Drill" → spill animation
5. Drag steps into order
6. Submit → results: "5/6 hazards, 5/6 spill order, Grade: A-"

### Warm-Start Config
```typescript
{
  previewRatio: 0.6,
  autoRunPreview: true,
  chatCollapsed: true,
  bannerText: '🧪 Inspect the lab bench for safety hazards, then respond to an acid spill emergency.',
  ctaLabel: '▶ Begin Inspection',
  ctaPulseDurationMs: 25000,
}
```

---

## Template 4: University Budget Allocation Challenge

**Theme:** Data-viz professional (`#0f172a` dark slate bg, `#3b82f6` blue accents, `#10b981` positive green, `#ef4444` negative red)
**`editorScrollTarget`:** `// 📊 BUDGET CONSEQUENCE ENGINE`

### State Machine
```
ROUND_1_BASELINE → ROUND_2_CRISIS → ROUND_3_OPPORTUNITY → FINAL_REPORT
```

### Core State (`useReducer`)
```typescript
{
  round: 1 | 2 | 3 | 'final',
  totalBudget: 500_000_000,
  allocations: Record<Category, number>,  // percentages, must sum to 100
  kpis: Record<KPI, number>,
  roundHistory: RoundSnapshot[],
  crisisApplied: boolean,
  giftApplied: boolean,
}
```

### Consequence Matrix
```typescript
const INFLUENCE: Record<Category, Partial<Record<KPI, number>>> = {
  financialAid:    { enrollment: 0.35, graduationRate: 0.25, studentSatisfaction: 0.15 },
  athletics:       { alumniGiving: 0.30, enrollment: 0.10, facultyRetention: -0.05 },
  research:        { researchOutput: 0.40, facultyRetention: 0.20 },
  facultySalaries: { facultyRetention: 0.35, researchOutput: 0.15 },
  facilities:      { studentSatisfaction: 0.25, enrollment: 0.10 },
  technology:      { graduationRate: 0.10, researchOutput: 0.10, studentSatisfaction: 0.05 },
  studentServices: { graduationRate: 0.20, studentSatisfaction: 0.20 },
  marketing:       { enrollment: 0.20, alumniGiving: 0.05 },
}
```

KPI calculation: weighted sum of (allocation % × influence weight), normalized to 0-100, diminishing returns above 20% (log curve).

### Radar Chart
Pure SVG — 6-axis polygon. Student's polygon overlays semi-transparent peer R1 reference polygon.

### Round Mechanics
- **Round 1:** $500M, balanced baseline. Student adjusts freely.
- **Round 2:** State funding cut, budget drops to $425M (-15%). Background pulses red.
- **Round 3:** $50M donor gift, restricted to 2 of 8 categories (student picks). Background pulses gold.

### Component Tree
```
App
├── RoundBanner           (round indicator, budget total, crisis/opportunity banner)
├── AllocationPanel       (left side)
│   ├── BudgetSlider ×8   (range input, icon, label, %, dollar amount)
│   └── TotalValidator    (remaining %, locks submit if ≠ 100%)
├── ConsequencePanel      (right side)
│   ├── KpiCard ×6        (metric, value, delta arrow, sparkline)
│   └── RadarChart        (SVG polygon vs. peer benchmark)
├── RoundTransition       (animated overlay: crisis or gift announcement)
└── FinalReport           (3-round comparison, radar, narrative summary)
```

### Slider Mechanic
Independent sliders (not auto-balancing). Running total shown. Submit disabled until sum = 100%.

### Demo Flow (90s)
1. App loads → Round 1, balanced allocation, baseline KPIs
2. Drag "Financial Aid" up → enrollment ticks up, radar shifts
3. Drag "Athletics" down → alumni giving drops
4. Submit → Round 2 crisis banner, budget drops
5. Quick rebalance, submit → Round 3 gold gift
6. Pick 2 categories, submit → Final Report with radar overlay + narrative

### Warm-Start Config
```typescript
{
  previewRatio: 0.65,
  autoRunPreview: true,
  chatCollapsed: true,
  bannerText: '📊 You are the CFO of a university. Allocate $500M across 8 categories and see the consequences.',
  ctaLabel: '▶ Start Budget Round',
  ctaPulseDurationMs: 30000,
}
```

---

## Template 5: Music Theory Ear Training Lab

**Theme:** Warm music studio (`#1c1917` espresso bg, `#fbbf24` amber accents, `#f5f5f4` cream text)
**`editorScrollTarget`:** `// 🎵 WEB AUDIO SYNTHESIZER`

### State Machine
```
MODULE_SELECT → LISTENING → ANSWERED → (loop or SUMMARY)
```

### Core State (`useReducer`)
```typescript
{
  module: 'intervals' | 'chords' | 'progressions',
  difficulty: 1 | 2 | 3,
  currentChallenge: Challenge | null,
  answered: boolean,
  selectedAnswer: string | null,
  correct: boolean | null,
  streak: number,
  bestStreak: number,
  totalCorrect: number,
  totalAttempted: number,
  history: AnswerRecord[],
}
```

### Web Audio Synthesizer
- `AudioContext` + `OscillatorNode` (sine wave)
- `GainNode` ADSR envelope (attack: 0.02s, decay: 0.1s, sustain: 0.7, release: 0.3s)
- Intervals: two notes sequentially (0.6s gap)
- Chords: 3-4 notes simultaneously
- Progressions: 4 chords sequentially (0.8s each)
- MIDI-to-frequency: `440 * 2^((midi - 69) / 12)`

### Challenge Generation
- **Intervals:** Easy = 6 common ascending. Medium = +descending. Hard = harmonic + all 12.
- **Chords:** Easy = major/minor. Medium = +dim/aug. Hard = all 6 + inversions.
- **Progressions:** Easy = 4 common in C. Medium = 6 in random keys. Hard = all 8 + minor keys.

### Piano Keyboard Visual
Pure CSS — 2 octaves (C3-B4). White keys as `div`s, black keys absolutely positioned. Active notes highlight amber on playback.

### Component Tree
```
App
├── ModuleTabs            (Intervals | Chords | Progressions)
├── DifficultyBadge       (★/★★/★★★ — auto-advances after 5-streak)
├── StatsBar              (streak fire, accuracy %, total attempted)
├── ChallengeArea
│   ├── PlayButton        (large, centered, amber, "Play")
│   ├── PianoKeyboard     (2-octave CSS piano, highlights notes)
│   └── AnswerGrid        (button grid of choices)
├── FeedbackFlash         (green ✓ or red ✗, 0.5s)
└── StreakFire             (flame animation on 5+ streak)
```

### Demo Flow (60s)
1. App loads → "Intervals" tab, warm UI
2. Click "Play" → two notes (perfect fourth)
3. Click "Perfect 4th" → green flash, streak 1, piano highlights C and F
4. Play again → minor third → answer → streak 2
5. Switch to "Chords" → Play → major chord
6. Answer → sound in the room is the differentiator

### Warm-Start Config
```typescript
{
  previewRatio: 0.6,
  autoRunPreview: true,
  chatCollapsed: true,
  bannerText: '🎵 Put on your headphones — or let the room hear it. Click Play to start ear training.',
  ctaLabel: '▶ Play First Note',
  ctaPulseDurationMs: 25000,
}
```

---

## Execution Plan — Chunked (max 2 tasks per chunk)

### Chunk 1: Registry + Pediatric Sepsis
- **Task 1A:** Update `index.ts` (extend category type, add 5 catalog entries, add 5 switch cases) + update `page.tsx` (add Training category + color)
- **Task 1B:** Create `pediatric-sepsis.ts` — full template with vitals monitor, action panel, golden hour bar, outcome scorecard

### Chunk 2: Moot Court + Lab Safety
- **Task 2A:** Create `moot-court.ts` — full template with IRAC editor, keyword scoring engine, score rings, opposition panel, pre-filled demo argument
- **Task 2B:** Create `lab-safety.ts` — full template with CSS lab bench, 6 hazard hotspots, spill animation, drag-and-drop protocol, results screen

### Chunk 3: Budget Allocation + Ear Training
- **Task 3A:** Create `budget-allocation.ts` — full template with 8 sliders, consequence matrix, KPI cards, SVG radar chart, 3 rounds, final report
- **Task 3B:** Create `ear-training.ts` — full template with Web Audio synthesizer, CSS piano keyboard, 3 modules, streak system, difficulty progression

---

## Handoff Prompts

### Chunk 1 Handoff Prompt

````markdown
```
You are continuing a sprint to build 5 Playground showcase templates for The Sandbox (University of Kentucky educational platform).

## Context
The Playground is an AI-powered code generator that produces complete, runnable React web apps as single HTML files. Apps use React 18 + Babel + Tailwind CSS v4 via CDN, run in an iframe sandbox, and require zero backend. The template system is defined in `app/lib/playground-templates/index.ts` with a `TEMPLATE_CATALOG` array and `loadTemplate()` switch. Each template is a separate `.ts` file exporting `TEMPLATE_META` (PlaygroundTemplate type) and `TEMPLATE_HTML` (string). The gallery page is at `app/playground-templates/page.tsx`.

Read the full architecture doc at: `c:\AA Code\Educator marketplace\Blueprints\playground-showcase-gallery.md`

Read the existing template system files first:
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\index.ts`
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\cardiac-arrest.ts` (pattern to follow)
- `c:\AA Code\Educator marketplace\the-sandbox\app\playground-templates\page.tsx`

## Your Goal — Chunk 1 (2 tasks only, then STOP)

### Task 1A: Registry Updates
1. In `index.ts`: extend the `category` type in `PlaygroundTemplate` to include `'training'`
2. Add all 5 templates to `TEMPLATE_CATALOG` (use the metadata from the blueprint)
3. Add all 5 `case` branches to the `loadTemplate()` switch (dynamic imports)
4. In `page.tsx`: add `'Training'` to the `CATEGORIES` array and `training: 'bg-emerald-50 text-emerald-700'` to `CATEGORY_COLORS`

### Task 1B: Pediatric Sepsis Triage Simulator
Create `app/lib/playground-templates/pediatric-sepsis.ts` following the exact pattern of `cardiac-arrest.ts`.

Requirements from the blueprint:
- Theme: Dark medical monitor (#0a0e1a bg, #00ff41 vitals green, #ff3b3b alarm red)
- Patient: Maya Chen, age 7, presenting with fever, irritability, mottled skin
- Animated vitals monitor (HR, BP, SpO2, Temp, RR, Cap Refill) using SVG waveforms via requestAnimationFrame
- 4-tab action panel: Assess, Labs, Intervene, Escalate
- Vitals drift: every 15s without intervention HR +3, BP -2, SpO2 -0.5
- Golden hour progress bar (green→yellow→red)
- Correct path: blood cultures → IV fluids → broad-spectrum antibiotics
- Outcome scorecard: time-to-antibiotics, Surviving Sepsis Campaign bundle compliance, letter grade
- Event log with timestamps
- editorScrollTarget: '// 🩺 SEPSIS PROTOCOL ENGINE'
- Must look incredible — smooth animations, professional medical UI, dramatic color transitions

CRITICAL: The HTML must be visually stunning. This is for a leadership demo. Use CSS animations, gradients, glassmorphism-style panels, and smooth transitions. The vitals waveform animation is the hero visual — make it beautiful.

## After completing these 2 tasks:
1. Run `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\` to verify no errors
2. Generate the next handoff prompt for Chunk 2 (Moot Court + Lab Safety) using the same format, referencing the blueprint doc
```
````

### Chunk 2 Handoff Prompt

````markdown
```
You are continuing a sprint to build 5 Playground showcase templates for The Sandbox (University of Kentucky educational platform).

## Context
The Playground template system is at `app/lib/playground-templates/`. Registry updates and the Pediatric Sepsis template were completed in Chunk 1. The architecture doc is at `c:\AA Code\Educator marketplace\Blueprints\playground-showcase-gallery.md` — read it for full specs.

Read these files first:
- `c:\AA Code\Educator marketplace\Blueprints\playground-showcase-gallery.md` (full architecture)
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\index.ts` (registry)
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\cardiac-arrest.ts` (pattern to follow)
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\pediatric-sepsis.ts` (Chunk 1 output — match quality)

## Your Goal — Chunk 2 (2 tasks only, then STOP)

### Task 2A: Constitutional Law Moot Court
Create `app/lib/playground-templates/moot-court.ts`.

Requirements from the blueprint:
- Theme: Light legal parchment (#faf9f7 bg, #1a1a2e text, #0033A0 UK blue, Georgia/serif headings)
- Case: Mercer v. State University — student athlete suspended for TikTok criticizing president's NIL policy. First Amendment vs institutional authority.
- IRAC structured editor: 4 sections (Issue, Rule, Application, Conclusion) with placeholder hints
- Pre-filled demo argument (~72/100 quality) so presenter can click Submit immediately
- Keyword/heuristic scoring engine (no LLM) checking for: Tinker, Mahanoy, Garcetti citations; legal standards; fact references; question framing
- 4 animated SVG circular progress rings (one per IRAC section) that fill on scoring
- Overall grade (A-F) with per-section feedback
- Opposition panel that slides in from right with counter-argument targeting weakest section
- editorScrollTarget: '// ⚖️ IRAC SCORING ENGINE'

### Task 2B: Chemistry Lab Safety Walkthrough
Create `app/lib/playground-templates/lab-safety.ts`.

Requirements from the blueprint:
- Theme: Clean lab (#f8fafc bg, #1e293b text, #dc2626 hazard red, #16a34a safe green)
- Pure HTML/CSS lab bench illustration (no images) — styled divs, emoji equipment icons
- 6 clickable hazard hotspots with subtle pulse animation and absolute positioning
- Each click reveals a drawer with: what's wrong, OSHA/GHS standard violated, correct fix
- Timed hazard hunt phase (3 minutes countdown)
- Spill response phase: animated acid spill (CSS gradient expanding), 6 draggable protocol steps using HTML5 Drag & Drop API
- Results screen: hazards found/missed table, spill protocol accuracy, overall grade
- editorScrollTarget: '// 🧪 HAZARD DETECTION ENGINE'

CRITICAL: Both templates must be visually stunning for a leadership demo. The moot court needs elegant legal typography. The lab safety needs an immediately engaging illustrated lab environment.

## After completing these 2 tasks:
1. Run `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\` to verify no errors
2. Generate the next handoff prompt for Chunk 3 (Budget Allocation + Ear Training) using the same format, referencing the blueprint doc
```
````

### Chunk 3 Handoff Prompt

````markdown
```
You are continuing a sprint to build 5 Playground showcase templates for The Sandbox (University of Kentucky educational platform).

## Context
The Playground template system is at `app/lib/playground-templates/`. Chunks 1-2 completed: registry updates, Pediatric Sepsis, Moot Court, and Lab Safety templates. The architecture doc is at `c:\AA Code\Educator marketplace\Blueprints\playground-showcase-gallery.md` — read it for full specs.

Read these files first:
- `c:\AA Code\Educator marketplace\Blueprints\playground-showcase-gallery.md` (full architecture)
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\index.ts` (registry)
- `c:\AA Code\Educator marketplace\the-sandbox\app\lib\playground-templates\cardiac-arrest.ts` (pattern to follow)
- At least one Chunk 1-2 template to match quality bar

## Your Goal — Chunk 3 (2 tasks only, then STOP)

### Task 3A: University Budget Allocation Challenge
Create `app/lib/playground-templates/budget-allocation.ts`.

Requirements from the blueprint:
- Theme: Data-viz professional (#0f172a dark slate bg, #3b82f6 blue, #10b981 green, #ef4444 red)
- 8 budget category sliders (Financial Aid, Athletics, Research, Faculty Salaries, Facilities, Technology, Student Services, Marketing)
- Consequence matrix: each category has weighted influence on 6 KPIs (enrollment, graduation rate, research output, alumni giving, student satisfaction, faculty retention)
- Real-time KPI updates as sliders move — animated KPI cards with delta arrows
- Pure SVG radar chart: 6-axis polygon, student allocation vs peer R1 benchmark overlay
- 3 rounds: baseline ($500M) → state funding crisis (-15% to $425M) → $50M donor gift (restricted to 2 categories)
- Round transition animations (red pulse for crisis, gold for gift)
- Final report: 3-round comparison table, radar overlay, narrative summary text
- Independent sliders (not auto-balancing), submit disabled until sum = 100%
- editorScrollTarget: '// 📊 BUDGET CONSEQUENCE ENGINE'

### Task 3B: Music Theory Ear Training Lab
Create `app/lib/playground-templates/ear-training.ts`.

Requirements from the blueprint:
- Theme: Warm music studio (#1c1917 espresso bg, #fbbf24 amber accents, #f5f5f4 cream text)
- Web Audio API synthesizer: OscillatorNode (sine wave) + GainNode ADSR envelope
- MIDI-to-frequency conversion: 440 * 2^((midi - 69) / 12)
- 3 modules via tabs: Intervals, Chords, Progressions
- Intervals: play 2 notes sequentially, identify (minor 2nd through octave)
- Chords: play 3-4 simultaneous notes, identify (major, minor, dim, aug, dom7, maj7)
- Progressions: play 4-chord sequence, identify with Roman numerals
- Pure CSS piano keyboard (2 octaves C3-B4) — white key divs, black keys absolute-positioned, amber highlight on active notes
- Difficulty auto-progression after 5 consecutive correct (3 levels)
- Streak counter with flame animation
- Green/red flash feedback on answer
- Answer buttons that light up correct answer after selection
- editorScrollTarget: '// 🎵 WEB AUDIO SYNTHESIZER'

CRITICAL: Both must be visually stunning. The budget app needs satisfying slider interactions and a beautiful radar chart. The ear training lab needs actual working audio (Web Audio API) and a gorgeous CSS piano keyboard. Sound coming out of speakers during the demo is the differentiator for this template.

## After completing these 2 tasks:
1. Run `npm run build` from `c:\AA Code\Educator marketplace\the-sandbox\` to verify no errors
2. Test all 5 templates load correctly by verifying the imports in index.ts resolve
3. Output a summary of all 5 completed templates with their gallery metadata
```
````
