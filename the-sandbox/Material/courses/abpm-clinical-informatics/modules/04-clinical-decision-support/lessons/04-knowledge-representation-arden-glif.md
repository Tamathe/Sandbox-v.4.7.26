---
id: 04-knowledge-representation-arden-glif
title: Knowledge Representation — Arden, GLIF, and Why None of Them Quite Worked
order: 4
estimatedMinutes: 35
learningOutcomes:
  - Define knowledge representation in the CDS sense and explain why it matters.
  - Recognize Arden Syntax, GLIF, and the curly-braces problem on a board stem.
  - Explain why the early KR efforts produced the modern shift toward FHIR-based externalized CDS.
concepts:
  - knowledge-representation
  - arden-syntax
  - mlm-medical-logic-module
  - curly-braces-problem
  - glif
  - guideline-modeling
  - kr-vs-cds-hooks
---

## Reading

The previous lessons covered *what* CDS is, *how* to design it, and *why* it fails. This lesson is about the harder underlying problem: how to *represent* the clinical knowledge inside the CDS so that a computer can apply it to a specific patient. The boards test the named knowledge representation efforts — Arden Syntax, GLIF, and a few others — by name, partly because they are historically important and partly because the lessons of their partial failures are what produced the modern alternatives. You need to be able to recognize each by name, explain what it tried to do, and identify the reason it did not become the universal solution.

## What knowledge representation means here

Knowledge representation is the problem of taking a clinical rule that exists as a sentence — "for a patient with HFrEF and LVEF below 40%, an ACE inhibitor or ARB is recommended unless contraindicated" — and turning it into a structured artifact a computer can evaluate against a patient's data and act on. The artifact has to specify:

- **What patients the rule applies to** (the inclusion criteria).
- **What patients are excluded** (the exclusions and contraindications).
- **What data the rule reads** (which lab values, which problem list entries, which medications, with what time windows).
- **What the rule recommends** (the action or message).
- **Under what conditions the rule fires** (the trigger event — chart open, order placed, lab result returned).
- **What format and channel the recommendation uses** (interruptive alert, ambient banner, order set default, etc.).

The hard part is that every piece of this depends on the local data model, the local vocabulary mappings, and the local workflow. A rule written for one EHR's data model does not run on another EHR without translation. The dream of knowledge representation is that the rule could be written *once*, in a standard form, and run *anywhere* — the same way a SQL query runs against any compliant database. The reality is that the dream has been pursued for forty years and never quite arrived. The boards reward you for understanding why.

## Arden Syntax

**Arden Syntax** is the oldest serious attempt at a standardized clinical rule language. It was developed at the Arden Homestead conference in 1989, became an HL7 standard in 1992, and is still in use in a few systems today. Arden encodes clinical rules as **Medical Logic Modules (MLMs)** — discrete, self-contained units, each of which represents one rule. An MLM has a defined structure with sections for maintenance metadata, library/citation information, knowledge (the actual logic), and resources.

A simplified Arden MLM looks something like this:

```
maintenance:
  title: Hyperkalemia alert;
  filename: hyperkalemia_alert;
  version: 1.0;
  author: Example Author;
  ;;
library:
  purpose: Alert when serum K+ exceeds threshold;
  ;;
knowledge:
  type: data_driven;
  data:
    k_level := read last {potassium};
  ;
  evoke:
    storage of {potassium};
  ;
  logic:
    if k_level >= 5.5 then conclude true; endif;
  ;
  action:
    write "Serum potassium elevated: " || k_level;
  ;;
```

The structure is straightforward and the syntax is readable. The knowledge section has *data*, *evoke* (the trigger), *logic*, and *action* sub-sections. An MLM can be written by a clinical knowledge author, reviewed, version-controlled, and deployed.

The boards expect you to recognize Arden by name, know that it encodes rules as MLMs, and know one specific limitation — the **curly-braces problem**. The curly braces in the example above (`{potassium}`) are placeholders for site-specific data references. Arden left the binding from the placeholder to the actual data source unspecified, on the theory that each implementing site would fill in its own bindings to its own data model. The result was that an MLM was *almost* portable — the logic moved easily, but the curly-brace bindings had to be re-implemented at every site, and the bindings turned out to be the hard part. Two sites running "the same" MLM might disagree on which data the placeholder pointed to, what units it carried, what the time window was, and whether the result included point-of-care or only lab values. The portability promise was undercut by the curly braces.

The curly-braces problem is the canonical illustration of why knowledge representation is harder than it looks. The logic is the easy part. The integration with local data is the hard part, and the standard that does not solve the integration problem is not really portable. The boards have asked questions that name the curly-braces problem directly, and you should recognize it.

Arden is still in production use in some systems (Eclipsys/Allscripts, some European hospitals, parts of the VA at one point) and has seen incremental improvements over the years, but it has not become the universal CDS knowledge representation standard. The lessons of its partial failure shaped everything that came after.

## GLIF

**GLIF** (Guideline Interchange Format) was a more ambitious attempt at a different problem: representing entire clinical guidelines, not single rules. A guideline is a multi-step process — an algorithm with branches, decisions, recommendations, and care steps that unfold over time — and Arden's MLM model is too narrow to capture it. GLIF was developed in the mid-1990s by researchers at Stanford, Columbia, McGill, and Harvard, with the goal of representing guidelines in a form that could be shared across institutions, evaluated against patient data, and integrated into CDS systems.

GLIF encoded a guideline as a graph of nodes — action steps, decision steps, branch steps, synchronization steps — connected by transitions. The graph captured the temporal flow of the guideline ("first do X, then if Y do Z"), and the nodes referenced clinical concepts, data items, and recommended actions. GLIF went through several versions (GLIF, GLIF2, GLIF3) and was used in several research projects.

GLIF was never adopted as a production standard, for reasons that overlap with Arden's problems and add some of its own:

- **The same data-binding problem.** GLIF nodes referenced clinical concepts, but binding those concepts to a specific EHR's data model required local mapping work that was not portable.
- **Vocabulary instability.** A guideline written when the recommended drug class was X, the threshold was Y, and the evidence base was Z does not stay current automatically; the guideline-update problem was outside the scope of GLIF.
- **The market wanted production CDS, not portable guideline representations.** EHR vendors and hospitals had immediate operational needs for CDS that worked locally; the longer-term portability research did not pay off on a timeline that justified the investment.

GLIF was joined and partly succeeded by other guideline-modeling efforts — **GEM** (Guideline Elements Model), **PROforma**, **EON**, **Asbru**, and others — none of which became the universal standard either. The boards do not require you to know all of these by name but expect you to recognize that there were several attempts, that the problem is hard, and that no single one won.

A sometimes-tested name in this space is **HeD** (Health eDecisions) and its modern descendant **CQL** (Clinical Quality Language). CQL is the current HL7 standard for expressing clinical logic in a form that can be evaluated against FHIR data. It is more successful than its predecessors largely because it builds on FHIR's data model, which the field has actually adopted, rather than trying to define its own. CQL is increasingly the way new CDS rules are expressed for cross-site portability, and it is the standard that quality measures (like the CMS eCQMs — electronic clinical quality measures) are written in. The boards have started to test CQL by name as it has matured.

## Why these efforts mattered even though they didn't win

The Arden, GLIF, and successor efforts did not produce a universal knowledge representation standard. They did produce something else: a clear understanding of *why* the problem is hard and *what* a working solution would have to address. The lessons:

1. **The logic is the easy part.** Encoding "if A and B then recommend C" is not the bottleneck. Anyone who has written code knows how to do this.
2. **The data binding is the hard part.** Connecting the placeholders in the rule to the local EHR's data is where the labor lives, and the labor does not transfer between sites.
3. **Vocabulary alignment is necessary.** Without standard vocabularies (Module 2's SNOMED, LOINC, RxNorm, UCUM), the data binding is impossible to standardize.
4. **The EHR data model has to be standardized too.** Even with standard vocabularies, the *shape* of the data — how lab results are structured, how medications are represented, how problem lists work — has to be standardized for portable rules to evaluate against.
5. **The trigger model has to be standardized.** Without a standard way to say "fire this rule when the user starts a medication order," the rule can be expressed but cannot be invoked at the right time.

The modern solution, as we will see in the next lesson, is not to define a new CDS-specific knowledge representation language. It is to use FHIR as the data model, FHIR vocabularies as the bindings, CDS Hooks as the trigger model, and CQL as the logic language — *and to externalize the CDS service from the EHR*. The combination addresses points 2 through 5 directly. Point 1 was never the problem.

The boards test this evolutionary story. When a stem describes a CDS knowledge representation system, you should be able to identify whether it is Arden, GLIF, CQL/FHIR-based, or vendor-proprietary, and you should understand what each makes easy and what each makes hard.

## Concrete example

A research group wants to deploy a published guideline-based CDS rule for management of community-acquired pneumonia at three hospitals on three different EHR platforms. The rule recommends a specific antibiotic regimen based on patient age, severity (CURB-65 or PSI score), allergies, and recent antibiotic exposure.

In the Arden era, the group would have written an MLM expressing the rule's logic with curly-brace placeholders for the data items, then traveled to each hospital to bind the placeholders to the local data model — three different bindings, three different sets of subtle errors, three different maintenance burdens. The portability was theoretical; the work was not.

In the GLIF era, the group would have built a graph-based representation of the entire guideline workflow, run into the same data-binding problem at each site, and discovered that the guideline's recommendations needed to update every two years and the graph needed to be re-curated each time.

In the CDS Hooks / FHIR / CQL era (the next lesson), the group writes the rule as a CQL expression that operates on FHIR resources with US-Core profiles. Each hospital exposes a US-Core-conformant FHIR API. The CDS service runs the same CQL against the same FHIR shape at all three sites. The remaining work is verifying that each hospital's FHIR API actually exposes the data the rule expects, with the right vocabularies. The portability is not free, but it is closer to "configure" than "rebuild," and the maintenance happens in one place.

The differences between the eras are not differences in the cleverness of the logic. They are differences in how much of the surrounding infrastructure has been standardized. Knowledge representation is downstream of data and vocabulary standardization, and the field's slow progress on KR is mostly the slow progress of the underlying infrastructure.

## Uncomfortable question

If the lesson of forty years of knowledge representation work is that the logic is the easy part and the integration is the hard part, what does this tell you about the current wave of LLM-based clinical decision support? The LLMs handle the logic effortlessly. Have they actually solved the integration problem, or have they made it invisible while leaving it just as hard underneath?

Hold your answer.
