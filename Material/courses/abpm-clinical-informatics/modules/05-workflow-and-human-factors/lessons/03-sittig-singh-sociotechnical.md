---
id: 03-sittig-singh-sociotechnical
title: The Sittig-Singh Sociotechnical Model — Eight Dimensions, Memorize Them
order: 3
estimatedMinutes: 40
learningOutcomes:
  - Name the eight dimensions of the Sittig-Singh sociotechnical model and define each.
  - Diagnose a real or described EHR-related failure by identifying which dimension(s) are involved.
  - Use the model as a checklist when designing or evaluating any health IT intervention.
concepts:
  - sociotechnical-model
  - sittig-singh
  - eight-dimensions
  - hardware-and-software
  - clinical-content
  - human-computer-interface
  - people-dimension
  - workflow-and-communication
  - internal-policies
  - external-rules
  - measurement-and-monitoring
---

## Reading

This lesson is the closest thing this module has to a single must-memorize artifact. The **Sittig-Singh sociotechnical model** is a framework introduced in a 2010 paper in *Quality and Safety in Health Care* by Dean Sittig and Hardeep Singh. It identifies eight dimensions that interact to determine the success or failure of any health IT intervention. The boards test the eight dimensions directly. You will see questions of the form "an EHR-related safety event involved [described problem] — which sociotechnical dimension is most relevant?" and the answer requires recall of the model. Memorize the eight names. Practice mapping a stem to a dimension. There is no clever framework that lets you skip the rote step.

The reason the model matters beyond board prep is that it is the most useful single checklist the field has produced for thinking about why health IT works or doesn't. Every dimension is genuinely separable — failures in different dimensions look different and need different fixes — and the eight together cover most of what determines whether an intervention does its job. When you sit on a CDS committee or an IT project review, the model is what you actually use, even if you do not name it.

## The eight dimensions

In Sittig and Singh's framing, they are:

1. **Hardware and software computing infrastructure**
2. **Clinical content**
3. **Human-computer interface**
4. **People**
5. **Workflow and communication**
6. **Internal organizational policies, procedures, and culture**
7. **External rules, regulations, and pressures**
8. **System measurement and monitoring**

Notice the structure. Three dimensions are technical or near-technical (1, 2, 3). Two are about humans inside the organization (4, 5). Two are about the organizational context (6, 7). One is about whether you actually look at what the system is doing (8). The eight are not orthogonal — they interact constantly — but each captures a kind of failure that the others miss.

Walk through them carefully.

### 1. Hardware and software computing infrastructure

The physical and software layer the EHR runs on. Servers, storage, network, operating system, database engine, the application code itself. Failures in this dimension look like outages, slow response times, data corruption, software bugs, capacity problems, and security vulnerabilities. The fix is in the hands of the IT operations and engineering teams.

Failures in dimension 1 are the kind that the press calls "the EHR is down" and that the IT team responds to first. The boards test this dimension less often than the others because it is the easiest to diagnose, but they do test it as part of disambiguation questions where the right answer is "this is a hardware failure, not a workflow failure."

### 2. Clinical content

The clinical knowledge encoded in the system — order sets, CDS rules, drug databases, problem lists, allergy dictionaries, document templates, formulary, antibiograms, the local guideline content. Failures look like out-of-date guidelines, wrong dose ranges, missing drug interactions, order sets that recommend retired antibiotics, problem list dictionaries that lack relevant codes.

This is the dimension where the *knowledge maintenance* burden lives. Clinical content is not built once and forgotten; it has to be reviewed, updated, and retired continuously, and the operational discipline to do that work is what separates organizations that have good content from organizations whose content was correct in 2018 and is now wrong.

The boards test clinical content failures often, especially in the context of CDS rules that have gone stale.

### 3. Human-computer interface

The screens and interactions through which users interact with the system. This is the usability dimension from lesson 2. Failures look like Nielsen-heuristic violations, cognitive overload, confusing displays, hard-to-find functions, poorly designed alerts.

Dimension 3 is where most clinician complaints land in the first instance, and where the temptation to redesign the screen is strongest. The model's contribution is to remind you that a complaint about the interface is sometimes actually a complaint about workflow (dimension 5) or content (dimension 2) and the right fix is upstream.

### 4. People

The humans who use, operate, support, and govern the system — clinicians, IT staff, informatics teams, leadership, vendors, patients. Failures in this dimension include training gaps, role mismatches, organizational structures that put the wrong people in charge of the wrong decisions, vendor staffing problems, departures of key institutional knowledge.

The "people" dimension is the one that most often manifests as "the team that built this no longer works here and the documentation is gone." Knowledge concentrated in individuals is fragility waiting to materialize. The boards test this dimension under headings like governance, training, and key-person risk.

### 5. Workflow and communication

The sequence of tasks, handoffs, and information exchanges through which clinical work actually gets done. The dimension from lesson 1. Failures look like rework loops, missed handoffs, alerts at the wrong workflow point, communication breakdowns, broken sign-out processes.

Dimension 5 is the dimension the field has been most consistently wrong about, in the direction of underweighting it relative to dimensions 1 through 3. Most informatics projects focus on the technical dimensions and treat workflow as something that adapts after deployment. The Sittig-Singh model is partly a reaction to this — it puts workflow on equal footing with the technical layers and refuses to let analysts skip it.

The boards test workflow failures directly and reward you for naming dimension 5 even when the surface symptom looks technical.

### 6. Internal organizational policies, procedures, and culture

The institution's own rules, governance structures, decision-making processes, and culture. The way the CDS committee operates. The way the EHR change request process is structured. The way the medical staff governs clinical content. The institution's tolerance for risk, its appetite for change, its relationship with vendors, its history with prior projects.

Dimension 6 is where good ideas go to die in organizations that are not ready for them, and where mediocre ideas succeed in organizations that have built the readiness. The boards test this dimension under headings like governance, change management, and organizational culture.

### 7. External rules, regulations, and pressures

The laws, regulations, payer rules, accreditation requirements, and market pressures that shape what the institution is allowed to do, required to do, or rewarded for doing. HIPAA, HITECH, the 21st Century Cures Act, ONC certification, Joint Commission requirements, CMS quality measures, state laws on privacy and reporting, payer documentation requirements.

Dimension 7 is the one that often explains why a project the local team supports never happens — there is an external constraint that nobody outside the project knows about. The boards test this dimension in the context of regulatory compliance and information blocking.

### 8. System measurement and monitoring

Whether the institution actually looks at how the system is performing. Metrics, dashboards, audits, post-deployment evaluation, incident reporting, near-miss tracking, the override rate audit from Module 4, the interface monitoring from Module 3.

Dimension 8 is the dimension that most often distinguishes a mature informatics program from an immature one. A mature program *measures* whether its interventions are working. An immature program deploys interventions and assumes they work. The boards have a strong preference for answers that include "and how would you measure whether the intervention is working" as part of the proposed response.

## Using the model as a diagnostic tool

The model is most powerful when you use it as a checklist after a failure. The discipline is:

1. Describe what failed.
2. Walk through each of the eight dimensions and ask: did this dimension contribute to the failure? How?
3. Identify the dimensions that were primary contributors and the dimensions that were secondary.
4. Design fixes for each primary contributor.
5. Identify the monitoring that should have caught the failure earlier (dimension 8).

Most real-world failures involve multiple dimensions. A medication-administration error caused by a redesigned screen (dimension 3) probably also involves workflow (dimension 5: when in the workflow the screen is encountered), people (dimension 4: nursing was not in the design loop), and culture (dimension 6: no piloting before deployment). The single-dimension explanation is almost always incomplete.

The boards reward you for the multi-dimensional analysis. A stem that describes a failure and asks for the *primary* dimension wants the most central one, but the best answers acknowledge that other dimensions also contributed.

## Using the model proactively

Beyond diagnosing failures, the model is a checklist for designing new interventions. Before deploying anything, walk through the eight dimensions and ask:

1. Does the technical infrastructure support this?
2. Is the clinical content right and maintainable?
3. Will the user interface work for the intended users in their context?
4. Are the right people involved, trained, and bought in?
5. Does the workflow accommodate this intervention without creating new friction?
6. Does the institution's policy and culture support deployment?
7. Are external rules satisfied?
8. How will we measure whether it is working, and who reads the measurements?

If any of the eight is unanswered or unsatisfactory, the intervention is not ready. The discipline of using the checklist is what separates a CMIO who ships interventions that work from one who ships interventions that need to be retracted three months later.

## Concrete example

A health system deploys an updated CDS rule for sepsis early warning, replacing the previous rule that had been in place for three years. The new rule uses a more sophisticated machine-learning model and was validated retrospectively at high accuracy. Within two months, the nurses on the medical floor report that the new alerts are firing more often than the old ones, the alerts are firing on patients the nurses do not consider septic, and the team has started to dismiss the alerts without engagement. Six months later, an audit finds that mortality from sepsis has not improved and that the appropriate-override rate is 91%.

Walk through the dimensions:

- **1. Hardware and software**: no contribution. The system is running well.
- **2. Clinical content**: contributes. The new ML model was trained on a different population than the floor it was deployed on, and its threshold for alerting is calibrated to a different sensitivity-specificity trade-off than the previous rule.
- **3. Human-computer interface**: contributes. The alerts are presented identically to other interruptive alerts and have no visual distinction that would let nurses immediately recognize them as the new sepsis alert.
- **4. People**: contributes. The nursing team was not part of the design or validation. The model was developed by data science with input from the inpatient medicine team but no nursing involvement.
- **5. Workflow and communication**: contributes heavily. The alert fires when nurses are at the bedside doing assessments, interrupting the assessment workflow rather than supplementing it. The follow-up action (notify the attending) is unclear in the workflow.
- **6. Internal policies and culture**: contributes. The CDS committee approved the deployment without piloting because the retrospective validation looked strong. There is no retirement criterion for the new rule.
- **7. External rules**: minor contribution. There is no external mandate driving the specific rule, though there is a CMS sepsis bundle measure influencing the institution's overall sepsis attention.
- **8. Measurement and monitoring**: contributes. There is no dashboard tracking the new rule's clinical impact, override audit, or appropriate-override rate. The audit was only run at six months because nursing complained loudly.

Primary contributors: clinical content (dimension 2), workflow (dimension 5), people (dimension 4), measurement (dimension 8). Secondary: interface (dimension 3) and policy (dimension 6). Not contributors: hardware, external rules.

The fix is multi-dimensional: retrain or recalibrate the model on the local population (dim 2), redesign the alert format and routing (dim 3, dim 5), involve nursing in the redesign (dim 4), pilot the new version on one unit before full deployment (dim 6), and put a monthly audit dashboard in place (dim 8). No single fix would have produced the same result.

This is what the Sittig-Singh model is for. The boards reward you for the multi-dimensional analysis.

## Uncomfortable question

The Sittig-Singh model has been published since 2010, is included in every clinical informatics fellowship curriculum, is referenced in every textbook, and is required board knowledge. Most informatics deployments still fail in ways the model would have predicted. Why? Is the model being used superficially, is the discipline of running through eight dimensions before deployment too much friction for real organizations, or is the model itself missing something — and which of these answers should change how you run your next project?

Hold your answer.
