---
id: study-group-06-quality-analytics
moduleId: 06-quality-safety-analytics
title: Module 6 Study Group — Drilling Measure Specs and Statistical Traps
estimatedMinutes: 75
---

# Module 6 Study Group — Drilling Measure Specs and Statistical Traps

## What this study group is for

This is the second study group of the course. Module 2 used a study group because the standards content is high-volume rote memorization. This module uses one for a different reason: measure-spec literacy and statistical-trap recognition are fast-twitch pattern-matching skills that decay quickly in solitary study and stay sharp under peer drilling. You can read the eight traps from lesson 4 alone and feel like you understand them. You will discover, in a group, that you can recite the names but cannot reliably name the trap when it is buried in a stem you have not seen before. The point of the group is to surface that gap and close it before the mastery gate.

This is not a discussion thread. It is a coordinated drilling session that you should hold synchronously (over video, in person, or in the platform's voice room) at least twice during the module — once around the midpoint after you have read lessons 1–4, and once near the end before the mastery gate.

## Group size and composition

Three to five candidates. Same composition rules as the Module 2 group: mix first-time test-takers with anyone who has taken the boards before, because the experienced candidates know which question forms actually appear and the new candidates will catch the experienced ones papering over things they have forgotten. If anyone in your group also did the Module 2 study group together, that is ideal — the group has already learned how to drill each other.

## Format

Each session has three rounds. Plan for about 75 minutes total.

### Round 1 — Measure Spec Speed Round (20 minutes)

One person reads aloud the English description of a CMS or NQF quality measure, without showing the rest of the group the source. Everyone else writes down (on paper or in chat) what they believe the numerator, denominator, exclusions, and exceptions are. Then the reader reveals the actual spec and the group compares. Move on. Repeat for ~8–10 measures.

The point of writing it down rather than calling it out is the same as in Module 2: everyone has to commit, including the people who would have followed someone else's answer. The point of guessing before reading the spec is that the gap between what the English description suggests and what the spec actually says is exactly the literacy this round is drilling.

Sample measures to start with — pick from the CMS Measures Inventory Tool, the NQF QPS, or the eCQI Resource Center. Do not reuse the same measures across sessions.

- CMS122 — Diabetes HbA1c poor control >9% (the lesson 1 example)
- CMS165 — Controlling high blood pressure
- CMS22 — Preventive care: screening for high blood pressure and follow-up plan
- CMS117 — Childhood immunization status
- CMS147 — Preventive care: influenza immunization
- CMS90 — Functional status assessment for total knee replacement
- A hospital-level measure: PSI 90 (Patient Safety Indicator composite) or HCAHPS communication composite
- A bundled-payment measure from your own institution if you can pull one

Force at least one of the measures to be one nobody in the group has seen before. The first time you encounter a new spec under time pressure is the test that matters.

### Round 2 — Name the Trap (25 minutes)

Each member of the group brings TWO short scenarios to the session, written down in advance. Each scenario describes an analysis or a finding in two to four sentences and is designed so that one of the eight statistical traps from lesson 4 is operating. The reader presents the scenario aloud. Everyone else writes down which trap (or traps) they think is operating and what the appropriate analytical defense would be. Then the reader reveals the trap they had in mind and the group debates whether the answer is correct, whether the scenario is ambiguous, and whether more than one trap is plausibly operating.

The trap list to drill (from lesson 4):

1. Regression to the mean
2. Simpson's paradox
3. Denominator drift
4. Selection bias
5. Immortal-time bias
6. Confounding by indication
7. Base-rate neglect / low-prevalence trap
8. Multiple-comparisons inflation

The discipline the round is building is the move from "I have read the names" to "I can name the trap when it is hiding inside a stem the question writer constructed to make the trap unobvious." That is the skill the boards test. It is also the skill that matters when an analyst presents to your committee and you have to know within fifteen seconds whether the analysis is sound.

Sample scenarios to seed the round (do not reuse — generate your own):

- A primary care practice identifies the ten patients with the highest A1c last quarter and assigns each to a diabetes nurse. Next quarter the average A1c of those ten patients is lower. The nurse intervention "worked." (Regression to the mean.)
- A retrospective study of an EHR-integrated patient portal finds that portal users have better diabetes control than non-users. The team concludes the portal "improves" diabetes control. (Selection bias.)
- A study of cardiac rehabilitation compares one-year survival between patients who enrolled in rehab and patients who did not, with the time clock starting at hospital discharge for both groups. Enrollees have dramatically better survival. (Immortal-time bias.)
- An analyst examines 100 possible quality measures in the institution's data warehouse and finds three with p < 0.05 against a benchmark. (Multiple-comparisons inflation.)
- A health system's diabetes A1c control rate has improved over three quarters; the denominator has dropped from 4,200 to 3,400 over the same period. (Denominator drift.)
- A new screening test is 99% sensitive and 99% specific and is deployed for a condition with 0.1% prevalence; the team is surprised that most positives turn out to be false. (Base-rate neglect / low-prevalence trap.)
- Within both Hospital A and Hospital B, technique 1 has a higher success rate than technique 2; pooled across both hospitals, technique 2 has the higher rate. (Simpson's paradox.)
- An observational EHR study finds that patients on long-term oxygen for COPD have higher mortality than patients not on oxygen and concludes that oxygen is harmful. (Confounding by indication.)

Each member should bring at least one scenario based on something they have actually seen — at their institution, in a journal article, or in a vendor presentation. Real scenarios are messier than textbook ones, and the messiness is the part that decays fastest in solitary study.

### Round 3 — Bring a Real Dashboard (30 minutes)

Each member of the group brings a real or published quality dashboard for the group to critique together. The dashboard should be one the member has access to (de-identified per the PHI policy — see Module 1) or one published in a journal article or vendor case study. The group critiques each dashboard for ~5–7 minutes using the framework from lesson 3 and the assignment:

- Audience match — executive, operational, frontline?
- Measure-spec accuracy — does the English description match the spec?
- Statistical traps — denominator drift, missing context, vanity metrics?
- Frontline usability — Nielsen heuristics, freshness markers, control limits?
- Governance — who owns it, who decides what changes?

The critique doubles as preparation for the capstone. By the end of round 3 each member should leave the session with at least one specific dashboard critique they could expand into the written assignment, and at least one specific trap they recognized in someone else's dashboard that they would not have caught alone.

## After the session

Each member commits to one thing they did not know cold and will drill on their own before the next session — typically a measure spec they could not name, a statistical trap they confused with another one, or a dashboard failure mode they had not internalized. Write it down. Share it in the group's chat. Hold each other accountable, gently.

Reminder: PHI handling applies to study group sessions just as it does to discussion threads. Dashboards from your own institution must be abstracted before they are presented. If anyone in the session brings a dashboard with patient identifiers visible, the group's job is to push back, not to play along.

## Why this is a study group and not a discussion thread

Measure-spec drilling and trap-recognition are cooperative, fast, and synchronous skills. The corrections happen in real time and the social pressure of having to commit in front of peers is the part that makes the learning stick. Asynchronous discussion threads are better for case reasoning and steel-manning — slower paced, more deliberate, more written. Both belong in the course; they belong on different kinds of material. The boards reward both kinds of preparation, and you will do better if you do not try to substitute one for the other.
