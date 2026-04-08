---
id: 02-usability-heuristics
title: Usability Heuristics — Nielsen, Cognitive Load, and Why Bad Screens Hurt Patients
order: 2
estimatedMinutes: 35
learningOutcomes:
  - State Nielsen's ten usability heuristics and apply them to an EHR screen.
  - Distinguish usability from user experience and from user satisfaction.
  - Explain why usability is a patient safety issue, not just a clinician comfort issue.
concepts:
  - usability
  - nielsen-heuristics
  - cognitive-load
  - heuristic-evaluation
  - usability-vs-satisfaction
  - user-centered-design
  - usability-testing
---

## Reading

Usability is the discipline that asks whether a system can be used effectively, efficiently, and with reasonable satisfaction by the people it is designed for. It sounds soft and is not. Bad usability in a clinical system produces wrong-patient errors, missed results, omitted orders, slowed care, and clinician burnout. The boards test usability under several headings — usability heuristics, human factors, user-centered design, cognitive load — and the underlying questions are about whether you can recognize a usability failure on a stem and propose the right fix.

## What usability is, precisely

The ISO definition (ISO 9241-11) is the one the field uses and the boards anchor on:

> Usability: the extent to which a system can be used by specified users to achieve specified goals with **effectiveness**, **efficiency**, and **satisfaction** in a specified context of use.

Three load-bearing words. Effectiveness is whether the user can complete the task at all. Efficiency is whether they can complete it in a reasonable amount of time and effort. Satisfaction is whether the experience is acceptable. All three matter, and a system that fails on any of the three is a usability failure regardless of how it does on the others. An EHR that lets you place an order in fifteen clicks is effective but inefficient. An EHR that lets you place an order in two clicks but with the wrong patient selected is efficient but not effective.

A distinction the boards test directly: usability is not the same as **user satisfaction**. Satisfaction is one component, and surveys of clinician satisfaction tell you something but not everything. A clinician who says "I'm used to it now" may have learned to compensate for poor usability rather than actually finding the system usable. The proper measure of usability includes objective task performance — completion rates, error rates, time on task — not just self-report.

Usability is also not the same as **user experience (UX)**. UX is the broader concept that includes usability plus aesthetics, emotional response, brand perception, and context. Clinical informatics is mostly concerned with usability rather than UX in the marketing sense, because the cost of a usability failure is measured in clinical errors and not in customer churn.

## Nielsen's ten heuristics

The most-cited usability framework is **Nielsen's ten heuristics**, published by Jakob Nielsen in 1994 and used continuously since. The heuristics are not rules; they are guidelines that experts use to identify likely usability problems without running a full user study. The boards expect you to know they exist, recognize them by name, and apply at least a few to a clinical screen.

The ten:

1. **Visibility of system status.** The system keeps users informed about what is going on. (An order has been placed; a result is loading; a save is in progress.)
2. **Match between system and the real world.** The system speaks the user's language and follows real-world conventions. (Use clinical terms, not vendor jargon. Order results chronologically because clinicians think chronologically.)
3. **User control and freedom.** Users have an "emergency exit" — undo, redo, cancel — when they make a mistake.
4. **Consistency and standards.** Same things look the same; same actions work the same way. (A button labeled "Sign" should sign in every screen it appears.)
5. **Error prevention.** Designs that prevent errors are better than designs that detect them after the fact. (Confirmation for high-risk actions; default values that are clinically safe.)
6. **Recognition rather than recall.** Show the user what they need to know rather than requiring them to remember it. (Display the patient's allergies on the order screen rather than expecting the clinician to remember them.)
7. **Flexibility and efficiency of use.** Provide shortcuts for experienced users without burdening novices. (Smart phrases, keyboard shortcuts, customizable order panels.)
8. **Aesthetic and minimalist design.** Each piece of information competes for attention with every other piece. Remove what is not needed.
9. **Help users recognize, diagnose, and recover from errors.** Error messages in plain language, with the cause and a suggested fix.
10. **Help and documentation.** When help is needed, it should be easy to find, focused on the user's task, and concise.

The boards have asked questions of the form "this EHR screen displays X — which usability heuristic is it violating?" and the answer requires you to map the symptom to the heuristic. Memorize the names. The numbers do not matter.

## Heuristic evaluation as a method

A **heuristic evaluation** is a usability inspection method in which a small number of evaluators (Nielsen recommends three to five) independently walk through the system, identifying problems against the ten heuristics. The evaluations are then combined into a single report. Heuristic evaluation is cheaper and faster than full user testing, and it catches a substantial fraction of major problems before users see them. It is the most common usability inspection method in clinical informatics and is what the field's evaluation experts do when asked to assess a screen quickly.

The boards distinguish heuristic evaluation from **usability testing**, which involves real users completing real tasks with the researcher observing and measuring. Usability testing is more expensive and more diagnostic. The right method depends on the question and the budget. Heuristic evaluation finds problems faster; usability testing tells you whether the fix actually worked.

## Cognitive load

A separate but related concept the boards test is **cognitive load** — the amount of mental effort the user has to expend to use the system. Cognitive load theory distinguishes three types:

- **Intrinsic load** is the inherent difficulty of the task itself. Reading a complex chest CT is intrinsically high load and there is no design that can change this.
- **Extraneous load** is the unnecessary mental effort imposed by the system. Hunting for the right tab, parsing a confusing display, remembering an arbitrary step order — all extraneous. The job of good design is to minimize extraneous load.
- **Germane load** is the mental effort that contributes to learning and skill development. A teaching tool that requires the student to engage actively imposes germane load productively.

The relevance to clinical informatics is that EHRs impose substantial extraneous load on clinicians — context switching between modules, navigating to find information that should be in front of them, remembering arbitrary keyboard shortcuts, parsing displays that mix relevant and irrelevant information. Reducing extraneous load is one of the highest-yield interventions for clinician burden. The boards have asked questions about cognitive load as a framing for EHR-related burnout and the answer is usually some version of "reduce extraneous load" rather than "make the EHR more efficient" (which is vague).

## Why usability is a safety issue

The argument that usability is "soft" assumes that effective and unsafe are different categories. They are not. A system that requires clinicians to navigate ten screens to place an order is a system in which clinicians make wrong-patient errors at the chart-switching step. A system that displays a patient's allergies in a small font on a tab the clinician has to click is a system in which allergies get missed. A system that uses similar visual treatment for safe and dangerous actions is a system in which dangerous actions get clicked accidentally.

The published evidence on usability and safety is unambiguous. Studies of EHR-related safety events consistently identify usability problems as contributing factors in a substantial fraction of cases. The **SAFER Guides** from ONC (which we cover in lesson 4) are explicit that usability is a safety domain. The boards test the link directly — when a stem describes a safety event traceable to a screen design, the answer is the design fix, not "be more careful."

A specific class of usability-induced safety event the boards test is **wrong-patient errors**. A clinician opens chart A, gets distracted, switches to chart B, places an order intending it for chart A, and the order goes to the wrong patient. The contributing usability problems are: insufficient visual distinction between charts, no confirmation when switching, no reminder of which chart is open during order entry, and no recognition-rather-than-recall display of the current patient's identifiers in the working area. Each is a heuristic violation. The fix is design, not training.

## User-centered design

**User-centered design (UCD)** is the design philosophy that puts the user at the center of every design decision — observing real users in real contexts, prototyping early and often, testing with real users, iterating based on what is observed. UCD is the opposite of "design what the engineering team thinks is logical and ship it to clinicians who will adapt." The boards test UCD by name and reward you for recognizing it as the discipline that should govern any new informatics intervention.

A practical form of UCD common in clinical informatics is **contextual inquiry** — observing users in their actual work environment, asking questions about what they are doing, and using the observations to inform design decisions. Contextual inquiry is the methodological cousin of the workflow observation from lesson 1; the two practices reinforce each other.

## Concrete example

A hospital's medication administration screen is redesigned by a vendor. The new design uses a single-column layout, shows three medications at a time, and requires the nurse to scroll through a list of twelve scheduled medications to find the one being administered. The previous design showed all twelve at once in a denser table.

Within a month, the nurses report that medication administration takes longer and that they have started administering the wrong medication occasionally because they are scrolling through the list and tap the wrong line. The hospital does a heuristic evaluation:

- **Recognition vs recall (heuristic 6)**: violated. The previous design showed all medications at once; the new one requires the nurse to remember which one they were about to administer while they scroll.
- **Aesthetic and minimalist design (heuristic 8)**: violated. The single-column layout is aesthetic at the cost of information density that the task actually needs.
- **Visibility of system status (heuristic 1)**: partially violated. After scrolling away from the top of the list, the nurse cannot see at a glance which medications have been given and which have not.
- **Error prevention (heuristic 5)**: violated. The new design makes wrong-line tap errors more likely and offers no confirmation step.

The hospital reverts the screen to the previous denser layout and works with the vendor to add features within that layout. Wrong-medication errors return to baseline. The intervention is the design fix, traceable to specific heuristics, not "retrain the nurses."

The boards reward you for this kind of analysis: name the heuristic, identify the violation, propose the fix. The exam stems will look like this case in structure.

## Uncomfortable question

If usability is a patient safety issue with clear evidence, well-known frameworks (Nielsen, cognitive load, UCD), and named methods (heuristic evaluation, usability testing), why are most EHRs in production in 2026 still widely considered to have substandard usability? Whose responsibility is the gap, and what would have to change for the gap to actually close?

Hold your answer.
