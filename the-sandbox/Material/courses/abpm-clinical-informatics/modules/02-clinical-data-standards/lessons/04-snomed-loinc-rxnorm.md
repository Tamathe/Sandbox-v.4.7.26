---
id: 04-snomed-loinc-rxnorm
title: SNOMED, LOINC, and RxNorm — Three Vocabularies, Three Jobs
order: 4
estimatedMinutes: 40
learningOutcomes:
  - Distinguish what SNOMED CT, LOINC, and RxNorm are each used for and choose the right one for a given use case.
  - Explain the granularity, governance, and licensing of each vocabulary at the level a board question requires.
  - Recognize the most common confusion (using the wrong vocabulary for a given concept) and correct it.
concepts:
  - snomed-ct
  - loinc
  - rxnorm
  - vocabulary-granularity
  - value-set-binding
  - umls
---

## Reading

The single most common board question about clinical vocabularies is some version of "for this use case, which vocabulary is the right one?" There are dozens of clinical vocabularies in use, but for the boards you can do most of the work with three: **SNOMED CT** for clinical findings and most other clinical concepts, **LOINC** for what is being measured (lab tests, vital signs, document types), and **RxNorm** for medications. If you can confidently assign a use case to one of these three, you have most of the vocabulary question answered. The remaining work is recognizing when one of the *billing* vocabularies (ICD-10, CPT) is what the stem actually wants — that is the next lesson.

Start with the easy distinctions, then add the nuance.

**SNOMED CT** (Systematized Nomenclature of Medicine — Clinical Terms) is the largest and most expressive of the three. It contains over 350,000 active concepts spanning clinical findings, diseases, procedures, body structures, organisms, substances, devices, and qualifier values. Each concept has a unique numeric identifier (a SNOMED CT ID — example: `22298006` is "myocardial infarction"), a fully-specified name, and one or more synonyms. SNOMED is *polyhierarchical*: a concept can have multiple parents in the IS-A relationship hierarchy, and the hierarchies are deep. "Acute anterior myocardial infarction" rolls up to "acute myocardial infarction" rolls up to "myocardial infarction" rolls up to "ischemic heart disease" — and a clinical query that asks "find all patients with any form of myocardial infarction" can use the hierarchy to answer correctly without enumerating every descendant.

SNOMED is what a clinician would use to describe *what is wrong with the patient* in a level of detail richer than billing codes allow. It is the right vocabulary for the problem list in an EHR, for a clinical decision support rule that reasons about diagnoses, for a registry that needs to identify patients with specific clinical conditions, and for almost any FHIR resource that carries a clinical concept (Condition, Procedure, AllergyIntolerance, etc.). SNOMED is governed by **SNOMED International**, an international body, and is licensed — in the United States, the National Library of Medicine pays for a national license so that any U.S. user can use SNOMED for free. The boards test the licensing detail more often than you would expect.

The most common SNOMED mistake is using it for things that are not clinical findings. SNOMED is *not* the right vocabulary for "what lab test was performed" — that is LOINC. SNOMED is *not* the right vocabulary for "what medication was prescribed" — that is RxNorm. SNOMED *can* express a substance (e.g., "amoxicillin" as a substance concept), but it is not the right vocabulary for the *prescribable medication product* with strength, form, and route. The boards will test whether you can resist the temptation to use SNOMED for everything just because it covers the most ground.

**LOINC** (Logical Observation Identifiers Names and Codes) is the vocabulary for *what is being measured or observed*. Every lab test in a hospital should have a LOINC code that uniquely identifies it. Every vital sign type has a LOINC code. Every common document type (discharge summary, history and physical, progress note) has a LOINC code. LOINC was developed at the Regenstrief Institute starting in 1994 (yes, the same Regenstrief from Module 1) and is freely available worldwide.

A LOINC code identifies the *test*, not the *result*. The LOINC code for "serum sodium" tells you what was measured; the actual sodium value (137) goes in a separate field, with units (mEq/L) coming from UCUM. This separation matters because it lets the receiving system know exactly which test it has, regardless of what the sending lab calls it locally. If a lab in Boston sends a sodium result to a hospital in Phoenix, the sending lab might call it "Na" and the receiving hospital might call it "Sodium, serum," but if both bind to the LOINC code `2951-2` for "Sodium [Moles/volume] in Serum or Plasma," both systems know it is the same test.

LOINC's structure is the famous **six axes**: component (what is being measured), property (mass, moles, volume, etc.), time (point in time, 24 hour), system (specimen), scale (quantitative, ordinal, nominal), and method. You do not need to memorize the six axes for the boards, but you should know that LOINC codes are *fully-specified* in this way and that two superficially similar tests (e.g., glucose by glucometer vs. glucose by serum chemistry) are different LOINC codes because they differ on one of the axes. The boards have asked questions of the form "why are there multiple LOINC codes for what looks like the same test," and the right answer is the axis distinction.

The most common LOINC mistake is using it for the *result* rather than the *test*. The LOINC code does not encode the value. The value is data; the LOINC code is the metadata that tells you what the data is.

**RxNorm** is the vocabulary for medications. It is produced and maintained by the U.S. National Library of Medicine and is freely available. RxNorm assigns a unique identifier (an RxCUI) to each medication concept at multiple levels of specificity:

- **Ingredient** — the active substance ("amoxicillin").
- **Clinical drug** — ingredient + strength + dose form ("amoxicillin 500 mg oral capsule").
- **Branded drug** — clinical drug + brand name ("Amoxil 500 mg oral capsule").
- **Pack** — combinations of drugs sold together (e.g., a Z-pack).

For most clinical use cases — order entry, drug-drug interaction checking, medication reconciliation — the right level is **clinical drug**, because that captures what the patient is actually taking with enough specificity to do safety checks. Recording a medication as just "amoxicillin" (the ingredient level) loses the strength and the formulation, which means a CDS rule that checks for dosing errors cannot fire, and a reconciliation tool cannot tell whether the inpatient and outpatient orders match.

RxNorm exists precisely because vendors used to have proprietary medication dictionaries (First DataBank, Multum, Medi-Span) that were each licensed and each different. RxNorm provides a stable, free, common identifier that those proprietary dictionaries can map *to*. In modern systems, the local medication dictionary is mapped to RxNorm, and any external interface (CDS, exchange, prescribing) goes through RxNorm. The boards will test whether you can identify RxNorm as the right answer for "the standard medication vocabulary used by U.S. EHRs and required for ePrescribing interoperability."

The most common RxNorm mistake is choosing SNOMED for medications. SNOMED has medication concepts, but they are not the prescribable level of detail RxNorm provides. If a board stem asks about ePrescribing, medication reconciliation, drug-drug interaction checking, or formulary management, the answer is RxNorm. If the stem asks about an allergy to a substance, the answer is more nuanced — the *substance* may be a SNOMED concept, but the *medication ingredient* the patient is allergic to should be linked to RxNorm.

A unifying note. The **UMLS** (Unified Medical Language System), also from the National Library of Medicine, is a meta-thesaurus that maps concepts across more than 200 source vocabularies including SNOMED, LOINC, RxNorm, ICD-10, MeSH, and many others. UMLS is what you use when you need to translate between vocabularies — for example, mapping a SNOMED concept to its corresponding ICD-10 code for billing. UMLS does not replace the source vocabularies; it provides the cross-walks between them. The boards occasionally ask about UMLS in this exact role (cross-vocabulary mapping), and the right answer is recognizing it for what it is.

A practical cheat sheet for board stems:

| The stem mentions... | The answer is usually... |
|----------------------|--------------------------|
| Problem list, diagnosis for clinical (not billing) reasoning, body site, finding | SNOMED CT |
| Lab test, vital sign type, document type, observation type | LOINC |
| Medication order, ePrescribing, drug interactions, medication reconciliation | RxNorm |
| Mapping between vocabularies | UMLS |
| Billing/claims diagnosis | ICD-10-CM (next lesson) |
| Procedure for billing | CPT or ICD-10-PCS (next lesson) |

This table is not a substitute for understanding *why* each vocabulary serves its purpose. The boards will sometimes give you a stem in which the obvious vocabulary is wrong because the use case is unusual — e.g., a registry that needs to capture detailed clinical findings beyond what billing codes can express, where the answer is SNOMED even though the stem mentions "diagnosis." The discipline is to read the stem twice: once for the surface keywords, once for the underlying use case.

## Concrete example

A health system is building a registry of patients with heart failure to support a quality improvement initiative. They want to identify patients with any form of heart failure, distinguish systolic from diastolic, capture left ventricular ejection fraction values from echocardiograms, capture beta-blocker prescriptions, and link the registry to billing data for cost analysis.

The right vocabularies, by data class:

- **Heart failure diagnosis (clinical)**: SNOMED CT. The hierarchy lets a query for "heart failure" automatically include systolic, diastolic, acute, chronic, and the rest of the descendants. ICD-10 would also work for billing-derived case-finding but loses granularity.
- **Ejection fraction value**: LOINC for *the test* (e.g., LOINC `10230-1` for "Left ventricular ejection fraction"), with the actual percentage as the result value and UCUM `%` as the units.
- **Beta-blocker prescriptions**: RxNorm at the clinical drug level so the query can identify all members of the beta-blocker class regardless of brand or local formulary code.
- **Linking to billing**: ICD-10-CM and CPT codes from the claims data, mapped to the SNOMED problem list via UMLS.

Notice that the registry uses four vocabularies in parallel and one cross-walk. Each vocabulary is doing the job it is designed for. A registry that tried to use SNOMED for all four — or, worse, tried to use ICD-10 for all four — would either fail to capture the data (no granularity for the LVEF) or fail to support the queries (no hierarchy for case-finding). The discipline of choosing the right vocabulary per data class is what separates a registry that works from a registry that re-litigates its data quality every quarter.

## Uncomfortable question

The U.S. uses SNOMED for clinical findings, LOINC for measurements, RxNorm for medications, and a separate set of billing vocabularies (ICD, CPT) for the claims pipeline. Why do we have a separate billing vocabulary at all, when SNOMED is more clinically expressive and could in principle be used for billing? What does the persistence of two parallel vocabularies tell you about how clinical and financial data flow are actually governed in U.S. healthcare?

Hold your answer.
