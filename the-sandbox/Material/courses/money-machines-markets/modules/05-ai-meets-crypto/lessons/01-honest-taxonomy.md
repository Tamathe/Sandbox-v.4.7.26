---
id: 01-honest-taxonomy
title: An Honest Taxonomy of "AI + Crypto"
order: 1
estimatedMinutes: 25
learningOutcomes:
  - Distinguish AI-on-chain, chain-for-AI, and the marketing layer that pretends to be either.
  - Apply a single test ("does removing the chain break the product?") to any AI+crypto pitch.
  - Name the two or three categories in this space that are actually interesting and say why.
concepts:
  - ai-on-chain
  - chain-for-ai
  - marketing-layer
  - does-it-need-a-blockchain
  - tokenized-incentive
---

## Reading

Let me say this up front, because the rest of the module depends on you trusting that I am not selling you anything: **the intersection of AI and crypto is the single most overhyped corner of technology in 2026.** More than the metaverse was. More than Web3 was at its peak. The amount of money that has been raised, the number of conferences, the volume of LinkedIn posts that begin with "AI x Crypto is the future" — none of it is proportional to the number of working products that genuinely combine the two in a way that couldn't be done with one of them alone and a normal database.

This module is going to spend most of its time telling you why. But it would be intellectually dishonest to spend a whole module dunking, so we are also going to find the one or two threads that are genuinely interesting, and explain *why* they are interesting in terms you can defend.

To do any of that, we need a vocabulary that the marketing layer doesn't have. Almost every "AI + crypto" pitch you will encounter actually falls into one of three buckets, and the first job is to learn to sort them.

**Bucket 1: AI-on-chain.** The AI model itself, or its inference, or its training data, or its outputs, are anchored to a blockchain in some load-bearing way. Examples: zero-knowledge proofs of inference (we'll spend a whole lesson on these), on-chain model registries with cryptographic hashes, token-curated training data marketplaces. This bucket is small. Most of what claims to be in it isn't — it's a model running on a normal server with a token glued to the side.

**Bucket 2: Chain-for-AI.** The chain provides infrastructure that AI systems use, but the AI itself is normal off-chain software. Examples: decentralized GPU markets where the rental contract and payment are on-chain but the actual training happens on someone's H100 cluster in Iceland, agent wallets where an autonomous agent holds and spends crypto, provenance systems where content is signed on-chain but generated off-chain. This bucket is bigger and contains most of the genuinely interesting work.

**Bucket 3: The marketing layer.** A normal AI product, a normal token, no real interaction between them. The token "powers" something or "incentivizes" something, but if you removed the token nothing about the product would change except the founders' net worth. This bucket is by far the largest, and it is where almost all the venture money has gone. It is also the bucket that has poisoned the well for the first two.

A simple test cuts through almost every pitch: **if you removed the blockchain entirely and replaced it with a Postgres database operated by the company itself, would the product still work?** If yes, you are in bucket 3. If no — and you have to be honest with yourself about *why* not — then we can have a real conversation about whether you are in bucket 1 or bucket 2.

Notice the test does not ask "would the product be *worse*?" Lots of things are mildly worse without a blockchain. The test asks whether the product *breaks*, in the sense that it becomes incoherent or impossible. A token-incentivized image-generation marketplace is mildly worse without the token (the bagholders are sad). An onchain proof that a particular model produced a particular output, verifiable by anyone, is *impossible* without something blockchain-shaped underneath. That gap is the difference between an interesting category and a fundraising vehicle.

Two more concepts before we leave the taxonomy.

A **tokenized incentive** is a coordination mechanism in which contributors to some shared resource (compute, data, labels, content) are rewarded with a token whose value is supposed to scale with the usefulness of the resource. The theory is good and the theory is well-known and the theory has been tried and the theory has, so far, mostly failed. We will look at why in the decentralized compute lesson. The short version: token incentives reliably attract supply and unreliably attract demand, and the demand side is the one that decides whether you have a market or a subsidy program.

A **trust-minimized verification** is a technical mechanism (a proof, a signature, a consensus result) that lets one party check a claim made by another party without trusting them. This is the actually-interesting primitive that crypto brings to AI, and almost every threat in this module that is genuinely worth taking seriously is some version of: AI systems make claims that are hard to verify, and crypto offers verification machinery, and the question is whether the verification machinery is cheap enough, fast enough, and useful enough to matter for the specific claim in question.

So here is the bottom line you can keep in your head for the rest of the module: most of "AI + crypto" is bucket 3. Inside bucket 1 and bucket 2, the only categories that survive contact with hard questions are the ones where the chain is doing something *you cannot do another way* — usually some flavor of trust-minimized verification, sometimes some flavor of permissionless coordination. Everything else is a marketing exercise. The next five lessons walk through the categories and apply the test honestly.

## Concrete example

In 2024, a much-hyped project raised $200M for "decentralized AI training." The pitch deck described a global network of GPUs collaborating on frontier model training, coordinated by a token. Two years later they had trained one notable model — at a cost-per-FLOP roughly 4x higher than the equivalent run on AWS, using mostly the founders' own GPUs. The token was trading at 6% of its launch price.

Apply the test. Does removing the chain break the product? No. They could have run the same training on a normal cluster, billed normally, and shipped the model six months earlier. The chain wasn't doing technical work, it was doing fundraising work. That's not a moral judgment — fundraising is a real activity — but it is the difference between bucket 2 and bucket 3, and the people who funded it were not told which bucket they were in.

Compare this to a much smaller, much less hyped project from the same era: a system that lets you cryptographically prove that a specific AI model produced a specific output, so that downstream users can verify the model's identity without trusting the API provider. That project doesn't make any claims about decentralizing training. It just uses a chain (and zero-knowledge proofs) to do something you literally cannot do with a normal database: produce a public, verifiable, tamper-proof claim. We'll look at it in detail in Lesson 2. It has raised one-tenth the money and has ten times the technical interest.

## Uncomfortable question

If you have ever evaluated, invested in, recommended, or built an "AI + crypto" product — apply the test now, in your head, to that specific product. Did it pass? Did it fail? And if it failed, were you the one who told the people involved, or did you nod along? The answer doesn't reflect badly on you — almost everyone in the space has at least one of these in their history. But knowing the honest answer is the prerequisite for being able to evaluate the next pitch you see, and the next one will arrive this week.
