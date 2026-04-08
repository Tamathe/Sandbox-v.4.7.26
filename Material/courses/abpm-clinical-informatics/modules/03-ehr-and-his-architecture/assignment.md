---
id: assignment-03-ehr-architecture
moduleId: 03-ehr-and-his-architecture
title: Module 3 Capstone — Architecture Critique of a Real Hospital
rubric: written-thesis
estimatedHours: 3
---

# Capstone: Architecture Critique of a Real Hospital

## The scenario

Pick a hospital or health system you have worked at, rotated through, or know well enough to describe accurately. (If you have no first-hand experience, pick a published case study from JAMIA or *Applied Clinical Informatics* — there are several you can use.) Write a **1,000–1,400 word architecture critique** of how that hospital's EHR and HIS environment is put together, using the components, concepts, and trade-offs from this module.

This is the longest capstone in the course so far on purpose. The boards test the concepts; this assignment tests whether you can apply them to a system you actually know.

## What the critique must do

1. **Sketch the architecture.** Identify the major functional components — EHR application, CDR, integration engine, ancillary systems, ED system, perioperative system, lab, radiology, pharmacy, patient portal, data warehouse, billing — and say which vendor (or which configuration) provides each. A bulleted inventory is fine for this part.

2. **Locate the hospital on the best-of-breed-vs-integrated spectrum** and defend your placement. Few real hospitals are at either extreme; most have an anchor and a halo of specialty systems. Be specific about which components are integrated and which are separate.

3. **Identify two seams that you believe are operationally fragile** and explain why. A seam is the boundary between two systems where data flows from one to the other through an interface or shared store. Use the integration engine concepts (routing, transformation, queueing, acknowledgment, monitoring) and the four-level interoperability framework. Be specific — "the lab interface is fragile" is not enough; explain *which kind* of fragility and what monitoring (or absence of monitoring) makes it fragile.

4. **Pick one CPOE-related issue** at the hospital — alert fatigue, order set drift, a wrong-patient pattern, a documentation burden complaint that traces back to the order entry workflow — and classify it using the Koppel-style unintended-consequences taxonomy. Then propose one design or governance change you would make as the CMIO to address it.

5. **Apply Friedman's Fundamental Theorem** (from Module 1) to one component or workflow at the hospital and assess whether the partnership between clinician and system is actually delivering on the theorem's promise.

6. **End with one architectural change you would prioritize for the next year** and one *trade-off* of that change you are willing to accept. The trade-off matters — the boards reward you for naming what you are giving up, not just what you are getting.

## What the critique must NOT do

- Identify the hospital by name in a way that would compromise PHI or institutional confidentiality. "A 600-bed academic medical center in the Mountain West" is fine; "Hospital X in City Y" is not.
- Use real patient data even in abstracted form. Architectural critique can be done entirely from system descriptions; PHI is not required and not allowed. See the PHI Handling Policy.
- Recommend a specific vendor by name as a *replacement*. "The hospital should consider migrating from its current best-of-breed lab system to an integrated lab module" is fine; "the hospital should buy Epic Beaker" is naming a vendor and is out of scope for this assignment.
- Be drafted by an AI. See the AI Use Policy. You may use a model to help you recall the components from the lessons; you may not have it produce the prose.

## How it will be graded

By the **Written Analysis Rubric** (`rubrics/written-thesis.json`). The "Use of frameworks and vocabulary" criterion is the heaviest hitter for this assignment — graders are looking for the concepts from this module (and Modules 1 and 2) doing real load-bearing work in your reasoning, not appearing as decoration. The "Engagement with the strongest counter-argument" criterion will weigh against you if you describe a fragile seam without engaging with why the team that built it might have made the choice they did.

## Submission

Paste the critique as a single discussion post in the Module 3 capstone thread. The instructor will review against the rubric within five days. You may revise once.

## Why this assignment is the longest so far

The first two modules tested vocabulary and standards. This module tests *architecture*, which is the layer where everything you have learned so far has to fit together. There is no way to write a thoughtful architecture critique without holding several concepts in mind at once, and there is no way to do that without writing it down. The boards will give you stems that test the same composition skill. This capstone is the first place in the course where you are practicing that skill on a real system rather than on a textbook diagram, and the time investment is meant to match the difficulty.
