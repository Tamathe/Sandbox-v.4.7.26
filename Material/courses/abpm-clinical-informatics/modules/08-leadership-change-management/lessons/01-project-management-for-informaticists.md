---
id: 01-project-management-for-informaticists
title: Project Management for Informaticists — Frameworks and Why Most Healthcare IT Projects Fail
order: 1
estimatedMinutes: 40
learningOutcomes:
  - Name the dominant project management frameworks (PMBOK, Agile, Scrum, Kanban) and state when each is the right choice in clinical informatics work.
  - Identify the PMBOK knowledge areas that the boards expect you to know: scope, schedule, budget, quality, risk, stakeholders, communications, integration, procurement, resources.
  - Explain why most clinical informatics projects are closer to product management than to classical PM.
  - Cite the Standish Group failure-rate statistics and explain what they mean for IT projects in healthcare specifically.
concepts:
  - pmbok
  - agile-in-healthcare
  - scrum-kanban
  - waterfall
  - hybrid-pm
  - standish-failure-rates
  - product-vs-project-management
  - scope-schedule-budget
  - stakeholder-management
  - risk-register
---

## Reading

This is the module that turns a fellow into a CMIO. The previous seven modules have built up the technical and analytic knowledge a clinical informaticist needs to do good work. This module is about whether the work actually ships, whether it changes anything, and whether the institution still functions while the change is happening. The answers to all three depend on the same set of operational disciplines that no informatics fellowship teaches well and that the boards test indirectly through scenario questions about governance, ROI, change management, and ethics. The vocabulary is borrowed from project management, business administration, and organizational behavior. Most clinicians find the vocabulary tedious. The vocabulary is also the thing that distinguishes a CMIO who ships projects that work from one who proposes projects that get politely declined.

Start with the honest framing: most healthcare IT projects fail. The Standish Group's CHAOS Reports — published since 1994 and updated every few years — have consistently found that something close to **two-thirds of large IT projects** fail outright, fail to deliver promised functionality, or run substantially over budget or schedule. The exact percentages have shifted over the years and the Standish methodology has been criticized, but the order of magnitude has held: large IT projects have a ~30% success rate, a ~50% rate of "challenged" (delivered but late, over budget, or with reduced scope), and a ~20% rate of outright failure. Healthcare IT is at or below the average. The boards do not test the exact percentages, but they expect you to know that the failure rate is high, that the failure pattern is dominated by scope creep and stakeholder problems rather than by technical incompetence, and that "we will run this project well" is not a defense against the base rate. The defense is choosing the right framework, scoping carefully, and accepting that most of the work is in the human layer rather than the technical layer.

### The four frameworks the boards test

**PMBOK and waterfall.** The Project Management Institute's *Project Management Body of Knowledge* is the canonical reference for classical project management. The PMBOK organizes project management into ten **knowledge areas** that the boards expect you to be able to recite — you do not need to know each one in detail, but you should be able to name them when asked. The ten are:

1. Integration management
2. Scope management
3. Schedule (time) management
4. Cost (budget) management
5. Quality management
6. Resource management
7. Communications management
8. Risk management
9. Procurement management
10. Stakeholder management

PMBOK is closely associated with the **waterfall** approach — a linear progression through requirements gathering, design, build, test, deploy, and maintain, with each phase completed before the next begins and with formal sign-offs between phases. Waterfall is appropriate when the requirements are stable, the technology is well understood, the budget is fixed, and the cost of late changes is high. It is the right framework for procurement-heavy projects (selecting and implementing a new EHR vendor), for compliance-driven projects (implementing a new federally required reporting flow), and for projects where the regulatory cost of changes after a specific date is large.

The boards test waterfall and PMBOK by name and reward you for knowing when they apply. The standard wrong answer is "waterfall is obsolete and should never be used." The standard right answer is "waterfall is the right framework when requirements are stable and changes are expensive, which describes a substantial fraction of healthcare IT work even in 2025."

**Agile.** Agile is not a single framework but a family of frameworks that share a set of values articulated in the 2001 Agile Manifesto: working software over comprehensive documentation, individuals and interactions over processes and tools, customer collaboration over contract negotiation, responding to change over following a plan. The values are choices about emphasis, not absolutes — agile teams produce documentation, follow processes, and write contracts, but when the values conflict the agile team picks the first half of each pair. Agile is the right framework when the requirements are unstable, when the technology is novel, when feedback from users is essential, and when the cost of late changes is low because the architecture was designed to absorb them. Most modern in-house clinical informatics development is at least nominally agile.

The boards test agile vocabulary lightly and reward you for understanding the distinction from waterfall. The standard wrong answer is "agile is the right answer for everything in modern software." The right answer is "agile is the right answer when requirements are unstable; the wrong answer when they are not."

**Scrum.** Scrum is the most common specific implementation of agile values. Work is organized into fixed-length **sprints** (typically two weeks). Each sprint begins with **sprint planning** in which the team commits to a set of items from the **product backlog**. The team holds a **daily stand-up** (a 15-minute synchronization meeting) and ends each sprint with a **sprint review** (showing the work to stakeholders) and a **sprint retrospective** (reflecting on the team's process). Roles include the **product owner** (responsible for the backlog and prioritization), the **scrum master** (responsible for the process), and the development team (responsible for delivery).

The boards test the basic Scrum vocabulary — sprint, backlog, product owner, scrum master, retrospective. They do not test deep Scrum mechanics. Knowing the terms cold is the bar.

**Kanban.** Kanban is a different agile flavor that emphasizes continuous flow rather than time-boxed sprints. Work items are pulled from a backlog onto a board with explicit columns for each stage of work (e.g., To Do, In Progress, Review, Done) and explicit **work-in-progress (WIP) limits** that constrain how many items can be in any column at once. The discipline of WIP limits is what makes Kanban different from "a sprint planning meeting where we put cards on a wall." Kanban is appropriate for operational support work, for projects with unpredictable arrival of work items (incident response, break-fix, content maintenance), and for teams whose work does not naturally divide into sprint-shaped chunks.

The boards test Kanban as a contrast with Scrum and reward you for knowing that the right choice depends on the kind of work, not on a global preference for one over the other.

**Hybrid approaches.** Most large healthcare IT efforts in practice use a **hybrid** of waterfall and agile — waterfall for the procurement, contracting, vendor selection, and high-level scope; agile (Scrum or Kanban) for the configuration, build, testing, and iterative refinement. The boards have started to test hybrid approaches under the heading "which framework should this project use?" with the right answer being "neither alone — a hybrid that uses waterfall for the parts where requirements are stable and agile for the parts where they are not."

### The PMBOK knowledge areas: a quick walk

You do not need to know each knowledge area in encyclopedia depth, but you should be able to recite the ten and to identify which knowledge area a described problem belongs to. The boards test this with stems like "an informatics project is failing because vendor invoices have grown 40% beyond the original contract — which knowledge area did the project most fail at?" The answer is procurement management, with cost management as a contributing answer.

A short tour:

- **Integration management** — coordinating across all the other knowledge areas; the place where the project charter, project management plan, and change control process live. Integration is what the project manager actually does most of the day.
- **Scope management** — defining what is and is not in the project, and controlling **scope creep** (the slow expansion of project requirements without corresponding adjustments to schedule and budget). The single most testable knowledge area; scope creep is the most common contributing factor to project failure.
- **Schedule management** — the work breakdown structure, the critical path, the schedule baseline. The boards occasionally test the **critical path method** (CPM) — the longest sequence of dependent tasks through the schedule, which determines the minimum project duration.
- **Cost management** — budget development, cost baselines, **earned value management** (EVM). EVM compares planned value, earned value, and actual cost to give an early warning that the project is going over budget or behind schedule. The boards test EVM lightly.
- **Quality management** — quality planning, quality assurance, quality control. Cross-reference Module 6 for the meaning of quality in clinical contexts.
- **Resource management** — the team, the equipment, the facilities. Includes both physical and human resources.
- **Communications management** — the project communication plan, status reporting, stakeholder communications. Most project failures have a communications failure underneath.
- **Risk management** — the **risk register** (the list of identified risks with probability, impact, owner, and mitigation), risk assessment, risk response planning. The boards test the existence of a risk register and the discipline of maintaining it.
- **Procurement management** — vendor selection, contracting, contract administration. The riskiest knowledge area for healthcare IT because most healthcare IT projects involve at least one major vendor.
- **Stakeholder management** — identifying stakeholders, mapping their interests, managing their expectations, communicating appropriately with each. The most underweighted knowledge area in most informatics projects and the most common source of project failure that does not look like a project failure on the surface.

### Why clinical informatics projects are closer to product management

Classical project management assumes a project: a temporary endeavor with a defined start, a defined end, a defined scope, and a deliverable that is "done" at the end. Most clinical informatics work does not fit this shape. A new CDS rule is not "done" at deployment — it has to be monitored, tuned, retired and replaced, audited for override rates, and updated when the underlying clinical evidence changes. An EHR optimization is not a one-time project — it is the start of an ongoing relationship between the optimization team and the clinical users that will continue for the life of the EHR. A patient portal redesign is not a build-and-ship project — it is the launch of a product that the institution will be supporting and improving for years.

The vocabulary that fits this shape better is **product management**: a discipline that assumes ongoing responsibility for a product over its lifecycle, that prioritizes continuous improvement over discrete deliverables, that organizes work around user needs and outcomes rather than scope and schedule, and that measures success by adoption and impact rather than by on-time-on-budget delivery. The product manager owns the **product backlog**, makes prioritization decisions, communicates with users, tracks metrics, and runs the **product roadmap** that describes what the product will do over the next several quarters.

The boards do not test product management vocabulary directly, but they reward you for the disposition. The right answer to "how should this CDS rule project be structured" is rarely "as a six-month project that ends with go-live." It is "as a product the institution will own and improve over the next several years, with go-live as one milestone among several." The CMIOs who internalize this framing build informatics programs that work; the ones who run every initiative as a discrete project deliver and then watch the work decay because no one was given the ongoing responsibility.

### What the failure rate actually means

The Standish 30/50/20 numbers are not a moral indictment of project managers. They are a statement about the difficulty of the underlying work — coordinating dozens of stakeholders with different incentives, integrating with legacy systems whose behavior is incompletely documented, building software whose requirements emerge during construction, and deploying into clinical workflows whose actual shape is different from the official one (Module 5). The right response to the base rate is not to try harder; it is to choose work that has a better chance of succeeding, scope it carefully, govern it well, and accept that some fraction of what you start will not finish.

The CMIOs who do this well share a small set of habits. They scope projects to a size that can be shipped in months rather than years. They invest disproportionately in the early phases — stakeholder mapping, governance, scope definition — because those are where the cheapest fixes are. They run a real risk register and revisit it. They communicate failure early rather than hide it. They retire projects that are not working before the projects retire themselves. None of these habits is in any PMBOK. All of them are testable on the boards through scenario questions.

## Concrete example

A health system is preparing to replace its outpatient EHR (the inpatient EHR is from a different vendor and will not change). Leadership is asking the CMIO to recommend a project management framework for the replacement.

Walk the analysis.

**The waterfall part.** The procurement, vendor selection, contracting, infrastructure work, and high-level scope decisions are waterfall-shaped. Requirements are stable (the institution has been running an outpatient EHR for fifteen years and knows what it needs), the technology is well understood, the contracts are large and have legal sign-offs, and changes after the contract is signed are expensive. The right framework for this part of the project is classical PMBOK with a defined critical path, a fixed scope, and a risk register dominated by procurement and integration risks.

**The agile part.** The configuration, build, testing, and iterative refinement of the new EHR's clinical content are agile-shaped. Requirements are not stable (the optimal configuration of order sets, problem list dictionaries, and CDS rules emerges through clinician feedback), the cost of changes is low (a configuration change is a configuration change, not a recompile), and the value of feedback from end users is high. The right framework for this part is Scrum or Kanban, with the build team running two-week sprints, demoing weekly to the clinical content committees, and adjusting backlog priorities based on feedback.

**The product-management part.** Once the new EHR is live, the institution needs to commit to ongoing optimization, monitoring, and content maintenance. This is not a "project" with an end date — it is a permanent product the institution now owns. The CMIO should propose, alongside the implementation budget, an ongoing optimization budget and an optimization team that exists past go-live. Most healthcare IT failures are not implementation failures; they are the absence of an optimization team that should have existed for the next ten years and was not funded because the project ended on schedule.

**What the recommendation should look like.** A hybrid framework: PMBOK/waterfall for procurement and high-level scope, Scrum for configuration and build, ongoing product management for the post-go-live life of the EHR. Three knowledge areas to over-invest in: stakeholder management (because the largest risk is not technical), scope management (because the largest cost overrun risk is scope creep), and risk management (because the project will fail in ways that are not yet visible). One discipline to bake in from day one: the optimization team that will exist for the next ten years.

This is the answer the boards reward. The standard wrong answer is to pick a single framework and recommend it. The CMIOs who default to "we are an agile shop now" or "we are a PMBOK shop" are the ones who pick the wrong framework for half their work without realizing it.

## Uncomfortable question

The Standish failure-rate numbers are old, contested, and almost certainly under-counting the failure rate in healthcare IT specifically because the studies that produced them did not have privileged access to healthcare project data. The actual failure rate of healthcare IT projects is probably worse than the Standish numbers suggest, and the failure modes are dominated by stakeholder, governance, and change-management problems rather than by technical execution. As an informaticist who has read this lesson, what is your obligation when a leadership team asks you to estimate a new project's chance of success? Do you cite the Standish numbers (and risk being labeled a pessimist), do you offer your honest belief based on what you know about the institution (and risk being wrong in a way that costs you credibility), or do you decline to estimate (and risk being seen as evasive)? The boards do not test this question. The job tests it almost weekly.

Hold your answer.
