---
id: 05-healthcare-financing-and-the-payment-environment
title: Healthcare Financing and the Payment Environment — Why Informatics Interventions Live or Die on Who Pays
order: 5
estimatedMinutes: 50
learningOutcomes:
  - Distinguish fee-for-service from value-based care and explain how each shapes the business case for an informatics intervention.
  - Name the major U.S. value-based payment vehicles (ACOs, bundled payments, capitation, hospital VBP, HRRP) and what each rewards.
  - Explain MACRA, the Quality Payment Program, MIPS, and Advanced APMs at the level a CMIO would need to defend a strategy.
  - Trace the history from Meaningful Use to Promoting Interoperability and recognize the current name on the boards.
  - Diagnose informatics intervention failures rooted in payment-incentive misalignment, not in technology.
concepts:
  - fee-for-service
  - value-based-care
  - aco
  - macra
  - qpp-mips-apm
  - promoting-interoperability
  - meaningful-use-history
  - hospital-vbp
  - hospital-readmissions-reduction
  - bundled-payments
  - capitation
  - ffs-vs-vbc-incentive-misalignment
---

## Reading

Most informatics interventions that "should work" do not, and the most common reason is not the technology. The most common reason is that the underlying payment model rewards the opposite behavior. A duplicate-test alert saves money for whoever pays for the test. Under fee-for-service, that is the payer, not the hospital that ordered it — so the hospital has no economic interest in suppressing the duplicate, and the alert lives in a folder labeled "good idea, no business case." Under capitation, the same alert is suddenly the most valuable feature in the EHR, because every duplicate test the hospital orders comes directly out of its margin. The technology is identical in both cases. The economics decide whether anyone funds the work, configures the alert, monitors it, and defends it against frontline pushback. The boards expect a clinical informaticist to be able to read a payment environment and predict which informatics work will get funded and which will not.

Start with the two ends of the spectrum.

**Fee-for-service (FFS)** is the traditional model: providers are paid for each service rendered. More visits, more tests, more procedures, more revenue. FFS has the merit of being simple to administer and the demerit of aligning provider incentives with volume rather than with outcomes. Most of the U.S. health system was, and to a large extent still is, FFS. Most informatics interventions that promise "reduced unnecessary utilization" are economically hostile to FFS providers and have to be funded out of mission, regulation, or shame, not out of a positive business case. When a board stem describes an informatics initiative that "failed to gain traction" or "was deprioritized after the pilot," ask whether the underlying payment model rewards the behavior the intervention was supposed to produce. Often the answer is no, and the intervention was doomed before it shipped.

**Value-based care (VBC)** is the umbrella name for payment models that tie reimbursement to quality, outcomes, total cost of care, or population health, rather than to volume of services. VBC is not one model — it is a family. The family includes pay-for-performance bonuses, bundled payments for episodes of care, shared-savings arrangements, full-risk capitation, and global budgets. What unifies the family is that the provider, in some way, makes more money by delivering *less unnecessary care* and *better outcomes*. VBC is the political and financial driver behind almost every modern clinical informatics investment in care management, registries, population health analytics, risk stratification, transitions of care, and event notification services. Without VBC, none of those investments has a business case worth defending.

The named VBC vehicles you must know:

- **Accountable Care Organizations (ACOs).** A group of providers takes joint financial accountability for the cost and quality of care for a defined attributed patient population. The Medicare Shared Savings Program (MSSP) is the largest U.S. example. ACO economics are why care management informatics, ADT-based event notification feeds, and post-discharge follow-up tools have a budget line in any health system that participates in an ACO. The boards will use "ACO" in stems and expect you to recognize that the economic logic of the stem is shared savings on a defined population.

- **Bundled payments.** A single payment covers all services associated with an episode of care — the canonical example is a hip replacement plus 90 days of post-acute care. The provider (or the bundling entity) keeps the difference if the actual cost is below the bundle price and eats the loss if it is above. Bundled payments create demand for episode-level analytics, post-acute care coordination, and tight readmission prevention. They are the cleanest VBC vehicle for procedural care.

- **Capitation.** A provider or organization receives a fixed per-member-per-month payment to provide all needed care for an attributed population, regardless of utilization. Capitation is the most aggressive form of provider risk-bearing and the strongest economic engine for population health informatics. Under full capitation, every avoided ED visit, every avoided readmission, every avoided duplicate test goes straight to the bottom line. Capitation is also the model under which informatics-driven over-restriction of care becomes an ethical risk — the same incentive that funds prevention also funds denial.

- **Hospital Value-Based Purchasing (VBP).** A CMS program that adjusts inpatient prospective payment system payments based on hospital quality measures: clinical outcomes, patient experience (HCAHPS), safety, and efficiency. VBP reads quality data the hospital reports through its EHR and registries. It is the financial pressure that funds most hospital quality informatics work — measure construction, dashboard development, registry curation, abstraction support — and the boards will name it directly.

- **Hospital Readmissions Reduction Program (HRRP).** A separate CMS program that penalizes hospitals with excess 30-day risk-adjusted readmissions for selected conditions. HRRP is the program that created the financial case for transitions-of-care informatics, post-discharge follow-up, and ADT-based subscription event notification services that page a primary care office whenever an attributed patient is discharged from any hospital in the region. The boards will write HRRP stems that look like "the hospital is pursuing a 30-day readmission initiative" — the named program behind the work is HRRP.

Now the regulatory layer that ties most of this together for clinicians: **MACRA**. The Medicare Access and CHIP Reauthorization Act of 2015 did three things at once. It repealed the SGR (Sustainable Growth Rate) formula that everyone had been promising to fix for a decade. It consolidated several Medicare physician payment adjustment programs into a single **Quality Payment Program (QPP)**. And it created two QPP tracks for clinicians: **MIPS** and **Advanced APMs**.

**MIPS — the Merit-based Incentive Payment System** — scores most participating clinicians on four performance categories: Quality, Cost, Improvement Activities, and **Promoting Interoperability**. Each category is weighted, the scores are combined, and the resulting composite score adjusts the clinician's Medicare payments two years later (positive, negative, or neutral). MIPS is a pay-for-performance program for clinicians, not a true risk-bearing model — clinicians are paid FFS and their FFS rates are adjusted by performance. MIPS produces enormous demand for quality measure reporting and EHR-based data capture, which is most of what the boards care about.

**Advanced APMs** are Alternative Payment Models that meet specific criteria for downside financial risk and certified EHR use. Clinicians who get a sufficient share of their Medicare payments through Advanced APMs are exempted from MIPS and qualify for a separate bonus payment. The Advanced APM track is how MACRA tries to push clinicians toward genuine risk-bearing rather than performance-adjusted FFS. The boards will write stems that ask you to distinguish MIPS from Advanced APM participation and to identify which one applies to a described practice.

The fourth MIPS category — **Promoting Interoperability (PI)** — is the renamed successor to **Meaningful Use**. This is required board history. Meaningful Use was the HITECH-era CMS program (Stages 1, 2, and 3) that paid hospitals and clinicians to adopt and use certified EHRs in increasingly substantive ways. Stage 1 was about adoption (do you have a certified EHR and are you using it for basics like CPOE and problem lists). Stage 2 was about exchange and patient access. Stage 3 was about advanced use cases. In 2018, the program for clinicians was rolled into MIPS as the Promoting Interoperability category, and the parallel hospital program was renamed Promoting Interoperability as well. The current measures inside PI are e-prescribing, health information exchange, provider-to-patient exchange, and public health and clinical data registry reporting. The boards still occasionally use the phrase "Meaningful Use" out of habit, but the current name is **Promoting Interoperability**, and you should use it.

A note on what *not* to memorize. The boards do not want you to recite specific MIPS scoring weights, the specific PI measures by year, or the dollar values of the payment adjustments — these change every year and are not stable enough for an exam written eighteen months in advance. The boards do want you to know the names of the programs, what each rewards, what economic logic drives them, and how an informatics initiative connects to whichever named program funds it. If you can read a stem, identify which payment vehicle is implied by the described economics, and predict which informatics intervention has a business case under that vehicle, you have the level of mastery the exam wants.

## Concrete example

A new CMIO at a community hospital inherits two stalled initiatives. The first is a duplicate-imaging alert that the radiology department built two years ago, which fires when a patient has a recent CT of the same body part on file. The hospital is paid FFS by every payer in its market. Under FFS, every CT the alert prevents is a CT the hospital does not get paid for, and the radiology department's volume metrics drop. The alert was technically successful in pilot, was opposed by the radiology administrator on revenue grounds, and was quietly turned off three months after go-live. The technology was fine. The economics never made sense.

The second stalled initiative is an ADT-based event notification service that pages the patient's PCP within two hours of any discharge from the hospital, intended to support post-discharge follow-up. The hospital does not directly benefit from the follow-up under FFS, but a year ago the hospital joined an MSSP ACO covering a quarter of its panel, and HRRP penalties have started to bite on its 30-day readmission rate for heart failure. Under ACO economics, every avoided readmission saves money the hospital shares in. Under HRRP, every avoided readmission also reduces a direct CMS penalty. The CMIO recommends pausing the duplicate-imaging project (no business case under the current payment mix) and resourcing the event notification service immediately (two payment vehicles independently rewarding the same behavior).

The CMIO's recommendation is not a technology recommendation. It is a payment-environment recommendation. The boards expect a clinical informaticist to make exactly this kind of call, and to be able to defend it by naming the payment programs involved.

## Uncomfortable question

If informatics intervention success is so tightly bound to payment incentives, and if the U.S. payment landscape is genuinely a hybrid of FFS and partial value-based contracts that varies by payer and by patient, is it ever ethical for a clinical informaticist to deploy an intervention that is clinically right but economically hostile to the institution that employs them? Where does the duty to the patient stop and the duty to the employer begin, and which named change-management framework gives you the best vocabulary for navigating the conflict?

Hold your answer.
