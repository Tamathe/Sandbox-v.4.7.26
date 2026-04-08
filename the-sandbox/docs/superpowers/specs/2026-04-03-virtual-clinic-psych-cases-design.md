# Virtual Clinic — DNP Psychiatry Assessment Cases (Phase 1: Cases 1–6)

> **Date:** 2026-04-03
> **Scope:** 6 fully specified psychiatric cases (Mood Disorders 1–3, Anxiety Disorders 4–6)
> **Blueprint:** `Blueprints/VIRTUAL-CLINIC-PSYCH-CASES.md` (30-case roadmap)
> **Implementation:** Seed script creating 6 `ClinicalCase` records via Prisma

## Overview

Author 6 psychiatric assessment cases for DNP-Psychiatry students using the existing Virtual Clinic infrastructure. Each case is a complete `ClinicalCase` Prisma record with all required JSON fields populated. Cases are designed with progressive complexity (BEGINNER → INTERMEDIATE → ADVANCED), intentional demographic diversity, and psychiatric-specific assessment frameworks.

No schema changes required. No new API routes. No new components. This is pure data authoring against the existing case model.

## Implementation Approach

A single seed script (`scripts/seed-virtual-clinic-cases.ts`) that creates 6 `ClinicalCase` records via `prisma.clinicalCase.upsert()` (keyed on title). The script is idempotent — safe to run multiple times. Cases are created with `published: true` and assigned to Katie Thompson (EDUCATOR demo user) as creator.

Run via: `npx tsx scripts/seed-virtual-clinic-cases.ts`

---

## Case 1: "The Weight of It All"

```
title: "The Weight of It All"
chiefComplaint: "I've just been feeling really down lately... I don't know, I can't seem to shake it."
difficulty: BEGINNER
targetYear: 1
organSystems: ["psychiatric", "neurological"]
learningObjectives: [
  "Conduct a systematic depression screening using DSM-5-TR criteria",
  "Perform a complete mental status examination",
  "Screen for suicidality using C-SSRS framework",
  "Develop a biopsychosocial formulation",
  "Create an appropriate treatment plan including pharmacotherapy and psychotherapy referral"
]
tags: ["depression", "MDD", "suicidality", "beginner", "outpatient", "African-American"]
```

### Patient Identity
```
patientName: "Marcus Williams"
patientAge: 34
patientSex: "Male"
patientPronouns: "he/him"
personalityNotes: "Stoic and reserved. Minimizes emotional symptoms — 'I just need to toughen up.' Uses work-focused language. Won't volunteer suicidal ideation but will disclose passive thoughts if asked directly and with empathy. Avoids eye contact when discussing feelings. Speaks in short sentences unless asked open-ended questions. Becomes slightly more open mid-interview if the student demonstrates genuine interest rather than checklist-style questioning."
```

### History of Present Illness
```json
{
  "onset": "About 6 weeks ago",
  "precipitants": "Passed over for a promotion he'd been working toward for 2 years. The position went to a newer, less experienced colleague. Around the same time, his mother was diagnosed with early-stage breast cancer.",
  "character": "Persistent low mood, loss of interest in activities he used to enjoy (coaching his son's basketball team, working out, watching sports). Feels like he's 'going through the motions.'",
  "severity": "7/10 — 'It's not like I can't function, I just don't want to do anything'",
  "associatedSymptoms": ["difficulty falling asleep (takes 1-2 hours)", "early morning awakening (4 AM, can't fall back asleep)", "decreased appetite with 12-pound weight loss in 6 weeks", "fatigue despite adequate hours in bed", "difficulty concentrating at work — making mistakes he normally wouldn't", "guilt about not being a better father and husband", "passive suicidal ideation — 'sometimes I think my family would be better off without me' — no plan, no intent, no prior attempts"],
  "timeline": "Gradual onset over 2-3 weeks after the promotion decision, worsened when mother's diagnosis came. Has been consistently low for past 6 weeks with no good days.",
  "narrative": "Marcus is a 34-year-old married Black man presenting for his first psychiatric evaluation. He was referred by his PCP after his wife called the doctor's office expressing concern. He initially resisted coming — 'I told her I'm fine, I just need some time.' He describes 6 weeks of persistent depressed mood, anhedonia, sleep disturbance (initial and terminal insomnia), significant appetite loss with 12-pound weight loss, fatigue, difficulty concentrating at work, and pervasive guilt. He has passive suicidal ideation ('my family would be better off') but denies plan, intent, or access to means beyond what's normal in his household. He has never seen a mental health professional before and is skeptical but trying for his wife's sake."
}
```

### Past Medical History
```json
{
  "conditions": ["Hypertension (diagnosed age 30, controlled with medication)", "Pre-diabetes (A1C 5.9, managing with diet)"],
  "surgeries": ["Appendectomy age 16"],
  "hospitalizations": ["None psychiatric. Appendectomy only."],
  "previousPsychTreatment": "None. Has never seen a therapist or psychiatrist. 'I'm not the therapy type.'"
}
```

### Medications
```json
[
  { "name": "Lisinopril", "dose": "10mg", "frequency": "daily", "notes": "For hypertension, compliant" },
  { "name": "Multivitamin", "dose": "1 tablet", "frequency": "daily", "notes": "" }
]
```

### Allergies
```json
[
  { "allergen": "Sulfa drugs", "reaction": "Rash as a child" }
]
```

### Social History
```json
{
  "smoking": "Non-smoker, never",
  "alcohol": "Social drinker — 2-3 beers on weekends. No increase recently. Denies using alcohol to cope.",
  "drugs": "Denies any illicit drug use. No cannabis. No history of substance use.",
  "caffeine": "3-4 cups of coffee daily, increased from 2 since sleep problems started",
  "occupation": "Operations manager at a logistics company. 8 years with the company. Recently passed over for promotion — position went to a colleague with 3 years less experience.",
  "livingSituation": "Lives with wife Tamara (33, teacher) and two sons (7 and 4) in a 3-bedroom house they own. Stable housing.",
  "relationships": "Married 9 years. Describes marriage as 'good but strained right now.' Wife is frustrated that he won't talk about how he's feeling. Has withdrawn from family activities.",
  "support": "Wife is supportive but frustrated. Mother (diagnosed with breast cancer 5 weeks ago). Father deceased (heart attack, age 58). One younger brother, not close. A few work friends but doesn't confide in them. Church member but attendance has dropped off.",
  "education": "Bachelor's degree in business administration",
  "legal": "No legal history",
  "military": "None",
  "spirituality": "Baptist, raised in church. Used to attend weekly. Hasn't gone in a month — 'doesn't feel right going when I feel like this.'"
}
```

### Family History
```json
{
  "conditions": [
    { "relation": "Mother", "condition": "Currently being treated for breast cancer. History of 'nerves' — likely undiagnosed anxiety. Never treated." },
    { "relation": "Father", "condition": "Deceased at 58 from MI. History of hypertension, possible depression (heavy drinker in his 40s, 'dark moods')." },
    { "relation": "Paternal uncle", "condition": "Alcohol use disorder" },
    { "relation": "Maternal grandmother", "condition": "Depression — 'took to her bed for months' after grandfather died" }
  ]
}
```

### Review of Systems
```json
{
  "constitutional": "Fatigue (daily, worse in afternoon), 12-lb weight loss in 6 weeks, decreased appetite",
  "cardiovascular": "Denies chest pain, palpitations. Hypertension controlled.",
  "respiratory": "Denies SOB, cough",
  "gastrointestinal": "Decreased appetite, occasional nausea when forcing himself to eat. No vomiting, no changes in bowel habits.",
  "neurological": "Difficulty concentrating, forgetfulness at work (leaving tasks incomplete, missing details). Denies headaches, dizziness, numbness/tingling.",
  "musculoskeletal": "Denies pain. Has stopped exercising — used to lift weights 4x/week.",
  "endocrine": "Pre-diabetes. Denies polyuria, polydipsia, heat/cold intolerance.",
  "psychiatric": "Depressed mood daily, anhedonia (no longer enjoys coaching, working out, sports), guilt, worthlessness ('I'm failing as a father'), passive SI ('family better off without me') — no plan/intent/attempt, initial and terminal insomnia, psychomotor slowing (wife says he moves slower), difficulty concentrating, decreased libido.",
  "sleep": "Takes 1-2 hours to fall asleep. Wakes at 4 AM and cannot return to sleep. Getting ~4-5 hours per night. No snoring per wife. No restless legs."
}
```

### Vital Signs
```json
{
  "bloodPressure": "132/84",
  "heartRate": 68,
  "respiratoryRate": 14,
  "temperature": 98.4,
  "weight": "198 lbs (down from 210 lbs 6 weeks ago)",
  "height": "5'11\"",
  "bmi": 27.6
}
```

### Physical Exam Findings (MSE)
```json
{
  "mental-status-appearance": {
    "finding": "Well-built Black male appearing stated age. Dressed in clean but wrinkled khakis and polo shirt (wife picked them out). Mild psychomotor retardation — slow to rise from chair, movements deliberate. Decreased eye contact, looks at floor when discussing feelings. No abnormal movements.",
    "interpretation": "Appearance consistent with depression — psychomotor slowing, decreased self-care effort, reduced eye contact"
  },
  "mental-status-mood-affect": {
    "finding": "Mood: 'Down, I guess. Heavy.' Affect: Constricted range, predominantly sad and flat. Occasional flickers of warmth when mentioning his sons. Congruent with stated mood. No lability.",
    "interpretation": "Depressed mood with constricted, sad affect consistent with major depressive episode"
  },
  "mental-status-speech": {
    "finding": "Low volume, slightly slowed rate, normal rhythm. Increased latency — takes 3-5 seconds to respond to questions. Minimal spontaneous speech. Answers tend toward brief, requiring follow-up prompts.",
    "interpretation": "Speech pattern consistent with psychomotor retardation of depression"
  },
  "mental-status-thought-process": {
    "finding": "Goal-directed but slowed. Logical and linear when engaged. No tangentiality or loose associations. Ruminative quality — returns to themes of failure and guilt without prompting.",
    "interpretation": "Preserved thought process with depressive rumination"
  },
  "mental-status-thought-content": {
    "finding": "Preoccupied with guilt (failing family, not being strong enough), worthlessness ('what's the point'), and hopelessness ('I don't see this getting better'). Passive suicidal ideation: 'Sometimes I think they'd be better off without me.' Denies active plan, intent, or prior attempts. Denies homicidal ideation. No delusions, obsessions, or phobias.",
    "interpretation": "Depressive thought content with passive SI — requires safety assessment and planning"
  },
  "mental-status-perceptions": {
    "finding": "Denies auditory, visual, tactile, olfactory, or gustatory hallucinations. No illusions. No depersonalization or derealization.",
    "interpretation": "No perceptual disturbances — rules out psychotic features"
  },
  "mental-status-cognition": {
    "finding": "Alert and oriented x4. Attention: able to spell WORLD backward with one error (DLROW → DLRWO). Able to recall 2/3 objects at 5 minutes (missed 'pencil,' recalled with category cue). Serial 7s: slow but accurate. Fund of knowledge appropriate for education level.",
    "interpretation": "Mild attentional and short-term memory deficits consistent with depression — pseudodementia pattern, not primary cognitive disorder"
  },
  "mental-status-insight-judgment": {
    "finding": "Insight: Partial. Acknowledges something is wrong ('I know I'm not myself') but reluctant to label it as depression ('I don't think I'm depressed, I'm just stressed'). Judgment: Intact — agreed to come to appointment, maintained work attendance, caring for children safely.",
    "interpretation": "Partial insight with intact judgment — amenable to treatment if approached without stigma"
  },
  "suicidality-assessment": {
    "finding": "C-SSRS: Passive ideation present ('family better off without me') — frequency: several times per week, duration: fleeting (seconds). No active ideation. No plan. No intent. No preparatory behavior. No prior attempts. Protective factors: children ('I'd never do that to my boys'), wife, employment, religious faith (weakened but present). Risk factors: male, Black (cultural barriers to treatment), family history, access to means (not assessed — no firearms reported), recent stressors.",
    "interpretation": "Low-moderate acute risk. Passive SI with protective factors. Outpatient management appropriate with safety planning."
  },
  "homicidality-assessment": {
    "finding": "Denies homicidal ideation, intent, or plan. No history of violence. No access to weapons reported.",
    "interpretation": "No homicidal risk identified"
  },
  "substance-use-screen": {
    "finding": "AUDIT-C: Score 3 (2-3 drinks, 2-3 times/month, never 6+). Below clinical threshold. No drug use. Caffeine increased.",
    "interpretation": "No substance use disorder. Monitor caffeine as sleep hygiene issue."
  }
}
```

### Default Normal Findings
```json
{
  "general": "Well-nourished male in no acute distress",
  "cardiovascular": "Regular rate and rhythm, no murmurs",
  "respiratory": "Clear to auscultation bilaterally",
  "neurological": "Cranial nerves II-XII intact, no focal deficits"
}
```

### Available Labs
```json
[
  { "name": "CBC", "result": "WNL — Hgb 14.2, WBC 6.8, Plt 245" },
  { "name": "CMP", "result": "WNL — glucose 108 (consistent with pre-diabetes), otherwise normal" },
  { "name": "TSH", "result": "2.3 mIU/L (normal range 0.4-4.0)" },
  { "name": "Free T4", "result": "1.1 ng/dL (normal)" },
  { "name": "Vitamin B12", "result": "480 pg/mL (normal)" },
  { "name": "Folate", "result": "12 ng/mL (normal)" },
  { "name": "Vitamin D", "result": "22 ng/mL (low-normal — consider supplementation)" },
  { "name": "Hemoglobin A1C", "result": "5.9% (pre-diabetes, unchanged)" },
  { "name": "Lipid Panel", "result": "Total cholesterol 198, LDL 122, HDL 42, TG 170 — mildly dyslipidemic" },
  { "name": "Testosterone", "result": "Not ordered — consider if sexual dysfunction persists after depression treatment" },
  { "name": "Urine Drug Screen", "result": "Negative" }
]
```

### Available Imaging
```json
[]
```

### Correct Differentials
```json
[
  {
    "rank": 1,
    "diagnosis": "Major Depressive Disorder, Single Episode, Moderate (F32.1)",
    "supportingFindings": ["Depressed mood >2 weeks (6 weeks)", "Anhedonia", "Sleep disturbance (initial and terminal insomnia)", "Appetite/weight loss (12 lbs)", "Fatigue", "Difficulty concentrating", "Guilt/worthlessness", "Passive suicidal ideation", "Psychomotor retardation", "Meets ≥5/9 DSM-5 criteria", "Family history of depression", "No prior manic/hypomanic episodes"],
    "opposingFindings": ["First episode — could evolve", "No psychotic features (moderate, not severe)", "Functioning partially maintained (still working)"]
  },
  {
    "rank": 2,
    "diagnosis": "Adjustment Disorder with Depressed Mood (F43.21)",
    "supportingFindings": ["Clear identifiable stressor (promotion, mother's cancer)", "Onset within 3 months of stressor", "Significant distress"],
    "opposingFindings": ["Symptom severity exceeds what's expected for adjustment (passive SI, 12-lb weight loss, pervasive anhedonia)", "Meets full MDD criteria — adjustment disorder is a diagnosis of exclusion when mood disorder criteria are met", "Family history suggests biological vulnerability"]
  },
  {
    "rank": 3,
    "diagnosis": "Persistent Depressive Disorder (Dysthymia) (F34.1)",
    "supportingFindings": ["Could be early presentation"],
    "opposingFindings": ["Duration only 6 weeks (requires 2 years for PDD)", "No history of chronic low-level depression", "Acute onset with clear precipitant"]
  }
]
```

### Key History Questions
```json
[
  { "question": "How long have you been feeling this way?", "domain": "psychiatric", "criticalInfo": "Establishes duration — 6 weeks meets MDD criteria (>2 weeks)" },
  { "question": "Have you had thoughts of harming yourself or ending your life?", "domain": "suicidality", "criticalInfo": "CRITICAL SAFETY — reveals passive SI that patient won't volunteer. Missing this is a major scoring penalty." },
  { "question": "Have you ever felt this way before?", "domain": "psychiatric", "criticalInfo": "Screens for recurrent episodes and possible bipolar history" },
  { "question": "Have you ever had a period where you felt the opposite — unusually energetic, needed less sleep, felt on top of the world?", "domain": "psychiatric", "criticalInfo": "Bipolar screen — essential before starting an antidepressant" },
  { "question": "How is your sleep?", "domain": "functional", "criticalInfo": "Neurovegetative symptom — reveals both initial and terminal insomnia" },
  { "question": "How is your appetite? Have you noticed weight changes?", "domain": "functional", "criticalInfo": "Neurovegetative symptom — 12-lb loss in 6 weeks is significant" },
  { "question": "Tell me about what was happening in your life when this started.", "domain": "social-history", "criticalInfo": "Identifies precipitants — promotion and mother's cancer" },
  { "question": "Is there any history of depression or mental health problems in your family?", "domain": "family-history", "criticalInfo": "Reveals significant family psychiatric history (father, grandmother, uncle)" },
  { "question": "How much are you drinking?", "domain": "substance-use", "criticalInfo": "Screens for self-medication — currently low-risk but important to assess" },
  { "question": "What does a typical day look like for you right now?", "domain": "functional", "criticalInfo": "Assesses functional impairment across domains — work, family, self-care, activities" },
  { "question": "Do you have any guns or firearms in the home?", "domain": "suicidality", "criticalInfo": "Means access assessment — essential with passive SI" }
]
```

### Key Exam Maneuvers
```json
[
  { "maneuver": "mental-status-appearance", "expectedFinding": "Psychomotor retardation, decreased eye contact, mild self-care decline", "significance": "Observable depression markers" },
  { "maneuver": "mental-status-mood-affect", "expectedFinding": "Depressed mood, constricted sad affect", "significance": "Core MSE finding for MDD" },
  { "maneuver": "mental-status-thought-content", "expectedFinding": "Guilt, worthlessness, passive SI", "significance": "Identifies depressive cognitions and safety concerns" },
  { "maneuver": "suicidality-assessment", "expectedFinding": "Passive ideation without plan/intent, protective factors present", "significance": "CRITICAL — determines disposition and safety planning" },
  { "maneuver": "mental-status-cognition", "expectedFinding": "Mild attention/memory deficits (pseudodementia)", "significance": "Differentiates from primary cognitive disorder" },
  { "maneuver": "substance-use-screen", "expectedFinding": "Low-risk alcohol use, no drugs", "significance": "Rules out substance-induced mood disorder" }
]
```

### Critical Actions
```json
[
  "Screen for suicidality (C-SSRS) — passive ideation present",
  "Screen for bipolar history before starting antidepressant",
  "Assess means access (firearms, medications)",
  "Create collaborative safety plan",
  "Order baseline labs (TSH, CBC, CMP) to rule out medical causes",
  "Discuss treatment options: SSRI + psychotherapy referral",
  "Address cultural barriers to treatment (stigma, stoicism)",
  "Assess family support and involve wife in treatment planning (with permission)",
  "Schedule follow-up within 1-2 weeks"
]
```

### Scoring Rubric
```json
{
  "historyWeight": 0.25,
  "examWeight": 0.20,
  "differentialWeight": 0.25,
  "planWeight": 0.20,
  "communicationWeight": 0.10
}
```

---

## Cases 2–6: Structure Reference

Cases 2–6 follow the identical JSON structure as Case 1 above. Each case populates all fields:

### Case 2: "Two Speeds" (Bipolar II, INTERMEDIATE)
- Full HPI with longitudinal mood history revealing prior depressive episodes + current hypomanic presentation
- Medication list includes SSRI (sertraline 100mg — potential destabilizer)
- MSE reflects irritable hypomania (rapid speech, pressured, tangential)
- Key history: bipolar screening questions, medication timeline, sleep changes, spending/impulsivity
- Differentials: Bipolar II (correct), Unipolar Depression with anxiety, ADHD, Substance-induced mood disorder
- Critical actions: SSRI taper plan, mood stabilizer discussion, longitudinal mood charting, family collateral

### Case 3: "After the Funeral" (Grief vs. Depression vs. Neurocognitive, ADVANCED)
- HPI includes bereavement hallucination (seeing deceased husband) — requires careful differential
- Telehealth-specific MSE adaptations (limited observation, self-reported appearance)
- Somatic complaints as primary language of distress
- Key history: cognitive screening, grief timeline, cultural grief practices, ADL assessment
- Differentials: Prolonged Grief Disorder (correct primary), MDD (comorbid possible), Mild Neurocognitive Disorder (needs workup)
- Critical actions: MoCA referral, medical workup, cultural assessment, family involvement, geriatric-specific safety assessment

### Case 4: "Can't Catch My Breath" (Panic Disorder, BEGINNER)
- HPI details 3 ER visits with full panic symptom inventory
- MSE reflects acute anxiety (fidgety, restless, health-focused)
- Avoidance behavior documentation critical for agoraphobic specifier
- Key history: medical workup adequacy, avoidance mapping, onset context
- Differentials: Panic Disorder with Agoraphobia (correct), Generalized Anxiety Disorder, Somatic Symptom Disorder, Cardiac cause (ruled out but must confirm)
- Critical actions: Confirm cardiac workup adequacy, anxiety screening tools, psychoeducation, SSRI + CBT discussion

### Case 5: "The War Followed Me Home" (PTSD + AUD, INTERMEDIATE)
- HPI with military trauma and substance use intertwined
- MSE reflects hypervigilance, emotional numbing, guarded presentation
- Personality notes critical — guarded veteran who opens up only with rapport
- Key history: trauma screen (PCL-5), AUDIT-C, TBI screen, IPV screen, weapons access
- Differentials: PTSD (correct primary) + AUD (comorbid), MDD with AUD, AUD primary, TBI-related
- Critical actions: Trauma-informed pacing, dual-diagnosis treatment plan, couples/family assessment, weapons safety

### Case 6: "Perfect on Paper" (Social Anxiety + Eating Disorder, ADVANCED)
- HPI requires separating medical admission from psychiatric presentation
- C-L setting dynamics (parents at bedside, medical team relationship)
- Hidden eating disorder requires specific screening when parents aren't present
- Key history: private interview, eating behaviors, propranolol misuse, academic/family pressure
- Differentials: Social Anxiety Disorder + restrictive eating (correct), Anorexia Nervosa subthreshold, GAD, Medical cause of syncope
- Critical actions: Private interview without parents, eating assessment, vital sign interpretation, nutrition consult, outpatient plan with confidentiality

---

## File Deliverable

**Single file:** `scripts/seed-virtual-clinic-cases.ts`

This script:
1. Finds Katie Thompson (EDUCATOR) as the case creator
2. Creates 6 `ClinicalCase` records via `prisma.clinicalCase.upsert()` (keyed on `title`)
3. Sets all cases as `published: true`
4. Logs creation summary

**No other files modified.** No schema changes, no new components, no new routes.

## Verification

After running the seed script:
1. Log in as Katie Thompson (EDUCATOR)
2. Navigate to `/virtual-clinic`
3. Verify 6 cases appear in the case library
4. Verify difficulty badges and organ system tags display correctly
5. Verify case detail view shows all clinical content
6. Start a test encounter on Case 1 — verify AI patient responds in character as Marcus Williams with appropriate personality traits
