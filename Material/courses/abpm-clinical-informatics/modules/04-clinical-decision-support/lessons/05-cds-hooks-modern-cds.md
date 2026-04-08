---
id: 05-cds-hooks-modern-cds
title: CDS Hooks and Modern CDS — Externalized, FHIR-Based, and Finally Portable
order: 5
estimatedMinutes: 35
learningOutcomes:
  - Explain what CDS Hooks is, how it works, and what makes it different from the older approaches.
  - Name the standard hooks (patient-view, order-select, order-sign, order-dispatch, encounter-start, etc.) and identify each from a board stem.
  - Articulate the modern CDS architecture: EHR fires hooks, external service evaluates rules, returns cards, EHR renders them in workflow.
concepts:
  - cds-hooks
  - hook-events
  - cds-cards
  - externalized-cds
  - smart-on-fhir-cds
  - cqi-and-cql
  - patient-view-hook
  - order-sign-hook
---

## Reading

This lesson is the modern counterpoint to the previous one. The earlier knowledge representation efforts tried to standardize the *language* of clinical rules and ran into the problem that the surrounding data, vocabulary, and trigger infrastructure was not standardized. The modern approach inverts the problem: standardize the data (FHIR), the vocabulary (LOINC, SNOMED, RxNorm, UCUM), and the trigger model (CDS Hooks), and then the logic can live wherever you want. The result is the first CDS architecture in the field's history that has a credible path to actual portability — not because the logic is more clever, but because the infrastructure under the logic has finally reached the point where portability is mechanically possible.

The boards expect you to know CDS Hooks by name, to recognize the major hook events, and to be able to explain the modern architecture to a non-technical audience. CDS Hooks has appeared on board questions in increasing frequency since around 2022 and is now a high-yield topic.

## What CDS Hooks is

**CDS Hooks** is a specification — currently maintained as an HL7 specification — that defines how an EHR can call out to an external CDS service at specific points in clinical workflow. The architecture is straightforward:

1. The EHR is configured to know about one or more **CDS Hooks services**, each of which is an HTTP endpoint.
2. At specific workflow events — opening a patient chart, starting a medication order, signing an order — the EHR fires a **hook** by making an HTTPS POST request to the CDS service.
3. The request body contains a small bundle of FHIR data describing the context: which patient, which user, which encounter, and any context-specific resources (the medication being ordered, the lab being viewed, etc.).
4. The CDS service evaluates whatever rules it cares about against the data, optionally fetching additional data from the EHR's FHIR API if it needs more, and returns a JSON response containing zero or more **cards**.
5. The EHR renders the cards in the user interface — as a banner, a popup, a side panel — at the workflow point where the hook fired.

That is the entire model. The EHR is the host. The CDS service is the guest. They communicate over HTTPS, with FHIR resources as the data format and a small CDS Hooks-specific JSON envelope around them. The CDS service can be operated by anyone — the EHR vendor, the hospital, a third party, an academic medical center, a vendor of specialty CDS — and can be swapped, added, or removed without modifying the EHR's code.

The architectural shift is that the CDS rules no longer live inside the EHR. They live wherever the CDS service lives. The same service can be called from multiple EHRs at multiple hospitals, each of which exposes its data through US-Core FHIR. The portability that Arden and GLIF aspired to is achieved not by standardizing the rule language but by standardizing the data, the trigger, and the output card format and letting the rule itself be whatever the service author wants.

## The standard hooks

The CDS Hooks specification defines a small set of standard hook events. The boards have started to test the hook names, and you should recognize at least the following:

- **`patient-view`** — fires when the user opens a patient chart. Used for general chart-level alerts, preventive care reminders, risk score displays, and similar context-level interventions. The most general-purpose hook.
- **`order-select`** — fires when the user begins selecting an order but has not yet completed it. Used for early-warning interventions during order composition, such as suggesting alternatives.
- **`order-sign`** — fires when the user is about to sign one or more orders. The point at which interactive checks (drug-drug interaction, dose range, allergy) make sense. Most analogous to the classical interruptive medication alert.
- **`order-dispatch`** — fires when an order is being sent to its execution destination (the lab, the pharmacy, etc.). Used for downstream coordination.
- **`encounter-start`** — fires when an encounter begins, e.g., a patient is checked in for an outpatient visit or admitted for an inpatient stay.
- **`encounter-discharge`** — fires when an encounter is ending, e.g., discharge is being prepared. Used for transition-of-care interventions.

The full list is a small number of events and is published in the CDS Hooks specification. The boards test the *concept* — that there are named hooks for named workflow events — more often than they test the exhaustive list. If you recognize `patient-view`, `order-select`, and `order-sign` by name, you have most of the question covered.

## CDS cards — what the service returns

The response from a CDS Hooks service is a JSON document containing zero or more **cards**. A card is the unit of intervention the service is recommending. Each card has:

- A **summary** (a short human-readable headline).
- A **detail** (a longer explanation, optional, in markdown).
- An **indicator** (info, warning, or critical — used by the EHR to determine visual styling and severity).
- A **source** (citation information, so the user can see who is making the recommendation and trace it back).
- Optional **suggestions** — structured proposals the user can accept with one click (e.g., "place this order instead").
- Optional **links** — out-bound links to external resources, including SMART app launches.
- Optional **overrideReasons** — pre-defined override reasons the user can select if they dismiss the card.

The card structure is what makes the rendering portable. The EHR does not need to know what the rule was; it just needs to render the card. The same card schema works across vendors, and the EHR's CDS Hooks rendering layer is a one-time integration that handles all future external CDS services without per-service code.

## SMART on FHIR + CDS Hooks

CDS Hooks is closely related to SMART on FHIR (from Module 2), and the two are often deployed together. SMART on FHIR governs how third-party apps launch from inside an EHR with OAuth-authorized access to patient data. CDS Hooks governs how external services are called by the EHR with patient context. The combination — sometimes called SMART/CDS Hooks or just *SMART CDS* — is the modern architectural pattern for externalized clinical decision support in the U.S.

A typical pattern: a CDS Hooks card returned by an external service can include a SMART app launch link as one of its actions. The user clicks the link, the EHR launches the SMART app with the relevant patient context, and the user can interact with the full SMART app experience for whatever the rule recommended. The CDS Hooks call is the lightweight, in-workflow intervention; the SMART app launch is the deeper experience for cases where the lightweight intervention is not enough.

The boards test the relationship between the two by name. If a stem describes "an external CDS service that is invoked from the EHR at workflow events and returns suggested actions as cards," the answer is CDS Hooks. If a stem describes "a third-party app launched from inside the EHR with OAuth scopes," the answer is SMART on FHIR. If a stem describes both — and they often appear together — the answer is the combination, sometimes phrased as "SMART/CDS Hooks" or "SMART app launched from a CDS Hooks card."

## CQL — the logic language for modern CDS

**CQL** (Clinical Quality Language) is the HL7 standard for expressing clinical logic in a form that can be evaluated against FHIR data. It is the modern descendant of the Arden/GLIF lineage but is designed around FHIR's data model rather than around its own. CQL is human-readable, version-controlled, and increasingly the way new CDS rules and quality measures are written for portability.

CQL is the language the CMS **electronic clinical quality measures (eCQMs)** are written in — the measures hospitals and clinicians have to report under various federal programs. Writing a quality measure in CQL means it can be evaluated by any system that exposes the right FHIR data, which is the entire point. The boards have started to test CQL by name as the standard for clinical logic in the modern stack.

The relationship among the modern pieces:

- **FHIR** is the data model.
- **US Core** is the implementation guide that constrains FHIR for U.S. use.
- **CQL** is the logic language that expresses rules over FHIR.
- **CDS Hooks** is the trigger and integration model that calls services at workflow events.
- **SMART on FHIR** is the launch and authorization model for richer interactions.

A modern, portable CDS intervention uses all five together: the EHR exposes US-Core-conformant FHIR, a CDS service receives CDS Hooks calls at workflow events, evaluates CQL logic against the FHIR data, returns cards with optional SMART launch links, and the EHR renders the cards in workflow. The combination is what knowledge representation has been trying to deliver for forty years and is now actually starting to work.

## What this changes for the field

A few things that the externalized model makes possible that were difficult or impossible with embedded CDS:

- **Specialty CDS by specialty experts**, deployed across multiple hospitals without each hospital having to rebuild it. Cardiology rules from cardiology, oncology rules from oncology, infectious disease rules from infectious disease, each maintained by the experts in the field rather than by the local EHR team.
- **Faster updates** when a guideline changes. The CDS service updates its logic; every EHR calling the service gets the new behavior at the next call, with no EHR-side deployment.
- **Easier evaluation**. Because the service is a discrete component, its inputs and outputs can be logged centrally, and the effect of a rule change can be measured cleanly.
- **Lower vendor lock-in**. CDS rules that live in the EHR's proprietary rule engine are lost if the hospital migrates EHRs. CDS rules that live in an external CDS Hooks service follow the hospital across migrations.
- **Smaller blast radius for bad rules**. If an external service produces a bad card, the EHR can disable that service without affecting the rest of CDS. If a rule embedded in the EHR's engine is bad, fixing it is harder.

The boards reward you for naming these benefits and for distinguishing them from the marketing pitch that "FHIR solves CDS." FHIR is necessary; the externalized model is what makes it sufficient.

## What this does NOT change

A few things the externalized model does *not* automatically fix and that the boards expect you to recognize:

- **The Five Rights still apply.** A bad CDS Hooks card that fires at the wrong time, in the wrong format, for the wrong person is just as bad as a bad embedded alert. The architecture does not absolve the design.
- **Alert fatigue is still a risk.** Externalized CDS makes it easier to add new services, which can compound rather than relieve fatigue if not governed.
- **Knowledge maintenance is still ongoing work.** The rules still go stale; the difference is that the staleness now lives in one place rather than many.
- **Vocabulary and data quality still matter.** A CDS Hooks service is only as good as the FHIR data it receives. If the EHR's FHIR API is incomplete, lossy, or inconsistent, the CDS service will produce wrong recommendations.

The externalized model is a substantial improvement; it is not a solution to the problems that were fundamentally about clinical and human design rather than about software architecture.

## Concrete example

A health system wants to deploy a sepsis early-warning CDS intervention developed by an academic medical center across the country. In the embedded-CDS era, the deploying hospital would have had to either rewrite the rule in its own EHR's rule engine (re-implementing the logic, the data bindings, and the alert configuration) or wait for its EHR vendor to integrate the rule into a future release. Both paths are slow, expensive, and brittle.

In the modern externalized model, the academic medical center operates the rule as a CDS Hooks service at a stable HTTPS endpoint. The deploying hospital configures its EHR to call the service on the `patient-view` hook for all admitted patients. The service receives the patient's context, fetches additional FHIR data (vital signs, recent labs, current medications) from the hospital's FHIR API, evaluates its CQL logic, and returns a card with the patient's sepsis risk score and recommended next steps. The hospital's EHR renders the card on chart open. The deployment took weeks rather than months, the academic center's team continues to maintain and improve the rule, and the deploying hospital can disable the service with one configuration change if it stops working as expected.

The boards have started to test this exact pattern. If you can recognize "the rule lives at an external endpoint, the EHR fires hooks, the service returns cards, the EHR renders them" as the modern pattern, you have most of the related questions covered.

## Uncomfortable question

The modern CDS architecture is technically clean, conceptually elegant, and increasingly deployable. It still does not, in 2026, dominate production CDS in U.S. hospitals — most CDS is still embedded vendor rules with all the limitations the previous lessons described. Why? Is the bottleneck technical readiness, vendor incentives, hospital governance, or the absence of CDS services worth subscribing to — and which of these is the one a clinical informaticist can actually move?

Hold your answer.
