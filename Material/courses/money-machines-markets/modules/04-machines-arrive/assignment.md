---
id: assignment-04
moduleId: 04-machines-arrive
title: One Task, End to End — Where the Model Broke
type: written
wordCount: 500
rubric: written-thesis
dueAfter: lessons-complete
---

# Assignment — One Task, End to End

## The prompt

Pick one task that you actually do in your work, your studies, or your hobby. Run it end-to-end on a frontier model. Write 500 words about *exactly* what happened, with particular attention to the place it broke.

The task has to be specific enough that "kind of working" can be told from "actually working." Not "explain this concept to me" — that's a vibe, not a test. Something with an end state. A piece of code that should compile. A document that should be summarized accurately. A dataset that should be queried correctly. A diagnosis that has a right answer. A translation that a fluent speaker could grade.

## What I'm looking for

Your 500 words should answer four questions in plain language. You can structure it any way you want, but all four answers should be in there:

1. **What was the task and why was it a fair test?** (Why this task and not a softer one? What about it lets you tell working from not-working?)
2. **What did the model actually do, step by step?** (Concrete enough that a reader can picture it. Not "it gave me a great answer." Quote a specific output.)
3. **Where did it break, and what kind of break was it?** (Use the vocabulary from the lessons. Was it a hallucination? A compounding error? An out-of-distribution failure? An eval-trained shortcut? Don't reach for the closest word — reach for the right one.)
4. **What did this test actually demonstrate, and what did it not?** (The hardest part. Resist the urge to generalize. One task is one data point. What can you legitimately conclude, and what would you have to test next to conclude more?)

This is graded against the **Written Thesis Rubric** (`rubrics/written-thesis.json`). The four criteria are:

1. **Clarity of claim** — A reader should be able to summarize your finding in one sentence after reading.
2. **Quality of reasoning** — Each step of your argument should follow from the previous one. The vocabulary from the lessons should be used precisely, not as decoration.
3. **Engagement with the strongest counter-argument** — What would someone who disagreed with your reading of the result say? Pick the strongest version and answer it.
4. **Voice and honesty** — I want to hear *you* in this writeup. The model surprised you somewhere. The model embarrassed itself somewhere. Both moments matter. Generic essays die here.

## What will sink it

- A 500-word "I tried ChatGPT and it was impressive/bad" with no specific task and no reproducible findings. The whole point is the specificity.
- Reaching for the most exciting interpretation. ("This proves AGI is here / impossible.") One task does not prove anything that big. If your conclusion is bigger than your evidence, you have done the test wrong.
- Reaching for a verdict. The lessons have spent six lessons telling you not to pick a tribe. If your assignment ends with a tribal conclusion, the lessons did not land. Try again.
- Using the vocabulary as decoration ("it was clearly an emergent capability of the transformer architecture") without using the words to actually say something.
- AI-generated prose. I will recognize it. So will you when you read it back. (You may absolutely use AI as a sparring partner or for editing — just disclose it.)

## Format

- 500 words (±100)
- Plain markdown
- Include a literal quote of one of the model's outputs from your test, formatted as a blockquote. This is not optional. Without the quote your reader cannot judge your reading of it.
- A one-line note at the end disclosing which model(s) you used, when, and any AI tools you used to write the assignment itself.

## Why this assignment

This module spent six lessons on what AI is, how it works, where it's going, and what it cannot do. The point of the assignment is to force you to *land* the abstract material on a single concrete thing you actually saw with your own eyes. People who only think about AI from headlines and demo videos will sail through the lessons and learn nothing durable. People who run one honest test on something they care about will start to develop a calibrated intuition that survives the next year of model releases — and the year after that.

The cost is one hour of your time. The return is a personal calibration that almost nobody in the public conversation about AI has, and that everyone who wants to make good decisions in this domain needs.

The first time you describe an output you watched a model produce using the words "compounding error" or "out-of-distribution" or "ungrounded hallucination" and *mean* them — not as labels you stuck on after the fact, but as the actual mechanism you saw — the module has done its job for you.
