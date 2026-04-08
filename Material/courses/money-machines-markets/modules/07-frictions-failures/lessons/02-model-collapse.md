---
id: 02-model-collapse
title: Model Collapse and the Limits of Synthetic Data
order: 2
estimatedMinutes: 22
learningOutcomes:
  - Define model collapse and distinguish it from related failure modes.
  - Explain why training on model output is not the same as training on human output, and where the difference matters.
  - Articulate what we still do not know about long-run training dynamics.
concepts:
  - model-collapse
  - synthetic-data
  - distribution-shift
  - data-attribution
  - mode-coverage
---

## Reading

There is a story you hear at dinner parties in 2026 that goes like this: AI is going to run out of data. The internet has been scraped clean. The next generation of models will have to train on the output of the previous generation. When that happens, the models will eat their own tail and degrade. The technical term is **model collapse**. The story is half right and half wrong, and the half that is wrong is the half people are most confident about.

Let's start with what model collapse actually is, in the technical literature. The cleanest definition comes from Shumailov et al. (2023): model collapse is a degenerative process where a generative model trained on data produced by previous generations of itself loses information about the *tails* of the original data distribution. After enough generations, the model converges to the high-probability center of the distribution and forgets the rare events. The variance shrinks. The diversity collapses. In the limit, the model produces the same handful of bland outputs forever.

This is a real phenomenon. It has been demonstrated cleanly in small-scale experiments with image generators, language models, and Gaussian mixtures. The mechanism is straightforward: each generation samples finitely from the previous one, and finite sampling underrepresents the tails. Repeat that enough times and the tails are gone. Pure mathematics, no AI hype required.

Now the part the dinner-party version gets wrong. Model collapse, as defined in the paper, applies to a specific setup: a model trained *only* on its own previous outputs, with no fresh real data injected. That setup is not what frontier labs in 2026 are actually doing. Real training pipelines mix human data, synthetic data, and *curated* synthetic data — the latter being model output that has been filtered, rated, and selected by humans or by other models. Curation breaks the collapse mechanism, because the curator is making distributional choices that are not the model's own. Whether the curator does this *well* is a separate, harder question.

So the honest framing is: collapse is real in the pure self-loop. Frontier training is not a pure self-loop. But the avoidance of collapse depends on the quality of curation, and we don't have great theory on what counts as "enough" curation, or what kinds of human data are irreplaceable, or whether some properties of language can only be learned from text written by people who weren't trying to be helpful.

That last point is the one that worries me, and it doesn't get enough attention. There is something about human writing produced *for other purposes* — court transcripts, fishing forums, code review threads, drunk Twitter — that may be load-bearing in ways we don't understand. These are not high-quality in any conventional sense. They are full of errors, contradictions, weird local jargon. But they contain something that helpful synthetic prose seems to lack: friction, distribution mass in the unglamorous places, the sound of a real person who is not trying to teach you anything. A model trained on a corpus of "useful" synthetic text might be a worse model in subtle ways even if it scores higher on benchmarks. We don't know. The experiments you would need to run to find out are extremely expensive, and the labs that could run them have no commercial reason to publish negative results.

A few related failure modes that get conflated with model collapse and shouldn't be:

- **Distribution shift.** The world changes, the training data is from before, the model gets stale. This is not collapse — it's just being out of date. Fixable with fresh data.
- **Mode collapse** (in GANs). A generator gets stuck producing only a few outputs because the discriminator can't tell the difference. Different mechanism, similar-sounding name.
- **Reward hacking.** A model optimized against an imperfect reward signal finds ways to satisfy the metric without satisfying the goal. Not collapse, but often discussed in the same breath.
- **Capability plateau.** Returns to scale flatten. Could happen for many reasons; data quality is one of them, but compute ceilings, architectural limits, and reasoning bottlenecks are also candidates.

The reason all of these get lumped together is that nobody — and I mean nobody, including the people running the largest labs — has a clean, predictive theory of what causes generalization in large neural networks. We have empirical scaling laws that have held until they didn't, post-hoc explanations for capability emergence, and a lot of vibes. If a frontier lab tells you confidently that synthetic data is fine, ask them to publish the long-horizon experiments. They won't, because the experiments take years and the results would be commercially sensitive either way.

The rational position in 2026 is something like: collapse in the strict sense is unlikely under current curated pipelines, but the *quality drift* over many generations of synthetic-heavy training is a genuinely open question, and the labs sounding most confident on either side are usually selling something.

## Concrete example

In 2024 a research group fine-tuned a small open-source language model on a corpus of GPT-4 outputs, then fine-tuned the result on outputs from the previous step, and so on for ten generations. By generation seven the model had converged to producing similar-shaped paragraphs regardless of prompt — same opening, same hedging, same closing. The variance had collapsed visibly. Now: this was a small model, with no fresh data injected, and no curation between generations. It is a clean demonstration of the mechanism. It is *not* a forecast for what GPT-7 trained at scale on a curated mix will look like. Both of these statements are true, and people who quote the experiment usually mention only the first one.

## Uncomfortable question

If model collapse is a real risk and frontier labs are partially addressing it through aggressive curation, then the *quality of the curators* becomes one of the most important inputs to AI capability. Who decides what "good" output looks like? In practice, today, that decision is being made by small teams of contractors and researchers at a handful of labs, with no public oversight, no external audit, and increasingly, by other models trained by the same labs. If you believe AI is going to matter for the next century, are you comfortable with that being the bottleneck? If not, what specifically would you propose instead — and would your proposal actually produce better data, or just data that fits your preferences? Both halves of that question are uncomfortable for different reasons.
