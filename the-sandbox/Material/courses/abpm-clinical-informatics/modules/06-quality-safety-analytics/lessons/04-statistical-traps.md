---
id: 04-statistical-traps
title: Statistical Traps the Boards Quietly Test
order: 4
estimatedMinutes: 45
learningOutcomes:
  - Recognize and name the high-yield analytic traps the boards test directly: regression to the mean, Simpson's paradox, denominator drift, selection bias, immortal-time bias, confounding by indication, base-rate neglect, and multiple-comparisons inflation.
  - Compute and interpret sensitivity, specificity, positive predictive value, and negative predictive value, and explain why PPV collapses at low prevalence.
  - Identify which trap is operating in a stem and propose the appropriate analytical defense.
concepts:
  - regression-to-mean
  - simpsons-paradox
  - denominator-drift
  - selection-bias
  - immortal-time-bias
  - confounding-by-indication
  - base-rate-neglect
  - multiple-comparisons
  - sensitivity-specificity
  - ppv-npv
  - low-prevalence-trap
---

## Reading

This is the highest-yield lesson in the analytics half of this course. The boards do not test elaborate statistics; they test whether you can recognize the small number of recurring traps that ruin most informal analyses, and whether you have the vocabulary to name them when they appear in real work. Learn each trap by name. Learn at least one clinical example for each. The board questions are essentially flashcards: read the stem, name the trap, pick the defense. Once you have the vocabulary, the questions are easy. Without it, the same questions look like impossible reasoning puzzles.

There is no clever framework that lets you skip the rote learning here. Memorize the eight traps below the way you memorized the eight Sittig-Singh dimensions in Module 5.

### Regression to the mean

When a measurement is partly signal and partly noise, an extreme value is more likely to come from a moment of large noise than from a sustained extreme signal. Re-measure the same thing later and it will, on average, move toward the population mean — not because anything changed, but because the noise component re-rolls.

Clinical example: a hospital identifies the ten ED physicians with the highest patient-complaint rates last quarter and assigns them additional training. The next quarter, the average complaint rate of those ten physicians is lower. The training "worked." Except: regression to the mean predicts exactly that result with no training at all, because the ten physicians were partly selected on noise and the noise re-rolled. The honest defense is a control group — randomize half the high-complaint physicians to training and half to no training, and see if the trained group improves more than the untrained one. Without a control, you cannot distinguish the effect of the intervention from the effect of having selected on an extreme.

The boards test this trap whenever an intervention is targeted at a high-utilizer or high-error group and the post-intervention measurement looks better. The right answer is "regression to the mean is a candidate explanation; you need a control group to rule it out."

### Simpson's paradox

A trend that appears within several groups can disappear or reverse when the groups are combined, and vice versa. Aggregating data across groups can produce conclusions opposite to the conclusions you would draw within each group.

The canonical clinical example: comparing the success rates of two surgical techniques across two hospitals. Within Hospital A, technique 1 has a higher success rate than technique 2. Within Hospital B, technique 1 also has a higher success rate than technique 2. But when you pool the patients across both hospitals, technique 2 has the higher overall success rate. How? The pooled rate depends on the case mix. If technique 1 is concentrated in high-risk patients (because surgeons reach for it in tough cases) and technique 2 is concentrated in low-risk patients, the pooled rate for technique 2 reflects its easier patient population, not its inherent superiority. Within each hospital, with case mix held constant, technique 1 wins. Across the pooled data, technique 2 wins. Both numbers are correct. The pooled comparison is the wrong question.

The defense is **stratification**: report results within each meaningful subgroup before reporting the pooled number, or use a regression model that adjusts for the stratification variable. The boards love Simpson's paradox. Expect at least one stem on it. The stem will describe an aggregation that produces a counterintuitive result and ask you to name what is happening.

### Denominator drift

Already met in lesson 3. The denominator changes over time and the trend the dashboard shows is partly real and partly artifact. The defense is to chart numerator and denominator separately. The boards test it as both a dashboard-design failure and a statistical trap.

### Selection bias

The patients in your analysis are not a random sample of the population you want to make claims about. The selection mechanism is correlated with the outcome, and the conclusions are wrong in a predictable direction.

Clinical example: a study of an EHR-integrated patient portal finds that portal users have better diabetes control than non-users, and concludes that the portal "improves" diabetes control. But portal users are self-selected — they tend to be more engaged, more educated, more digitally fluent, and healthier — and would have had better control regardless of the portal. The defense is a randomized comparison or, failing that, careful adjustment for the confounders that drive selection. The boards test selection bias under many guises (volunteer bias, healthy-user bias, healthy-adherer bias).

### Immortal-time bias

A specific and very board-favored trap. A study compares patients who *received* an intervention to patients who *did not*, but the way the time windows are defined gives the "received" group a guaranteed survival advantage — there is a period during which they were necessarily alive (because they had to be alive to receive the intervention) that gets counted as exposed time.

The classic example: a study of cardiac rehabilitation enrollment compares survival between patients who enrolled in cardiac rehab and patients who did not, with follow-up starting from hospital discharge for both groups. But patients who enrolled in cardiac rehab had to survive the period between discharge and enrollment to be classified as "enrollees." Any patient who died during that gap is automatically classified as a non-enroller. The "enrollee" group therefore starts the analysis with a survival head-start that has nothing to do with the rehab itself. Cardiac rehab probably does help, but the magnitude of the benefit in studies that ignore immortal time is overstated.

The defense is to start the time clock at the moment of exposure, not at a common earlier point, or to use a time-varying covariate analysis. The boards test immortal-time bias directly with stems that describe a delayed-exposure intervention (transplant studies, drug initiation studies, registry enrollment studies). If the stem describes a survival advantage and the exposure is something the patient had to survive long enough to receive, immortal-time bias is the answer.

### Confounding by indication

In observational data, patients receive treatments because they are sick. The sicker the patient, the more aggressive the treatment. Comparing outcomes between treated and untreated patients without adjustment makes the treated group look worse, because the indication for treatment was severity itself.

The classic illustration: patients on long-term oxygen therapy for COPD have higher mortality than patients not on oxygen. Naïve interpretation: oxygen kills people. Correct interpretation: patients are placed on oxygen because they have severe COPD, and severe COPD is what kills them. The oxygen is doing what oxygen does; the comparison is wrong because the groups are not comparable.

The defense is randomization, propensity matching, or instrumental-variable analysis. The boards test confounding by indication especially in the context of CDS interventions and EHR-derived observational studies. If a stem describes a treatment-versus-no-treatment comparison in observational data and the treated group looks worse, confounding by indication is almost always the right answer.

### Base-rate neglect (and the low-prevalence trap)

People intuitively interpret a "positive test" as if it told them the probability of disease. It does not. The probability of disease given a positive test depends on the base rate (prevalence), the sensitivity, and the specificity, and at low prevalence the result is often counterintuitively low even with a very accurate test.

This is the place to review the four metrics. Memorize them.

- **Sensitivity** = P(positive | disease). Among people with the disease, the fraction who test positive. A property of the test.
- **Specificity** = P(negative | no disease). Among people without the disease, the fraction who test negative. A property of the test.
- **Positive predictive value (PPV)** = P(disease | positive). Among people who test positive, the fraction who have the disease. *Depends on prevalence.*
- **Negative predictive value (NPV)** = P(no disease | negative). Among people who test negative, the fraction who do not have the disease. *Depends on prevalence.*

The canonical low-prevalence trap, drilled into every medical student and re-tested on every informatics board: a test with 99% sensitivity and 99% specificity is applied as a screen in a population with 0.1% prevalence. What is the PPV?

Out of 100,000 screened, 100 have the disease and 99,900 do not. The test catches 99 of the 100 true positives (sensitivity 99%) and produces 999 false positives among the 99,900 healthy (specificity 99% means 1% false-positive rate among healthy, so 999). Total positives: 1,098. True positives: 99. PPV = 99 / 1,098 ≈ **9%**.

A test that is 99% accurate produces a positive result that is wrong 91% of the time, because the prevalence is low. This is not a quirk; it is the dominant fact about screening at low prevalence and the reason why a CDS rule that fires "accurately" in retrospective validation can produce an alert stream the clinicians experience as overwhelmingly false. Every CDS rule with a low base rate of true positives runs into this. The boards test this calculation and the conceptual implication.

The defense is to know the prevalence of the condition you are testing for, compute the predictive values rather than the sensitivities, and design alerts in a way that matches the resulting positive predictive value. A 9% PPV alert is not necessarily a bad alert — it depends on the cost of a miss versus the cost of a false alarm — but it cannot be deployed as if it were a 99% PPV alert.

### Multiple-comparisons inflation

If you run twenty independent statistical tests at α = 0.05 with no adjustment, you will get one "significant" result by chance even if the null hypothesis is true for all twenty. Run a hundred tests and you get five false positives. Run a thousand tests and you get fifty.

In informatics this trap appears whenever an analyst slices data many ways looking for "what's interesting" — twenty subgroups, twenty time windows, twenty endpoints. Some of the slices will produce p < 0.05 by chance. The defense is pre-specification of the analyses, or correction for multiple comparisons (Bonferroni for small numbers of tests, false-discovery-rate methods for large numbers), or both. The boards test this trap as a recognition question: "an analyst examined the EHR data for 100 possible quality measures and found three with p < 0.05 — what is the most likely explanation?"

## Concrete example — applied disambiguation

A health system implemented a new ML-based readmission risk score in its CDR. After six months, an analyst presents the following findings to the quality committee:

> "Patients flagged as high-risk by the score had a 28% readmission rate. Patients not flagged had a 14% readmission rate. The score is working — high-risk patients are being correctly identified. We should expand its use."

Walk the disambiguation.

- **Is regression to the mean operating?** Possibly, if the high-risk group was selected on a noisy first measurement. But the score is a real predictive model trained on prior data, not a single noisy measurement, so this is a weaker fit.
- **Is selection bias operating?** Possibly. Were the high-risk patients receiving any other intervention (case management, follow-up calls) that could affect readmission? The stem does not say. If they were, the analysis is conflating the score with the intervention.
- **Is confounding by indication operating?** Yes — but in reverse. The high-risk score is *the indication* for being labeled high-risk, and the indication itself predicts readmission. The 28% versus 14% difference is exactly what the score is supposed to do; it does not tell you whether *acting on* the score changes outcomes.
- **What does this finding actually demonstrate?** It demonstrates that the score is a non-trivial classifier — it separates a higher-risk group from a lower-risk group. It does not demonstrate that the score is improving outcomes, because no intervention has been compared to no intervention. The honest move is to randomize patients with similar scores to "score acted on" versus "score not acted on" and see if the readmission rate diverges. Without that comparison, the analyst is mistaking a working classifier for a working intervention. The boards test this disambiguation under the heading of confounding by indication or selection bias depending on the wording.

The right thing to say at the meeting is: "the score successfully identifies a higher-risk subgroup, which is necessary but not sufficient. We do not yet have evidence that acting on the score reduces readmissions. Before expanding its use, we should run a comparison of score-driven action versus no-action in patients with similar predicted risk." That sentence is the entire lesson.

## Uncomfortable question

The eight traps above are taught in every clinical informatics fellowship and tested on every board exam. They are also violated by published peer-reviewed papers in the major informatics journals every month, by analysts at most large institutions every week, and by vendor white papers every day. Why? Is the discipline of recognizing the traps too cognitively demanding to maintain under deadline pressure, are the traps actually less consequential than this lesson claims, or is there a structural incentive in the field to publish and present as if the traps did not apply? The honest answer determines whether you should treat the traps as a checklist to run through every time you see an analysis, or as a deeper kind of literacy that has to be re-earned each time. The boards test the recognition. The job tests the discipline.

Hold your answer.
