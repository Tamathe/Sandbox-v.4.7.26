import type { AssignmentTemplateData } from './types'

export const HEALTH_SCIENCES_ASSIGNMENTS: AssignmentTemplateData[] = [
  // ─────────────────────────────────────────────────────────
  // FOUNDATION tier (3) — aiLevel: 'PROHIBIT'
  // ─────────────────────────────────────────────────────────
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Standardized Patient Encounter',
    description:
      'Complete a standardized patient encounter and write a SOAP note within 30 minutes without AI assistance. Include a clinical decision tree documenting what diagnoses you considered, what you ruled out, and your reasoning at each branch point. Clinical faculty will evaluate both the encounter and the note.',
    assignmentType: 'SIMULATION',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Conduct a standardized patient encounter observed by clinical faculty and produce a SOAP note within 30 minutes. No AI tools, electronic references, or outside assistance permitted during the encounter or note-writing period. Submit a clinical decision tree documenting the differentials you considered and your rationale for ruling each in or out. Patient safety demands you perform clinical reasoning, patient communication, and documentation independently before entering supervised rotations.',
    rubricRows: [
      {
        criterion: 'Clinical Reasoning Independence',
        excellent: 'Decision tree shows systematic, evidence-based differential narrowing with clear rationale at each branch; all major diagnoses considered.',
        proficient: 'Decision tree is logical and covers most relevant differentials with adequate reasoning.',
        developing: 'Decision tree is present but missing key differentials or reasoning is superficial at some branch points.',
        insufficient: 'Decision tree is absent, disorganized, or shows no systematic reasoning process.',
      },
      {
        criterion: 'SOAP Note Quality',
        excellent: 'Note is complete, accurate, and well-organized; subjective and objective data clearly support the assessment and plan; uses appropriate medical terminology.',
        proficient: 'Note is complete with minor omissions; assessment and plan are reasonable and supported by documented findings.',
        developing: 'Note is incomplete or contains inaccuracies; assessment does not clearly follow from documented subjective/objective data.',
        insufficient: 'Note is substantially incomplete, disorganized, or contains errors that could lead to clinical misunderstanding.',
      },
      {
        criterion: 'Patient Communication',
        excellent: 'Demonstrates active listening, appropriate empathy, clear explanations, and effective use of open-ended and focused questions.',
        proficient: 'Communication is professional and generally effective; minor missed opportunities for deeper patient engagement.',
        developing: 'Communication is adequate but relies on closed-ended questions or misses important patient cues.',
        insufficient: 'Communication is disorganized, dismissive, or fails to establish rapport; key history elements missed due to poor interviewing.',
      },
      {
        criterion: 'Time Management',
        excellent: 'Encounter and note completed well within the 30-minute window with thorough documentation.',
        proficient: 'Encounter and note completed within the time window with adequate documentation.',
        developing: 'Completed near or slightly past the time limit; documentation shows signs of rushing.',
        insufficient: 'Did not complete the encounter or note within the allotted time; documentation is fragmentary.',
      },
    ],
    implementationNotes:
      'Schedule encounters in your simulation center with trained standardized patients. Ensure the clinical vignette is calibrated to the learner level — early students should receive focused chief complaints while advanced students can handle undifferentiated presentations. Faculty evaluators should use the same rubric to ensure inter-rater consistency.',
    documentationTemplate: null,
    tags: ['clinical', 'patient-safety', 'soap-note', 'simulation', 'assessment'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Closed-Book Pharmacology Calculations',
    description:
      'Calculate dosing for a 72kg patient on warfarin with INR of 3.8, compute a pediatric amoxicillin dose for a 14kg child with otitis media, and determine IV drip rates for a dopamine infusion — all without AI or electronic assistance. Problems span weight-based pediatric dosing, IV drip rate calculations, and multi-drug interaction analysis across 10-15 clinical scenarios.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Complete weight-based dosing, IV drip rate, and drug interaction problems under timed conditions without AI tools or calculators beyond a basic four-function model. Show all work. Minimum passing score is 80%; scores below this threshold require remediation and retesting before clinical placement. Drug dosage calculation errors are a leading cause of preventable patient death — independent calculation ability is non-negotiable for clinical practice.',
    rubricRows: [
      {
        criterion: 'Calculation Accuracy',
        excellent: 'All dosage calculations are correct with appropriate units and unit conversions; no arithmetic errors.',
        proficient: 'Most calculations are correct; minor arithmetic errors that do not result in unsafe dosing.',
        developing: 'Several calculation errors present; at least one error results in a dose outside the safe therapeutic range.',
        insufficient: 'Frequent calculation errors; multiple results would produce unsafe or potentially lethal doses.',
      },
      {
        criterion: 'Drug Interaction Identification',
        excellent: 'Identifies all clinically significant interactions, correctly categorizes severity, and proposes appropriate clinical responses.',
        proficient: 'Identifies major interactions and proposes reasonable clinical responses; may miss one minor interaction.',
        developing: 'Identifies some interactions but misses at least one clinically significant pairing or miscategorizes severity.',
        insufficient: 'Fails to identify major drug interactions that would pose serious risk to patient safety.',
      },
      {
        criterion: 'Work Shown and Clinical Reasoning',
        excellent: 'All work is clearly documented with labeled steps; reasoning demonstrates understanding of pharmacokinetic principles.',
        proficient: 'Work is documented and generally followable; reasoning is sound with minor gaps in pharmacokinetic explanation.',
        developing: 'Work is partially shown; reasoning is difficult to follow or relies on memorized formulas without understanding.',
        insufficient: 'Little or no work shown; answers appear guessed or reasoning is absent.',
      },
    ],
    implementationNotes:
      'Provide a basic four-function calculator only — no scientific or graphing calculators. Include a formulary reference sheet with drug parameters so the exam tests calculation skill rather than memorization. Consider offering the exam in a proctored computer lab with lockdown browser if administering digitally.',
    documentationTemplate: null,
    tags: ['pharmacology', 'patient-safety', 'dosage-calculations', 'exam', 'clinical'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Initial Differential Diagnosis',
    description:
      'Generate a differential for a 45-year-old female presenting with acute epigastric pain, nausea, and elevated lipase — in class, without references or AI tools. Prioritize diagnoses by likelihood and severity, cite supporting and opposing evidence from the vignette, and identify the next diagnostic steps you would order.',
    assignmentType: 'EXAM',
    aiTier: 'FOUNDATION',
    aiLevel: 'PROHIBIT',
    syllabusLanguage:
      'Receive a clinical vignette and generate a prioritized differential diagnosis without AI tools, textbooks, or electronic references. For each diagnosis, identify supporting and opposing evidence from the vignette and indicate what additional workup would distinguish between possibilities. No AI or electronic assistance of any kind is permitted. In emergent practice, you must generate a working differential before consulting decision support tools — patient safety depends on this independent skill.',
    rubricRows: [
      {
        criterion: 'Differential Breadth and Prioritization',
        excellent: 'Differential includes all high-probability and must-not-miss diagnoses, appropriately prioritized by likelihood and severity.',
        proficient: 'Differential includes most relevant diagnoses with reasonable prioritization; may miss one less common but important diagnosis.',
        developing: 'Differential is narrow or poorly prioritized; misses one or more important diagnoses or includes many implausible options.',
        insufficient: 'Differential is absent, contains only one diagnosis, or shows no prioritization logic.',
      },
      {
        criterion: 'Evidence-Based Reasoning',
        excellent: 'Each diagnosis is supported by specific evidence from the vignette; opposing evidence is acknowledged and addressed.',
        proficient: 'Most diagnoses are supported by vignette evidence; opposing evidence is partially addressed.',
        developing: 'Some diagnoses lack supporting evidence or reasoning is generic rather than tied to the specific case.',
        insufficient: 'Diagnoses are listed without supporting evidence or reasoning from the vignette.',
      },
      {
        criterion: 'Diagnostic Workup Planning',
        excellent: 'Proposed workup is targeted, cost-conscious, and logically sequenced to distinguish between top differentials.',
        proficient: 'Proposed workup is reasonable and would help narrow the differential; minor inefficiencies in sequencing.',
        developing: 'Workup is overly broad (shotgun approach) or misses key tests that would distinguish between top diagnoses.',
        insufficient: 'No workup proposed or suggested tests are inappropriate for the clinical scenario.',
      },
    ],
    implementationNotes:
      'Use clinical vignettes appropriate to the learner level — pre-clinical students should receive classic presentations while clinical students can handle atypical or multi-system cases. Allot 20-30 minutes depending on vignette complexity. This assessment pairs well with later AI-assisted refinement assignments to demonstrate growth.',
    documentationTemplate: null,
    tags: ['clinical-reasoning', 'differential-diagnosis', 'exam', 'patient-safety'],
  },

  // ─────────────────────────────────────────────────────────
  // AWARENESS tier (3) — aiLevel: 'CAUTIOUS'
  // ─────────────────────────────────────────────────────────
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Evidence Appraisal with AI Comparison',
    description:
      'Conduct a literature search independently to find 5 relevant studies, then prompt an AI tool to find 5 studies on the same clinical question. Compare the two sets: evaluate which studies the AI missed or hallucinated, which you would exclude and why, and assess the quality of AI-generated summaries against your own critical appraisals.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Find 5 studies yourself using PubMed, CINAHL, or Cochrane Library, then prompt an AI tool to find 5 on the same clinical question. Verify every AI citation for existence and accuracy. Submit your search strategy, critical appraisals, the AI results with verification status, and a comparative analysis of coverage gaps and hallucinated references. Document all AI prompts verbatim. AI citation hallucination is well-documented — a fabricated reference in a clinical recommendation can propagate harm.',
    rubricRows: [
      {
        criterion: 'Independent Literature Search Quality',
        excellent: 'Search strategy is systematic and reproducible; selected studies are highly relevant, recent, and represent the strongest available evidence (e.g., RCTs, systematic reviews where available).',
        proficient: 'Search strategy is documented and reasonable; selected studies are relevant with mostly strong evidence levels.',
        developing: 'Search strategy is vague; some selected studies are marginally relevant or lower evidence quality than what is available.',
        insufficient: 'No documented search strategy; studies are irrelevant, outdated, or inappropriately selected.',
      },
      {
        criterion: 'AI Output Verification Against Evidence',
        excellent: 'Every AI-provided citation verified for existence and accuracy; hallucinated references identified and documented; AI summaries fact-checked against original sources with specific discrepancies noted.',
        proficient: 'Most AI citations verified; hallucinated references identified; AI summaries compared to originals with general accuracy assessment.',
        developing: 'Some AI citations verified but verification is incomplete; hallucinated references not clearly identified; summary comparison is superficial.',
        insufficient: 'AI output accepted without verification; no attempt to check citations or identify hallucinated references.',
      },
      {
        criterion: 'Comparative Analysis Depth',
        excellent: 'Comparison identifies specific strengths and weaknesses of both approaches; draws actionable conclusions about when AI-assisted search adds value and when it introduces risk.',
        proficient: 'Comparison identifies key differences between AI and manual search results with reasonable conclusions.',
        developing: 'Comparison is present but superficial; conclusions are generic rather than specific to the clinical question.',
        insufficient: 'No meaningful comparison; AI and manual results presented side-by-side without analysis.',
      },
      {
        criterion: 'Documentation of AI Use',
        excellent: 'All prompts recorded verbatim; AI tool and version identified; iterative prompt refinements documented with rationale.',
        proficient: 'Prompts recorded and AI tool identified; documentation is complete but lacks detail on prompt iteration.',
        developing: 'Partial prompt documentation; AI tool not clearly identified; gaps in the audit trail.',
        insufficient: 'No documentation of AI prompts or tool used.',
      },
    ],
    implementationNotes:
      'Recommend students use a specific AI tool (e.g., ChatGPT, Perplexity) so you can calibrate expectations for hallucination rates. Emphasize that AI citation hallucination is well-documented and that verification is a non-negotiable clinical practice. Consider pairing this with a library session on systematic search methodology.',
    documentationTemplate:
      '## AI Usage Documentation — Evidence Appraisal\n\n**Clinical Question:**\n\n**AI Tool Used:** [Name and version]\n\n**Search Prompts (verbatim):**\n1. \n2. \n\n**AI-Provided Citations:**\n| # | Citation | Verified? | Exists? | Accurate Summary? | Notes |\n|---|----------|-----------|---------|-------------------|-------|\n| 1 | | | | | |\n\n**Hallucinated or Inaccurate References:**\n\n**Key Differences Between AI and Manual Search:**\n\n**Clinical Implications of Differences:**\n\n**Clinical Decision Affected:** What treatment or diagnostic decision hinges on this evidence? ___\n**Verification Source:** [Database, search date, MeSH terms] ___\n**Patient Safety Check:** If the hallucinated reference had been the sole basis for a clinical decision, what could have gone wrong? ___',
    tags: ['evidence-appraisal', 'literature-review', 'ai-verification', 'citation-hallucination', 'clinical-research'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Clinical Guideline Summary',
    description:
      'Summarize AHA and ESC guidelines for managing new-onset atrial fibrillation, including CHA2DS2-VASc scoring, anticoagulation thresholds, and rate-vs-rhythm control criteria. Use AI to locate and organize guideline documents, but write the clinical synthesis, population-specific application notes (pediatric, geriatric, pregnant), and practice implications yourself.',
    assignmentType: 'ESSAY',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Summarize current practice guidelines from at least two authoritative sources (e.g., AHA, IDSA, ACOG, AAP) for a condition relevant to your clinical focus. AI may help locate and organize guideline documents; all clinical synthesis, population-specific application, and practice implications must be your own writing. Document every AI interaction with exact prompts. Misapplying outdated or misunderstood guidelines directly endangers patients — this assignment builds the interpretive skill that evidence-based practice demands.',
    rubricRows: [
      {
        criterion: 'Guideline Accuracy and Currency',
        excellent: 'Guidelines cited are from authoritative sources, represent the most current versions, and recommendation grades/evidence levels are correctly reported.',
        proficient: 'Guidelines are from appropriate sources and mostly current; evidence levels are generally correct.',
        developing: 'Some guidelines cited are outdated or from non-authoritative sources; evidence levels are sometimes misreported.',
        insufficient: 'Guidelines are outdated, from inappropriate sources, or evidence levels are consistently incorrect.',
      },
      {
        criterion: 'Clinical Synthesis and Application',
        excellent: 'Synthesis demonstrates deep understanding of how guidelines translate to bedside practice; population-specific considerations are thorough and clinically nuanced.',
        proficient: 'Synthesis shows solid understanding of clinical application; population considerations are addressed adequately.',
        developing: 'Synthesis is largely a restatement of guideline text without clinical application; population considerations are superficial.',
        insufficient: 'No synthesis beyond copying guideline text; no population-specific considerations.',
      },
      {
        criterion: 'Distinction Between AI-Assisted and Original Content',
        excellent: 'Clear delineation between AI-located content and original synthesis; original analysis demonstrates clinical reasoning that AI could not replicate.',
        proficient: 'AI-assisted portions are identified; original content is distinguishable and adds clinical value.',
        developing: 'Boundaries between AI-assisted and original content are unclear; original synthesis is minimal.',
        insufficient: 'No distinction made; submission appears to be primarily AI-generated without original clinical analysis.',
      },
    ],
    implementationNotes:
      'Provide a list of acceptable authoritative guideline sources for your discipline. This assignment works well early in a clinical rotation to ensure students can navigate guideline literature before making patient care decisions. Pair with an in-class discussion where students present conflicting guidelines for the same condition.',
    documentationTemplate:
      '## AI Usage Documentation — Clinical Guideline Summary\n\n**Condition:**\n\n**AI Tool Used:** [Name and version]\n\n**How AI Was Used:**\n- [ ] Locating guideline documents\n- [ ] Organizing guideline structure\n- [ ] Other: ___\n\n**AI Prompts Used:**\n1. \n\n**What AI Provided vs. What I Wrote:**\n| Section | AI-Assisted? | What AI Provided | What I Added/Changed |\n|---------|-------------|-----------------|---------------------|\n| | | | |\n\n**Clinical Decision Affected:** ___\n**Verification Source:** [Guideline document, edition, page/section]\n**Patient Safety Check:** Would acting on the AI-located guideline without my synthesis endanger any patient population? ___\n\n**Guideline Sources Verified Independently:** [Yes/No, how]',
    tags: ['evidence-based', 'clinical-guidelines', 'synthesis', 'patient-populations'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Drug Interaction Reference Check',
    description:
      'Use AI as a reference tool for drug interaction checking during a multi-drug case analysis. Verify every AI-generated interaction against authoritative pharmacology references (Lexicomp, Micromedex, FDA labeling). Document all discrepancies between AI outputs and verified references.',
    assignmentType: 'LAB',
    aiTier: 'AWARENESS',
    aiLevel: 'CAUTIOUS',
    syllabusLanguage:
      'Analyze a complex medication regimen (8-12 drugs) using an AI tool as your initial interaction reference, then verify every result against Lexicomp, Micromedex, or FDA-approved labeling. Submit the AI interaction list, your verification results, interactions the AI missed, and a clinical significance assessment with management recommendations. Document all AI prompts verbatim. An unverified AI drug interaction report that reaches a patient chart can kill — verification is non-negotiable clinical practice.',
    rubricRows: [
      {
        criterion: 'Verification Thoroughness',
        excellent: 'Every AI-identified interaction verified against at least one authoritative source; additional interactions not identified by AI are found through independent database searches.',
        proficient: 'Most AI-identified interactions verified; at least one independent database search conducted to check for missed interactions.',
        developing: 'Some interactions verified but verification is incomplete; no independent search for missed interactions.',
        insufficient: 'AI output accepted without systematic verification against authoritative sources.',
      },
      {
        criterion: 'Discrepancy Documentation',
        excellent: 'All discrepancies between AI and authoritative sources are clearly documented with specific details about what differed (severity, mechanism, management) and which source is more reliable.',
        proficient: 'Most discrepancies documented with reasonable explanation of differences.',
        developing: 'Some discrepancies noted but documentation lacks specificity about what differed or why.',
        insufficient: 'No discrepancies documented or claim of zero discrepancies without evidence of checking.',
      },
      {
        criterion: 'Clinical Significance Assessment',
        excellent: 'Each verified interaction assessed for clinical significance with specific management recommendations appropriate to the patient case (dose adjustment, monitoring parameters, timing changes).',
        proficient: 'Clinical significance assessed for most interactions with reasonable management recommendations.',
        developing: 'Clinical significance mentioned but management recommendations are generic rather than patient-specific.',
        insufficient: 'No clinical significance assessment or management recommendations provided.',
      },
      {
        criterion: 'Patient Safety Awareness',
        excellent: 'Identifies which AI errors could have caused patient harm; articulates a clear workflow for using AI drug references safely in clinical practice.',
        proficient: 'Recognizes potential patient safety implications of AI errors; describes a general approach to safe AI use.',
        developing: 'Acknowledges AI can be wrong but does not connect errors to specific patient safety risks.',
        insufficient: 'No awareness of patient safety implications of relying on unverified AI drug interaction data.',
      },
    ],
    implementationNotes:
      'Design the medication regimen to include at least 2-3 interactions that current AI tools commonly miss or mischaracterize (e.g., pharmacokinetic interactions via CYP450 pathways, QT prolongation combinations). Ensure students have access to Lexicomp or Micromedex through your institutional library. This works well as a 2-hour lab session.',
    documentationTemplate:
      '## AI Usage Documentation — Drug Interaction Reference Check\n\n**AI Tool Used:** [Name and version]\n**Authoritative Sources Used:** [Lexicomp / Micromedex / FDA labeling / other]\n\n**Patient Case Summary:** [Brief demographics, condition, medication list]\n\n**AI-Identified Interactions:**\n| # | Drug Pair | AI Severity | AI Mechanism | Verified? | Authoritative Severity | Discrepancy? |\n|---|-----------|-------------|-------------|-----------|----------------------|-------------|\n| 1 | | | | | | |\n\n**Interactions AI Missed:**\n| # | Drug Pair | Source | Severity | Why AI May Have Missed It |\n|---|-----------|--------|----------|-------------------------|\n| 1 | | | | |\n\n**Patient Safety Reflection:**\nIf I had relied solely on the AI output, what could have happened to this patient?\n\n**Clinical Decision Affected:** Which prescribing decision depends on this interaction data? ___\n**Verification Source:** [Lexicomp/Micromedex entry, access date] ___\n**Patient Safety Check:** Which AI-missed interaction posed the greatest harm risk, and why? ___',
    tags: ['pharmacology', 'drug-interactions', 'ai-verification', 'patient-safety', 'lab'],
  },

  // ─────────────────────────────────────────────────────────
  // PARTNERSHIP tier (3) — aiLevel: 'GUIDED'
  // ─────────────────────────────────────────────────────────
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Clinical Reasoning Portfolio',
    description:
      'Build a multi-checkpoint case portfolio: start with an in-class differential diagnosis, then refine your assessment as history and lab results are revealed across weeks. AI may be used for drug interaction checks only — all clinical reasoning must be documented as your own work.',
    assignmentType: 'PORTFOLIO',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Follow a single evolving patient case through three checkpoints: (1) in-class differential without AI, (2) refined assessment as history and labs are revealed — AI permitted only for drug interaction verification, (3) final comprehensive assessment with treatment plan. Document your clinical reasoning at each stage. AI may verify drug interactions and dosing at Checkpoints 2-3; all diagnostic reasoning and treatment decisions must be your own documented work. This staged approach mirrors real clinical timelines where diagnoses evolve as data accumulates.',
    rubricRows: [
      {
        criterion: 'Clinical Reasoning Progression',
        excellent: 'Clear, documented evolution of thinking across all three checkpoints; new data explicitly connected to changes in differential; reasoning is internally consistent and clinically sound.',
        proficient: 'Reasoning progresses logically across checkpoints; most changes in thinking are explained and connected to new data.',
        developing: 'Some progression evident but reasoning gaps between checkpoints; changes in differential not always explained.',
        insufficient: 'No clear progression; final assessment appears disconnected from earlier checkpoints.',
      },
      {
        criterion: 'AI Use Within Permitted Boundaries',
        excellent: 'AI used only for drug interaction checks as specified; all AI queries documented; clinical reasoning clearly distinguished from AI-assisted verification.',
        proficient: 'AI use is within permitted scope and documented; distinction between AI-assisted and independent work is clear.',
        developing: 'AI may have been used beyond permitted scope or documentation is insufficient to confirm appropriate use.',
        insufficient: 'Evidence of AI use for clinical reasoning (not just drug checks) or no documentation of AI use.',
      },
      {
        criterion: 'Treatment Plan Quality',
        excellent: 'Treatment plan is comprehensive, evidence-based, and addresses the specific patient context (comorbidities, contraindications, patient preferences); drug interactions verified via AI are documented.',
        proficient: 'Treatment plan is appropriate and mostly evidence-based; major patient-specific factors addressed.',
        developing: 'Treatment plan is generic or does not adequately address patient-specific factors.',
        insufficient: 'Treatment plan is inappropriate, dangerous, or absent.',
      },
      {
        criterion: 'Evidence Hierarchy Awareness',
        excellent: 'Cites evidence at appropriate levels (RCTs, systematic reviews, guidelines) for each clinical decision; explicitly distinguishes strong from weak evidence and acknowledges when evidence is absent.',
        proficient: 'Cites relevant evidence for most decisions; generally distinguishes evidence quality levels.',
        developing: 'Evidence citations present but rely heavily on low-level sources (case reports, expert opinion) when stronger evidence exists.',
        insufficient: 'Clinical decisions lack evidence citations or cite inappropriate sources (e.g., AI output as primary evidence).',
      },
    ],
    implementationNotes:
      'Release case information in stages (e.g., weekly) to simulate the real clinical timeline. Checkpoint 1 works well as an in-class exercise. Consider using a standardized patient case from your simulation center so the case could optionally culminate in a live encounter. Grade each checkpoint formatively before the final submission.',
    documentationTemplate:
      '## AI Usage Documentation — Clinical Reasoning Portfolio\n\n### Checkpoint 1 (In-Class Differential)\n**AI Used:** None (in-class, no devices)\n**Date:**\n\n### Checkpoint 2 (Refined Assessment)\n**AI Tool Used:** [Name and version]\n**AI Used For:** Drug interaction check only\n**Drug Pairs Checked:**\n| Drug Pair | AI Result | Verified Against | Action Taken |\n|-----------|-----------|-----------------|-------------|\n| | | | |\n\n**All clinical reasoning in this checkpoint is my own work:** [ ] Confirmed\n\n### Checkpoint 3 (Final Assessment + Treatment Plan)\n**AI Tool Used:** [Name and version]\n**AI Used For:** Drug interaction and dosing verification only\n**Queries Made:**\n1. \n\n**Clinical decisions that differ from or go beyond AI suggestions:**\n\n**Clinical Decision Affected:** ___\n**Verification Source:** ___\n**Patient Safety Check:** Could acting on AI interaction data without independent verification have harmed this patient? ___',
    tags: ['clinical-reasoning', 'portfolio', 'patient-safety', 'longitudinal', 'differential-diagnosis'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Patient Education Material Design',
    description:
      'Create a patient education handout on Type 2 diabetes self-management for a Spanish-speaking elderly population. Use AI to draft initial content, then revise to a 6th-grade reading level using Flesch-Kincaid scoring, adapt for cultural health beliefs, and verify all clinical content against ADA Standards of Care. Submit the AI draft, your tracked-changes revision, and a rationale document explaining every edit.',
    assignmentType: 'PROJECT',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Use AI to draft patient education materials, then revise to a 6th-grade reading level, ensure cultural sensitivity for your assigned population, and verify clinical accuracy against current guidelines. Submit the AI draft, tracked-changes revision, rationale document, and before/after readability scores. Document all AI prompts. AI-generated health content frequently contains inaccuracies and inaccessible language — a patient who misunderstands discharge instructions may die at home.',
    rubricRows: [
      {
        criterion: 'Health Literacy Optimization',
        excellent: 'Final materials meet 6th-grade reading level; medical jargon eliminated or clearly defined; layout uses white space, headers, and visuals effectively; readability improved significantly from AI draft.',
        proficient: 'Final materials are at or near target reading level; most jargon addressed; layout is accessible.',
        developing: 'Reading level exceeds target; some jargon remains unexplained; layout could be more accessible.',
        insufficient: 'Materials are written at a professional level inappropriate for patients; no readability assessment conducted.',
      },
      {
        criterion: 'Clinical Accuracy',
        excellent: 'All health information verified against current guidelines; no inaccuracies; AI errors identified and corrected with citations.',
        proficient: 'Health information is generally accurate; most AI errors caught and corrected.',
        developing: 'Some inaccuracies remain in the final version; AI errors partially addressed.',
        insufficient: 'Final materials contain clinically inaccurate information that could harm patients.',
      },
      {
        criterion: 'Cultural Sensitivity',
        excellent: 'Materials are thoughtfully adapted for the specified population; considers health beliefs, language preferences, visual representation, and potential barriers to care.',
        proficient: 'Materials show awareness of cultural considerations with reasonable adaptations.',
        developing: 'Cultural considerations are mentioned but superficially addressed.',
        insufficient: 'No cultural adaptation; materials may contain culturally insensitive content.',
      },
      {
        criterion: 'Revision Documentation',
        excellent: 'Every change from AI draft to final version is documented with clear clinical, literacy, or cultural rationale; demonstrates critical evaluation of AI-generated health content.',
        proficient: 'Most changes are documented with rationale; demonstrates awareness of AI limitations in health content.',
        developing: 'Some changes documented but rationale is thin or missing for key revisions.',
        insufficient: 'Minimal documentation of changes; AI draft and final version are nearly identical.',
      },
    ],
    implementationNotes:
      'Require students to use a validated readability tool (Flesch-Kincaid, SMOG, or SAM) for before/after comparison. Assign specific patient populations to ensure cultural sensitivity work is concrete rather than abstract. Consider having patient advisors or community health workers review the final materials as part of the evaluation.',
    documentationTemplate:
      '## AI Usage Documentation — Patient Education Material Design\n\n**Condition:**\n**Target Patient Population:**\n**AI Tool Used:** [Name and version]\n\n**AI Draft Generation:**\n- Prompt used: \n- Number of iterations to get usable draft: \n\n**Readability Scores:**\n| Metric | AI Draft | Final Version |\n|--------|----------|---------------|\n| Flesch-Kincaid Grade | | |\n| SMOG Index | | |\n\n**Revision Log:**\n| Section | AI Original | My Revision | Rationale (clinical/literacy/cultural) |\n|---------|------------|-------------|---------------------------------------|\n| | | | |\n\n**Clinical Accuracy Checks:**\n| AI Claim | Verified Against | Accurate? | Correction Made |\n|----------|-----------------|-----------|----------------|\n| | | | |\n\n**Cultural Adaptations Made:**\n\n**Clinical Decision Affected:** What self-management behavior does this material teach? ___\n**Verification Source:** [Guideline, edition, section] ___\n**Patient Safety Check:** If a patient followed the AI draft without my revisions, what could go wrong? ___',
    tags: ['patient-education', 'health-literacy', 'cultural-sensitivity', 'clinical-accuracy', 'readability'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Interprofessional Case Conference Prep',
    description:
      'Prepare for a case conference on a post-surgical sepsis patient involving medicine, nursing, pharmacy, and physical therapy. Use AI to research scope of practice, typical interventions, and evidence base for the professions outside your training. Verify AI claims against professional scope-of-practice documents, then present your discipline\'s contribution with evidence-based recommendations and specific handoff points.',
    assignmentType: 'CASE_STUDY',
    aiTier: 'PARTNERSHIP',
    aiLevel: 'GUIDED',
    syllabusLanguage:
      'Prepare for a simulated interprofessional case conference involving at least three health professions. Use AI to research scope of practice and evidence base for the other professions; verify all AI claims against authoritative scope-of-practice documents before presenting. Submit a written prep document, AI research notes with verification results, and presentation materials. Document all AI prompts verbatim. AI frequently misrepresents professional scope boundaries — acting on incorrect scope information in a care team directly threatens patient safety.',
    rubricRows: [
      {
        criterion: 'Interprofessional Knowledge',
        excellent: 'Demonstrates accurate, nuanced understanding of other professions\' roles, scope, and evidence base; AI-gathered information verified against professional scope-of-practice documents.',
        proficient: 'Shows solid understanding of other professions\' roles with mostly accurate information; key facts verified.',
        developing: 'Understanding of other professions is superficial or contains inaccuracies from unverified AI output.',
        insufficient: 'Little evidence of understanding other professions\' roles; AI information accepted uncritically.',
      },
      {
        criterion: 'Discipline-Specific Contribution',
        excellent: 'Clearly articulates own profession\'s unique contribution to the case; recommendations are evidence-based and specifically tailored to the patient scenario.',
        proficient: 'Own profession\'s contribution is well-described with appropriate evidence.',
        developing: 'Own profession\'s contribution is described generically rather than tailored to the specific case.',
        insufficient: 'Own profession\'s contribution is vague or absent.',
      },
      {
        criterion: 'Collaborative Care Plan Integration',
        excellent: 'Identifies specific points of collaboration, potential conflicts, and handoff moments between professions; proposes practical coordination strategies.',
        proficient: 'Identifies key collaboration points and potential overlaps between professions.',
        developing: 'Mentions collaboration generally but does not identify specific integration points.',
        insufficient: 'Presents own profession\'s plan in isolation without reference to interprofessional coordination.',
      },
      {
        criterion: 'Documentation of AI Use in Clinical Context',
        excellent: 'All AI use documented with prompts; information about other professions verified against authoritative sources; clear distinction between AI-gathered and personally known information.',
        proficient: 'AI use documented; most cross-professional information verified; sources noted.',
        developing: 'AI use partially documented; verification of cross-professional claims is inconsistent.',
        insufficient: 'No AI usage documentation or no verification of AI-provided professional scope information.',
      },
    ],
    implementationNotes:
      'Coordinate with faculty from other health professions programs if possible to create authentic interprofessional groups. If cross-program coordination is not feasible, students can present their own profession\'s perspective and submit the interprofessional research as a written document. Provide authoritative scope-of-practice references for verification.',
    documentationTemplate:
      '## AI Usage Documentation — Interprofessional Case Conference Prep\n\n**Case Summary:**\n**My Profession:**\n**Other Professions in the Case:**\n\n**AI Tool Used:** [Name and version]\n\n**AI Research on Other Professions:**\n| Profession | AI-Provided Information | Verified Against | Accurate? | Corrections |\n|-----------|------------------------|-----------------|-----------|------------|\n| | | | | |\n\n**My Discipline-Specific Contribution (original, not AI-generated):**\n\n**Collaboration Points Identified:**\n| My Action | Overlaps With | Coordination Needed |\n|-----------|--------------|--------------------|\n| | | |\n\n**What AI Helped Me Learn vs. What I Already Knew:**\n\n**Clinical Decision Affected:** What care plan element depends on cross-professional knowledge? ___\n**Verification Source:** [Scope-of-practice document, professional body] ___\n**Patient Safety Check:** If AI misrepresented another profession\'s scope, what handoff could fail? ___',
    tags: ['interprofessional', 'case-study', 'scope-of-practice', 'care-coordination', 'patient-safety', 'clinical'],
  },

  // ─────────────────────────────────────────────────────────
  // FLUENCY tier (2) — aiLevel: 'REQUIRE'
  // ─────────────────────────────────────────────────────────
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'AI-Assisted Clinical Decision Support Evaluation',
    description:
      'Run a 70-year-old patient with CHF, CKD Stage 3, Type 2 diabetes, and new-onset atrial fibrillation through an AI clinical decision support tool. For each AI recommendation — diagnostic, therapeutic, monitoring — document whether you accept, modify, or reject it, cite your evidence, and identify patient-specific factors the AI missed (e.g., creatinine clearance contraindicating a suggested anticoagulant dose).',
    assignmentType: 'PROJECT',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Use an AI clinical decision support tool on the provided multi-comorbidity case. For each AI recommendation, document the suggestion, your accept/modify/reject decision with evidence, and patient-specific factors the AI missed. Write a 1,000-word reflection on AI in clinical practice addressing automation bias, clinician-AI disagreement resolution, and patient consent. Document every AI query verbatim with full outputs. Automation bias — uncritically accepting AI recommendations — is an emerging patient safety threat; this assignment builds the critical evaluation habit that safe AI-augmented practice requires.',
    rubricRows: [
      {
        criterion: 'Critical Evaluation of AI Recommendations',
        excellent: 'Every AI recommendation is evaluated with specific clinical reasoning; accepts, modifications, and rejections are all evidence-based and patient-specific; identifies subtle factors AI missed.',
        proficient: 'Most recommendations evaluated with clear reasoning; decisions are generally evidence-based.',
        developing: 'Some recommendations evaluated but reasoning is thin; tendency to accept or reject AI suggestions without adequate justification.',
        insufficient: 'AI recommendations accepted or rejected wholesale without individual evaluation.',
      },
      {
        criterion: 'Evidence Basis for Clinical Decisions',
        excellent: 'Each clinical decision cites specific, current evidence (guidelines, trials, pharmacokinetic data); where evidence conflicts with AI suggestion, the conflict is explicitly analyzed.',
        proficient: 'Most decisions cite appropriate evidence; some conflicts with AI are addressed.',
        developing: 'Evidence citations are sparse or generic; AI-evidence conflicts not addressed.',
        insufficient: 'No evidence cited for clinical decisions; reasoning is opinion-based.',
      },
      {
        criterion: 'Patient Safety Reasoning',
        excellent: 'Identifies specific AI safety risks in this case (automation bias, missed contraindications, data bias); proposes concrete safeguards; articulates how each rejected AI recommendation could have harmed the patient.',
        proficient: 'Addresses major AI safety risks with case-specific examples; proposes reasonable safeguards.',
        developing: 'Mentions AI safety risks generically without connecting to specific recommendations in this case.',
        insufficient: 'No patient safety analysis; treats AI recommendations as infallible or uniformly dangerous.',
      },
      {
        criterion: 'Clinical Judgment Independence',
        excellent: 'Demonstrates clear personal clinical framework for when to trust, modify, or override AI; considers ethical dimensions (equity, consent, liability); each accept/reject decision shows independent reasoning rather than deference.',
        proficient: 'Shows independent reasoning on most decisions; addresses ethical dimensions of AI-assisted care.',
        developing: 'Tends to accept or reject AI suggestions as a block rather than evaluating each independently; ethical analysis is superficial.',
        insufficient: 'Defers to AI wholesale or rejects wholesale without case-specific reasoning.',
      },
      {
        criterion: 'Documentation Completeness',
        excellent: 'All AI interactions documented with exact queries and outputs; decision audit trail is complete and would withstand clinical review.',
        proficient: 'AI interactions well-documented; audit trail is mostly complete.',
        developing: 'Documentation has gaps; audit trail would be insufficient for clinical review.',
        insufficient: 'Little or no documentation of AI interactions.',
      },
    ],
    implementationNotes:
      'Provide a standardized complex case (e.g., 70-year-old with CHF, CKD, diabetes, and new-onset atrial fibrillation) to ensure comparability across students. If your institution has access to a clinical decision support tool (e.g., UpToDate, DynaMed, IBM Watson), use it; otherwise, a general-purpose AI with medical prompting is acceptable. Consider inviting a clinical informaticist to co-evaluate the reflections.',
    documentationTemplate:
      '## AI Usage Documentation — Clinical Decision Support Evaluation\n\n**Patient Case ID:**\n**AI Tool Used:** [Name and version]\n\n**AI Recommendation Log:**\n| # | AI Recommendation | Category (Dx/Tx/Monitoring) | My Decision (Accept/Modify/Reject) | My Reasoning | Evidence Cited | Patient-Specific Factors AI Missed |\n|---|------------------|----------------------------|-----------------------------------|-------------|---------------|-----------------------------------|\n| 1 | | | | | | |\n\n**Summary Statistics:**\n- Recommendations accepted as-is: ___\n- Recommendations modified: ___\n- Recommendations rejected: ___\n\n**Most Significant AI-Clinician Disagreement:**\n- AI suggested:\n- I decided:\n- Evidence supporting my decision:\n- What I learned from the disagreement:\n\n**Patient Safety Concerns Identified:**\n1. \n\n**Reflection Prompt Responses:**\n- When does AI add value in this case?\n- When does AI introduce risk?\n- How would I explain my use of AI to this patient?\n\n**Clinical Decision Affected:** Which treatment decision changed based on AI input? ___\n**Verification Source:** [Guideline, trial, pharmacokinetic data] ___\n**Patient Safety Check:** If I had followed the AI recommendation I rejected, what would have happened to this patient? ___',
    tags: ['clinical-decision-support', 'patient-safety', 'evidence-based', 'ai-evaluation', 'reflection'],
  },
  {
    disciplineFamily: 'HEALTH_SCIENCES',
    title: 'Public Health Intervention Design with AI',
    description:
      'Design an opioid overdose prevention intervention for a rural Kentucky county using AI across four domains: epidemiological trend analysis (CDC WONDER, County Health Rankings), intervention design, Narcan distribution messaging strategy, and outcome prediction. Present in 15 minutes with a critical analysis of where AI added value versus where community context and health equity judgment were essential.',
    assignmentType: 'PRESENTATION',
    aiTier: 'FLUENCY',
    aiLevel: 'REQUIRE',
    syllabusLanguage:
      'Design a community health intervention for a real Kentucky public health challenge, using AI across four domains: epidemiological analysis, intervention design, communication strategy, and outcome prediction. For each domain, document what AI contributed and what you modified or overrode with rationale. Your 15-minute presentation must include a health equity analysis of how AI biases in surveillance data could harm the target population. Document all AI prompts and outputs. AI-generated public health recommendations can encode historical biases that disproportionately affect marginalized communities — your equity analysis is graded as heavily as the intervention itself.',
    rubricRows: [
      {
        criterion: 'AI Integration Across Domains',
        excellent: 'AI meaningfully used in all four domains (epi analysis, intervention design, communication, outcome prediction); each use is purposeful and well-documented.',
        proficient: 'AI used in at least three domains with clear documentation; usage is purposeful.',
        developing: 'AI used in one or two domains; usage feels token or forced in others.',
        insufficient: 'AI use is minimal or not documented; does not meet the requirement to use AI across domains.',
      },
      {
        criterion: 'Critical Analysis of AI Value vs. Human Judgment',
        excellent: 'Presentation clearly distinguishes where AI added value from where human judgment was essential; examples are specific and demonstrate deep understanding of AI limitations in public health contexts.',
        proficient: 'Presentation addresses AI strengths and limitations with reasonable specificity.',
        developing: 'Critical analysis is present but generic; does not connect to the specific intervention or community.',
        insufficient: 'No critical analysis or analysis is superficial ("AI is helpful but has limitations").',
      },
      {
        criterion: 'Health Equity Analysis',
        excellent: 'Identifies specific ways AI recommendations could exacerbate health disparities (training data bias, algorithmic exclusion, digital divide); proposes concrete equity safeguards for the intervention.',
        proficient: 'Addresses health equity implications with some specificity; proposes general safeguards.',
        developing: 'Mentions health equity but analysis is superficial or disconnected from the AI tools used.',
        insufficient: 'No health equity analysis or dismisses equity concerns.',
      },
      {
        criterion: 'Intervention Quality',
        excellent: 'Intervention is evidence-based, feasible, culturally appropriate, and addresses root causes; evaluation plan includes measurable outcomes and health equity metrics.',
        proficient: 'Intervention is evidence-based and feasible with a reasonable evaluation plan.',
        developing: 'Intervention is plausible but lacks strong evidence base or feasibility analysis.',
        insufficient: 'Intervention is unrealistic, not evidence-based, or lacks an evaluation plan.',
      },
      {
        criterion: 'Presentation Effectiveness',
        excellent: 'Clear, engaging, professionally delivered within time limit; visual aids enhance understanding; handles questions with depth and composure.',
        proficient: 'Well-organized and clearly presented; visual aids are adequate; handles questions appropriately.',
        developing: 'Presentation is understandable but disorganized or exceeds time; visual aids are weak.',
        insufficient: 'Presentation is disorganized, incoherent, or fails to communicate the intervention design.',
      },
    ],
    implementationNotes:
      'Assign real community health challenges using publicly available data (e.g., Kentucky Department for Public Health data, CDC WONDER, County Health Rankings). Invite a community health practitioner to serve on the evaluation panel for the presentations. Emphasize that AI-generated public health recommendations can encode historical biases in surveillance data that disproportionately affect marginalized communities.',
    documentationTemplate:
      '## AI Usage Documentation — Public Health Intervention Design\n\n**Community Health Challenge:**\n**Target Population:**\n**AI Tools Used:** [Name and version for each]\n\n**AI Usage by Domain:**\n\n### 1. Epidemiological Analysis\n- AI prompts/queries:\n- AI output summary:\n- What I accepted:\n- What I modified/rejected and why:\n\n### 2. Intervention Design\n- AI prompts/queries:\n- AI output summary:\n- What I accepted:\n- What I modified/rejected and why:\n\n### 3. Communication Strategy\n- AI prompts/queries:\n- AI output summary:\n- What I accepted:\n- What I modified/rejected and why:\n\n### 4. Outcome Prediction\n- AI prompts/queries:\n- AI output summary:\n- What I accepted:\n- What I modified/rejected and why:\n\n**Health Equity Check:**\n| AI Recommendation | Potential Equity Concern | Safeguard Applied |\n|------------------|------------------------|-------------------|\n| | | |\n\n**Where AI Added the Most Value:**\n**Where Human Judgment Was Most Essential:**\n\n**Clinical Decision Affected:** What intervention component would change if AI data were wrong? ___\n**Verification Source:** [Public health data source, access date] ___\n**Patient Safety Check:** Could AI-recommended messaging inadvertently increase harm in the target population? ___',
    tags: ['public-health', 'health-equity', 'epidemiology', 'ai-integration', 'community-health', 'presentation'],
  },
]
