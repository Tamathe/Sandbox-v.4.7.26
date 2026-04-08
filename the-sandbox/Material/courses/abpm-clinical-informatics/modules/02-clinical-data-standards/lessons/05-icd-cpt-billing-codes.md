---
id: 05-icd-cpt-billing-codes
title: ICD, CPT, HCPCS, and DRGs — The Billing Vocabularies and Why They Matter Clinically
order: 5
estimatedMinutes: 35
learningOutcomes:
  - Distinguish ICD-10-CM, ICD-10-PCS, CPT, HCPCS, and DRGs and identify the right one for a given use case.
  - Explain why billing vocabularies persist alongside clinical vocabularies and where the seam causes failures.
  - Recognize the most common board-tested confusions between billing and clinical coding.
concepts:
  - icd-10-cm
  - icd-10-pcs
  - cpt
  - hcpcs
  - drg-msdrg
  - billing-vs-clinical-coding
---

## Reading

Billing vocabularies are the part of clinical informatics that informaticists pretend to dislike and then spend more time working with than any other. They are not aesthetically pleasing. They are not maximally expressive. They are not designed by clinicians for clinicians. They are designed by payers and the federal government for adjudication, and they encode the things that determine whether a hospital gets paid. The boards test them because the field cannot pretend they are not central, and because most clinical informaticists end up running projects whose success depends on getting the billing-clinical seam right.

Five vocabularies cover the territory.

**ICD-10-CM** (International Classification of Diseases, 10th Revision, Clinical Modification) is the U.S. diagnosis coding standard for outpatient and inpatient encounters. It is used for claims, for public health reporting, and for almost any administrative dataset that needs a diagnosis. ICD-10-CM is the U.S. variant of the WHO's ICD-10, with U.S.-specific extensions for greater specificity. Codes are alphanumeric, three to seven characters, with the first character a letter and increasing specificity at each position. `I21.9` is "acute myocardial infarction, unspecified." `I21.4` is "non-ST elevation (NSTEMI) myocardial infarction." The U.S. transitioned from ICD-9-CM to ICD-10-CM in October 2015 — a transition the industry treated as an existential event and which the boards still occasionally reference.

ICD-10-CM has roughly 70,000 codes. SNOMED CT has roughly 350,000. ICD's smaller size is not a deficiency — it is the result of a different design goal. SNOMED is built for *clinical expressiveness*; ICD is built for *administrative classification*. ICD has to be enumerable, exhaustive within its scope, mutually exclusive within its categories, and stable across years for trend analysis. SNOMED can afford to have multiple ways to express the same concept; ICD cannot. The trade-off is that SNOMED loses on consistency and ICD loses on granularity, and they end up being used for different things and mapped to each other through UMLS or vendor mappings.

ICD-10-CM is for *diagnoses*. It is not for procedures performed in inpatient settings — that is the next vocabulary.

**ICD-10-PCS** (Procedure Coding System) is the U.S. inpatient procedure coding standard, used by hospitals to report procedures performed during inpatient stays for billing. PCS codes are seven characters, all alphanumeric, with each character position representing a specific axis (section, body system, root operation, body part, approach, device, qualifier). PCS is structurally completely different from ICD-10-CM despite the shared "ICD-10" prefix — they share a name but not a design.

The crucial board fact: **ICD-10-PCS is used only by hospitals for inpatient procedures**. Outpatient procedures, physician services, and most office-based work are coded in CPT. If a stem describes a procedure performed in an inpatient setting and asks which code set the hospital uses for billing, the answer is ICD-10-PCS. If the stem describes a procedure in an outpatient or office setting, or asks about physician professional billing, the answer is CPT. The boards test this distinction directly.

**CPT** (Current Procedural Terminology) is the procedure coding standard owned and maintained by the American Medical Association. It is used for outpatient procedures, physician services across all settings, and most non-inpatient billing. CPT codes are five-digit numeric (with some alphanumeric extensions). `99213` is the famous code for a mid-complexity established-patient office visit; every primary care physician in the U.S. has billed it thousands of times. CPT is divided into three categories: Category I (the everyday codes), Category II (performance measurement codes, optional, used for quality reporting), and Category III (emerging technology codes that may eventually become Category I).

CPT is **proprietary**. The AMA owns it, licenses it, and earns substantial revenue from it. This is one of the most-debated facts in U.S. health IT — the country's procedure coding standard is owned by a private association — and it occasionally appears as a board question of the form "which procedure coding system is owned by the AMA." The answer is CPT. There is no plausible second choice.

**HCPCS** (Healthcare Common Procedure Coding System, pronounced "hick-picks") is a coding system used by Medicare and many other payers for items and services not covered by CPT. HCPCS has two levels: **Level I** is essentially CPT (HCPCS uses CPT for most physician services), and **Level II** is the alphanumeric codes for things like durable medical equipment, prosthetics, ambulance services, and drugs administered in non-self-administered ways. When a board stem mentions DME, ambulance billing, or Medicare-specific coding for items beyond physician services, HCPCS Level II is the answer.

**DRGs** (Diagnosis-Related Groups), specifically **MS-DRGs** (Medicare Severity DRGs) in current use, are not a coding system but a *classification system* used by Medicare to determine inpatient hospital payment. A DRG is computed from a combination of the principal diagnosis (ICD-10-CM), secondary diagnoses, procedures (ICD-10-PCS), patient age, sex, and discharge disposition. The grouping algorithm assigns each inpatient stay to one of approximately 750 DRGs, each with an associated *relative weight* that determines the payment Medicare makes to the hospital. DRGs are the foundation of the inpatient prospective payment system (IPPS) and are why hospital coding teams pay close attention to which secondary diagnoses are documented — adding a single severe comorbidity can move a stay from a lower-weighted DRG to a higher-weighted one, with thousands of dollars of payment difference.

The clinical informatics implication of DRGs is substantial. **Clinical documentation improvement (CDI)** is an entire sub-discipline whose job is to ensure that the documentation in the EHR supports the DRG the hospital believes it has earned. CDI specialists query physicians to clarify documentation that is ambiguous from a coding perspective, and the queries are an artifact of the clinical-billing seam — the documentation needed for payment is sometimes more specific than the documentation a physician would write for clinical purposes alone. Whether CDI is a sensible response to the system or an example of administrative bloat is contested. The boards do not ask the contested question; they ask whether you can identify CDI by name and explain what it does.

Now the seam. The reason billing vocabularies matter to clinical informatics — and the reason the boards ask about them at all — is that almost every clinical data project eventually has to integrate with the billing pipeline. A registry that needs case finding will use claims data because claims data is universal across hospitals; the price is that the case finding is in ICD-10-CM, not SNOMED, and the granularity is lower. A quality measure that depends on identifying patients with a specific condition will be specified in some combination of ICD codes, CPT codes, and (more recently) SNOMED and LOINC codes; the specifications often list both, with the ICD codes as the historical default and the clinical codes as the future direction. A research project that needs longitudinal data will pull from billing because billing has decades of structured history while clinical structured data starts wherever the EHR was first deployed.

The most common failure at the seam is **using billing data to answer a clinical question for which it was not designed**. A claim with `I21.9` ("acute MI, unspecified") cannot tell you whether the patient had an STEMI or NSTEMI; the documentation may have specified, but the coder may have assigned the unspecified code, and the difference is invisible from the claim. A research study that uses ICD codes to identify "patients with diabetes" will miss patients whose diabetes is documented but not coded on a given encounter, and will include patients whose diabetes is being ruled out. The boards expect you to recognize these limitations and to explain why they happen.

The complementary failure is **using clinical data to predict billing outcomes when the documentation does not yet match**. A predictive model that says "this patient has a high probability of being diabetic based on labs and notes" is not useful for billing if the diabetes is not coded on the claim, regardless of how clinically accurate the prediction is. The seam between clinical and billing flows in both directions and is broken in both directions for slightly different reasons.

A useful frame: clinical vocabularies and billing vocabularies are not redundant. They are complementary, and they are governed by different organizations with different incentives. The job of a clinical informaticist working on any project that touches both is to know the limits of each and to design the project so that the right vocabulary is doing the right job, with the cross-walks made explicit rather than left to chance.

## Concrete example

A health system's quality team is reporting on the CMS measure for "percentage of adult patients with diabetes whose most recent HbA1c is greater than 9%" — a poor-control measure where higher rates are bad. The denominator is "adult patients with diabetes." The team has two ways to identify the denominator.

**Option A**: Use claims data — count any patient with at least two outpatient encounters in the past year with an ICD-10-CM code in the diabetes range (`E10`–`E13`). This is fast, runs against the claims database, and matches the way most CMS measures historically defined the denominator.

**Option B**: Use the EHR's problem list — count any patient whose problem list contains a SNOMED concept descended from "diabetes mellitus." This is more clinically accurate, captures patients whose diabetes is documented but not consistently billed, and uses the hierarchy to include rare types automatically.

In practice the right answer is *both, with reconciliation*. Option A produces the denominator the measure specification expects and the payer will accept; option B produces a clinically truer denominator that may include patients option A missed. The difference between the two — the patients who appear in B but not A, and vice versa — is itself a useful quality signal: it tells you about your CDI program, about your problem list hygiene, and about how aligned your clinical and billing flows actually are. A team that runs only option A is reporting what the payer wants and missing the clinical signal. A team that runs only option B is producing internally accurate numbers that will not match the payer's report and will create reconciliation work later. The job of the informaticist is to run both, understand the gap, and make the gap visible to leadership rather than papering over it.

## Uncomfortable question

The U.S. spends billions of dollars annually on the work of translating between clinical and billing vocabularies — CDI specialists, coders, audit teams, denial management, the entire infrastructure that exists because the two vocabularies do not match. Some of this work is genuinely necessary. Some of it is friction created by the system's own choice to keep the vocabularies separate. Where would you draw the line, and what would you propose to a CMIO who asked whether any of this work could be eliminated by better informatics?

Hold your answer.
