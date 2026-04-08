# Virtual Clinic — DNP Psychiatry Assessment Case Library

> **Case Count:** 30 cases (6 fully designed, 24 outlined)
> **Target Learners:** DNP in Psychiatry students (all years)
> **Difficulty Spread:** BEGINNER → INTERMEDIATE → ADVANCED → EXPERT (mixed per category)
> **Depends On:** Virtual Clinic infrastructure (10/10 sprints complete)
> **Approach:** Narrative Case Library with Progressive Complexity (3 cases per category, escalating)

## Design Principles

### Assessment Frameworks (Non-Negotiable Across All Cases)
1. **C-SSRS (Columbia Suicide Severity Rating Scale)** — every case, regardless of presenting complaint
2. **Full MSE (Mental Status Exam)** — the psychiatric "physical exam," scored in exam domain
3. **DSM-5-TR Diagnostic Criteria** — differential scoring expects criteria-based reasoning
4. **Biopsychosocial Formulation** — required in problem representation; biological-only = score penalty
5. **Safety Planning** — SI/HI/abuse screening as critical actions; missing = automatic penalty
6. **Trauma-Informed Communication** — weighted in communication domain; AI patients have trauma cues
7. **PHQ-9/GAD-7 Awareness** — expected in diagnostic plan for mood/anxiety cases
8. **Cultural Formulation** — scored in problem representation and communication; diverse patients have culturally-specific features

### Scoring Rubric (Psychiatric-Adapted)
```json
{
  "historyWeight": 0.25,
  "examWeight": 0.20,
  "differentialWeight": 0.25,
  "planWeight": 0.20,
  "communicationWeight": 0.10
}
```

### Clinical Setting Distribution (~30 cases)
- **~50% Outpatient** (15 cases) — bread and butter for psychiatric NPs
- **~20% Emergency/Crisis** (6 cases) — high-stakes assessment
- **~15% Inpatient** (4-5 cases) — acute stabilization, med management
- **~10% Consultation-Liaison** (3 cases) — medical vs. psychiatric differentiation
- **~5% Telehealth** (1-2 cases) — limited MSE, growing reality

### Demographic Diversity
Intentionally varied across age, race/ethnicity, gender identity, sexual orientation, SES, veteran status, and language. No single demographic clusters in one category. Culturally-specific symptom expression, stigma, trust dynamics, and explanatory models woven throughout.

---

## Category 1: Mood Disorders (Cases 1–3)

### Case 1: "The Weight of It All" — BEGINNER
- **Patient:** Marcus Williams, 34M, Black, married father of two
- **Setting:** Outpatient psychiatric clinic, new patient eval
- **Presentation:** Classic Major Depressive Disorder, single episode, moderate. Clear precipitant (passed over for promotion), 6-week history. PHQ-9 range ~17. Neurovegetative symptoms textbook-present.
- **Teaching Focus:** Systematic depression screening, MSE documentation, DSM-5 criteria mapping
- **Key Traps:**
  - Students who skip suicidality screening (he has passive ideation if asked directly but won't volunteer it)
  - Students who anchor on "work stress" and stop at Adjustment Disorder
- **Personality:** Stoic, minimizes symptoms, "I just need to toughen up" — tests whether students explore beyond the patient's framing
- **Critical Actions:** C-SSRS screening, PHQ-9 reference, safety plan, medication discussion (SSRI), psychotherapy referral
- **Cognitive Biases to Detect:** ANCHORING (work stress → Adjustment Disorder), PREMATURE_CLOSURE (accepting patient's minimization)

### Case 2: "Two Speeds" — INTERMEDIATE
- **Patient:** Priya Chakraborty, 28F, South Asian, graduate student
- **Setting:** Emergency department — brought by roommate concerned about erratic behavior
- **Presentation:** Bipolar II — presenting in a hypomanic episode with irritability (not euphoria). History reveals prior depressive episodes treated as unipolar depression. Currently on an SSRI that may be destabilizing her.
- **Teaching Focus:** Distinguishing Bipolar II from unipolar depression, medication-induced hypomania, culturally-shaped symptom expression (family framing distress as "being dramatic"), screening for mixed features
- **Key Traps:**
  - ANCHORING on anxiety/agitation
  - PREMATURE CLOSURE if they accept the prior "depression" diagnosis without longitudinal history
  - Students who miss the SSRI destabilization
- **Personality:** Rapid speech, tangential at times, frustrated that "no one has gotten this right"
- **Critical Actions:** Longitudinal mood history, medication review, family collateral (with permission), mood stabilizer discussion, SSRI taper plan
- **Cognitive Biases to Detect:** ANCHORING (anxiety presentation), PREMATURE_CLOSURE (prior diagnosis), CONFIRMATION (seeking only depression symptoms)

### Case 3: "After the Funeral" — ADVANCED
- **Patient:** Dolores "Lola" Gutierrez, 72F, Mexican-American, widowed 8 weeks
- **Setting:** Telehealth — rural access challenges
- **Presentation:** Diagnostic ambiguity between Prolonged Grief Disorder, Major Depressive Disorder, and early neurocognitive changes. Somatic complaints (chest tightness, poor appetite) are her primary language of distress. Reports seeing her deceased husband briefly — bereavement hallucination vs. psychotic feature?
- **Teaching Focus:** Geriatric psych assessment via telehealth (limited MSE), cultural formulation (Mexican-American grief rituals, familismo), differentiating normal grief from pathological, cognitive screening, medical rule-outs
- **Key Traps:**
  - AVAILABILITY bias (jumping to depression because it's common in elderly widows)
  - Missing cognitive concerns
  - Dismissing cultural grief practices as pathology
  - Inadequate safety screen ("she's just grieving")
- **Personality:** Warm but tearful, speaks some Spanglish, defers to family ("my daughter thinks I should talk to someone"), spiritual framework for distress
- **Critical Actions:** Cognitive screening (MoCA reference), grief vs. depression differentiation, medical workup (TSH, B12, CBC), cultural assessment, family involvement discussion, telehealth-adapted MSE
- **Cognitive Biases to Detect:** AVAILABILITY (common diagnosis), ANCHORING (grief only), PREMATURE_CLOSURE (skipping cognitive screening)

---

## Category 2: Anxiety Disorders (Cases 4–6)

### Case 4: "Can't Catch My Breath" — BEGINNER
- **Patient:** Sarah Mitchell, 24F, White, elementary school teacher
- **Setting:** Outpatient — referred by PCP after third ER visit
- **Presentation:** Panic Disorder with agoraphobic avoidance. Three ER visits in past month for "heart attacks" — cardiac workup negative. Classic panic symptoms: palpitations, derealization, chest tightness, fear of dying. Now avoiding driving and grocery stores.
- **Teaching Focus:** Differentiating panic from medical causes, psychoeducation as intervention, GAD-7 and panic-specific screening, documenting avoidance patterns
- **Key Traps:**
  - Students who accept "I think something is wrong with my heart" without exploring psychiatric differential
  - Students who skip medical history review (need to confirm cardiac workup was adequate)
- **Personality:** Anxious, fidgety, health-focused, articulate about physical symptoms but struggles to name emotions. "I'm not crazy, this is real."
- **Critical Actions:** Confirm adequate medical workup, anxiety screening tools, CBT referral, SSRI discussion, psychoeducation about panic cycle, avoidance documentation
- **Cognitive Biases to Detect:** ANCHORING (somatic focus), CONFIRMATION (seeking only medical explanations)

### Case 5: "The War Followed Me Home" — INTERMEDIATE
- **Patient:** DeShawn Carter, 38M, Black, Army veteran, 2 combat deployments
- **Setting:** VA outpatient — self-referred after wife's ultimatum
- **Presentation:** PTSD with comorbid Alcohol Use Disorder. Nightmares, hypervigilance, emotional numbing, avoidance of crowds. Using alcohol to sleep (6+ drinks nightly). Wife threatening to leave. Minimizes combat experiences — "plenty of guys had it worse."
- **Teaching Focus:** Trauma-informed interviewing (pacing, not forcing disclosure), PCL-5 awareness, assessing substance use as self-medication vs. independent AUD, military cultural competence, couples/family impact assessment
- **Key Traps:**
  - PREMATURE CLOSURE on AUD alone without exploring trauma
  - Students who push too hard for trauma details in a first visit
  - Missing intimate partner violence screening
  - Forgetting TBI screening given combat history
- **Personality:** Guarded, uses humor to deflect, military bearing — sits rigid, scans the room. Rapport takes work. Opens up if student demonstrates respect for service.
- **Critical Actions:** Trauma screen (PCL-5), AUDIT-C for alcohol, TBI screening, IPV screening, safety assessment (weapons access), couples/family assessment, treatment planning (evidence-based PTSD tx + SUD treatment)
- **Cognitive Biases to Detect:** PREMATURE_CLOSURE (AUD only), ANCHORING (presenting complaint), AVAILABILITY (common veteran narrative)

### Case 6: "Perfect on Paper" — ADVANCED
- **Patient:** Hyun-jin "Grace" Park, 20F, Korean-American, pre-med student
- **Setting:** Consultation-liaison — medical floor, parents at bedside
- **Presentation:** Admitted for syncope and bradycardia. Psychiatry consulted for "anxiety." Actually presenting with severe Social Anxiety Disorder with co-occurring restrictive eating (subthreshold Anorexia) and academic perfectionism driving physiological collapse. Takes propranolol obtained from a friend for presentations. Family pressure immense — parents are physicians.
- **Teaching Focus:** C-L psychiatry assessment on a medical unit, recognizing anxiety-eating disorder overlap, medication misuse, cultural factors (Korean academic/family expectations, "saving face"), capacity for honest disclosure when parents are in the room
- **Key Traps:**
  - ANCHORING on the medical admission and treating psych as secondary
  - Missing the eating disorder entirely (she attributes weight loss to "stress")
  - Students who conduct the interview with parents present
  - CONFIRMATION bias — accepting "just anxiety" without probing further
- **Personality:** Polite, deferential, gives "right answers," minimizes everything. Opens up only if student asks parents to step out and creates genuine safety.
- **Critical Actions:** Private interview (parents out), eating assessment (EDE-Q reference), medication misuse assessment, vital sign interpretation, nutrition consult, outpatient plan with confidentiality discussion, cultural formulation
- **Cognitive Biases to Detect:** ANCHORING (medical admission), CONFIRMATION ("just anxiety"), PREMATURE_CLOSURE (missing eating disorder)

---

## Category 3: Psychotic Disorders (Cases 7–9) — OUTLINED

### Case 7: "The Voices Started Last Week" — BEGINNER
- **Patient:** ~22M, White, college senior
- **Setting:** Emergency department — brought by campus police after bizarre behavior in dorm
- **Presentation:** First-break psychosis. Auditory hallucinations (commanding voices), paranoid delusions (roommate poisoning food), disorganized thought. Prodromal signs overlooked for months (social withdrawal, declining grades). Cannabis use (daily for 2 years).
- **Teaching Focus:** First-episode psychosis workup, differentiating primary psychosis from substance-induced, medical rule-outs, family psychoeducation, safety assessment
- **Difficulty:** BEGINNER — classic presentation, clear diagnostic direction

### Case 8: "She's Fine, She Just Needs Rest" — INTERMEDIATE
- **Patient:** ~35F, Haitian-American, home health aide, single mother
- **Setting:** Inpatient psychiatric unit — involuntary hold
- **Presentation:** Schizoaffective Disorder, bipolar type — admitted during manic episode with psychotic features. Religious delusions intertwined with genuine Vodou spiritual practice. Family insists she's "having a spiritual experience, not sick." History of medication non-adherence.
- **Teaching Focus:** Differentiating culturally normative spiritual experiences from psychosis, involuntary treatment ethics, medication adherence barriers, cultural humility, family engagement
- **Difficulty:** INTERMEDIATE — cultural complexity, diagnostic nuance

### Case 9: "I Know They're Watching Me" — ADVANCED
- **Patient:** ~45M, Middle Eastern refugee (Syrian), through interpreter
- **Setting:** Outpatient — referred by resettlement agency
- **Presentation:** Differential between Paranoid Schizophrenia, PTSD with paranoid features, and trauma-related hypervigilance in a refugee with genuine persecution history. Interpreter dynamics complicate assessment. Significant medication/side effect literacy gaps.
- **Teaching Focus:** Working with interpreters, distinguishing real persecution from paranoid delusions, refugee mental health, trauma-informed assessment across language barriers, cultural explanatory models
- **Difficulty:** ADVANCED — genuine ambiguity between psychosis and reality-based fear

---

## Category 4: Substance Use Disorders (Cases 10–12) — OUTLINED

### Case 10: "I Can Stop Whenever I Want" — BEGINNER
- **Patient:** ~28M, White, construction worker
- **Setting:** Outpatient — court-mandated after DUI
- **Presentation:** Alcohol Use Disorder, moderate. Classic denial and minimization. CAGE/AUDIT positive. Mild withdrawal symptoms. Family history of AUD.
- **Teaching Focus:** Motivational interviewing, standardized screening tools, withdrawal risk assessment, treatment matching (outpatient vs. inpatient detox)
- **Difficulty:** BEGINNER — straightforward SUD, focus on screening and engagement skills

### Case 11: "I'm Not an Addict, I Have Real Pain" — INTERMEDIATE
- **Patient:** ~52F, Native American, rural, chronic pain patient
- **Setting:** Outpatient — referred by pain clinic that is tapering her opioids
- **Presentation:** Opioid Use Disorder vs. undertreated chronic pain vs. both. Complex pain history (fibromyalgia, 2 back surgeries). Genuinely in pain. Currently supplementing prescribed opioids with friend's supply. Significant distrust of healthcare system (historical trauma). PDMP review reveals multiple prescribers.
- **Teaching Focus:** Pain-addiction overlap, PDMP use, MAT discussion (buprenorphine), cultural sensitivity (Native American healthcare distrust, historical context), harm reduction vs. abstinence, collaborative care with pain management
- **Difficulty:** INTERMEDIATE — diagnostic ambiguity, cultural complexity, ethical tension

### Case 12: "Just Partying" — ADVANCED
- **Patient:** ~19, non-binary (they/them), Latinx, college freshman
- **Setting:** Emergency — brought by friends after collapse at party
- **Presentation:** Polysubstance use (MDMA, ketamine, alcohol) with underlying untreated ADHD and emerging Bipolar I. Self-medicating executive dysfunction and mood instability. Gender identity-related family conflict driving substance use as coping. First-generation college student, scholarship at risk.
- **Teaching Focus:** Polysubstance assessment, LGBTQ+ affirming care, co-occurring disorder identification, developmental context (emerging adulthood), motivational interviewing with young adults, harm reduction, academic and financial stressor impact
- **Difficulty:** ADVANCED — multiple overlapping diagnoses, identity-affirming care, systemic stressors

---

## Category 5: Personality Disorders (Cases 13–15) — OUTLINED

### Case 13: "Everyone Always Leaves" — BEGINNER
- **Patient:** ~26F, White, waitress, frequent ER visitor
- **Setting:** Emergency — self-referred after superficial self-harm following breakup
- **Presentation:** Borderline Personality Disorder. Classic pattern: abandonment fear, self-harm (cutting), unstable relationships, identity disturbance. Multiple ER visits, multiple therapists. Currently splitting on previous provider.
- **Teaching Focus:** BPD assessment, self-harm risk stratification (parasuicidal vs. suicidal), therapeutic alliance, avoiding splitting dynamics, dialectical behavior therapy referral, safety planning that isn't dismissive
- **Difficulty:** BEGINNER — classic presentation, focus on managing countertransference and appropriate assessment

### Case 14: "I'm Smarter Than My Last Three Doctors" — INTERMEDIATE
- **Patient:** ~40M, White, attorney
- **Setting:** Outpatient — self-referred, "just need medication for focus"
- **Presentation:** Narcissistic Personality Disorder with comorbid stimulant misuse. Presents requesting Adderall, claims ADHD diagnosis from another provider (no records available). Entitled, devaluing, tries to direct the assessment. Underlying depression he won't acknowledge.
- **Teaching Focus:** Assessing personality pathology when the patient controls the narrative, appropriate ADHD assessment (not just prescribing on request), navigating drug-seeking behavior professionally, identifying depression beneath narcissistic defense, documentation and limit-setting
- **Difficulty:** INTERMEDIATE — countertransference challenge, diagnostic complexity

### Case 15: "The System Failed Him" — ADVANCED
- **Patient:** ~32M, Black, recently released from incarceration (3 years)
- **Setting:** Community mental health — mandated outpatient treatment
- **Presentation:** Antisocial Personality Disorder vs. Complex PTSD from childhood abuse and incarceration trauma. Extensive trauma history (foster care, physical/sexual abuse, gang involvement). Currently stable but guarded. Probation officer wants "diagnosis and medication." Patient wants to be left alone.
- **Teaching Focus:** ASPD vs. complex trauma differential, forensic context, mandated treatment ethics, ACE score implications, systemic racism in diagnosis (Black men disproportionately diagnosed ASPD), therapeutic nihilism vs. genuine engagement, reentry challenges
- **Difficulty:** ADVANCED — ethical complexity, systemic issues, diagnostic bias awareness

---

## Category 6: Neurocognitive Disorders (Cases 16–18) — OUTLINED

### Case 16: "Mom's Just Getting Older" — BEGINNER
- **Patient:** ~74F, White, retired teacher, brought by adult daughter
- **Setting:** Outpatient — PCP referral for "memory concerns"
- **Presentation:** Early Alzheimer's Dementia with behavioral/psychiatric symptoms (anxiety, sundowning agitation, mild paranoia about missing items). Daughter reports 18-month decline. Patient minimizes, "I'm fine, my daughter worries too much."
- **Teaching Focus:** Dementia screening (MoCA/MMSE), collateral history importance, behavioral symptoms of dementia, caregiver assessment, capacity evaluation, medication options (cholinesterase inhibitors), safety assessment (driving, wandering, finances)
- **Difficulty:** BEGINNER — classic presentation, focus on comprehensive geriatric psych assessment

### Case 17: "He's Not the Same Since the Accident" — INTERMEDIATE
- **Patient:** ~29M, Hispanic, warehouse worker, 6 months post-TBI
- **Setting:** Outpatient — referred by neurologist for "personality changes"
- **Presentation:** TBI-related psychiatric changes: impulsivity, irritability, emotional lability, disinhibition, depression. Wife says "he's a different person." Struggling to return to work. Possible seizure-like episodes. Pre-injury: no psychiatric history.
- **Teaching Focus:** TBI-related neurobehavioral assessment, differentiating TBI sequelae from primary psychiatric disorder, neuropsych referral, medication considerations (seizure threshold), disability and occupational assessment, family psychoeducation
- **Difficulty:** INTERMEDIATE — requires neurological-psychiatric integration

### Case 18: "Grandpa's Seeing Things Again" — ADVANCED
- **Patient:** ~78M, Japanese-American, retired engineer, lives with son's family
- **Setting:** Inpatient — admitted from ER after fall with altered mental status
- **Presentation:** Delirium superimposed on Lewy Body Dementia. Visual hallucinations (small animals), fluctuating cognition, parkinsonism, REM sleep behavior disorder history. UTI identified as delirium trigger. Critical: must NOT give typical antipsychotics (lethal sensitivity in LBD). Son requesting "something to calm him down."
- **Teaching Focus:** Delirium workup, LBD recognition, antipsychotic contraindication in LBD (neuroleptic sensitivity), managing family expectations, hospital-based psychiatric consultation, non-pharmacological management, goals of care discussion
- **Difficulty:** ADVANCED — high-stakes medication decision, complex differential, family dynamics

---

## Category 7: Child/Adolescent (Cases 19–21) — OUTLINED

### Case 19: "He Won't Sit Still" — BEGINNER
- **Patient:** ~8M, biracial (Black/White), 3rd grader, brought by grandmother (guardian)
- **Setting:** Outpatient — school referral for behavior problems
- **Presentation:** ADHD, Combined Type. Classic presentation: can't sit still, blurts out answers, loses homework, difficulty with peers. Teacher reports disruptive behavior. Grandmother concerned about medication ("I don't want him to be a zombie"). Home stable but grandmother has limited energy.
- **Teaching Focus:** Child psychiatric interview (child vs. collateral), developmentally appropriate assessment, ADHD rating scales (Vanderbilt), medication discussion with cautious caregiver, school accommodation recommendations (504/IEP), ruling out anxiety/trauma that mimics ADHD
- **Difficulty:** BEGINNER — classic presentation, focus on pediatric assessment fundamentals

### Case 20: "She Used to Be Such a Happy Kid" — INTERMEDIATE
- **Patient:** ~15F, Somali-American, hijab-wearing, high school sophomore
- **Setting:** Outpatient — PCP referral after self-harm discovered
- **Presentation:** Adolescent depression with non-suicidal self-injury (NSSI). Cutting on thighs (hidden). Cyberbullying at school targeting religious identity. Cultural conflict between family's traditional expectations and American peer norms. Mother dismissive ("she's just being dramatic, we don't have depression in our family"). Father absent (in Somalia).
- **Teaching Focus:** Adolescent depression assessment, NSSI vs. suicidal self-harm differentiation, cyberbullying impact, cultural conflict in immigrant families, religious identity as both stressor and protective factor, confidentiality with minors, engaging dismissive parents
- **Difficulty:** INTERMEDIATE — cultural complexity, family dynamics, confidentiality challenges

### Case 21: "I Don't Want to Be Here" — ADVANCED
- **Patient:** ~13M, White, brought by both parents (divorced, high-conflict)
- **Setting:** Emergency — brought after threatening to kill himself at school
- **Presentation:** Suicidal ideation with plan in context of parental divorce conflict, possible sexual abuse by mother's boyfriend (disclosed to school counselor, patient now recanting), Conduct Disorder symptoms vs. trauma response. Parents each blaming the other. Mandatory reporting obligations.
- **Teaching Focus:** Pediatric suicide risk assessment, mandatory reporting, trauma assessment when patient is recanting, managing high-conflict family dynamics, inpatient vs. outpatient safety planning, coordination with school and CPS, differentiating conduct disorder from trauma response
- **Difficulty:** ADVANCED — legal/ethical complexity, safety crisis, family dynamics, mandatory reporting

---

## Category 8: Trauma-Related Disorders (Cases 22–24) — OUTLINED

### Case 22: "I Just Can't Sleep" — BEGINNER
- **Patient:** ~30F, White, nurse, presenting for insomnia
- **Setting:** Outpatient — self-referred
- **Presentation:** Acute Stress Disorder, 3 weeks post-workplace violence (patient attacked her on the unit). Not identifying it as trauma — focused on sleep and "jumpiness." Classic acute stress symptoms: intrusions, hypervigilance, emotional numbing, avoidance of the medical unit.
- **Teaching Focus:** Recognizing trauma when patient doesn't present it as trauma, ASD criteria and timeline, normalizing trauma response, brief interventions, assessing fitness to return to work, secondary traumatic stress in healthcare workers
- **Difficulty:** BEGINNER — straightforward once recognized, focus on identification

### Case 23: "I Don't Remember Much Before Age 12" — INTERMEDIATE
- **Patient:** ~33F, multiracial (Black/White), social worker
- **Setting:** Outpatient — self-referred for "stress management"
- **Presentation:** Complex PTSD from childhood sexual abuse (intrafamilial). Dissociative symptoms, emotional dysregulation, difficulty with authority figures, chronic shame. High-functioning professionally (common in helping professions). Prior misdiagnoses: Bipolar II, BPD, GAD.
- **Teaching Focus:** Complex PTSD assessment, recognizing dissociation, developmental trauma vs. personality disorder, high-functioning trauma survivors, professional helper dynamics, appropriate treatment matching (phase-based trauma therapy), avoiding retraumatization in assessment
- **Difficulty:** INTERMEDIATE — multiple prior diagnoses to sort through, subtle presentation

### Case 24: "It Wasn't That Bad" — EXPERT
- **Patient:** ~22M, transgender man (he/him), college junior, presented by partner
- **Setting:** Crisis center — partner concerned about escalating self-harm
- **Presentation:** Complex PTSD from conversion therapy (ages 14-17, parental-mandated), current intimate partner violence (IPV — partner is emotionally abusive but the one who brought him in, complicating the picture), active SI with plan, gender dysphoria-related distress. Trust in healthcare deeply damaged by conversion therapy. Previous providers misgendered him or dismissed trauma.
- **Teaching Focus:** Trans-affirming crisis assessment, conversion therapy trauma recognition, IPV assessment when abusive partner is present, safety planning with housing instability, building trust with healthcare-avoidant patients, intersectional identity assessment, coordinating with LGBTQ+-affirming resources
- **Difficulty:** EXPERT — multiple simultaneous safety concerns, identity-affirming care, ethical complexity, trust barrier

---

## Category 9: Eating Disorders (Cases 25–27) — OUTLINED

### Case 25: "I'm Just Eating Clean" — BEGINNER
- **Patient:** ~20F, White, college athlete (cross-country)
- **Setting:** Outpatient — referred by athletic trainer after stress fracture
- **Presentation:** Anorexia Nervosa, restricting type. BMI 16.5. Amenorrhea. Stress fracture (relative energy deficiency). Rationalizes restriction as "performance nutrition." Athletic identity entwined with thinness. Family praises her "discipline."
- **Teaching Focus:** Eating disorder screening in athletes, medical stability assessment, RED-S (relative energy deficiency in sport), motivation assessment, team-based care coordination (trainer, nutritionist, therapist), level of care determination, family dynamics
- **Difficulty:** BEGINNER — classic athletic presentation, focus on screening and medical assessment

### Case 26: "Nobody Knows" — INTERMEDIATE
- **Patient:** ~35M, Black, software engineer, married
- **Setting:** Outpatient — PCP referral for "esophageal issues"
- **Presentation:** Bulimia Nervosa in a male patient. Binge-purge cycle hidden for 10+ years. Dental erosion, esophageal tears, electrolyte abnormalities. Significant shame — eating disorders "aren't a man's disease." Partner unaware. Childhood obesity and bullying history.
- **Teaching Focus:** Eating disorders in men (underdiagnosed population), screening beyond typical demographics, medical complications assessment, shame and secrecy dynamics, body image in men, gender-specific barriers to treatment, lab workup (electrolytes, amylase)
- **Difficulty:** INTERMEDIATE — atypical demographic, hidden presentation

### Case 27: "Food Is the Only Thing I Can Control" — ADVANCED
- **Patient:** ~45F, Filipina-American, single mother of 3, works two jobs
- **Setting:** Inpatient — admitted for hypokalemia and cardiac arrhythmia
- **Presentation:** Binge Eating Disorder with purging behaviors, Type 2 Diabetes, Major Depression, and food insecurity creating a paradox: binge-restrict cycle driven by both psychological and economic factors. Cultural relationship with food (Filipino food as love language and family bonding). Medical team focused on "non-compliance with diabetes management."
- **Teaching Focus:** Eating disorder-metabolic comorbidity, food insecurity as clinical factor, cultural food relationships, re-framing "non-compliance," integrated behavioral health on medical unit, discharge planning with real-world constraints (financial, childcare, transportation)
- **Difficulty:** ADVANCED — intersecting medical/psychiatric/socioeconomic factors, systems-level thinking

---

## Category 10: Somatic/Functional Disorders (Cases 28–30) — OUTLINED

### Case 28: "Something Is Really Wrong With Me" — BEGINNER
- **Patient:** ~42F, White, office manager
- **Setting:** Outpatient — referred after extensive negative medical workup
- **Presentation:** Somatic Symptom Disorder. Multiple chronic complaints (headaches, fatigue, GI distress, diffuse pain) with extensive testing over 5 years and 8 specialists. PHQ-15 highly elevated. Anxious about her health, checks symptoms online daily. Not malingering — genuinely distressed. Previous doctors: "It's all in your head."
- **Teaching Focus:** Somatic symptom assessment, validating suffering while reframing, therapeutic alliance as intervention, avoiding unnecessary testing, CBT for somatic symptoms, addressing iatrogenic harm from prior dismissive providers
- **Difficulty:** BEGINNER — classic presentation, focus on therapeutic relationship and appropriate framing

### Case 29: "I Woke Up and Couldn't Walk" — INTERMEDIATE
- **Patient:** ~17F, Afghani-American, high school junior
- **Setting:** Consultation-liaison — neurology floor
- **Presentation:** Functional Neurological Symptom Disorder (Conversion Disorder). Acute onset lower limb paralysis with no neurological basis. Recent stressor: witnessed domestic violence (father assaulting mother). Neurological exam reveals positive Hoover's sign. Family insists on more testing. Cultural context: emotional expression forbidden in family, somatic expression of distress culturally normative.
- **Teaching Focus:** FND assessment and explanation, positive neurological signs (not diagnosis of exclusion), trauma linkage, adolescent in unsafe home environment, mandatory reporting considerations, explaining FND to family in culturally sensitive way, rehabilitation approach
- **Difficulty:** INTERMEDIATE — diagnostic explanation challenge, safety concerns, cultural dynamics

### Case 30: "I Think I'm Dying" — EXPERT
- **Patient:** ~55M, Vietnamese-American, retired military (Navy), cab driver
- **Setting:** Emergency — EMS brought in for "chest pain and confusion"
- **Presentation:** Illness Anxiety Disorder vs. Panic Disorder vs. genuine cardiac event in a patient with known somatization history. The emergency: medical team is dismissing him based on chart history ("frequent flyer, psych history, nothing ever wrong"). But this time his troponin is mildly elevated. Diagnostic overshadowing in action — his psychiatric history is causing providers to miss a STEMI. Patient's previous valid complaints were dismissed, eroding trust.
- **Teaching Focus:** Diagnostic overshadowing (the most dangerous trap in C-L psychiatry), advocating for patients with somatic histories, recognizing when medical complaints are real despite psychiatric comorbidity, collaborative care with emergency medicine, addressing systemic bias, patient advocacy as psychiatric responsibility
- **Difficulty:** EXPERT — life-threatening diagnostic overshadowing, ethical obligation to advocate, challenges the student's own biases

---

## Implementation Notes

### Case Authoring Sequence
1. **Phase 1 (Build Now):** Cases 1–6 (Mood Disorders + Anxiety Disorders) — fully specified above
2. **Phase 2:** Cases 7–12 (Psychotic Disorders + Substance Use)
3. **Phase 3:** Cases 13–18 (Personality Disorders + Neurocognitive)
4. **Phase 4:** Cases 19–24 (Child/Adolescent + Trauma-Related)
5. **Phase 5:** Cases 25–30 (Eating Disorders + Somatic/Functional)

### Data Entry Method
Each case will be authored as a `ClinicalCase` record using the existing Virtual Clinic case authoring API (`POST /api/virtual-clinic/cases`). The 6 fully designed cases include enough detail to populate all required JSON fields:
- `historyOfPresentIllness`, `pastMedicalHistory`, `medications`, `allergies`, `socialHistory`, `familyHistory`, `reviewOfSystems`
- `physicalExamFindings` (keyed by MSE maneuver), `vitalSigns`
- `availableLabs`, `availableImaging`
- `correctDifferentials`, `keyHistoryQuestions`, `keyExamManeuvers`, `criticalActions`, `scoringRubric`

### Psychiatric-Specific Exam Maneuvers (MSE)
All cases use mental status exam as the "physical exam" domain:
- `mental-status-appearance` — grooming, psychomotor activity, eye contact
- `mental-status-mood-affect` — stated mood, observed affect, congruence
- `mental-status-speech` — rate, rhythm, volume, latency
- `mental-status-thought-process` — goal-directed, tangential, loose, circumstantial
- `mental-status-thought-content` — delusions, obsessions, phobias, SI/HI
- `mental-status-perceptions` — hallucinations (auditory, visual, tactile)
- `mental-status-cognition` — orientation, attention, memory, executive function
- `mental-status-insight-judgment` — awareness of illness, decision-making capacity
- `suicidality-assessment` — C-SSRS structured screening
- `homicidality-assessment` — threat assessment
- `substance-use-screen` — AUDIT-C, DAST, or clinical interview
- `neurological-screen` — when indicated (TBI, dementia, conversion)

### Domain Tracking Markers
The patient-prompt-service already supports `<!--DOMAIN:psychiatric-->` style markers. For psychiatric cases, the following domains should be tracked:
- `psychiatric` (mood, psychosis, anxiety symptoms)
- `suicidality` (any safety screening)
- `substance-use` (alcohol, drugs, tobacco)
- `social-history` (living situation, support, occupation, stressors)
- `family-history` (psychiatric family history)
- `medications` (current meds, adherence, side effects)
- `past-medical` (medical comorbidities)
- `developmental` (childhood, trauma, milestones)
- `cultural` (identity, beliefs, explanatory models)
- `functional` (sleep, appetite, energy, concentration, activities)

### Personality Notes Guide AI Behavior
Each case's `personalityNotes` field is critical for psychiatric realism:
- **Guarded** patients require rapport before disclosing
- **Minimizing** patients undersell symptoms
- **Dramatic** patients may oversell but have real pathology
- **Intellectualizing** patients avoid affect
- **Tangential** patients require gentle redirection
- **Hostile** patients test boundaries
- **Dissociative** patients may have flat affect or memory gaps

### Course Assignment Recommendations
Suggested course assignment groupings for a DNP-Psych program:
- **Foundations of Psych Assessment:** Cases 1, 4, 10, 13, 16, 22, 25, 28 (all BEGINNER)
- **Advanced Psychopathology:** Cases 2, 5, 8, 11, 14, 17, 20, 23, 26, 29 (all INTERMEDIATE)
- **Complex Clinical Reasoning:** Cases 3, 6, 9, 12, 15, 18, 21, 24, 27, 30 (ADVANCED/EXPERT)
- **Crisis & Emergency Psych:** Cases 2, 5, 12, 13, 21, 24, 30 (crisis-setting cases across difficulty)
- **Cultural Psychiatry:** Cases 3, 5, 6, 8, 9, 11, 15, 20, 24, 27, 29, 30 (culturally complex cases)
