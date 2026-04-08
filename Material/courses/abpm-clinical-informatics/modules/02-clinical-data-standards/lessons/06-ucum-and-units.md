---
id: 06-ucum-and-units
title: UCUM, Units, and the Things You Lose When You Don't Standardize Them
order: 6
estimatedMinutes: 25
learningOutcomes:
  - Recognize a UCUM unit string and explain what it expresses.
  - Identify the most common unit-related clinical safety failures and explain why a units standard mitigates them.
  - Explain why "units are obvious" is wrong, and why this lesson is shorter but not less important than the others in this module.
concepts:
  - ucum
  - units-of-measure
  - unit-conversion-errors
  - drug-dosing-unit-errors
  - traditional-vs-si-units
---

## Reading

This is the shortest lesson in the module and one of the highest-yield ones, because units are the kind of thing every clinician thinks they understand and every informaticist has at least one horror story about. The boards reward you for taking units seriously precisely because most candidates do not.

**UCUM** (the Unified Code for Units of Measure) is a coding system for units. It was developed at the Regenstrief Institute (yes, again) and is the units standard adopted by HL7, FHIR, LOINC, and most modern interoperability work in the United States. UCUM provides a stable, unambiguous string identifier for every unit you might want to express, including the awkward composite ones — `mg/dL`, `mmol/L`, `mEq/L`, `mL/min/{1.73_m2}`, `[degF]`, `cm[H2O]`. The strings look ugly because they have to be machine-parseable in addition to being human-readable.

Why does this matter? Because the alternative is local strings, and local strings produce errors that range from annoying to fatal.

Consider the units used for serum creatinine. In the United States, traditional units are mg/dL (a normal adult serum creatinine is roughly 0.7–1.3 mg/dL). In most of the rest of the world, the SI unit is µmol/L (a normal value is roughly 60–110 µmol/L). The conversion factor is approximately 88.4. A patient with a creatinine of 2.0 mg/dL (mild renal impairment) has a creatinine of approximately 177 µmol/L. A system that receives a result without unit metadata, or with ambiguous unit metadata, can interpret the same number two completely different ways. A creatinine of 100 might be normal (µmol/L) or catastrophically high (mg/dL). The patient is the same. The number is the same. The decision is opposite.

UCUM exists so that the unit is *always* part of the message and *always* expressed in a way both sides parse identically. A FHIR Observation for serum creatinine carries the LOINC code for the test, the numeric value, and the UCUM code for the units. The receiving system has no excuse for misinterpretation.

Drug dosing is where unit errors do the most harm. Consider:

- **Insulin** is dosed in *units* (a non-mass unit specific to insulin). A patient who needs 20 units of insulin and receives 20 mL of insulin (a 50- to 100-fold overdose, depending on concentration) is in a medical emergency. The error is a units error.
- **Heparin** is also dosed in units, with weight-based dosing (units/kg/hour) for infusions. The number of pediatric heparin overdoses caused by units confusion is well documented, including the famous Quaid twins case in 2007.
- **Pediatric dosing** is mass-per-weight (mg/kg) and the error mode is using adult mg or mg/kg without distinguishing. Pediatric dosing errors involving units are one of the categories the Joint Commission and ISMP track.
- **Methotrexate** is dosed weekly for some indications and daily for others. The "unit" of frequency matters as much as the dose itself; weekly methotrexate given daily is fatal. The boards have asked questions framed around methotrexate as a high-risk medication where dosing unit clarity is a CDS opportunity.

The CDS implication is that any decision support rule that operates on a numeric value — a lab result, a vital sign, a dose — must operate on the value *and* the unit, and must convert when necessary. A rule written for mg/dL that receives a value in µmol/L without checking the unit will fire incorrectly. A rule that ignores units entirely will fire incorrectly some of the time. The discipline of writing CDS that handles units correctly is one of the things that separates a working CDS team from one that produces alerts the clinicians have learned to ignore.

The boards will sometimes give you a stem about a CDS rule that fired or didn't fire when it should have, and ask you to identify the most likely cause. Units mismatch is one of the standard answers. Vocabulary mismatch is another. Knowing both is what closes the question.

A few practical UCUM facts:

- UCUM is **case-sensitive**. `mg` is milligrams; `MG` is megagrams. The case-sensitivity is a frequent source of bugs in implementations that come from a SQL background where case-insensitivity is the default.
- UCUM uses **square brackets** for special units that don't fit the SI conventions: `[in_i]` for inches, `[lb_av]` for pounds avoirdupois, `[degF]` for Fahrenheit. The brackets are the marker.
- UCUM uses **curly braces** for annotations that are not part of the unit semantics but provide context: `{cells}/uL` for "cells per microliter" where `{cells}` is the annotation. The annotation is for human readers, not for unit math.
- UCUM **does not solve all unit problems** — it solves the *expression* problem. A system that receives a result with the right UCUM code but the wrong numeric value (because of a sending-side bug) is still wrong. UCUM gives you a fighting chance; it does not give you correctness for free.

A note on what UCUM is *not*. UCUM is not a vocabulary of clinical concepts. It is not a content standard. It is not a transport. It is the units piece of the larger puzzle, and it slots into FHIR, HL7 v2, and LOINC alongside the other vocabularies. The board move is to recognize that "units" is a separate axis from "what was measured" (LOINC) and "value" (the actual number), and that UCUM is the vocabulary that lives on the units axis.

## Concrete example

In 2007, the Quaid twins — newborn children of actor Dennis Quaid — received heparin doses 1,000 times higher than intended at Cedars-Sinai Medical Center. Two vials with similar packaging contained heparin in vastly different concentrations (10 units/mL for pediatric flushes, 10,000 units/mL for adult anticoagulation), and a pharmacy technician selected the wrong vial. The babies survived after extensive intervention. The case became one of the most-cited patient safety incidents of the decade.

The Quaid case is usually told as a packaging-and-labeling failure, which it was. It is also a units case. The dose ordered was correct in units; the dose delivered was correct in mL of the wrong concentration. A system that recorded the dose only in mL would not have caught the error. A system that recorded the dose in units (the correct clinical unit for heparin) and computed the mL based on the known vial concentration *would* have caught it, because the computed mL would not have matched the mL drawn. The informatics lesson is that the unit a drug is *clinically dosed in* is not always the unit it is *physically administered in*, and a system that conflates them loses safety.

The boards do not ask about the Quaid case directly, but they do ask about the class of error — high-alert medications, units confusion, the role of standardized units in CDS — and the case is the canonical illustration. If you can tell the story in two sentences and connect it to UCUM and to medication CDS, you have most of the related questions covered.

## Uncomfortable question

UCUM has been adopted by FHIR, LOINC, and most modern standards. It is freely available, technically straightforward, and clinically essential. Why is it still common to find production EHR interfaces in 2026 that send numeric results without UCUM-conformant units, or with vendor-specific unit strings? What does the persistence of this gap tell you about the difference between *standard adoption* (the standard exists, is mandated, is taught) and *standard implementation* (the standard is actually used correctly in production)?

Hold your answer.
