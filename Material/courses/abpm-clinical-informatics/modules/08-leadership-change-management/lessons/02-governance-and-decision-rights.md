---
id: 02-governance-and-decision-rights
title: Governance and Decision Rights — Who Decides What
order: 2
estimatedMinutes: 35
learningOutcomes:
  - Describe the standard informatics governance structures: CMIO, CNIO, CRIO roles, the CDS committee, the EHR steering committee, the clinical content committees.
  - Build and read a RACI matrix for an informatics decision.
  - Distinguish decision rights from organizational charts and explain why the former matters more.
  - Identify the failure mode in which an organization has good people, good intentions, and unworkable governance.
concepts:
  - informatics-governance
  - cmio-role
  - cnio
  - crio
  - cds-committee
  - ehr-steering-committee
  - clinical-content-committee
  - raci-matrix
  - decision-rights
  - governance-structure
  - reporting-relationships
---

## Reading

Module 1 introduced informatics governance as one of the field's recurring themes; this lesson is the operational continuation. The thesis is short and the boards test it constantly: **clarity of decision rights matters more than the exact org chart.** An institution with a confused org chart and crisp decision rights will outperform an institution with a beautiful org chart and unclear decision rights. The CMIOs who succeed are the ones who insist on writing down — for every recurring class of decision — who decides, who is consulted, who is informed, and who can veto. The CMIOs who struggle are the ones who reorganize the org chart annually in the hope that the next reorganization will make the decisions easier.

You can hold the major roles and committees in your head as a small map. Memorize the names; the boards use them verbatim.

### The major informatics leadership roles

**CMIO — Chief Medical Information Officer.** The senior physician leader responsible for the clinical use of the EHR and related health IT. Reports to either the CMO (medical line) or the CIO (technology line) or jointly to both. The reporting relationship matters and is testable: a CMIO who reports to the CIO sits inside the technology organization and is closer to the build team; a CMIO who reports to the CMO sits inside the medical organization and is closer to the medical staff. Neither is universally right. Most large institutions are moving toward dual reporting or toward CMIO-as-peer-of-CIO, but the field is not standardized.

**CNIO — Chief Nursing Information Officer.** The senior nursing leader responsible for the nursing use of the EHR. The CNIO/CMIO pairing is the dominant clinical informatics leadership pattern in U.S. hospitals. CNIOs typically have years of bedside nursing experience plus informatics training (sometimes a formal masters or DNP in informatics). The CNIO reports to either the CNO or the CIO and faces the same dual-reporting choice as the CMIO.

**CRIO — Chief Research Informatics Officer.** A newer and less universal role. Responsible for research informatics — the data warehouses, registries, and analytical capabilities that support clinical research. Common at academic medical centers; rare at community hospitals. The boards test the existence of the role and the distinction from CMIO/CNIO without expecting deep institutional knowledge.

**Other roles to know.** Some institutions also have a Chief Health Information Officer (CHIO), a Chief Data Officer (CDO), a Chief Analytics Officer (CAO), and a Chief AI Officer (a 2023+ addition that is now common at academic medical centers). The proliferation of "Chief X Officer" titles in the data and informatics space is a marker of organizational immaturity as often as it is a marker of investment — three Chiefs with overlapping mandates and no clear decision rights produce slower decisions than one Chief with a clear mandate. The boards do not test the proliferation, but they reward the disposition that role count is not the same as governance maturity.

### The standard committees

The committee structure varies across institutions but the boards expect you to know the recurring committees by name and function.

**EHR Steering Committee.** The senior governance body for the EHR as a whole. Sets strategic direction, approves the annual upgrade and optimization roadmap, resolves cross-service-line conflicts, owns the budget for the EHR program. Membership typically includes the CMIO, CNIO, CIO, COO, representatives from the major service lines, and senior clinicians from medicine, surgery, emergency medicine, and pediatrics. Meets monthly or quarterly. The committee that most often fails by becoming a status update meeting rather than a decision-making body.

**CDS Committee (Clinical Decision Support Committee).** The committee responsible for the clinical content layer — order sets, alerts, decision rules, drug-drug interaction overrides, the override audit. Cross-reference Module 4 for the CDS content. Typically chaired by the CMIO or a senior CMIO designee, with representation from medical specialties whose content is most affected (cardiology, oncology, ID, pharmacy). Meets monthly. The single most-important committee for the safety profile of the EHR and the committee whose work is most testable on the boards under the heading of CDS governance.

**Clinical Content Committee.** The committee that owns the order set library, the documentation templates, the problem list dictionary, and the formulary integration with the EHR. Often a sub-committee of the EHR Steering Committee or the CDS Committee. The work is unglamorous, ongoing, and the place where most institutions fail at content maintenance — see the Sittig-Singh Dimension 2 (clinical content) failures from Module 5.

**Information Security Committee / Privacy Committee.** Cross-reference Module 7. Owns the security and privacy posture, the breach response plan, the policy framework, and the audit log review process. Typically has the CMIO, CNIO, CIO, Chief Privacy Officer, Chief Information Security Officer (CISO), and legal counsel as members. The committee whose work is least visible during normal operations and most consequential during an incident.

**Data Governance Committee.** Owns the definitions of clinical data elements, the master data management process, the data warehouse priorities, and the rules for who gets access to what for analytics. Cross-reference Module 6. The committee that most institutions stand up after they realize they cannot answer "how many diabetics do we have" with a single number.

**AI Governance Committee.** A 2023+ addition. Owns the institutional approach to AI in clinical care: vendor selection, validation, monitoring, bias assessment, and the interaction with the CDS Committee for AI-driven CDS. Most academic medical centers have created one in the last two years; most community hospitals have not. The boards have started to test the existence and function of the committee.

The pattern across all of these is the same: a small committee with a defined scope, a defined decision-making authority, a regular meeting cadence, a charter, and a clear reporting relationship to a higher governance body. Committees that lack any of those degenerate into status updates. Committees that have all of them produce decisions.

### RACI matrices

A **RACI matrix** is a simple tool for clarifying decision rights on a specific decision or class of decisions. RACI stands for:

- **R — Responsible.** The person (or people) who do the work to make the decision happen. Multiple people can be Responsible.
- **A — Accountable.** The single person who is ultimately accountable for the decision. Exactly one A per decision. The "single throat to choke" if the decision goes wrong.
- **C — Consulted.** People whose input is sought before the decision is made. Two-way communication. Multiple Cs are normal.
- **I — Informed.** People who are notified of the decision after it is made. One-way communication. Many Is are normal.

The discipline of writing a RACI matrix forces an institution to confront the questions it has been avoiding. Who is actually accountable when a CDS rule produces a safety event? Is it the CMIO, the CDS Committee chair, the medical director of the affected service line, or the chief quality officer? In most institutions the answer is "all of them" or "none of them," and either answer is a governance failure. A RACI exercise forces a single A to be named, which surfaces the disagreements that have been hiding under collective ownership.

The boards test RACI by name and reward you for knowing the four letters and the discipline they enforce. The most common error on the boards is to confuse Responsible with Accountable. Memorize: R does the work, A owns the outcome.

The most common variant is **RASCI**, which adds **S — Supporting** as a category between R and C. S is for people who actively help with the work but are not themselves Responsible. Some institutions use **DACI** (Driver, Approver, Contributors, Informed) instead, which centers the Approver role explicitly. The boards may test any of these. Know RACI cold and recognize the others.

### Decision rights versus org charts

The most important point of this lesson is the one in the opening. **Decision rights matter more than the org chart.** An institution can have the perfect reporting structure on paper and still produce slow, confused decisions if no one knows who can actually decide what. An institution can have a confused reporting structure and still produce fast, crisp decisions if the decision rights are clear.

Two patterns the boards test by exclusion:

**The reorganization fallacy.** The belief that the next reorganization will fix the decision-making problems. It almost never does. Reorganizations are expensive, distracting, and produce a new set of decision-rights problems that the institution then needs to solve. The CMIOs who reorganize annually are usually the ones who have not done the harder work of writing down the decision rights inside whatever org chart they currently have.

**The "we'll figure it out" pattern.** The institution that does not write down decision rights because "we work well together" or "we know who decides things." This pattern works while the people stay the same and breaks the moment a key person leaves. Institutions that have not written down decision rights are exposed to **key-person risk** — a Sittig-Singh dimension 4 failure where institutional knowledge concentrated in individuals becomes fragility.

The opposite of both patterns is **explicit decision rights**: a written list of recurring decision classes (CDS rule approval, EHR upgrade scheduling, content retirement, vendor exception requests, AI tool adoption), with a RACI for each, reviewed annually, posted somewhere people can find it. The institutions that do this are not the ones with the best org charts. They are the ones whose decisions get made.

### Reporting relationships

A short note on the CMIO's reporting line because the boards test it directly. The dominant patterns are:

1. **CMIO reports to CIO.** The CMIO sits inside the technology organization. Strengths: close to the build team, fast technical execution, good integration with IT priorities. Weaknesses: distance from the medical staff, perception by clinicians that the CMIO is "an IT person now," difficulty pushing back against IT decisions that hurt clinical workflow.

2. **CMIO reports to CMO.** The CMIO sits inside the medical organization. Strengths: clinical credibility, alignment with medical staff governance, ability to push back on IT decisions. Weaknesses: distance from the build team, slower technical execution, difficulty getting heard inside the technology priority-setting process.

3. **CMIO reports to both (matrix).** Increasingly common. The CMIO has dual reporting to CMO and CIO and is expected to bridge the two. Strengths: integration. Weaknesses: matrix reporting is inherently slower and creates accountability ambiguity unless the decision rights are very clear (back to the lesson's main thesis).

4. **CMIO as peer of CIO.** Both report to a Chief Operating Officer or directly to the CEO. The most senior version of the CMIO role and increasingly common at large academic medical centers and large integrated delivery networks. Reflects the maturity of the institution's view of clinical informatics as a strategic discipline rather than an IT sub-function.

The boards test the patterns by name. They do not test which one is "right" because the right answer depends on the institution. They reward you for knowing the trade-offs of each.

## Concrete example

A 600-bed academic medical center has three problems showing up at the same time. (1) A new sepsis early-warning ML model has been developed by the data science team and is ready for clinical deployment, but no one is sure who can authorize its launch. (2) The medication formulary committee has approved a new direct oral anticoagulant for the formulary, but the corresponding CDS rule changes have not been built and the formulary committee thinks the CDS committee owes them, while the CDS committee thinks the formulary committee owns its own content. (3) A radiologist has built a small CDS tool in her own time using a no-code platform and has deployed it to her department's reading room without going through any committee.

Walk the governance analysis.

**Problem 1 — the sepsis ML model.** The right answer is that the AI Governance Committee (if one exists) should validate the model, the CDS Committee should approve the clinical deployment, the EHR Steering Committee should approve the technical integration, and a single Accountable (probably the CMIO or a designated CDS lead) should own the go/no-go decision. The institution's failure here is not technical — it is that no RACI exists for "deploying an ML-based CDS rule" and so the project sits in committee limbo. The fix is to write the RACI now, not after the next ML rule is ready.

**Problem 2 — the formulary and CDS handoff.** The right answer is that the boundary between the formulary committee and the CDS committee needs to be written down. The formulary committee owns the formulary (what drugs are on it). The CDS committee owns the alerts and order sets that interact with the formulary. The handoff between them — who builds the new CDS content when a new drug is added — needs an explicit owner. In practice, the right pattern is usually that the CDS committee owns the build but is *informed* (and consulted) by the formulary committee in advance, so the build can be scheduled before the drug goes live. The institution's failure is that this handoff has been operating on goodwill and is now breaking. The fix is the same: write the RACI, name the A.

**Problem 3 — the rogue CDS deployment.** This is a governance failure of a different kind. The radiologist's tool may be excellent or it may be terrible, but the institution has no process for evaluating it, monitoring it, or retiring it if it fails. The right response is *not* to punish the radiologist (which produces a culture in which clinicians stop telling governance about their tools) and *not* to ignore the deployment (which establishes that governance is optional). The right response is to bring the tool into the governance process retroactively — validate it, monitor it, decide whether it should continue, and use the incident to make the path easier for the next clinician who builds something useful. The Sittig-Singh dimension 6 (internal organizational policies and culture) is what determines whether the institution can do this gracefully.

The pattern across all three problems is the same. The institution does not lack good people, good ideas, or good intentions. It lacks written decision rights. The CMIO who fixes the three problems will not have done so by reorganizing — she will have done so by writing down who decides what and getting the writing approved.

## Uncomfortable question

The discipline of writing down decision rights is unglamorous, time-consuming, and politically difficult — every act of writing surfaces a disagreement that has been hiding under ambiguity. Most CMIOs know this and most still do not do it consistently because the immediate cost is high and the immediate benefit is invisible. The benefit shows up months or years later, when a decision that would have stalled gets made cleanly, or when a new CMIO can pick up the institution without a year of orientation. As an informaticist sitting in a governance role, what is your obligation to do the unglamorous writing even when the institution is not asking for it? Do you push to formalize decision rights against the resistance of leaders who prefer the flexibility of ambiguity, or do you accept that the institution has chosen its current mode of operation and work within it? The boards do not test this question. It is the question that determines whether your tenure leaves the institution better governed than you found it.

Hold your answer.
