---
id: 02-cds-five-rights
title: The CDS Five Rights — The Framework Every Board Question Is Built On
order: 2
estimatedMinutes: 35
learningOutcomes:
  - State the CDS Five Rights and apply each to a real CDS design.
  - Identify which Right was violated when a CDS intervention fails.
  - Use the Five Rights as a checklist for evaluating proposed CDS interventions before they are deployed.
concepts:
  - cds-five-rights
  - right-information
  - right-person
  - right-format
  - right-channel
  - right-time
  - cds-design-framework
---

## Reading

The CDS Five Rights are the framework Jerome Osheroff and colleagues introduced in the *CDS Implementer's Guide* and that has become the de facto standard for evaluating any CDS intervention. They are the framework most CDS committees actually use, the framework most CDS publications reference, and the framework the boards build questions around. If you internalize one CDS framework deeply enough to use it without looking it up, this is the one.

The Five Rights are:

1. **The right information**
2. **To the right person**
3. **In the right format**
4. **Through the right channel**
5. **At the right point in workflow**

That's it. Five short clauses. The reason they are powerful is not that they are complicated — they are not — but that almost every CDS failure can be traced to violating at least one of them, and the discipline of asking all five before deploying an intervention is what separates a working CDS team from one that ships alerts and watches them get ignored.

Walk through each one carefully.

## Right information

The information delivered must be accurate, evidence-based, current, and specific enough to be useful. "Accurate" means the underlying recommendation is correct — the guideline is current, the literature is solid, the rule logic does what it claims. "Specific" means the recommendation is tailored to the patient, not a generic statement. A CDS rule that fires "consider an ACE inhibitor" on every patient with hypertension is delivering generic information; a rule that fires "this patient with HFrEF and EF <40% is not on a guideline-directed beta-blocker" is delivering specific information.

The most common right-information failures:

- **Stale knowledge.** The rule was built when the guideline said X, the guideline now says Y, and nobody updated the rule. Knowledge maintenance is a real, ongoing operational burden that CDS committees often underweight at deployment time and discover later.
- **Poor specificity.** The rule fires too broadly because the underlying logic does not have enough context. The result is alerts that are technically correct and clinically unhelpful.
- **Wrong patient.** The recommendation is correct for someone but not for this patient — usually because the rule did not check exclusions (e.g., a beta-blocker recommendation that fires for a patient with severe asthma).

When a board stem describes a CDS intervention that is "ignored" or "overridden," the first question to ask is whether the information itself was right. Often it was, and the failure is at one of the other four Rights. But sometimes the underlying knowledge is wrong, and no amount of better delivery will fix that.

## Right person

CDS must be delivered to the person who can act on it. This sounds trivial and is the most-violated Right in practice. A drug-drug interaction alert that fires for an admitting physician who is placing the home medication list is going to the wrong person — the right person is whoever will write the inpatient orders that interact, often a different physician, sometimes a pharmacist. A reminder about an abnormal mammogram result that goes to a covering provider with no relationship to the patient is going to the wrong person — the right person is the primary care physician or the surgeon who ordered the test. A foot-exam reminder for a diabetic patient that fires when an emergency physician opens the chart for a sprained ankle is going to the wrong person — the right person is the primary care provider, ideally before the next visit.

The right-person question is the one CDS designers most often skip because the information is in front of them and the workflow is in front of them and the question of *who* feels secondary. It is not. The boards have asked questions of the form "this alert fires for the correct condition but is consistently ignored — what should be changed?" and the right answer is often "deliver it to the team member whose role makes them responsible for acting on it."

A practical extension of the right-person principle is the **non-clinician audience**. CDS for nurses, pharmacists, medical assistants, and patients themselves is often more effective than CDS for physicians because the action lives with the non-physician role. Foot exam reminders to medical assistants. Medication reconciliation prompts to pharmacists. Vaccination reminders directly to patients through the portal. Each is CDS in the Osheroff sense, and each may be more effective than a physician-facing alert because the right person is not always the physician.

## Right format

The information must be presented in a form the person can actually use in the time they have. A multi-paragraph alert with five clinical recommendations and three citations is not a usable format for a physician about to sign an order; the physician will dismiss it without reading. A single-line summary with one clear recommended action is. A quality dashboard with twelve metrics and no priority ranking is not usable for a five-minute team huddle; a dashboard with one highlighted gap and one recommended action is.

Format includes content density, visual hierarchy, the wording of the recommended action, the use of color and severity coding, and the affordances for action (an alert with a one-click "accept" button is a different format from one that requires the user to navigate to another screen). The boards test format directly when a stem describes an alert that is "wordy" or "unclear" or "buried in a long list" — the answer is a format fix.

A specific format failure pattern: **CDS that explains the reasoning at the cost of the recommendation**. A well-meaning clinical pharmacist writes an alert that begins with the pharmacology, then the evidence, then the alternative options, and finally the action. The physician reads the first sentence and dismisses. The format prioritized the pharmacist's reasoning over the physician's need for an actionable recommendation. The fix is to lead with the action and put the reasoning in a collapsible section for those who want it.

## Right channel

The information must be delivered through the right communication medium. A pop-up alert in the EHR is one channel. A message in the EHR's secure messaging is another. A page or text message to the on-call physician is another. An email to the care team is another. A handoff at the morning huddle is another. The right channel depends on the urgency, the role of the person, the workflow, and the consequences of missing the message.

A critical lab result that requires immediate action does not belong in a non-interruptive banner the physician will see when they next open the chart. It belongs in an interruptive alert, possibly in an active page to the responsible physician, and possibly in a phone call from the lab. A reminder about routine preventive care does not belong in a page; it belongs in a chart reminder or a pre-visit summary.

Channel mismatches are among the most common right-channel failures. A study showed that critical results communicated via the EHR's secure messaging often took longer than 24 hours to be acknowledged because the messaging system was not how the physicians actually communicated about urgent issues. The fix was to move critical results to an active notification channel — the EHR was not the right channel for urgency.

The boards test channel choice in stems describing communication failures. The right answer is often a channel change rather than a content change.

## Right time / Right point in workflow

The intervention must arrive when the person can act on it, not before and not after. An alert about a drug interaction must fire while the physician is placing the order, not after the order is signed. A reminder about overdue cancer screening must arrive before the patient leaves the visit, not after. A pre-procedure checklist must appear at the start of the procedure, not when the procedure is over.

"Right time" is the Right that distinguishes good CDS from bad CDS most reliably. Almost every CDS modality has a workflow point at which it is maximally useful and many points at which it is useless or harmful. An alert that fires at the wrong time is rejected as noise; the same alert at the right time can change the decision. The Foot Exam example from lesson 1 is the canonical case: the same recommendation, delivered as an interruptive alert at chart open, is ignored, but delivered as a default in the order set or a section of the documentation template, is acted upon. Same information, same person, same channel, different time — different outcome.

The right-time principle is also why CDS Hooks (which we will cover in lesson 5) is designed around named workflow events rather than continuous polling: the goal is to fire the intervention when it can do its work and not at any other time.

## Using the Five Rights as a design checklist

The discipline of using the Five Rights as a checklist before deploying any CDS intervention is what separates a mature CDS practice from an immature one. The committee asks, for every proposed intervention:

1. Is the information accurate, evidence-based, current, and specific enough?
2. Who is the right person to receive this, and is that the person we are routing it to?
3. What format will let that person use it in the time they have?
4. What is the right channel for the urgency and the role?
5. What is the workflow point at which the intervention can actually change the decision?

If any of the five is unanswered or unsatisfactory, the intervention is not ready. The checklist does not guarantee success, but it eliminates the most common failure modes before they reach production.

The boards will give you stems in which a CDS intervention is failing and ask you to identify which Right was violated. The exam item writers use the Five Rights vocabulary directly. Memorize the five clauses, practice mapping a stem to the violated Right, and you will recognize the question pattern within seconds.

## Concrete example

A hospital deploys an alert that fires when a clinician is signing orders for a patient with a creatinine clearance below 30, warning about renally-cleared medications. The alert was built by the clinical pharmacy team based on solid evidence (right information). It fires inside the order signing workflow (right time and right point in workflow, mostly). It is delivered to the ordering provider (right person, mostly). The format is a multi-line text block with three drug class recommendations and a link to the renal dosing reference (format is verbose). The channel is an interruptive pop-up.

After three months, the alert has a 92% override rate. The CDS committee reviews the alert and applies the Five Rights:

- **Right information**: yes, the underlying logic is correct.
- **Right person**: mostly. The ordering provider is the right person for *this* order, but the alert fires for *any* order on the patient, including orders for renally-safe drugs. The result is that the alert fires many more times than the underlying recommendation actually applies.
- **Right format**: no. The verbose multi-class recommendation is dismissed before being read.
- **Right channel**: probably overkill. Interruptive alerts for every order on a low-CrCl patient is more channel than the situation calls for.
- **Right point in workflow**: yes for the order being signed, but the alert is firing for orders the recommendation does not actually apply to.

The fix the committee implements: narrow the alert to fire only when the order being placed is in one of the renally-relevant drug classes (right information becomes more specific), change the format to a one-line summary with an expandable section (right format), and convert the alert from interruptive to non-interruptive for the lower-severity classes (right channel). After the changes, the override rate drops to 35%, the recommendation is followed in a meaningful share of fires, and the clinicians stop complaining about the alert. The intervention now satisfies all five Rights.

This is what the boards reward: not "remove the alert" or "improve the wording," but a structured walk through the Five Rights, identifying which were violated, and proposing fixes targeted at each.

## Uncomfortable question

The Five Rights are simple, well-known, and used as a checklist by most CDS committees. CDS interventions still fail, often, in ways the Five Rights would have predicted. Why? Is the framework being applied superficially, or is something missing from the framework, or is the failure rate just the cost of doing CDS at scale — and which of these answers should change how you run a CDS committee?

Hold your answer.
