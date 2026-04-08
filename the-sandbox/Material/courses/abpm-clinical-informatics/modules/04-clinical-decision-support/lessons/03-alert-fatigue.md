---
id: 03-alert-fatigue
title: Alert Fatigue — The Failure Mode the Field Cannot Stop Producing
order: 3
estimatedMinutes: 35
learningOutcomes:
  - Define alert fatigue precisely and distinguish it from alert burden, alert volume, and alert override rate.
  - Identify the design and governance choices that produce alert fatigue and the choices that mitigate it.
  - Recognize the most common board-tested alert-fatigue scenarios and the right responses.
concepts:
  - alert-fatigue
  - alert-burden
  - override-rate
  - tiered-alerts
  - alert-tuning
  - desensitization
  - clinically-significant-alerts
---

## Reading

Alert fatigue is the cognitive and behavioral state in which a clinician, having been exposed to too many alerts of low value, begins to dismiss alerts without engaging with them — including the alerts that would have changed care. It is the single most-cited unintended consequence of CDS deployment, the single most common reason a CDS intervention that worked in the literature fails in the wild, and the single most common subject of board questions about CDS at scale.

The boards expect you to define alert fatigue precisely, distinguish it from related concepts, name the contributors, and identify the mitigations. This lesson walks each piece carefully, because the looseness with which the term is used in everyday conversation is exactly the looseness the exam item writers exploit.

## Definitions

**Alert fatigue** is a behavioral state — desensitization to alerts that produces dismissal without engagement. It is downstream of alert volume but is not the same as alert volume; a clinician exposed to a small number of consistently low-value alerts can develop fatigue, and a clinician exposed to a large number of consistently high-value alerts may not. Fatigue is what the clinician does, not what the system produces.

**Alert burden** is the cognitive and time cost imposed on the clinician by alerts. Burden is closer to a property of the system. A high-burden alert system produces fatigue in most clinicians; a low-burden one does not.

**Override rate** is the percentage of alerts that the clinician dismisses without taking the recommended action. Override rate is the most-tracked alert metric and the most-misinterpreted one. A high override rate may mean the alerts are unhelpful and should be removed (the obvious interpretation). It may also mean the alerts are correctly identifying low-frequency edge cases that the clinician has correctly judged not to apply (a different interpretation entirely). The boards expect you to know that override rate by itself is not a quality metric — the right metric is the *appropriate-override rate*, which is what fraction of overrides represent the clinician correctly judging the alert not to apply versus the clinician dismissing without thinking.

**Alert volume** is just the count of alerts per clinician per shift, per patient, per encounter, or per unit time. High volume is a contributor to fatigue but not synonymous with it.

The boards have asked questions of the form "the override rate for this alert is 95% — what should be done?" and the answer depends on whether the 95% is appropriate (the alert is firing for cases where the clinician has correctly judged it not to apply) or inappropriate (the alert is firing for cases where the clinician should have acted). The right next step is almost always to *audit* the overrides — read a sample, classify them, and let the audit drive the redesign.

## Why the field keeps producing alert fatigue

Several structural reasons:

**Alerts are easy to build.** A new clinical concern arises, the CDS committee meets, the obvious response is "let's add an alert." Building an alert is technically simple, visible to leadership, and produces a deliverable everyone can point to. The discipline of asking whether an alert is the right intervention requires saying no, which is harder than saying yes. Most CDS committees most of the time say yes. The result is incremental accretion — each new alert is individually defensible, the total is unmanageable, and nobody is responsible for the total.

**Removing alerts is harder than adding them.** Each existing alert has a constituency — the team that built it, the clinical service that requested it, the legal or compliance interest it serves. Proposing to remove it raises objections from all of those constituencies, none of whom are individually wrong but who collectively prevent rationalization. Mature CDS programs have explicit governance for retirement, with criteria and a defined process; immature programs have no retirement at all, and the alert library grows monotonically.

**The harms are diffuse and the benefits are visible.** When an alert prevents a medication error, the prevention is concrete, attributable, and reportable as a safety win. When an alert contributes to fatigue and a different clinically important alert is dismissed, the harm is statistical, invisible to the team that built the original alert, and not attributable to anyone. The asymmetry produces continuous addition without continuous subtraction.

**Vendors ship alerts on by default.** Most EHRs come with thousands of pre-built alerts in the medication, allergy, and order-check categories. The default state is everything-on. Turning alerts off requires active work, governance, and a willingness to defend the choice if a missed alert ever produces a safety event. Many hospitals leave most defaults in place because the cost of leaving them on is diffuse and the cost of turning them off is concentrated.

**Drug-drug interaction libraries are over-inclusive.** The vendor libraries that drive interaction alerts are built to flag every interaction the literature has ever described, regardless of clinical significance. The result is that high-volume, low-significance interactions — many of which clinicians have learned to manage — fire repeatedly alongside the rare, clinically critical ones. The signal-to-noise ratio is poor by design, and the design is built around medico-legal protection of the library vendor rather than around clinical utility.

## Mitigations the boards test

**Tiered alerts.** Categorize alerts by severity. The highest tier is interruptive and forces engagement. Lower tiers are non-interruptive and appear in the periphery. Lowest tier is silent and only logged. The discipline of categorization forces the team to ask "is this actually the highest tier?" and produces a more selective alert population. The boards have asked questions about tiered alert systems by name.

**Suppression of duplicate or contradicted alerts.** If the system has already alerted the clinician about a drug-drug interaction and the clinician has overridden it with a documented reason, the alert should not fire again on the same encounter. Duplicate firing without context is one of the easiest fatigue contributors to remove.

**Alert tuning by override audit.** Read the overrides. Classify them as appropriate or inappropriate. Use the classification to tune the rule — narrow the trigger, exclude the cases the clinicians correctly identified as not applicable, raise the severity threshold. This is the slow, ongoing operational work of CDS quality, and it is what the boards reward you for naming when a stem describes alerts that are being ignored.

**Expert review and retirement.** A standing process for reviewing and retiring alerts. A mature program retires as many alerts as it adds, with criteria like "the alert has not changed clinical action in the last six months" or "the override rate is consistently 95% and the override audit shows the overrides are appropriate."

**Pre-deployment piloting.** A new alert is piloted on a small group, the override rate and clinical impact are measured, and the alert is either tuned, rolled out, or shelved. The discipline of piloting catches the worst alerts before they enter the production population.

**Move from interruptive to ambient.** Many alerts that started as interruptive can be redesigned as ambient indicators (a colored banner, a flagged value, a section of the chart) and remain effective without interrupting. The Foot Exam example from lesson 1 is the canonical pattern. The boards reward you for knowing that the right answer for a fatigue problem is often "make it non-interruptive and move it earlier in the workflow."

**Move from physician-facing to non-physician-facing.** As discussed in lesson 2, the right person is often not the physician. Routing alerts to pharmacists, medical assistants, nurses, or patients themselves can deliver the intervention without burdening the physician's alert channel.

## What does NOT mitigate alert fatigue

A few things the boards specifically test as wrong answers:

- **"Telling clinicians to be more careful."** This is not a mitigation. Fatigue is a structural property of the alert population, not a discipline failure of individual clinicians.
- **"Adding more alerts to compensate for the ignored ones."** The intuitive response when an important alert is missed is to add a confirmation alert. This compounds fatigue.
- **"Making alerts more visually prominent."** Bigger fonts, brighter colors, more flashing. The clinician adapts, the new normal is more visual noise, fatigue continues, and the next round of design has nowhere left to go.
- **"Mandatory acknowledgment with a typed reason."** Forcing clinicians to type a reason for every override increases burden without changing behavior; clinicians either type the same one-word reason every time or learn to type past the requirement. The mandate produces compliance theater, not better clinical decisions.

## A diagnostic move for board stems

When a stem describes alert fatigue, the right move is:

1. Identify which kinds of alerts are firing (modality from lesson 1, severity, source).
2. Identify the override rate and ask whether it is appropriate or inappropriate.
3. Identify which of the Five Rights from lesson 2 the alerts are violating.
4. Recommend a structural mitigation — tiering, audit-driven tuning, retirement, channel change, or person change — rather than a per-alert tweak.

The exam item writers will give you the symptom and reward you for the structural answer. They will sometimes give you wrong-answer choices that look like reasonable per-alert tweaks, and the right answer is the structural one.

## Concrete example

A 1,200-bed academic medical center conducts an alert audit and finds that the average internal medicine resident sees 78 medication-related alerts per shift, with an override rate of 92%. A sample audit of overrides shows that 86% of the overrides are *appropriate* — the resident correctly identified the alert as not applying — and 14% are inappropriate, with several involving real interactions the resident should have engaged with.

The CDS committee considers several responses. They reject "tell the residents to read the alerts more carefully" as not actionable. They reject "add a confirmation step" as compounding fatigue. They reject "make the alerts more visually prominent" as fighting the wrong battle. They commit to:

- **Tiering**: classify all medication alerts into three severity levels. Top tier remains interruptive. Middle tier becomes non-interruptive in-context. Bottom tier becomes silent (logged only).
- **Override-driven tuning**: the audit team reads a fresh sample of overrides every quarter and proposes rule narrowings.
- **Retirement criteria**: any alert with appropriate-override rate above 80% and zero attributable safety events for two years is reviewed for retirement.
- **Pharmacist routing**: medium-severity alerts that trigger on pharmacist-actionable issues are routed to the pharmacy team rather than firing on the resident.

Twelve months later: alert volume per shift has dropped by 60%, override rate on the remaining interruptive alerts is around 55% (down from 92%), the appropriate-override rate is roughly the same, and the clinical safety committee finds no increase in alert-related safety events. The intervention is the structural redesign, not a content change.

The boards reward you for recognizing this pattern and for the structural answer. The wrong answers in a stem about this case will look like reasonable per-alert tweaks; the right answer is the program-level redesign.

## Uncomfortable question

Alert fatigue has been described in the literature for over twenty years. The mitigations are well known. Most CDS programs continue to produce it anyway. If the knowledge is not the limiting factor, what is — and what does the answer tell you about how to lead a CDS committee that will *actually* do the structural work rather than the per-alert tweaks?

Hold your answer.
