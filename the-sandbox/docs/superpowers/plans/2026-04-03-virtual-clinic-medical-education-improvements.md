# Virtual Clinic Medical Education Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Virtual Clinic with 5 high-impact medical education improvements: illness script comparison in feedback, patient affect dynamics, scaffolding toggle, semantic domain classification, and near-miss differential feedback.

**Architecture:** Each improvement adds to the existing Virtual Clinic service layer (`app/lib/virtual-clinic/`) and encounter UI (`app/virtual-clinic/encounter/[encounterId]/page.tsx`). No schema migrations needed — all new data fits into existing `Json` fields on `ClinicalCase` and `ClinicalEncounter`. The scoring service gains 3 new Haiku-powered analyses; the patient prompt service gains an affect state tracker; the encounter page gains new feedback components and an optional scaffolding layer.

**Tech Stack:** Next.js 16, TypeScript, Tailwind v4, Prisma/Neon (Json fields), Anthropic Haiku (scoring), recharts (radar chart in feedback), vitest (tests).

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `app/lib/virtual-clinic/illness-script-service.ts` | Builds expert illness script comparison from case answer key + student artifacts |
| `app/lib/virtual-clinic/near-miss-service.ts` | Generates near-miss analysis for differential diagnoses |
| `app/lib/virtual-clinic/affect-engine.ts` | Computes patient engagement level from transcript patterns |
| `app/lib/virtual-clinic/scaffolding-service.ts` | Generates metacognitive prompts when scaffolding is enabled |
| `app/lib/virtual-clinic/semantic-classifier.ts` | Post-hoc Haiku classification of student questions into clinical domains |
| `app/components/virtual-clinic/IllnessScriptComparison.tsx` | Side-by-side student vs expert illness script table in feedback |
| `app/components/virtual-clinic/NearMissFeedback.tsx` | Near-miss differential analysis cards in feedback |
| `app/components/virtual-clinic/ScaffoldingBanner.tsx` | Optional metacognitive prompt banner during history-taking |

### Modified Files
| File | What Changes |
|------|-------------|
| `app/lib/virtual-clinic/types.ts` | Add `IllnessScript`, `NearMissAnalysis`, `ScaffoldingLevel`, `AffectState` types |
| `app/lib/virtual-clinic/scoring-service.ts` | Add illness script + near-miss generation in scoring flow; add semantic classification call |
| `app/lib/virtual-clinic/patient-prompt-service.ts` | Add affect-aware personality modulation to system prompt |
| `app/lib/virtual-clinic/encounter-service.ts` | Add `engagementLevel` tracking on transcript append; add scaffolding check |
| `app/virtual-clinic/encounter/[encounterId]/page.tsx` | Add IllnessScriptComparison + NearMissFeedback in FeedbackView; add ScaffoldingBanner; show engagement indicator |
| `app/api/virtual-clinic/encounters/[encounterId]/chat/route.ts` | Pass affect state to prompt builder |
| `app/api/virtual-clinic/encounters/[encounterId]/score/route.ts` | Return illness script + near-miss data |

---

## Task 1: Add New Types

**Files:**
- Modify: `app/lib/virtual-clinic/types.ts`

- [ ] **Step 1: Add illness script, near-miss, scaffolding, and affect types**

At the end of `app/lib/virtual-clinic/types.ts` (after the `ClinicalCaseListItem` interface, line 121), add:

```typescript
// ─── Illness Script Comparison ─────────────────────────────────────────────

export interface IllnessScriptRow {
  element: string
  studentModel: string
  expertModel: string
  alignment: 'match' | 'partial' | 'gap'
}

export interface IllnessScriptComparison {
  rows: IllnessScriptRow[]
  overallAlignment: number // 0-100
}

// ─── Near-Miss Differential Analysis ───────────────────────────────────────

export interface NearMissEntry {
  diagnosis: string
  status: 'correct' | 'present-but-misranked' | 'missing' | 'extraneous'
  explanation: string
  teachingPoint: string
}

export interface NearMissAnalysis {
  entries: NearMissEntry[]
  primaryDiagnosisCorrect: boolean
}

// ─── Scaffolding ───────────────────────────────────────────────────────────

export type ScaffoldingLevel = 'none' | 'light' | 'full'

export interface ScaffoldingPrompt {
  message: string
  type: 'metacognitive' | 'domain-hint'
}

// ─── Patient Affect ────────────────────────────────────────────────────────

export interface AffectState {
  engagementLevel: number // 0-100
  lastDelta: number       // positive = warming, negative = closing
  reason: string          // brief explanation
}

// ─── Semantic Domain Classification ────────────────────────────────────────

export interface DomainClassification {
  question: string
  domains: string[]
  confidence: number // 0-1
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to virtual-clinic types

- [ ] **Step 3: Commit**

```bash
git add app/lib/virtual-clinic/types.ts
git commit -m "feat(virtual-clinic): add illness script, near-miss, affect, scaffolding types

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Illness Script Comparison Service

**Files:**
- Create: `app/lib/virtual-clinic/illness-script-service.ts`

- [ ] **Step 1: Create the illness script service**

Create `app/lib/virtual-clinic/illness-script-service.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { IllnessScriptComparison, DifferentialEntry } from './types'

const anthropic = new Anthropic()

/**
 * Builds an illness script comparison between the student's clinical reasoning
 * (extracted from their problem representation + differential + plan) and the
 * expert model (derived from the case answer key).
 *
 * The 6 illness script elements (Bowen, 2006):
 *   Epidemiology, Pathophysiology, Enabling Conditions,
 *   Clinical Features, Distinguishing Features, Course/Prognosis
 */
export async function buildIllnessScriptComparison(
  studentProblemRep: string | null,
  studentDifferentials: DifferentialEntry[] | null,
  studentPlan: unknown,
  caseAnswerKey: {
    correctDifferentials: unknown
    keyHistoryQuestions: unknown
    criticalActions: unknown
    learningObjectives: string[]
    historyOfPresentIllness: unknown
    patientAge: number
    patientSex: string
    socialHistory: unknown
    familyHistory: unknown
  },
): Promise<IllnessScriptComparison> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are a clinical education illness script analyzer. Compare a student's clinical reasoning against an expert model. Return JSON only.`,
    messages: [{
      role: 'user',
      content: `## Expert Case Data
Correct Differentials: ${JSON.stringify(caseAnswerKey.correctDifferentials, null, 2)}
Key History: ${JSON.stringify(caseAnswerKey.keyHistoryQuestions)}
Critical Actions: ${JSON.stringify(caseAnswerKey.criticalActions)}
Learning Objectives: ${JSON.stringify(caseAnswerKey.learningObjectives)}
HPI: ${JSON.stringify(caseAnswerKey.historyOfPresentIllness)}
Patient: ${caseAnswerKey.patientAge}yo ${caseAnswerKey.patientSex}
Social: ${JSON.stringify(caseAnswerKey.socialHistory)}
Family: ${JSON.stringify(caseAnswerKey.familyHistory)}

## Student's Work
Problem Representation: ${studentProblemRep ?? '(not submitted)'}
Differential: ${JSON.stringify(studentDifferentials ?? [])}
Plan: ${JSON.stringify(studentPlan ?? {})}

Build a 6-row illness script comparison. For each element, extract what the student demonstrated vs. what the expert model shows.

Return JSON:
{
  "rows": [
    {
      "element": "Epidemiology",
      "studentModel": "what the student's reasoning reveals about their epidemiological thinking",
      "expertModel": "the correct epidemiological context from the case",
      "alignment": "match|partial|gap"
    },
    { "element": "Pathophysiology", ... },
    { "element": "Enabling Conditions", ... },
    { "element": "Clinical Features", ... },
    { "element": "Distinguishing Features", ... },
    { "element": "Course & Prognosis", ... }
  ],
  "overallAlignment": 0-100
}

Rules:
- "match" = student captured the key elements
- "partial" = student mentioned related concepts but missed key details
- "gap" = student's reasoning shows no evidence of considering this element
- Be specific — quote from the student's work where possible
- Keep each field under 2 sentences`,
    }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
  return JSON.parse(jsonMatch[1]!.trim()) as IllnessScriptComparison
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/lib/virtual-clinic/illness-script-service.ts
git commit -m "feat(virtual-clinic): add illness script comparison service

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Near-Miss Differential Service

**Files:**
- Create: `app/lib/virtual-clinic/near-miss-service.ts`

- [ ] **Step 1: Create the near-miss service**

Create `app/lib/virtual-clinic/near-miss-service.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { NearMissAnalysis, DifferentialEntry } from './types'

const anthropic = new Anthropic()

/**
 * Generates near-miss analysis for the student's differential diagnosis.
 * Instead of binary "correct/incorrect", explains WHY each diagnosis
 * was included/excluded and what the teaching point is.
 */
export async function analyzeNearMisses(
  studentDifferentials: DifferentialEntry[] | null,
  correctDifferentials: unknown,
  historyOfPresentIllness: unknown,
): Promise<NearMissAnalysis> {
  if (!studentDifferentials || studentDifferentials.length === 0) {
    return { entries: [], primaryDiagnosisCorrect: false }
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: `You are a clinical reasoning educator. Analyze each diagnosis in the student's differential and compare it to the correct answer key. For each entry, provide a specific teaching point. Return JSON only.`,
    messages: [{
      role: 'user',
      content: `## Correct Differentials (answer key)
${JSON.stringify(correctDifferentials, null, 2)}

## HPI Context
${JSON.stringify(historyOfPresentIllness, null, 2)}

## Student's Differential List (ranked)
${JSON.stringify(studentDifferentials, null, 2)}

For EACH correct diagnosis (from the answer key), determine its status in the student's list.
Then for each EXTRA diagnosis the student included that isn't in the answer key, mark it extraneous.

Return JSON:
{
  "entries": [
    {
      "diagnosis": "diagnosis name",
      "status": "correct|present-but-misranked|missing|extraneous",
      "explanation": "Why this diagnosis is/isn't appropriate — reference specific clinical features",
      "teachingPoint": "One-sentence clinical pearl (e.g. 'Duration >6 weeks favors MDD over Adjustment Disorder')"
    }
  ],
  "primaryDiagnosisCorrect": true/false
}

Rules:
- "correct" = present AND ranked appropriately (within 1 rank of expected)
- "present-but-misranked" = present but ranked too high or too low
- "missing" = in answer key but not in student's list
- "extraneous" = in student's list but not in answer key — may still be reasonable
- Teaching points must be specific to THIS case, not generic
- For misranked entries: explain what clinical features should have changed the ranking`,
    }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
  return JSON.parse(jsonMatch[1]!.trim()) as NearMissAnalysis
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/lib/virtual-clinic/near-miss-service.ts
git commit -m "feat(virtual-clinic): add near-miss differential analysis service

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Semantic Domain Classifier

**Files:**
- Create: `app/lib/virtual-clinic/semantic-classifier.ts`

- [ ] **Step 1: Create the semantic classifier service**

Create `app/lib/virtual-clinic/semantic-classifier.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { DomainClassification, TranscriptMessage } from './types'

const anthropic = new Anthropic()

const CLINICAL_DOMAINS = [
  'cardiovascular', 'respiratory', 'gastrointestinal', 'neurological',
  'musculoskeletal', 'genitourinary', 'endocrine', 'psychiatric',
  'dermatological', 'hematological', 'immunological', 'constitutional',
  'social-history', 'family-history', 'medications', 'allergies', 'past-medical',
]

/**
 * Post-encounter semantic classification of student questions into clinical domains.
 * Replaces reliance on AI patient's <!--DOMAIN:xxx--> markers with a dedicated
 * classification pass. Supports multi-domain classification per question.
 */
export async function classifyTranscriptDomains(
  transcript: TranscriptMessage[],
): Promise<{ domainsHit: Record<string, boolean>; classifications: DomainClassification[] }> {
  const studentQuestions = transcript
    .filter((m) => m.role === 'user' && m.phase === 'HISTORY_TAKING')
    .map((m) => m.content)

  if (studentQuestions.length === 0) {
    return { domainsHit: {}, classifications: [] }
  }

  // Batch questions in groups of 10 to stay within token limits
  const batches: string[][] = []
  for (let i = 0; i < studentQuestions.length; i += 10) {
    batches.push(studentQuestions.slice(i, i + 10))
  }

  const allClassifications: DomainClassification[] = []

  for (const batch of batches) {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: `You are a clinical domain classifier. Classify each student question into one or more clinical history-taking domains. Return JSON only.`,
      messages: [{
        role: 'user',
        content: `## Available Domains
${CLINICAL_DOMAINS.join(', ')}

## Student Questions
${batch.map((q, i) => `${i + 1}. "${q}"`).join('\n')}

For each question, classify which clinical domain(s) it covers. A single question may cover multiple domains (e.g. "Have you been sleeping okay?" covers both psychiatric and constitutional).

Return JSON:
{
  "classifications": [
    {
      "question": "original question text",
      "domains": ["domain1", "domain2"],
      "confidence": 0.0-1.0
    }
  ]
}`,
      }],
    })

    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
    const parsed = JSON.parse(jsonMatch[1]!.trim()) as { classifications: DomainClassification[] }
    allClassifications.push(...parsed.classifications)
  }

  // Build domainsHit from classifications
  const domainsHit: Record<string, boolean> = {}
  for (const c of allClassifications) {
    for (const d of c.domains) {
      if (CLINICAL_DOMAINS.includes(d)) {
        domainsHit[d] = true
      }
    }
  }

  return { domainsHit, classifications: allClassifications }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/lib/virtual-clinic/semantic-classifier.ts
git commit -m "feat(virtual-clinic): add post-hoc semantic domain classifier

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Patient Affect Engine

**Files:**
- Create: `app/lib/virtual-clinic/affect-engine.ts`

- [ ] **Step 1: Create the affect engine**

Create `app/lib/virtual-clinic/affect-engine.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { AffectState, TranscriptMessage } from './types'

const anthropic = new Anthropic()

const DEFAULT_AFFECT: AffectState = {
  engagementLevel: 60,
  lastDelta: 0,
  reason: 'Initial encounter — patient is neutral and cooperating.',
}

/**
 * Computes patient engagement level based on the most recent exchange.
 * High engagement = patient opens up, discloses sensitive info.
 * Low engagement = patient gives minimal answers, withholds.
 *
 * This creates natural consequences for communication style:
 * - Empathic, open-ended questions → patient warms up
 * - Checklist-style, rapid-fire closed questions → patient shuts down
 */
export async function computeAffectDelta(
  recentMessages: TranscriptMessage[],
  currentAffect: AffectState,
  personalityNotes: string | null,
): Promise<AffectState> {
  // Only analyze if we have at least 1 user + 1 assistant message
  const last4 = recentMessages.slice(-4)
  const userMessages = last4.filter((m) => m.role === 'user')
  if (userMessages.length === 0) return currentAffect

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: `You are a patient psychology model. Given the last few exchanges in a clinical encounter, assess how the patient's engagement would shift. Return JSON only.`,
    messages: [{
      role: 'user',
      content: `## Patient Personality
${personalityNotes ?? 'Cooperative but reserved.'}

## Current Engagement Level: ${currentAffect.engagementLevel}/100

## Recent Exchanges
${last4.map((m) => `[${m.role}] ${m.content.replace(/<!--[\s\S]*?-->/g, '').trim()}`).join('\n')}

How would this patient's engagement shift? Consider:
- Open-ended empathic questions → +5 to +10
- Closed yes/no checklist questions → -3 to -5
- Acknowledging patient's feelings → +5 to +8
- Interrupting or rushing → -5 to -10
- Asking about sensitive topics with empathy → +3 to +5
- Asking about sensitive topics bluntly → -5 to -8

Return JSON:
{
  "delta": number (-15 to +15),
  "reason": "brief explanation of why engagement shifted"
}`,
    }],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, text]
  const result = JSON.parse(jsonMatch[1]!.trim()) as { delta: number; reason: string }

  const newLevel = Math.max(0, Math.min(100, currentAffect.engagementLevel + result.delta))

  return {
    engagementLevel: newLevel,
    lastDelta: result.delta,
    reason: result.reason,
  }
}

/**
 * Generates affect-aware personality modulation for the system prompt.
 * Low engagement → shorter answers, less disclosure, defensive body language cues.
 * High engagement → fuller answers, voluntary details, relaxed cues.
 */
export function buildAffectPromptSection(affect: AffectState): string {
  if (affect.engagementLevel >= 70) {
    return `\n# PATIENT AFFECT STATE (engagement: ${affect.engagementLevel}/100 — OPEN)
You feel comfortable with this student. You may:
- Give slightly longer, more detailed answers
- Volunteer a small related detail if it feels natural
- Show warmth through word choice ("I appreciate you asking about that")
- Make eye contact (describe if relevant)`
  }

  if (affect.engagementLevel >= 40) {
    return `\n# PATIENT AFFECT STATE (engagement: ${affect.engagementLevel}/100 — NEUTRAL)
You are cooperating but guarded. Behave as described in your personality notes.`
  }

  return `\n# PATIENT AFFECT STATE (engagement: ${affect.engagementLevel}/100 — WITHDRAWN)
You feel rushed or unheard. You should:
- Give shorter, more guarded answers
- Withhold sensitive information unless asked with genuine empathy
- Use phrases like "I guess" or "I don't know if that matters"
- Avoid eye contact (describe if relevant)
- If asked about suicidal ideation at this engagement level, say "I'd rather not talk about that" unless the student shows genuine empathy first`
  }

export { DEFAULT_AFFECT }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/lib/virtual-clinic/affect-engine.ts
git commit -m "feat(virtual-clinic): add patient affect dynamics engine

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Scaffolding Service

**Files:**
- Create: `app/lib/virtual-clinic/scaffolding-service.ts`

- [ ] **Step 1: Create the scaffolding service**

Create `app/lib/virtual-clinic/scaffolding-service.ts`:

```typescript
import type { ScaffoldingLevel, ScaffoldingPrompt, TranscriptMessage } from './types'

/**
 * Checks if a scaffolding prompt should be shown based on the student's
 * progress in history-taking.
 *
 * Light scaffolding: after 8+ exchanges with <3 domains covered,
 * show a metacognitive prompt that doesn't name the missing domain.
 *
 * Full scaffolding: show a domain checklist that lights up as domains are hit.
 */

const METACOGNITIVE_PROMPTS: string[] = [
  "You've gathered good information about the presenting complaint. What other aspects of this patient's life might be relevant?",
  "Think about what factors outside the chief complaint could be contributing to this patient's presentation.",
  "Before you move on, consider: have you explored the patient's full context — social, family, and medical?",
  "Is there anything in the patient's background or lifestyle that could be relevant to their symptoms?",
  "You've asked some good questions. What systems haven't you explored yet?",
]

export function checkScaffolding(
  scaffoldingLevel: ScaffoldingLevel,
  transcript: TranscriptMessage[],
  domainsHit: Record<string, boolean>,
): ScaffoldingPrompt | null {
  if (scaffoldingLevel === 'none') return null

  const historyMessages = transcript.filter(
    (m) => m.role === 'user' && m.phase === 'HISTORY_TAKING',
  )
  const domainCount = Object.values(domainsHit).filter(Boolean).length
  const exchangeCount = historyMessages.length

  if (scaffoldingLevel === 'light') {
    // Trigger after 8+ exchanges with <3 domains covered
    // Only trigger once — check if we already have a metacognitive prompt marker
    if (exchangeCount >= 8 && domainCount < 3) {
      const idx = exchangeCount % METACOGNITIVE_PROMPTS.length
      return {
        message: METACOGNITIVE_PROMPTS[idx],
        type: 'metacognitive',
      }
    }
    return null
  }

  // Full scaffolding — always return domain status for the checklist
  if (scaffoldingLevel === 'full') {
    return {
      message: `Domains explored: ${domainCount}`,
      type: 'domain-hint',
    }
  }

  return null
}

const CORE_HISTORY_DOMAINS = [
  'Chief Complaint / HPI',
  'Past Medical History',
  'Medications',
  'Allergies',
  'Social History',
  'Family History',
  'Review of Systems',
  'Psychiatric Screen',
]

/**
 * Returns the domain checklist for full scaffolding mode.
 * Each domain maps to whether it's been hit in the encounter.
 */
export function getDomainChecklist(
  domainsHit: Record<string, boolean>,
): { domain: string; hit: boolean }[] {
  const hitKeys = new Set(
    Object.keys(domainsHit).filter((k) => domainsHit[k]).map((k) => k.toLowerCase()),
  )

  return CORE_HISTORY_DOMAINS.map((domain) => {
    const domainLower = domain.toLowerCase()
    const hit = [...hitKeys].some(
      (k) => k.includes(domainLower) || domainLower.includes(k) ||
        // Map common domain names to checklist items
        (domainLower.includes('hpi') && (k.includes('constitutional') || k.includes('psychiatric'))) ||
        (domainLower.includes('social') && k.includes('social-history')) ||
        (domainLower.includes('family') && k.includes('family-history')) ||
        (domainLower.includes('medication') && k.includes('medications')) ||
        (domainLower.includes('allerg') && k.includes('allergies')) ||
        (domainLower.includes('past medical') && k.includes('past-medical')) ||
        (domainLower.includes('review of systems') && ['cardiovascular', 'respiratory', 'gastrointestinal', 'neurological', 'musculoskeletal', 'genitourinary', 'endocrine', 'dermatological', 'hematological', 'immunological'].some((s) => k.includes(s))) ||
        (domainLower.includes('psychiatric') && k.includes('psychiatric')),
    )
    return { domain, hit }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/lib/virtual-clinic/scaffolding-service.ts
git commit -m "feat(virtual-clinic): add scaffolding service with light/full modes

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Integrate Semantic Classifier + Illness Script + Near-Miss into Scoring

**Files:**
- Modify: `app/lib/virtual-clinic/scoring-service.ts`

- [ ] **Step 1: Add imports for new services**

At the top of `scoring-service.ts`, after the existing imports (line 14), add:

```typescript
import { classifyTranscriptDomains } from './semantic-classifier'
import { buildIllnessScriptComparison } from './illness-script-service'
import { analyzeNearMisses } from './near-miss-service'
import type { IllnessScriptComparison, NearMissAnalysis } from './types'
```

- [ ] **Step 2: Add semantic classification before history scoring**

In the `scoreEncounter` function, replace the history scoring section (lines 353-354):

Old:
```typescript
  // 1. History coverage (sync)
  const historyScore = scoreHistory(domainsHit, clinicalCase.keyHistoryQuestions)
```

New:
```typescript
  // 1. Semantic domain classification (replaces marker-based tracking)
  const { domainsHit: semanticDomains } = await classifyTranscriptDomains(transcript)
  // Merge: semantic classification takes precedence, marker-based as fallback
  const mergedDomains = { ...domainsHit, ...semanticDomains }
  const historyScore = scoreHistory(mergedDomains, clinicalCase.keyHistoryQuestions)
```

- [ ] **Step 3: Add illness script + near-miss analysis in parallel with existing AI calls**

Replace the parallel AI scoring block (lines 360-371):

Old:
```typescript
  // 3-6. AI-scored domains (parallel)
  const [differentialScore, planScore, communicationScore, biases] = await Promise.all([
    scoreDifferential(
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      clinicalCase.correctDifferentials,
    ),
    scoreDiagnosticPlan(
      encounter.diagnosticPlan as DiagnosticPlanInput | null,
      clinicalCase.criticalActions,
    ),
    scoreCommunication(transcript),
    detectCognitiveBiases(transcript),
  ])
```

New:
```typescript
  // 3-8. AI-scored domains + illness script + near-miss (parallel)
  const [differentialScore, planScore, communicationScore, biases, illnessScript, nearMisses] = await Promise.all([
    scoreDifferential(
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      clinicalCase.correctDifferentials,
    ),
    scoreDiagnosticPlan(
      encounter.diagnosticPlan as DiagnosticPlanInput | null,
      clinicalCase.criticalActions,
    ),
    scoreCommunication(transcript),
    detectCognitiveBiases(transcript),
    buildIllnessScriptComparison(
      encounter.problemRepresentation,
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      encounter.diagnosticPlan,
      {
        correctDifferentials: clinicalCase.correctDifferentials,
        keyHistoryQuestions: clinicalCase.keyHistoryQuestions,
        criticalActions: clinicalCase.criticalActions,
        learningObjectives: clinicalCase.learningObjectives,
        historyOfPresentIllness: clinicalCase.historyOfPresentIllness,
        patientAge: clinicalCase.patientAge,
        patientSex: clinicalCase.patientSex,
        socialHistory: clinicalCase.socialHistory,
        familyHistory: clinicalCase.familyHistory,
      },
    ),
    analyzeNearMisses(
      encounter.differentialDiagnosis as DifferentialEntry[] | null,
      clinicalCase.correctDifferentials,
      clinicalCase.historyOfPresentIllness,
    ),
  ])
```

- [ ] **Step 4: Persist illness script + near-miss data alongside scores**

Replace the persist block (lines 397-407):

Old:
```typescript
  const updated = await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      scores: scores as unknown as Prisma.InputJsonValue,
      overallScore,
      overallLevel,
      cognitiveBiases: biases as unknown as Prisma.InputJsonValue,
      feedbackNarrative,
    },
    include: { clinicalCase: true },
  })

  return updated
```

New:
```typescript
  const updated = await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      scores: {
        ...scores,
        illnessScript,
        nearMisses,
      } as unknown as Prisma.InputJsonValue,
      overallScore,
      overallLevel,
      cognitiveBiases: biases as unknown as Prisma.InputJsonValue,
      feedbackNarrative,
      // Update domain tracking with semantic classification results
      historyDomainsHit: mergedDomains as Prisma.InputJsonValue,
    },
    include: { clinicalCase: true },
  })

  return updated
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add app/lib/virtual-clinic/scoring-service.ts
git commit -m "feat(virtual-clinic): integrate semantic classifier, illness script, near-miss into scoring

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Integrate Affect Engine into Patient Prompt + Chat Route

**Files:**
- Modify: `app/lib/virtual-clinic/patient-prompt-service.ts`
- Modify: `app/api/virtual-clinic/encounters/[encounterId]/chat/route.ts`
- Modify: `app/lib/virtual-clinic/encounter-service.ts`

- [ ] **Step 1: Add affect section to patient prompt builder**

In `patient-prompt-service.ts`, add import at line 1:

```typescript
import type { EncounterPhase, AffectState } from './types'
import { buildAffectPromptSection } from './affect-engine'
```

And update the `buildPatientSystemPrompt` function signature (line 56) to accept affect:

Old:
```typescript
export function buildPatientSystemPrompt(
  clinicalCase: CaseData,
  phase: EncounterPhase,
): string {
```

New:
```typescript
export function buildPatientSystemPrompt(
  clinicalCase: CaseData,
  phase: EncounterPhase,
  affect?: AffectState | null,
): string {
```

Then at the end of the template string (before the closing backtick at line 117), add:

```typescript
${affect ? buildAffectPromptSection(affect) : ''}`
```

Replace the closing of the template string so the affect section is appended after rule 7.

- [ ] **Step 2: Add affect state to encounter service**

In `encounter-service.ts`, add a function after `updateTrackingMarkers` (after line 160):

```typescript
/**
 * Store the current affect state in the encounter's scores Json field
 * under an 'affectState' key (transient, overwritten each exchange).
 */
export async function updateAffectState(
  encounterId: string,
  affect: AffectState,
) {
  // Store in a dedicated Json field piggy-backed on the scores column
  // (before scoring runs, scores is null, so we use a separate approach)
  const encounter = await prisma.clinicalEncounter.findUnique({ where: { id: encounterId } })
  if (!encounter) return

  const existing = (encounter.historyDomainsHit ?? {}) as Record<string, unknown>
  await prisma.clinicalEncounter.update({
    where: { id: encounterId },
    data: {
      historyDomainsHit: { ...existing, __affectState: affect } as Prisma.InputJsonValue,
    },
  })
}

export function getAffectState(encounter: { historyDomainsHit: unknown }): AffectState | null {
  const data = encounter.historyDomainsHit as Record<string, unknown> | null
  if (!data || !data.__affectState) return null
  return data.__affectState as AffectState
}
```

Add the import for `AffectState`:
```typescript
import type { EncounterPhase, TranscriptMessage, DifferentialEntry, DiagnosticPlanInput, AffectState } from './types'
```

- [ ] **Step 3: Update the chat route to compute affect and pass to prompt builder**

Read the chat route to understand its structure, then add affect computation after the AI response is complete. The chat route at `app/api/virtual-clinic/encounters/[encounterId]/chat/route.ts` should:

1. Before building the system prompt, read the current affect state from the encounter
2. Pass the affect state to `buildPatientSystemPrompt`
3. After the AI response is complete, compute the new affect delta and save it

Add these imports to the chat route:
```typescript
import { computeAffectDelta, DEFAULT_AFFECT } from '../../../lib/virtual-clinic/affect-engine'
import { updateAffectState, getAffectState } from '../../../lib/virtual-clinic/encounter-service'
```

Before the Anthropic call, get the current affect:
```typescript
const currentAffect = getAffectState(encounter) ?? DEFAULT_AFFECT
```

Pass it to the prompt builder:
```typescript
const systemPrompt = buildPatientSystemPrompt(clinicalCase, encounter.phase, currentAffect)
```

After the streaming completes and transcript is appended, compute the new affect:
```typescript
// Non-blocking affect update
const recentMessages = [...(encounter.transcript as TranscriptMessage[]).slice(-3), assistantMsg]
computeAffectDelta(recentMessages, currentAffect, clinicalCase.personalityNotes)
  .then((newAffect) => updateAffectState(encounterId, newAffect))
  .catch(() => {}) // Non-critical — don't fail the chat
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/lib/virtual-clinic/patient-prompt-service.ts app/lib/virtual-clinic/encounter-service.ts app/api/virtual-clinic/encounters/*/chat/route.ts
git commit -m "feat(virtual-clinic): integrate patient affect dynamics into chat flow

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Illness Script Comparison Component

**Files:**
- Create: `app/components/virtual-clinic/IllnessScriptComparison.tsx`

- [ ] **Step 1: Create the illness script comparison component**

Create `app/components/virtual-clinic/IllnessScriptComparison.tsx`:

```tsx
'use client'

import { BookOpen } from 'lucide-react'
import type { IllnessScriptComparison as IllnessScriptData } from '../../lib/virtual-clinic/types'

const ALIGNMENT_STYLES = {
  match: 'bg-emerald-50 border-emerald-200',
  partial: 'bg-amber-50 border-amber-200',
  gap: 'bg-red-50 border-red-200',
}

const ALIGNMENT_LABELS = {
  match: { text: 'Match', className: 'bg-emerald-100 text-emerald-700' },
  partial: { text: 'Partial', className: 'bg-amber-100 text-amber-700' },
  gap: { text: 'Gap', className: 'bg-red-100 text-red-700' },
}

export default function IllnessScriptComparison({ data }: { data: IllnessScriptData }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Illness Script Comparison</h3>
        <span className="ml-auto text-xs text-gray-500">
          Alignment: {data.overallAlignment}%
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        How your clinical reasoning compares to the expert model (Bowen, 2006).
      </p>

      <div className="space-y-3">
        {data.rows.map((row) => (
          <div key={row.element} className={`border rounded-xl p-4 ${ALIGNMENT_STYLES[row.alignment]}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">{row.element}</span>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${ALIGNMENT_LABELS[row.alignment].className}`}>
                {ALIGNMENT_LABELS[row.alignment].text}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Your Reasoning</div>
                <p className="text-xs text-gray-700">{row.studentModel}</p>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 mb-1">Expert Model</div>
                <p className="text-xs text-gray-700">{row.expertModel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/virtual-clinic/IllnessScriptComparison.tsx
git commit -m "feat(virtual-clinic): add illness script comparison feedback component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Near-Miss Feedback Component

**Files:**
- Create: `app/components/virtual-clinic/NearMissFeedback.tsx`

- [ ] **Step 1: Create the near-miss feedback component**

Create `app/components/virtual-clinic/NearMissFeedback.tsx`:

```tsx
'use client'

import { Target, CheckCircle2, ArrowUpDown, XCircle, HelpCircle } from 'lucide-react'
import type { NearMissAnalysis } from '../../lib/virtual-clinic/types'

const STATUS_CONFIG = {
  correct: { icon: CheckCircle2, label: 'Correct', className: 'bg-emerald-50 border-emerald-200', iconClass: 'text-emerald-500' },
  'present-but-misranked': { icon: ArrowUpDown, label: 'Misranked', className: 'bg-amber-50 border-amber-200', iconClass: 'text-amber-500' },
  missing: { icon: XCircle, label: 'Missing', className: 'bg-red-50 border-red-200', iconClass: 'text-red-500' },
  extraneous: { icon: HelpCircle, label: 'Extra', className: 'bg-blue-50 border-blue-200', iconClass: 'text-blue-500' },
}

export default function NearMissFeedback({ data }: { data: NearMissAnalysis }) {
  if (data.entries.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="size-5 text-[#0033A0]" />
        <h3 className="text-sm font-extrabold text-gray-900">Differential Deep Dive</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        How each diagnosis in your differential compares to the expected list.
      </p>

      <div className="space-y-3">
        {data.entries.map((entry, i) => {
          const config = STATUS_CONFIG[entry.status]
          const Icon = config.icon

          return (
            <div key={i} className={`border rounded-xl p-4 ${config.className}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`size-4 ${config.iconClass}`} />
                <span className="text-sm font-semibold text-gray-900">{entry.diagnosis}</span>
                <span className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded-full ${config.className} border`}>
                  {config.label}
                </span>
              </div>
              <p className="text-xs text-gray-700 mb-2">{entry.explanation}</p>
              <div className="flex items-start gap-1.5 bg-white/60 rounded-lg px-3 py-2">
                <span className="text-xs font-semibold text-[#0033A0] shrink-0">Teaching Point:</span>
                <p className="text-xs text-gray-700">{entry.teachingPoint}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/virtual-clinic/NearMissFeedback.tsx
git commit -m "feat(virtual-clinic): add near-miss differential feedback component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Scaffolding Banner Component

**Files:**
- Create: `app/components/virtual-clinic/ScaffoldingBanner.tsx`

- [ ] **Step 1: Create the scaffolding banner component**

Create `app/components/virtual-clinic/ScaffoldingBanner.tsx`:

```tsx
'use client'

import { Lightbulb, CheckCircle2 } from 'lucide-react'
import type { ScaffoldingPrompt } from '../../lib/virtual-clinic/types'

interface ScaffoldingBannerProps {
  prompt: ScaffoldingPrompt | null
  domainChecklist?: { domain: string; hit: boolean }[] | null
}

export default function ScaffoldingBanner({ prompt, domainChecklist }: ScaffoldingBannerProps) {
  if (!prompt) return null

  if (prompt.type === 'metacognitive') {
    return (
      <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Lightbulb className="size-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-semibold text-amber-700 mb-0.5">Reflection Prompt</div>
          <p className="text-xs text-amber-800">{prompt.message}</p>
        </div>
      </div>
    )
  }

  if (prompt.type === 'domain-hint' && domainChecklist) {
    return (
      <div className="mx-4 mb-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
        <div className="text-xs font-semibold text-blue-700 mb-2">History Domains</div>
        <div className="grid grid-cols-2 gap-1.5">
          {domainChecklist.map((item) => (
            <div key={item.domain} className="flex items-center gap-1.5">
              <CheckCircle2 className={`size-3.5 ${item.hit ? 'text-emerald-500' : 'text-gray-300'}`} />
              <span className={`text-xs ${item.hit ? 'text-gray-700' : 'text-gray-400'}`}>
                {item.domain}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/virtual-clinic/ScaffoldingBanner.tsx
git commit -m "feat(virtual-clinic): add scaffolding banner component

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Wire Components into Encounter Page

**Files:**
- Modify: `app/virtual-clinic/encounter/[encounterId]/page.tsx`

- [ ] **Step 1: Add imports for new components**

At the top of the file (after the existing imports around line 18), add:

```typescript
import IllnessScriptComparison from '../../../components/virtual-clinic/IllnessScriptComparison'
import NearMissFeedback from '../../../components/virtual-clinic/NearMissFeedback'
import ScaffoldingBanner from '../../../components/virtual-clinic/ScaffoldingBanner'
import type { IllnessScriptComparison as IllnessScriptData, NearMissAnalysis, ScaffoldingLevel } from '../../../lib/virtual-clinic/types'
```

- [ ] **Step 2: Update EncounterData type to include illness script and near-miss**

The `scores` field in `EncounterData` (line 50) is typed as `EncounterScores | null`. The illness script and near-miss data are stored inside the `scores` JSON. Update the interface:

Add after the `EncounterData` interface (after line 63):

```typescript
interface ExtendedScores extends EncounterScores {
  illnessScript?: IllnessScriptData
  nearMisses?: NearMissAnalysis
}
```

- [ ] **Step 3: Add illness script + near-miss sections to FeedbackView**

In the `FeedbackView` function, after the "Cognitive Biases" section (after line 502) and before the "Feedback Narrative" section, add:

```tsx
      {/* Illness Script Comparison */}
      {(scores as ExtendedScores).illnessScript && (
        <IllnessScriptComparison data={(scores as ExtendedScores).illnessScript!} />
      )}

      {/* Near-Miss Differential Analysis */}
      {(scores as ExtendedScores).nearMisses && (
        <NearMissFeedback data={(scores as ExtendedScores).nearMisses!} />
      )}
```

- [ ] **Step 4: Add scaffolding banner to the chat panel**

In the `ChatPanel` function, add scaffolding state and render the banner above the input. After the `isCompleted` declaration (line 626), add:

```typescript
  // Scaffolding — computed from encounter state
  const scaffoldingLevel: ScaffoldingLevel = 'light' // TODO: read from case settings when case model is extended
  const scaffoldingPrompt = encounter.phase === 'HISTORY_TAKING'
    ? (() => {
        const { checkScaffolding } = require('../../../lib/virtual-clinic/scaffolding-service')
        const domainsHit = {} as Record<string, boolean> // Will be populated from encounter data
        return checkScaffolding(scaffoldingLevel, encounter.transcript, domainsHit)
      })()
    : null
```

Then render `<ScaffoldingBanner prompt={scaffoldingPrompt} />` above the message input area (before the `<div className="border-t border-gray-200 px-4 py-3">` at line 703):

```tsx
      {scaffoldingPrompt && <ScaffoldingBanner prompt={scaffoldingPrompt} />}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 6: Verify the build succeeds**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build 2>&1 | tail -20`
Expected: Build completes successfully

- [ ] **Step 7: Commit**

```bash
git add app/virtual-clinic/encounter/*/page.tsx
git commit -m "feat(virtual-clinic): wire illness script, near-miss, scaffolding into encounter UI

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Add scaffoldingLevel Field to Case Author Form

**Files:**
- Modify: `app/components/virtual-clinic/CaseAuthorForm.tsx`
- Modify: `app/lib/virtual-clinic/types.ts`

- [ ] **Step 1: Add scaffoldingLevel to ClinicalCaseInput**

In `types.ts`, add to the `ClinicalCaseInput` interface (after `courseId` on line 104):

```typescript
  scaffoldingLevel?: ScaffoldingLevel
```

- [ ] **Step 2: Add scaffolding level selector to case author form**

In `CaseAuthorForm.tsx`, find the difficulty selector section and add a scaffolding level select below it:

```tsx
<div>
  <label className="block text-xs font-semibold text-gray-500 mb-1">Scaffolding Level</label>
  <select
    value={formData.scaffoldingLevel ?? 'none'}
    onChange={(e) => setFormData((prev) => ({ ...prev, scaffoldingLevel: e.target.value as ScaffoldingLevel }))}
    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#0033A0] focus:ring-1 focus:ring-[#0033A0]"
  >
    <option value="none">None (summative — no hints)</option>
    <option value="light">Light (metacognitive prompts after 8+ exchanges)</option>
    <option value="full">Full (domain checklist visible during history)</option>
  </select>
  <p className="text-xs text-gray-400 mt-1">Controls whether students receive scaffolding during history-taking.</p>
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/lib/virtual-clinic/types.ts app/components/virtual-clinic/CaseAuthorForm.tsx
git commit -m "feat(virtual-clinic): add scaffolding level selector to case authoring

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Final Integration Verification

- [ ] **Step 1: Run full TypeScript check**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npx tsc --noEmit --pretty 2>&1 | tail -30`
Expected: No errors

- [ ] **Step 2: Run lint**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run lint 2>&1 | tail -20`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 3: Run full build**

Run: `cd "c:/AA Code/Educator marketplace/the-sandbox" && npm run build 2>&1 | tail -30`
Expected: Build completes successfully

- [ ] **Step 4: Verify all new files exist**

Run: `ls -la "c:/AA Code/Educator marketplace/the-sandbox/app/lib/virtual-clinic/"*.ts "c:/AA Code/Educator marketplace/the-sandbox/app/components/virtual-clinic/"*.tsx`

Expected: All 5 new service files + 3 new component files present alongside existing files.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(virtual-clinic): resolve build issues from medical education improvements

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```
