---
id: 06-probabilistic-meets-deterministic
title: When Probabilistic Systems Meet Deterministic Ledgers
order: 6
estimatedMinutes: 25
learningOutcomes:
  - Explain why LLMs are fundamentally probabilistic and blockchains are fundamentally deterministic.
  - Identify the failure modes that arise when you put one inside the other naively.
  - Describe the architectural patterns that work and the ones that don't.
concepts:
  - determinism
  - non-determinism
  - consensus
  - off-chain-compute
  - oracle-pattern
---

## Reading

A blockchain is a deterministic state machine. Every node in the network must compute the same answer from the same inputs, byte for byte, or consensus breaks. This is not a stylistic choice. It is the load-bearing assumption that makes the whole thing work. If two nodes can run the same transaction and get different results, the chain forks, and the chain is finished.

A large language model is a probabilistic system. The same prompt run twice produces different outputs in the general case — not because the model is broken, but because the sampling step that converts the model's probability distribution into a concrete next token is, by design, stochastic. Even when you set temperature to zero, you get reproducibility only on a fixed hardware, fixed software stack, fixed batch composition, fixed numerical precision. Change any of those — different GPU vendor, different floating point order due to thread scheduling, different batch neighbors — and you get small numerical drifts that compound and produce different outputs.

Now imagine you want to put an LLM "on a blockchain." Specifically, you want a smart contract to call a model, get an answer, and act on it. Every node in the network has to call the model and get the *same* answer. Otherwise consensus breaks.

You see the problem.

Almost every "AI on chain" pitch elides this. The pitch says "the smart contract uses an LLM to decide X." The implementation, when you look at it, is one of three patterns. One of them works. The other two don't, but they get described in language that makes them sound like they do.

**Pattern 1: Single oracle.** A trusted off-chain service runs the model, signs the result with its key, and posts the result on-chain. The smart contract trusts the signature. This works mechanically, but the chain is doing essentially nothing — the system is exactly as trustworthy as the off-chain oracle, which means the entire crypto-shaped value proposition has been outsourced to a normal centralized service. Useful in some cases, but be honest about what it is. It is not "AI on chain." It is "centralized AI, with a signature, calling a chain."

**Pattern 2: Multi-oracle consensus.** Multiple off-chain services run the model, each signs its result, and the chain accepts the result if some quorum agrees. This sounds better and is much worse than it looks. The problem is that LLMs don't agree. Even two different copies of the same model produce slightly different outputs on the same prompt. To get them to agree, you have to (a) constrain the output space drastically (multiple-choice answers, classification into a tiny set of buckets, hashes of quantized embeddings), or (b) accept fuzzy "close enough" agreement, which reintroduces the centralized trust you were trying to remove because someone has to define and enforce "close enough." Either way, the model is doing a much narrower job than the pitch implied. Useful for some classification tasks, useless for anything that needs a free-form answer.

**Pattern 3: Verifiable inference (zkML).** The model runs once, off-chain, and produces a zero-knowledge proof of inference (the topic of Lesson 2). The chain verifies the proof. Determinism is preserved because verifying the proof is a deterministic operation, even though the inference itself wasn't *consensus-replicated*. This works in the cases where zkML works (small models, narrow tasks, costs that the use case can absorb). It is the only one of the three patterns where the chain is doing something irreplaceable, and it is also the only one whose costs make most LLM use cases impossible today.

Step back and look at the shape. **The probabilistic-meets-deterministic problem is not a temporary engineering inconvenience. It is a category-defining constraint that determines which AI+crypto products can exist and which cannot.** Anything that wants free-form LLM output to drive on-chain logic is going to live in pattern 1 (centralized) or pattern 2 (constrained to the point that the LLM is barely doing LLM work) or pattern 3 (cryptographically rigorous but expensive and limited to small models). No fourth option is on the horizon, and the people selling you a fourth option are selling you a marketing layer.

There is a related but distinct issue worth calling out. LLMs hallucinate. They produce confident statements about facts that aren't facts. This is also a probabilistic-vs-deterministic failure, but at a higher level: the model can be perfectly reproducible (in pattern 3) and still wrong. Cryptographic verification proves *that the output came from the model*. It does not prove *that the output is true*. People conflate these constantly. A zk-proven LLM hallucination is still a hallucination, with a beautiful proof attached. The chain has not fixed the truth problem. It has only proved provenance of falsehood.

This is why the *good* designs in this space treat the LLM as an advisor, not as a decider. The LLM proposes; some other (deterministic, auditable, or human) layer disposes. You can have an LLM draft a proposal, summarize a state, suggest a parameter — and then have the chain enforce constraints, run deterministic checks, or hand the suggestion to a human signer for final approval. The probabilistic system supplies cognition. The deterministic system supplies integrity. Mixing the two is fine as long as you respect the boundary; getting them confused is where the failures live.

A good rule of thumb: **whenever you see an "AI on chain" pitch, ask "what happens if two nodes get different answers from the model?"** If the answer is "they don't because we constrained the output to a tiny set," you are in pattern 2 — and you should ask whether the LLM is doing useful work given the constraints. If the answer is "we use a single signed oracle," you are in pattern 1 — and the chain is doing nothing the oracle's database can't. If the answer is "we use a zkML proof," you are in pattern 3 — and you should ask what the proof costs and whether the model is small enough for it to be feasible. If the answer is some hand-wave about "consensus mechanisms" or "innovative architecture," that is the marketing layer, and you should walk.

## Concrete example

In 2024, a high-profile project pitched "an autonomous DAO governed by AI" — a DAO whose treasury allocations were decided by an LLM analyzing proposals and on-chain data. The implementation, when finally released, was: an off-chain server, owned by the founders, ran an LLM and posted signed instructions to the DAO's multisig. The "autonomous AI" was a Python script on AWS owned by three people. Every output of the system depended entirely on those three people not tampering with their server. The DAO part of the architecture was real but doing none of the trust-minimization work the pitch claimed.

Apply the framework. This is pattern 1, dressed in pattern 3 marketing. The chain is doing one job — recording the multisig's decisions immutably — and the LLM is doing all the deciding entirely off-chain in a centralized way. There is nothing inherently wrong with that architecture. It would have been fine if it had been described accurately. It was described inaccurately, and a lot of people who funded it believed the inaccurate version. When that gap closed, the project lost most of its credibility.

A better example, in the opposite direction: a 2026 prediction market that uses zkML to verify that a small classifier model resolved each market against the same committed input data. Resolution happens deterministically on-chain because all that's verified is the proof. The model is small enough to be provable, the task (classify a tweet's sentiment, detect whether an event occurred in a video) is narrow enough for a small model, and the value of trust-minimized resolution to traders is high enough to justify the proof cost. This is pattern 3 done honestly. It works because it stays inside the constraints rather than pretending they don't exist.

## Uncomfortable question

If you accept that the probabilistic-deterministic boundary is genuinely load-bearing, then most of the "AI agents running businesses on-chain" thesis collapses to either "centralized AI signing chain transactions" or "tiny constrained models doing toy tasks." Which version of the thesis are you actually willing to defend in public — and if it is the centralized version, what exactly is the chain *for* in your pitch?
