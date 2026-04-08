---
id: 03-short-history-of-clinical-informatics
title: A Short History of Clinical Informatics — From Lockheed to the Cures Act
order: 3
estimatedMinutes: 40
learningOutcomes:
  - Tell the arc of clinical informatics from the 1960s to the present in one breath.
  - Name the systems and people the boards still test on (Lockheed/Technicon, COSTAR, HELP, Regenstrief, the Indiana Network, the VA's VistA).
  - Explain why Meaningful Use is the inflection point that produced both the modern EHR landscape and the modern complaints about it.
concepts:
  - early-his-systems
  - meaningful-use
  - hitech-act
  - vista-history
  - regenstrief-medical-record
  - help-system
  - cures-act-history
---

## Reading

The version of clinical informatics history you need for the boards is shorter than the textbook version and longer than the elevator pitch. It is built around a small number of named systems, a few people, and three big inflection points. Memorize the names; the boards reuse them.

The story starts in the **1960s**, when the idea of putting hospital data into a computer first became technically possible and several institutions tried it more or less in parallel. The systems that survived in board questions are these:

The **Technicon Medical Information System**, developed at El Camino Hospital in California with Lockheed (yes, the aerospace company) starting in 1965, is usually cited as the first true hospital information system. It did order entry, results review, and basic charge capture. It worked. People hated it and loved it in roughly equal measure, which set the template for every EHR conversation for the next sixty years.

The **HELP system** (Health Evaluation through Logical Processing), developed at LDS Hospital in Salt Lake City under Homer Warner, was the first major system to integrate clinical decision support into routine workflow. The lineage runs from HELP to modern Intermountain Healthcare, and Warner is one of the founding figures of the field. If a board question mentions HELP, the answer is almost always about CDS or about the Intermountain heritage.

**COSTAR** (Computer-Stored Ambulatory Record), developed at Massachusetts General Hospital starting in 1968, was the first widely-used outpatient EHR. It was eventually distributed to dozens of community health centers and is the ancestor of much of what ambulatory EHRs do today.

The **Regenstrief Medical Record System**, developed at Indiana University starting in 1972 under Clement McDonald, is the system most associated with the modern conception of structured clinical data and with health information exchange. The Regenstrief Institute also gave the field LOINC, which we'll cover in Module 2. The **Indiana Network for Patient Care**, which grew out of Regenstrief, is one of the first and longest-running health information exchanges in the world.

The **VA's VistA**, developed beginning in the 1980s by the underground "hardhats" group of clinician-programmers within the Department of Veterans Affairs, became one of the largest EHR deployments in the world and the system most associated with the idea that an open, clinician-built EHR could outperform commercial systems on usability and clinical outcomes for a long time. VistA's recent history is a sadder story — the VA is now migrating to commercial Cerner — but for board purposes you should know what VistA was, who built it, and why it mattered.

That is the cast of characters from the founding era. The pattern across all of them is that they were built by small teams of clinicians and programmers working closely together, often within a single institution, and they encoded local clinical practice deeply enough that they often could not be ported to other institutions without effectively rebuilding them. This is the original sin of clinical informatics: every successful early system was a snowflake, and the field has been trying to get the benefits of the snowflakes without their non-portability ever since.

The **second era** runs from roughly the late 1990s through 2009, when commercial vendors — Epic, Cerner, Meditech, Allscripts, and a handful of others — took over the market. The clinical depth often went down. The standardization went up. Penetration of EHRs into hospitals and clinics grew slowly. The federal government noticed and decided to push.

The push was the **HITECH Act of 2009**, part of the post-financial-crisis ARRA stimulus package. HITECH created the **Meaningful Use** program, which paid hospitals and clinicians billions of dollars in Medicare and Medicaid incentives to adopt and *meaningfully use* certified EHRs. "Meaningful use" was defined in three stages, each with progressively harder requirements: Stage 1 was about adopting and capturing data, Stage 2 was about exchanging it, Stage 3 was about using it to improve outcomes. In practice, the program was the largest single intervention in the history of health IT and it produced two things: a near-universal jump in EHR adoption (from roughly 10% of hospitals using a basic EHR in 2008 to over 90% by 2017), and an enormous backlash against the resulting workload, alert fatigue, and clinician burnout.

You need to be able to talk about Meaningful Use carefully on the boards. Know the three stages, know that it was administered by CMS with certification by ONC, know that it transitioned into the **Promoting Interoperability** program under MIPS, and know that it is the reason every hospital in the United States has the same shortlist of EHR vendors today. The exam will test the structure, not your opinion, but the structure is genuinely worth knowing because it explains everything that came after.

The **third era** is the post-Meaningful-Use era, roughly 2016 to now, dominated by two pieces of legislation and one technical standard.

The **21st Century Cures Act of 2016** introduced, among many other things, the **information blocking rule**: it became illegal for providers, EHR vendors, or health information exchanges to interfere with the access, exchange, or use of electronic health information, with eight specific exceptions. The rule was operationalized by ONC in regulations that took full effect in 2022. We'll cover the eight exceptions in detail in Module 7. For now, internalize that information blocking is the most aggressive interoperability mandate in U.S. health IT history, and that the question "is this information blocking?" is one a clinical informaticist now has to be able to answer.

The technical standard is **FHIR** (Fast Healthcare Interoperability Resources), which we'll spend a full lesson on in Module 2. FHIR is the modern HL7 standard for exchanging clinical data via web APIs. It is what made the Cures Act enforceable in practice, because for the first time there was a standard that vendors could actually implement and that small developers could actually consume.

The other thing happening in this era is the slow unwinding of the assumption that the EHR is the *center* of the clinical world. Cloud-based ancillary systems, FHIR-based third-party apps, ambient documentation tools, and AI scribes are eating tasks that used to live in the EHR. Whether the EHR-as-platform model survives the next decade is an open question and a fair fight.

A useful way to hold the whole arc: the founding era was about *whether* computers could do clinical work at all (yes, but only with deep clinical involvement). The commercial-and-Meaningful-Use era was about *getting everyone onto the same systems* (achieved, with side effects). The current era is about *whether the data can actually flow* (legally yes, technically increasingly yes, in practice still limited by business incentives). Each era's victory created the next era's problem.

## Concrete example

The Indiana Network for Patient Care, descended from the Regenstrief Medical Record System, has been operating continuously since the mid-1990s. By the 2010s it was exchanging data among most hospitals in central Indiana, with patient consent and a robust master patient index, at a time when most U.S. cities had no functioning HIE at all. When COVID hit in 2020, INPC was one of the first networks anywhere that could pull a regional view of testing volumes, positivity rates, and hospital census, because the plumbing had been in place for twenty years.

Compare this to the experience of most regions, where pandemic data flowed through ad-hoc spreadsheet pipelines, faxes, and state-level dashboards built in three weeks. The difference was not technology — by 2020 every state had access to the same EHR vendors, the same standards, and the same federal money. The difference was thirty years of accumulated organizational and trust infrastructure that you cannot buy and cannot rush. That is what successful clinical informatics looks like in the long run, and it is why the field's most important work is often the least visible.

## Uncomfortable question

Meaningful Use achieved nearly universal EHR adoption and is also the most-blamed single cause of physician burnout. Was it worth it? And whatever your answer, what does it tell you about how to evaluate the *next* large federal informatics intervention before it happens?

Hold your answer.
