---
id: study-group-02-standards
moduleId: 02-clinical-data-standards
title: Module 2 Study Group — Drilling the Standards
estimatedMinutes: 60
---

# Module 2 Study Group — Drilling the Standards

## What this study group is for

This is the highest-volume rote-memorization module in the course. There is no clever framework that will let you skip knowing that ICD-10-PCS is for inpatient procedures and CPT is for outpatient ones; you have to know it. The study group exists to make the drilling less painful and more durable than doing it alone, because the standards are exactly the kind of material that survives spaced repetition with peers and decays fast in solitary cramming.

This is not a discussion thread. It is a coordinated drilling session that you should hold synchronously (over video, in person, or in the platform's voice room) at least twice during the module — once around the midpoint, once near the end before you take the mastery gate.

## Group size and composition

Three to five candidates. Smaller and the drilling gets stale; larger and people hide. Mix candidates who are taking the boards for the first time with anyone who has taken them before — the experienced candidates will know which questions actually appear and the new candidates will catch the experienced ones papering over things they have forgotten.

## Format

Each session has three rounds. Plan for about 60 minutes total.

### Round 1 — Vocabulary Speed Round (15 minutes)

One person reads a use case aloud. Everyone else writes down the right vocabulary on paper or in chat. Then the reader reveals the answer and the rationale. Move on. Repeat for ~20 use cases. The point of writing it down rather than calling it out is that everyone has to commit, including the people who would have followed someone else's answer.

Sample use cases to start with — generate more from the lessons:

- A registry needs to identify all patients with any form of heart failure.
- A pharmacy CDS rule needs to check for drug-drug interactions.
- A lab interface needs to identify what test was performed.
- A hospital is billing for an inpatient appendectomy.
- A primary care office is billing for a 15-minute follow-up visit.
- A FHIR Observation needs to express "37.2 °C."
- An ePrescribing message needs to identify the prescribed drug.
- The Medicare program needs to determine the payment for an inpatient stay.
- A research study needs to identify all patients with myocardial infarction across multiple institutions.
- A hospital needs a code for a power wheelchair being supplied to a Medicare patient.

The right answers are in the lessons. Do not look them up while you are answering — that defeats the point.

### Round 2 — Read the Message (20 minutes)

Pull up the example HL7 v2 ADT message from lesson 2 (or any other example you find online — there are thousands). Take turns reading one segment aloud and explaining what every field is doing. The person who has the floor cannot get help until they have made at least one wrong guess. The point of forcing the wrong guess is that the wrong guess is what cements the right answer.

Then do the same for a FHIR Observation example in JSON. Read it field by field. What is the LOINC code identifying? What is the UCUM unit? What is the reference to the patient resource doing? Why is the status field there at all?

If your group has access to a real production EHR's FHIR sandbox (Epic, Cerner, and several others publish them), pull a real Patient or Observation resource and read it together. Real data is messier than examples, and the messiness is the part the boards quietly test.

### Round 3 — The Eight Cases (20 minutes)

Each member of the group brings ONE clinical scenario to the session — abstracted, no PHI — and challenges the group to identify which standards the scenario would use end to end:

- What level of interoperability is required?
- What content standard moves the data?
- What transport carries it?
- What vocabularies encode the values?
- What implementation guide constrains the choices?
- Where is the most likely failure point?

The group debates each scenario for ~3–5 minutes, then moves to the next. The cases should be specific enough that the answer is not obvious — "send a lab result from one hospital to another" is too generic; "send a real-time positive blood culture from a community hospital lab to the state public health department's antimicrobial resistance surveillance system" is the right level of specific.

The capstone assignment is exactly this kind of case, so the practice doubles as preparation.

## After the session

Each member commits to one thing they did not know cold and will drill on their own before the next session. Write it down. Share it in the group's chat. Hold each other accountable, gently.

Reminder: PHI handling applies to study group sessions just as it does to discussion threads. Cases must be abstracted before they are presented. If anyone in the session brings a case that is too thin to abstract safely, the group's job is to push back, not to play along.

## Why this is a study group and not a discussion thread

Standards drilling is cooperative, fast, and synchronous. Discussion threads are asynchronous and slower-paced — better for case reasoning and steel-manning, worse for rote drilling. Both belong in the course; they belong on different kinds of material. The boards reward both kinds of preparation, and you will do better if you do not try to substitute one for the other.
