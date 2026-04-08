---
id: 06-real-vs-theatrical-decentralization
title: Real Decentralization vs Theatrical Decentralization
order: 6
estimatedMinutes: 27
learningOutcomes:
  - Define the Nakamoto coefficient and use it to evaluate at least three real chains.
  - Identify the most common forms of decentralization theater (multisig admin keys, validator concentration, governance capture, upgrade keys, single-sequencer L2s).
  - Defend a personal line between honest decentralization and theater.
concepts:
  - nakamoto-coefficient
  - validator-concentration
  - governance-capture
  - upgrade-key
  - admin-multisig
  - liquid-staking
---

## Reading

This is the lesson where I am going to take a position and defend it, and where the temptation to fence-sit is the strongest of any lesson in this course. Almost every chain in existence claims to be decentralized. Most of them are not, in any honest sense of the word, and pretending otherwise is the single most damaging habit in the crypto industry. So let's get specific.

The closest thing to a clean number for measuring decentralization is the **Nakamoto coefficient**, introduced by Balaji Srinivasan in 2017. It is defined as: the minimum number of independent entities you would need to compromise (or get to collude) in order to break some critical property of the system. For Bitcoin's mining, the Nakamoto coefficient is the smallest number of mining pools whose combined hash power exceeds 51%. For Ethereum's validators, it is the smallest number of validator entities (counting liquid staking pools as single entities) whose combined stake exceeds 33% (for liveness) or 67% (for finality). For governance, it is the number of token holders or council members whose vote can determine an outcome.

Higher is better. Higher means that more independent failures or collusions are required to break the system. Lower means more fragile.

Let's apply it to actual chains as of early 2026:

- **Bitcoin (mining)**: around 2–4. Top mining pools have rotated, but the top two or three have consistently hovered near 51% combined. This is the most credible criticism of Bitcoin's security model. Defenders point out that pool members can switch pools if a pool misbehaves, which spreads de facto control more than the headline number suggests. The defense is real but soft.
- **Ethereum (validators)**: single digits for liveness if you count Lido as a single entity, which you should. Lido alone controls a third of staked ETH. **This is the largest unresolved problem in Ethereum's decentralization story** and the community knows it. Efforts to encourage solo staking and decentralized LST alternatives help at the margin and have not solved it.
- **Solana**: high teens to low twenties as of early 2026 — *better* than Ethereum on this specific metric, which surprises people who only know the slogans. Solana has other decentralization issues (validator hardware costs, geographic concentration, network halts coordinated by a small operator group) but pure validator-count concentration is not its worst one.
- **Most "L2" rollups**: **1.** One sequencer, one multisig holding upgrade keys. Centralized today, promised decentralized later, sometimes credibly and sometimes not.
- **Most "appchains" and Cosmos zones**: single digits for validators, often single digits for governance, with governance capture being the most common failure mode.
- **BSC, Tron, and the long tail of high-throughput chains**: a handful of validators chosen by the issuing entity. Low single digits, often with no plausible path higher.

Notice what the numbers tell you. **By the cleanest available metric, only Bitcoin and (with significant caveats) Ethereum and Solana have Nakamoto coefficients high enough to be decentralized in any non-trivial sense.** Almost everything else is *less* decentralized than a typical mid-sized SaaS company, where at least the engineering team is more than six people. The "decentralized" label has become marketing jargon that is applied without measurement, and the absence of measurement is what allows the label to survive.

Beyond the validator-set question, here are the most common forms of decentralization theater. Learn to spot them.

**Admin multisigs.** A 5-of-9 multisig can upgrade the contracts. It is held by employees of the foundation plus a couple of friendly outsiders who never vote no. The protocol is "decentralized" in the sense that no single person can unilaterally upgrade it, and centralized in every sense that matters. Watch for: who holds the keys, how upgrades have actually been triggered, and whether there is a credible path to retiring the multisig.

**Upgrade keys with no sunset.** The system has admin keys "for the early phase, until the protocol is mature," and has had them for four years with no announced removal date. Watch for: any specific commitment to a date or precise condition. Vague "we'll remove them when the time is right" is theater.

**Governance capture.** Token-weighted votes where the team, early VCs, and a couple of whales determine any outcome; quorum is low; voter turnout is in the single-digit percent; proposals never fail. A governance system where proposals never fail is not a governance system.

**Liquid staking concentration.** Even if individual stakers are decentralized, if they all stake through the same protocol, the *protocol* becomes the de facto validator. Watch for: percentage of total stake routed through the largest LST.

**Sequencer centralization on rollups.** Discussed in Lesson 5. Essentially all production rollups in 2026 have a single sequencer or a small permissioned set, with credible plans to decentralize at varying stages. Watch for: a working decentralized sequencer *in production*, not "in the next upgrade."

**Foundation domination.** The "community" is the foundation. The "core developers" are the foundation. The "ecosystem grants" come from the foundation. The chain "decides" things by the foundation announcing them. The most common form of theater and the least called out, because the foundation also funds the conferences where it would be called out.

Here is my line, and I will defend it. **A chain is honestly decentralized if and only if it can survive the unilateral hostile action of any single entity, including the entity that originally built it.** Bitcoin can. Ethereum mostly can — the Lido concentration is a real worry but the protocol has demonstrated independence from any single party, including the Ethereum Foundation, on multiple occasions. Solana can probably survive losing Solana Labs but has not had to prove it. Almost no other chain in production can pass this test. The test is unforgiving on purpose. The whole point of decentralization is to survive parties going hostile, and a chain that has not been stress-tested against that scenario is not decentralized — it is *unstress-tested*, which is a different thing.

The fence-sitting move here is to say "well, it's a spectrum, and decentralization is contextual, and different chains optimize for different things." Each of those statements is technically true and they are also a way of avoiding the actual conclusion, which is that **most of the chains marketing themselves as decentralized in 2026 would fail if their core team turned hostile, and the maximalist Bitcoiners are correct about this even when they are obnoxious about how they say it.** The fact that they are right does not require you to adopt their entire worldview. It does require you to stop pretending that the difference between a chain with a Nakamoto coefficient of 1 and a chain with a Nakamoto coefficient of 20 is just a matter of taste.

## Concrete example

In 2023, a major European exchange was ordered by a US court to freeze certain on-chain addresses related to a sanctions case. The exchange complied for the addresses on chains where they could comply — and on those chains, they could comply *because the chain's validators or sequencer would honor a freeze request*. The list of chains where they could meaningfully enforce the freeze and the list of chains where they could not is, with very few surprises, roughly the list of chains with low Nakamoto coefficients versus high ones. Bitcoin was on the "could not" side. Ethereum mainnet was on the "could not, but Lido and Coinbase staking together could be pressured" side. Most of the "high-throughput" chains were on the "could, by quietly asking the foundation" side. Notice that the question of whether a chain can be censored is not a marketing question. It is a question with an empirical answer that you can check, and the answer rarely matches the marketing.

## Uncomfortable question

Pick the chain you are most personally optimistic about. (If your honest answer is "none," substitute the chain you find the most interesting.) Now: what specific event would have to happen for you to conclude that its decentralization is theater rather than real? Be concrete. "If the sequencer were ever censored" is a starting point but not enough — what is the *threshold*? One transaction? A class of users? A specific government request honored? If you cannot name a falsifiable test, the belief is not knowledge; it is a brand loyalty. The point of this question is not to embarrass you. It is to give you something to actually look for over the next year, so that your opinion can update on evidence rather than vibes.
