---
id: final-project
courseId: abpm-clinical-informatics
title: Course Final Project — Sepsis Early Warning CDS, End to End
rubrics: ["written-thesis", "discussion-quality", "voice-defense"]
estimatedHours: 12
---

# Final Project: Designing a Sepsis Early Warning CDS Module End to End

## What this is

This is the integrative project for the entire course. Every prior module has built up one slice of the work that clinical informatics actually is. The final project asks you to put all eight slices on the same page, on the same initiative, and defend the integrated design in writing and in conversation. The boards test the slices one at a time. The job tests whether you can hold all of them at once when the institution depends on you to ship something that works.

Pick the scenario below or substitute a comparably substantial real or hypothetical clinical informatics initiative at your institution. The scenario is provided so that candidates without an active project of this scale have something to anchor on; if you have a real initiative you are working on, the real one is preferred and the grading will reward the realism.

## The scenario

You are the CMIO (or the senior clinical informaticist standing in for the CMIO) of a 380-bed regional hospital that admits roughly 1,400 sepsis cases per year through its emergency department and inpatient units. The institution's current sepsis detection relies on a SIRS-criteria-based alert built into the EHR seven years ago, which fires several thousand times per month and which the nursing and physician staff describe as "the noise we ignore." Mortality from sepsis at the institution is at the 60th percentile of CMS-reported peers. Length of stay for septic patients is at the 70th percentile (longer is worse). The institution is under increasing pressure from its quality committee, its ACO partners, and a recent state-level sepsis quality reporting requirement.

Leadership has asked you to design an EHR-integrated sepsis early-warning CDS module — replacing the current alert — and to defend the design across all the dimensions the course has covered. You have a working budget envelope of approximately $1.2M over three years and access to the institution's existing data science team plus the standard EHR vendor's CDS infrastructure (CDS Hooks, FHIR APIs, the integration engine, the clinical content layer). The institution does NOT have a dedicated AI governance committee yet.

## What the project must produce

Write a **2,500–3,500 word integrative design document** that walks the proposed sepsis early-warning CDS module through every module's framework. The document is the single longest artifact in the course and is graded by three rubrics: the **written-thesis rubric**, the **discussion-quality rubric** (via instructor review of the document and the post in the final-project thread), and the **voice-defense rubric** (via the final defense voice session described below).

The document must include the following sections, in order. Each section maps to a prior module and the grading rewards the cross-references doing real work, not surface name-checking.

### 1. Problem statement and target population

Define the clinical problem precisely. What is sepsis at this institution — incidence, current mortality, current LOS, current detection lag? What is the target population for the intervention (ED, inpatient, both)? What is the institution's current detection workflow and where is it failing? Three to five paragraphs. Use the discipline of measure-spec literacy from Module 6 lesson 1: name the sources of your numbers, name the definitions you are using for "sepsis" (Sepsis-3 SOFA-based definitions versus the legacy CMS SEP-1 definitions are not interchangeable), and acknowledge where the numbers are estimates. The boards reward precision about definitions and the job rewards it more.

### 2. Technical architecture

Walk the technical stack. Cross-reference Module 3 (anatomy of the modern EHR) for the data flow from operational systems through the CDR, and Module 4 (CDS Hooks, FHIR, CQL) for the CDS execution layer. Identify specifically:

- The source data elements the model will consume (vitals, labs, demographics, comorbidities, medications) and which clinical systems they come from.
- The integration point: is the model running inside the EHR vendor's CDS platform, on a side service called via CDS Hooks, or on a streaming pipeline reading from the integration engine?
- The CQL or model-execution layer that converts the prediction into a recommendation.
- The user interface — the alert format, the routing, the alternatives to interruptive alerts (passive indicators, worklists, paging escalations).
- The data flow back from the alert action into the audit log and the monitoring dashboard.

Be concrete enough that another informaticist could draw the system diagram from your description. Vague architecture is the most common way for a final project to lose points.

### 3. CDS design through the Five Rights

Walk the design through the Five Rights from Module 4 lesson 2 — the right information, to the right person, in the right format, through the right channel, at the right time in the workflow. For each Right, state the design choice and defend it. The grading specifically rewards candidates who identify which of the Five Rights their design is most likely to fail at and propose a mitigation. The standard wrong move is to claim all five Rights are satisfied perfectly; the right move is to identify the trade-off you made and acknowledge it.

Address the alert fatigue concern from Module 4 lesson 3 directly. The current SIRS alert is being ignored. What in your design will prevent the new alert from suffering the same fate? Is your appropriate-override-rate target documented? What is the threshold for retiring the new alert if it does not work? The boards reward you for the override-rate framing and the discipline of designing the retreat path before the launch.

### 4. Sociotechnical design through the Sittig-Singh eight dimensions

Walk the design through every one of the eight Sittig-Singh dimensions from Module 5 lesson 3. For each dimension, identify how the design addresses it (or, if it does not, say so explicitly). The discipline of considering all eight is the point of the exercise; do not skip a dimension because it is "obviously irrelevant." The dimensions are:

1. Hardware and software computing infrastructure
2. Clinical content
3. Human-computer interface
4. People
5. Workflow and communication
6. Internal organizational policies, procedures, and culture
7. External rules, regulations, and pressures
8. System measurement and monitoring

The grading rewards multi-dimensional analysis. The standard wrong answer is to address dimensions 1–3 well and skip 4–8. The right answer is to acknowledge that the new sepsis alert will succeed or fail primarily on dimensions 4 and 5 (people and workflow) — the lesson Module 5 was built to teach.

### 5. Measurement and monitoring plan

Cross-reference Module 6. Specify the measures you will track and how. Include:

- The clinical outcome measure (sepsis mortality, sepsis LOS, ICU transfer rate). Place each in Donabedian's structure-process-outcome framework.
- The process measure(s) (alert fire rate, alert action rate, time to first antibiotic, time to first lactate).
- A balancing measure that tracks the harm the intervention could create (broad-spectrum antibiotic days, *C. difficile* rate, fluid overload, ICU bounce-back from over-aggressive resuscitation).
- The dashboard design — who is the audience, what is the freshness, how will the dashboard avoid the failure modes from Module 6 lesson 3 (denominator drift, vanity metrics, missing context, stale data without freshness markers)?
- An honest application of the statistical traps from Module 6 lesson 4. Specifically: what is the baseline rate of true positives, what is the expected positive predictive value at that base rate, and how does that calculation shape your alert design?

The grading rewards candidates who do the PPV calculation explicitly and let the result shape the design. The candidates who skip the PPV calculation almost always design alerts the institution will not be able to support.

### 6. Privacy, security, and policy review

Cross-reference Module 7. Address:

- Whether the model's training data is appropriately governed and whether the institution has a defensible position on data use under HIPAA's TPO framework.
- The safeguard categories (administrative, physical, technical) the implementation must satisfy.
- Whether any aspect of the design could constitute information blocking under the Cures Act (it should not, but the analysis is part of the discipline).
- The cyber-incident posture. If the EHR is unavailable for two weeks because of a ransomware incident, what happens to sepsis detection? The downtime planning question from Module 5 and Module 7 returns here.

### 7. Governance and change management plan

Cross-reference Module 8. Specify:

- The governance structure. Which committee owns the deployment decision? Who is the single Accountable on the RACI? What is the role of the (currently nonexistent) AI governance committee — should the institution stand one up before this project, and if so, how?
- The change-management framework you have selected (Kotter, ADKAR, or Lewin). Defend the choice. Walk through the framework's stages or steps as they would apply to this initiative.
- The ROI case. Build a rough TCO over three years (use the framework from lesson 3), identify hard versus soft benefits, present a range, and identify the assumption that drives the most variance. Be explicit about what you are guessing.
- The ethics of clinician burden. The new alert will impose cognitive cost on the clinicians who receive it. Acknowledge it. Treat resistance as design feedback. Do not retreat into "the clinicians will just have to adapt."

### 8. Friedman's theorem and the predefined retraction criteria

Cross-reference Module 1 and Module 8. State explicitly the criteria under which you will declare the intervention a success and the criteria under which you will declare it a failure and retract or substantially redesign it. Specify the time horizon for the evaluation, the thresholds, the decision-maker, and the process. The discipline of writing the retraction criteria *before* launch is the closing move of the course and the integrative ethical claim of the entire field. Final projects that omit this section, or that include it as a polite gesture without specific thresholds, lose points heavily.

### 9. Engagement with the strongest counter-argument

The strongest counter-argument is some version of: "sepsis early warning has been a research and operational target for two decades, dozens of institutions have deployed dozens of versions of this design, the published results are mixed at best, and the institutions that have shown durable improvement have done so through workflow and staffing changes rather than through better alert algorithms. Your proposed design is at risk of being one more deployment in a long line that did not move the outcome. What makes yours different?" Steel-man this. Then respond. The strongest responses do not claim that the design is qualitatively different; they acknowledge that the hard part is the workflow and staffing layer, that the design is making specific commitments to that layer, and that the predefined retraction criteria are the institution's protection against another failure.

## What the project must NOT do

- Identify any specific patient. See the PHI Handling Policy.
- Identify a specific institution by name in a way that would compromise confidentiality.
- Skip any of the nine sections above. The integrative discipline is the point.
- Skip the predefined retraction criteria. A final project without retraction criteria has missed the closing frame of the course.
- Be drafted by an AI. See the AI Use Policy. The integrative document is the test of whether *you* can hold all eight modules in your head at once. AI drafting defeats the purpose.

## How it will be graded

By all three rubrics.

- The **Written Analysis Rubric** grades the document. The "Use of frameworks and vocabulary" criterion is the heaviest hitter — graders are looking for the cross-references doing real work across all eight modules, not surface name-checking. The "Engagement with the strongest counter-argument" criterion will weigh against you if you treat the design as obviously correct.

- The **Case Discussion Rubric** grades the post in the final-project discussion thread (where you will paste the document and engage with peer responses). Substantive peer engagement is required. PHI hygiene is graded.

- The **Voice Defense Rubric** grades the final defense voice session described below.

A passing final project requires a passing score on all three rubrics. The integrated nature of the project is the point — the candidates who can write the document well but cannot defend it verbally are not yet ready, and neither are the candidates who can talk fluently about it but cannot produce the structured written artifact.

## The final defense voice session

After submitting the document, schedule the final defense voice session (`final-project-defense.json` in this directory). The defense is a multi-turn dialogue with an external review panel persona consisting of three skeptics: a CMIO, a CFO, and a frontline physician. Each skeptic will press on the part of the design closest to their professional concerns. The session is 35–45 minutes — longer than the Module 4 and Module 8 voice sessions because it has to cover more ground. Read the voice-defense rubric before the session.

## Submission

Paste the document as a single discussion post in the final-project thread. Then schedule the defense voice session. Both must be complete for the final project to be graded.

## A note on what this is for

The boards test recognition. You have memorized the eight Sittig-Singh dimensions and the eight information-blocking exceptions and the eight Kotter steps and the five CDS Rights and the four A's and the three Donabedian categories and the three change-management frameworks and the eight statistical traps. You can recognize each of them in a stem and pick the right answer. That recognition is the bar for passing the boards and it is the necessary condition for the work, not the sufficient one. The job — the actual work of being a clinical informaticist whose institution is better off because you were there — is the integration of all of those frameworks on the same initiative under uncertainty under deadline pressure with leadership watching. Nobody walks into the job already able to do this. The final project is the rehearsal. The first time you do this for real, on an initiative your institution will fund, you will find that the document is harder than the test and that the conversation is harder than the document. Both are practiced. Both are practiced here.

Hold the threshold for retraction in writing. Then do the work.
