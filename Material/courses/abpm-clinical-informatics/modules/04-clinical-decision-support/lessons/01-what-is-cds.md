---
id: 01-what-is-cds
title: What CDS Is — And the Range of Things It Covers
order: 1
estimatedMinutes: 35
learningOutcomes:
  - Define clinical decision support broadly enough to include the full range of interventions the field actually counts.
  - Distinguish active from passive CDS, interruptive from non-interruptive, and explain why the distinctions matter.
  - Recognize the most common board-tested CDS modalities (alerts, order sets, infobuttons, documentation templates, dashboards, predictive models).
concepts:
  - cds-definition
  - active-vs-passive-cds
  - interruptive-vs-noninterruptive
  - cds-modalities
  - infobutton
  - order-set-as-cds
  - predictive-cds
---

## Reading

When most people hear "clinical decision support" they picture a popup. The popup interrupts a physician in the middle of placing an order, says something like "this medication may interact with one the patient is already taking," and forces the physician to click *override* or *cancel* before continuing. That popup is CDS. So is the order set the physician opened five seconds earlier. So is the infobutton next to the medication name that links to a drug reference. So is the documentation template that auto-populated the H&P with the patient's problem list. So is the dashboard the quality team uses to flag patients overdue for screening. So is the predictive model that runs every hour and adds a sepsis risk score to the chart.

The boards expect you to define CDS broadly enough to cover all of these and to distinguish them from each other, because the range matters and because most CDS conversations are sloppier than they should be about which kind of CDS is being discussed.

The working definition the field uses, and that the boards anchor on, comes from Osheroff and colleagues in their *CDS Implementer's Guide* (2012):

> **Clinical decision support provides clinicians, staff, patients, and other individuals with knowledge and person-specific information, intelligently filtered or presented at appropriate times, to enhance health and health care.**

Read the definition slowly. The load-bearing pieces are *clinicians, staff, patients, and other individuals* (CDS is not just for physicians); *knowledge and person-specific information* (it is the combination — generic knowledge plus specifics about the person — that distinguishes CDS from a textbook); *intelligently filtered* (filtering is part of the work; an unfiltered alert is not really CDS); and *at appropriate times* (timing is the difference between an alert that helps and one that interrupts). Almost every CDS failure described in the literature can be traced to violating one of these four conditions. The boards reward you for noticing which one was violated.

Now the distinctions you need to be able to make on a stem.

**Active versus passive CDS.** Active CDS pushes information to the user without being asked — an alert fires, a reminder shows up in the chart, a dashboard updates. Passive CDS waits to be invoked — the user clicks an infobutton, opens a reference link, runs a calculator. Active CDS is more powerful (it catches the user when the user might not have known to ask) and more dangerous (it interrupts and contributes to alert fatigue). Passive CDS is gentler and depends on the user knowing to look. The boards test the distinction directly and reward you for recognizing that the right answer for a given clinical problem is sometimes passive and sometimes active.

**Interruptive versus non-interruptive.** Among active CDS, the further distinction is whether the intervention requires the user to do something before continuing. An interruptive alert blocks the workflow until the user clicks. A non-interruptive alert appears in the periphery (a colored banner, an icon, a section of the chart) and the user can continue without engaging. Interruptive CDS is the highest-cost-highest-benefit modality and should be reserved for situations where the cost of missing the intervention is genuinely high. Non-interruptive CDS is cheaper per-firing and is the right choice for the long tail of recommendations that matter but do not justify interrupting the user. The boards have asked questions of the form "this alert was interruptive and is being ignored — what should be done?" and the right answer is often "make it non-interruptive and move the intervention earlier in the workflow," not "improve the alert's wording."

**The modalities you need to recognize on a board stem:**

- **Alerts and reminders.** The classic pop-up CDS. Drug-drug interaction checks, allergy checks, dose-range checks, problem-list-driven preventive care reminders. The most-studied and most-criticized modality.
- **Order sets.** Pre-built collections of orders for a clinical scenario. From Module 3. Order sets are CDS because they embed knowledge about what should be ordered — which is a recommendation, even though it does not look like an alert. Default selections, suggested doses, and embedded order rationales are all CDS embedded in the order set.
- **Documentation templates.** Templates that pre-populate a note with relevant problem list items, medications, recent results, or guideline reminders. The template is CDS because it shapes what the clinician thinks about and what they document.
- **Infobuttons.** Context-sensitive links from the EHR to external knowledge resources (UpToDate, Lexicomp, drug references, guideline documents). Infobuttons are passive CDS — the user clicks to invoke them. The HL7 Infobutton standard defines how the link is constructed so that the external resource opens to the right page for the patient's context (the right drug, the right diagnosis, the right age group). The boards test infobuttons by name.
- **Dashboards and registries.** A diabetes registry that flags patients overdue for HbA1c testing is CDS at the population level. A quality dashboard that highlights patients with uncontrolled blood pressure is CDS for the care team. The fact that it is not a popup does not exclude it from the category.
- **Order checks.** The validation that runs when an order is signed — duplicate-order checks, drug-allergy, drug-drug interaction, drug-disease, dose-range, formulary substitution. Some of these fire as interruptive alerts; others appear as non-interruptive notes.
- **Predictive models and risk scores.** A sepsis early-warning score that runs continuously against the EHR data and surfaces a risk number in the chart is CDS. The fact that the model is statistical or machine-learned does not change the category.
- **Diagnostic decision support.** Tools that suggest differential diagnoses based on patient findings. Older systems (DXplain, QMR, Iliad) and newer LLM-based tools occupy this category. The boards rarely test these in depth but expect you to know they exist.
- **Reference information delivery.** Links to guidelines, drug references, clinical pathways. Distinct from infobuttons in that delivery may be unsolicited or contextual.
- **Workflow support.** Smart phrases, auto-population of forms, default values that reflect clinical guidelines, condition-specific note templates. Each is a small CDS intervention embedded in a workflow rather than a standalone alert.

A useful way to operationalize the breadth: when a board stem describes a CDS intervention, your first move should be to classify it on three axes — active vs passive, interruptive vs non-interruptive, and which of the modalities above it belongs to. The classification often determines which design principles apply and which fixes are reasonable.

A separate concept the boards test by name is the **knowledge-versus-execution** distinction. Knowledge CDS delivers recommendations that the user is free to follow or not (a reminder, an alert, a suggested order). Execution CDS performs the recommended action automatically (auto-cancellation of an order, automated dose adjustment by an infusion pump, automated venous thromboembolism prophylaxis order placement). Execution CDS is rare, regulated, and high-stakes — it removes the human from the decision loop, and Friedman's Fundamental Theorem stops applying directly because the partnership has been replaced by automation. The field has learned, repeatedly, that execution CDS works well for narrow tasks and fails catastrophically when applied to anything broader. The boards expect you to recognize the distinction and to be cautious about execution CDS without being absolute about it.

A final framing point. CDS is sometimes presented as if it were a single thing the field is trying to do better. It is not. It is a category that includes interventions ranging from a popup that fires 200 times a day to a dashboard the quality team looks at once a week. The interventions have different design principles, different failure modes, different evaluation methods, and different governance needs. The single most common mistake in CDS conversations — including some made by experienced informaticists — is to argue about CDS in general when the disagreement is actually about one specific modality. The boards reward you for naming the modality.

## Concrete example

A health system's CDS committee is asked to address a quality gap: patients with diabetes are not consistently receiving foot exams during their primary care visits. Several committee members propose an interruptive alert that fires when a diabetic patient's chart is opened in clinic. The CMIO pushes back and asks the committee to consider the full range of CDS modalities before defaulting to an alert.

The alternatives the committee surfaces:

- **Order set modification**: add the foot exam to the diabetes follow-up order set so it appears as a default item the clinician can order or decline.
- **Documentation template**: include a foot exam section in the diabetes visit note template, with a checkbox for "performed today" and a structured field for findings.
- **Dashboard at the team level**: a registry view that shows the care team which diabetic patients are overdue for foot exams, used at huddles rather than at the point of care.
- **Patient-facing reminder**: a portal message to the patient before the visit asking them to remove their shoes and socks for the foot exam.
- **Workflow change**: a rooming protocol in which the medical assistant performs an initial foot inspection as part of intake and flags anything abnormal for the clinician.
- **Interruptive alert**: the originally proposed pop-up.

The committee implements the order set modification, the documentation template, the dashboard, and the rooming protocol. They explicitly do not implement the interruptive alert, on the grounds that the workflow changes will likely close most of the gap and the alert can be added later if needed. Six months later, foot exam rates have improved substantially. No alerts were created. The CDS intervention is real, effective, and invisible to the clinician as anything that interrupted them.

This is what it means to use the full range of CDS modalities rather than defaulting to alerts. The boards reward this thinking on stems that describe a quality gap and ask for the *best* CDS intervention — the right answer is rarely the alert.

## Uncomfortable question

If alerts are the most-studied and most-criticized CDS modality, why is "add an alert" still the default response in most CDS committees when a clinical problem is identified? Is it because alerts are easy to build, because they are visible to leadership, because committees do not include the full range of disciplines, or some combination — and how would you change the default in a committee you actually sit on?

Hold your answer.
