---
id: 01-measure-design-and-specification
title: Measure Design and Specification — What a Quality Measure Actually Is
order: 1
estimatedMinutes: 40
learningOutcomes:
  - Read a CMS or NQF measure specification and correctly identify the numerator, denominator, exclusions, exceptions, and measurement period.
  - Distinguish process measures, outcome measures, and balancing measures with clinical examples.
  - Place any measure inside Donabedian's structure-process-outcome framework and explain why the placement matters.
  - Define an eCQM and explain why CQL (cross-referenced from Module 4) is the language in which they are written.
concepts:
  - clinical-quality-measure
  - numerator-denominator
  - measure-exclusions-exceptions
  - process-vs-outcome-measure
  - balancing-measure
  - donabedian
  - ecqm
  - cqi-and-cql
---

## Reading

A clinical quality measure is not an opinion about whether care was good. It is a precisely specified arithmetic operation on a defined population, evaluated over a defined time window, that produces a number — a percentage, a rate, a count — that someone has decided is a stand-in for quality. The boards do not test whether you have aesthetic preferences about quality measurement; they test whether you can read a measure specification and know what it actually says. That is a literacy skill, and most clinicians who think they have it actually do not, because they have only ever seen the dashboard and not the spec underneath.

Every quality measure has the same underlying structure. There is a **denominator** — the population the measure applies to. There is a **numerator** — the subset of the denominator who received the thing the measure rewards (or experienced the outcome the measure tracks). There are **exclusions** — patients who never should have been in the denominator in the first place because the measure does not apply to them. There are **exceptions** — patients who would have been in the denominator but for whom there is a documented clinical reason that the numerator action did not happen. There is a **measurement period**, almost always a calendar year for reporting measures, sometimes a rolling window for internal dashboards. The measure score is the numerator divided by the denominator, after exclusions are removed and exceptions are subtracted in whatever way the spec says. That last clause matters: not all measures handle exceptions identically, and the spec is the only authority.

Memorize the distinction between exclusions and exceptions. The boards test it.

- **Exclusions** are removed from the denominator entirely. A patient excluded from a colonoscopy screening measure (e.g., a patient with a prior total colectomy) was never eligible. They affect the size of the population the score is computed on.
- **Exceptions** stay in the denominator but are removed from the failing count when there is a documented clinical reason the numerator action did not occur. A patient who refused a flu shot may be a documented exception in some measures, allowing the practice not to be penalized for their refusal. Different measures permit different exception categories — patient refusal, medical contraindication, system reason — and some measures permit none at all.

The next layer of literacy is recognizing that a measure spec is a *coded artifact*, not an English description. The spec defines its denominator and numerator using value sets — bundles of codes from controlled vocabularies (Module 2). A diabetes denominator is a list of ICD-10 codes for diabetes. A blood pressure numerator is a list of LOINC codes for the BP observation paired with a value comparison. The English description is the marketing brochure; the value sets are the contract. When two institutions disagree on whether a patient counts in a measure, the value sets are usually where the disagreement lives.

### Process measures, outcome measures, balancing measures

The most common typology of quality measures separates them by what they actually measure.

A **process measure** asks whether a recommended action was taken. *Did the patient receive an aspirin within 24 hours of an MI? Did the patient with diabetes have a foot exam in the last year? Did the eligible patient receive their flu shot?* Process measures are popular because they are easier to compute, easier to attribute to specific clinicians, and harder to game with risk adjustment. They are also intellectually shallower than outcome measures because the process is the proxy for the outcome and the proxy is sometimes wrong — a patient who got the aspirin can still die, and a patient who got the foot exam can still lose the foot.

An **outcome measure** asks what happened to the patient. *Mortality after MI. Amputation rate in diabetes. HbA1c control. 30-day readmission rate. Hospital-acquired infection rate.* Outcome measures are what you actually care about clinically. They are also harder to attribute (the patient saw five clinicians, which one owns the outcome?), harder to interpret without risk adjustment (the safety-net hospital takes sicker patients), and more vulnerable to data quality problems (if you do not capture the bad outcome, you cannot measure it). The boards reward you for understanding both why outcome measures are intellectually superior and why most operational measurement is still process.

A **balancing measure** asks whether the intervention to improve one measure has degraded something else. If you push the inpatient sepsis bundle hard to improve sepsis mortality (the outcome you care about), you may also drive up unnecessary antibiotic use, broad-spectrum coverage in patients who do not need it, and downstream *C. difficile* rates. A balancing measure is the *C. difficile* rate sitting next to the sepsis bundle compliance rate on the same dashboard. The boards specifically test the existence of balancing measures because their presence on a dashboard is a marker of analytic maturity. A dashboard with only "go up" and "go down" arrows on the same direction is a dashboard that has not asked itself what could go wrong.

### Donabedian — memorize the trio

Avedis Donabedian's 1966 paper *Evaluating the Quality of Medical Care* introduced the structure-process-outcome framework that underlies almost everything that came after. Memorize the three terms cold; they appear on the boards both directly and as the implicit structure behind harder questions.

- **Structure** is what the system *is*. Staffing ratios, the existence of a stroke center, the EHR being installed at all, the presence of a sepsis protocol on paper, board certification of the radiologists. Structural measures are easy to count and weak as proxies for quality.
- **Process** is what the system *does*. The aspirin within 24 hours. The hand hygiene rate. The percentage of eligible patients who received the recommended action. Most quality measures in routine use are process measures.
- **Outcome** is what *happens to the patient*. Mortality, complications, function, satisfaction, cost.

Donabedian's argument was that the three are linked — better structure should produce better process should produce better outcomes — but that the links are leaky and require evidence to assert in any specific instance. The framework's power is that it forces you to ask, for any measure on any dashboard, "which of the three is this, and what is the evidence that it predicts the others?" Most quality dashboards are dominated by process measures because they are operationally tractable, even though outcomes are what we care about. The boards reward you for knowing the framework and for being able to place any measure into one of the three buckets on demand.

### eCQMs and CQL — the bridge to Module 4

An **electronic clinical quality measure (eCQM)** is a quality measure whose specification is written in a form that an EHR can compute automatically from its own data, without manual chart abstraction. The transition from paper-and-abstractor measurement (a nurse pulling charts and counting) to eCQMs has been the biggest single change in operational quality measurement over the last fifteen years. CMS publishes eCQM specifications annually for use in the Hospital Inpatient Quality Reporting Program, the Merit-based Incentive Payment System (MIPS), and other federal programs. ONC certifies EHRs against the ability to compute the federally specified eCQMs.

The language eCQMs are written in is **Clinical Quality Language (CQL)**, the same language you saw in Module 4 lesson 5 for CDS rules. This is not a coincidence. CQL was designed by HL7 to be a single language that could express both decision logic and quality measure logic, on the rationale that both are operations on the same underlying clinical data and both should be written in a form that is human-readable, machine-executable, and reusable across implementations. The boards test the cross-reference: knowing that CQL underlies both CDS Knowledge Artifacts and eCQMs is a small piece of literacy that distinguishes someone who has read the spec from someone who has read about the spec.

The practical implication for an informaticist is that the same engineering team that maintains your CDS content is, increasingly, the team that maintains your eCQM logic, and the same value-set governance applies to both. If your colorectal screening CDS rule and your colorectal screening quality measure use different code sets to identify "due for screening," you have a quality problem that no amount of dashboarding can fix.

## Concrete example

Consider a familiar measure: **CMS122v12 — Diabetes: Hemoglobin A1c (HbA1c) Poor Control (>9%)**. The English description is: the percentage of patients 18–75 years of age with diabetes who had HbA1c > 9.0% during the measurement period. Counterintuitively, this is a measure where a *lower* score is better — the measure counts patients with poor control.

Walk the spec.

- **Initial population**: patients 18–75 with at least one outpatient encounter during the measurement period. Encounters are defined by a value set of CPT codes for outpatient evaluation-and-management visits.
- **Denominator**: the initial population intersected with patients who have a diagnosis of diabetes during the measurement period or the prior year. Diabetes is defined by a value set of ICD-10 codes — and those codes are the entire definition. If a patient's diabetes is documented in a free-text note but not coded, they are not in the denominator. This is the single most common source of disagreement between clinicians and dashboards.
- **Denominator exclusions**: patients in hospice during the measurement period. Patients with a diagnosis of pregnancy, gestational diabetes, or steroid-induced diabetes (per the spec — check the current year for the exact list). These are removed from the denominator entirely because the measure does not apply to them.
- **Numerator**: patients in the denominator who had their most recent HbA1c during the measurement period > 9.0%, OR who had no HbA1c during the measurement period at all (the absence of a value is treated as poor control on the rationale that a clinician who is not measuring is failing the patient). The "no HbA1c" branch is what catches institutions that game the score by stopping measurement of poorly controlled patients.
- **Denominator exceptions**: this measure does not allow exceptions. There is no documented-reason category that pulls a patient out of the failing count. A patient who refused HbA1c testing all year is still in the failing numerator. The choice to permit no exceptions is itself a design decision and reflects the measure author's judgment that exceptions on this measure would be too easily gamed.
- **Measurement period**: calendar year for federal reporting.

A clinician reading this for the first time often objects: "but the patient with end-stage cancer who is enrolled in palliative care should not be counted." The spec answers: they are excluded by hospice. "But the brittle type 1 diabetic whose A1c we cannot get below 9 despite max therapy?" The spec answers: there is no exception for therapeutic failure. The intentional refusal to permit a "we tried hard" exception is the measure's way of saying that aggregate measurement requires aggregate judgment, and the cases where the measure is locally wrong will average out across the population. Whether you agree with the design choice is a separate question from whether you can read it correctly. The boards test the latter.

Now place the measure in Donabedian. Is it structure, process, or outcome? It is *almost* an outcome measure — the HbA1c is a biomarker, and biomarkers are intermediate outcomes — but in operational classification it is treated as a process measure because what is actually being counted is the failure to either measure or control, and "control" is being assessed through a single lab value at a single point. A purist would call it an intermediate-outcome measure. A pragmatist would call it a process measure. The boards have been known to accept both, with the rationale being what matters.

## Uncomfortable question

The diabetes A1c measure has been in widespread federal use for over fifteen years. Its design choices — the no-exceptions rule, the "no test = failure" branch, the population-level framing — produce known unfair penalties at the level of individual practices, particularly safety-net practices that take patients with severe disease and limited resources. The measure is also one of the most clearly correlated with patient outcomes in the entire CMS portfolio. Both of those things are true. As an informaticist sitting on a quality committee, what is your obligation when leadership asks you whether to adopt the measure for an internal dashboard knowing both that it will produce real signal and that it will visibly disadvantage the practices serving the sickest patients? Do you adopt it as written, adopt it with a local risk-adjustment overlay (which the federal spec does not include and would not endorse), or refuse to adopt it and use a homegrown alternative? The answer is not obvious and the boards do not test it directly, but the disposition you bring to the question is what determines whether you do this work well.

Hold your answer.
