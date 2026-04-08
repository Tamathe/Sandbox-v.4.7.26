---
id: 05-rollups-and-modularity
title: Rollups and Modularity, in Plain Language
order: 5
estimatedMinutes: 25
learningOutcomes:
  - Explain what a rollup is and the difference between optimistic and ZK rollups, without resorting to slogans.
  - Define data availability and explain why it is the load-bearing concept of the modular thesis.
  - State a defensible position on whether the modular stack actually delivers on its scalability and decentralization claims as of 2026.
concepts:
  - rollup
  - optimistic-rollup
  - zk-rollup
  - data-availability
  - modular-thesis
  - sequencer
---

## Reading

If you spent the early 2020s reading Ethereum research, you would have seen a phrase repeated until it became liturgy: **rollup-centric roadmap**. The idea was that Ethereum mainnet was never going to scale to the throughput a real global computation system needs, and that the right move was not to make mainnet faster, but to push almost all execution onto a *layer above* mainnet, while letting mainnet keep doing the one thing it was good at (final settlement and dispute resolution). That layer became known as **layer 2**, or **L2**, or **rollups**, depending on which paper you read.

A **rollup** is, in the simplest framing, a separate chain that batches up many transactions, executes them off the main chain, and then *posts a compressed summary plus a proof of correctness back to the main chain*. The main chain doesn't re-execute the transactions; it just verifies the proof and trusts the result. Because verifying a proof is much cheaper than re-executing thousands of transactions, the main chain can effectively secure orders of magnitude more activity than it could if everything happened on it directly.

There are two flavors of rollup, and the difference matters more than people pretend.

**Optimistic rollups** (Arbitrum, Optimism, Base) post the batched transactions to the main chain and assume by default that the execution was correct. Anyone can challenge the result during a "fraud window" — typically about a week — by submitting a fraud proof showing that the rollup operator computed the wrong state. If a fraud proof succeeds, the rollup state is rolled back. In practice, fraud proofs are rarely submitted, because cheating is detectable and the operators don't want to lose their bond. The cost of this design is that withdrawing from an optimistic rollup back to L1 takes about a week (you have to wait for the fraud window to close), unless you use a third-party "fast bridge" that fronts you the funds in exchange for a fee. The simplicity is the appeal: you don't need any fancy cryptography.

**ZK rollups** (zkSync, Starknet, Polygon zkEVM, Linea, Scroll) post the batched transactions to the main chain *along with a cryptographic proof* — a zero-knowledge proof — that the execution was correct. The main chain verifies the proof and accepts the new state immediately. There is no fraud window. Withdrawals can be near-instant. The cost is that generating these proofs is computationally expensive (though it has gotten much cheaper) and that the underlying cryptography is harder to audit and reason about than a fraud proof. The longer-term bet is that ZK rollups dominate, because the trust and UX properties are strictly better; the shorter-term reality is that optimistic rollups have more total value secured in 2026 because they shipped first and the engineering is easier.

Both designs solve a piece of the scaling problem. Neither solves all of it. The rest of it lives in **data availability**, and this is the load-bearing idea of the modular thesis.

Here is the problem. For a rollup to be secure, the data it posts to the main chain has to be *available* — anyone has to be able to download it and verify the rollup's state for themselves. If the data is unavailable, the rollup can in principle finalize a state that nobody can check. This is why rollups post the full transaction data, not just a hash, to L1. But posting all that data to Ethereum mainnet is *expensive*, and historically it was the largest single cost of running a rollup. The Ethereum team's solution was a series of upgrades (EIP-4844 in 2024, full danksharding still rolling out) that introduced a cheaper data-availability lane called **blobs** — data that is verifiably published but is not stored on Ethereum forever. Blobs reduced rollup costs by roughly an order of magnitude almost overnight.

The further question is: **does data availability have to live on Ethereum at all?** This is where the **modular thesis** kicks in. The thesis is that a blockchain has four jobs — execution (running the transactions), settlement (resolving disputes and finalizing state), consensus (agreeing on the order of things), and data availability (publishing the data so anyone can check) — and that these jobs do not all have to live in the same chain. A "modular" stack pulls them apart. You might run execution on Optimism, settle to Ethereum, take consensus from Ethereum's validator set, and post data to Celestia or EigenDA. Each layer specializes in one job and is replaceable.

The modular thesis is *intellectually* compelling and *practically* messier than its proponents admit. The intellectually compelling part: separating concerns is what good systems engineering looks like, and the trade-offs between throughput, security, and cost are real and force you to make choices the monolithic chains hide. The messy part: every additional layer is an additional trust assumption, an additional bridge that can be hacked, and an additional governance process that can be captured. **A user transacting on a rollup that uses an external DA layer is now trusting (at minimum): the rollup's sequencer not to censor them, the rollup's prover not to fail, the DA layer's validators not to go offline, the bridge between the DA layer and the settlement chain, the settlement chain's validators, and the upgrade keys on each contract along the way.** Each of those assumptions is independently defensible. The product of all of them is not obviously better than just running on a slower but more integrated system.

There is also the **monolithic counter-argument**, which is worth steel-manning. The monolithic side (think Solana, sometimes Bitcoin, in different ways) says: if you build a single chain that does all four jobs together and you optimize it hard, you get lower latency, lower fees, and a single trust assumption that users can actually understand. You give up the ability to independently upgrade each layer, but you gain composability — every application on the chain can interact with every other application atomically, with no bridges. The practical record of the monolithic approach is mixed (Solana has shipped a lot of throughput and also a lot of network halts), but the design philosophy is not silly. It is a real alternative, and the modular crowd's tendency to dismiss it as "obviously wrong" is itself a sign that they have not fully thought through the trade-off.

So where does that leave us? Here is my honest read of 2026:

1. **Rollups work.** This was an open question in 2021 and is no longer. Hundreds of billions of dollars now move through Arbitrum, Base, Optimism, and the various ZK rollups daily, with no catastrophic failures attributable to the rollup design itself. The technology shipped.
2. **Most rollups are still training wheels.** Almost every production rollup, optimistic or ZK, has admin keys that can upgrade the contracts unilaterally, escape hatches that depend on a single sequencer's continued operation, and bridges whose security is somewhere between "trust the multisig" and "trust the prover and also the multisig." The marketing language ("we're an L2 secured by Ethereum") is true *in the limit* and misleading *in the present*. We will return to this in Lesson 6, because the gap between marketing and implementation is the central question of this module.
3. **The modular thesis is correct in principle and unproven in practice.** The first generation of modular stacks is *more* fragile than the equivalent monolithic systems, not less, because the integration work is hard and the trust assumptions multiply. Whether the second generation is genuinely more robust is an empirical question we will not know the answer to for several more years.
4. **Throughput is no longer the main problem.** It was the main problem in 2020. It is approximately solved in 2026. The new main problems are bridge security, sequencer decentralization, and the upgrade-key question.

## Concrete example

In early 2024, the rollup Linea suffered an incident where its sequencer was paused for several hours after a contract on the rollup was attacked. The pause was *correct* — it stopped the attacker from withdrawing — and the funds were eventually returned, which is the kind of outcome you would want. But the *mechanism* was that a small number of trusted operators with admin access made a coordinated decision to halt the network. That is not the "trust-minimized layer secured by Ethereum" that the marketing implied. It is "trust-minimized in principle, secured by a multisig in practice, and the multisig's behavior happened to be reasonable this time." Notice that *the outcome was good and the trust model was not what was advertised*. Both of those facts are interesting, and missing either one of them is a way of being wrong about the system.

## Uncomfortable question

If a rollup has a multisig that can upgrade its contracts and a centralized sequencer that can refuse to include your transaction, in what sense is it a layer-2 of Ethereum rather than a startup company that happens to post a hash to Ethereum every few minutes? Try to answer without using the word "trustless." If your answer ends up being "in the sense that it could become more decentralized over time," explain what would actually have to happen for that "could" to become "did," and how you would tell from the outside.
