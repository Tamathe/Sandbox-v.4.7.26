---
id: assignment-05
moduleId: 05-ai-meets-crypto
title: The Smallest Useful Product That Genuinely Needs Both
type: written
wordCount: 600
rubric: written-thesis
dueAfter: lessons-complete
---

# Assignment — The Smallest Useful Product That Genuinely Needs Both

## The prompt

Sketch the **smallest useful product** that genuinely needs both an LLM (or other AI model) and a blockchain. Defend why neither alone would suffice.

"Smallest useful" is doing a lot of work in that sentence. The point of this assignment is to fight the natural temptation to describe an empire. I do not want a five-year platform vision. I want one product, with one user, doing one thing they actually need, and I want you to be able to defend each ingredient — the LLM part and the chain part — separately.

The product can be:
- An onchain settlement layer for some specific kind of model output (insurance, prediction markets, content royalties, etc.).
- An agent wallet system for a specific narrow workflow (research agent, ops agent, dataset agent).
- A verifiable inference oracle for a specific high-stakes decision.
- A provenance system for a specific content domain.
- A decentralized compute marketplace for a specific batch workload.
- Something stranger that doesn't fit any of the above categories (this is welcome — strange is often where the real wins are).

The choice matters less than the defense.

## The two questions you must answer

This is a "show your work" assignment. You must answer both of these in the writeup, explicitly:

1. **Why does this product need an LLM (or other AI model)?** What is the AI doing that a deterministic rules-based system cannot do? Be specific. "It uses AI" is not an answer; "the input is unstructured natural language and we need to extract X" is the start of an answer.

2. **Why does this product need a blockchain?** Apply the test from Lesson 1 honestly. If you replaced the chain with a normal Postgres database operated by your company, *what specifically breaks* — not "gets worse," breaks? If you cannot answer this without using the words "decentralized," "trustless," or "permissionless," your product is in bucket 3 and you should sketch a different one.

If the LLM is doing on-chain decision-making, you must also state which of the three patterns from Lesson 6 you are using (single oracle, constrained multi-oracle, or zkML), and why that pattern's costs are acceptable for your specific use case.

## What I'm looking for

This is graded against the **Written Thesis Rubric** (`rubrics/written-thesis.json`). The four criteria are:

1. **Clarity of claim** — A reader should be able to summarize your product in one sentence after reading.
2. **Quality of reasoning** — Each claim about why the chain or the LLM is necessary should follow from a specific, named property of that technology rather than from a slogan.
3. **Engagement with the strongest counter-argument** — A skeptical VC will ask "couldn't you do this with just a database and a normal API?" Answer their question, in detail, in the writeup itself. Don't make them ask.
4. **Voice and honesty** — I want to hear *you* in this writeup. If your product is a stretch, say so. If you came up with three ideas and rejected two, mention what they were and why you killed them.

## What will sink it

- A 600-word vision document for an "AI agent economy platform" with no specific user, no specific transaction, and no specific moment when the chain prevents a specific harm.
- The phrase "decentralized" used more than twice without definition.
- An unhedged "this needs a blockchain because trust" with no engagement with what specifically would go wrong without one.
- An unhedged "AI is the future of finance" with no engagement with what specifically the AI does in your product.
- AI-generated prose. I will recognize it. So will you when you read it back.

## Format

- 600 words (±100)
- Plain markdown
- A one-line note at the end disclosing any AI tool you used and how. ("Used Claude as a sparring partner on the substitution-test section." That's enough.)

## Why this assignment

This module spent six lessons telling you that most of the AI+crypto space is bucket 3, and that the interesting work is much narrower and less glamorous than the pitch decks make it sound. The point of the assignment is to force you to *try to build the bucket-1-or-2 thing yourself*, on paper, with the tests in this module pointed at your own work. Most people who try this exercise honestly find that it is much harder than they expected, and that the products they end up with are smaller and weirder than the products they started with. Both observations are the point. The first time you kill your own pitch because the substitution test ate it, the module has done its job.
