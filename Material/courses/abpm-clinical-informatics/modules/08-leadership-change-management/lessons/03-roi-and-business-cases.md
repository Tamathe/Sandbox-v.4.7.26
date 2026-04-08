---
id: 03-roi-and-business-cases
title: ROI and Business Cases — Building One Without Lying With Numbers
order: 3
estimatedMinutes: 35
learningOutcomes:
  - Build an ROI case for an informatics intervention without inflating the numbers.
  - Distinguish hard benefits from soft benefits and direct costs from avoided costs.
  - Apply the right time horizon to an informatics ROI calculation and explain why most calculations are partial fictions.
  - Connect TCO from Module 3 to the cost side of an ROI case.
concepts:
  - roi-informatics
  - hard-vs-soft-benefits
  - direct-vs-avoided-costs
  - npv
  - payback-period
  - tco-revisited
  - sensitivity-analysis
  - opportunity-cost
  - business-case
---

## Reading

Most informatics ROI calculations are partial fictions. This is not a moral failure of the people who write them; it is a structural feature of the work. The benefits of an informatics intervention are usually distributed across many people, hard to attribute to the intervention specifically, and visible only in changes to outcomes that have many other contributing causes. The costs are more concrete and easier to underestimate. The honest ROI case is the one that acknowledges all of this and still produces a number leadership can act on. The dishonest ROI case is the one that produces a confident number by hiding the assumptions. The boards test the discipline of building an honest case and reward you for being able to identify the dishonest moves.

This lesson is short and dense. Memorize the vocabulary; the boards use the terms verbatim.

### What an ROI case is

A **return on investment** (ROI) calculation, in its simplest form, is the ratio of the net benefits of an investment to its cost, expressed as a percentage:

> ROI = (Net Benefits − Cost) / Cost × 100%

A 100% ROI means the investment returns its cost plus an equal amount in net benefits. A 200% ROI means it returns its cost plus twice that amount. The number is what leadership wants. The honesty is in how the inputs are derived.

The simple ROI formula does not account for time. **Net present value (NPV)** does — it discounts future benefits and costs back to present-day dollars using a discount rate, on the rationale that a dollar in 2027 is worth less than a dollar today because of inflation, opportunity cost, and risk. NPV is the right framing when the benefits and costs are spread over multiple years, which is true for almost all informatics investments. The boards test the existence of NPV and expect you to know it is the more rigorous framing; they do not test the discount-rate math.

**Payback period** is the time it takes for cumulative benefits to equal cumulative costs. A two-year payback means the institution recoups its investment in two years and the benefits beyond that year are net gain. Payback period is the framing that finance committees most often ask for because it is easy to understand and conservative. It is also the framing that most undervalues long-horizon investments — an intervention with a five-year payback may be wildly valuable in years six through ten and still get rejected because the payback period seems long.

The **time horizon** of the ROI calculation matters enormously. An intervention evaluated over one year may look unattractive; the same intervention evaluated over five years may look excellent; over ten years it may look indispensable. The right horizon is determined by the realistic life of the intervention and by the institution's planning horizon, not by the convenience of the analyst. Choosing too short a horizon is the most common way to make a good informatics investment look bad on paper.

### Hard versus soft benefits

A **hard benefit** is one you can put on a financial statement: real dollars saved, real dollars earned, real headcount reduced, real contracts renewed. Hard benefits show up in the institution's books and are auditable. Examples in informatics:

- Reduction in transcription costs after implementing speech recognition.
- Reduction in claims denial rates after implementing a real-time eligibility check.
- Increase in the patient throughput of a clinic after implementing a streamlined check-in workflow.
- Reduction in printer/paper costs after a paperless conversion.

A **soft benefit** is one that is real and valuable but does not show up on the books in a way that can be cleanly attributed. Soft benefits are not "fake" — they are often the largest benefits of informatics interventions — but they cannot be defended as line items in a finance committee. Examples:

- Improved clinician satisfaction.
- Improved patient experience.
- Improved care coordination.
- Reduced cognitive load.
- Improved staff retention (which has a hard component but is hard to attribute).
- Improved clinical decision quality.

The boards test the distinction directly. A common stem is to describe a list of claimed benefits and ask which are hard and which are soft. Memorize the categories and the principle that the right ROI case includes both, identifies which is which, and does not try to dress soft benefits up as hard ones to inflate the headline number.

### Direct costs versus avoided costs

A **direct cost** is a real dollar the institution will spend: software license fees, implementation labor, training time, infrastructure, ongoing maintenance. Direct costs are concrete, auditable, and tend to be underestimated.

An **avoided cost** is a dollar the institution would have spent without the intervention but will not spend with it. Avoiding a hire because the intervention reduces the workload is an avoided cost. Avoiding a costly outage because a monitoring tool catches a problem early is an avoided cost. Avoiding a malpractice payout because a CDS rule prevented a bad order is an avoided cost.

Avoided costs are the benefit category most prone to inflation. The classic dishonest move is to count avoided costs that the institution would not actually have incurred — claiming "we saved $2 million in malpractice costs" when there is no specific malpractice case the intervention prevented. The honest move is to count avoided costs only when there is a specific, documentable counterfactual: "based on the prior year's run rate of three lost-USB breach incidents per year at an average cost of $75K each, encrypting the USB drives is expected to avoid $225K per year in direct breach response costs." That sentence is defensible. "Our security investment will save millions in breach prevention" is not.

### TCO — the cross-reference to Module 3

**Total cost of ownership (TCO)** was introduced in Module 3 lesson 5 as the framing for evaluating EHR-related infrastructure decisions. TCO returns here as the cost side of every ROI calculation. The principle to internalize is that the TCO of an informatics intervention is much larger than its initial purchase or implementation cost. The full TCO includes:

- Initial purchase / license / contract.
- Implementation labor (institutional, not just vendor).
- Hardware and infrastructure.
- Integration with existing systems.
- Training (initial and refresher).
- Ongoing maintenance and upgrades.
- Content maintenance (the order sets, CDS rules, templates).
- Vendor support contracts.
- Internal support staff (the help desk, the analysts, the optimization team).
- Eventual decommissioning and migration to the successor system.

A common dishonest move is to put only the line-item software cost in the ROI denominator. The honest move is to put the full TCO over the appropriate time horizon. An intervention with a $200K license fee and a $1.8M five-year TCO is a $1.8M decision, not a $200K decision. Most ROI cases that look favorable when the denominator is the line-item cost look much less favorable when the denominator is the full TCO.

### Sensitivity analysis

A **sensitivity analysis** is the discipline of showing how the ROI conclusion changes when key assumptions change. If the case rests on the assumption that physician time is worth $200/hour and the calculation assumes the intervention saves 10 minutes per patient encounter, the sensitivity analysis should show what happens if physician time is actually worth $300/hour or $150/hour, and what happens if the time savings are actually 5 minutes or 15 minutes. The output is a range, not a point estimate.

The discipline matters because point estimates are how ROI cases lie. An honest case shows the range and identifies the assumption that drives most of the variance. A dishonest case shows a single number with two decimal places and pretends the assumptions are facts. The boards test sensitivity analysis lightly but reward you for the disposition.

### Opportunity cost

The hidden line item in every informatics decision. **Opportunity cost** is the value of the next-best thing the institution could have done with the same resources. Building CDS rule X means not building CDS rule Y, not optimizing the order entry workflow, not investing in the analytics platform, not retraining the help desk. The institution has finite informatics capacity, and every project is implicitly a choice not to do other projects.

ROI cases almost never include opportunity cost because it is hard to quantify, but the discipline of asking "what is the next-best use of these resources?" is what separates a CMIO who allocates the informatics budget well from one who picks projects based on whoever asks loudest. The boards do not test opportunity cost numerically, but they reward you for naming it as the right question.

### The honest acknowledgment

The most-tested principle in this lesson, and the one most easily misread as cynicism, is that **most informatics ROI calculations are partial fictions and the right response is not to abandon the practice but to be honest about the fictions while still producing the number**.

The fictions include:

- Soft benefits dressed up as hard.
- Avoided costs without counterfactuals.
- Time horizons chosen for convenience.
- TCO that omits ongoing costs.
- Point estimates without sensitivity analysis.
- Comparison cases that are not really the alternative the institution would have chosen.
- Causal claims about outcomes that have many other contributing causes.

The honest case acknowledges each of these where it applies, presents a range rather than a point estimate, and lets leadership make the decision with the uncertainty visible. Leadership sometimes prefers the dishonest case because it is easier to act on; the CMIO's job is to refuse to provide it. The discipline of saying "I can give you a range, not a number, and here is what would have to be true for the answer to be at the high end versus the low end" is what distinguishes a CMIO who builds long-term credibility from one whose ROI cases stop being trusted after the first prediction misses.

This is the closing lesson to internalize, and the boards test it by rewarding answers that acknowledge uncertainty over answers that project false precision.

## Concrete example

The CMIO of a 280-bed regional hospital is preparing an ROI case for a proposed sepsis early-warning CDS intervention. The intervention will cost $400K to license, $300K to implement (including clinician time), and $150K per year to maintain. The vendor claims that institutions deploying their tool see a 15% reduction in sepsis mortality and a 1.2-day reduction in average sepsis-related length of stay.

Walk the analysis.

**The TCO over five years.** Year 1: $400K license + $300K implementation + $150K maintenance = $850K. Years 2–5: $150K maintenance × 4 = $600K. Plus ongoing internal optimization labor of perhaps $100K/year = $400K. Plus content maintenance and CDS rule tuning, say $50K/year = $200K. Total five-year TCO ≈ $2.05M. The line-item license cost ($400K) is less than 20% of the full TCO. An ROI case that uses the license cost as the denominator is off by a factor of five.

**The hard benefits.** A 1.2-day reduction in sepsis LOS is a hard benefit because LOS reduction frees inpatient bed-days that the institution can use for other admissions (in a hospital that is at or near capacity) or that reduce direct cost (in a hospital that is below capacity). The institution has roughly 800 sepsis admissions per year. A 1.2-day reduction × 800 admissions = 960 bed-days per year freed. At an institutional marginal cost-per-bed-day of perhaps $500, that is $480K/year of avoided cost or freed capacity. Over five years, $2.4M.

The vendor's claimed 15% mortality reduction is harder to monetize as a hard benefit. The right move is to NOT put a dollar value on lives saved in the ROI case, on the principle that monetizing mortality is both ethically uncomfortable and causally weak. Acknowledge it as a soft benefit ("the most important reason to do this is the mortality claim, and the case rests on whether you believe it") rather than as a number.

**The soft benefits.** Improved clinician confidence in sepsis recognition. Reduced moral distress from missed sepsis cases. Improved nursing experience from earlier escalation. Improved patient experience from shorter stays. None of these belong in the headline ROI number. All of them belong in the case as soft benefits.

**The sensitivity analysis.** What if the LOS reduction is 0.6 days instead of 1.2? The benefit drops to $1.2M over five years and the case is barely break-even. What if the institution's marginal bed-day cost is $300 instead of $500? The benefit drops further. What if the implementation labor estimate is 50% too low? The TCO climbs and the case worsens. The CMIO should present a range — "the five-year benefit is between $700K and $3M depending on the LOS reduction we actually achieve and the marginal bed-day cost we use" — and identify the LOS reduction as the assumption that drives most of the variance.

**The dishonest version.** A dishonest version of the same case would: use the $400K license cost as the denominator, include the vendor's mortality claim as a $5M "lives saved" benefit, omit the maintenance and optimization labor, present a single point estimate of "850% ROI," and conclude with "this is one of the highest-return investments the institution can make." The dishonest version will be approved faster than the honest one. It will also stop being trusted after the first realization that the LOS reduction was actually 0.4 days and the maintenance labor was actually $250K/year.

**The right move.** The honest case is the one the CMIO should write. It should include the TCO over five years, the hard benefits with their ranges, the soft benefits as soft, the sensitivity analysis, the explicit identification of which assumptions drive the variance, and a recommendation that does not hide behind the number. "I recommend we proceed with this investment, with the understanding that the five-year benefit is in a wide range, that the case rests on achieving at least an 0.8-day LOS reduction, and that we should commit to a six-month interim review with predefined criteria for retiring the tool if we are not seeing the expected effect." That paragraph is the entire lesson.

## Uncomfortable question

The discipline of building honest ROI cases is rewarded by leadership in the long run and punished by leadership in the short run. The CMIO who presents a range when the CFO wants a number is the CMIO whose proposals get held up; the CMIO who presents a confident point estimate is the CMIO whose proposals get approved. The asymmetry is real and is part of why most institutional ROI cases drift toward false precision over time. As an informaticist preparing your first major ROI proposal, what is your obligation to present the honest version even when you know it will be received less favorably than the dishonest one? Do you build the credibility slowly by being right in a range when others were wrong with point estimates, or do you match the institution's prevailing dishonesty to get your project approved and worry about the credibility later? The boards do not test this question. The job tests it on every major proposal.

Hold your answer.
