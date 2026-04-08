/**
 * Seed script for Virtual Clinic — DNP Psychiatry Assessment Cases (Phase 1: Cases 1–6)
 * Run: npx tsx scripts/seed-virtual-clinic-cases.ts
 *
 * Creates 6 ClinicalCase records for DNP-Psychiatry student assessment training.
 * Idempotent: deletes existing cases by title before re-creating.
 */
import { PrismaClient } from '../app/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const SCORING_RUBRIC = {
  historyWeight: 0.25,
  examWeight: 0.20,
  differentialWeight: 0.25,
  planWeight: 0.20,
  communicationWeight: 0.10,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 1: "The Weight of It All" — BEGINNER, MDD
// ═══════════════════════════════════════════════════════════════════════════════

const case1 = {
  title: 'The Weight of It All',
  chiefComplaint: "I've just been feeling really down lately... I don't know, I can't seem to shake it.",
  program: 'DNP_PSYCHIATRY' as const,
  difficulty: 'BEGINNER' as const,
  targetYear: 1,
  organSystems: ['psychiatric', 'neurological'],
  learningObjectives: [
    'Conduct a systematic depression screening using DSM-5-TR criteria',
    'Perform a complete mental status examination',
    'Screen for suicidality using C-SSRS framework',
    'Develop a biopsychosocial formulation',
    'Create an appropriate treatment plan including pharmacotherapy and psychotherapy referral',
  ],
  tags: ['depression', 'MDD', 'suicidality', 'beginner', 'outpatient', 'African-American'],
  patientName: 'Marcus Williams',
  patientAge: 34,
  patientSex: 'Male',
  patientPronouns: 'he/him',
  personalityNotes:
    "Stoic and reserved. Minimizes emotional symptoms — 'I just need to toughen up.' Uses work-focused language. Won't volunteer suicidal ideation but will disclose passive thoughts if asked directly and with empathy. Avoids eye contact when discussing feelings. Speaks in short sentences unless asked open-ended questions. Becomes slightly more open mid-interview if the student demonstrates genuine interest rather than checklist-style questioning. Defense mechanisms: intellectualization (frames distress as 'stress'), minimization, stoic suppression. Rapport requirement: non-judgmental, patient pacing — rushing him shuts him down. Opens up when the clinician validates his role as a father and provider without being patronizing.",
  historyOfPresentIllness: {
    onset: 'About 6 weeks ago',
    precipitants:
      "Passed over for a promotion he'd been working toward for 2 years. The position went to a newer, less experienced colleague. Around the same time, his mother was diagnosed with early-stage breast cancer.",
    character:
      "Persistent low mood, loss of interest in activities he used to enjoy (coaching his son's basketball team, working out, watching sports). Feels like he's 'going through the motions.'",
    severity: "7/10 — 'It's not like I can't function, I just don't want to do anything'",
    associatedSymptoms: [
      'difficulty falling asleep (takes 1-2 hours)',
      'early morning awakening (4 AM, can\'t fall back asleep)',
      'decreased appetite with 12-pound weight loss in 6 weeks',
      'fatigue despite adequate hours in bed',
      "difficulty concentrating at work — making mistakes he normally wouldn't",
      'guilt about not being a better father and husband',
      "passive suicidal ideation — 'sometimes I think my family would be better off without me' — no plan, no intent, no prior attempts",
    ],
    timeline:
      'Gradual onset over 2-3 weeks after the promotion decision, worsened when mother\'s diagnosis came. Has been consistently low for past 6 weeks with no good days.',
    narrative:
      "Marcus is a 34-year-old married Black man presenting for his first psychiatric evaluation. He was referred by his PCP after his wife called the doctor's office expressing concern. He initially resisted coming — 'I told her I'm fine, I just need some time.' He describes 6 weeks of persistent depressed mood, anhedonia, sleep disturbance (initial and terminal insomnia), significant appetite loss with 12-pound weight loss, fatigue, difficulty concentrating at work, and pervasive guilt. He has passive suicidal ideation ('my family would be better off') but denies plan, intent, or access to means beyond what's normal in his household. He has never seen a mental health professional before and is skeptical but trying for his wife's sake.",
  },
  pastMedicalHistory: {
    conditions: [
      'Hypertension (diagnosed age 30, controlled with medication)',
      'Pre-diabetes (A1C 5.9, managing with diet)',
    ],
    surgeries: ['Appendectomy age 16'],
    hospitalizations: ['None psychiatric. Appendectomy only.'],
    previousPsychTreatment: "None. Has never seen a therapist or psychiatrist. 'I'm not the therapy type.'",
  },
  medications: [
    { name: 'Lisinopril', dose: '10mg', frequency: 'daily', notes: 'For hypertension, compliant' },
    { name: 'Multivitamin', dose: '1 tablet', frequency: 'daily', notes: '' },
  ],
  allergies: [{ allergen: 'Sulfa drugs', reaction: 'Rash as a child' }],
  socialHistory: {
    smoking: 'Non-smoker, never',
    alcohol: 'Social drinker — 2-3 beers on weekends. No increase recently. Denies using alcohol to cope.',
    drugs: 'Denies any illicit drug use. No cannabis. No history of substance use.',
    caffeine: '3-4 cups of coffee daily, increased from 2 since sleep problems started',
    occupation:
      'Operations manager at a logistics company. 8 years with the company. Recently passed over for promotion — position went to a colleague with 3 years less experience.',
    livingSituation:
      'Lives with wife Tamara (33, teacher) and two sons (7 and 4) in a 3-bedroom house they own. Stable housing.',
    relationships:
      "Married 9 years. Describes marriage as 'good but strained right now.' Wife is frustrated that he won't talk about how he's feeling. Has withdrawn from family activities.",
    support:
      "Wife is supportive but frustrated. Mother (diagnosed with breast cancer 5 weeks ago). Father deceased (heart attack, age 58). One younger brother, not close. A few work friends but doesn't confide in them. Church member but attendance has dropped off.",
    education: "Bachelor's degree in business administration",
    legal: 'No legal history',
    military: 'None',
    spirituality:
      "Baptist, raised in church. Used to attend weekly. Hasn't gone in a month — 'doesn't feel right going when I feel like this.'",
  },
  familyHistory: {
    conditions: [
      {
        relation: 'Mother',
        condition:
          "Currently being treated for breast cancer. History of 'nerves' — likely undiagnosed anxiety. Never treated.",
      },
      {
        relation: 'Father',
        condition:
          "Deceased at 58 from MI. History of hypertension, possible depression (heavy drinker in his 40s, 'dark moods').",
      },
      { relation: 'Paternal uncle', condition: 'Alcohol use disorder' },
      {
        relation: 'Maternal grandmother',
        condition: "Depression — 'took to her bed for months' after grandfather died",
      },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Fatigue (daily, worse in afternoon), 12-lb weight loss in 6 weeks, decreased appetite',
    cardiovascular: 'Denies chest pain, palpitations. Hypertension controlled.',
    respiratory: 'Denies SOB, cough',
    gastrointestinal:
      'Decreased appetite, occasional nausea when forcing himself to eat. No vomiting, no changes in bowel habits.',
    neurological:
      'Difficulty concentrating, forgetfulness at work (leaving tasks incomplete, missing details). Denies headaches, dizziness, numbness/tingling.',
    musculoskeletal: 'Denies pain. Has stopped exercising — used to lift weights 4x/week.',
    endocrine: 'Pre-diabetes. Denies polyuria, polydipsia, heat/cold intolerance.',
    psychiatric:
      "Depressed mood daily, anhedonia (no longer enjoys coaching, working out, sports), guilt, worthlessness ('I'm failing as a father'), passive SI ('family better off without me') — no plan/intent/attempt, initial and terminal insomnia, psychomotor slowing (wife says he moves slower), difficulty concentrating, decreased libido.",
    sleep:
      'Takes 1-2 hours to fall asleep. Wakes at 4 AM and cannot return to sleep. Getting ~4-5 hours per night. No snoring per wife. No restless legs.',
  },
  vitalSigns: {
    bloodPressure: '132/84',
    heartRate: 68,
    respiratoryRate: 14,
    temperature: 98.4,
    weight: '198 lbs (down from 210 lbs 6 weeks ago)',
    height: '5\'11"',
    bmi: 27.6,
  },
  physicalExamFindings: {
    'mental-status-appearance': {
      finding:
        'Well-built Black male appearing stated age. Dressed in clean but wrinkled khakis and polo shirt (wife picked them out). Mild psychomotor retardation — slow to rise from chair, movements deliberate. Decreased eye contact, looks at floor when discussing feelings. No abnormal movements.',
      interpretation:
        'Appearance consistent with depression — psychomotor slowing, decreased self-care effort, reduced eye contact',
    },
    'mental-status-mood-affect': {
      finding:
        "Mood: 'Down, I guess. Heavy.' Affect: Constricted range, predominantly sad and flat. Occasional flickers of warmth when mentioning his sons. Congruent with stated mood. No lability.",
      interpretation: 'Depressed mood with constricted, sad affect consistent with major depressive episode',
    },
    'mental-status-speech': {
      finding:
        'Low volume, slightly slowed rate, normal rhythm. Increased latency — takes 3-5 seconds to respond to questions. Minimal spontaneous speech. Answers tend toward brief, requiring follow-up prompts.',
      interpretation: 'Speech pattern consistent with psychomotor retardation of depression',
    },
    'mental-status-thought-process': {
      finding:
        'Goal-directed but slowed. Logical and linear when engaged. No tangentiality or loose associations. Ruminative quality — returns to themes of failure and guilt without prompting.',
      interpretation: 'Preserved thought process with depressive rumination',
    },
    'mental-status-thought-content': {
      finding:
        "Preoccupied with guilt (failing family, not being strong enough), worthlessness ('what's the point'), and hopelessness ('I don't see this getting better'). Passive suicidal ideation: 'Sometimes I think they'd be better off without me.' Denies active plan, intent, or prior attempts. Denies homicidal ideation. No delusions, obsessions, or phobias.",
      interpretation: 'Depressive thought content with passive SI — requires safety assessment and planning',
    },
    'mental-status-perceptions': {
      finding:
        'Denies auditory, visual, tactile, olfactory, or gustatory hallucinations. No illusions. No depersonalization or derealization.',
      interpretation: 'No perceptual disturbances — rules out psychotic features',
    },
    'mental-status-cognition': {
      finding:
        "Alert and oriented x4. Attention: able to spell WORLD backward with one error (DLROW → DLRWO). Able to recall 2/3 objects at 5 minutes (missed 'pencil,' recalled with category cue). Serial 7s: slow but accurate. Fund of knowledge appropriate for education level.",
      interpretation:
        'Mild attentional and short-term memory deficits consistent with depression — pseudodementia pattern, not primary cognitive disorder',
    },
    'mental-status-insight-judgment': {
      finding:
        "Insight: Partial. Acknowledges something is wrong ('I know I'm not myself') but reluctant to label it as depression ('I don't think I'm depressed, I'm just stressed'). Judgment: Intact — agreed to come to appointment, maintained work attendance, caring for children safely.",
      interpretation: 'Partial insight with intact judgment — amenable to treatment if approached without stigma',
    },
    'suicidality-assessment': {
      finding:
        "C-SSRS: Passive ideation present ('family better off without me') — frequency: several times per week, duration: fleeting (seconds). No active ideation. No plan. No intent. No preparatory behavior. No prior attempts. Protective factors: children ('I'd never do that to my boys'), wife, employment, religious faith (weakened but present). Risk factors: male, Black (cultural barriers to treatment), family history, access to means (not assessed — no firearms reported), recent stressors.",
      interpretation:
        'Low-moderate acute risk. Passive SI with protective factors. Outpatient management appropriate with safety planning.',
    },
    'homicidality-assessment': {
      finding: 'Denies homicidal ideation, intent, or plan. No history of violence. No access to weapons reported.',
      interpretation: 'No homicidal risk identified',
    },
    'substance-use-screen': {
      finding:
        'AUDIT-C: Score 3 (2-3 drinks, 2-3 times/month, never 6+). Below clinical threshold. No drug use. Caffeine increased.',
      interpretation: 'No substance use disorder. Monitor caffeine as sleep hygiene issue.',
    },
  },
  defaultNormalFindings: {
    general: 'Well-nourished male in no acute distress',
    cardiovascular: 'Regular rate and rhythm, no murmurs',
    respiratory: 'Clear to auscultation bilaterally',
    neurological: 'Cranial nerves II-XII intact, no focal deficits',
  },
  availableLabs: [
    { name: 'CBC', result: 'WNL — Hgb 14.2, WBC 6.8, Plt 245' },
    { name: 'CMP', result: 'WNL — glucose 108 (consistent with pre-diabetes), otherwise normal' },
    { name: 'TSH', result: '2.3 mIU/L (normal range 0.4-4.0)' },
    { name: 'Free T4', result: '1.1 ng/dL (normal)' },
    { name: 'Vitamin B12', result: '480 pg/mL (normal)' },
    { name: 'Folate', result: '12 ng/mL (normal)' },
    { name: 'Vitamin D', result: '22 ng/mL (low-normal — consider supplementation)' },
    { name: 'Hemoglobin A1C', result: '5.9% (pre-diabetes, unchanged)' },
    { name: 'Lipid Panel', result: 'Total cholesterol 198, LDL 122, HDL 42, TG 170 — mildly dyslipidemic' },
    {
      name: 'Testosterone',
      result: 'Not ordered — consider if sexual dysfunction persists after depression treatment',
    },
    { name: 'Urine Drug Screen', result: 'Negative' },
  ],
  availableImaging: [],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Major Depressive Disorder, Single Episode, Moderate (F32.1)',
      supportingFindings: [
        'Depressed mood >2 weeks (6 weeks)',
        'Anhedonia',
        'Sleep disturbance (initial and terminal insomnia)',
        'Appetite/weight loss (12 lbs)',
        'Fatigue',
        'Difficulty concentrating',
        'Guilt/worthlessness',
        'Passive suicidal ideation',
        'Psychomotor retardation',
        'Meets ≥5/9 DSM-5 criteria',
        'Family history of depression',
        'No prior manic/hypomanic episodes',
      ],
      opposingFindings: [
        'First episode — could evolve',
        'No psychotic features (moderate, not severe)',
        'Functioning partially maintained (still working)',
      ],
    },
    {
      rank: 2,
      diagnosis: 'Adjustment Disorder with Depressed Mood (F43.21)',
      supportingFindings: [
        "Clear identifiable stressor (promotion, mother's cancer)",
        'Onset within 3 months of stressor',
        'Significant distress',
      ],
      opposingFindings: [
        'Symptom severity exceeds what\'s expected for adjustment (passive SI, 12-lb weight loss, pervasive anhedonia)',
        'Meets full MDD criteria — adjustment disorder is a diagnosis of exclusion when mood disorder criteria are met',
        'Family history suggests biological vulnerability',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Persistent Depressive Disorder (Dysthymia) (F34.1)',
      supportingFindings: ['Could be early presentation'],
      opposingFindings: [
        'Duration only 6 weeks (requires 2 years for PDD)',
        'No history of chronic low-level depression',
        'Acute onset with clear precipitant',
      ],
    },
  ],
  keyHistoryQuestions: [
    {
      question: 'How long have you been feeling this way?',
      domain: 'psychiatric',
      criticalInfo: 'Establishes duration — 6 weeks meets MDD criteria (>2 weeks)',
    },
    {
      question: 'Have you had thoughts of harming yourself or ending your life?',
      domain: 'suicidality',
      criticalInfo:
        'CRITICAL SAFETY — reveals passive SI that patient won\'t volunteer. Missing this is a major scoring penalty.',
    },
    {
      question: 'Have you ever felt this way before?',
      domain: 'psychiatric',
      criticalInfo: 'Screens for recurrent episodes and possible bipolar history',
    },
    {
      question:
        'Have you ever had a period where you felt the opposite — unusually energetic, needed less sleep, felt on top of the world?',
      domain: 'psychiatric',
      criticalInfo: 'Bipolar screen — essential before starting an antidepressant',
    },
    {
      question: 'How is your sleep?',
      domain: 'functional',
      criticalInfo: 'Neurovegetative symptom — reveals both initial and terminal insomnia',
    },
    {
      question: 'How is your appetite? Have you noticed weight changes?',
      domain: 'functional',
      criticalInfo: 'Neurovegetative symptom — 12-lb loss in 6 weeks is significant',
    },
    {
      question: 'Tell me about what was happening in your life when this started.',
      domain: 'social-history',
      criticalInfo: "Identifies precipitants — promotion and mother's cancer",
    },
    {
      question: 'Is there any history of depression or mental health problems in your family?',
      domain: 'family-history',
      criticalInfo: 'Reveals significant family psychiatric history (father, grandmother, uncle)',
    },
    {
      question: 'How much are you drinking?',
      domain: 'substance-use',
      criticalInfo: 'Screens for self-medication — currently low-risk but important to assess',
    },
    {
      question: 'What does a typical day look like for you right now?',
      domain: 'functional',
      criticalInfo: 'Assesses functional impairment across domains — work, family, self-care, activities',
    },
    {
      question: 'Do you have any guns or firearms in the home?',
      domain: 'suicidality',
      criticalInfo: 'Means access assessment — essential with passive SI',
    },
  ],
  keyExamManeuvers: [
    {
      maneuver: 'mental-status-appearance',
      expectedFinding: 'Psychomotor retardation, decreased eye contact, mild self-care decline',
      significance: 'Observable depression markers',
    },
    {
      maneuver: 'mental-status-mood-affect',
      expectedFinding: 'Depressed mood, constricted sad affect',
      significance: 'Core MSE finding for MDD',
    },
    {
      maneuver: 'mental-status-thought-content',
      expectedFinding: 'Guilt, worthlessness, passive SI',
      significance: 'Identifies depressive cognitions and safety concerns',
    },
    {
      maneuver: 'suicidality-assessment',
      expectedFinding: 'Passive ideation without plan/intent, protective factors present',
      significance: 'CRITICAL — determines disposition and safety planning',
    },
    {
      maneuver: 'mental-status-cognition',
      expectedFinding: 'Mild attention/memory deficits (pseudodementia)',
      significance: 'Differentiates from primary cognitive disorder',
    },
    {
      maneuver: 'substance-use-screen',
      expectedFinding: 'Low-risk alcohol use, no drugs',
      significance: 'Rules out substance-induced mood disorder',
    },
  ],
  criticalActions: [
    'Screen for suicidality (C-SSRS) — passive ideation present',
    'Screen for bipolar history before starting antidepressant',
    'Assess means access (firearms, medications)',
    'Create collaborative safety plan',
    'Order baseline labs (TSH, CBC, CMP) to rule out medical causes',
    'Discuss treatment options: SSRI + psychotherapy referral',
    'Address cultural barriers to treatment (stigma, stoicism)',
    'Assess family support and involve wife in treatment planning (with permission)',
    'Schedule follow-up within 1-2 weeks',
  ],
  scoringRubric: SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 2: "Two Speeds" — INTERMEDIATE, Bipolar II
// ═══════════════════════════════════════════════════════════════════════════════

const case2 = {
  title: 'Two Speeds',
  chiefComplaint: "My roommate made me come here. She says I'm acting weird, but I feel FINE. Better than fine, actually. Everyone else is the problem.",
  program: 'DNP_PSYCHIATRY' as const,
  difficulty: 'INTERMEDIATE' as const,
  targetYear: 2,
  organSystems: ['psychiatric', 'endocrine'],
  learningObjectives: [
    'Distinguish Bipolar II from unipolar depression through longitudinal mood history',
    'Identify medication-induced hypomania (SSRI destabilization)',
    'Recognize culturally-shaped symptom expression in South Asian patients',
    'Screen for mixed features in hypomanic presentations',
    'Develop a treatment plan addressing mood stabilization and SSRI taper',
  ],
  tags: ['bipolar', 'bipolar-II', 'hypomania', 'SSRI-destabilization', 'intermediate', 'emergency', 'South-Asian'],
  patientName: 'Priya Chakraborty',
  patientAge: 28,
  patientSex: 'Female',
  patientPronouns: 'she/her',
  personalityNotes:
    "Rapid speech, tangential at times, frustrated that 'no one has gotten this right.' Alternates between irritable dismissiveness and moments of insight where she admits something feels off. Defense mechanisms: rationalization ('I'm just finally productive'), projection ('my roommate is the anxious one'), intellectualization (uses graduate-level vocabulary to deflect emotional exploration). Rapport requirement: validate her frustration with prior providers without colluding with her denial. She opens up when the clinician acknowledges that she's been through a lot of treatment without feeling better — not when told she's 'manic.' Cultural context: family frames emotional distress as 'being dramatic' and values academic achievement above all; she's internalized shame about needing help. Opens up about family pressure if asked directly, but frames it as motivation rather than stress unless the clinician gently challenges that framing.",
  historyOfPresentIllness: {
    onset: 'Current hypomanic episode began approximately 10 days ago, but mood instability has been present for years',
    precipitants:
      'Sertraline increased from 50mg to 100mg by PCP 3 weeks ago for worsening depression. Within 10 days of dose increase, mood shifted dramatically. Also under significant academic pressure — qualifying exams in 2 months.',
    character:
      "Irritable, energized, pressured. Sleeping 3-4 hours/night and 'not tired.' Started 3 new projects simultaneously — reorganized entire apartment at 3 AM, began writing a novel, signed up for a half-marathon. Spending increased (bought $800 in art supplies). Roommate concerned about erratic behavior, confrontational tone, and talking over people.",
    severity: "She rates herself 2/10 distress — 'I'm finally feeling like myself.' Roommate and ER clinician rate concern at 8/10.",
    associatedSymptoms: [
      'decreased need for sleep (3-4 hours, feels rested)',
      'pressured speech — rapid, hard to interrupt',
      'increased goal-directed activity (multiple simultaneous projects)',
      'increased spending ($800 art supplies, online shopping)',
      'irritability — snapped at roommate, professor, barista',
      'racing thoughts — describes mind as "finally working at full speed"',
      'grandiosity — "I could finish my dissertation in a week if everyone would stop interrupting me"',
      'no psychotic features',
      'no frank mania (still going to class, maintaining some structure)',
    ],
    timeline:
      'History reveals 3 prior depressive episodes: age 19 (freshman year, treated with fluoxetine briefly), age 23 (after breakup, untreated), age 27 (current episode leading to sertraline). No prior recognized hypomanic episodes, but on review she describes a 2-week period at age 24 where she "felt amazing," barely slept, started a business plan that she abandoned — chalked it up to "finally getting over the breakup." Current episode is most pronounced.',
    narrative:
      "Priya is a 28-year-old South Asian graduate student brought to the ED by her roommate who is alarmed by 10 days of escalating behavior: decreased sleep, rapid speech, irritability, impulsive spending, and multiple new projects. Priya does not believe anything is wrong — she feels she is finally 'functioning at capacity' after months of depression. History reveals she has been treated for recurrent depression since age 19, with the current episode leading to sertraline initiation 4 months ago at 50mg, increased to 100mg 3 weeks ago. The mood shift from depression to current state began within 10 days of the dose increase, consistent with SSRI-induced hypomania. Longitudinal history reveals at least one prior unrecognized hypomanic episode at age 24. She meets DSM-5-TR criteria for Bipolar II Disorder, currently in a hypomanic episode, likely precipitated by antidepressant use.",
  },
  pastMedicalHistory: {
    conditions: [
      'Hypothyroidism (diagnosed age 25, on levothyroxine, well-controlled)',
      'Iron-deficiency anemia (intermittent, last treated 1 year ago)',
      'Migraine with aura (2-3/year, uses sumatriptan PRN)',
    ],
    surgeries: ['None'],
    hospitalizations: ['None'],
    previousPsychTreatment:
      'Fluoxetine 20mg at age 19 for 3 months (stopped on her own — "felt better"). No therapy. Sertraline started 4 months ago by PCP for current depressive episode. No prior psychiatric hospitalization. No prior mania/hypomania diagnosis.',
  },
  medications: [
    { name: 'Sertraline', dose: '100mg', frequency: 'daily', notes: 'Increased from 50mg 3 weeks ago — potential destabilizer' },
    { name: 'Levothyroxine', dose: '75mcg', frequency: 'daily', notes: 'For hypothyroidism, compliant' },
    { name: 'Sumatriptan', dose: '50mg', frequency: 'PRN', notes: 'For migraines, uses 2-3x/year' },
    { name: 'Oral contraceptive', dose: 'combination pill', frequency: 'daily', notes: 'Compliant' },
  ],
  allergies: [{ allergen: 'Amoxicillin', reaction: 'Hives' }],
  socialHistory: {
    smoking: 'Never',
    alcohol: 'Rarely — 1-2 drinks socially, maybe 2x/month. No increase recently.',
    drugs: 'Tried cannabis once in college, didn\'t like it. No other drug use.',
    caffeine: '4-5 cups of tea daily (chai), increased to 6-7 in past week — "I don\'t need sleep but I like the ritual"',
    occupation: 'PhD student in biomedical engineering, 4th year. Teaching assistant. Qualifying exams in 2 months.',
    livingSituation: 'Shares apartment with roommate (Megan, also grad student). Stable housing, university-subsidized.',
    relationships: 'Single. Broke up with long-term boyfriend 6 months ago ("he couldn\'t keep up with me"). No current partner. Describes difficulty maintaining friendships — "people drain me or bore me."',
    support: 'Roommate Megan (concerned but supportive). Parents in New Jersey — father is a cardiologist, mother is a pharmacist. Younger brother in medical school. Family is "achievement-oriented." Mother calls weekly — relationship described as "complicated."',
    education: 'BS in biomedical engineering (summa cum laude), currently pursuing PhD',
    legal: 'No legal history',
    military: 'None',
    spirituality: 'Hindu by upbringing, not currently practicing. "Science is my religion."',
  },
  familyHistory: {
    conditions: [
      { relation: 'Mother', condition: 'Treated for "anxiety and depression" — on escitalopram. Possible undiagnosed bipolar (patient describes mother having "energetic phases" where she redecorates the house and doesn\'t sleep).' },
      { relation: 'Father', condition: 'No psychiatric history. Hypertension, Type 2 Diabetes.' },
      { relation: 'Maternal aunt', condition: 'Bipolar I — hospitalized twice. Patient aware but dismisses relevance ("she\'s nothing like me").' },
      { relation: 'Maternal grandfather', condition: '"Mood swings" — family never sought treatment. Described as alternating between "high energy" and "dark periods."' },
      { relation: 'Younger brother', condition: 'ADHD, diagnosed in college, on stimulant medication.' },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Decreased need for sleep (3-4 hrs). Weight stable. Energy "through the roof." No fever.',
    cardiovascular: 'Palpitations — intermittent, associated with caffeine. Denies chest pain.',
    respiratory: 'Denies SOB, cough',
    gastrointestinal: 'Appetite increased slightly — eating erratically, forgetting meals then eating large amounts. No nausea/vomiting.',
    neurological: 'Racing thoughts. Denies headache (migraines controlled). No focal neurological symptoms.',
    musculoskeletal: 'No pain. Increased physical activity — running, cleaning, organizing.',
    endocrine: 'Hypothyroidism controlled. No new symptoms. Due for TSH check.',
    psychiatric: 'Elevated/irritable mood, decreased need for sleep, pressured speech, racing thoughts, increased goal-directed activity, impulsive spending, grandiosity. Denies SI/HI. Denies hallucinations. Denies prior manic episodes (but history suggests otherwise). Insight poor regarding current state.',
    sleep: '3-4 hours per night for past 10 days. Falls asleep quickly but wakes after 3-4 hours feeling fully rested. Denies nightmares.',
  },
  vitalSigns: {
    bloodPressure: '128/78',
    heartRate: 96,
    respiratoryRate: 16,
    temperature: 98.6,
    weight: '132 lbs',
    height: '5\'4"',
    bmi: 22.7,
  },
  physicalExamFindings: {
    'mental-status-appearance': {
      finding:
        'South Asian female appearing younger than stated age. Dressed in bright, mismatched layers (neon yellow cardigan over patterned dress, multiple bracelets). Hair pulled into messy bun with pen stuck through it. Psychomotor agitation — fidgets constantly, crosses and uncrosses legs, gestures expansively. Leans forward in chair. Makes intense eye contact. Minimal personal space awareness — leans toward examiner.',
      interpretation: 'Appearance and psychomotor activity consistent with hypomanic state — increased energy, decreased attention to grooming coordination, motor restlessness',
    },
    'mental-status-mood-affect': {
      finding:
        "Mood: 'I feel great — everyone else is the one with the problem.' Affect: Expansive, labile — rapidly shifts from irritable (when questioned about behavior) to effusive (when discussing projects) to briefly tearful (when asked about mother). Affect intensity increased. Mood-incongruent moments when discussing relationship breakup (laughs it off but eyes fill briefly).",
      interpretation: 'Expansive, labile affect with irritability consistent with hypomania. Brief mood incongruence suggests underlying distress beneath elevated presentation.',
    },
    'mental-status-speech': {
      finding:
        'Rapid rate, increased volume, pressured quality — difficult to interrupt. Tangential at times — starts answering one question, jumps to related topic, requires redirection. Latency decreased (answers before questions are finished). Uses elaborate vocabulary. Speech has a driven quality.',
      interpretation: 'Pressured speech with tangentiality — hallmark of hypomanic/manic episode',
    },
    'mental-status-thought-process': {
      finding:
        'Tangential — jumps between topics (dissertation → apartment renovation → novel she started writing → criticism of roommate) but can be redirected. Flight of ideas present but not severe. Goal-directed when focused on a single topic. No loosening of associations. Circumstantial at times.',
      interpretation: 'Thought process consistent with hypomania — tangential with flight of ideas but redirectable (distinguishes from mania)',
    },
    'mental-status-thought-content': {
      finding:
        'Grandiose thinking present — believes she can finish dissertation in one week, plans to start a biotech company, dismisses concerns of others as jealousy. No frank delusions. No obsessions. No phobias. Denies SI — "Why would I want to die? I finally feel alive." Denies HI. Intermittent frustration that others are "holding her back."',
      interpretation: 'Grandiosity without frank delusions — consistent with hypomania rather than mania. SI denial — but bipolar depression carries high suicide risk; must address future safety planning.',
    },
    'mental-status-perceptions': {
      finding:
        'Denies auditory, visual, or tactile hallucinations. No illusions. No depersonalization or derealization. Describes thoughts as "loud" but clarifies they are her own thoughts, not voices.',
      interpretation: 'No perceptual disturbances — helps distinguish hypomania from mania with psychotic features',
    },
    'mental-status-cognition': {
      finding:
        'Alert and oriented x4. Attention: distractible — able to complete tasks but frequently interrupted by own tangential thoughts. Digits forward: 7 (above average). Digits backward: 5 (normal). Memory: 3/3 registration, 3/3 recall at 5 minutes (memory intact). Fund of knowledge superior — spontaneously references research studies.',
      interpretation: 'Cognition intact with distractibility — consistent with hypomania. No cognitive deficits suggestive of neurological cause.',
    },
    'mental-status-insight-judgment': {
      finding:
        "Insight: Poor. Does not believe she is experiencing a mood episode. 'I'm not manic — I know what mania looks like, my aunt has it. I'm just finally not depressed.' Judgment: Impaired — impulsive spending, decreased sleep without concern, starting multiple unrealistic projects, confrontational behavior. Agreed to come to ER only because roommate threatened to call parents.",
      interpretation: 'Poor insight and impaired judgment — classic in hypomania. Patient\'s comparison to aunt (Bipolar I) is a common minimization strategy.',
    },
    'suicidality-assessment': {
      finding:
        "C-SSRS: No current suicidal ideation. 'I feel great.' However, patient has history of depressive episodes with passive SI (age 19 — 'thought about it but never planned anything'). Bipolar II carries 20-60x population suicide risk, particularly during depressive or mixed episodes. Current hypomanic episode will cycle to depression. Safety planning must address future depressive phases.",
      interpretation: 'No acute suicidal risk currently, but high longitudinal risk given Bipolar II diagnosis. Safety planning for future depressive episodes is a critical action.',
    },
    'homicidality-assessment': {
      finding:
        'Denies homicidal ideation. Irritable but not aggressive. No history of violence. Yelled at roommate but no physical altercation.',
      interpretation: 'No homicidal risk. Irritability is mood-state-driven, not characterological.',
    },
    'substance-use-screen': {
      finding:
        'AUDIT-C: Score 1 (minimal alcohol use). No drug use. Caffeine significantly increased (6-7 cups tea daily). Urine drug screen obtained in ER: negative.',
      interpretation: 'No substance use disorder. Rule out substance-induced mood disorder — UDS negative. Caffeine excess may be contributing to sleep disruption but is likely secondary to hypomania.',
    },
  },
  defaultNormalFindings: {
    general: 'Well-nourished female in no acute distress, appears energized',
    cardiovascular: 'Tachycardic at 96 bpm, regular rhythm, no murmurs',
    respiratory: 'Clear to auscultation bilaterally',
    neurological: 'Cranial nerves II-XII intact, no focal deficits',
  },
  availableLabs: [
    { name: 'CBC', result: 'WNL — Hgb 12.8, WBC 7.2, Plt 230' },
    { name: 'CMP', result: 'WNL — all values within normal limits' },
    { name: 'TSH', result: '3.1 mIU/L (normal range 0.4-4.0 — hypothyroidism well-controlled on levothyroxine)' },
    { name: 'Free T4', result: '1.0 ng/dL (normal)' },
    { name: 'Urine Drug Screen', result: 'Negative' },
    { name: 'Blood Alcohol Level', result: '0.00' },
    { name: 'hCG', result: 'Negative' },
    { name: 'Ferritin', result: '28 ng/mL (low-normal — monitor for anemia recurrence)' },
  ],
  availableImaging: [],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Bipolar II Disorder, Current Episode Hypomanic (F31.0)',
      supportingFindings: [
        'Current hypomanic episode (≥4 days, not requiring hospitalization)',
        'History of recurrent depressive episodes (ages 19, 23, 27)',
        'At least one prior unrecognized hypomanic episode (age 24)',
        'Strong family history (maternal aunt Bipolar I, maternal grandfather mood swings, mother possible)',
        'SSRI dose increase temporally associated with mood shift',
        'Meets DSM-5-TR criteria: elevated/irritable mood + ≥3 additional symptoms (decreased sleep, pressured speech, racing thoughts, increased activity, grandiosity, impulsive spending)',
        'Functioning impaired but not requiring hospitalization (distinguishes from Bipolar I)',
      ],
      opposingFindings: [
        'No prior formal diagnosis of hypomania/mania',
        'Patient denies prior episodes (insight limitation)',
        'Could argue first hypomanic episode if age 24 episode not confirmed',
      ],
    },
    {
      rank: 2,
      diagnosis: 'Major Depressive Disorder, Recurrent, with Antidepressant-Induced Hypomania (not a standalone DSM-5-TR code)',
      supportingFindings: [
        'Clear temporal relationship between SSRI increase and mood shift',
        'No confirmed prior hypomanic episodes beyond one questionable episode',
      ],
      opposingFindings: [
        'DSM-5-TR clarifies: if hypomania persists beyond physiological effect of medication AND meets full criteria, Bipolar II is appropriate',
        'Episode has lasted 10+ days with full syndromal criteria',
        'Family history strongly suggests bipolar diathesis',
        'Prior episode at age 24 suggests this is not purely medication-induced',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Attention-Deficit/Hyperactivity Disorder, Adult (F90.2)',
      supportingFindings: [
        'Distractibility, multiple projects, difficulty completing tasks',
        'Family history (brother has ADHD)',
        'High-functioning academic who may have compensated',
      ],
      opposingFindings: [
        'Symptoms are episodic, not lifelong',
        'Sleep disturbance pattern inconsistent (ADHD does not typically reduce need for sleep)',
        'Grandiosity and pressured speech not characteristic of ADHD',
        'Clear mood episodes distinguish from ADHD',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Hyperthyroidism (E05.90)',
      supportingFindings: [
        'Tachycardia, irritability, hyperactivity, sleep disturbance can overlap',
        'Patient has thyroid history',
      ],
      opposingFindings: [
        'TSH normal (3.1) — hypothyroidism well-controlled',
        'Symptoms cluster as mood episode, not thyroid storm',
        'Grandiosity and pressured speech not typical of hyperthyroidism',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'Can you walk me through your mood over the past few weeks — what changed?', domain: 'psychiatric', criticalInfo: 'Establishes timeline of mood shift relative to SSRI increase (10 days post-dose change)' },
    { question: 'Have you ever felt this way before — this energized, this productive?', domain: 'psychiatric', criticalInfo: 'CRITICAL — reveals prior hypomanic episode at age 24 that was never identified' },
    { question: 'Tell me about your sleep over the past week or two.', domain: 'functional', criticalInfo: 'Decreased need for sleep (not insomnia) — 3-4 hours feeling rested — hallmark of hypomania' },
    { question: 'Have you been spending money differently lately?', domain: 'psychiatric', criticalInfo: 'Reveals impulsive $800 spending — goal-directed activity increase' },
    { question: 'When did you start the sertraline, and were there any dosage changes recently?', domain: 'medications', criticalInfo: 'CRITICAL — identifies SSRI dose increase 3 weeks ago as potential hypomania trigger' },
    { question: 'Can you tell me about your previous experiences with depression or mental health treatment?', domain: 'psychiatric', criticalInfo: 'Reveals 3 prior depressive episodes — establishes recurrent pattern required for Bipolar II' },
    { question: 'Is there any history of bipolar disorder or mood problems in your family?', domain: 'family-history', criticalInfo: 'Reveals maternal aunt with Bipolar I, grandfather with mood swings, mother with possible bipolar — strong genetic loading' },
    { question: 'Have you had any thoughts of harming yourself or ending your life?', domain: 'suicidality', criticalInfo: 'Currently denies, but history of passive SI during depression. Bipolar II carries very high suicide risk in depressive phases.' },
    { question: 'Are you using any substances — alcohol, drugs, caffeine?', domain: 'substance-use', criticalInfo: 'Rules out substance-induced mood disorder. Identifies caffeine excess.' },
    { question: 'How does your family react when you go through difficult times emotionally?', domain: 'cultural', criticalInfo: 'Reveals cultural context — family minimizes emotional distress, values achievement, creates shame around needing help' },
    { question: 'How is this affecting your work, your relationships?', domain: 'functional', criticalInfo: 'Assesses functional impairment — confrontation with roommate/professor, impulsive decisions, social friction' },
  ],
  keyExamManeuvers: [
    { maneuver: 'mental-status-speech', expectedFinding: 'Pressured, rapid, difficult to interrupt', significance: 'Cardinal sign of hypomania — distinguishes from anxiety' },
    { maneuver: 'mental-status-mood-affect', expectedFinding: 'Expansive and irritable with lability', significance: 'Core MSE finding for hypomanic episode' },
    { maneuver: 'mental-status-thought-process', expectedFinding: 'Tangential, flight of ideas, redirectable', significance: 'Hypomania (vs. mania where thoughts may be unreddirectable)' },
    { maneuver: 'mental-status-thought-content', expectedFinding: 'Grandiosity without frank delusions', significance: 'Distinguishes hypomania from mania' },
    { maneuver: 'mental-status-insight-judgment', expectedFinding: 'Poor insight, impaired judgment', significance: 'Guides treatment approach — may need family/collateral involvement' },
    { maneuver: 'suicidality-assessment', expectedFinding: 'No current SI but high longitudinal risk', significance: 'Safety planning for future depressive episodes essential in Bipolar II' },
    { maneuver: 'substance-use-screen', expectedFinding: 'No substance use, UDS negative', significance: 'Rules out substance-induced mood disorder' },
  ],
  criticalActions: [
    'Obtain longitudinal mood history — screen for prior hypomanic episodes',
    'Screen for suicidality (C-SSRS) — Bipolar II has high lifetime suicide risk',
    'Review medication timeline — identify SSRI dose increase as temporal trigger',
    'Screen for bipolar family history',
    'Develop SSRI taper plan — sertraline is likely destabilizing mood',
    'Discuss mood stabilizer initiation (lithium, valproate, or lamotrigine for bipolar depression prevention)',
    'Obtain collateral from roommate (with permission) — patient lacks insight',
    'Safety plan addressing future depressive episodes and warning signs',
    'Psychoeducation about Bipolar II — distinguish from "just depression"',
    'Schedule close follow-up (within 1 week) given active mood episode',
  ],
  scoringRubric: SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 3: "After the Funeral" — ADVANCED, Grief vs. Depression vs. Neurocognitive
// ═══════════════════════════════════════════════════════════════════════════════

const case3 = {
  title: 'After the Funeral',
  chiefComplaint: "My daughter made this appointment... I don't think I need it. I'm just sad. My husband died. That's normal, isn't it?",
  program: 'DNP_PSYCHIATRY' as const,
  difficulty: 'ADVANCED' as const,
  targetYear: 3,
  organSystems: ['psychiatric', 'neurological', 'cardiovascular'],
  learningObjectives: [
    'Differentiate Prolonged Grief Disorder from Major Depressive Disorder and early neurocognitive changes',
    'Conduct a psychiatric assessment via telehealth with geriatric considerations',
    'Apply cultural formulation to Mexican-American grief and bereavement practices',
    'Identify somatic symptoms as primary language of distress',
    'Screen for cognitive decline in the context of grief and depression',
  ],
  tags: ['grief', 'depression', 'neurocognitive', 'geriatric', 'advanced', 'telehealth', 'Mexican-American', 'cultural-formulation'],
  patientName: 'Dolores "Lola" Gutierrez',
  patientAge: 72,
  patientSex: 'Female',
  patientPronouns: 'she/her',
  personalityNotes:
    "Warm, maternal, tearful. Speaks with gentle affect punctuated by sudden tears. Uses Spanglish naturally — switches to Spanish when emotional. Defers to family authority: 'my daughter thinks I should talk to someone.' Frames distress through spiritual/religious lens: 'God has a plan, but I don't understand it.' Somatic focus — describes emotional pain as chest tightness, heaviness, and loss of appetite rather than 'depression.' Defense mechanisms: somatization (emotional pain → physical complaints), displacement (worries about grandchildren instead of self), spiritual intellectualization ('It's God's will'). Rapport requirement: warmth, patience, addressing her by 'Señora Gutierrez' initially — she'll invite you to call her 'Lola' if she trusts you. Opens up when the clinician shows genuine interest in her husband, her family, and her faith — not when the focus is purely clinical. May show mild word-finding difficulty — could be grief-related concentration or early cognitive change.",
  historyOfPresentIllness: {
    onset: '8 weeks ago, since the death of her husband Ernesto (married 48 years)',
    precipitants: 'Husband Ernesto died of pancreatic cancer after a 4-month illness. She was his primary caretaker. Death was expected but "you\'re never ready." She moved in with her daughter 2 weeks after the funeral because daughter was worried about her living alone.',
    character: 'Pervasive sadness, yearning for husband, preoccupation with memories of him. Reports seeing him briefly in the hallway twice ("I saw him standing there, then he was gone") — bereavement hallucination vs. psychotic feature. Somatic complaints dominate: chest tightness ("my heart is broken — literally"), poor appetite, fatigue, aches. Difficulty concentrating, forgets appointments, left the stove on twice. Lost interest in cooking (her lifelong passion) and going to church.',
    severity: '8/10 — "The pain is here all the time" (points to chest). "I don\'t know who I am without him."',
    associatedSymptoms: [
      'intense yearning and longing for deceased husband',
      'preoccupation with memories — spends hours looking at photos',
      'brief visual experiences of deceased husband (2 episodes)',
      'chest tightness and heaviness (cardiac workup negative 3 weeks ago)',
      'poor appetite — lost 8 lbs in 8 weeks',
      'fatigue — "I can barely get out of bed"',
      'difficulty concentrating — forgets appointments, loses track of conversations',
      'left stove on twice — daughter concerned about safety',
      'word-finding difficulty — occasional pauses searching for words',
      'insomnia — wakes at 2 AM, reaches for husband\'s side of bed',
      'guilt — "I should have caught the cancer sooner"',
      'loss of interest in cooking, church, grandchildren',
      'passive death wish — "I wish God would take me too" — no plan or intent',
    ],
    timeline: 'Symptoms began immediately after husband\'s death 8 weeks ago. No improvement — daughter says she\'s "getting worse, not better." Cognitive symptoms (forgetfulness, stove incidents) may predate bereavement — daughter recalls mother having some word-finding difficulty and repeating questions for "maybe 6 months" before Ernesto died, but attributed it to caretaking stress.',
    narrative: 'Dolores is a 72-year-old Mexican-American woman presenting via telehealth, referred by her daughter who is concerned about worsening grief, cognitive lapses, and a passive death wish 8 weeks after the death of her husband of 48 years. She presents with somatic complaints (chest tightness, appetite loss, fatigue) as her primary language of distress, along with intense yearning, preoccupation with the deceased, two brief visual experiences of seeing her husband, cognitive difficulties (forgetfulness, word-finding trouble, left stove on twice), and passive suicidal ideation ("I wish God would take me too"). The clinical challenge is a three-way differential: Prolonged Grief Disorder (intense yearning and preoccupation as core), Major Depressive Disorder (neurovegetative symptoms, guilt, death wish), and early Mild Neurocognitive Disorder (cognitive symptoms that may predate the bereavement). Cultural factors complicate assessment: her somatic focus, spiritual framework, and deference to family authority.',
  },
  pastMedicalHistory: {
    conditions: [
      'Hypertension (20 years, on medication)',
      'Type 2 Diabetes (15 years, on metformin, A1C 7.2 last check)',
      'Osteoarthritis (knees, hips — uses acetaminophen)',
      'Hyperlipidemia (on atorvastatin)',
      'History of Vitamin B12 deficiency (supplementing)',
    ],
    surgeries: ['Cholecystectomy age 55', 'Right knee arthroscopy age 65'],
    hospitalizations: ['Cholecystectomy only. No psychiatric hospitalizations.'],
    previousPsychTreatment: 'None. "We don\'t do that in my family. You talk to your priest, not a stranger." Daughter convinced her to try telehealth.',
  },
  medications: [
    { name: 'Lisinopril', dose: '20mg', frequency: 'daily', notes: 'Hypertension' },
    { name: 'Metformin', dose: '1000mg', frequency: 'twice daily', notes: 'T2DM — sometimes forgets evening dose' },
    { name: 'Atorvastatin', dose: '20mg', frequency: 'nightly', notes: 'Hyperlipidemia' },
    { name: 'Acetaminophen', dose: '500mg', frequency: 'PRN', notes: 'Arthritis pain' },
    { name: 'Vitamin B12', dose: '1000mcg', frequency: 'daily', notes: 'History of deficiency' },
    { name: 'Calcium + Vitamin D', dose: '600mg/400IU', frequency: 'daily', notes: 'Osteoporosis prevention' },
  ],
  allergies: [{ allergen: 'Penicillin', reaction: 'Tongue swelling (age 40)' }],
  socialHistory: {
    smoking: 'Never',
    alcohol: 'Never — "Ernesto drank a beer on Sundays, but I never liked it."',
    drugs: 'Never',
    caffeine: 'One cup of café con leche in the morning — hasn\'t been making it since Ernesto died',
    occupation: 'Retired — was a school cafeteria worker for 30 years. Retired at 65.',
    livingSituation: 'Recently moved in with daughter Rosa (45) and son-in-law after husband\'s death. Previously lived in her own home of 35 years. Misses her home, her garden, her kitchen.',
    relationships: 'Married to Ernesto for 48 years until his death. Three adult children: Rosa (45, daughter she lives with), Miguel (42, son, lives in Houston), Elena (38, daughter, lives in Mexico City). Seven grandchildren. Close extended family.',
    support: 'Strong family network — children and grandchildren are involved. Church community (Our Lady of Guadalupe parish) — has been attending since childhood but stopped going since Ernesto\'s death. Comadres (close female friends from church) — they visit but she "doesn\'t feel like talking."',
    education: 'High school diploma (Mexico), GED equivalent in US',
    legal: 'No legal history',
    military: 'None',
    spirituality: 'Devout Catholic. Faith has been central to her life. Currently questioning: "I prayed every day for Ernesto and God still took him." Attends mass rarely now — first time in 50 years she\'s missed regularly. Feels guilty about not going.',
  },
  familyHistory: {
    conditions: [
      { relation: 'Mother', condition: 'Died at 82 — "lost her memory" in her late 70s (probable dementia, never formally diagnosed). Type 2 Diabetes.' },
      { relation: 'Father', condition: 'Died at 75 of heart attack. No psychiatric history known.' },
      { relation: 'Sister', condition: 'Living, age 70. "She\'s always been nervous" — probable anxiety, never treated.' },
      { relation: 'Brother', condition: 'Living, age 68. Type 2 Diabetes, hypertension.' },
    ],
  },
  reviewOfSystems: {
    constitutional: '8-lb weight loss in 8 weeks. Fatigue — "I have no energy." Feels cold frequently.',
    cardiovascular: 'Chest tightness — "my heart hurts." Cardiac workup (EKG, troponin, echo) 3 weeks ago at ER — all normal. Hypertension controlled.',
    respiratory: 'Occasional sighing respirations. No SOB, cough.',
    gastrointestinal: 'Poor appetite — "food has no taste." Eating maybe one meal a day. Occasional nausea. Constipation (recent).',
    neurological: 'Word-finding difficulty — pauses mid-sentence searching for words. Forgets appointments. Left stove on twice. Daughter reports she repeats questions. Denies headache, dizziness, focal weakness.',
    musculoskeletal: 'Chronic knee and hip pain (osteoarthritis). Decreased mobility since moving to daughter\'s house.',
    endocrine: 'T2DM — glucose control may be worsening with irregular eating. No new endocrine symptoms.',
    psychiatric: 'Intense grief and yearning for husband. Preoccupation with memories. Two brief visual experiences of seeing deceased husband. Passive death wish ("I wish God would take me too") — no plan/intent. Guilt. Loss of interest in all activities. Disrupted sleep. Difficulty concentrating. Feels "empty."',
    sleep: 'Wakes at 2 AM — reaches for husband\'s side of bed, then can\'t return to sleep. Getting ~4 hours total. No sleep aid use.',
  },
  vitalSigns: {
    bloodPressure: '148/88',
    heartRate: 72,
    respiratoryRate: 14,
    temperature: 97.8,
    weight: '154 lbs (down from 162 lbs 8 weeks ago)',
    height: '5\'2"',
    bmi: 28.2,
  },
  physicalExamFindings: {
    'mental-status-appearance': {
      finding: 'Via telehealth: Elderly Hispanic woman appearing older than stated age. Sitting in daughter\'s living room with family photos visible behind her. Wearing a black blouse (mourning). Hair neatly combed but appears thinner. Dark circles under eyes. Rosary beads in her hands — fidgets with them throughout interview. Psychomotor slowing noted — slow to respond, slow to adjust camera when asked. Tearful intermittently.',
      interpretation: 'Appearance consistent with bereavement and possible depression — mourning dress, psychomotor slowing, tearfulness. Telehealth limits full observation.',
    },
    'mental-status-mood-affect': {
      finding: 'Mood: "Triste... sad. All the time." Affect: Predominantly tearful with constricted range. Warmth emerges when discussing grandchildren or husband\'s memory ("he made the best tamales"). Brief smiles that collapse quickly back to tears. Congruent with stated mood.',
      interpretation: 'Pervasive sadness with grief-appropriate affect. Capacity for positive affect preserved (important differential point — severe MDD typically lacks this).',
    },
    'mental-status-speech': {
      finding: 'Soft volume, slowed rate. Occasional word-finding pauses — searches for English words, sometimes substitutes Spanish ("I feel so... cómo se dice... empty"). Latency increased (4-6 seconds). Not tangential. Responsive to questions but offers minimal spontaneous speech.',
      interpretation: 'Slowed speech with word-finding difficulty. Bilingual code-switching is normal for this patient but increased word-finding pauses require cognitive screening to differentiate grief-related inattention from early neurocognitive changes.',
    },
    'mental-status-thought-process': {
      finding: 'Goal-directed but slow. Linear. Returns frequently to memories of husband without prompting — ruminative quality focused on loss rather than guilt/worthlessness. Able to follow conversation appropriately. Occasional lose-track moments where she forgets the question ("I\'m sorry, what did you ask me?").',
      interpretation: 'Preserved thought process with grief-related preoccupation. Forgetfulness during interview could reflect inattention (grief/depression) or early cognitive decline.',
    },
    'mental-status-thought-content': {
      finding: 'Preoccupied with husband\'s death and memories. Guilt: "I should have noticed the cancer sooner — maybe if I had pushed him to go to the doctor." Passive death wish: "I wish God would take me too so I can be with him" — stated within spiritual framework. Denies active plan: "No, I would never do that — it\'s a sin. But I pray for it." No delusions. Brief visual experiences of husband — "I saw Ernesto in the hallway, just for a moment, then he was gone" — patient attributes to "his spirit visiting." No paranoia.',
      interpretation: 'Grief preoccupation with passive death wish (framed spiritually). Bereavement hallucinations are common and typically non-pathological in acute grief. Guilt is grief-related (specific to spouse\'s cancer) rather than global worthlessness of MDD.',
    },
    'mental-status-perceptions': {
      finding: 'Two brief visual experiences of deceased husband in past 8 weeks — lasted seconds, occurred in peripheral vision, not distressing to patient ("it was comforting — I know he\'s watching over me"). Denies auditory hallucinations, command hallucinations, or voices. Denies tactile, olfactory hallucinations.',
      interpretation: 'Bereavement hallucinations — well-described phenomenon in acute grief, especially in long-term relationships. Not indicative of psychotic disorder. Culturally congruent (visits from deceased are meaningful in Mexican-American spiritual framework).',
    },
    'mental-status-cognition': {
      finding: 'Alert and oriented to person, place, time, and situation (x4). Attention: mildly impaired — digit span forward 5, backward 3 (below expected). Clock drawing: completes but numbers are slightly off-center and minute hand placement incorrect (draws 10 after 11 — common early cognitive screening finding). Delayed recall: 1/3 words at 5 minutes (missed 2 even with cues). Serial 7s: slow with 2 errors. Language: word-finding difficulty noted multiple times. Via telehealth — full MoCA not administered but screening suggests score in 20-23 range (below 26 threshold).',
      interpretation: 'CRITICAL FINDING — cognitive screening suggests deficit beyond what grief/depression alone would explain. MoCA score estimated 20-23 (mild cognitive impairment range). Combined with family history (mother with probable dementia), word-finding difficulty predating bereavement, and functional impacts (stove), formal neurocognitive assessment is warranted. Depression pseudodementia must also be considered.',
    },
    'mental-status-insight-judgment': {
      finding: 'Insight: Limited but improving — "I know I\'m not doing well, but I think it\'s just grief." Does not recognize cognitive symptoms as concerning. Defers to daughter\'s judgment. Judgment: Partially intact — accepted telehealth visit (with daughter\'s encouragement), still managing basic self-care. However, safety concerns (stove) suggest declining judgment in daily functioning.',
      interpretation: 'Limited insight appropriate for cultural context (grief is "normal"). Judgment concerns related to cognitive lapses rather than psychiatric refusal.',
    },
    'suicidality-assessment': {
      finding: 'C-SSRS: Passive death wish present — "I wish God would take me so I can be with Ernesto." Frequency: daily. Duration: fleeting, usually during prayer. Framed within spiritual context. Denies active ideation, plan, or intent. "No, mija, I would never do that — it\'s a sin." No prior attempts. Protective factors: religious faith (suicide is sin), grandchildren, daughter\'s presence, cultural values against self-harm. Risk factors: age, recent bereavement, social isolation (withdrew from church/friends), passive death wish, possible cognitive decline.',
      interpretation: 'Low-moderate acute risk. Passive death wish within spiritual framework with strong protective factors. Geriatric patients require heightened vigilance — passive wishes can escalate with worsening depression or cognitive decline.',
    },
    'homicidality-assessment': {
      finding: 'Denies homicidal ideation. No history of violence. No aggression.',
      interpretation: 'No homicidal risk.',
    },
    'substance-use-screen': {
      finding: 'No alcohol use, ever. No drug use, ever. Minimal caffeine. No over-the-counter medication misuse. Not using sleep aids.',
      interpretation: 'No substance use concerns.',
    },
  },
  defaultNormalFindings: {
    general: 'Elderly female, appears older than stated age, in no acute distress',
    cardiovascular: 'Regular rate and rhythm, no murmurs (per recent ER visit)',
    respiratory: 'Clear to auscultation bilaterally (per recent ER visit)',
    neurological: 'Limited exam via telehealth — no gross focal deficits observed; cognitive screening suggests impairment requiring in-person evaluation',
  },
  availableLabs: [
    { name: 'CBC', result: 'WNL — Hgb 12.0, WBC 5.5, Plt 210' },
    { name: 'CMP', result: 'Glucose 142 (elevated — diabetes management affected by poor eating). BUN/Cr normal. Electrolytes normal.' },
    { name: 'TSH', result: '4.8 mIU/L (high-normal — may warrant follow-up given symptoms)' },
    { name: 'Free T4', result: '0.9 ng/dL (low-normal)' },
    { name: 'Vitamin B12', result: '320 pg/mL (low-normal despite supplementation — may need dose increase or intramuscular route)' },
    { name: 'Folate', result: '10 ng/mL (normal)' },
    { name: 'Vitamin D', result: '18 ng/mL (low — supplement)' },
    { name: 'Hemoglobin A1C', result: '7.2% (suboptimal — diabetes control worsening with poor intake)' },
    { name: 'RPR/VDRL', result: 'Non-reactive' },
    { name: 'Urinalysis', result: 'Normal — no UTI' },
    { name: 'Troponin (3 weeks ago)', result: 'Negative' },
    { name: 'EKG (3 weeks ago)', result: 'Normal sinus rhythm, no acute changes' },
  ],
  availableImaging: [
    { name: 'Echocardiogram (3 weeks ago)', result: 'Normal LV function, EF 60%, no structural abnormalities' },
    { name: 'Brain MRI', result: 'Not yet ordered — would be appropriate if cognitive screening confirms impairment' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Prolonged Grief Disorder (F43.8)',
      supportingFindings: [
        'Intense yearning and longing for deceased husband (core criterion)',
        'Preoccupation with the deceased — hours spent with photos, memories',
        'Identity disruption ("I don\'t know who I am without him")',
        'Difficulty engaging in ongoing life',
        'Emotional numbness alternating with intense sadness',
        'Duration 8 weeks (approaching diagnostic threshold of 12 months in DSM-5-TR, but clinically significant now)',
        'Bereavement hallucinations (culturally normative but significant)',
        'Functional impairment',
      ],
      opposingFindings: [
        'DSM-5-TR requires 12 months post-loss (only 8 weeks — may be premature to diagnose formally)',
        'Some symptoms overlap with normal grief response in first 6 months',
        'Cultural context: extended grieving is normative in Mexican-American culture',
      ],
    },
    {
      rank: 2,
      diagnosis: 'Major Depressive Disorder, Single Episode (F32.1)',
      supportingFindings: [
        'Depressed mood most of the day',
        'Anhedonia (lost interest in cooking, church, grandchildren)',
        'Weight loss (8 lbs)',
        'Insomnia',
        'Fatigue',
        'Guilt (specific but intense)',
        'Difficulty concentrating',
        'Passive death wish',
        'Psychomotor retardation',
        'Meets ≥5/9 DSM-5 criteria',
      ],
      opposingFindings: [
        'Symptom content is grief-focused (not global worthlessness)',
        'Capacity for positive affect preserved (warmth about grandchildren, husband\'s memory)',
        'Guilt is specific (should have caught cancer sooner) not pervasive self-blame',
        'Death wish is spiritual/reunion-focused, not self-loathing-driven',
        'Can be comorbid with grief — not necessarily instead of',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Mild Neurocognitive Disorder, Unspecified (F06.7)',
      supportingFindings: [
        'Word-finding difficulty that may predate bereavement (6 months per daughter)',
        'Left stove on twice — functional safety concern',
        'Repeats questions',
        'Cognitive screening suggests MoCA in 20-23 range',
        'Family history of dementia (mother)',
        'Age-appropriate risk factors (HTN, DM, hyperlipidemia — all vascular risk factors)',
        'Delayed recall impaired (1/3 with cues)',
      ],
      opposingFindings: [
        'Cognitive symptoms could be depression pseudodementia',
        'Grief-related inattention can mimic cognitive decline',
        'Formal neuropsych testing not yet done',
        'Brain MRI not yet obtained',
        'Reversible causes not fully ruled out (B12 low-normal, thyroid borderline, vitamin D low)',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'Tell me about Ernesto — what was he like?', domain: 'psychiatric', criticalInfo: 'Opens rapport, assesses quality of yearning and preoccupation, reveals attachment pattern — core for grief diagnosis' },
    { question: 'Have you had thoughts that you\'d rather not be alive, or wished you could join Ernesto?', domain: 'suicidality', criticalInfo: 'CRITICAL SAFETY — reveals passive death wish ("I wish God would take me too"). Framed gently within patient\'s spiritual context.' },
    { question: 'Rosa mentioned you\'ve been having some trouble remembering things — can you tell me about that?', domain: 'psychiatric', criticalInfo: 'Assesses cognitive symptoms — daughter reports repeating questions, word-finding difficulty predating bereavement by 6 months' },
    { question: 'When did you start noticing the forgetfulness — was it before or after Ernesto passed?', domain: 'psychiatric', criticalInfo: 'CRITICAL — timeline distinguishes grief-related concentration problems from prodromal neurocognitive disorder' },
    { question: 'You mentioned seeing Ernesto in the hallway — can you tell me more about that?', domain: 'psychiatric', criticalInfo: 'Differentiates bereavement hallucination (brief, non-distressing, culturally congruent) from psychotic feature' },
    { question: 'How are you eating? Are you able to prepare meals?', domain: 'functional', criticalInfo: 'Assesses appetite, weight loss, and functional capacity — cooking was her lifelong passion' },
    { question: 'Did your mother have any memory problems as she got older?', domain: 'family-history', criticalInfo: 'Reveals mother "lost her memory" in late 70s — probable dementia, family history risk factor' },
    { question: 'How are you managing your diabetes and medications without Ernesto helping?', domain: 'medications', criticalInfo: 'Assesses medication adherence — forgetting evening metformin, A1C worsening' },
    { question: 'In your family and culture, what is the traditional way of mourning?', domain: 'cultural', criticalInfo: 'Cultural formulation — Mexican-American grief rituals (novenario, luto), familismo. Prevents pathologizing culturally normative grief.' },
    { question: 'Are you able to take care of yourself day to day — bathing, dressing, getting around the house?', domain: 'functional', criticalInfo: 'Assesses ADLs — critical for geriatric assessment and determining level of care needed' },
  ],
  keyExamManeuvers: [
    { maneuver: 'mental-status-cognition', expectedFinding: 'Impaired delayed recall, clock drawing errors, word-finding difficulty', significance: 'CRITICAL — distinguishes grief/depression from neurocognitive disorder; drives MoCA referral' },
    { maneuver: 'mental-status-mood-affect', expectedFinding: 'Tearful with preserved capacity for warmth', significance: 'Preserved positive affect suggests grief > severe MDD' },
    { maneuver: 'mental-status-perceptions', expectedFinding: 'Bereavement hallucinations — brief, non-distressing', significance: 'Normal grief phenomenon, culturally congruent — not psychosis' },
    { maneuver: 'suicidality-assessment', expectedFinding: 'Passive death wish, spiritual framing, strong protective factors', significance: 'Safety planning required — geriatric passive wishes require vigilance' },
    { maneuver: 'mental-status-thought-content', expectedFinding: 'Grief preoccupation, specific guilt, death wish', significance: 'Distinguishes grief (yearning-focused) from MDD (worthlessness-focused)' },
    { maneuver: 'substance-use-screen', expectedFinding: 'No substance use', significance: 'Rules out substance contributions to cognitive or mood symptoms' },
  ],
  criticalActions: [
    'Screen for suicidality (C-SSRS) — passive death wish present',
    'Refer for formal cognitive screening (MoCA in-person) — telehealth screening suggests impairment',
    'Order medical workup for reversible cognitive causes: TSH (borderline), B12 (low-normal), Vitamin D (low), RPR, CBC',
    'Differentiate grief from depression — assess yearning vs. worthlessness, positive affect capacity',
    'Assess bereavement hallucinations — confirm non-pathological (brief, non-distressing, culturally congruent)',
    'Cultural assessment — understand Mexican-American grief practices before pathologizing',
    'Assess functional safety (stove incidents) — discuss supervision with daughter',
    'Consider brain MRI if cognitive screening confirms impairment',
    'Discuss grief-specific therapy (not just antidepressants) — consider referral to grief counselor',
    'Coordinate with PCP on diabetes management (A1C worsening)',
    'Safety plan addressing passive death wish — involve daughter',
    'Screen for bipolar history before considering antidepressant',
    'Schedule in-person follow-up — telehealth insufficient for complete geriatric assessment',
  ],
  scoringRubric: SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 4: "Can't Catch My Breath" — BEGINNER, Panic Disorder
// ═══════════════════════════════════════════════════════════════════════════════

const case4 = {
  title: "Can't Catch My Breath",
  chiefComplaint: "I keep having these attacks where I feel like I'm dying — my heart races, I can't breathe, I get dizzy. The ER said nothing is wrong with my heart, but something is definitely wrong.",
  program: 'DNP_PSYCHIATRY' as const,
  difficulty: 'BEGINNER' as const,
  targetYear: 1,
  organSystems: ['psychiatric', 'cardiovascular', 'respiratory'],
  learningObjectives: [
    'Differentiate panic attacks from cardiac and respiratory emergencies',
    'Document avoidance behaviors and screen for agoraphobic features',
    'Apply psychoeducation as a therapeutic intervention',
    'Develop a treatment plan combining pharmacotherapy (SSRI) and psychotherapy (CBT)',
    'Confirm adequacy of prior medical workup before diagnosing panic disorder',
  ],
  tags: ['panic', 'anxiety', 'agoraphobia', 'beginner', 'outpatient', 'psychoeducation'],
  patientName: 'Sarah Mitchell',
  patientAge: 24,
  patientSex: 'Female',
  patientPronouns: 'she/her',
  personalityNotes:
    "Anxious, fidgety, health-focused. Articulate about physical symptoms but struggles to name emotions ('I'm not anxious, I'm sick'). Hyperaware of body sensations — notices heart rate, breathing, tingling. Becomes defensive when the word 'anxiety' is used too early ('I'm not crazy, this is real'). Defense mechanisms: somatization (emotional distress → physical symptoms), intellectualization (researches symptoms online, wants medical explanations), avoidance (stops doing things that trigger attacks). Rapport requirement: validate that her symptoms are real and terrifying before introducing the anxiety framework. Opens up when the clinician says something like 'Panic attacks are one of the most frightening experiences a person can have — your body is reacting as if you are in actual danger.' Shuts down if she feels dismissed or if 'it's just anxiety' is offered too quickly.",
  historyOfPresentIllness: {
    onset: 'First panic attack 6 weeks ago while driving on the highway',
    precipitants: 'No clear single precipitant. On review: started a new teaching position 2 months ago (first year teacher at a challenging school), moved to a new city away from family, recently broke up with boyfriend of 3 years. She does not connect these stressors to her symptoms — "I\'m handling all of that fine."',
    character: 'Discrete episodes of sudden-onset intense fear/discomfort lasting 15-30 minutes. Peak within 5-10 minutes. Accompanied by: racing heart, chest tightness, shortness of breath, dizziness/lightheadedness, tingling in hands and face, derealization ("everything felt fake, like I was in a dream"), fear of dying ("I thought I was having a heart attack"). Between attacks: chronic worry about the next attack, hypervigilance to body sensations, increasing avoidance.',
    severity: '9/10 during attacks. Between attacks: 5/10 background anxiety. "I live in fear of the next one."',
    associatedSymptoms: [
      'palpitations/racing heart during attacks',
      'chest tightness',
      'shortness of breath — "can\'t get a full breath"',
      'dizziness/lightheadedness',
      'paresthesias (tingling in hands, lips, face)',
      'derealization — "everything feels unreal"',
      'diaphoresis during attacks',
      'trembling/shaking',
      'fear of dying ("I\'m having a heart attack")',
      'fear of losing control ("I\'m going crazy")',
      'nausea during severe attacks',
      'anticipatory anxiety between attacks — constant worry about next one',
      'avoidance: stopped driving on highways, avoids grocery stores (had attack in checkout line), avoids crowded places, won\'t exercise (fears heart rate increase will trigger attack)',
    ],
    timeline: 'First attack 6 weeks ago on highway. Three ER visits in past month (weeks 2, 4, and 5). Cardiac workup negative all three times. Frequency increasing: first 2 weeks had 1 attack, past 2 weeks having 3-4 per week. Avoidance expanding — now takes only surface streets, has groceries delivered, avoids gym.',
    narrative: 'Sarah is a 24-year-old White female elementary school teacher presenting for psychiatric evaluation after three ER visits in the past month for recurrent panic attacks. Each ER visit included cardiac workup (EKG, troponin, CXR) — all negative. She presents with classic panic disorder: recurrent unexpected panic attacks with peak within minutes, 4+ associated symptoms, persistent worry about additional attacks, and significant avoidance behavior (highway driving, grocery stores, exercise, crowds). She does not recognize the connection between her life stressors (new job, new city, breakup) and her symptoms, insisting "something is wrong with my body." She is resistant to a psychiatric framing but willing to explore it because she is desperate for help. Avoidance is expanding toward agoraphobic features.',
  },
  pastMedicalHistory: {
    conditions: [
      'Mitral valve prolapse (diagnosed age 16, asymptomatic, echoed 2 years ago — trivial MVP, not clinically significant)',
      'Seasonal allergies',
    ],
    surgeries: ['Wisdom teeth extraction age 18'],
    hospitalizations: ['Three ER visits in past month — cardiac workup negative each time. No prior hospitalizations.'],
    previousPsychTreatment: 'Saw a school counselor in high school for "test anxiety" — a few sessions, helpful at the time. No medications. No formal psychiatric treatment.',
  },
  medications: [
    { name: 'Loratadine', dose: '10mg', frequency: 'daily seasonally', notes: 'Allergies' },
    { name: 'Oral contraceptive', dose: 'combination pill', frequency: 'daily', notes: 'Compliant' },
  ],
  allergies: [{ allergen: 'No known drug allergies', reaction: '' }],
  socialHistory: {
    smoking: 'Never',
    alcohol: 'Occasional — "a glass of wine on weekends." Has been drinking slightly more lately to "take the edge off." Maybe 3-4 glasses per week now vs. 1 previously.',
    drugs: 'Never. "I don\'t even like taking Tylenol."',
    caffeine: '2-3 cups of coffee daily. No change from baseline.',
    occupation: 'First-year elementary school teacher (1st grade) at a Title I school. Started 2 months ago. "I love the kids but the job is overwhelming — 28 kids, no aide, parents who don\'t return calls." First year teaching.',
    livingSituation: 'Lives alone in a one-bedroom apartment. Moved to this city 3 months ago for the teaching job. No family nearby. Nearest family member is parents, 4 hours away.',
    relationships: 'Single. Broke up with boyfriend of 3 years (Jake) 3 months ago when she moved for the job. "It was mutual but I miss him." No current partner.',
    support: 'Parents (4 hours away, talk on phone daily — mother is worried). One college friend in the city but they work different schedules. "I feel pretty isolated." No therapy, no support group.',
    education: 'Bachelor\'s degree in education',
    legal: 'No legal history',
    military: 'None',
    spirituality: 'Non-denominational Christian. Attended church growing up. Hasn\'t found a church in new city yet.',
  },
  familyHistory: {
    conditions: [
      { relation: 'Mother', condition: 'Generalized Anxiety Disorder — on buspirone. "She\'s always been a worrier."' },
      { relation: 'Father', condition: 'No psychiatric history. Hypertension.' },
      { relation: 'Maternal grandmother', condition: 'Agoraphobia — "Grandma wouldn\'t leave the house for years." Never formally treated.' },
      { relation: 'Maternal aunt', condition: '"Panic attacks" — treated with Xanax for years.' },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Weight stable. Fatigue — "I\'m exhausted from the anxiety." No fever.',
    cardiovascular: 'Palpitations during attacks. Known MVP (trivial). Three negative cardiac workups. Denies exertional symptoms between attacks.',
    respiratory: 'SOB during attacks — "can\'t get a full breath." No wheezing, cough, or respiratory symptoms between attacks.',
    gastrointestinal: 'Nausea during severe attacks. Appetite decreased mildly — "I don\'t feel like eating when I\'m anxious." No vomiting, no diarrhea.',
    neurological: 'Paresthesias during attacks (hands, lips). Dizziness during attacks. Derealization during attacks. No headaches, focal weakness, or seizure-like activity.',
    musculoskeletal: 'Muscle tension in neck and shoulders — chronic since starting new job. No pain.',
    endocrine: 'No thyroid symptoms. Regular periods.',
    psychiatric: 'Panic attacks (discrete, unexpected, 4+ symptoms, peak within minutes). Anticipatory anxiety (constant worry about next attack). Avoidance behavior (highway, stores, gym, crowds). Sleep onset difficulty (worried about having attack in sleep). No depressed mood beyond frustration. No SI. No psychotic symptoms.',
    sleep: 'Difficulty falling asleep — "I lie there waiting for an attack." Takes 30-45 minutes to fall asleep. Woke from sleep with one nocturnal panic attack (week 3). Getting 6-7 hours total. Quality poor.',
  },
  vitalSigns: {
    bloodPressure: '118/72',
    heartRate: 84,
    respiratoryRate: 16,
    temperature: 98.6,
    weight: '135 lbs',
    height: '5\'6"',
    bmi: 21.8,
  },
  physicalExamFindings: {
    'mental-status-appearance': {
      finding: 'Young White female appearing stated age. Casually dressed in jeans and sweater, well-groomed. Sits on edge of chair, fidgets with phone. Scans the room periodically. Mild muscle tension visible in shoulders (hunched). Adequate eye contact but breaks gaze when discussing physical symptoms — focuses on her hands. No psychomotor retardation or agitation beyond fidgetiness.',
      interpretation: 'Appearance consistent with chronic anxiety state — hypervigilance, muscle tension, restlessness. No signs of depression.',
    },
    'mental-status-mood-affect': {
      finding: 'Mood: "Scared. I\'m scared something is really wrong with me." Affect: Anxious, slightly constricted but reactive. Becomes animated and distressed when describing attacks (voice rises, speaking faster, touches chest). Brightens appropriately when discussing her students. No flat or blunted affect. Tearful when discussing isolation.',
      interpretation: 'Anxious mood with reactive affect — appropriate emotional range preserved. Fear and health anxiety predominant.',
    },
    'mental-status-speech': {
      finding: 'Normal rate at baseline, accelerates when describing panic attacks. Normal volume. Slightly pressured quality when anxious. No latency. Articulate and detailed — uses precise medical terminology she has researched online ("I looked up paresthesias"). Spontaneous speech focused on symptoms.',
      interpretation: 'Speech normal with anxiety-driven acceleration. Health-focused content consistent with somatic preoccupation.',
    },
    'mental-status-thought-process': {
      finding: 'Goal-directed, logical, linear. Occasionally returns to health concerns without prompting (ruminative about physical symptoms). No tangentiality, loose associations, or flight of ideas. Catastrophic thinking pattern: "What if the ER missed something? What if I have a rare heart condition?"',
      interpretation: 'Preserved thought process with health-related rumination and catastrophic cognition — classic panic disorder thought pattern.',
    },
    'mental-status-thought-content': {
      finding: 'Preoccupied with health — fears of cardiac disease, fear of dying during an attack, fear of "going crazy." Catastrophic misinterpretation of body sensations ("My heart skipped a beat, what if it stops?"). No SI — "No, I don\'t want to die — I\'m scared OF dying." No HI. No delusions. No obsessions beyond health. No phobias beyond avoidance contexts.',
      interpretation: 'Health anxiety with catastrophic misinterpretation of somatic sensations — cognitive hallmark of panic disorder. Clear distinction from suicidality (fears death rather than wishes for it).',
    },
    'mental-status-perceptions': {
      finding: 'Reports derealization during panic attacks ("everything goes fuzzy, like I\'m watching myself from outside"). Denies this between attacks. No auditory, visual, tactile, or olfactory hallucinations. No depersonalization beyond attack-associated derealization.',
      interpretation: 'Derealization is a common panic attack symptom — not indicative of psychotic or dissociative disorder.',
    },
    'mental-status-cognition': {
      finding: 'Alert and oriented x4. Attention intact — able to spell WORLD backward correctly. Recall 3/3 at 5 minutes. Serial 7s: accurate and fast. Fund of knowledge appropriate. No cognitive deficits.',
      interpretation: 'Cognition fully intact — rules out medical or cognitive causes for symptoms.',
    },
    'mental-status-insight-judgment': {
      finding: 'Insight: Partial — acknowledges symptoms are affecting her life but attributes them to an undiagnosed medical condition. "I know the ER said my heart is fine, but what if they missed something?" Beginning to consider that anxiety might play a role — "My mom has anxiety, maybe I do too, but this feels different." Judgment: Intact — sought medical care, attended psychiatric referral, maintaining employment.',
      interpretation: 'Partial insight with emerging openness to psychiatric framework. Judgment intact — demonstrates help-seeking behavior.',
    },
    'suicidality-assessment': {
      finding: 'C-SSRS: No suicidal ideation. "Absolutely not — I\'m terrified of dying, that\'s the whole problem." No prior attempts. No self-harm. Protective factors: fear of death, family relationships, career, youth.',
      interpretation: 'No suicide risk. Panic disorder patients fear death — this is protective. Continue to screen as depression can be comorbid.',
    },
    'homicidality-assessment': {
      finding: 'Denies homicidal ideation. No aggression. No history of violence.',
      interpretation: 'No homicidal risk.',
    },
    'substance-use-screen': {
      finding: 'AUDIT-C: Score 4 (drinking slightly more — 3-4 glasses wine/week to cope). Below AUD threshold but trending up. No drug use. Caffeine 2-3 cups/day (contributes to arousal but not unusual intake).',
      interpretation: 'No substance use disorder but increasing alcohol use to cope is a warning sign. Discuss alcohol-anxiety relationship and monitor.',
    },
  },
  defaultNormalFindings: {
    general: 'Well-nourished young female in no acute distress',
    cardiovascular: 'Regular rate and rhythm, no murmurs (known trivial MVP — not clinically significant). Three negative cardiac workups (EKG, troponin, CXR).',
    respiratory: 'Clear to auscultation bilaterally. No wheezing.',
    neurological: 'Cranial nerves II-XII intact, no focal deficits',
  },
  availableLabs: [
    { name: 'EKG (ER visit #1)', result: 'Normal sinus rhythm, rate 92, no ST changes, no arrhythmia' },
    { name: 'EKG (ER visit #3)', result: 'Normal sinus rhythm, rate 88' },
    { name: 'Troponin x2 (ER visit #1)', result: 'Negative' },
    { name: 'CBC', result: 'WNL — Hgb 13.5, WBC 6.0, Plt 240' },
    { name: 'CMP', result: 'WNL — glucose 92, electrolytes normal' },
    { name: 'TSH', result: '1.8 mIU/L (normal)' },
    { name: 'CXR (ER visit #2)', result: 'No acute cardiopulmonary process' },
    { name: 'Echocardiogram (2 years ago)', result: 'Trivial MVP without regurgitation, normal LV function, EF 65%' },
    { name: 'Urine Drug Screen (ER visit #1)', result: 'Negative' },
  ],
  availableImaging: [
    { name: 'Chest X-Ray', result: 'Normal — no acute cardiopulmonary process' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Panic Disorder with Agoraphobia (F40.00 + F41.0)',
      supportingFindings: [
        'Recurrent unexpected panic attacks (4+ symptoms, peak within minutes)',
        'Persistent worry about additional attacks (>1 month)',
        'Significant maladaptive behavioral changes (avoidance)',
        'Avoidance of multiple situations (highway, stores, gym, crowds) — agoraphobic pattern',
        'Attacks not attributable to substance or medical condition',
        'Three negative cardiac workups',
        'Family history of panic disorder and agoraphobia',
        'Meets DSM-5-TR criteria for both Panic Disorder and Agoraphobia',
      ],
      opposingFindings: [
        'Patient attributes symptoms to medical cause (but workup negative)',
        'MVP is present (but trivial and not explanatory)',
      ],
    },
    {
      rank: 2,
      diagnosis: 'Generalized Anxiety Disorder (F41.1)',
      supportingFindings: [
        'Chronic worry present',
        'Muscle tension',
        'Sleep difficulty',
        'Family history of GAD (mother)',
      ],
      opposingFindings: [
        'Primary presentation is discrete panic attacks, not diffuse worry',
        'GAD does not account for discrete, sudden-onset episodes with peak symptoms',
        'Anticipatory anxiety is about attacks, not multiple life domains',
        'Could be comorbid but panic disorder is primary',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Somatic Symptom Disorder (F45.1)',
      supportingFindings: [
        'Excessive focus on somatic symptoms',
        'Health anxiety',
        'Multiple ER visits',
      ],
      opposingFindings: [
        'Symptoms are better explained by panic disorder (discrete episodes with classic panic symptom cluster)',
        'SSD typically involves chronic, non-episodic somatic complaints',
        'Health anxiety is secondary to panic attacks, not primary',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Cardiac Arrhythmia / MVP-related symptoms',
      supportingFindings: [
        'Known MVP',
        'Palpitations',
        'Chest discomfort',
      ],
      opposingFindings: [
        'MVP is trivial on echo — not clinically significant',
        'Three negative EKGs during symptomatic episodes',
        'Troponin negative',
        'Symptom cluster includes derealization, fear of dying, paresthesias — not typical of cardiac arrhythmia',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'Can you walk me through exactly what happens during one of these episodes?', domain: 'psychiatric', criticalInfo: 'Establishes panic attack symptom inventory — 4+ symptoms, sudden onset, peak within minutes' },
    { question: 'What were you doing when the first attack happened?', domain: 'psychiatric', criticalInfo: 'Establishes onset context — driving on highway, unexpected (not cued)' },
    { question: 'Are there places or situations you\'ve started avoiding because of these episodes?', domain: 'psychiatric', criticalInfo: 'CRITICAL — maps avoidance behavior (highways, stores, gym, crowds) for agoraphobia assessment' },
    { question: 'Tell me about the cardiac workup you\'ve had — what tests were done?', domain: 'past-medical', criticalInfo: 'Confirms adequacy of medical workup — must document negative results before diagnosing panic disorder' },
    { question: 'Have you had any thoughts of harming yourself or ending your life?', domain: 'suicidality', criticalInfo: 'Safety screen — expected to be negative (fears death) but must be asked' },
    { question: 'How much alcohol are you drinking? Has it changed recently?', domain: 'substance-use', criticalInfo: 'Identifies increasing alcohol use as coping mechanism — 1 glass/week → 3-4/week' },
    { question: 'Is there a family history of anxiety, panic attacks, or mental health issues?', domain: 'family-history', criticalInfo: 'Reveals strong family loading: mother GAD, grandmother agoraphobia, aunt panic disorder' },
    { question: 'Tell me about what\'s been happening in your life recently — any major changes?', domain: 'social-history', criticalInfo: 'Identifies unrecognized stressors: new job, new city, breakup — patient doesn\'t connect these to symptoms' },
    { question: 'Have you ever had a period of feeling unusually energetic, needed less sleep, or felt on top of the world?', domain: 'psychiatric', criticalInfo: 'Bipolar screen — essential before starting an SSRI' },
    { question: 'Between the attacks, how are you feeling? Do you worry about having another one?', domain: 'psychiatric', criticalInfo: 'Establishes anticipatory anxiety — persistent worry about future attacks (required for Panic Disorder diagnosis)' },
  ],
  keyExamManeuvers: [
    { maneuver: 'mental-status-mood-affect', expectedFinding: 'Anxious mood, reactive affect, distress when describing attacks', significance: 'Confirms anxiety as predominant mood state' },
    { maneuver: 'mental-status-thought-content', expectedFinding: 'Health preoccupation, catastrophic misinterpretation, fear of dying', significance: 'Cognitive hallmark of panic disorder' },
    { maneuver: 'mental-status-perceptions', expectedFinding: 'Derealization during attacks only', significance: 'Common panic symptom, not indicative of psychotic disorder' },
    { maneuver: 'suicidality-assessment', expectedFinding: 'No SI — fears death', significance: 'Expected in panic disorder — fear of death is protective' },
    { maneuver: 'mental-status-cognition', expectedFinding: 'Fully intact', significance: 'Rules out medical/cognitive causes' },
    { maneuver: 'substance-use-screen', expectedFinding: 'Increasing alcohol use but below AUD threshold', significance: 'Identifies coping mechanism that could worsen anxiety and develop into AUD' },
  ],
  criticalActions: [
    'Confirm adequacy of medical workup before diagnosing panic disorder (three negative ER workups documented)',
    'Screen for suicidality (C-SSRS)',
    'Screen for bipolar history before starting SSRI',
    'Document avoidance behaviors — assess for Agoraphobia specifier',
    'Provide psychoeducation about the panic cycle (fight-or-flight, catastrophic misinterpretation, avoidance reinforcement)',
    'Discuss SSRI as first-line pharmacotherapy (not benzodiazepine)',
    'Refer for CBT with interoceptive exposure and cognitive restructuring',
    'Address increasing alcohol use as maladaptive coping',
    'Discuss caffeine reduction as adjunct',
    'Schedule follow-up within 2 weeks for medication check',
  ],
  scoringRubric: SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 5: "The War Followed Me Home" — INTERMEDIATE, PTSD + AUD
// ═══════════════════════════════════════════════════════════════════════════════

const case5 = {
  title: 'The War Followed Me Home',
  chiefComplaint: "My wife said I had to come or she's leaving. I don't think I need to be here, but... here I am.",
  program: 'DNP_PSYCHIATRY' as const,
  difficulty: 'INTERMEDIATE' as const,
  targetYear: 2,
  organSystems: ['psychiatric', 'neurological'],
  learningObjectives: [
    'Conduct a trauma-informed interview with appropriate pacing and boundaries',
    'Differentiate PTSD from AUD, MDD, and TBI-related symptoms',
    'Assess substance use as self-medication versus independent disorder',
    'Demonstrate military cultural competence in psychiatric assessment',
    'Develop a dual-diagnosis treatment plan addressing both PTSD and AUD',
  ],
  tags: ['PTSD', 'trauma', 'AUD', 'substance-use', 'veteran', 'intermediate', 'VA-outpatient', 'African-American', 'military'],
  patientName: 'DeShawn Carter',
  patientAge: 38,
  patientSex: 'Male',
  patientPronouns: 'he/him',
  personalityNotes:
    "Guarded, uses humor to deflect emotional content. Military bearing — sits rigid, upright, scans the room, positions himself facing the door. Minimal facial expression ('sergeant face'). Will test the clinician early — 'You ever served? No? Then how would you understand?' Responds to respect for service, not pity ('thank you for your service' feels hollow to him — he wants someone who understands duty, not someone who pedestalizes it). Defense mechanisms: intellectualization ('it was just combat, everyone deals with it'), minimization ('plenty of guys had it worse'), humor (deflects with dark military humor when getting close to painful material), avoidance (changes subject when trauma content approaches). Rapport requirement: demonstrate steadiness — don't flinch at dark content, don't over-emote, don't rush trauma disclosure. He opens up when the clinician says something like 'I'm not going to ask you to tell me everything today — we can go at your pace.' Shuts down if pushed for trauma details in the first visit or if clinician appears uncomfortable with combat/violence content.",
  historyOfPresentIllness: {
    onset: 'Symptoms began after second deployment (8 years ago) but have worsened significantly over the past 2 years',
    precipitants: 'Second deployment to Afghanistan — IED blast killed two members of his squad. He was in the vehicle. Sustained mild TBI (treated in field, cleared to return to duty). Symptoms were manageable until 2 years ago when a coworker was killed in an industrial accident at work — reactivated trauma. Relationship with wife deteriorating, which led to her ultimatum.',
    character: 'Nightmares (2-3x/week — dreams of the IED blast, sees his friends\' faces), hypervigilance (scans rooms, sits with back to wall, startles easily at loud noises), emotional numbing ("I can\'t feel anything — not happy, not sad, just flat"), avoidance of crowds and loud places, intrusive memories during the day (triggered by engine backfires, helicopters, news coverage). Using alcohol to sleep and numb.',
    severity: '6/10 — "I\'m managing. There are guys way worse than me." (Minimization — wife would rate 9/10)',
    associatedSymptoms: [
      'nightmares 2-3x/week — combat-related, wakes in sweat',
      'hypervigilance — scans rooms, sits facing door, startles at loud noises',
      'emotional numbing — "I feel flat all the time"',
      'avoidance of crowds, fireworks, war movies, news',
      'intrusive memories — triggered by engine sounds, helicopters',
      'irritability — snaps at wife and kids over minor things',
      'sleep disturbance — only sleeps with alcohol (6+ drinks to fall asleep)',
      'difficulty concentrating at work',
      'emotional detachment from wife and children',
      'loss of interest in activities — used to coach football, stopped',
      'headaches (2-3x/week) — possibly TBI-related',
      'reckless driving — wife reports he drives aggressively',
    ],
    timeline: 'Symptoms started after 2nd deployment 8 years ago. Functioned "well enough" (his words) for several years. Significant worsening 2 years ago after coworker\'s industrial accident death. Alcohol use escalated from "a few beers" to 6+ drinks nightly over past 2 years. Wife issued ultimatum 2 weeks ago — "Get help or I\'m taking the kids."',
    narrative: 'DeShawn is a 38-year-old Black Army veteran with 2 combat deployments to Afghanistan presenting at the VA outpatient clinic, self-referred following his wife\'s ultimatum. He presents with 8 years of PTSD symptoms (nightmares, hypervigilance, emotional numbing, avoidance, intrusive memories, irritability) that worsened significantly 2 years ago after a coworker\'s death. He has been using alcohol (6+ drinks nightly) to manage sleep and emotional numbing for the past 2 years, meeting criteria for comorbid Alcohol Use Disorder. He sustained a mild TBI during his second deployment (IED blast that killed 2 squad members) and reports persistent headaches. He minimizes his symptoms, uses humor to deflect, and is guarded about combat details. The clinical challenge is the interplay between PTSD, AUD (self-medication vs. independent), possible TBI sequelae, and a deteriorating marriage — all requiring trauma-informed, military-culturally-competent assessment.',
  },
  pastMedicalHistory: {
    conditions: [
      'Mild TBI (2nd deployment — IED blast, loss of consciousness <30 min, treated in field, cleared to return to duty)',
      'Chronic headaches (2-3x/week since TBI, treated with ibuprofen)',
      'Tinnitus (bilateral, since blast exposure)',
      'Lumbar disc herniation (L4-L5, from parachute training — manages with exercise, occasional flares)',
      'Bilateral knee pain (service-connected)',
    ],
    surgeries: ['None'],
    hospitalizations: ['Field hospital admission for TBI (48 hours observation, returned to duty). No psychiatric hospitalizations.'],
    previousPsychTreatment: 'Attended 2 sessions of group therapy at VA 5 years ago — "It wasn\'t for me. I\'m not going to cry in front of other guys." Has never tried individual therapy or medication for mental health. "I don\'t want to be on pills."',
  },
  medications: [
    { name: 'Ibuprofen', dose: '600mg', frequency: 'PRN (3-4x/week)', notes: 'For headaches and knee/back pain' },
    { name: 'Melatonin', dose: '10mg', frequency: 'nightly', notes: 'Started on his own for sleep — "doesn\'t work"' },
  ],
  allergies: [{ allergen: 'No known drug allergies', reaction: '' }],
  socialHistory: {
    smoking: 'Quit 3 years ago. Smoked 1 ppd for 10 years (ages 18-28). "That\'s one thing I actually managed to kick."',
    alcohol: '6+ drinks nightly (bourbon or beer) for past 2 years. Started at 2-3 beers after deployment, escalated. Drinks to fall asleep and "quiet the noise." Has tried to cut back — "lasted about 3 days." Denies morning drinking or drinking at work. AUDIT score would be approximately 24-28 (high risk).',
    drugs: 'Cannabis use — "tried it a few times when guys offered but it made the paranoia worse." No current use. No other drug use.',
    caffeine: '4-5 cups of black coffee daily. "It\'s the only thing keeping me going."',
    occupation: 'Warehouse supervisor at a distribution center. 4 years at current job. Performance declining — written up once for losing temper with employee who dropped something loudly behind him (startle → aggression). Coworker\'s death 2 years ago at a similar facility was the reactivating trigger.',
    livingSituation: 'Lives with wife Keisha (36, nursing assistant) and two daughters (10 and 6) in a rented house. Marriage strained — wife issued ultimatum. Sleeps on the couch most nights "because of the nightmares — I don\'t want to scare the kids."',
    relationships: 'Married 12 years. Wife Keisha is exhausted and scared. Describes him as "a different person than the man I married." He describes her as "the best thing in my life — I just can\'t show it." Emotionally detached from daughters — "I love them but I can\'t feel it." Avoids school events, birthday parties (crowds).',
    support: 'Wife (supportive but at breaking point). Mother in Atlanta (talks monthly). Two brothers — one also a veteran (Army, no deployment, no PTSD). Couple of Army buddies he texts occasionally. No close friends locally. Not connected to veteran organizations. "I don\'t do the brotherhood thing — I just want to be left alone."',
    education: 'Some college — completed 2 years, dropped out to enlist after 9/11.',
    legal: 'No criminal history. One speeding ticket. Clean driving record otherwise.',
    military: 'US Army, 2002-2010. MOS: 11B Infantry. Two deployments to Afghanistan (2005, 2007-2008). Achieved rank of Staff Sergeant (E-6). Honorable discharge. Combat awards including Combat Infantryman Badge. VA service-connected disability rating: 30% (TBI, tinnitus, knee/back).',
    spirituality: 'Raised Baptist. No current religious practice. "I stopped believing in God in Afghanistan."',
  },
  familyHistory: {
    conditions: [
      { relation: 'Father', condition: 'Alcohol Use Disorder — "He drank his whole life. It killed him." Died of liver failure at age 62.' },
      { relation: 'Mother', condition: 'Hypertension, diabetes. No psychiatric history. "She\'s the strongest person I know."' },
      { relation: 'Paternal grandfather', condition: 'Vietnam veteran. "He was angry all the time." Probable untreated PTSD. Alcohol use disorder.' },
      { relation: 'Brother (older)', condition: 'No psychiatric history.' },
      { relation: 'Brother (younger)', condition: 'Army veteran, no deployment, no mental health issues.' },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Fatigue — chronic. Weight stable (muscular build, maintains despite decreased exercise). No fever.',
    cardiovascular: 'Denies chest pain, palpitations. No known cardiac history.',
    respiratory: 'Denies SOB, cough.',
    gastrointestinal: 'Occasional heartburn (likely alcohol-related). Appetite variable. "I eat because I have to, not because I want to."',
    neurological: 'Headaches 2-3x/week (frontal, pressure-type, since TBI). Tinnitus bilateral. Occasional dizziness. Difficulty concentrating. Memory complaints — "I walk into a room and forget why I\'m there."',
    musculoskeletal: 'Chronic low back pain (L4-L5), bilateral knee pain. Manages with ibuprofen. Decreased exercise over past 2 years.',
    endocrine: 'No thyroid symptoms. No diabetes.',
    psychiatric: 'Nightmares, hypervigilance, emotional numbing, avoidance, intrusive memories, irritability, difficulty concentrating, detachment, loss of interest, reckless behavior (driving). Alcohol use to manage symptoms. Denied SI initially — on direct questioning: "I wouldn\'t say I want to die, but sometimes I think it wouldn\'t matter if I didn\'t wake up." No plan, no intent. Denied HI — but acknowledged "I have to walk away sometimes because the anger scares me."',
    sleep: 'Cannot fall asleep without alcohol. With alcohol: falls asleep in 30 min but wakes from nightmares 2-3x/week at 2-3 AM. Sleeps on couch to protect family. Total sleep: ~4-5 hours, fragmented.',
  },
  vitalSigns: {
    bloodPressure: '138/86',
    heartRate: 76,
    respiratoryRate: 14,
    temperature: 98.2,
    weight: '215 lbs',
    height: '6\'1"',
    bmi: 28.4,
  },
  physicalExamFindings: {
    'mental-status-appearance': {
      finding: 'Well-built Black male appearing stated age. Military bearing — sits upright, rigid posture, scans room upon entering, positions chair facing the door. Dressed in clean jeans and polo shirt (neat, deliberate). Strong handshake, brief eye contact — breaks to scan room periodically. Scar visible on left forearm (shrapnel). No psychomotor retardation; if anything, a coiled-spring quality — still but ready to move. Jaw clenched intermittently.',
      interpretation: 'Appearance and behavior consistent with hypervigilant military veteran — scanning, positioning, controlled bearing. No signs of intoxication or acute distress.',
    },
    'mental-status-mood-affect': {
      finding: 'Mood: "I\'m fine. (pause) My wife would say I\'m not fine." Affect: Restricted, predominantly flat. Uses humor as defense ("I\'m here because my wife is scarier than the Taliban — kidding, sort of"). Brief flicker of sadness when mentioning daughters. Anger breaks through when discussing the coworker\'s death ("the company didn\'t even put up a safety rail — what kind of—" stops himself). Affect is incongruent at times — describes horrific events with minimal emotional display.',
      interpretation: 'Restricted/flat affect with emotional numbing — hallmark of PTSD Cluster D (negative alterations in mood). Humor as defense. Anger emerges around themes of injustice and preventable death.',
    },
    'mental-status-speech': {
      finding: 'Controlled, deliberate pace. Normal volume — drops when approaching emotional content. Uses short, precise sentences ("I went. I saw it. I came back."). Military cadence. No pressured speech. Increased latency when asked emotional questions — processes before responding. Dark humor peppered throughout.',
      interpretation: 'Controlled, guarded speech consistent with military culture and avoidance of emotional processing. Not indicative of depression-related psychomotor slowing.',
    },
    'mental-status-thought-process': {
      finding: 'Goal-directed, linear, logical. Organized when discussing facts. Avoidant — redirects when questions approach trauma details ("You don\'t need to know what I saw. It\'s not relevant."). No tangentiality, loosening of associations, or disorganization.',
      interpretation: 'Intact thought process with active avoidance of trauma-related content — consistent with PTSD Cluster C (avoidance).',
    },
    'mental-status-thought-content': {
      finding: 'Themes of guilt ("I should have seen the IED — that was my job"), responsibility ("those guys trusted me"), and survivor guilt ("why did I walk away and they didn\'t?"). Minimizes impact ("it was war, that\'s what happens"). Passive SI on direct questioning: "I wouldn\'t say I want to die, but sometimes I think it wouldn\'t matter if I didn\'t wake up." No active plan or intent. Denies HI — "I would never hurt anyone on purpose. But the anger... it scares me sometimes." No delusions, obsessions, or paranoid ideation (hypervigilance is trauma-based, not paranoid).',
      interpretation: 'Survivor guilt, minimization, and passive SI — consistent with PTSD and comorbid depression. Anger with self-awareness is positive prognostic indicator.',
    },
    'mental-status-perceptions': {
      finding: 'Intrusive memories — vivid, sensory (smells burning fuel, hears the blast). Not hallucinations — recognizes them as memories but they feel "real in the moment." Flashback episodes triggered by loud noises — brief dissociative quality ("I\'m back there for a second"). No sustained dissociation. No auditory, visual, or tactile hallucinations.',
      interpretation: 'Trauma-related intrusions and flashbacks — PTSD Cluster B (re-experiencing). Distinct from psychotic hallucinations.',
    },
    'mental-status-cognition': {
      finding: 'Alert and oriented x4. Attention: mildly impaired — digit span forward 6, backward 4 (slightly below expected for age/education). Trail-making approximation: adequate but slow. Memory: 2/3 recall at 5 minutes (missed one, retrieved with cue). Subjective complaints of forgetfulness exceed objective findings but TBI history makes formal testing appropriate.',
      interpretation: 'Mild cognitive findings — could reflect TBI sequelae, chronic sleep deprivation, alcohol effects, or PTSD-related concentration difficulty. Formal neuropsych testing recommended given TBI history.',
    },
    'mental-status-insight-judgment': {
      finding: 'Insight: Emerging — "I know something\'s not right. I\'m just not sure talking about it helps." Acknowledges alcohol is a problem when pressed ("I know I drink too much") but frames it as the only thing that works. Judgment: Partially impaired — continued heavy drinking, reckless driving, avoiding treatment for 8 years. However, came to appointment, maintains employment, no legal problems.',
      interpretation: 'Partial insight with ambivalence about treatment — typical for veterans with PTSD and AUD. Motivational enhancement approaches appropriate.',
    },
    'suicidality-assessment': {
      finding: 'C-SSRS: Passive ideation present — "sometimes I think it wouldn\'t matter if I didn\'t wake up." Frequency: 1-2x/week, usually after drinking. Duration: fleeting. No active ideation, plan, or intent. No prior attempts. Firearms: "I have a handgun. It\'s locked in a safe. My wife has the combination." Protective factors: daughters, wife, pride in military service, "I survived combat — I\'m not going out like that." Risk factors: male veteran, PTSD, AUD, firearm access, family history of AUD, passive SI, social isolation.',
      interpretation: 'Moderate risk — passive SI with firearm access in a male veteran with PTSD and AUD is a high-risk combination. Lethal means counseling is critical. Safety plan required. Voluntary weapons storage discussion warranted.',
    },
    'homicidality-assessment': {
      finding: 'Denies homicidal ideation. Acknowledges anger management difficulty — "I would never hurt my family. But I punch walls sometimes. I broke a cabinet door last month." No assaultive behavior toward people. No threats. History of one workplace incident (startle → verbal aggression, no physical contact).',
      interpretation: 'No imminent homicidal risk. Anger is PTSD-related (hyperarousal) with adequate behavioral controls. Monitor and address in treatment.',
    },
    'substance-use-screen': {
      finding: 'AUDIT-C: Score 9 (6+ drinks on typical day, 5+ times/week, unable to stop once started). Full AUDIT estimated: 24-28 (high risk). Pattern: nightly heavy drinking to facilitate sleep and numb emotions. Onset: escalated from social drinking to nightly heavy use over 8 years, sharply increased 2 years ago. Withdrawal symptoms: mild hand tremor in mornings, occasional sweats. Has tried to quit — "lasted 3 days, couldn\'t sleep at all, nightmares were unbearable." No history of seizures or DTs. No drug use currently.',
      interpretation: 'Alcohol Use Disorder, moderate to severe. Dual function: self-medication (sleep, emotional numbing) AND developing physiological dependence (mild withdrawal). Withdrawal risk must be assessed before cessation. Integrated treatment for PTSD + AUD essential — treating only one will fail.',
    },
  },
  defaultNormalFindings: {
    general: 'Well-nourished, muscular male in no acute distress',
    cardiovascular: 'Regular rate and rhythm, no murmurs. BP mildly elevated.',
    respiratory: 'Clear to auscultation bilaterally',
    neurological: 'Cranial nerves II-XII intact. Mild bilateral tinnitus. No focal motor or sensory deficits. Gait normal.',
  },
  availableLabs: [
    { name: 'CBC', result: 'WNL — Hgb 15.1, WBC 7.5, Plt 220. MCV 98 fL (mildly elevated — possible early macrocytosis from alcohol)' },
    { name: 'CMP', result: 'AST 52 U/L (mildly elevated), ALT 48 U/L (mildly elevated), GGT 85 U/L (elevated — consistent with heavy alcohol use). Glucose, electrolytes, renal function normal.' },
    { name: 'Lipid Panel', result: 'Triglycerides 210 (elevated — alcohol effect). Total cholesterol 205, LDL 128, HDL 38 (low).' },
    { name: 'TSH', result: '2.1 mIU/L (normal)' },
    { name: 'Vitamin B12', result: '310 pg/mL (low-normal)' },
    { name: 'Folate', result: '6 ng/mL (low-normal)' },
    { name: 'Urine Drug Screen', result: 'Negative' },
    { name: 'Blood Alcohol Level', result: '0.00 (morning appointment)' },
    { name: 'Hepatitis Panel', result: 'Hepatitis B and C: negative' },
  ],
  availableImaging: [
    { name: 'CT Head (at time of TBI, 8 years ago)', result: 'No acute intracranial hemorrhage. Mild diffuse axonal injury pattern noted.' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Post-Traumatic Stress Disorder (F43.10)',
      supportingFindings: [
        'Criterion A: Combat exposure, witnessed death of squad members (IED blast)',
        'Cluster B (Re-experiencing): Nightmares 2-3x/week, intrusive memories, flashbacks triggered by loud noises',
        'Cluster C (Avoidance): Avoids crowds, fireworks, war movies, news, emotional conversations',
        'Cluster D (Negative mood/cognition): Emotional numbing, detachment from family, guilt, diminished interest, inability to feel positive emotions',
        'Cluster E (Hyperarousal): Hypervigilance, exaggerated startle, irritability, sleep disturbance, concentration difficulty, reckless behavior',
        'Duration >1 month (8 years)',
        'Significant functional impairment (marriage, work, social)',
      ],
      opposingFindings: [
        'Patient minimizes symptoms',
        'Some symptoms could overlap with AUD effects or TBI sequelae',
      ],
    },
    {
      rank: 2,
      diagnosis: 'Alcohol Use Disorder, Moderate to Severe (F10.20)',
      supportingFindings: [
        'Drinks 6+ drinks nightly',
        'Unable to cut down (tried, lasted 3 days)',
        'Continued despite relationship problems (wife\'s ultimatum)',
        'Tolerance (needs more to achieve same effect)',
        'Mild withdrawal symptoms (tremor, sweats)',
        'Elevated liver enzymes (AST, ALT, GGT)',
        'Macrocytosis (MCV 98)',
        'Meets ≥4 DSM-5 criteria (severe)',
      ],
      opposingFindings: [
        'No morning drinking or workplace drinking',
        'Maintains employment',
        'Onset clearly linked to PTSD symptom management — self-medication pathway',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Major Depressive Disorder, comorbid (F32.1)',
      supportingFindings: [
        'Anhedonia, emotional numbing, fatigue, sleep disturbance, passive SI, concentration difficulty, guilt',
        'Could be independent or PTSD-comorbid',
      ],
      opposingFindings: [
        'Symptom content is trauma-focused (guilt about specific events, not global worthlessness)',
        'Emotional numbing is part of PTSD Cluster D',
        'Depression symptoms may resolve with PTSD treatment',
        'Difficult to distinguish from PTSD Cluster D without treatment trial',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Traumatic Brain Injury, Chronic Effects (S06.0X0S)',
      supportingFindings: [
        'Documented mild TBI from IED blast',
        'Persistent headaches',
        'Mild cognitive complaints',
        'Tinnitus',
        'Mild objective cognitive findings on screening',
      ],
      opposingFindings: [
        'Cleared to return to duty (mild TBI)',
        'Cognitive symptoms overlap with PTSD + AUD + sleep deprivation',
        'Formal neuropsych testing needed to differentiate',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'What brings you in today?', domain: 'psychiatric', criticalInfo: 'Opens with patient\'s framing — wife\'s ultimatum. Establishes he\'s here reluctantly but present.' },
    { question: 'Can you tell me about your military service?', domain: 'social-history', criticalInfo: 'Establishes military background, deployments, rank. Shows respect for service. Do NOT push for trauma details immediately.' },
    { question: 'Have you experienced any events during your service that still affect you?', domain: 'psychiatric', criticalInfo: 'Open-ended trauma screen — lets patient control level of disclosure. Reveals IED blast and squad member deaths.' },
    { question: 'How are you sleeping?', domain: 'functional', criticalInfo: 'Reveals nightmares, alcohol-dependent sleep, sleeping on couch to protect family — multiple clinical data points.' },
    { question: 'Tell me about your drinking.', domain: 'substance-use', criticalInfo: 'CRITICAL — reveals 6+ drinks nightly, escalation timeline, self-medication function, failed quit attempt, mild withdrawal symptoms.' },
    { question: 'Have you ever had any head injuries, including during your service?', domain: 'past-medical', criticalInfo: 'TBI screen — reveals IED blast with LOC, persistent headaches, tinnitus. Essential for differential.' },
    { question: 'Have you had thoughts that life isn\'t worth living, or that you wouldn\'t mind not waking up?', domain: 'suicidality', criticalInfo: 'CRITICAL SAFETY — reveals passive SI that he initially denies. Phrasing important — direct but non-judgmental.' },
    { question: 'Do you have access to firearms?', domain: 'suicidality', criticalInfo: 'CRITICAL — reveals handgun in locked safe. Lethal means counseling is essential for veteran with passive SI.' },
    { question: 'Is there any violence or aggression happening at home?', domain: 'social-history', criticalInfo: 'IPV screen — reveals wall punching, cabinet damage, but no violence toward people. Must screen both directions.' },
    { question: 'Has your father or anyone in your family struggled with drinking?', domain: 'family-history', criticalInfo: 'Reveals father died of liver failure from AUD, paternal grandfather was a Vietnam vet with probable PTSD and AUD — multigenerational pattern.' },
    { question: 'How is all of this affecting your relationship with your wife and kids?', domain: 'social-history', criticalInfo: 'Assesses functional impairment in most important domain. Reveals emotional detachment from daughters, marriage at breaking point.' },
  ],
  keyExamManeuvers: [
    { maneuver: 'mental-status-mood-affect', expectedFinding: 'Restricted/flat affect, emotional numbing, anger flickers', significance: 'PTSD Cluster D — negative alterations in mood' },
    { maneuver: 'mental-status-appearance', expectedFinding: 'Hypervigilant, military bearing, scanning, door-facing', significance: 'PTSD Cluster E — hyperarousal behavioral manifestation' },
    { maneuver: 'mental-status-thought-content', expectedFinding: 'Survivor guilt, minimization, passive SI', significance: 'Core trauma-related cognitions plus safety concern' },
    { maneuver: 'suicidality-assessment', expectedFinding: 'Passive SI with firearm access', significance: 'CRITICAL — male veteran + PTSD + AUD + firearms = high-risk combination requiring lethal means counseling' },
    { maneuver: 'substance-use-screen', expectedFinding: 'AUD severe — AUDIT-C score 9', significance: 'Dual diagnosis — cannot treat PTSD effectively without addressing AUD' },
    { maneuver: 'mental-status-cognition', expectedFinding: 'Mild deficits — multifactorial (TBI, alcohol, sleep, PTSD)', significance: 'Formal neuropsych testing warranted given TBI history' },
    { maneuver: 'homicidality-assessment', expectedFinding: 'No HI but anger management concerns', significance: 'PTSD-related hyperarousal with behavioral outlet (property destruction) — include in treatment plan' },
  ],
  criticalActions: [
    'Screen for suicidality (C-SSRS) — passive SI revealed on direct questioning',
    'Lethal means counseling — discuss voluntary firearm storage (veteran with passive SI and firearm access)',
    'Assess alcohol use severity (AUDIT) and withdrawal risk before recommending cessation',
    'Screen for TBI — history of mild TBI warrants formal neuropsych referral',
    'Screen for IPV — both as perpetrator and victim',
    'Trauma-informed pacing — do NOT push for full trauma narrative in first visit',
    'Develop dual-diagnosis treatment plan: evidence-based PTSD therapy (CPT or PE) + AUD treatment (naltrexone or disulfiram, consider medically supervised taper)',
    'Safety plan with crisis line (Veterans Crisis Line: 988, press 1)',
    'Consider prazosin for nightmares (evidence-based for PTSD-related nightmares)',
    'Couples/family assessment — discuss involving wife in treatment process',
    'Refer for formal neuropsych testing given TBI + cognitive complaints',
    'Address military cultural barriers to mental health treatment',
    'Screen for bipolar history before considering antidepressant',
  ],
  scoringRubric: SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// CASE 6: "Perfect on Paper" — ADVANCED, Social Anxiety + Eating Disorder
// ═══════════════════════════════════════════════════════════════════════════════

const case6 = {
  title: 'Perfect on Paper',
  chiefComplaint: "I fainted and they brought me here. I'm fine, really. I just need to get back to studying.",
  program: 'DNP_PSYCHIATRY' as const,
  difficulty: 'ADVANCED' as const,
  targetYear: 3,
  organSystems: ['psychiatric', 'cardiovascular', 'endocrine', 'nutritional'],
  learningObjectives: [
    'Conduct a psychiatric assessment in a consultation-liaison setting on a medical unit',
    'Recognize the overlap between social anxiety disorder and restrictive eating behaviors',
    'Identify medication misuse (propranolol obtained informally)',
    'Navigate cultural factors in Korean-American family dynamics affecting disclosure',
    'Assess capacity for honest disclosure when family members are present',
  ],
  tags: ['social-anxiety', 'eating-disorder', 'anorexia', 'consultation-liaison', 'advanced', 'Korean-American', 'cultural-formulation', 'medication-misuse'],
  patientName: 'Hyun-jin "Grace" Park',
  patientAge: 20,
  patientSex: 'Female',
  patientPronouns: 'she/her',
  personalityNotes:
    'Polite, deferential, gives "right answers." Presents as the model patient — cooperative, articulate, minimizes everything. Makes culturally appropriate eye contact (brief, not sustained — Korean social norms). Calls clinician "Doctor" with slight formality. Defense mechanisms: intellectualization (discusses symptoms in clinical terms she\'s learned from pre-med coursework), minimization ("it\'s just stress"), people-pleasing (agrees with whatever the clinician suggests to avoid conflict), avoidance (changes subject from eating to academics). Rapport requirement: MUST ask parents to step out for a private conversation. With parents present, she will give socially desirable, minimizing answers. When alone, she may still be guarded — opens up only if the clinician explicitly states: "What you tell me stays between us unless there\'s a safety concern." Even then, disclosure is gradual — she tests the clinician\'s reaction to small admissions before sharing larger ones. Opens up when the clinician normalizes her experience without being condescending — "A lot of students I work with carry enormous pressure. I imagine being pre-med with physician parents adds a layer." Shuts down if clinician appears judgmental about eating, weight, or academic performance.',
  historyOfPresentIllness: {
    onset: 'Social anxiety symptoms since middle school; eating restriction escalating over past 8 months; syncope episode prompting this admission was 2 days ago',
    precipitants: 'Organic chemistry midterm presentation 2 days ago — took propranolol (obtained from a classmate) 30 minutes before. During the presentation, felt dizzy, vision tunneled, collapsed in front of the class. EMS called, brought to ER. Admitted for workup of syncope and bradycardia (HR 48 on arrival). Medical team noted BMI 17.2 and requested psychiatry consult for "anxiety."',
    character: 'Two intertwined presentations: (1) Social Anxiety Disorder — debilitating performance anxiety since age 13, avoids speaking in class, eating in public, eye contact with authority figures. Has been taking propranolol obtained from a classmate before all presentations and exams for past year. (2) Restrictive eating — began "eating clean" 8 months ago, progressively restricting to ~800 calories/day. Attributes weight loss to "stress and not having time to eat." Exercises daily (running 5 miles before dawn). Weighs herself 3 times daily. BMI now 17.2. Amenorrhea for 4 months.',
    severity: 'She rates distress at 3/10 ("I\'m fine, I just need to pass my classes"). Objective severity is high — BMI 17.2, syncope, bradycardia, amenorrhea, medication misuse.',
    associatedSymptoms: [
      'intense fear of public speaking, eating in front of others, being watched',
      'fear of negative evaluation — "everyone can see I\'m not good enough"',
      'avoidance of social situations (eating in dining hall, study groups, office hours)',
      'physical symptoms with social anxiety: trembling, blushing, nausea, voice quavering',
      'propranolol misuse — taking unprescribed medication from classmate',
      'restricted caloric intake (~800 cal/day)',
      'excessive exercise (running 5 miles daily, regardless of weather or fatigue)',
      'amenorrhea (4 months)',
      'syncope (presenting event)',
      'bradycardia (HR 48 on admission)',
      'cold intolerance',
      'lanugo noted on arms',
      'hair thinning',
      'dizziness when standing (orthostatic)',
      'weighs self 3x daily',
      'body image distortion — "I\'m not thin, I could lose more"',
    ],
    timeline: 'Social anxiety onset age 13 (middle school presentation — vomited in front of class, has been terrified of public speaking since). Managed by avoidance through high school (chose classes without presentations). University demands forced exposure — propranolol use began 1 year ago. Eating restriction began 8 months ago during a high-stress semester. Progressive restriction to ~800 cal/day over past 4 months. Weight: 128 lbs 8 months ago → 103 lbs now (25-lb loss). Amenorrhea 4 months. Syncope 2 days ago prompted admission.',
    narrative: 'Hyun-jin "Grace" Park is a 20-year-old Korean-American pre-medical student admitted to the medical floor after syncopal episode during a class presentation with bradycardia (HR 48 on arrival). Psychiatry consulted for "anxiety." Assessment reveals two significant comorbid conditions: (1) Social Anxiety Disorder — severe, chronic since age 13, managing with unprescribed propranolol obtained from a classmate for the past year; (2) Restrictive eating disorder (subthreshold Anorexia Nervosa or Atypical Anorexia) — 25-lb weight loss over 8 months, BMI 17.2, caloric restriction to ~800/day, excessive exercise, amenorrhea 4 months, body image distortion. The syncope is likely multifactorial: orthostatic hypotension from malnutrition, bradycardia from vagal tone changes, and propranolol effect on an already compromised cardiovascular system. Cultural factors are critical: both parents are physicians (father is a surgeon, mother is an internist), academic expectations are extreme, "saving face" prevents honest disclosure, and the patient has learned to present as "fine" to avoid disappointing her family. Parents are at bedside and must be asked to leave for honest assessment.',
  },
  pastMedicalHistory: {
    conditions: [
      'Syncope (current admission — workup in progress)',
      'Amenorrhea (4 months — attributed to "stress" by patient)',
      'Low BMI (17.2 — was 21.4 eight months ago)',
      'Iron-deficiency anemia (diagnosed 2 months ago, prescribed iron supplements — she takes them inconsistently)',
    ],
    surgeries: ['None'],
    hospitalizations: ['Current admission only. No prior hospitalizations.'],
    previousPsychTreatment: 'None. Parents believe mental health treatment is unnecessary and stigmatizing. "My parents are doctors — if something was really wrong, they would have noticed." In middle school, school counselor suggested therapy for social anxiety; parents declined — "She just needs to work harder."',
  },
  medications: [
    { name: 'Propranolol', dose: '20mg', frequency: 'PRN before presentations/exams', notes: 'NOT PRESCRIBED — obtained from classmate. Using 2-3x/week for past year.' },
    { name: 'Iron supplement', dose: '325mg ferrous sulfate', frequency: 'daily (inconsistent)', notes: 'For iron-deficiency anemia — admits taking it only 2-3x/week' },
    { name: 'Multivitamin', dose: '1 tablet', frequency: 'daily', notes: '"My mom told me to take it"' },
  ],
  allergies: [{ allergen: 'No known drug allergies', reaction: '' }],
  socialHistory: {
    smoking: 'Never',
    alcohol: 'Rare — 1-2 drinks at social events, maybe once a month. Avoids drinking because of calories.',
    drugs: 'Never. Propranolol obtained from classmate — does not view this as drug misuse.',
    caffeine: 'Black coffee, 3-4 cups daily. Uses as appetite suppressant ("it keeps me going without eating").',
    occupation: 'Pre-med student, sophomore at university. 3.97 GPA. Takes 18 credit hours. Volunteers at hospital 10 hrs/week. Research assistant in neuroscience lab. "I need all of this for medical school applications."',
    livingSituation: 'Lives in university dormitory with roommate. Roommate has noticed weight loss and commented — patient deflected ("I\'m just eating healthier"). Parents live 2 hours away.',
    relationships: 'Single. Has never dated — "I don\'t have time, and nobody would want to go out with me anyway." One close friend from high school (Amy) who she texts but rarely sees. Describes herself as "socially awkward" but acquaintances would describe her as "quiet and really smart."',
    support: 'Parents (present at bedside — both physicians). Older brother Daniel (24, medical resident at different university — "the successful one"). Roommate (casual, not close). Friend Amy (texts). No therapy, no support group, no campus counseling. Academic advisor (unaware of mental health issues).',
    education: 'Pre-med sophomore, 3.97 GPA, 18 credit hours per semester',
    legal: 'No legal history',
    military: 'None',
    spirituality: 'Family is nominally Presbyterian (Korean Presbyterian church). Attends with parents during visits. "I go because they want me to. I don\'t think much about it."',
  },
  familyHistory: {
    conditions: [
      { relation: 'Mother', condition: 'Internist. No formal psychiatric history. Patient describes her as "a perfectionist who controls everything — the house, our grades, our image." Possible undiagnosed anxiety or OCD traits. Very thin — "my mom has always been obsessed with weight, hers and mine."' },
      { relation: 'Father', condition: 'Surgeon. No psychiatric history. "He works 80 hours a week. I see him maybe 2 hours a week when I\'m home. He expects excellence and doesn\'t accept excuses."' },
      { relation: 'Older brother', condition: 'Medical resident. "He\'s perfect. Captain of everything in high school, summa cum laude, matched into surgery. I\'m always compared to him." No known psychiatric history but patient suspects he has anxiety too — "he just hides it better."' },
      { relation: 'Maternal grandmother', condition: '"She was very nervous. Never left the house much." Possible agoraphobia. Never treated — "in Korea, that generation didn\'t believe in mental health."' },
    ],
  },
  reviewOfSystems: {
    constitutional: '25-lb weight loss in 8 months (128 → 103 lbs). Cold intolerance. Fatigue. Hair thinning. Lanugo on arms. Dizziness when standing.',
    cardiovascular: 'Bradycardia (HR 48 on admission). Syncope. Orthostatic dizziness. No known structural heart disease.',
    respiratory: 'Denies SOB, cough.',
    gastrointestinal: 'Restricts intake to ~800 cal/day. Eats alone to avoid observation. Counts calories meticulously. Occasional constipation. Denies binge/purge behavior — "I would never do that." Denies laxative use.',
    neurological: 'Syncope (presenting). Dizziness with standing. Difficulty concentrating lately (attributes to "needing to study harder"). No headaches, focal deficits.',
    musculoskeletal: 'Exercises daily — runs 5 miles before dawn, does bodyweight exercises. No stress fractures (yet). Occasional muscle cramps.',
    endocrine: 'Amenorrhea 4 months. Cold intolerance. Hair thinning. Lanugo. All consistent with malnutrition.',
    psychiatric: 'Social anxiety — severe, chronic since age 13. Avoidance of public speaking, eating in public, social situations. Performance anxiety with somatic symptoms (trembling, blushing, nausea). Body image distortion — perceives self as "not thin, could lose more" despite BMI 17.2. Restrictive eating with excessive exercise. Perfectionism. Self-worth tied entirely to academic performance. Denies SI — "I don\'t want to die, I want to succeed." Denies HI. Denies psychotic symptoms.',
    sleep: 'Sleeps 4-5 hours — up at 4:30 AM to run, studies until midnight. "Sleep is a waste of time." No insomnia — falls asleep from exhaustion. No nightmares.',
  },
  vitalSigns: {
    bloodPressure: '96/58',
    heartRate: 52,
    respiratoryRate: 14,
    temperature: 97.2,
    weight: '103 lbs',
    height: '5\'5"',
    bmi: 17.2,
    orthostatics: 'Lying: 96/58, HR 52. Standing: 82/50, HR 78. Symptomatic (dizziness) — positive orthostatic hypotension.',
  },
  physicalExamFindings: {
    'mental-status-appearance': {
      finding: 'Young Korean-American female appearing younger and thinner than expected for stated age. Wearing hospital gown, IV in left hand. Underweight — temporal wasting visible, clavicles prominent, arms thin with visible lanugo. Hair pulled back — appears thin and brittle. Well-groomed despite hospitalization (applied lip gloss, smoothed hair before clinician entered). Sits upright in bed, hands folded in lap. Makes brief, polite eye contact. Parents at bedside — father on phone (working), mother sitting in chair with notepad, actively monitoring the conversation.',
      interpretation: 'Appearance consistent with significant malnutrition (temporal wasting, lanugo, hair thinning). Grooming behavior despite illness suggests performance/image management. Parents\' presence will limit disclosure — private interview essential.',
    },
    'mental-status-mood-affect': {
      finding: 'WITH PARENTS PRESENT — Mood: "I\'m fine, really. Can I go home?" Affect: Pleasant, cooperative, slightly guarded. Smiles appropriately. Defers to mother frequently ("Mom, am I anxious? I don\'t think so"). Mother interjects: "She\'s just stressed about exams. She\'s always been a worrier." AFTER PARENTS ASKED TO LEAVE — Mood: "I\'m... I don\'t know. Tired. Scared." (long pause) "Scared that I\'m failing." Affect shifts: eyes fill with tears, voice drops, hands tremble. Still attempts to minimize: "It\'s not that bad though." Admits to feeling "overwhelmed all the time" and "like I\'m never good enough."',
      interpretation: 'DRAMATIC shift in presentation when parents leave — classic for patients with performance-oriented family systems and face-saving cultural dynamics. True emotional state is anxious, depleted, and distressed beneath carefully maintained facade.',
    },
    'mental-status-speech': {
      finding: 'With parents: measured, articulate, uses medical terminology. Without parents: softer, more hesitant, longer pauses. Voice quavers when discussing eating or weight. Answers become shorter and less rehearsed. Normal rate, slightly low volume. No pressured speech.',
      interpretation: 'Speech reflects shift from performed competence (with parents) to genuine vulnerability (alone). Low volume and hesitancy suggest shame and anxiety.',
    },
    'mental-status-thought-process': {
      finding: 'Goal-directed, organized, logical. Intellectualizes: "I understand the physiology of syncope — it was probably vasovagal." Minimizes systematically — has a prepared explanation for every symptom. When challenged gently, becomes more tangential as defenses are stressed.',
      interpretation: 'Intact thought process with prominent intellectualization defense. Organized but defensive — uses medical knowledge to maintain control of narrative.',
    },
    'mental-status-thought-content': {
      finding: 'Preoccupied with academic performance, parental expectations, body image. "If I don\'t get into medical school, I have no value." Self-worth entirely achievement-based. Body image distortion: "I\'m not thin — my mom is thinner than me and she\'s fine." Fears: being seen, being judged, being "exposed as not smart enough." Denies SI: "I don\'t want to die. I want to be perfect, which is impossible, so I just keep trying harder." No HI. No delusions. No obsessions beyond academic/body/food-related rumination.',
      interpretation: 'Cognitive distortions: all-or-nothing thinking (perfect or worthless), body image distortion, achievement-contingent self-worth. These drive both the social anxiety and the restrictive eating.',
    },
    'mental-status-perceptions': {
      finding: 'Denies hallucinations of any type. No depersonalization or derealization. Possible body image distortion (sees self as not thin despite BMI 17.2) — this is perceptual rather than delusional.',
      interpretation: 'No psychotic perceptual disturbances. Body image distortion is consistent with eating disorder cognition, not psychotic perception.',
    },
    'mental-status-cognition': {
      finding: 'Alert and oriented x4. Attention intact — completes serial 7s quickly and accurately. Recall 3/3 at 5 minutes. Fund of knowledge exceptional (pre-med student). However, patient reports increasing difficulty concentrating over past month — likely malnutrition-related cognitive effects.',
      interpretation: 'Cognition grossly intact but self-reported concentration decline is consistent with malnutrition. Cognitive function may decline further without nutritional rehabilitation.',
    },
    'mental-status-insight-judgment': {
      finding: 'Insight: Poor to partial. Acknowledges social anxiety when alone ("I know it\'s not normal to vomit before presentations"). Minimizes eating: "I\'m just eating healthy." Does not connect weight loss, amenorrhea, syncope, and restrictive eating as a pattern. Does not see propranolol use as problematic. Judgment: Impaired — taking unprescribed medication, eating 800 cal/day while exercising intensely, continuing to minimize despite hospitalization. Academic judgment intact (3.97 GPA) but health judgment severely compromised.',
      interpretation: 'Dissociation between intellectual capacity and health insight — common in high-achieving eating disorder patients. Eating disorder ego-syntonic (experienced as positive "discipline" not illness).',
    },
    'suicidality-assessment': {
      finding: 'C-SSRS: No suicidal ideation. "I don\'t want to die — I want to succeed." No prior attempts. No self-harm (cutting, burning). However, the restrictive eating with excessive exercise functions as slow self-harm — must be framed as such in treatment. Protective factors: academic goals, achievement drive, fear of disappointing parents. Risk factors: perfectionism, social isolation, eating disorder (AN has highest mortality of any psychiatric disorder), medication misuse, cultural barriers to help-seeking.',
      interpretation: 'No acute suicide risk. However, eating disorder is a potentially lethal condition. The drive to "succeed" can paradoxically sustain life while the eating disorder threatens it.',
    },
    'homicidality-assessment': {
      finding: 'Denies homicidal ideation. No aggression. No history of violence.',
      interpretation: 'No homicidal risk.',
    },
    'substance-use-screen': {
      finding: 'AUDIT-C: Score 1 (minimal alcohol — avoids calories). No drug use. Propranolol 20mg PRN — obtained from classmate, not prescribed. Uses 2-3x/week before presentations and exams for past year. Views it as "medication" not "drug." Caffeine: 3-4 cups black coffee daily, partially as appetite suppressant.',
      interpretation: 'Propranolol misuse requires intervention — non-prescribed use of a cardiac-active medication contributed to bradycardia and likely syncope. Coffee used as appetite suppressant. No traditional substance use disorder but medication misuse is clinically significant.',
    },
  },
  defaultNormalFindings: {
    general: 'Thin female, underweight, in no acute distress',
    cardiovascular: 'Bradycardic at 52 bpm (sinus), regular rhythm, no murmurs. Orthostatic hypotension positive.',
    respiratory: 'Clear to auscultation bilaterally',
    neurological: 'Cranial nerves II-XII intact, no focal deficits. Mild proximal muscle weakness (consistent with malnutrition).',
  },
  availableLabs: [
    { name: 'CBC', result: 'Hgb 10.8 (low — iron-deficiency anemia), WBC 3.2 (low — leukopenia from malnutrition), Plt 195' },
    { name: 'CMP', result: 'Glucose 68 (low — hypoglycemia from restriction), K 3.3 (low-normal, trending toward hypokalemia), Mg 1.6 (low), Phosphorus 2.8 (low-normal). Na, Cl, BUN/Cr normal.' },
    { name: 'Albumin', result: '3.2 g/dL (low — malnutrition marker)' },
    { name: 'Prealbumin', result: '14 mg/dL (low — acute malnutrition)' },
    { name: 'TSH', result: '5.8 mIU/L (mildly elevated — sick euthyroid from malnutrition)' },
    { name: 'Free T4', result: '0.8 ng/dL (low-normal)' },
    { name: 'Ferritin', result: '8 ng/mL (low — iron deficiency)' },
    { name: 'Vitamin D', result: '14 ng/mL (deficient)' },
    { name: 'EKG', result: 'Sinus bradycardia, rate 52, prolonged QTc 460ms (concerning — electrolyte effects on cardiac conduction)' },
    { name: 'Urine Drug Screen', result: 'Negative' },
    { name: 'hCG', result: 'Negative' },
    { name: 'Estradiol', result: '18 pg/mL (low — consistent with hypothalamic amenorrhea from malnutrition)' },
    { name: 'LH/FSH', result: 'Both suppressed — consistent with hypothalamic amenorrhea' },
  ],
  availableImaging: [
    { name: 'Echocardiogram', result: 'Normal structure, EF 55% (low-normal for age), no MVP, no pericardial effusion' },
    { name: 'Chest X-Ray', result: 'No acute cardiopulmonary process' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Social Anxiety Disorder (F40.10)',
      supportingFindings: [
        'Marked fear of social situations where scrutiny is possible (presentations, eating in public, eye contact)',
        'Social situations almost always provoke anxiety (somatic: trembling, blushing, nausea)',
        'Avoidance of social situations (eating alone, avoiding study groups, office hours)',
        'Fear is out of proportion to actual threat',
        'Duration >6 months (since age 13 — 7 years)',
        'Significant impairment — limiting social and academic functioning',
        'Not attributable to substance or medical condition',
        'Family history (grandmother possible agoraphobia)',
      ],
      opposingFindings: [
        'Could argue symptoms overlap with eating disorder avoidance (eating in public)',
        'Academic performance preserved (compensatory over-preparation)',
      ],
    },
    {
      rank: 2,
      diagnosis: 'Anorexia Nervosa, Restricting Type, Subthreshold / Atypical (F50.02)',
      supportingFindings: [
        'Restriction of caloric intake (~800 cal/day) leading to significantly low body weight (BMI 17.2)',
        'Intense fear of gaining weight (implied — weighs self 3x daily, calorie counting)',
        'Disturbance in body perception ("I\'m not thin, my mom is thinner")',
        'Amenorrhea 4 months (hypothalamic)',
        'Excessive exercise (5 miles daily)',
        'Lanugo, hair thinning, cold intolerance, bradycardia — physical signs of malnutrition',
        'Lab abnormalities: leukopenia, hypoglycemia, low albumin, low prealbumin, electrolyte trends',
        'Prolonged QTc — cardiac risk from malnutrition',
      ],
      opposingFindings: [
        'Patient attributes restriction to "stress" and "eating clean" — may not meet full cognitive criterion if fear of weight gain is denied',
        'Some features consistent with ARFID or atypical AN',
        'Cultural factors: thinness may be family norm rather than individual pathology',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Generalized Anxiety Disorder (F41.1)',
      supportingFindings: [
        'Chronic worry across domains (academics, social performance, body)',
        'Muscle tension, sleep disruption, difficulty concentrating',
        'Duration >6 months',
      ],
      opposingFindings: [
        'Anxiety is primarily performance-related (social situations, evaluation)',
        'Social Anxiety Disorder better captures the specific pattern',
        'Could be comorbid',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Cardiac Cause of Syncope (e.g., long QT, structural)',
      supportingFindings: [
        'Syncope, bradycardia, prolonged QTc (460ms)',
        'Must rule out primary cardiac cause',
      ],
      opposingFindings: [
        'Bradycardia and QTc prolongation explained by malnutrition + propranolol + electrolyte abnormalities',
        'Echo shows normal structure',
        'Clinical context strongly supports malnutrition as cause',
        'Vital signs and EKG expected to normalize with refeeding and propranolol discontinuation',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'Could I speak with Grace alone for a few minutes? This is standard for patients her age.', domain: 'psychiatric', criticalInfo: 'CRITICAL FIRST ACTION — must remove parents for honest assessment. Frame as clinical standard, not suspicion.' },
    { question: 'Grace, what you tell me stays between us unless there\'s a safety concern. Can you tell me what\'s really going on?', domain: 'psychiatric', criticalInfo: 'Establishes confidentiality — essential for disclosure in face-saving cultural context.' },
    { question: 'Tell me about your eating — what does a typical day of food look like?', domain: 'psychiatric', criticalInfo: 'CRITICAL — reveals ~800 cal/day restriction, calorie counting, avoiding eating in public, weighing 3x daily.' },
    { question: 'Have you been using any medications that weren\'t prescribed to you?', domain: 'medications', criticalInfo: 'CRITICAL — reveals propranolol misuse (20mg from classmate, 2-3x/week). Contributed to syncope/bradycardia.' },
    { question: 'Tell me about your periods — are they regular?', domain: 'psychiatric', criticalInfo: 'Reveals 4 months amenorrhea — key diagnostic finding for malnutrition severity.' },
    { question: 'When you look at yourself, what do you see?', domain: 'psychiatric', criticalInfo: 'Assesses body image distortion — "I\'m not thin, my mom is thinner" despite BMI 17.2.' },
    { question: 'What happens when you have to speak in front of people — describe the experience?', domain: 'psychiatric', criticalInfo: 'Details social anxiety: trembling, blushing, nausea, avoidance since age 13.' },
    { question: 'How do your parents react when you don\'t meet their expectations?', domain: 'cultural', criticalInfo: 'Reveals family pressure dynamics — father expects excellence, mother monitors weight and grades, comparison to "perfect" brother.' },
    { question: 'Have you had any thoughts of hurting yourself or ending your life?', domain: 'suicidality', criticalInfo: 'Safety screen — denies SI but eating disorder is potentially lethal. Restrictive eating as slow self-harm must be assessed.' },
    { question: 'How much are you exercising?', domain: 'functional', criticalInfo: 'Reveals 5 miles daily before dawn + bodyweight exercises — compulsive exercise component of eating disorder.' },
    { question: 'Have you ever had a period of feeling unusually energetic, needed less sleep, or felt on top of the world?', domain: 'psychiatric', criticalInfo: 'Bipolar screen — important before any medication consideration.' },
  ],
  keyExamManeuvers: [
    { maneuver: 'mental-status-mood-affect', expectedFinding: 'Dramatic shift between parents-present (fine) and parents-absent (tearful, scared)', significance: 'CRITICAL — demonstrates the face-saving dynamic; only true assessment occurs privately' },
    { maneuver: 'mental-status-appearance', expectedFinding: 'Underweight, lanugo, temporal wasting, hair thinning', significance: 'Physical signs of malnutrition — corroborates eating disorder diagnosis' },
    { maneuver: 'mental-status-insight-judgment', expectedFinding: 'Poor health insight despite high intelligence', significance: 'Eating disorder ego-syntonic quality — guides treatment framing' },
    { maneuver: 'mental-status-thought-content', expectedFinding: 'Body image distortion, achievement-contingent self-worth, fear of evaluation', significance: 'Core cognitive drivers of both social anxiety and eating disorder' },
    { maneuver: 'suicidality-assessment', expectedFinding: 'No acute SI but eating disorder is potentially lethal', significance: 'Must frame restrictive eating as life-threatening even without suicidal intent' },
    { maneuver: 'substance-use-screen', expectedFinding: 'Propranolol misuse, caffeine as appetite suppressant', significance: 'Medication misuse contributed to current medical crisis' },
  ],
  criticalActions: [
    'Conduct private interview without parents — essential for honest assessment',
    'Establish confidentiality clearly — "What you tell me stays between us unless safety concern"',
    'Screen for suicidality (C-SSRS)',
    'Screen for bipolar history before considering any psychiatric medication',
    'Assess eating behaviors in detail — restriction, exercise, body image, weighing frequency',
    'Assess propranolol misuse — source, dose, frequency, understanding of risks',
    'Interpret vital signs in context — bradycardia + orthostatic hypotension + QTc prolongation = medical risk from malnutrition + propranolol',
    'Request nutrition consult — medical stabilization is first priority',
    'Develop outpatient plan: eating disorder treatment (therapy + nutritional rehab + medical monitoring), social anxiety treatment (SSRI + CBT)',
    'Discuss confidentiality boundaries with patient — what must be shared with parents (safety) vs. what remains private',
    'Cultural formulation — address Korean-American family dynamics, perfectionism, face-saving without stereotyping',
    'Discontinue unprescribed propranolol — discuss prescribed alternatives if indicated for social anxiety',
    'Arrange close outpatient follow-up with eating disorder-specialized provider',
  ],
  scoringRubric: SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLEGE OF MEDICINE CASES
// ═══════════════════════════════════════════════════════════════════════════════

const COM_SCORING_RUBRIC = {
  historyWeight: 0.20,
  examWeight: 0.25,
  differentialWeight: 0.25,
  planWeight: 0.20,
  communicationWeight: 0.10,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COM CASE 1: "Tightness in the Chest" — BEGINNER, Acute Coronary Syndrome
// ═══════════════════════════════════════════════════════════════════════════════

const comCase1 = {
  title: 'Tightness in the Chest',
  chiefComplaint: "I've had this pressure in my chest since this morning... it won't go away. It feels like an elephant sitting on me.",
  program: 'COLLEGE_OF_MEDICINE' as const,
  difficulty: 'BEGINNER' as const,
  targetYear: 2,
  organSystems: ['cardiovascular', 'respiratory'],
  learningObjectives: [
    'Obtain a focused cardiac history using OPQRST framework',
    'Identify classic and atypical presentations of acute coronary syndrome',
    'Perform a targeted cardiovascular and respiratory physical examination',
    'Order and interpret initial cardiac workup (ECG, troponin, CXR)',
    'Develop a risk-stratified management plan for chest pain',
  ],
  tags: ['chest-pain', 'ACS', 'STEMI', 'cardiovascular', 'emergency', 'beginner', 'Hispanic'],
  patientName: 'Roberto Mendez',
  patientAge: 58,
  patientSex: 'Male',
  patientPronouns: 'he/him',
  personalityNotes:
    "Stoic but visibly uncomfortable. Downplays symptoms — 'It's probably just indigestion.' Becomes more forthcoming when asked specifically about radiation to the arm. Slightly anxious about missing work. Speaks English fluently with occasional Spanish phrases when stressed. Will mention his father's heart attack only if family history is specifically asked.",
  historyOfPresentIllness: {
    onset: 'Approximately 4 hours ago, started while walking up stairs at work',
    precipitants: 'Physical exertion (climbing 2 flights of stairs). Has had milder episodes with exertion over the past 3 weeks that he attributed to "getting older."',
    character: "Substernal pressure, 'like someone sitting on my chest.' Not sharp, not pleuritic.",
    severity: "7/10 — 'It's bad enough I finally let my coworker drive me here'",
    associatedSymptoms: [
      'radiation to left arm and jaw (only admits to arm if asked directly)',
      'diaphoresis (noticed his shirt was soaked through)',
      'mild nausea, no vomiting',
      'shortness of breath on exertion',
      'no palpitations, no syncope',
    ],
    timeline: 'Constant since onset. Previous milder episodes lasted 5-10 minutes and resolved with rest. Today\'s episode has not resolved.',
    narrative: "Roberto is a 58-year-old Hispanic man who presents to the ED with 4 hours of substernal chest pressure that began while climbing stairs at work. He describes it as 'someone sitting on his chest,' rating it 7/10. The pain radiates to his left arm and jaw. He is diaphoretic and mildly nauseated. He has had similar but milder episodes over the past 3 weeks with exertion that resolved with rest — he attributed them to aging. He delayed coming to the ED because he didn't want to miss work. He has a history of hypertension, hyperlipidemia, type 2 diabetes, and a 20-pack-year smoking history (quit 5 years ago). His father died of an MI at age 62.",
  },
  pastMedicalHistory: {
    conditions: [
      'Hypertension (diagnosed age 45, on lisinopril)',
      'Type 2 Diabetes (diagnosed age 50, A1C 7.8, on metformin)',
      'Hyperlipidemia (diagnosed age 48, on atorvastatin)',
    ],
    surgeries: ['Cholecystectomy age 52'],
    hospitalizations: ['None'],
  },
  medications: [
    { name: 'Lisinopril', dose: '20mg', frequency: 'daily', notes: 'For hypertension' },
    { name: 'Metformin', dose: '1000mg', frequency: 'twice daily', notes: 'For diabetes' },
    { name: 'Atorvastatin', dose: '40mg', frequency: 'nightly', notes: 'For hyperlipidemia' },
    { name: 'Aspirin', dose: '81mg', frequency: 'daily', notes: 'Started by PCP 1 year ago' },
  ],
  allergies: [{ allergen: 'Penicillin', reaction: 'Hives as a teenager' }],
  socialHistory: {
    smoking: 'Former smoker — 20 pack-years, quit 5 years ago',
    alcohol: '2-3 beers on weekends, social only',
    drugs: 'Denies any illicit drug use',
    caffeine: '3 cups of coffee daily',
    occupation: 'Warehouse supervisor at a shipping company, physically active job',
    livingSituation: 'Lives with wife Maria (55) and youngest son (17) in a house they own',
    relationships: 'Married 30 years. Close family. Wife is in the waiting room, very anxious.',
    support: 'Strong family support — wife, 3 adult children, church community. Brother with similar cardiac risk factors.',
    education: 'High school diploma',
    legal: 'No legal history',
    military: 'None',
    exercise: 'Physically active at work. No formal exercise program. Has noticed decreased exercise tolerance over past month.',
  },
  familyHistory: {
    conditions: [
      { relation: 'Father', condition: 'Fatal MI at age 62' },
      { relation: 'Mother', condition: 'Type 2 diabetes, alive at 82' },
      { relation: 'Brother (60)', condition: 'Hypertension, hyperlipidemia' },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Diaphoresis, mild fatigue over past 3 weeks',
    heent: 'Negative',
    cardiovascular: 'Chest pressure, exertional dyspnea, denies palpitations/edema',
    respiratory: 'Mild dyspnea with exertion, no cough/wheezing',
    gastrointestinal: 'Mild nausea, no vomiting/diarrhea/abdominal pain',
    genitourinary: 'Negative',
    musculoskeletal: 'Denies — pain is not reproducible with palpation',
    neurological: 'No syncope, no focal deficits',
    psychiatric: 'Anxious about current symptoms',
    skin: 'Diaphoretic',
    endocrine: 'Stable diabetes management',
    hematologic: 'Negative',
  },
  physicalExamFindings: {
    'general-appearance': {
      finding: 'Alert, diaphoretic, mildly distressed male sitting upright. Clutching left arm intermittently.',
      interpretation: 'Appearance consistent with acute cardiac event — diaphoresis is an autonomic stress response.',
    },
    'cardiac-auscultation': {
      finding: 'Regular rate and rhythm. S1/S2 normal. No murmurs, rubs, or gallops. No S3 or S4.',
      interpretation: 'Normal cardiac exam does not exclude ACS. Absence of S3 suggests no acute heart failure.',
    },
    'lung-auscultation': {
      finding: 'Clear to auscultation bilaterally. No crackles, wheezes, or rhonchi.',
      interpretation: 'Clear lungs — no evidence of pulmonary edema or pneumonia.',
    },
    'chest-wall-palpation': {
      finding: 'No reproducible tenderness on palpation of chest wall.',
      interpretation: 'Non-reproducible pain argues against musculoskeletal cause — increases suspicion for cardiac etiology.',
    },
    'peripheral-pulses': {
      finding: 'Radial, dorsalis pedis pulses 2+ bilaterally. No pulse deficits.',
      interpretation: 'Symmetric pulses — no evidence of aortic dissection or peripheral vascular disease.',
    },
    'jugular-venous-distension': {
      finding: 'JVP not elevated. No hepatojugular reflux.',
      interpretation: 'Normal right-sided filling pressures — no acute right heart failure.',
    },
    'lower-extremity-exam': {
      finding: 'No peripheral edema bilaterally.',
      interpretation: 'No evidence of chronic heart failure.',
    },
  },
  vitalSigns: {
    heartRate: 96,
    bloodPressure: '158/94',
    respiratoryRate: 20,
    temperature: 98.6,
    oxygenSaturation: 97,
  },
  defaultNormalFindings: {
    description: 'Within normal limits. No acute abnormalities noted on examination.',
  },
  availableLabs: [
    { name: 'Troponin I (initial)', result: '0.85 ng/mL', normal: '<0.04 ng/mL', abnormal: true },
    { name: 'Troponin I (3-hour)', result: '2.4 ng/mL', normal: '<0.04 ng/mL', abnormal: true },
    { name: 'BNP', result: '120 pg/mL', normal: '<100 pg/mL', abnormal: true },
    { name: 'CBC', result: 'WBC 9.2, Hgb 14.1, Plt 245', normal: 'WNL', abnormal: false },
    { name: 'BMP', result: 'Na 139, K 4.2, Cr 1.1, Glucose 198', normal: 'Glucose elevated', abnormal: true },
    { name: 'Lipid Panel', result: 'Total cholesterol 242, LDL 158, HDL 38, TG 210', normal: 'LDL <100, HDL >40', abnormal: true },
    { name: 'A1C', result: '7.8%', normal: '<5.7%', abnormal: true },
    { name: 'PT/INR', result: 'PT 12.5, INR 1.0', normal: 'WNL', abnormal: false },
  ],
  availableImaging: [
    { name: 'ECG (12-lead)', findings: 'ST-segment elevation in leads II, III, aVF (2-3mm). Reciprocal ST depression in leads I and aVL. Normal sinus rhythm at 96 bpm. No prior ECG for comparison.' },
    { name: 'Chest X-ray (portable AP)', findings: 'Heart size normal. No pulmonary edema. No pneumothorax. No pleural effusion. Lungs clear.' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'ST-Elevation Myocardial Infarction (Inferior STEMI)',
      supportingFindings: [
        'ST elevation in II, III, aVF',
        'Elevated troponin with rising trend',
        'Classic substernal pressure with radiation to left arm and jaw',
        'Diaphoresis and nausea (vagal symptoms common in inferior MI)',
        'Multiple cardiac risk factors (HTN, DM, hyperlipidemia, smoking, family history)',
      ],
      opposingFindings: ['No prior ECG for comparison'],
    },
    {
      rank: 2,
      diagnosis: 'Unstable Angina progressing to NSTEMI',
      supportingFindings: [
        'Crescendo pattern of exertional chest pain over 3 weeks',
        'Elevated troponin',
        'Multiple risk factors',
      ],
      opposingFindings: [
        'ST elevation pattern is more consistent with STEMI than NSTEMI',
        'Pain has been persistent for 4 hours, not waxing/waning',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Aortic Dissection',
      supportingFindings: [
        'Acute chest pain',
        'Hypertension',
        'Diaphoresis',
      ],
      opposingFindings: [
        'Pain is pressure-like, not tearing/ripping',
        'No pulse deficit on exam',
        'No aortic regurgitation murmur',
        'Gradual onset, not sudden maximal intensity',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Pulmonary Embolism',
      supportingFindings: [
        'Chest pain with dyspnea',
        'Tachycardia',
      ],
      opposingFindings: [
        'No pleuritic component to pain',
        'No risk factors for VTE (no recent surgery, immobility, travel)',
        'ECG shows ST elevation, not right heart strain pattern',
        'Clear chest X-ray',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'Does the pain radiate anywhere — to your arm, jaw, back, or neck?', domain: 'cardiovascular', criticalInfo: 'Radiation to left arm and jaw — classic for ACS, increases pre-test probability significantly' },
    { question: 'Have you had similar episodes before today?', domain: 'cardiovascular', criticalInfo: 'Reveals 3-week crescendo angina pattern — unstable angina progressing to STEMI' },
    { question: 'Is the pain made worse by breathing in deeply or pressing on your chest?', domain: 'cardiovascular', criticalInfo: 'Non-pleuritic, non-reproducible — argues against MSK and PE, supports cardiac etiology' },
    { question: 'Did anyone in your family have heart problems at a young age?', domain: 'cardiovascular', criticalInfo: 'Father died of MI at 62 — significant family history of premature CAD' },
    { question: 'Are you sweating more than usual right now?', domain: 'cardiovascular', criticalInfo: 'Diaphoresis confirms sympathetic activation — high-risk feature in chest pain' },
    { question: 'Have you used any recreational drugs like cocaine recently?', domain: 'cardiovascular', criticalInfo: 'Rules out cocaine-induced vasospasm — important in any chest pain workup' },
  ],
  keyExamManeuvers: [
    { maneuver: 'Cardiac auscultation (4 positions)', expectedFinding: 'Regular rate and rhythm, no murmurs/gallops', significance: 'Absence of new murmur or S3 — no acute valvular pathology or heart failure' },
    { maneuver: 'Chest wall palpation for reproducibility', expectedFinding: 'Non-tender, pain not reproducible', significance: 'Non-reproducible chest pain significantly increases cardiac pretest probability' },
    { maneuver: 'Bilateral arm blood pressures', expectedFinding: 'Symmetric — no >20mmHg difference', significance: 'Rules out aortic dissection' },
    { maneuver: 'Lung auscultation', expectedFinding: 'Clear bilaterally', significance: 'No pulmonary edema — Killip class I, better prognosis' },
    { maneuver: 'JVP assessment', expectedFinding: 'Not elevated', significance: 'No right ventricular involvement — important in inferior STEMI' },
  ],
  criticalActions: [
    'Obtain 12-lead ECG within 10 minutes of arrival — identify STEMI pattern for emergent catheterization',
    'Administer aspirin 325mg chewable immediately — dual antiplatelet therapy',
    'Serial troponins to document rising trend — confirms myocardial injury',
    'Activate cardiac catheterization lab — door-to-balloon time <90 minutes for STEMI',
    'IV access, continuous telemetry monitoring, supplemental oxygen if SpO2 <94%',
    'Obtain portable CXR to evaluate for pulmonary edema and alternative diagnoses',
    'Pain management with sublingual nitroglycerin (after checking for hypotension and no PDE5 inhibitor use)',
    'Check bilateral arm BPs to rule out dissection before anticoagulation',
  ],
  scoringRubric: COM_SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COM CASE 2: "Something's Not Right Down There" — INTERMEDIATE, Acute Abdomen
// ═══════════════════════════════════════════════════════════════════════════════

const comCase2 = {
  title: "Something's Not Right Down There",
  chiefComplaint: "I've had this terrible stomach pain since yesterday. It started around my belly button but now it's really bad on my right side.",
  program: 'COLLEGE_OF_MEDICINE' as const,
  difficulty: 'INTERMEDIATE' as const,
  targetYear: 2,
  organSystems: ['gastrointestinal', 'genitourinary'],
  learningObjectives: [
    'Perform a systematic abdominal examination including special signs',
    'Differentiate between common causes of right lower quadrant pain',
    'Recognize the classic migration pattern of appendicitis pain',
    'Order appropriate imaging and labs for acute abdomen evaluation',
    'Develop a surgical vs. non-surgical management plan',
  ],
  tags: ['abdominal-pain', 'appendicitis', 'acute-abdomen', 'surgical', 'intermediate', 'college-student'],
  patientName: 'Aisha Johnson',
  patientAge: 21,
  patientSex: 'Female',
  patientPronouns: 'she/her',
  personalityNotes:
    "Scared and in visible pain. Trying to be brave but winces with movement. College student worried about missing midterms. Will ask 'Do I need surgery?' early in the encounter. Becomes tearful when discussing pain severity. Very honest and forthcoming with history — no barriers to disclosure. Worried about her parents finding out she's in the ER.",
  historyOfPresentIllness: {
    onset: 'Approximately 18 hours ago, began as vague periumbilical discomfort after dinner',
    precipitants: 'Ate pizza for dinner, initially attributed pain to indigestion. No recent travel or sick contacts.',
    character: "Pain migrated to right lower quadrant over the past 6-8 hours. Now sharp, constant, and worsened by movement. 'It hurts when I walk or cough.'",
    severity: "8/10 — 'It's the worst pain I've ever had'",
    associatedSymptoms: [
      'nausea with one episode of vomiting (non-bloody)',
      'anorexia — has not eaten since last night',
      'low-grade fever noticed this morning',
      'no diarrhea, no constipation',
      'no dysuria, no vaginal discharge',
    ],
    timeline: "Periumbilical pain → 12 hours → migrated to RLQ. Now constant and progressively worsening. Pain aggravated by walking, coughing, and being jostled in the car ride to the ER.",
    narrative: "Aisha is a 21-year-old college student who presents to the ED with 18 hours of abdominal pain. It began as vague periumbilical discomfort after eating pizza, which she initially attributed to indigestion. Over the past 6-8 hours, the pain migrated to the right lower quadrant and has become sharp, constant, and progressively worse. She rates it 8/10, the worst pain she has ever experienced. She has associated nausea with one episode of non-bloody emesis, anorexia, and a low-grade fever. Pain is worsened by movement, walking, and coughing. She denies diarrhea, constipation, dysuria, vaginal discharge, or possibility of pregnancy (last menstrual period was 2 weeks ago, regular cycles). No prior abdominal surgeries. She is otherwise healthy with no significant medical history.",
  },
  pastMedicalHistory: {
    conditions: ['No significant past medical history'],
    surgeries: ['None'],
    hospitalizations: ['None'],
  },
  medications: [
    { name: 'Combined oral contraceptive pill', dose: 'standard', frequency: 'daily', notes: 'Has been on it for 3 years, compliant' },
    { name: 'Ibuprofen', dose: '400mg', frequency: 'PRN', notes: 'Took 2 doses yesterday for pain — minimal relief' },
  ],
  allergies: [{ allergen: 'No known drug allergies', reaction: 'N/A' }],
  socialHistory: {
    smoking: 'Never',
    alcohol: 'Social — 2-3 drinks on weekends with friends',
    drugs: 'Tried marijuana once in high school, denies current use',
    caffeine: '2 coffees daily',
    occupation: 'Junior at University of Kentucky, pre-med biology major',
    livingSituation: 'Lives in off-campus apartment with two roommates',
    relationships: 'Single. Sexually active with one male partner, uses OCP for contraception.',
    support: 'Parents live 2 hours away. Roommate drove her to the ER.',
    education: 'College junior',
    legal: 'None',
    military: 'None',
    exercise: 'Runs 3-4 times per week, unable to exercise today due to pain',
  },
  familyHistory: {
    conditions: [
      { relation: 'Mother', condition: 'Hypertension' },
      { relation: 'Father', condition: 'Type 2 diabetes' },
      { relation: 'Maternal grandmother', condition: 'Colon cancer at age 68' },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Low-grade fever, anorexia, malaise',
    heent: 'Negative',
    cardiovascular: 'Negative',
    respiratory: 'Negative',
    gastrointestinal: 'Abdominal pain (see HPI), nausea, one episode vomiting, anorexia. No diarrhea, no constipation, no melena, no hematochezia.',
    genitourinary: 'LMP 2 weeks ago, regular cycles. No dysuria, no hematuria, no vaginal discharge. Sexually active with contraception.',
    musculoskeletal: 'Negative',
    neurological: 'Negative',
    psychiatric: 'Anxious about current symptoms',
    skin: 'Negative',
    endocrine: 'Negative',
    hematologic: 'Negative',
  },
  physicalExamFindings: {
    'general-appearance': {
      finding: 'Young woman lying still on stretcher, knees slightly drawn up. In moderate distress. Avoids unnecessary movement.',
      interpretation: 'Peritoneal irritation — patients prefer to lie still, as movement worsens pain.',
    },
    'abdominal-inspection': {
      finding: 'Abdomen flat, no distension, no visible masses or scars.',
      interpretation: 'No evidence of obstruction or prior surgery.',
    },
    'abdominal-auscultation': {
      finding: 'Hypoactive bowel sounds.',
      interpretation: 'Decreased bowel sounds suggest peritoneal irritation — ileus from inflammation.',
    },
    'abdominal-palpation': {
      finding: 'Tenderness maximal at McBurney\'s point (RLQ). Voluntary and involuntary guarding in RLQ. No palpable masses. Left lower quadrant non-tender.',
      interpretation: 'Classic McBurney\'s point tenderness with guarding strongly suggests appendicitis.',
    },
    'rovsing-sign': {
      finding: 'Positive — palpation of LLQ elicits pain in RLQ.',
      interpretation: 'Referred rebound tenderness — highly suggestive of appendiceal inflammation with peritoneal irritation.',
    },
    'psoas-sign': {
      finding: 'Positive — pain with extension of right hip.',
      interpretation: 'Suggests retrocecal appendix irritating the psoas muscle.',
    },
    'obturator-sign': {
      finding: 'Negative.',
      interpretation: 'Appendix not in pelvic position.',
    },
    'rebound-tenderness': {
      finding: 'Positive in RLQ.',
      interpretation: 'Peritoneal inflammation confirmed — appendicitis until proven otherwise.',
    },
    'pelvic-exam': {
      finding: 'No cervical motion tenderness. No adnexal masses or tenderness. No vaginal discharge.',
      interpretation: 'Effectively rules out PID, tubo-ovarian abscess, and ectopic pregnancy as primary etiology.',
    },
  },
  vitalSigns: {
    heartRate: 102,
    bloodPressure: '118/72',
    respiratoryRate: 18,
    temperature: 100.8,
    oxygenSaturation: 99,
  },
  defaultNormalFindings: {
    description: 'Within normal limits. No acute abnormalities noted on examination.',
  },
  availableLabs: [
    { name: 'CBC', result: 'WBC 14.8 (neutrophil predominance 82%), Hgb 13.2, Plt 278', normal: 'WBC 4.5-11.0', abnormal: true },
    { name: 'CMP', result: 'All within normal limits. Cr 0.8, glucose 92', normal: 'WNL', abnormal: false },
    { name: 'Urinalysis', result: 'Clear, no WBC, no bacteria, no blood, no nitrites', normal: 'WNL', abnormal: false },
    { name: 'Urine pregnancy test (hCG)', result: 'Negative', normal: 'Negative', abnormal: false },
    { name: 'CRP', result: '6.8 mg/dL', normal: '<0.5 mg/dL', abnormal: true },
    { name: 'Lipase', result: '32 U/L', normal: '10-73 U/L', abnormal: false },
  ],
  availableImaging: [
    { name: 'CT abdomen/pelvis with IV contrast', findings: 'Dilated appendix (11mm diameter) with periappendiceal fat stranding and mild free fluid in RLQ. No appendicolith identified. No evidence of perforation. No other acute intra-abdominal pathology.' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Acute Appendicitis (uncomplicated)',
      supportingFindings: [
        'Classic pain migration from periumbilical to RLQ',
        'McBurney\'s point tenderness with guarding',
        'Positive Rovsing and psoas signs',
        'Low-grade fever',
        'Leukocytosis with left shift',
        'CT showing dilated appendix with fat stranding',
        'Anorexia and nausea (classic triad with fever and RLQ pain)',
      ],
      opposingFindings: ['Young, otherwise healthy patient (but this does not argue against appendicitis)'],
    },
    {
      rank: 2,
      diagnosis: 'Mesenteric Lymphadenitis',
      supportingFindings: [
        'Young patient',
        'RLQ pain',
        'Could have similar presentation',
      ],
      opposingFindings: [
        'CT shows dilated appendix — not just lymph nodes',
        'Pain migration pattern classic for appendicitis',
        'Positive peritoneal signs',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Ruptured Ovarian Cyst',
      supportingFindings: [
        'Young woman with RLQ pain',
        'Acute onset',
      ],
      opposingFindings: [
        'Pain began periumbilically and migrated (not sudden onset pelvic pain)',
        'Negative pelvic exam',
        'CT shows appendiceal pathology, not ovarian',
        'Fever and leukocytosis more consistent with infection',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Ectopic Pregnancy',
      supportingFindings: [
        'Reproductive-age female with abdominal pain',
      ],
      opposingFindings: [
        'Negative urine pregnancy test',
        'On reliable contraception',
        'LMP 2 weeks ago and regular',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'Where exactly did the pain start, and has it moved?', domain: 'gastrointestinal', criticalInfo: 'Pain migration from periumbilical to RLQ is pathognomonic for appendicitis' },
    { question: 'When was your last menstrual period?', domain: 'genitourinary', criticalInfo: 'LMP 2 weeks ago, regular — helps rule out ectopic pregnancy and ovarian torsion timing' },
    { question: 'Is there any chance you could be pregnant?', domain: 'genitourinary', criticalInfo: 'Critical to rule out ectopic pregnancy in any reproductive-age woman with abdominal pain' },
    { question: 'Does the pain get worse when you walk, cough, or hit a bump in the road?', domain: 'gastrointestinal', criticalInfo: 'Movement-exacerbated pain indicates peritoneal irritation' },
    { question: 'Have you been able to eat or drink anything?', domain: 'gastrointestinal', criticalInfo: 'Anorexia is part of the classic appendicitis triad' },
    { question: 'Any vaginal discharge or pain with intercourse recently?', domain: 'genitourinary', criticalInfo: 'Helps differentiate PID from appendicitis' },
  ],
  keyExamManeuvers: [
    { maneuver: 'McBurney\'s point palpation', expectedFinding: 'Maximal tenderness at McBurney\'s point with guarding', significance: 'Classic appendicitis finding — 1/3 distance from ASIS to umbilicus' },
    { maneuver: 'Rovsing sign (LLQ palpation)', expectedFinding: 'Positive — RLQ pain on LLQ palpation', significance: 'Referred rebound — peritoneal irritation in RLQ' },
    { maneuver: 'Psoas sign (hip extension)', expectedFinding: 'Positive — pain with right hip extension', significance: 'Retrocecal appendix position' },
    { maneuver: 'Rebound tenderness test', expectedFinding: 'Positive in RLQ', significance: 'Peritoneal inflammation — surgical abdomen' },
    { maneuver: 'Pelvic examination', expectedFinding: 'No CMT, no adnexal pathology', significance: 'Rules out gynecologic emergency in reproductive-age female' },
  ],
  criticalActions: [
    'Obtain urine pregnancy test before any imaging — mandatory in reproductive-age females',
    'Perform focused abdominal exam with special signs (Rovsing, psoas, obturator, rebound)',
    'Order CT abdomen/pelvis with IV contrast — gold standard for appendicitis (sensitivity >98%)',
    'NPO status — prepare for possible surgery',
    'IV fluid resuscitation and pain management (do NOT withhold analgesia — this is outdated practice)',
    'Surgical consultation for appendectomy (laparoscopic preferred)',
    'Administer IV antibiotics per protocol (cefoxitin or piperacillin-tazobactam) for perioperative coverage',
  ],
  scoringRubric: COM_SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// COM CASE 3: "I Can't Stop Coughing" — ADVANCED, Community-Acquired Pneumonia
// ═══════════════════════════════════════════════════════════════════════════════

const comCase3 = {
  title: "I Can't Stop Coughing",
  chiefComplaint: "This cough has been getting worse for a week. Last night I woke up drenched in sweat and I could barely catch my breath.",
  program: 'COLLEGE_OF_MEDICINE' as const,
  difficulty: 'ADVANCED' as const,
  targetYear: 3,
  organSystems: ['respiratory', 'infectious-disease'],
  learningObjectives: [
    'Evaluate a patient with community-acquired pneumonia using CURB-65 criteria',
    'Perform a comprehensive respiratory examination',
    'Differentiate typical from atypical pneumonia presentations',
    'Develop an evidence-based antibiotic regimen based on severity stratification',
    'Recognize complications and indications for inpatient vs. outpatient management',
  ],
  tags: ['pneumonia', 'CAP', 'respiratory', 'infectious-disease', 'advanced', 'elderly', 'COPD'],
  patientName: 'Eleanor Whitfield',
  patientAge: 71,
  patientSex: 'Female',
  patientPronouns: 'she/her',
  personalityNotes:
    "Independent and dignified but clearly unwell. Minimizes severity — 'I've had worse colds.' Slightly hard of hearing in the left ear; speak clearly. Proud of managing on her own since her husband's death. Will resist hospitalization unless the student explains the reasoning clearly. Becomes cooperative when treated with respect and given autonomy in decisions. Has a dry sense of humor even when ill.",
  historyOfPresentIllness: {
    onset: '7 days ago, started as a dry cough after a cold',
    precipitants: 'Had a "regular cold" 10 days ago (rhinorrhea, sore throat, mild malaise). Thought she was improving, then cough worsened and became productive.',
    character: "Productive cough with rust-colored sputum for 3 days. Pleuritic chest pain on the right side with deep inspiration. Night sweats for 2 nights. 'I haven't felt this bad since I had bronchitis 3 years ago.'",
    severity: "7/10 overall — 'The breathing is what scares me'",
    associatedSymptoms: [
      'productive cough with rust-colored sputum',
      'right-sided pleuritic chest pain',
      'night sweats (drenching, 2 consecutive nights)',
      'subjective fever and chills',
      'dyspnea on minimal exertion (can barely walk to the bathroom)',
      'fatigue and decreased oral intake',
      'mild confusion noted by neighbor (forgot what day it was this morning)',
    ],
    timeline: "URI symptoms 10 days ago → improved days 3-5 → productive cough day 7 → rust-colored sputum + fever + pleuritic pain days 8-10 → night sweats and worsening dyspnea days 9-10 → neighbor brought her to ED today.",
    narrative: "Eleanor is a 71-year-old woman with COPD and a 40-pack-year smoking history who presents with 7 days of progressive cough following an upper respiratory infection. The cough became productive with rust-colored sputum 3 days ago. She has developed right-sided pleuritic chest pain, drenching night sweats, subjective fevers with chills, and progressive dyspnea on minimal exertion. She was found by her neighbor this morning appearing confused and unable to recall the day of the week. She is febrile to 102.4°F, tachycardic, tachypneic, and hypoxic. Her COPD is managed with tiotropium and albuterol; she has not required hospitalization for a COPD exacerbation in 2 years. She lives alone since her husband's death 4 years ago.",
  },
  pastMedicalHistory: {
    conditions: [
      'COPD — GOLD Stage II (diagnosed age 62, FEV1 65% predicted on last PFTs 1 year ago)',
      'Hypertension (well-controlled on amlodipine)',
      'Osteoarthritis (bilateral knees)',
      'Osteoporosis (on calcium + vitamin D)',
      'Influenza vaccination received this season. Pneumococcal vaccine (PCV20) 2 years ago.',
    ],
    surgeries: ['Right knee arthroscopy age 65', 'Cataract surgery age 68'],
    hospitalizations: ['COPD exacerbation 3 years ago (5-day hospitalization, IV steroids and antibiotics)'],
    previousPsychTreatment: 'Grief counseling after husband\'s death, completed 2 years ago.',
  },
  medications: [
    { name: 'Tiotropium (Spiriva)', dose: '18mcg', frequency: 'once daily inhaler', notes: 'COPD maintenance' },
    { name: 'Albuterol (ProAir)', dose: '90mcg', frequency: 'PRN', notes: 'Rescue inhaler — using 4-5 times daily this week (baseline 1-2x/week)' },
    { name: 'Amlodipine', dose: '5mg', frequency: 'daily', notes: 'Hypertension' },
    { name: 'Calcium + Vitamin D', dose: '600mg/400IU', frequency: 'twice daily', notes: 'Osteoporosis' },
    { name: 'Acetaminophen', dose: '500mg', frequency: 'PRN', notes: 'Arthritis pain, has been taking regularly this week for fever' },
  ],
  allergies: [
    { allergen: 'Erythromycin', reaction: 'GI upset — nausea and vomiting (not true allergy, intolerance)' },
  ],
  socialHistory: {
    smoking: 'Former heavy smoker — 40 pack-years (1 pack/day × 40 years). Quit 9 years ago.',
    alcohol: 'Occasional glass of wine with dinner, 2-3 per week',
    drugs: 'Never',
    caffeine: '2 cups of tea daily',
    occupation: 'Retired school librarian (retired age 65)',
    livingSituation: 'Lives alone in a two-story house since husband died 4 years ago. Neighbor checks in daily.',
    relationships: 'Widowed 4 years. Husband died of lung cancer (non-smoker). Two adult children — son in California, daughter in Louisville (2 hours away).',
    support: 'Neighbor Margaret checks daily. Daughter visits biweekly. Church community. Concerned about being a burden.',
    education: 'Master\'s degree in library science',
    legal: 'None',
    military: 'None',
    exercise: 'Walks around the neighborhood daily (usually 20-30 min). Has not been able to walk this week.',
  },
  familyHistory: {
    conditions: [
      { relation: 'Husband (deceased)', condition: 'Lung cancer at age 69' },
      { relation: 'Mother', condition: 'Died at 85 of stroke' },
      { relation: 'Father', condition: 'Died at 78 of CHF' },
    ],
  },
  reviewOfSystems: {
    constitutional: 'Fever, chills, night sweats, fatigue, decreased appetite, unintentional 5-pound weight loss over past week',
    heent: 'Mild left hearing loss (baseline). No sore throat currently.',
    cardiovascular: 'Tachycardia. No chest pain at rest (pain pleuritic only). No edema.',
    respiratory: 'Productive cough (rust-colored sputum), pleuritic right chest pain, dyspnea on minimal exertion, increased rescue inhaler use',
    gastrointestinal: 'Decreased appetite, mild nausea. No vomiting, no diarrhea.',
    genitourinary: 'Negative',
    musculoskeletal: 'Baseline knee pain. New myalgias this week.',
    neurological: 'Mild confusion — forgot day of week. No headache, no focal deficits.',
    psychiatric: 'Anxious about hospitalization. Otherwise baseline mood.',
    skin: 'No rash',
    endocrine: 'Negative',
    hematologic: 'Negative',
  },
  physicalExamFindings: {
    'general-appearance': {
      finding: 'Elderly woman appearing older than stated age, sitting upright and using accessory muscles to breathe. Appears fatigued and mildly confused. Oriented to person and place but unsure of date.',
      interpretation: 'Accessory muscle use indicates significant respiratory distress. Confusion (altered mental status) is a CURB-65 criterion and a marker of severe illness in the elderly.',
    },
    'lung-auscultation': {
      finding: 'Crackles (rales) in the right lower lobe, extending to the right middle lobe. Bronchial breath sounds over the right lower lobe. Egophony positive ("E to A" change) over the right base. Dullness to percussion at the right base. Left lung with scattered expiratory wheezes but no crackles.',
      interpretation: 'Right lower lobe consolidation with possible small effusion. Bronchial breath sounds and egophony are classic signs of consolidation. Left wheezes from COPD baseline.',
    },
    'tactile-fremitus': {
      finding: 'Increased tactile fremitus over right lower lobe compared to left.',
      interpretation: 'Confirms consolidation — sound transmits more efficiently through solid (consolidated) lung than aerated lung.',
    },
    'cardiac-auscultation': {
      finding: 'Tachycardic but regular rhythm. S1/S2 normal. No murmurs or gallops.',
      interpretation: 'Tachycardia is compensatory response to fever, hypoxia, and sepsis.',
    },
    'neck-exam': {
      finding: 'No JVD. No lymphadenopathy. No meningismus.',
      interpretation: 'No right heart failure. No signs of meningitis.',
    },
    'skin-exam': {
      finding: 'Warm, slightly dry mucous membranes. No cyanosis. Mild pallor.',
      interpretation: 'Dehydration from decreased oral intake and fever. No cyanosis despite hypoxia — may be masked.',
    },
    'mental-status': {
      finding: 'Alert but mildly confused. Oriented to person and place. Unable to state today\'s date (says Wednesday; it\'s Friday). Follows commands. Speech coherent but slightly slow.',
      interpretation: 'New-onset confusion in elderly with pneumonia = severe disease marker. CURB-65 score component.',
    },
  },
  vitalSigns: {
    heartRate: 108,
    bloodPressure: '102/58',
    respiratoryRate: 26,
    temperature: 102.4,
    oxygenSaturation: 89,
  },
  defaultNormalFindings: {
    description: 'Within normal limits. No acute abnormalities noted on examination.',
  },
  availableLabs: [
    { name: 'CBC', result: 'WBC 18.4 (89% neutrophils, 3% bands), Hgb 11.8, Plt 312', normal: 'WBC 4.5-11.0', abnormal: true },
    { name: 'BMP', result: 'Na 131, K 3.8, Cl 96, CO2 22, BUN 32, Cr 1.4 (baseline 0.9), Glucose 142', normal: 'Na >135, BUN <20, Cr <1.2', abnormal: true },
    { name: 'Lactate', result: '2.8 mmol/L', normal: '<2.0 mmol/L', abnormal: true },
    { name: 'Procalcitonin', result: '4.2 ng/mL', normal: '<0.1 ng/mL', abnormal: true },
    { name: 'CRP', result: '18.4 mg/dL', normal: '<0.5 mg/dL', abnormal: true },
    { name: 'ABG (on room air)', result: 'pH 7.46, PaCO2 32, PaO2 56, HCO3 22, SaO2 88%', normal: 'PaO2 >80, PaCO2 35-45', abnormal: true },
    { name: 'Blood cultures (×2)', result: 'Pending (drawn before antibiotics)', normal: 'No growth expected', abnormal: false },
    { name: 'Sputum culture + Gram stain', result: 'Gram stain: many PMNs, gram-positive diplococci in pairs. Culture pending.', normal: 'Normal flora', abnormal: true },
    { name: 'Urinalysis', result: 'Concentrated, specific gravity 1.030, otherwise unremarkable', normal: 'Concentrated from dehydration', abnormal: false },
    { name: 'Legionella urinary antigen', result: 'Negative', normal: 'Negative', abnormal: false },
    { name: 'Pneumococcal urinary antigen', result: 'Positive', normal: 'Negative', abnormal: true },
  ],
  availableImaging: [
    { name: 'Chest X-ray (PA and lateral)', findings: 'Dense right lower lobe consolidation with air bronchograms. Small right-sided pleural effusion. Right middle lobe patchy opacity suggesting early involvement. Left lung hyperinflated consistent with COPD. No pneumothorax. Heart size normal.' },
    { name: 'CT chest (if ordered)', findings: 'Confirms right lower lobe consolidation with air bronchograms. 1.5cm right pleural effusion (simple). Patchy right middle lobe ground-glass opacity. Emphysematous changes bilateral upper lobes. No PE on contrast-enhanced study.' },
  ],
  correctDifferentials: [
    {
      rank: 1,
      diagnosis: 'Community-Acquired Pneumonia (Streptococcus pneumoniae) — Severe',
      supportingFindings: [
        'Classic lobar consolidation on CXR with air bronchograms',
        'Gram-positive diplococci on sputum Gram stain',
        'Positive pneumococcal urinary antigen',
        'Rust-colored sputum (classic for pneumococcal pneumonia)',
        'High fever, leukocytosis with left shift, elevated procalcitonin',
        'Pleuritic chest pain',
        'CURB-65 score of 4 (Confusion, Urea >7, Respiratory rate >30, BP <90 systolic, age >65)',
      ],
      opposingFindings: ['Received pneumococcal vaccine (but PCV20 does not prevent all serotypes, and efficacy wanes in elderly/COPD)'],
    },
    {
      rank: 2,
      diagnosis: 'COPD Exacerbation with Superimposed Pneumonia',
      supportingFindings: [
        'Known COPD',
        'Increased rescue inhaler use',
        'Productive cough',
        'Preceded by URI',
      ],
      opposingFindings: [
        'Lobar consolidation more consistent with primary pneumonia than COPD exacerbation',
        'COPD exacerbation alone typically bilateral and diffuse, not focal',
        'Rust-colored sputum and high fever argue for primary infection',
      ],
    },
    {
      rank: 3,
      diagnosis: 'Pulmonary Embolism with Infarction',
      supportingFindings: [
        'Pleuritic chest pain',
        'Tachycardia',
        'Hypoxia',
        'Elderly, relatively immobile this week',
      ],
      opposingFindings: [
        'Consolidation pattern on CXR with air bronchograms (not wedge-shaped infarct)',
        'High-grade fever and elevated procalcitonin argue for infection',
        'Sputum production with gram-positive organisms',
        'CT angiography negative for PE if obtained',
      ],
    },
    {
      rank: 4,
      diagnosis: 'Lung Malignancy with Post-obstructive Pneumonia',
      supportingFindings: [
        'Heavy smoking history (40 pack-years)',
        'Weight loss',
        'Elderly',
      ],
      opposingFindings: [
        'Acute onset following URI — timeline consistent with CAP',
        'No mass visible on imaging',
        'Weight loss explained by acute illness and poor oral intake',
        'Would need follow-up imaging to fully exclude',
      ],
    },
  ],
  keyHistoryQuestions: [
    { question: 'What does your sputum look like? Any blood?', domain: 'respiratory', criticalInfo: 'Rust-colored sputum is classic for pneumococcal pneumonia — guides empiric therapy' },
    { question: 'Have you felt confused or disoriented lately?', domain: 'neurological', criticalInfo: 'New confusion is a CURB-65 severity marker — indicates need for ICU-level care consideration' },
    { question: 'How has your breathing been compared to your normal COPD baseline?', domain: 'respiratory', criticalInfo: 'Establishes that dyspnea is significantly worse than baseline — not just a COPD exacerbation' },
    { question: 'Have you been around anyone who has been sick recently?', domain: 'infectious-disease', criticalInfo: 'Had URI 10 days ago — classic post-viral bacterial pneumonia pattern' },
    { question: 'When was your last pneumonia vaccine?', domain: 'infectious-disease', criticalInfo: 'Received PCV20 2 years ago — waning immunity possible; does not exclude pneumococcal disease' },
    { question: 'How much have you been eating and drinking this week?', domain: 'constitutional', criticalInfo: 'Decreased oral intake — explains dehydration, prerenal AKI, concentrated urine' },
  ],
  keyExamManeuvers: [
    { maneuver: 'Lung auscultation (all fields)', expectedFinding: 'Crackles + bronchial breath sounds right lower lobe, dullness to percussion', significance: 'Defines consolidation location and extent — guides imaging correlation' },
    { maneuver: 'Egophony testing ("E to A" change)', expectedFinding: 'Positive over right lower lobe', significance: 'Classic consolidation sign — sound changes character through solid lung tissue' },
    { maneuver: 'Tactile fremitus (bilateral comparison)', expectedFinding: 'Increased right lower lobe', significance: 'Confirms consolidation; increased vibration through solid tissue' },
    { maneuver: 'Mental status assessment', expectedFinding: 'Confusion — disoriented to time', significance: 'CURB-65 criterion; altered mental status in elderly with infection = high severity' },
    { maneuver: 'Accessory muscle assessment', expectedFinding: 'Using sternocleidomastoid muscles', significance: 'Respiratory distress requiring increased work of breathing' },
  ],
  criticalActions: [
    'Calculate CURB-65 score to stratify severity (this patient scores 4 — ICU admission indicated)',
    'Obtain blood cultures ×2 from separate sites BEFORE starting antibiotics',
    'Start empiric antibiotics within 1 hour: IV ceftriaxone + IV azithromycin (or respiratory fluoroquinolone) for severe CAP',
    'Supplemental oxygen to maintain SpO2 92-96% (caution in COPD — avoid over-oxygenation)',
    'Aggressive IV fluid resuscitation for dehydration and early sepsis (target MAP >65)',
    'Order chest X-ray PA and lateral — confirm consolidation location and check for complications',
    'Obtain sputum culture and Gram stain before antibiotics if possible',
    'Order pneumococcal and Legionella urinary antigens for pathogen identification',
    'Monitor for COPD exacerbation component — consider systemic corticosteroids and nebulized bronchodilators',
    'Arrange follow-up chest X-ray in 6-8 weeks to rule out underlying malignancy (given smoking history)',
  ],
  scoringRubric: COM_SCORING_RUBRIC,
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

const allCases = [case1, case2, case3, case4, case5, case6, comCase1, comCase2, comCase3]

async function main() {
  // Find Katie Thompson (EDUCATOR) as creator
  const katie = await prisma.user.findUnique({
    where: { email: 'katie.thompson@uky.edu' },
  })
  if (!katie) {
    console.error('Demo user katie.thompson@uky.edu not found. Run main seed first.')
    process.exit(1)
  }
  console.log(`Found creator: ${katie.name} (${katie.email})`)

  for (const caseData of allCases) {
    // Delete existing case with this title (idempotent re-run)
    const deleted = await prisma.clinicalCase.deleteMany({
      where: { title: caseData.title },
    })
    if (deleted.count > 0) {
      console.log(`  Deleted existing case: "${caseData.title}"`)
    }

    await prisma.clinicalCase.create({
      data: {
        ...caseData,
        published: true,
        courseId: null,
        creatorId: katie.id,
      },
    })
    console.log(`  Created case: "${caseData.title}" [${caseData.program} / ${caseData.difficulty}]`)
  }

  console.log(`\n✅ Seeded ${allCases.length} Virtual Clinic cases (6 DNP Psychiatry + 3 College of Medicine) successfully!`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
