---
id: 06-what-models-cannot-do
title: What Models Cannot Do (and Why "Yet" Is the Important Word)
order: 6
estimatedMinutes: 25
learningOutcomes:
  - Name three structural limitations of frontier models in 2026 and explain the mechanism behind each.
  - Distinguish limitations that are likely to fall to the next generation of models from limitations that look more permanent.
  - State why the "cannot do" list is the most intellectually honest part of any model evaluation.
concepts:
  - hallucination
  - out-of-distribution
  - long-horizon-reasoning
  - grounding
  - eval-gaming
---

## Reading

If you have made it through the first five lessons of this module, you have a working picture of what frontier AI is and how it gets built. This last lesson is the corrective at the other end. The first lesson warned against dismissing the field as "just statistics." This lesson warns against the opposite error: the quiet assumption that because the curve has been climbing, it will keep climbing and the limitations you currently see will all dissolve in the next release. **They might. Some of them will. Some of them won't, and the ones that won't are exactly the ones the marketing materials avoid discussing.** Knowing which is which is the difference between a person who can use these tools well and a person who is constantly disappointed.

Three things current models cannot reliably do, in 2026, regardless of which frontier lab made them. I'll describe each with the mechanism, the steel-man for why it might fall soon, and the steel-man for why it might not.

**1. Reliable factual accuracy without external grounding.**

Models hallucinate. You know this. The question is *why*, mechanically, and what would have to change to fix it. The mechanism is simple: a language model produces text by sampling from a probability distribution learned during training. The model has no separate knowledge store. The "facts" are encoded as weight patterns that produce high-probability completions. When you ask the model something it has seen many times in training (the capital of France, the speed of light), the highest-probability completion is usually correct. When you ask it something it has seen less often, or never, the model still produces a high-probability completion — there is no token it can output that means "I don't actually have this information." It produces *something*, and the something is plausible, and the plausibility is uncorrelated with truth. This is not a bug. It is a structural feature of the way the model represents information, and it cannot be fully patched by training alone.

The mitigation that works is **grounding**: hooking the model up to an external source of truth (search, a database, a document), making it retrieve the relevant material, and constraining its generation to be supported by the retrieved material. RAG (retrieval-augmented generation), tool use that includes search, and the entire "deep research" feature category in 2025–2026 frontier products are all variations on this theme. Grounded models hallucinate dramatically less. They do not hallucinate zero, because the model can still misread or misuse the grounding material, but the rate is small enough to be useful. The honest version of the situation in 2026 is: ungrounded LLMs hallucinate constantly and you should not trust them on facts; grounded LLMs hallucinate sometimes and you can trust them more, with verification. The "fix" is architectural — wrap the model in retrieval — not algorithmic. The fact that this is a workaround, not a fix to the underlying mechanism, is why the limitation is not going away as long as the architecture is what it is.

**2. Long-horizon planning and self-correction.**

Lesson 4 covered the compounding-error problem in agents. The deeper version of the same problem shows up in *single-shot* tasks that require many internal steps. Frontier reasoning models in 2026 — the o-series, Claude with extended thinking, Gemini Deep Think — have made huge gains on this by training the model to produce long internal chains of thought before answering. On math contests and competitive programming, the gains are striking. But step outside the domains that have clean verifiable outputs (math, code, chess), and the gains shrink. For tasks where the right answer can't be checked algorithmically — write a coherent 30,000-word novel, manage a six-month research project, plan a successful product launch — the models still drift, contradict themselves, and lose the thread.

Why? Because the training signal that taught them to reason is verifiable correctness on short, scoreable problems, and those skills do not transfer cleanly to long, messy, fuzzy ones. The steel-man for "this is fixable soon" is that we are early in figuring out how to train models on long-horizon tasks, that synthetic data and reward modeling will get there, and that the gap between "wins math olympiad" and "manages a quarter-long project" is mostly an engineering distance. The steel-man for "this is hard for a long time" is that long-horizon coherent reasoning requires something that looks more like persistent memory and stable goals than transformers naturally have, and that bolting these on may require changes to the architecture that haven't been invented yet. Both views are held by serious people. I'd put the over-under at "much better in two years, still not solved."

**3. Genuine out-of-distribution generalization.**

Models are extraordinary at interpolating within the distribution of their training data and fragile when asked to extrapolate beyond it. The textbook example: a model that can solve thousands of standard physics problems will fall over on a physics problem with a setup nobody has written before, even if the underlying principles are identical. The model has learned the *patterns* of physics problems, not the underlying physics. When the patterns match, it looks like brilliance. When they don't, it looks like a confident undergraduate who memorized everything and understood nothing.

This shows up everywhere if you look. Coding models that are flawless on Stack Overflow patterns and clueless on novel libraries. Medical models that ace standardized exams and miss obvious diagnoses outside the textbook framing. Legal models that cite cases with confidence and invent half of them when the situation doesn't match a pattern they've seen. The mechanism is the same: the model is producing high-probability completions for patterns it has encountered, and "high-probability" is not the same as "correct" once you leave familiar terrain. There is a serious open research question about whether this can be solved within the current paradigm or whether it requires a fundamentally different kind of architecture. Some labs (DeepMind's neuro-symbolic work, the entire "world model" research program at Meta and elsewhere) are betting it requires something new. Others (most of the scaling-pure crowd) bet it is downstream of more data, more training, more compute. Both have evidence.

Now the meta-point. **The honest list of "cannot do" items for any frontier model is the part of the conversation almost nobody publishes**, because labs have a marketing incentive to highlight wins, critics have an attention incentive to highlight catastrophic failures, and users have a retention incentive to remember the times the model amazed them and forget the times it embarrassed them. Almost no one tracks failure modes systematically except a small number of evaluation researchers, and their work is largely unread outside the field. If you want to know what a model can actually do, you have to test it on your own work and pay attention to the failures. The published benchmarks are partially gamed (this is called *eval gaming* and it is a real and growing problem, where models are quietly trained on benchmark-adjacent data and then evaluated on the benchmark). The vibes-based "is it smart?" discourse is worthless. The only ground truth is your own use, on your own tasks, with your own honesty about what worked.

The reason this lesson exists is that the rest of the course is going to assume you can hold both halves at once: AI is doing things that almost nobody thought it would do this fast, *and* there are specific things it cannot do that are not about to be solved by the next bigger model. The people who can see both halves are going to make better decisions about this technology than the people who can only see one. The whole course is, in a sense, an exercise in not picking a tribe.

## Concrete example

Pick a domain you actually know something about — your job, your field, your hobby — and stress-test a frontier model on it for an hour. Not on the easy questions. On the questions you would use to evaluate a smart but inexperienced new hire. Watch carefully. You will almost certainly see two things in the same hour. *Genuinely impressive performance on tasks that you didn't expect would work*, and *confident mistakes on tasks that you didn't expect would fail*. The pattern is consistent across domains. Doctors find that frontier models in 2026 are excellent at standard diagnostic reasoning and weirdly bad at edge-case patient-history integration. Lawyers find them excellent at drafting and dangerous at citation. Engineers find them excellent at boilerplate and dangerous at architecture. The mistakes are not random. They cluster exactly where the training data thins out and the patterns stop holding. If you want a single exercise to calibrate your intuition about modern AI, this is it. Do not skip it because you feel you already know what you'd find. You don't. Almost nobody does.

## Uncomfortable question

When you finish your stress test in the concrete example, you will have a personal list of things the model is great at and things it is bad at. That list is more valuable than any benchmark report you will read this year, because it is grounded in tasks that actually matter to you and failures that you actually noticed. Now the question: are you going to *keep* that list, update it as new models come out, and use it to make decisions — or are you going to forget it within a week and go back to forming your opinions from headlines? Most people do the second thing. The first thing is unreasonably valuable and almost free. Why don't more people do it?
