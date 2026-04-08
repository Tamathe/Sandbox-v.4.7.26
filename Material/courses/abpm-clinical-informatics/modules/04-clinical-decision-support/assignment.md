---
id: assignment-04-cds
moduleId: 04-clinical-decision-support
title: Module 4 Capstone — Design a CDS Intervention From Scratch
rubric: written-thesis
estimatedHours: 3
---

# Capstone: Design a CDS Intervention From Scratch

## The scenario

Your hospital's quality committee has identified a gap: patients with confirmed atrial fibrillation and a CHA₂DS₂-VASc score of 2 or higher are not being consistently started on appropriate anticoagulation. The gap is across both inpatient and outpatient settings. The committee has asked you, as the informatics representative, to design a CDS intervention to close it.

You may not propose "an alert" without doing the work. The work is the assignment.

## What the design memo must do

Write a **1,200–1,600 word CDS design memo** that contains:

1. **A clear statement of the gap and the desired outcome.** What is the current rate, what would success look like in twelve months, and what is the metric you will use to measure it?

2. **An analysis of the workflow** in which the gap occurs. Where in the patient journey does the decision to anticoagulate get made (or not made)? What clinicians are involved? What information do they have at the moment of the decision, and what is missing?

3. **A proposed CDS intervention package** — not a single alert, but a coordinated set of CDS interventions that together address the gap. Use the full range of modalities from lesson 1 (alerts, order sets, documentation templates, infobuttons, dashboards, predictive scores, workflow changes, patient-facing reminders). Justify each modality choice.

4. **An explicit walk through the Five Rights** for the most prominent intervention in your package. Show your work — this is the part the rubric weighs most heavily.

5. **An anti-alert-fatigue plan.** What governance, tuning, audit, retirement, and tiering decisions will you put in place from day one to prevent the intervention from contributing to fatigue? "We will monitor it" is not enough; specify what monitoring, who reviews, what triggers action.

6. **An evaluation plan.** How will you know in six months whether the intervention is working, and what specifically would convince you to retire or redesign it? What is your appropriate-override rate target, what is your clinical outcome metric, and how often will you review them?

7. **An honest acknowledgment of what could go wrong.** Apply Friedman's Fundamental Theorem (Module 1) to the most prominent piece of the intervention. Is the partnership clinician-plus-CDS actually expected to outperform the clinician unassisted, in the actual workflow? What is the most likely way that expectation fails?

## Optional architectural element

If you want to push the assignment further, design the intervention in the modern CDS Hooks / FHIR / CQL stack from lesson 5 rather than as embedded EHR rules. Specify which hook events you would use (`patient-view`, `order-sign`, etc.), what data the CDS service would need from the FHIR API, and what cards it would return. The optional element is not graded separately but reflects on the "use of frameworks" criterion.

## What the memo must NOT do

- Default to "an alert at chart open" without engaging with the alternatives.
- Skip the Five Rights walk. The walk is the point.
- Use real patient data even abstracted. Hypothetical scenarios only.
- Be drafted by an AI. See the AI Use Policy.

## How it will be graded

By the **Written Analysis Rubric**. The "Use of frameworks and vocabulary" criterion weights heavily — graders look for the Five Rights, the Osheroff modality vocabulary, the alert-fatigue mitigations, and Friedman's theorem all doing real work in the analysis. The "Engagement with the strongest counter-argument" criterion will weigh against you if you do not engage with the anti-CDS objection (the strongest version of which is "the field has been deploying CDS for AFib anticoagulation for two decades and the gap persists; what makes you think your design is different?").

## Submission

Paste the memo as a single discussion post in the Module 4 capstone thread. After submission, you will defend the design verbally in the Module 4 voice session (`voice-session.json`). The voice session is graded by the voice-defense rubric. Plan accordingly: write the memo so that you can defend it in conversation, not so that it sounds good on paper.

## A note on what this assignment is for

CDS design is the place where almost everything you have learned in this course so far has to come together — vocabularies, data models, workflow, sociotechnical fit, and the discipline of saying no to easy interventions. The boards test the components individually; real CDS work tests whether you can hold them all in mind at once. This capstone, plus the voice session that follows, is where you find out whether you can.
