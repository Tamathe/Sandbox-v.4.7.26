---
id: 01-fraud-and-the-bezzle
title: Fraud and the Bezzle — Why the Same Scam Keeps Working
order: 1
estimatedMinutes: 25
learningOutcomes:
  - Define Galbraith's "bezzle" and explain why it grows in bull markets.
  - Identify the three structural features that crypto fraud cases share.
  - Explain why "this time is different" is almost always wrong and occasionally right.
concepts:
  - bezzle
  - rehypothecation
  - proof-of-reserves
  - reflexivity
  - counterparty-risk
---

## Reading

In 1955, the economist John Kenneth Galbraith coined a word that turns out to describe almost every crypto blowup of the last decade. The word is **bezzle**. Galbraith's definition: at any given time, there is some quantity of embezzled wealth in the world that the embezzler knows is gone but the victim does not yet know is gone. During that interval — sometimes weeks, sometimes years — *both* parties feel rich. The embezzler has the money. The victim still believes they have it. The total wealth in the system, on paper, is higher than it really is. Galbraith called this paper surplus the bezzle.

The bezzle expands in bull markets because nobody bothers to check. It contracts in bear markets because suddenly everyone checks at once. This is not a crypto-specific phenomenon — Enron, Madoff, Lehman's repo 105, the entire 2008 mortgage stack — but crypto runs the cycle faster and louder, because the underlying technology lets you move billions of dollars in minutes and the regulatory perimeter is full of holes.

Look at the four big ones:

**Mt. Gox** (2014). A Tokyo-based exchange that, at its peak, handled around 70% of global Bitcoin trading volume. It was run by a small team with no security culture, lost ~850,000 BTC over several years to a slow drain, and only collapsed when withdrawals were suspended and the math finally caught up with the marketing. The bezzle was the gap between what users thought was on the exchange and what was actually there. That gap existed for years. Pattern: **custodial concentration + opaque accounting + a price rally that hides the leak**.

**Terra/Luna** (2022). Not a fraud in the criminal sense, but a structural one. The "algorithmic stablecoin" UST held its peg by a reflexive mint-and-burn mechanism with sister token LUNA. The mechanism worked beautifully when LUNA was rising and catastrophically when it wasn't. A 20% yield product called Anchor advertised the peg as risk-free and pulled in roughly $18 billion in deposits. When the peg slipped in May 2022, the unwind was complete in 72 hours and the bezzle — the gap between "your stablecoin is worth a dollar" and "your stablecoin is now worth nothing" — was closed brutally. Pattern: **a yield that was too high to be real, defended by a mechanism nobody had pressure-tested at scale, marketed with the language of safety**.

**Celsius / Voyager / BlockFi** (mid-2022). A wave of "crypto lenders" that offered double-digit yields on deposits and quietly funded those yields by lending the deposits to the same handful of hedge funds (notably Three Arrows Capital). When 3AC blew up, all of them blew up almost in unison, because the asset side of their balance sheets turned out to be the same loan repeated in different clothes. Pattern: **rehypothecation + concentrated counterparty risk + the appearance of diversification**.

**FTX** (November 2022). The biggest, the loudest, and in some ways the dumbest. Customer deposits were sent to a sister hedge fund (Alameda) that traded against them. The accounting was kept on a spreadsheet. The CEO was on every magazine cover and most podcasts. When a leaked balance sheet showed Alameda's "assets" were mostly the exchange's own token, the bezzle closed in five days. Pattern: **commingled customer funds + a charismatic founder + a regulatory environment that rewarded marketing over audit**.

These four cases look very different on the surface and are structurally identical underneath. The structural features are the three I have been pointing at:

1. **Custody you cannot independently verify.** If you can't check the reserves yourself, you are trusting a promise. Promises break.
2. **A yield that exceeds the risk-free rate by a margin that nobody can explain in one sentence.** "Where does the yield come from?" is the only question that matters. If the answer is hand-wavy, the answer is "from the next deposit."
3. **A reflexive feedback loop between the price of an asset and the solvency of the entity holding it.** When the asset is also the collateral, a price drop is not just bad news — it is the whole story.

The Bitcoin community has a partial answer to this, called **proof-of-reserves**. The idea is to use the cryptographic properties of Bitcoin itself to publicly attest to the assets a custodian holds, on-chain, in a way users can verify. It is a real improvement. It is not a complete solution, because proof-of-reserves doesn't tell you about *liabilities*, and an exchange with $10B in verifiable assets and $12B in undisclosed liabilities is still insolvent. The honest version of proof-of-reserves is **proof-of-solvency**, which is much harder and which almost no one has actually implemented well.

A note on "this time is different." That phrase is famously a warning sign. But it is occasionally true. The difference between a wise skeptic and a permabear is the willingness to ask, *what specifically would have to be different for this not to be the same scam?* If you can't articulate what would make a new instance different from Mt. Gox, you should assume it's Mt. Gox.

## Concrete example

In late 2022, a few weeks after FTX collapsed, a major exchange released a "proof-of-reserves" attestation showing on-chain holdings of customer assets. The attestation was technically real. It was also marketed as proof the exchange was solvent. It was not — it said nothing about liabilities, about whether the same coins had been pledged elsewhere, or about loans the parent company had taken against those reserves. Several smart people pointed this out at the time and were dismissed as cranks. None of those exchanges have collapsed since (as of April 2026), but the point is not that they will. The point is that the marketing language and the technical attestation were doing two different jobs and most readers couldn't tell the difference.

## Uncomfortable question

Pick the platform you currently hold the most crypto on (or, if you don't hold crypto, the platform you hold the most uninvested cash on — a brokerage, a bank, a fintech app). Write down, in one sentence each: (a) where the assets are actually held, (b) what the platform is doing with them while you're not using them, and (c) what would need to be true for the platform to be insolvent and you not to know yet. If you can't answer all three, you are inside the bezzle right now. That doesn't mean it will close on you — most bezzles never close on any individual depositor. But the discomfort of not being able to answer the question is the entire point of asking it.
