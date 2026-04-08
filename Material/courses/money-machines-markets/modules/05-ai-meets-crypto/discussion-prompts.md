---
moduleId: 05-ai-meets-crypto
rubric: discussion-quality
type: threaded-discussion
---

# Module 5 — Discussion Prompts

Three threaded prompts. Pick at least one to start a thread on, and reply substantively to at least two threads started by others. Quality matters, volume doesn't. See `rubrics/discussion-quality.json` for what "substantive" means here.

---

## Prompt 1 — The substitution test in the wild

Lesson 1 introduces a single test for evaluating any AI+crypto pitch: *if you replaced the chain with a normal Postgres database operated by the company itself, would the product break or just be modestly worse?*

**Question for the thread:** Find one specific, real, currently-funded "AI + crypto" product (name it, link it). Describe in your own words what it does. Then apply the test honestly. State which bucket you think it falls into (1, 2, or 3) and walk through *exactly* what would break (or wouldn't) under the substitution.

**Ground rule:** if you call something bucket 3, you have to also state what the product would have to change to become bucket 2, and whether that change would be commercially viable. If you call something bucket 1 or 2, you have to acknowledge the strongest case for why a skeptic would put it in bucket 3 anyway.

---

## Prompt 2 — Where determinism actually bites

Lesson 6 argues that the probabilistic-vs-deterministic boundary is a structural constraint, not a temporary engineering inconvenience. The three patterns (single oracle, constrained multi-oracle, zkML) are the only architectures that survive contact with the constraint, and each one comes with a real cost.

**Question for the thread:** Pick one of the three patterns and make the strongest case you can for it as the *long-term* foundation for "AI talking to chains." Then make the strongest case against it. Then say which pattern you actually expect to dominate in five years and why.

If your answer is "none of them, a fourth pattern will emerge," you have to sketch what that fourth pattern would have to look like to satisfy both consensus determinism and useful LLM output. Most people who say this have not actually tried to write the sketch. Try it.

---

## Prompt 3 — The honest investment thesis

Most of the AI+crypto money in the last three years has gone into bucket 3 — products where the chain is doing fundraising work, not technical work. Most of the *interesting* technical work is in much smaller, less glamorous companies.

**Question for the thread:** If you were writing an investment thesis for AI+crypto in 2026, what would you fund and what would you refuse to fund? Be specific about categories (zkML for narrow oracles? agent-wallet payment infrastructure? batch-job decentralized compute? content provenance? something else?). Then answer the harder question: *which of the things on your refuse-to-fund list are you saying no to because the technology is wrong, and which are you saying no to because the financial structure is wrong?*

**Ground rule for this thread:** if you assert that any category is "obviously a scam" or "obviously the future," you have to *say what you mean* in non-slogan language. Same goes for "AI agents will run the economy." Same goes for "crypto solves nothing for AI."

---

## How to participate well

- Quote the specific thing you are responding to before responding to it.
- Name specific projects, models, or papers when you can. Vague references to "some startup" are not arguments.
- If you are about to type a sentence containing the word "decentralized" without saying what it means in context, stop and rewrite it.
- It is fine and good to change your mind in public. The discussion-quality rubric explicitly rewards this.
- It is fine to say "I don't know yet." It is not fine to perform certainty you don't feel.
