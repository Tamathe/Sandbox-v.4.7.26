---
id: 01-what-is-clinical-informatics
title: What Clinical Informatics Actually Is (And Isn't)
order: 1
estimatedMinutes: 40
learningOutcomes:
  - Define clinical informatics in one sentence you could defend to a CMO.
  - Locate clinical informatics precisely against bioinformatics, public health informatics, and consumer health informatics.
  - Explain why "clinical informatics is just IT in healthcare" is wrong, and what the right framing buys you.
concepts:
  - clinical-informatics-definition
  - amia-core-competencies
  - bioinformatics-vs-clinical
  - public-health-informatics
  - consumer-health-informatics
  - sociotechnical-system
---

## Reading

Ask ten people in a hospital what clinical informatics is and you will get ten answers. The IT director will tell you it's the people who help configure the EHR. The CMO will tell you it's the doctors who make the IT director's work survive contact with clinicians. The fellow on rotation will tell you it's whatever was on last week's didactic. None of these are wrong, exactly, but none of them are the definition the field has agreed on, and the boards are written from the agreed definition.

The definition the field uses comes from AMIA and the Clinical Informatics subspecialty:

> **Clinical informatics is the application of informatics and information technology to deliver healthcare services. It promotes the understanding, integration, and application of information technology in healthcare settings to support and enhance clinical care.**

Read that twice. The load-bearing words are *application*, *integration*, and *support*. Clinical informatics is not the technology. It is not the deployment of the technology. It is the discipline of *making the technology actually do something useful in the messy environment where care happens*. The technology is necessary but not sufficient — and the "not sufficient" half is where the entire field lives.

The way to internalize this is to notice what clinical informatics is *next to*. There are four named informatics subfields that all touch healthcare and they are not interchangeable.

**Bioinformatics** is at the molecular and cellular level. Genomes, proteomes, sequence alignment, structure prediction. The unit of analysis is a molecule or a cell. The customers are bench scientists. If you are designing an algorithm to predict whether a missense variant is pathogenic, you are doing bioinformatics. The boards will give you a stem that mentions BLAST or GenBank to test whether you can spot it.

**Clinical informatics** — the subject of this course — is at the level of the individual patient and the clinical encounter. The unit of analysis is a patient. The customers are clinicians. If you are designing a CDS rule that fires when an order set is opened on a septic patient, you are doing clinical informatics.

**Public health informatics** is at the population level. Surveillance, registries, outbreak detection, vital statistics, immunization information systems. The unit of analysis is a population. The customers are health departments and policy makers. If you are designing a system to detect a foodborne illness cluster from emergency-department chief complaints, that's public health informatics.

**Consumer health informatics** is at the level of the individual person *outside* the clinical encounter. Patient portals, wearables, symptom checkers, personal health records. The unit of analysis is a person who is not currently being treated. The customers are patients and caregivers. If you are designing the patient-facing interface that lets someone download their lab results, you are doing consumer health informatics.

These four are not bright lines. A CDS module that uses pharmacogenomic data to dose warfarin sits squarely on the boundary between bioinformatics and clinical informatics. A patient portal that pushes population-level vaccine reminders is consumer-meets-public-health. The boards know this and will give you stems that live on the boundaries. The trick is to identify the *primary* unit of analysis. If the question is fundamentally about a single patient in a clinical encounter, it's clinical informatics, no matter how many genomes are involved.

Now to the hard part. The reason clinical informatics is its own field — and not just a subspecialty of IT, or a subspecialty of medicine, or a subspecialty of health services research — is that none of those parent disciplines on their own can produce someone who is good at the actual job. The actual job is to make a sociotechnical system work.

The word *sociotechnical* will appear in this course about a hundred times. It means: a system whose behavior is determined jointly by the technology *and* the humans, processes, organizations, and incentives wrapped around it. You cannot understand the behavior of an EHR by studying the EHR alone, any more than you can understand a hospital by studying its building. A clinical informaticist is someone trained to see both halves at once.

This is what people miss when they say "clinical informatics is just IT in healthcare." IT in healthcare is one of the inputs. The other inputs are clinical workflow, professional culture, regulatory environment, payer incentives, and the cognitive load of an exhausted resident at 3 a.m. A clinical informaticist who only sees the IT half will design beautiful systems that nobody uses. A clinical informaticist who only sees the clinical half will demand systems the technology cannot deliver. The training — and the boards — are built around producing people who can hold both at once.

A useful test: when something goes wrong with an EHR, who do you blame first? If your reflex is "the vendor," you are thinking like an IT manager. If your reflex is "the users need more training," you are thinking like an operations director. If your reflex is "let me see the workflow this is sitting inside of," you are starting to think like an informaticist. If your reflex is "let me see *which* failure mode this is, because there are eight of them and they need different fixes," you are thinking like a boarded informaticist. The Sittig-Singh sociotechnical model in Module 5 is what gives you those eight failure modes. For now, just absorb the move: from "who broke it" to "what shape of failure is this."

One more piece. The AMIA core competencies — which the ABPM content outline tracks closely — group the field into four practice domains: **fundamentals**, **clinical decision making and care process improvement**, **health information systems**, and **leadership and managing change**. Those are also, not coincidentally, the four ABPM exam domains and the four halves of this course's eight modules. Memorize that mapping now. When you see a board question, your first move should be "which of the four am I in?" because that tells you which mental model to load.

## Concrete example

Memorial Hermann Health System in Houston, around 2018, deployed a sepsis early-warning CDS tool that fired in the EHR when a combination of vital signs and labs crossed a threshold. On paper it was a beautiful piece of clinical informatics: literature-grounded thresholds, integrated into the existing order-entry workflow, validated retrospectively. In practice the alert fired so often, on so many patients who weren't actually septic, that within months the bedside nurses were dismissing it without reading it. Mortality didn't move. The IT team reported the system as "successfully deployed." The clinicians reported it as "noise."

The IT half of the project worked exactly as designed. The clinical half — the part where the alert had to compete for attention against twelve other alerts and a patient who needed a bedpan — did not. The fix, when it came, was not a software fix. It was a workflow change: the alert was rerouted to a centralized tele-ICU nurse who could investigate without interrupting the bedside, and the threshold was retuned. Mortality moved.

Notice what kind of professional that fix required. Not a vendor engineer. Not a clinician with no technical vocabulary. Someone who could read the alert logic, sit at the bedside, talk to the tele-ICU team, and see all three at once. That person is a clinical informaticist. That fix is what the field is for.

## Uncomfortable question

If clinical informatics is fundamentally about the sociotechnical system, why do board exams test it primarily through multiple-choice questions about standards, regulations, and definitions? What does the exam format select *for* and what does it select *against* — and does the answer to that question change how you should study?

Hold your answer. We will keep coming back to it.
