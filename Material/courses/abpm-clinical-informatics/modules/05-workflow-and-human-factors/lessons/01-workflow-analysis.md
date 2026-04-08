---
id: 01-workflow-analysis
title: Workflow Analysis — How to See What's Actually Happening
order: 1
estimatedMinutes: 35
learningOutcomes:
  - Define clinical workflow and distinguish it from process, procedure, and protocol.
  - Apply at least one workflow analysis notation (swimlane, BPMN, value-stream) to a clinical scenario.
  - Identify rework loops, handoffs, and waiting time as the three failure patterns most worth looking for.
concepts:
  - clinical-workflow
  - workflow-analysis
  - swimlane-diagram
  - bpmn
  - value-stream-mapping
  - rework-loops
  - handoffs
  - workflow-vs-process
---

## Reading

Every clinical informaticist eventually has to analyze a workflow. The trigger is usually a complaint — "documentation takes too long," "the alert is being ignored," "patients are waiting too long for X" — and the trap is responding to the complaint at the level the complaint was stated. The complaint is almost never the right unit of analysis. The workflow is. This module exists to make you good at seeing the workflow underneath the complaint, because almost everything else in clinical informatics depends on it. The boards test workflow concepts under several names (workflow analysis, process mapping, human factors, sociotechnical analysis); the underlying skill is the same.

## What a workflow actually is

A **clinical workflow** is the sequence of tasks, decisions, and information exchanges that happen — by humans, by systems, and by both together — to accomplish a specific clinical purpose. The purpose can be small (signing a single order) or large (managing a patient's diabetes across a year). The workflow is everything that happens, in the order it happens, with the actors who do it and the artifacts they produce.

Three closely related words to keep separate:

- **Process** is the broader sequence of activities at the system level. "The medication management process" is a process. It contains many workflows.
- **Procedure** is a specific clinical action that happens within a workflow. "Inserting a central line" is a procedure. The workflow around it includes ordering, consenting, gathering equipment, performing, documenting, and disposing.
- **Protocol** is the codified version of how a workflow *should* run. "Sepsis bundle protocol" is a protocol. The actual workflow may diverge from the protocol, and the gap is often where the informatics work lives.

The boards do not test these definitions directly very often, but they reward you for using the words precisely when answering a stem.

## Why workflow matters more than you think

Almost every CDS failure described in Module 4 is a workflow failure underneath. The Five Rights are a workflow framework dressed up as a CDS framework — "right time / right point in workflow" is the load-bearing Right. Almost every Koppel-style CPOE unintended consequence from Module 3 is a workflow failure. Almost every interoperability failure from Module 2 that the press calls "technical" is, on closer inspection, a workflow gap somewhere in the chain.

The reason workflow is the underlying culprit is that workflow is where the *humans actually meet the system*. The sociotechnical model from the next lessons is the formalization of this point. For now, internalize: the technology is rarely the problem; the technology in the wrong place in the workflow is almost always the problem.

## Three notations worth knowing

The boards do not require you to draw any specific notation, but they expect you to recognize the major ones from a description and know what each is good for. The three to know:

**Swimlane diagrams.** A swimlane diagram is a flowchart in which the horizontal "lanes" represent different actors (the patient, the medical assistant, the physician, the nurse, the EHR, the lab system) and tasks are placed in the lane of the actor performing them. Arrows connect tasks across lanes whenever a handoff occurs. Swimlanes make handoffs visible — every line that crosses a lane boundary is a handoff, and handoffs are where information loss and delays accumulate. Swimlanes are the most common notation in clinical informatics analyses because they are easy to read for non-specialists, they make role boundaries obvious, and they highlight the part of the workflow most likely to fail.

**BPMN (Business Process Model and Notation).** A formal standard for process modeling. BPMN includes a richer vocabulary of shapes — events (start, end, intermediate, timer, message), gateways (decisions, parallel splits, merges), tasks, and pools (similar to swimlanes). BPMN is what you use when the analysis needs to be precise, version-controlled, and shareable across teams that need to agree on what the workflow is. The boards have asked questions about BPMN by name. It is overkill for most clinical workflow conversations and exactly right for some.

**Value-stream mapping.** Borrowed from Toyota Production System / Lean. A value-stream map shows the flow of "value" (here, useful clinical work) through a process, with explicit annotations for time, waste, inventory, and waiting. Value-stream maps are the right notation when the question is "where is the time going" or "where is the patient waiting" rather than "where are the role handoffs." Lean methods are common in hospital quality improvement, and you should recognize value-stream mapping as the canonical Lean workflow analysis tool.

A practical rule: swimlanes for "where are the handoffs," BPMN for "let's agree on the canonical process," value-stream maps for "where is the time going." Most informatics analyses use swimlanes; most lean QI work uses value-stream maps; BPMN is the formal notation when you need precision.

## What to look for when you analyze a workflow

Three patterns are the highest-yield to look for, and the boards reward you for naming them:

**Rework loops.** Any place in the workflow where work has to be redone because of a problem upstream. A nurse re-enters data because the order was incomplete. A pharmacist re-verifies because the indication wasn't documented. A coder queries the physician because the documentation is ambiguous. A patient repeats their history because the imported record was not pulled into the chart. Each rework loop is friction, time loss, and an opportunity for information loss. Rework loops are often invisible to the people inside the workflow because they have learned to compensate; the analyst's job is to see what the participants no longer notice.

**Handoffs.** The transitions between actors. Every handoff is an opportunity for information to be lost or distorted. The number of handoffs in a clinical workflow is one of the strongest predictors of error rate. Reducing handoffs is one of the most reliable workflow interventions. The boards have asked questions about handoff failures and the right answer is often "reduce the number of handoffs" or "structure the handoff with a standardized tool (SBAR, I-PASS)."

**Waiting time.** Time when nothing is happening because the workflow is blocked on someone or something. The patient is waiting for the physician to be available. The nurse is waiting for the order to be signed. The order is waiting in the pharmacy queue. Waiting time is invisible in most workflow analyses because the people are doing something else during the wait, but the patient experience is wait time. Value-stream mapping is the notation that surfaces it most clearly.

A useful test: when you analyze a workflow, count the rework loops, count the handoffs, and estimate the waiting time. The three numbers together are usually enough to identify the worst piece of the workflow without any further sophistication.

## How to actually analyze a workflow

The analytical method matters as much as the notation. Three principles:

**Observe before you ask.** Sit in the clinic, the ED, the OR, the unit, and watch what actually happens. Ask questions only after you've seen the work. Asking first produces answers that match what people *think* they do, which is reliably different from what they *actually* do — not because they are lying but because the explicit description of a workflow leaves out the workarounds, the small adaptations, the things people do without noticing. The boards do not test observational methodology directly, but the kinds of questions that reward field observation are different from the kinds that reward "we asked the team." Notice when a stem describes a team that "reported" something versus a team that "observed" something.

**Map the actual workflow, not the intended one.** The protocol on the wall is rarely the workflow on the floor. A workflow analysis that maps the protocol misses everything interesting. The interesting parts are the deviations — and the deviations are usually intelligent adaptations to constraints the protocol does not acknowledge.

**Talk to the people who do the work.** After you observe, ask. "I noticed you do X before Y. Can you walk me through why?" The answer is usually a constraint nobody upstream knew about. The boards reward you for treating frontline knowledge as a primary source.

## Workarounds

A **workaround** is a deviation from the intended workflow that the user has invented to get the work done despite a system that does not support it. Workarounds are everywhere in clinical work and are one of the most informative things an analyst can find. A workaround signals one of three things:

- The system has a gap (the protocol or the EHR did not anticipate the case).
- The system has a friction (the official path is too slow or too cumbersome).
- The system has a mismatch (the official path requires information the user does not have at the moment they need it).

The standard mistake is to view workarounds as discipline failures and to respond by "enforcing" the official workflow. The right response is to view workarounds as design feedback. The user has, often without realizing it, run an experiment and produced a path that works better than the official one for the constraints they actually face. The analyst's job is to figure out why and decide whether to legitimize the workaround, fix the underlying friction, or both.

The boards have asked questions of the form "the team is using a workaround for X — what should the informaticist do?" and the right answer is rarely "enforce the protocol." It is some version of "understand why the workaround exists and address the underlying constraint."

## Concrete example

A primary care clinic complains that medication reconciliation at the start of each visit is taking 8–12 minutes per patient and is consistently incomplete. The clinic asks for "an EHR fix." An informaticist spends a morning observing visits before recommending anything.

What she observes: the medical assistant rooms the patient, opens the EHR to the medication module, asks the patient to confirm their current medications, and types the patient's responses into the structured medication list. The patient's responses include OTC items, supplements, herbal preparations, and "I think I take a little white pill but I don't remember the name." The medical assistant spends 3–4 minutes trying to map the white pill to a structured RxNorm-bound entry and gives up by entering "unknown white pill" in the comments field. The physician then enters the room, asks the patient again about medications because they don't trust the medical assistant's list, and re-asks about the white pill. The patient produces a phone photo of the bottle. The physician identifies it as metoprolol 25 mg, types it into the medication list themselves, and proceeds with the visit. Total med-rec time: 11 minutes. Information captured into the structured list: incomplete. Information actually known to the physician: complete, but in the physician's head and the visit note rather than in the structured list.

The complaint was "med-rec takes too long." The workflow analysis surfaces multiple distinct issues: a handoff (MA to physician) where information is duplicated and incomplete; a rework loop (the physician redoes the work the MA did); a workaround (the unknown-white-pill entry as a comment); a system mismatch (the structured list requires information the patient cannot provide in the rooming step but can produce when prompted later); and a waiting-time issue (the patient is waiting through 4 minutes of typing during rooming). None of these is "an EHR fix" in the sense the clinic meant. The actual fix is some combination of: pre-visit medication review (move the rooming task to a portal task the patient does at home with their bottles), structured workflow that captures comments and resolves them later, and reducing the duplication between MA and physician.

The boards have written stems exactly like this, and the right answer is the workflow redesign, not the EHR feature request.

## Uncomfortable question

If the right response to most clinical complaints about the EHR is workflow redesign rather than software changes, why is the field's response so consistently *software changes*? Is it because workflow redesign is harder, because software changes are easier to bill for, because the workflow team and the EHR team are different people who don't talk, or some combination — and which of these can a CMIO actually move?

Hold your answer.
