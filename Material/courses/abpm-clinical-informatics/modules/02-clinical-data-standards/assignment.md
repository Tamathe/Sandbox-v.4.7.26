---
id: assignment-02-standards
moduleId: 02-clinical-data-standards
title: Module 2 Capstone — A Standards Choice Memo for a New Project
rubric: written-thesis
estimatedHours: 2
---

# Capstone: A Standards Choice Memo

## The scenario

Your hospital is starting a new project: a real-time outbound feed of all positive blood culture results to the local public health department for antimicrobial resistance surveillance. The lab director, the infection prevention team, the public health department, and your IT integration team are all in the room. The CMIO has asked you to write a one-page (~800 words) **standards choice memo** that says, for each piece of the project:

- which content standard the feed should use (HL7 v2? FHIR? CDA? something else?),
- which vocabularies should encode the test, the organism, the susceptibilities, and any patient demographics,
- which transport should move the messages,
- and what *implementation guide* (if any) the project should conform to.

The memo will be circulated to a non-technical leadership audience that includes the CMO and the public health department's director, neither of whom can be assumed to know FHIR from CPT.

## What the memo must do

1. **State a single recommended technical stack** — content standard, transport, vocabularies, implementation guide. Do not give a menu. Pick one and defend it.
2. **Justify each choice in one paragraph**, in language a non-informaticist would accept, with a one-sentence sketch of what would go wrong if a different choice were made.
3. **Identify the level of interoperability** the project needs to achieve and identify the specific risk at each level. Use the four-level framework from lesson 1 explicitly.
4. **Acknowledge the legacy interface question.** Most hospitals' lab systems already speak HL7 v2. Your recommendation must address whether this project should use what already exists or build something new, and why.
5. **State one open question** you do not yet have an answer to. The boards reward people who know what they do not know. So do leadership audiences.

## What the memo must NOT do

- Recommend a vendor by name.
- Use FHIR as a default just because it is the modern standard, without engaging with whether the lab system actually exposes FHIR for this use case.
- Recommend SNOMED for everything just because it has the most concepts. Each piece of the project needs the *right* vocabulary, not the most expressive one.
- Be longer than 1000 words. Brevity is part of the assignment.
- Be drafted by an AI. See the AI Use Policy. You may use a model to quiz yourself before writing; you may not have it produce the prose.

## How it will be graded

By the **Written Analysis Rubric** (`rubrics/written-thesis.json`). The "Use of frameworks and vocabulary" criterion is heavily relevant here — graders will look for the four-level interoperability framework and the standards taxonomy from lesson 1 doing real work in your reasoning, not appearing as decoration.

## Submission

Paste the memo as a single discussion post in the Module 2 capstone thread. The instructor will review against the rubric within five days. You may revise once.

## A note on what this assignment is for

The reason this kind of memo matters is that it is the artifact a real informaticist produces every few months. Standards choices made early are nearly impossible to undo, and the choices made by people who do not understand the trade-offs become the next decade's technical debt. The boards test the components by name; the work tests whether you can assemble them under pressure.
