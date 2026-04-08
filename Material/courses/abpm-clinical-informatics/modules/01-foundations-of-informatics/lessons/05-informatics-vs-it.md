---
id: 05-informatics-vs-it
title: Informatics Is Not IT — And Why That Distinction Is the Whole Job
order: 5
estimatedMinutes: 35
learningOutcomes:
  - Articulate the difference between clinical informatics and clinical IT in a way a non-informaticist would accept.
  - Identify which problems belong to which discipline, and which problems are jointly owned.
  - Explain why the distinction matters for governance, hiring, and reporting structures inside a real organization.
concepts:
  - informatics-vs-it
  - clinical-it-roles
  - cmio-role
  - governance-structure
  - reporting-relationships
---

## Reading

This lesson exists because every informaticist eventually has to make this argument out loud, usually to a CFO who is asking why the organization needs both a CIO and a CMIO when "isn't that the same thing." It is not the same thing. Getting the distinction right is not pedantry; it determines who reports to whom, who makes which decisions, and which problems get solved badly because the wrong discipline owned them. The boards test it because the boards are written by people who have lost this argument and want you to win it.

Start with what clinical IT is. **Clinical IT** is the discipline of delivering and operating the technology that clinical care depends on. Servers, networks, identity management, backup, disaster recovery, vendor management, security operations, deployment, ticket triage, hardware refresh, the help desk. These are real, important, hard jobs. They require deep technical skill. They are not clinical informatics, and they are not done well by people whose primary training is in informatics. A hospital that tries to make its CMIO run the help desk will lose the help desk and lose the CMIO.

**Clinical informatics**, as we defined in lesson 1, is the discipline of making information technology actually deliver clinical value in a sociotechnical system. It is not about whether the server is up; it is about whether, when the server is up, the system is doing the right things, in the right workflow, for the right user, with the right information, in a way that improves care. The deliverables are different, the training is different, the failure modes are different, and the people who are good at one are usually only adequate at the other.

Here is a way to test which discipline owns a given problem. Ask: *if this problem is solved, what changes for the patient?* If the answer is "the system is available again," it is an IT problem. If the answer is "the clinician makes a different decision, captures different information, or follows a different workflow that produces a different outcome," it is an informatics problem. The two disciplines work on the same systems but they care about different things.

A few examples to make this concrete.

The EHR is down for two hours due to a database failure. Whose problem? Clinical IT, primarily. The informatics question that follows — *did the downtime procedures work, and what did clinicians actually do during the outage* — is an informatics problem, but the immediate fire is IT's.

The order set for community-acquired pneumonia is recommending the wrong empiric antibiotic for the local antibiogram. Whose problem? Clinical informatics, primarily. The IT team will configure the order set in the EHR, but the decision about *what should be in it* and the work of getting the medical staff to agree is informatics work, sitting on top of clinical pharmacy and infectious disease expertise.

The interface between the EHR and the laboratory information system has been silently dropping certain results for three weeks. Whose problem? Both, jointly, and how that joint work is structured tells you a lot about the organization. The IT team owns the integration engine and the message logs. The informatics team owns the question of *which results matter, who is impacted, what should the recovery look like, and what monitoring should have caught this earlier*. A mature organization has a single incident response that pulls in both, with clear roles. An immature one has the IT team fixing the pipe and the informatics team finding out about it from a clinician complaint two weeks later.

A nurse complains that documenting an admission takes 45 minutes when it should take 15. Whose problem? Almost certainly informatics, working with nursing leadership, possibly with vendor support. The IT team's role is small here; the workflow, the screen design, the templates, and the policy decisions about what must be documented are all informatics-and-clinical-leadership questions.

A new ransomware variant is targeting healthcare. Whose problem? IT, primarily, with informatics involvement on the questions of *which clinical workflows degrade gracefully if specific systems are taken offline* and *what the downtime contingency looks like*. Security operations is an IT discipline with informatics implications, not the other way around.

The pattern is that clinical IT owns *the technology layer*, clinical informatics owns *the use of the technology layer to deliver care*, and the two overlap in any problem where the right solution requires changing both at once. The most common organizational mistake is to put both under one leader who has the skills for one and not the other. The second most common is to keep them so separate that neither knows what the other is doing until something breaks.

Now the governance question. Who should the CMIO report to? There is no single right answer, but the boards expect you to know the trade-offs.

A CMIO who reports to the **CIO** is operationally close to the technology, has influence over IT priorities, and is well positioned to fight for clinician needs inside the IT budget. The risk is that the CMIO becomes a clinical translator for IT decisions rather than a clinical decision-maker, and that informatics gets framed as a sub-discipline of IT.

A CMIO who reports to the **CMO** is clinically grounded, has influence over medical staff priorities, and is well positioned to make the case that informatics is a clinical discipline. The risk is that the CMIO is technically isolated and has to fight every IT priority through a layer of translation.

A CMIO who reports to **both** (a dotted line to one, solid to the other; or a peer relationship with both reporting to the CEO) gets the benefits and the costs of both. Many large academic medical centers have landed here. The boards will give you a stem about a reorganization and ask you to evaluate the structure; the answer is usually some version of "what does this structure make easy and what does it make hard."

The deeper point — and the one a board question will reward you for surfacing — is that the *structure* matters less than the *clarity*. An organization in which everyone knows who owns which decisions, where the seams are, and who to call when a problem doesn't fit cleanly into one bucket will outperform an organization with the perfect org chart and no clarity. This is true of every aspect of clinical informatics governance and we will come back to it in Module 8.

A final note on language. The word "informatics" makes some clinicians' eyes glaze over and some IT leaders defensive. When you are arguing for a role, a budget, or a project, the word that lands is usually not "informatics." It is some specific instance of informatics work: "we need this so that clinicians stop ordering duplicate labs," "we need this so that the sepsis alert stops being ignored," "we need this so the discharge summary actually reaches the PCP." Lead with the clinical outcome and the discipline name follows. Lead with the discipline name and you lose the room. The boards do not test this, but the CMIOs who teach the board prep courses all know it, and you will eventually too.

## Concrete example

In 2019, a large academic medical center hired a new CIO from outside healthcare with a strong background in cloud infrastructure and a mandate to modernize the technology stack. Within eighteen months the EHR had been migrated to a new hosting environment, the network had been re-architected, and the security posture had been substantially improved. Clinicians' satisfaction with the EHR, however, dropped — not because of any of the IT changes, but because the CMIO had been quietly reassigned to report to the CIO during the reorganization and her team's work on order set redesign, alert tuning, and clinician documentation burden had been deprioritized as "non-strategic" relative to the infrastructure work.

The CIO had not done anything wrong by the standards of his discipline. He had executed beautifully on the IT mandate. What had happened was that the *informatics* function had been folded into IT, judged by IT metrics, and starved of the clinical attention it needed to function. When the CMIO eventually left, the medical staff revolted, and the structure was reversed: the new CMIO reports to the CMO with a dotted line to the CIO, and the order set work resumed. The IT modernization remained valuable. The lesson was that doing the IT half well is necessary and not sufficient — and that the half that is missing is the half that determines whether the technology produces care.

## Uncomfortable question

If the distinction between informatics and IT is so important, why do most hospitals you have worked at functionally treat them as the same department, with informatics as a small clinical-facing team inside IT? Is the field's official self-understanding wrong, or are most hospitals organized wrong, or is there a third possibility you should be considering?

Hold your answer.
