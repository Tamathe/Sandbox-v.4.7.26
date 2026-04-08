---
id: 04-change-management-and-ethics
title: Change Management Frameworks and the Ethics of Telling Clinicians What to Do
order: 4
estimatedMinutes: 45
learningOutcomes:
  - Describe Kotter's 8 steps, ADKAR, and Lewin's three stages, and pick the right framework for a given scenario.
  - Identify the situations in which each framework is the strongest fit.
  - Articulate the ethical responsibilities of an informaticist who is also a clinician — patient welfare first, professional obligations to colleagues, the obligation to tell leadership the truth.
  - Connect Friedman's fundamental theorem (Module 1) to the closing ethical frame of the course.
concepts:
  - kotter-8-steps
  - adkar
  - lewin-three-stages
  - change-management
  - resistance-to-change
  - informatics-ethics
  - friedmans-fundamental-theorem
  - dual-loyalty
  - tell-the-truth-to-leadership
---

## Reading

This is the closing lesson of the closing module. The previous three lessons covered the operational disciplines (project management, governance, ROI) that determine whether an informatics initiative ships. This lesson covers the discipline that determines whether the people on the receiving end of the initiative actually adopt it, and whether the informaticist running the initiative behaves in a way they will be willing to defend ten years from now. Both halves matter and they are connected: a change-management plan that ignores the human cost of the change is a plan that fails ethically as well as operationally, and an ethical disposition that does not engage with the practical work of changing institutions is a posture rather than a practice.

Memorize the three named frameworks. The boards test them by name and reward you for being able to pick the right one for a scenario.

### Kotter's 8 steps

John Kotter, a Harvard Business School professor, published *Leading Change* in 1996 with an eight-step model for leading large-scale organizational change. The model was based on observation of successful and unsuccessful change efforts in large companies, not on randomized trials, but it has become the canonical framework for big-organization change because it captures patterns that recur. Memorize the eight steps in order. The boards expect you to recite them when asked.

1. **Establish a sense of urgency.** Make the case that the status quo is not sustainable. Without urgency, the change effort is competing with everything else on the institution's plate and will lose.
2. **Form a powerful guiding coalition.** Assemble a small group with the authority, credibility, and energy to lead the change. The coalition matters more than any individual leader because it carries the change through the inevitable departures and leadership turnover.
3. **Develop a vision and strategy.** Articulate where the institution is going and how. The vision must be concrete enough that people can imagine acting on it.
4. **Communicate the change vision.** Repeatedly. Through every channel. The standard rule of thumb is that a change vision must be communicated 10× more than feels necessary to be heard at all.
5. **Empower broad-based action.** Remove obstacles, change systems and structures that undermine the vision, encourage risk-taking and non-traditional ideas. The step where most informatics changes fail because the obstacles are organizational and the change leader does not have the authority to remove them.
6. **Generate short-term wins.** Plan for visible early successes, achieve them, and recognize the people who delivered them. Without short-term wins, the change effort runs out of credibility before it produces the longer-term results.
7. **Consolidate gains and produce more change.** Use the credibility from short-term wins to tackle bigger problems. The step where most successful early-phase efforts collapse because leadership declares victory and moves on.
8. **Anchor new approaches in the culture.** Make the new way the default, document it, train new staff in it, retire the old way. The step that turns a project into a permanent change.

Kotter is the right framework for **large-scale, institution-wide change**: a new EHR, a major reorganization of clinical service lines, a transition from one operating model to another. It is overkill for small initiatives and the scaffolding of all eight steps becomes tedious if the change is not large enough to support the weight.

### ADKAR

ADKAR is a framework developed by Prosci (a change management consultancy) in the late 1990s and articulated in detail in Jeff Hiatt's 2006 book *ADKAR*. Where Kotter operates at the level of the organization, ADKAR operates at the level of the individual. The premise is that organizational change is the sum of changes that have to happen inside individual people, and that the way to design a change effort is to figure out what each individual needs to move through the change.

The five letters are stages each affected individual must pass through, in order:

1. **A — Awareness.** The individual must be aware of the need for change. Why is this happening? What is the problem we are solving?
2. **D — Desire.** The individual must want to participate in and support the change. Awareness is not enough — many people are aware of the need and still resist. Desire requires that the change feel personally relevant, valued, or at least tolerable.
3. **K — Knowledge.** The individual must know how to change. This is the training and skill-building stage.
4. **A — Ability.** The individual must be able to act on the knowledge. The gap between knowing what to do and being able to do it is where most change efforts fail.
5. **R — Reinforcement.** The new behavior must be reinforced — through recognition, performance management, structural support, ongoing feedback — or it will decay back to the old behavior.

ADKAR is the right framework for **changes whose success depends on individual behavior**: clinician adoption of a new documentation template, nursing adoption of a new medication administration workflow, a CDS rule whose value depends on clinicians acting on it. The diagnostic power of the framework is the question "where in ADKAR is each affected individual stuck?" — Awareness gaps need communication, Desire gaps need engagement and incentives, Knowledge gaps need training, Ability gaps need workflow redesign, and Reinforcement gaps need ongoing structural support.

The boards test ADKAR by name and reward you for mapping a described change failure to the specific stage where it broke down. The most common pattern is to misread an Ability problem as a Knowledge problem — clinicians who know what to do but cannot do it because the workflow does not let them do not need more training; they need a workflow fix. Module 5's workflow lens reappears here.

### Lewin's three stages

Kurt Lewin, a German-American psychologist often considered the founder of social psychology, published the **three-stage model of change** in 1947 — long before Kotter or ADKAR, and the foundation that the later models built on. The three stages are:

1. **Unfreeze.** Disturb the status quo. Create the recognition that the current state is not acceptable. The work of unfreezing is the work of making people willing to consider change at all.
2. **Change.** Move from the old state to the new state. The transition itself.
3. **Refreeze.** Stabilize the new state. Make it the new default. Institutionalize the change so it does not revert.

Lewin's model is the simplest of the three and is often the best framing for **discrete, time-bounded changes** where the question is mostly "how do we get from state A to state B" rather than "how do we lead a multi-year transformation." It is also the framing that best captures the importance of the refreeze step — most failed change efforts fail at refreeze, when leadership declares the change complete and moves on, and the institution drifts back to the old way.

The boards test Lewin by name. They reward you for knowing all three stages and for recognizing that refreeze is the most commonly skipped one.

### Picking the right framework

The frameworks are not interchangeable, and the boards test the disposition of picking the right one for the situation.

- **Kotter** when the change is **large-scale and institution-wide**. The eight steps are scaffolding that works for big efforts and overkill for small ones.
- **ADKAR** when the change depends on **individual behavior**, and especially when you need a diagnostic for *why* a change is failing — ADKAR's stages map to specific failure modes.
- **Lewin** when the change is **discrete and time-bounded**, or when the simplest framing is the best one. Lewin is also the right framing when the most important point you need to make to leadership is "do not skip refreeze."

Many institutions use more than one framework on the same effort — Kotter for the high-level change leadership, ADKAR for the per-individual diagnostic, Lewin for the closing reinforcement. The frameworks are tools, not creeds. The CMIO who knows all three and picks among them is in a better position than the CMIO who has memorized one and applies it everywhere.

The standard wrong answer the boards use is "the best framework is X for all situations." The right answer is always context-dependent, and the boards reward you for explaining why a framework is the right fit for a specific scenario.

### Resistance to change

A small note on resistance because the boards test it indirectly. The default framing of resistance — that it is an obstacle to be overcome — is wrong. Resistance is information. A clinician resisting a new workflow is telling you that the workflow has a problem, the change has not been adequately explained, the incentives are misaligned, or the individual has a constraint you have not seen. The right response to resistance is the same as the right response to a workaround in Module 5: treat it as design feedback, ask what the resister is solving for, and address the underlying constraint.

The change-management frameworks above all incorporate this disposition implicitly. ADKAR's Desire stage is about understanding why the individual does not want the change, which is the same question. Kotter's "empower broad-based action" requires removing obstacles, which means hearing about them. Lewin's "unfreeze" requires understanding what is keeping the current state stable, which is often the unspoken concern of the people who would resist.

The CMIOs who produce changes that stick are the ones who treat resistance as data. The ones whose changes fail are the ones who treat resistance as a character flaw in the resisters.

### The ethics of being an informaticist who is also a clinician

This is the closing frame of the entire course, and the boards test it indirectly through scenario questions about what the right action is when professional obligations conflict.

The clinical informaticist is, in most cases, also a clinician — a physician, a nurse, a pharmacist — who has taken on an additional role that operates at the institutional level. The dual role creates **dual loyalty**: to the patient who is the focus of the clinical role, and to the institution and the clinical staff who are the focus of the informatics role. Most of the time the two loyalties point the same way. Sometimes they do not, and when they do not, the informaticist has obligations that the boards expect you to know.

Three principles to internalize.

**Patient welfare first.** When an institutional decision (a CDS rule, an EHR configuration, a workflow change, an AI tool deployment) creates a foreseeable risk to patient welfare, the informaticist's obligation is to surface the risk, document it, and oppose the decision through legitimate channels even when the institution prefers to proceed. This is the principle that distinguishes a clinical informaticist from a non-clinical IT leader. The clinical credential carries an obligation that does not lapse when the informaticist takes on an institutional role. The boards reward the disposition that patient welfare is the trump card and that the informaticist has both standing and obligation to invoke it.

**Professional obligations to colleagues.** The informaticist's interventions land on other clinicians. The decisions about what to deploy, how to configure it, how much friction to impose, and how much override capability to allow are decisions that affect colleagues' work lives, cognitive load, and professional autonomy. The obligation is to design with respect for the people who will use the system — to involve them in the design, to acknowledge the burden the change creates, to resist the temptation to "discipline" colleagues into compliance with poorly designed systems, and to recognize that workarounds are usually data about the system, not about the colleague (Module 5). The Sittig-Singh dimensions 4 (people) and 5 (workflow) are the operational expression of this obligation.

**Tell the truth to leadership, even when inconvenient.** This is the obligation that most distinguishes a CMIO who builds long-term credibility from one who is replaced after the third surprise. When leadership asks for an opinion, the informaticist's job is to give the honest opinion — including the uncomfortable parts, including the projection that the new initiative will not work, including the assessment that the current ROI case is dishonest. The job is not to be liked. The job is to be the person whose assessment can be trusted because it is calibrated. The CMIOs who tell leadership the truth — politely, with evidence, in a form leadership can act on — are the ones whose institutions improve over time. The CMIOs who tell leadership what leadership wants to hear are the ones who deliver short-term project approvals and long-term institutional decay.

### Friedman's theorem returns

The course opened in Module 1 with **Friedman's fundamental theorem of biomedical informatics**: that a person working with an information resource should perform better than the same person without the resource. The theorem is the field's claim about what informatics is for, and it has been used as the closing frame of every prior module that mattered. It returns here as the ethical anchor.

The theorem has an implicit corollary that the boards reward you for stating: **if the person with the resource performs *worse* than the person without it, the informaticist is obligated to retract or redesign the resource.** Most informatics projects do not have a built-in retreat. Most CDS rules, once deployed, are deployed indefinitely. Most EHR configurations, once shipped, are not measured against the counterfactual of not shipping them. Most institutional informatics culture is biased toward continuing investments because retracting them feels like admitting failure.

The Friedman corollary says: the failure is not in the retraction; the failure is in the continuation of an intervention that has not delivered. The discipline of measuring against the counterfactual, and the willingness to retract when the counterfactual wins, is what closes the loop between Module 1's framing and Module 8's ethics. Every dimension of the field that this course has covered — the standards, the architecture, the CDS, the workflow, the analytics, the privacy, the leadership — only matters if the resulting interventions actually help. The informaticist's ethical obligation is to produce interventions that help, to measure whether they have helped, and to retract them when they have not.

This is the final move of the course. Hold it.

## Concrete example

A CMIO is overseeing the deployment of a new AI-driven sepsis early-warning tool that has been validated retrospectively at high accuracy. Six months after launch, the audit data show that the tool's appropriate-override rate is 94%, the clinician satisfaction with the tool is at the 12th percentile, the LOS reduction the vendor projected has not materialized, and two near-miss events have been linked to clinicians dismissing tool alerts that turned out to be true positives. The data science team that built the tool wants to push for a v2 with model retraining. The vendor is offering favorable contract terms for an extended deployment. Leadership is reluctant to retract because the institution publicly committed to the deployment and a retraction would be embarrassing.

Walk the analysis.

**Friedman's corollary is in play.** The intervention is not currently improving on the counterfactual. The data are clear. The clinician with the tool is performing worse, in measurable ways, than the clinician without it. The first move is to acknowledge this honestly to leadership, in writing, with the data attached.

**The change-management framing.** Whichever framework the CMIO picks, the closing question is whether the intervention should continue (with redesign) or be retracted. If continuing, the right framing is ADKAR — diagnose where in the individual-level adoption the failure is happening (Awareness? Desire? Knowledge? Ability? Reinforcement?) and address the specific stage. If retracting, the right framing is Lewin — unfreeze the current commitment, change to the no-tool state (or to a smaller-scope version), and refreeze with an honest narrative about what was learned.

**The ethics.** The CMIO has three dual-loyalty obligations to navigate.
- *Patient welfare first.* The two near-misses are the data point that anchors the analysis. Each near-miss is a foreseeable harm and the pattern is consistent with a tool that is degrading clinician judgment rather than supporting it. The patient welfare argument supports retraction or substantial redesign.
- *Professional obligations to colleagues.* The 12th percentile satisfaction and the 94% appropriate-override rate are data about the colleagues' experience. The CMIO's obligation is to take that data seriously rather than to discipline the override rate down without addressing the underlying problem.
- *Tell the truth to leadership.* The leadership reluctance to retract because of embarrassment is a political constraint, not an analytical one. The CMIO's obligation is to give leadership the honest analysis — that the data support retraction or substantial redesign, that the cost of continuing is real, and that the embarrassment of retraction is small compared to the cost of continued deployment of a tool that is producing near-misses.

**The right move.** The CMIO writes a memo to leadership recommending one of two paths: (1) immediate retraction with a clear honest statement to staff about what was learned, or (2) a 90-day intensive redesign with predefined go/no-go criteria at the end. The CMIO does not recommend continuation as deployed. The recommendation is uncomfortable because leadership did not want to hear it. The recommendation is also what the patient welfare obligation, the professional obligation to colleagues, and the truth-telling obligation all converge on.

If leadership overrides the recommendation and proceeds anyway, the CMIO documents the override and the analysis in writing. The documentation matters because it is the record that the obligation was met regardless of how the institution chose to act on it. This is the discipline that closes the loop between the ethics and the operational work.

## Uncomfortable question

The course has asked you to hold an uncomfortable question at the end of every lesson. The closing one is the integral of all of them. You have read about standards, architecture, CDS, workflow, analytics, privacy, leadership, and ethics. The implicit promise of the course is that internalizing these frameworks will let you do this work well. The promise is half right. The frameworks are necessary, and you need to know them cold for the boards and for the credibility they buy you in the room. They are also not sufficient. The work of clinical informatics is structurally hard in ways that no framework will solve, and the CMIOs who are best at it are not the ones who memorized the frameworks most thoroughly — they are the ones who hold the frameworks lightly enough to know when the situation does not fit any of them, who tell the truth to leadership when the truth is uncomfortable, and who measure their interventions against the counterfactual and retract the ones that do not deliver. The boards test the frameworks. The career tests the disposition.

Hold your answer. Then do the work.
