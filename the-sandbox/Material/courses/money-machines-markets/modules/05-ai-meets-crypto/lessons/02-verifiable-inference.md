---
id: 02-verifiable-inference
title: Verifiable Inference — What zkML Actually Proves
order: 2
estimatedMinutes: 30
learningOutcomes:
  - State precisely what a zero-knowledge proof of inference proves and what it does not.
  - Explain the cost structure of zkML and why it is currently impractical for frontier models.
  - Identify the narrow categories where verifiable inference is genuinely useful today.
concepts:
  - zkml
  - verifiable-inference
  - model-identity
  - prover-overhead
  - oracle-problem
---

## Reading

This is the lesson where we find one of the genuinely interesting threads in the AI+crypto intersection. So I am going to give it the careful treatment it deserves, including the parts that the proponents would rather you skipped.

**Zero-knowledge machine learning, or zkML, is a family of techniques for producing a cryptographic proof that "model M, with weights W, when run on input X, produced output Y" — without revealing W or X if you don't want to.** The proof is compact and can be verified by anyone, including a smart contract on a blockchain, in milliseconds. The training of zkML proof systems takes minutes to days and millions of arithmetic operations to produce a single proof. That asymmetry — expensive to prove, cheap to verify — is what makes the whole thing work, and it is also where most of the practical problems live.

Before going further, let's be precise about what a zkML proof actually claims. It claims, mathematically: *I know weights W such that, when I evaluated them on input X under the standard arithmetic of the computation graph, the result was Y.* It does **not** claim:

- That W is the model the API provider says it is. (You need a separate commitment to the weights for that — usually a hash published on-chain at some earlier moment.)
- That W is a "good" model, or a recent model, or trained on the data the provider claims. (Provenance of training is a separate problem that no proof system solves.)
- That the input X is the input the user actually provided. (You need a signed commitment from the user, or some other binding.)
- That the *inference* is meaningful in any human sense. The proof is about arithmetic, not about meaning.

Almost every piece of confused writing about zkML conflates the math claim ("this output came from this computation") with the human claim ("this answer is true / unbiased / from the model I think"). Don't make that mistake. The math claim is what zkML gives you. The human claims have to be assembled from it, plus other commitments, plus some social trust about the assembly.

Now the costs.

Producing a zkML proof of inference for even a small model — say a 7-billion-parameter LLM doing a single forward pass — currently costs somewhere between 10,000x and 1,000,000x more compute than the inference itself, depending on the proof system, the precision, and how much of the model graph you can fit into the proving circuit. For a frontier model (a few hundred billion parameters), the cost is currently astronomical. There are clever techniques — proving only specific layers, using approximations, batching proofs across many inferences — and the numbers are improving roughly an order of magnitude every couple of years. They have a lot of orders of magnitude to go.

This means that, in 2026, **zkML is not a way to verify ChatGPT.** It is a way to verify small classifiers, tiny LLMs, narrow decision models, and the *outputs* of larger models when wrapped in some additional commitment scheme. It is also a way to keep a roadmap honest — you can prove that a specific committed model, run on a specific committed input, produced a specific output, and you can do this for a stripped-down version of your real model and use it as a check on your own honesty. None of this is nothing. But it is also not "AI you can trust." It is "cryptographic accountability for a specific arithmetic claim, at a cost that limits how much of your stack it can cover."

So what is zkML actually good for in 2026?

**1. Model identity attestation.** A user wants to know they are talking to GPT-5 and not a cheaper model the provider silently swapped in to save money. zkML (combined with a commitment to the weights) can give them a verifiable answer. This is a real problem. The current "trust the API endpoint" model has no answer to it.

**2. Sensitive-data inference where the data must stay private.** A hospital wants to run a diagnostic model on a patient's data without revealing the data to the model owner, and wants the model owner to be able to prove the inference happened correctly. zkML gives both parties what they need. This is a real category, currently small, growing.

**3. Onchain ML oracles.** A smart contract needs the output of a machine learning model — say, for an insurance payout, a credit decision, or a prediction market resolution. Without verifiable inference, the contract has to trust an oracle. With zkML, the oracle can produce a proof and the contract can verify it without trusting the oracle. This is where the chain is doing real work that nothing else can do, and it is the reason this category exists at all.

**4. Adversarial settings where someone is being asked to trust an opponent.** Game tournaments where players run AI strategies and need to prove they followed the rules. Moderation pipelines where a platform claims a piece of content was scored by a specific model with specific thresholds. These are niche but real.

What zkML is not good for, no matter what the pitch deck says: making frontier LLMs "trustworthy" in any deep sense, replacing human oversight, removing the need for governance of model providers, or making AI safe in the alignment sense. The proof is about arithmetic. Arithmetic is not where the safety problems live.

There is also a deeper philosophical issue worth naming. A zkML proof tells you the computation was performed correctly. It does not tell you the computation was the *right* computation. If the model is biased, the proof will faithfully prove the biased output. If the input is misleading, the proof will faithfully prove the output for that input. zkML pushes the trust boundary back one step — from "trust the inference happened" to "trust the model is what it claims to be" — but it does not eliminate trust. It just relocates it. That relocation is genuinely valuable in the contexts above. It is not, and was never going to be, magic.

## Concrete example

In 2025, a small team built a working demo of an onchain insurance product for crop yields, where the payout was determined by a satellite-imagery ML model. The pitch was: instead of trusting an oracle company to run the model honestly, the model's inference was committed to the chain via a zkML proof, and any farmer could independently verify that the model run on their parcel's imagery produced the score that triggered (or didn't trigger) their payout.

The model was tiny — a few million parameters — because that was what the proof system could handle in a reasonable time. The proof generation took about 40 seconds per parcel and cost about $0.30 in compute. The verification on-chain cost about $0.05 in gas. For a $5,000 insurance payout, those numbers are fine.

Notice what makes this work: (a) the model is small enough to prove, (b) the trust problem is real because farmers and insurance companies have incentives to disagree, (c) the chain is doing something irreplaceable — providing public, verifiable settlement that neither party can repudiate. All three conditions have to hold. Take away any one and you are back in bucket 3. This product is in bucket 1 and it is one of the cleanest examples of what bucket 1 actually looks like when it is real.

## Uncomfortable question

zkML is technically beautiful and mathematically rigorous. It is also currently used by approximately nobody for anything that affects your life. If the technology gets one more order of magnitude cheaper every two years, and frontier models also get one more order of magnitude bigger every two years, when — if ever — does the curve cross? And if it never does, does that change your view of how much of the AI+crypto investment thesis depends on a curve that is moving but losing the race?
