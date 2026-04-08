---
id: 02-dikw-hierarchy
title: Data, Information, Knowledge, Wisdom — and Why the Hierarchy Matters
order: 2
estimatedMinutes: 35
learningOutcomes:
  - Walk the data → information → knowledge → wisdom hierarchy with a clinical example at each level.
  - Identify which level a given EHR feature operates at, and why getting the level wrong is a common design failure.
  - Explain why the hierarchy is contested and what the contestation actually disagrees about.
concepts:
  - dikw-hierarchy
  - data-vs-information
  - knowledge-representation
  - structured-vs-unstructured-data
  - context-of-interpretation
---

## Reading

The data → information → knowledge → wisdom hierarchy — DIKW for short — is the framing every clinical informatics textbook opens with. It is also the framing the boards open with, which is why we are opening with it. It is not the deepest idea in the field, but it is the one you will get tested on and the one that quietly structures how the rest of the field talks about itself.

Here is the hierarchy, with a clinical example at each level.

**Data** is a raw observation, stripped of context. The number `137`. The string `"K"`. A timestamp. By itself, `137` could be a serum sodium, a heart rate, a systolic blood pressure, a discharge weight in pounds, or the room number on the post-surgical ward. Data has no meaning without context. The mistake people make is thinking of data as "facts." Data is closer to "uninterpreted measurements." This is why a database column called `value` and nothing else is a sign of a system that is going to hurt you later.

**Information** is data plus context — the metadata that makes the data interpretable. `Serum sodium = 137 mEq/L, drawn 2026-04-06 at 06:14, on Mrs. X.` Now we have something a clinician can act on. Information is data with the *who, what, when, where, and units* attached. The leap from data to information is what entire standards (LOINC, UCUM, FHIR) exist to enable. When a board question describes a system that is "exchanging data" but failing to drive clinical decisions, the failure is almost always at the data-to-information seam: the receiving system gets the number but not enough context to know what it is.

**Knowledge** is the synthesis of many pieces of information into something general — a rule, a pattern, a relationship. "Serum sodium below 135 in a patient on thiazide diuretics raises concern for diuretic-induced hyponatremia, especially in the elderly." That is knowledge. It came from many patients, many studies, many clinicians' experience. It is the kind of thing you'd find in UpToDate or a clinical practice guideline. Knowledge representation — getting that statement into a form a computer can apply to a specific patient — is the entire problem of clinical decision support, and we'll spend Module 4 on it.

**Wisdom** is the application of knowledge to a specific situation in a way that accounts for everything the knowledge doesn't capture. "This patient has a sodium of 134 and is on HCTZ, but she's also been vomiting for two days, her baseline sodium was 136, and she has a goals-of-care conversation pending — so the right move is not to start fluids, it's to call her daughter." Wisdom is what experienced clinicians do that a CDS rule cannot. It is fundamentally about *context the system doesn't have access to*. Whether wisdom even belongs in the hierarchy at all is the part of DIKW that informaticists fight about, and we'll come back to that.

The standard graphical representation is a pyramid: data wide at the bottom, wisdom narrow at the top, with the implication that you "ascend" by adding context, structure, and synthesis. Each level requires the level below. You cannot build knowledge without information, and you cannot build information without data. This is the part of the hierarchy that is unobjectionable and useful.

Now the contested part. The pyramid implies that wisdom is the *output* of an informatics system — that if you build the pipeline correctly, wisdom comes out the top. This is not how anyone in the field actually thinks the world works. Wisdom is produced by humans, in context, with all the things that don't fit in a database (patient values, family dynamics, the doctor's gut, the thing the nurse noticed at 3 a.m.). What an informatics system can do is *deliver knowledge to the person who has the wisdom* in a form they can use without breaking their workflow. That is the entire game. The pyramid is a useful teaching device that becomes a misleading one if you take it too literally.

A way to make the hierarchy operational: ask, for any feature of an EHR, *which level of the hierarchy is this feature operating at?* And then ask the harder question: *is the user being asked to do work that the system should have done at a lower level?*

A few examples to make this concrete.

A flowsheet that displays sodium values over time without flagging the trend is operating at the *information* level. It is leaving the knowledge work — recognizing the downward trend as significant — to the human. That may be the right design choice. It may also be a missed opportunity, depending on context.

A CDS rule that fires "consider hyponatremia workup" when the trend crosses a threshold is operating at the *knowledge* level. It has encoded a generalization and is applying it to this specific patient. The risk is that the generalization is too coarse — it doesn't know about the vomiting, the baseline, the goals-of-care conversation — and so it produces wisdom-level mistakes.

A discharge planning tool that surfaces the right educational handout based on the patient's primary diagnosis is operating at the *information-to-knowledge* boundary. It is taking structured information (the diagnosis code) and applying a generalization (this diagnosis maps to this educational material).

A free-text progress note is data and information, mostly. The knowledge is in the clinician's head; the note is a partial, lossy externalization of it. NLP systems that try to extract structured data from notes are essentially trying to recover information that the clinician produced as an artifact of expressing knowledge. They will always be lossy because the clinician was not writing for them.

The board-style move with DIKW questions is to read the stem and ask: what level is the system at, what level is the *task* at, and is the gap being filled by the technology, by the user, or by nobody? If a clinician is being asked to do data-to-information work (e.g., manually convert units, or chase down which patient a result belongs to), the system has failed at a level it should own. If the clinician is being asked to do knowledge-to-wisdom work (apply guidelines to a specific patient with all their context), that is where the human belongs and the system's job is to make that easier, not to do it for them.

## Concrete example

Consider the ubiquitous "potassium 5.8" alert. The data is `5.8`. The information is `serum potassium = 5.8 mEq/L, drawn 2026-04-06 06:14 on Mr. Y`. The knowledge is "serum potassium >5.5 may indicate hyperkalemia and warrant repeat or treatment." The wisdom is "this is Mr. Y, who is on dialysis, whose potassium runs 5.5–6.0 between sessions, who is scheduled for dialysis in three hours, and whose pre-dialysis potassium of 5.8 is *normal for him* — so the alert should not interrupt my morning rounds."

A well-designed system uses what it knows about Mr. Y (he is on dialysis, his recent values, his next dialysis session) to suppress the alert *or* re-frame it. A poorly designed system fires the same alert it would fire for a previously-healthy outpatient. Same data, same information, same knowledge layer — different wisdom outcome, because the system either does or doesn't carry enough context to behave intelligently. The boards love this kind of distinction.

## Uncomfortable question

If wisdom is by definition the part of clinical reasoning that doesn't fit in a database, what stops "wisdom" from becoming the field's permanent excuse for any decision the technology can't yet support? Is there a version of clinical informatics that takes wisdom seriously without using it as a polite name for "things we gave up on automating"?

Hold your answer.
