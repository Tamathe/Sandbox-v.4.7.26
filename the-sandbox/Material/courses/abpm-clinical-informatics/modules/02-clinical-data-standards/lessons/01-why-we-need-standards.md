---
id: 01-why-we-need-standards
title: Why Standards Exist At All — The Problem Before the Solutions
order: 1
estimatedMinutes: 30
learningOutcomes:
  - Explain the four levels of interoperability and give a clinical failure example at each level.
  - Distinguish a content standard from a transport standard from a vocabulary from an exchange format.
  - Articulate why "we'll just use the standard" is almost never the end of the conversation.
concepts:
  - interoperability-four-levels
  - content-vs-transport
  - vocabulary-vs-format
  - semantic-interoperability
  - implementation-guide
---

## Reading

Before we touch HL7, FHIR, SNOMED, or any of the other acronyms that fill the next five lessons, we have to be precise about what standards are *for*. The boards will test your ability to read a stem and identify which kind of standard is doing what work. The clinical world will test your ability to know which kind of standard is *missing* when something breaks. Both tests are easier if you start from the problem.

The problem is that healthcare data is produced in millions of places — labs, devices, clinics, hospitals, pharmacies, payers, public health agencies, patients themselves — and almost none of those places were designed to share with each other. Every system has its own internal vocabulary, its own data model, its own assumptions about what a "patient" is and what a "result" means. When two systems try to talk, the translation layer is where most of the work happens, and where most of the failures hide.

Standards exist to reduce the translation work. They reduce it in several different ways at once, which is why "let's use a standard" is ambiguous until you specify *which kind*. The taxonomy you need to know cold has four pieces.

**Transport standards** govern how bytes move between systems. They answer: what is the wire format, what is the protocol, who initiates the connection, how is the message acknowledged, how are errors handled. HL7 v2's MLLP (Minimal Lower Layer Protocol) is a transport standard. FHIR's use of HTTP REST is a transport standard. Direct Project's S/MIME-over-SMTP is a transport standard. Transport standards are necessary and almost never sufficient. Two systems that agree on transport but disagree on content will exchange bytes successfully and produce nothing useful.

**Content standards** govern the structure of the message itself — the segments, the fields, the data types, the cardinality rules. HL7 v2's ADT message structure is a content standard. The FHIR Observation resource is a content standard. CDA (Clinical Document Architecture) documents are a content standard. Content standards say "here is the shape of a result message" without saying what any specific clinical concept *means*.

**Vocabulary standards** (also called terminologies or code systems) govern what the values inside the fields *mean*. SNOMED CT is a vocabulary. LOINC is a vocabulary. RxNorm is a vocabulary. ICD-10-CM is a vocabulary. UCUM is a vocabulary for units. A vocabulary gives you a stable, agreed identifier for "myocardial infarction" or "serum sodium" or "amoxicillin 500 mg oral tablet" so that two systems exchanging a message can refer to the same clinical concept without inventing local codes.

**Implementation guides** sit on top of the other three and constrain how they should be combined for a specific use case. The US Core Implementation Guide tells you which FHIR resources to use, which fields are required, and which vocabularies to bind to them when you are building for the U.S. market. Implementation guides exist because the underlying standards are deliberately flexible — flexible enough to be useless if everyone makes different choices — and because the whole point of standardization is *the same choices everywhere*. The boards will sometimes give you a stem about a project that is "FHIR-compliant" but failing to interoperate, and the answer is almost always "they didn't conform to the same implementation guide."

These four kinds of standards do different jobs and they fail in different ways. The most useful frame for talking about how they fail together is the **four levels of interoperability**, which the boards expect you to know by name and to be able to give examples at each level.

**Foundational interoperability** is the most basic: System A can transmit data to System B, and System B can receive it. No interpretation is required. Two systems that can exchange a PDF over a secure channel have foundational interoperability. The PDF is unreadable by the receiving system as anything but pixels, but the bytes arrived. Most of the U.S. health system achieved foundational interoperability decades ago via fax, and is still arguing about everything above it.

**Structural interoperability** adds the requirement that the receiving system can parse the data into a standard structure. The fields are identifiable, the segments are in the right places, the data types are recognized. An HL7 v2 ADT message that arrives at System B and is parsed into a database schema with patient name, MRN, admission date, and disposition has structural interoperability. The receiving system knows *which field is the patient name*. It does not yet know what the name is being used *for* clinically. Structural interoperability is what most exchange standards (HL7 v2, CDA, basic FHIR) deliver out of the box.

**Semantic interoperability** is the hard one. It adds the requirement that both systems interpret the data the same way — that the codes mean the same thing on both sides. A lab result message that arrives with a LOINC code identifying the test, a SNOMED code for the specimen source, and a UCUM code for the units, where both sender and receiver interpret each code identically, has semantic interoperability. This is the level that the U.S. health system has been chasing for decades and is still partly failing to achieve. The most common failure mode is that one side codes a concept and the other side does not, or that both sides use codes from the same vocabulary but bind them to slightly different value sets. The result is a message that arrives, parses, and means subtly different things to the two systems — which is worse than not arriving at all, because nobody notices.

**Organizational interoperability** is the level the textbooks added later, and it is the level the field is currently fighting about. It adds the requirement that the data flow is *governed*, *trusted*, *legal*, and *operationally sustainable* across organizational boundaries. Two hospitals can have perfect semantic interoperability between their systems and still not exchange data because their lawyers cannot agree on a data use agreement, or because one is afraid of competitive harm, or because the patient consent flow is broken, or because the receiving clinician does not know which system to log into to see the result. Organizational interoperability is what the 21st Century Cures Act information blocking rule is trying to force, and it is also what fails most often in the wild.

A useful test: when something doesn't interoperate, ask which level failed. If the bytes never arrived, it is foundational. If they arrived as an unparseable blob, it is structural. If they parsed but mean the wrong thing, it is semantic. If they parse correctly and mean the right thing but nobody is allowed or willing to use them, it is organizational. Most of the visible failures the press reports on are organizational failures dressed up as technical ones. Most of the technical failures the engineers report on are semantic failures dressed up as content-format ones.

A final framing point. You will sometimes hear people say "FHIR solves interoperability." FHIR is a content standard with associated transport conventions. It does not bring its own vocabularies (it borrows SNOMED, LOINC, RxNorm, ICD), and it does not specify implementation choices on its own — that is what implementation guides like US Core are for. FHIR is a substantial improvement over what came before. It is not a silver bullet, and the boards will give you a stem in which FHIR is being deployed badly and ask you to identify the missing piece. The missing piece is almost always either an implementation guide, a vocabulary binding, or organizational governance.

## Concrete example

In 2016, a community hospital in the Midwest connected its EHR to a regional HIE so it could pull outside records when a patient arrived in the emergency department. The connection used a proper transport (Direct messaging), a proper content standard (CDA documents), and proper vocabularies (SNOMED for problems, RxNorm for medications, LOINC for labs). On the surface, all four kinds of standards were in place.

Within six months, the ED physicians had stopped pulling the outside records, because the records were almost useless. Problems showed up as unmapped local codes ("CHF" rather than the SNOMED code for congestive heart failure), medications appeared without dose or route because the sending system had stored them as free text, and labs arrived with proprietary units rather than UCUM. The CDA documents arrived. They parsed. They contained the right *categories* of information. They did not, semantically, agree with the receiving system about what any of the specific entries meant. The receiving clinicians did the rational thing: they ignored the imported data and asked the patient.

This is a semantic interoperability failure. It is also, by the standards of the time, a project that would have been reported as a successful HIE deployment. Foundational and structural interoperability were achieved. Semantic was not. And until someone went back and forced both sides to bind to the same value sets and the same codes, no amount of additional plumbing was going to fix it. The fix took two more years.

## Uncomfortable question

If the level of interoperability that fails most often in practice is organizational, why does almost every interoperability initiative — federal, state, vendor-driven — focus its energy on the technical levels? What is it about the technical levels that makes them more attractive to work on than the organizational level, and is the field's energy distribution actually rational?

Hold your answer.
