---
id: 04-safer-guides-and-ehr-safety
title: SAFER Guides and EHR Safety — The Self-Assessment You Should Already Be Doing
order: 4
estimatedMinutes: 30
learningOutcomes:
  - Name the SAFER Guides and identify what each is for.
  - Apply at least two SAFER Guide recommendations to a hospital scenario.
  - Explain why the SAFER Guides exist as self-assessment tools rather than as regulatory requirements.
concepts:
  - safer-guides
  - ehr-safety-self-assessment
  - high-priority-practices
  - organizational-responsibilities
  - patient-identification-safer
  - cpoe-safer
  - test-results-safer
  - downtime-planning
---

## Reading

The **SAFER Guides** (Safety Assurance Factors for EHR Resilience) are a set of nine self-assessment guides published by ONC for use by hospitals and clinics to evaluate the safety of their EHR implementation and use. They were developed by Dean Sittig, Hardeep Singh (yes, the same authors as the sociotechnical model), and colleagues, and were first released in 2014 with periodic updates since. The boards test the SAFER Guides by name, expect you to know what they are for, and expect you to recognize the topics they cover. This lesson is shorter than the others in the module because the content is largely a checklist; the discipline of treating SAFER as a routine practice is the part that matters.

## What the SAFER Guides are

Nine guides covering different aspects of EHR safety. Each guide contains a set of recommended practices, organized by priority, with worksheets that an institution can use to self-assess whether the practice is in place. The guides are *voluntary* — they are not regulatory requirements — and the assessment is meant to be done internally by the institution, not by external auditors. The intent is that hospitals use them as a structured way to identify gaps in their own EHR safety practices and prioritize fixes.

The nine guides are organized into three categories.

**Foundational guides** (the underlying capabilities every safe EHR implementation needs):

1. **High Priority Practices** — the small set of practices the authors believe are most important. If a hospital reads only one guide, this is the one. Topics include patient identification, communication of test results, electronic ordering, downtime planning, and organizational governance.
2. **Organizational Responsibilities** — the leadership and governance structures that make EHR safety possible. Who owns EHR safety. How decisions get made. How issues get escalated.

**Infrastructure guides** (the technical and operational layer):

3. **Contingency Planning** — what happens when the EHR is down. Downtime procedures, paper backup systems, recovery protocols, communication during outages.
4. **System Configuration** — how the system is set up at the technical level. Defaults, naming conventions, alert configurations, the operational decisions that constrain how clinicians use the system.
5. **System Interfaces** — the integration engine and the interfaces between systems. The dimension covered in Module 3.

**Clinical process guides** (the workflow and use layer):

6. **Patient Identification** — the practices that ensure each clinical action is associated with the correct patient. Wristbands, two-identifier verification, photo display, patient lookup design, duplicate record prevention. The MPI from Module 3 is part of this guide's territory.
7. **Computerized Provider Order Entry with Decision Support** — the practices around CPOE and CDS from Modules 3 and 4. Order set governance, alert tuning, override audits, content maintenance.
8. **Test Results Reporting and Follow-up** — the practices around how lab and imaging results reach clinicians and how follow-up happens. The closed-loop reporting workflow, critical value notification, missed result tracking.
9. **Clinician Communication** — the practices around handoffs, sign-out, secure messaging, and clinician-to-clinician coordination through the EHR.

The boards expect you to recognize the names of the guides and to know which topic each covers. The exam item writers do not require memorization of the specific recommendations within each guide, but they do expect you to map a stem to the relevant guide.

## How they are used in practice

A hospital that runs a SAFER assessment typically convenes a cross-disciplinary team — informatics, IT, nursing, medical staff, quality, sometimes legal — and walks through one guide at a time. The team rates each recommended practice as "fully implemented," "partially implemented," or "not implemented," and decides which gaps are the highest priority to close. The output is a remediation plan with assigned owners and deadlines.

The guides are deliberately designed to be do-able by the institution itself, without external consultants, in a reasonable amount of time. A full SAFER assessment can take a few days to a few weeks of effort and produces a concrete list of safety improvements. The boards reward you for naming SAFER as the right answer when a stem asks "how should a hospital systematically evaluate its EHR safety practices?"

## High-Priority Practices — the topics worth knowing in detail

The High Priority Practices guide is the one to know best because the topics in it appear most often on the boards. The recommendations cluster around these themes:

**Patient identification.** Two-identifier verification at every clinical action. Photo display in the chart. Distinct visual treatment for the active patient context. Confirmation when switching charts. Duplicate record prevention through MPI hygiene. The boards have asked questions about wrong-patient errors and the right answer is some combination of these practices.

**Communication of critical test results.** A defined process for ensuring critical results reach the responsible clinician. Closed-loop notification (the result is sent, the clinician acknowledges, the system records the acknowledgment). Backup channels (page, phone, escalation). The recurring failure mode is a critical result that arrived in the EHR's secure messaging and was never read; the SAFER recommendation is to use an active channel for critical-criticality results.

**Electronic ordering safety.** CPOE practices from Module 3 — order set governance, alert configuration, default values, dose-range checking, allergy checking, drug-drug interaction tuning. Joint Commission-style requirements about high-alert medications.

**Downtime planning.** Every EHR will be down at some point. Planned downtime for upgrades, unplanned downtime from infrastructure failure, prolonged downtime from cyberattack. The practices include having paper backup procedures, training staff on them, drilling them annually, and having a recovery process for catching the EHR up after the outage. The cyberattack scenario has become much more important since 2020 — health systems hit by ransomware have experienced multi-week outages with serious clinical consequences, and the SAFER downtime guidance has been updated accordingly.

**Organizational governance.** A named owner for EHR safety. A process for surfacing and tracking safety issues. A way for clinicians to report problems without bureaucratic friction. A leadership commitment to allocate resources for safety work.

The boards have asked questions about each of these topics and the answers reference SAFER recommendations.

## Why SAFER is voluntary and what that means

A specific point the boards sometimes test is that SAFER is voluntary. No regulator requires SAFER assessments. CMS does not condition payment on them. The Joint Commission does not include them in survey requirements (though some of the SAFER recommendations align with Joint Commission elements of performance). The voluntary status is deliberate — the authors and ONC believed that mandatory checklists would produce compliance theater, while voluntary tools used by institutions that actually wanted to improve would produce real improvement.

The result is that SAFER is used heavily in some institutions and ignored in others, and the institutions that ignore it are not penalized in any direct way. Whether this was the right design decision is debated. The boards do not test the debate but expect you to know that SAFER is voluntary and is meant to be used by institutions that take EHR safety seriously rather than by institutions complying with a mandate.

## Concrete example

A 400-bed community hospital experiences a wrong-patient medication error: a clinician opened patient A's chart, was interrupted, switched to patient B's chart for a quick lookup, did not switch back, and signed an order intending it for patient A. The order went to patient B, was administered, and produced a clinically significant adverse event.

The hospital's response includes an immediate root-cause analysis and a SAFER assessment focused on the Patient Identification Guide. The assessment surfaces several practices that were not in place: no photo in the patient banner, no visual distinction for the active patient context, no confirmation when switching between charts, and the patient name and MRN were displayed only at the very top of the screen in a small font.

The remediation plan adds: photo in the patient banner, a colored frame around the active patient context, a confirmation prompt when switching charts in the middle of an open order, and the patient name and MRN displayed in a larger font at the top of the order entry screen. The hospital also commits to running the full SAFER High Priority Practices assessment annually.

Twelve months later, the hospital has not had another wrong-patient medication error of the same type, and the clinical staff report that the visual cues are useful rather than disruptive. The fix is structural and traceable to specific SAFER recommendations.

The boards reward you for naming SAFER as the framework, identifying the relevant guide, and mapping the recommendations to the fix.

## Uncomfortable question

SAFER has been available since 2014, is freely accessible from ONC, and is built around the kind of common-sense safety practices that nobody disputes. Most U.S. hospitals have not run a complete SAFER assessment in years, if ever. If the tool is good and the cost is low, what is the bottleneck — and is the answer "make it mandatory" actually the right move, or would mandating it produce the compliance theater the original design tried to avoid?

Hold your answer.
