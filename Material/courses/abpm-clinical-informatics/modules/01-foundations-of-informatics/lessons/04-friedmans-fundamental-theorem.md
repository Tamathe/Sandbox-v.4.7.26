---
id: 04-friedmans-fundamental-theorem
title: Friedman's Fundamental Theorem — The One Equation in This Course
order: 4
estimatedMinutes: 30
learningOutcomes:
  - State Friedman's fundamental theorem in one sentence and explain what it claims and what it doesn't.
  - Apply the theorem to evaluate whether a proposed informatics intervention should be expected to help.
  - Identify the most common ways informatics projects violate the theorem in practice.
concepts:
  - friedmans-fundamental-theorem
  - human-plus-system
  - augmentation-vs-automation
  - intervention-evaluation
---

## Reading

Charles Friedman, then at the University of Pittsburgh and later at the University of Michigan, published a one-page essay in 2009 in JAMIA called "A "fundamental theorem" of biomedical informatics." It is the most-cited single page in the field, and it is the one piece of theory you absolutely have to be able to recite and explain on the boards. The theorem itself is almost embarrassingly simple. The implications are not.

Here is the theorem, in Friedman's framing:

> **A person working in partnership with an information resource is "better" than that same person unassisted.**

Or, written as the field usually writes it:

> **(Person + Information Resource) > Person**

That's it. That's the whole theorem. Read it once more. Notice what it does *not* say.

It does not say that the information resource alone is better than the person. It does not say that the information resource alone is better than nothing. It does not say that the partnership is better than the partnership with a *different* information resource. It does not say that "better" is automatic, or guaranteed, or large. It says only that the *purpose of an information resource in clinical informatics is to make a person more effective than that same person would be unassisted*, and that whether the resource achieves this is the standard by which it should be judged.

This sounds trivial. It is not trivial. It is in fact the single most violated principle in the field, and the way it is violated tells you almost everything about why informatics projects fail.

The first violation is **comparing the wrong things**. A vendor demos a CDS module and says "this system caught 87% of cases of X." That is a statement about the system, not about the theorem. The theorem-relevant question is: *what percentage did the clinician catch without the system, and what percentage did clinician + system catch together, and is the second number bigger than the first?* If the clinician already caught 90% unassisted, the system that "catches 87%" may actually be making things worse by introducing noise. A board question that gives you a sensitivity for a CDS rule and asks you to evaluate it is testing whether you know to ask the comparison question.

The second violation is **automating instead of augmenting**. The theorem is about partnership. It assumes the human is in the loop. A system that takes the human out of the loop is not subject to the theorem; it is subject to a different and harder set of evaluations involving safety, liability, and regulatory approval. There are good reasons to build automated systems — laboratory result validation, for instance, where the human-in-the-loop version is too slow — but the moment you take the human out, you have left informatics-as-Friedman-defined-it and entered a different field with different rules. The boards will sometimes give you a stem in which a system is being proposed as "fully automated" and the right answer is to recognize that the framing has changed.

The third violation is **the resource that helps in the lab and hurts in the wild**. A CDS rule that performs beautifully on retrospective data, where the clinician has all the time in the world and the patients are pre-selected, may make clinicians worse on prospective data, where the alert competes with twelve other alerts and the patient is unselected. The theorem is about *the actual partnership in the actual setting*, not about the resource's standalone metrics. This is why the Friedman framing is so closely tied to the Sittig-Singh sociotechnical model: both insist that the unit of evaluation is the system-in-context, not the system-on-paper.

The fourth violation, and the most subtle, is the **resource that helps a beginner and hurts an expert** (or vice versa). A diagnostic decision support tool may improve the performance of a third-year medical student and degrade the performance of a senior attending who is now slowed down or distracted by the suggestions. The theorem doesn't fail in either case — the partnership is better than the unassisted version *for one user* and worse *for the other*. The honest application of the theorem requires you to specify *which person*. Vendors generally don't. Boards reward you for noticing.

The way to use the theorem in practice — and the way the boards will test it — is as a checklist for evaluating any proposed informatics intervention:

1. **Who is the person?** A nurse, a resident, an attending, a patient, a coder? Specify.
2. **What is the unassisted baseline?** What does this person currently do without the resource, and how well do they do it?
3. **What is the assisted version?** What exactly will the person do *with* the resource — not in theory, but in the workflow they actually have?
4. **Is the assisted version better, on a metric that matters?** Better can mean more accurate, faster, less cognitively burdensome, more consistent — but it has to be one of those, and you have to say which.
5. **Does the comparison hold in the real setting**, not just in the demo or the retrospective study?
6. **Is the gain worth the cost** — in money, in attention, in alert fatigue, in workflow disruption?

A proposed intervention that cannot answer all six of these in a paragraph is not ready to be deployed, and the theorem is what gives you the right to say so out loud.

A final note. Friedman wrote a follow-up piece a few years later acknowledging that some informatics resources are not really about person-plus-resource at all — they are infrastructure (a clinical data repository, an integration engine, a terminology server) that *enables* other resources to satisfy the theorem. These are not exempt from evaluation, but they are evaluated indirectly: an integration engine is good if the resources downstream of it satisfy the theorem, and bad if they don't. This nuance is worth knowing because the boards occasionally give you a stem about a piece of infrastructure and ask you to evaluate it; the right move is to evaluate it through its downstream effects, not in isolation.

## Concrete example

Consider an AI-based mammography reading tool deployed in a screening program. A naive evaluation says "the tool has a sensitivity of 94% and a specificity of 91%; the radiologist has a sensitivity of 87% and a specificity of 95%; the tool is more sensitive, deploy it." This evaluation violates the theorem in two ways at once: it compares the tool to the radiologist instead of comparing radiologist-alone to radiologist-plus-tool, and it implicitly proposes replacement rather than partnership.

The theorem-respecting evaluation asks: what does a radiologist reading *with* the tool catch, and miss, compared to a radiologist reading alone? That is a different study, with a different design, and the answer often turns out to be "radiologist plus tool catches a few more cancers but generates more recalls, and the net effect on outcomes depends on the population and the workflow." Sometimes the partnership is clearly worth it. Sometimes it isn't. The theorem doesn't tell you which — it tells you what question to ask, and that asking any other question is asking the wrong one.

This is also why most published evaluations of AI in radiology over the last decade are, by Friedman's standard, evaluating the wrong thing. The boards know this and the question stems are getting sharper.

## Uncomfortable question

If the Fundamental Theorem says the unit of evaluation is the human-plus-system partnership, what happens to the theorem in a future where the system is good enough that some tasks are taken out of the partnership and given to the system alone? Does the theorem still describe clinical informatics, or does it describe one era of clinical informatics that is ending?

Hold your answer.
