---
id: 04-stablecoins
title: Stablecoins — The Most Economically Significant Crypto Asset, Compared Honestly
order: 4
estimatedMinutes: 26
learningOutcomes:
  - Explain why stablecoins, not Bitcoin or ETH, are the largest source of real economic activity in crypto.
  - Compare USDT, USDC, and DAI on backing, transparency, censorship surface, and failure modes.
  - State a defensible position on which stablecoin model is most likely to dominate over the next decade and why.
concepts:
  - stablecoin
  - fiat-backed
  - crypto-collateralized
  - peg-mechanism
  - censorship-surface
  - depeg
---

## Reading

If you grade crypto's economic significance by *transactions that look like real economic activity instead of speculation*, the largest category by a wide margin is not Bitcoin and not ETH. It is **stablecoins**. As of early 2026, the total stablecoin supply is approximately $230 billion, annual settlement volume is in the tens of trillions of dollars, and stablecoins now move more value across borders annually than several mid-sized national payment networks combined. Whatever you think of crypto, the stablecoin chunk of it is no longer a side experiment. It is infrastructure used by millions of people who have never read a Bitcoin white paper and never will.

A stablecoin is a token issued on a blockchain that is designed to trade at a constant ratio to some external reference, almost always one US dollar. The stability mechanism varies — and the variation is the entire game. The big three categories are **fiat-backed** (someone holds a dollar in a bank for every token they issue, you trust them not to lie), **crypto-collateralized** (the token is backed by a basket of on-chain crypto worth more than the issued tokens, with a liquidation mechanism that defends the peg), and **algorithmic** (the protocol uses some mint/burn loop to maintain the peg with no real backing). The algorithmic category has a near-perfect track record of failure — Terra/Luna in 2022 was the famous case, but it was not the first and not the last. Treat algorithmic stablecoins as a museum piece; the interesting comparison is between fiat-backed and crypto-collateralized, with USDT, USDC, and DAI as the canonical examples.

**USDT (Tether).** The oldest, the largest, the most controversial. As of early 2026, Tether is roughly $150B+ in circulation, and Tether the company is, by some measures, one of the most profitable per-employee businesses in the world — they hold their reserves in short-term US Treasuries and other interest-bearing instruments and pocket the yield. For years the company refused a real audit, gave evolving and contradictory accounts of what backed the tokens, and was the subject of recurring rumors that they were undercollateralized. Those rumors have not gone away entirely, but Tether has now survived enough stress events (the 2022 contagion, the 2023 banking wobble, multiple bank runs against the peg) without breaking that the *empirical* case for it has gotten stronger even as the *philosophical* case remains weak. USDT is dominant in emerging markets — Argentina, Turkey, Nigeria, Vietnam, much of Southeast Asia — where it functions as a digital dollar that is easier to access than an actual US bank account. The honest framing: USDT is opaque, backed by something that is *probably* sufficient, and is doing real work for real people who do not have better options.

**USDC (Circle).** The "regulated" counterpart. Issued by Circle, a US company, with monthly attestations from a major accounting firm, holdings in cash and short-term Treasuries, and a clear line of accountability to US regulators. For most of its life, USDC was the stablecoin you could feel good about recommending to a sophisticated audience — until March 2023, when about 8% of Circle's reserves got temporarily stuck in Silicon Valley Bank and USDC briefly depegged to about 88 cents. The peg recovered within a few days when the FDIC made depositors whole, but the episode was clarifying. The regulated, transparent, US-banked stablecoin turned out to be *exposed to the failure of the US banking system* in a way that the opaque offshore stablecoin was not. The lesson is uncomfortable for everyone. The compliance story is real and valuable. It is also not the same as the stability story. **The most legible stablecoin took the worst depeg of any major stablecoin in 2023, and it took it for the most boring possible reason.**

**DAI (MakerDAO/Sky).** The crypto-collateralized purist. DAI is minted by users locking up collateral (originally just ETH, now a basket including other crypto and some real-world assets) into vaults, and the protocol maintains the dollar peg through a mix of interest-rate adjustments, liquidation mechanisms, and stability fees. DAI is the most decentralized stablecoin, in the sense that no single entity can freeze your tokens or seize your collateral by fiat. It is also, *increasingly*, not what it once was — over the years MakerDAO/Sky has added more and more real-world-asset backing (including, ironically, USDC and US Treasuries) to keep the peg stable as it scaled. A DAI in 2026 is something like 40-60% backed by off-chain assets, depending on how you count. The pure crypto-collateralized vision has been compromised in practice by the fact that crypto collateral is volatile and the peg is not. This is not a scandal; it is an engineering reality. But it does mean that the honest version of DAI is "a stablecoin that *was* fully on-chain and is now meaningfully exposed to the same off-chain banking system as USDC, just with more layers of indirection."

So what's the honest comparison?

| | USDT | USDC | DAI |
|---|---|---|---|
| Backing | Mostly Treasuries; opaque | Cash + Treasuries; transparent | Mixed crypto + RWAs; on-chain visible |
| Censorship surface | Tether can freeze | Circle can freeze (and has, repeatedly) | Sky can vote, slow, hard to freeze individual addresses |
| Worst historical depeg | ~3% (2022) | ~12% (2023) | ~3% (2020) |
| Regulatory exposure | Offshore, contested | US, fully exposed | DAO, contested |
| Where it's dominant | Emerging markets, crypto-native trading | US institutional, regulated DeFi | DeFi-native, ideologically motivated users |

Notice the pattern. **There is no "best" stablecoin without first specifying what you are optimizing for.** If you are an Argentine sending dollars to your sister in Spain, you almost certainly want USDT, because it is the one that actually works in the corridors you need. If you are a US fintech building on a regulated stack, you want USDC, because Circle's compliance posture is exactly what your auditors want. If you are a DeFi-native user who wants minimum censorship surface and is willing to pay for it in slightly more friction, you want DAI. None of these is the "right" answer. They are answers to different questions.

The deepest point about stablecoins, the one that should reorganize how you think about crypto, is this: **stablecoins are the use case that won.** They are the part of the crypto stack that is being used by people who don't care about crypto, for purposes that aren't speculation, in volumes that match real payment networks. They achieve this by being, technically, fiat in a costume — most of the asset is just a tokenized claim on a US Treasury bill. The Bitcoin maximalists are correct that this is "not the revolution you were promised." They are wrong that this means it is unimportant. The revolution that happened is not the one anybody bet on, and it's the one that's actually moving money for actual people. The point of being honest about this is that it tells you where to look for the *next* unexpected use case — and it should make you suspicious of every white paper that promises to be the revolution without first explaining what humble useful thing it does for users who don't already believe.

## Concrete example

In Turkey in 2024, the lira lost roughly 35% of its dollar value in twelve months. Turkish citizens, legally restricted from holding foreign currency in many contexts, nevertheless moved tens of billions of dollars into stablecoins, mostly USDT, mostly held in Binance and local exchange wallets. These were not crypto enthusiasts. They were ordinary people preserving their savings using whatever tool was easiest to access. The Turkish central bank could see this happening, did not approve, and could do almost nothing to stop it without cutting off internet access to the relevant exchanges. Now ask: in that moment, in that country, which stablecoin was most useful? The answer is USDT, and it is not close. Which stablecoin had the cleanest compliance story? USDC. Which one had the lowest exposure to off-chain failure? DAI. The "best" answer depends entirely on whose problem you are trying to solve, and a Turkish saver in 2024 had a very different problem than a US compliance officer.

## Uncomfortable question

If stablecoins are mostly tokenized Treasury bills, and tokenized Treasury bills are the largest "real" use case in crypto, then crypto's biggest economic contribution to date is *making the dollar more usable internationally*. Is that a good outcome from a Bitcoin maximalist perspective, a bad one, or both? Specifically: does the global expansion of dollar-pegged stablecoins delay the world's migration to harder money, or accelerate it by giving people the *experience* of holding programmable money for the first time? Answer in two or three sentences. If your answer is "it depends," say what it depends on.
