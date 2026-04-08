---
id: 04-interoperability-in-practice
title: Interoperability in Practice — HIEs, TEFCA, and Why Records Still Don't Follow Patients
order: 4
estimatedMinutes: 40
learningOutcomes:
  - Distinguish the major HIE architectures (centralized, federated, hybrid) and identify each from a description.
  - Name the U.S. national interoperability frameworks (eHealth Exchange, Carequality, CommonWell, TEFCA, QHINs) and explain how they relate.
  - Explain why technical interoperability has gotten substantially better since 2015 while patient experience of interoperability has not.
concepts:
  - hie-architecture
  - centralized-hie
  - federated-hie
  - hybrid-hie
  - ehealth-exchange
  - carequality
  - commonwell
  - tefca
  - qhin
  - record-locator-service
---

## Reading

The previous lesson was about integration *inside* a hospital. This one is about integration *between* hospitals and across the broader U.S. health system, which is a different problem with different actors, different standards, and different failure modes. The boards test both, and the candidates who do well are the ones who can distinguish "moving lab results from the LIS to the EHR within one hospital" (an interface engine question) from "moving a discharge summary from one health system's EHR to another health system's EHR across state lines with patient consent" (an HIE / national framework question). They are not the same question and they do not have the same answer.

## What a health information exchange actually is

A **health information exchange** (HIE) is an organization, a piece of infrastructure, or both, whose purpose is to enable electronic exchange of clinical information between organizations. The word "exchange" is used as both a noun (the entity) and a verb (the activity), and the boards use both senses. At the level of a board question, when you see "HIE" you should ask whether the question is about a specific organization (the Indiana HIE, the New York HIE, etc.) or about exchange-as-a-capability that an organization has.

HIEs come in several architectural patterns, and you need to know the patterns:

**Centralized HIE (consolidated model).** The HIE maintains a central repository — its own CDR — into which member organizations send copies of their data. Queries against the HIE go against the central repository. Pros: queries are fast, the data is in one place, the HIE owns the master patient index for its members. Cons: the HIE is now custodian of an enormous amount of clinical data with all the privacy, security, and governance burdens that come with it; member organizations have to trust the central operator; data freshness depends on how often each member pushes to the center.

**Federated HIE (distributed model).** Each member organization keeps its data in its own systems. The HIE maintains a *record locator service* (RLS) — an index that knows which patients have records at which organizations — and a query mechanism. When a clinician asks the HIE for records on a patient, the HIE looks up the patient in the RLS, queries each holding organization, and returns the results in real time. Pros: no central data store, less governance burden, data is always current. Cons: queries are slower (multiple network hops), every member organization has to maintain a queryable interface, and the RLS itself is a privacy-sensitive component.

**Hybrid HIE.** Some combination of the two. The HIE may centralize *summaries* (a CCD or C-CDA document for each patient encounter, indexed centrally) while leaving the underlying data federated. Most large U.S. HIEs in production use a hybrid pattern in some form. The boards expect you to recognize all three patterns and to identify which is being described in a stem.

The Indiana Network for Patient Care (mentioned in Module 1) is one of the longest-running HIEs in the U.S. and is largely centralized. CommonWell and Carequality (described below) are federated. Most state-level HIEs are hybrid. There is no single "right" architecture — each is a trade-off the local operators have made based on their member politics, their funding model, and their legal environment.

## The U.S. national alphabet soup

In addition to local and state HIEs, there is a layer of national frameworks that exist to let HIEs and health systems exchange across organizational and geographic boundaries. The boards test these by name and you have to know what each is.

**eHealth Exchange.** The longest-running national exchange network in the U.S. Originated in the federal Nationwide Health Information Network (NwHIN) initiative around 2008–2009 and was spun out into a non-profit (the Sequoia Project) that now operates it. eHealth Exchange connects federal agencies (VA, DoD, SSA, IHS), large health systems, and HIEs. It uses a defined set of standards and a trust framework — member organizations sign a common agreement and can then exchange with any other member.

**CommonWell Health Alliance.** Founded in 2013 by a group of EHR vendors led by Cerner (with Epic notably not initially a member). CommonWell provides patient identification, record location, and query/retrieve services across the EHRs of its members. It is essentially a federated HIE operated by a vendor consortium.

**Carequality.** Founded in 2014 by the Sequoia Project, Carequality is a *trust framework* — a legal and technical framework that lets different exchange networks (eHealth Exchange, CommonWell, EHR vendor networks, regional HIEs) interoperate with each other. Members sign the Carequality framework and gain the ability to exchange with all other members. Carequality is sometimes called a "network of networks" and is the closest thing to a national interoperability backbone that existed before TEFCA.

The relationship among these is the kind of thing the boards love to test. eHealth Exchange and CommonWell are *exchange networks*; Carequality is the *framework that connects them*. Epic eventually joined Carequality (2014), which made effectively all major U.S. EHRs reachable through the same legal and technical framework — a milestone the field treats as a turning point in U.S. interoperability.

**TEFCA — the Trusted Exchange Framework and Common Agreement.** Authorized by the 21st Century Cures Act and developed by ONC, with the Sequoia Project as the recognized coordinating entity. TEFCA is the federal effort to create a single national framework for interoperability — one trust framework, one common agreement, one set of policies that any qualified network can join. TEFCA went live in 2023 with the designation of the first **Qualified Health Information Networks** (QHINs).

**QHINs (Qualified Health Information Networks).** The networks designated by ONC under TEFCA. The first cohort of QHINs went live in 2023 and includes some of the existing national networks (eHealth Exchange, CommonWell, Epic's Carequality-affiliated network, Health Gorilla, Kno2, MedAllies, KONZA, and a few others). Once two organizations are connected to QHINs, they can exchange across QHINs through the TEFCA framework, regardless of whether they are members of the same underlying network. The boards will test the relationship between TEFCA, QHINs, and the older networks; the trick is to recognize that TEFCA does not replace the existing networks, it adds a federally-recognized layer above them and standardizes the rules for joining.

A note on chronology, because the boards sometimes test it:
- 2008–2009: NwHIN (federal); spun out as eHealth Exchange.
- 2013: CommonWell founded.
- 2014: Carequality founded; Epic joins.
- 2016: 21st Century Cures Act authorizes TEFCA.
- 2018–2022: TEFCA development period.
- 2023: First QHINs designated; TEFCA goes live.
- 2024 onward: Active use; ongoing QHIN onboarding.

## Why patients still don't have a unified record

This is the part of the lesson the boards quietly test through scenario questions. The technical infrastructure for nationwide interoperability now exists, is mandated, and is in production. Patients who request their own records from a major U.S. health system in 2026 can usually get them; third-party patient apps using SMART on FHIR can pull them; QHINs can move them between organizations. And yet most patients in 2026 still do not have a usable unified longitudinal record across the institutions that have cared for them. Why?

The reasons are not technical. They are some combination of:

- **Patient identification across organizations is still imperfect.** Without a national patient identifier (which the U.S. does not have, by federal law dating to a 1998 budget rider), every cross-organization match is probabilistic, and probabilistic matches have failure rates that compound across many organizations.
- **Document quality varies enormously.** A C-CDA from one hospital may be richly structured; from another may contain mostly free text; from a third may be present in name only.
- **Organizational incentives are mixed.** A health system that loses a patient to a competitor across the street has weak incentives to send a complete, helpful record to that competitor, regardless of what the law says about information blocking. The 21st Century Cures Act information blocking rule is the federal response to this exact pattern, and we will spend Module 7 on it.
- **Patient-mediated aggregation is real but small.** Apple Health, the patient apps using SMART on FHIR, and similar tools work for the patients who actively use them. Most patients do not.
- **Provider workflows do not yet incorporate the available data.** Even when records are technically retrievable, the workflow of pulling them into the encounter, reconciling them with what the local EHR shows, and acting on them is friction the average ED physician does not have time for. An imported record that nobody looks at is functionally not available.

The board move when you see a stem describing a "failure of interoperability" is to ask which level the failure is at — the four-level framework from Module 2. Most failures the press reports as technical are organizational; most failures the engineers report as content-format are semantic. The honest answer in 2026 is that the U.S. has made enormous progress on the technical layers and is still fighting through the organizational and workflow layers, and that the next decade's interoperability work is largely going to be about closing those gaps rather than adding more standards.

## Concrete example

A patient with a complex cardiac history travels from home in Indiana to a tertiary referral center in Ohio for a second opinion on a proposed valve replacement. The Indiana cardiologist sends the records electronically through the Indiana HIE, which is connected to a QHIN, which connects to the Ohio referral center's QHIN, which connects to the receiving health system's EHR. The technical chain works: the records arrive as C-CDA documents and are filed in the patient's chart at the Ohio center.

When the Ohio cardiologist sees the patient, the imported records are in the chart. They are also at the bottom of a long list of imported documents, none of which have been reconciled with the Ohio chart. The cardiologist scrolls through them quickly, sees that there is "outside data" but does not have time to read all of it during a 30-minute visit. The patient is asked the same history they gave in Indiana, the relevant values are re-entered into the Ohio EHR by the medical assistant, and a fresh echo is ordered because the cardiologist cannot quickly determine whether the imported echo is recent enough or whether the imported PDF is even readable.

Technically, this is interoperability working. The records moved. The patient experience is that nothing was actually shared — the patient gave the history twice, the system ordered a redundant test, and the imported data did not change the encounter. The gap is at the workflow and organizational layers, not the technical layer. The fix is not another standard or another network. The fix is workflow design, reconciliation tools, clinician time, and incentive alignment — and it is exactly the kind of work clinical informatics is supposed to do.

## Uncomfortable question

The U.S. has spent more than a decade and tens of billions of dollars building the technical infrastructure for nationwide interoperability. The infrastructure largely works. The patient experience has barely improved. If you had to choose between (a) one more major federal interoperability mandate focused on technical standards and (b) a smaller intervention focused on workflow and incentives, which would you push for, and why? Be honest about the political feasibility of each.

Hold your answer.
