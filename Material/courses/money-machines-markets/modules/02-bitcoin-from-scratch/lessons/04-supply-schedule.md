---
id: 04-supply-schedule
title: 21 Million, Halvings, and What They Actually Change
order: 4
estimatedMinutes: 26
learningOutcomes:
  - State the Bitcoin supply schedule precisely and explain how the 21 million cap arises from the issuance formula.
  - Explain what a halving is, what it changes mechanically, and what it doesn't change directly.
  - Articulate the long-run security budget problem and why it is genuinely unresolved.
concepts:
  - supply-cap
  - halving
  - issuance-curve
  - security-budget
  - block-subsidy
  - transaction-fees
---

## Reading

Bitcoin's most distinctive monetary property is its supply schedule. Every Bitcoiner can recite "21 million" as a slogan. Far fewer can explain *where the number comes from*, *what changes when a halving happens*, and *what doesn't*. Let's pin all three down.

The supply schedule is not "21 million coins" written in the code. There is no line that says `MAX_SUPPLY = 21_000_000`. The cap is an *emergent* property of the issuance rule. The rule is:

- The first transaction in every block is a special "coinbase" transaction that pays the miner a block subsidy.
- The block subsidy started at 50 BTC per block in 2009.
- Every 210,000 blocks (roughly four years at the ten-minute target), the subsidy is cut in half. This event is called a **halving**.
- Block 0 (genesis) through block 209,999: 50 BTC per block. Block 210,000 through 419,999: 25 BTC per block. Then 12.5, then 6.25, then 3.125 (the current era after the April 2024 halving), then 1.5625 after the next halving in 2028, and so on.
- This geometric series sums to 21,000,000. (To be precise: it sums to *very slightly less* than 21 million, because of an integer-truncation quirk in the original code. The real cap is around 20,999,999.97 BTC. Nobody has ever bothered to fix it.)

The schedule will run for about 130 years total. By the late 2030s, more than 99% of all bitcoin that will ever exist will already exist. Issuance becomes vanishingly small even though it never quite reaches zero (in mathematical theory; in practice, the smallest unit is 1 satoshi = 0.00000001 BTC, and once the subsidy falls below 1 satoshi the issuance is just zero).

This is the mechanical fact. Now: what does a halving actually *change*?

**It cuts the rate at which new bitcoin enters circulation.** That is the *only* thing it changes directly. It does not change the total supply. It does not change anyone's balance. It does not change the difficulty. It does not change transaction processing. It is a single line of code that takes effect at a single block height, and it cuts the miner's reward by 50%.

**Indirectly**, though, several things happen, and this is where it gets interesting and contested.

*Mining economics get squeezed.* If a miner was profitable at the old subsidy, they may become unprofitable at the new one, especially if the price of bitcoin doesn't rise to compensate. The least efficient miners are forced to shut down. This has been observed at every halving so far.

*Hash rate temporarily drops.* As marginal miners turn off their machines, the network's total hash power dips. This causes blocks to come in slower than ten minutes for a few days, until the difficulty adjustment kicks in and lowers the difficulty enough for the remaining miners to maintain the schedule. Within a few weeks, the system is back to ten-minute block times. The dip is real but self-correcting.

*The narrative around "stock-to-flow" gets a refresh.* This is the sociological effect, not a technical one. Bitcoin's stock-to-flow ratio doubles every halving, and this is the basis of a popular (and partially debunked) price model. Whether you believe the model or not, the halving is a Schelling point that focuses attention and sometimes correlates with price action. Whether *halving causes price action* or *price action correlates with halving for unrelated reasons* is genuinely unresolved.

What a halving does *not* do, despite what you'll read on Bitcoin Twitter:

- It does not "burn" any coins. No supply is destroyed. The supply just grows more slowly from that point onward.
- It does not, by itself, raise the price of bitcoin. If the demand curve is unchanged, halving the rate of new supply will, *in equilibrium*, push the price up — but markets are forward-looking and the halving is known years in advance. By the efficient-markets argument, it should already be priced in. By the "markets are not efficient about reflexive narratives" counter-argument, maybe not. Reasonable people disagree.
- It does not change anyone's existing holdings. Your bitcoin is the same number of bitcoin before and after.

Now: the genuinely hard problem the halving schedule creates. It is called the **security budget problem**, and it is one of the few open questions about Bitcoin where the maximalist camp does not have a confident answer.

Recall from Lesson 2: Bitcoin's security comes from miners spending real resources to win block rewards. The reward is currently composed of two parts: the block subsidy (currently 3.125 BTC per block, falling to 1.5625 in 2028) and transaction fees. Today, the subsidy dwarfs the fees in normal periods — fees might be 1–5% of total miner revenue. As the subsidy halves every four years, the fee component must grow proportionally just to keep total miner revenue constant *in BTC terms*. And total revenue in BTC terms determines hash rate, and hash rate determines security.

So either:

(a) the price of bitcoin must roughly double every four years forever, to keep the BTC-denominated subsidy stable in dollar terms, *or*
(b) transaction fees must rise sharply as a share of miner revenue, *or*
(c) the network's security budget will shrink relative to the value it secures, *or*
(d) some combination.

Path (a) cannot continue indefinitely. Path (b) requires fees to rise to a level that makes ordinary on-chain transactions expensive — which is part of what motivates Lightning, the topic of the next lesson. Path (c) is the failure mode: a Bitcoin that is worth a lot but is no longer expensive to attack.

The honest answer is that nobody knows which path the system will end up on. Most Bitcoiners believe path (b) will work — that as the network matures into a settlement layer for high-value transactions, fees will scale with that value and miners will be paid plenty. This is plausible. It has not been demonstrated. We are currently in the era where the subsidy is large enough that the question is theoretical. By the 2030s and 2040s the question will become practical, and the system has never operated in a "fee-dominant" regime for any extended period. This is not a reason to dismiss Bitcoin. It is a reason to know exactly which open problem the system is carrying with it. Too much of the rhetoric around "21 million is sacred" elides the fact that 21 million is also "the security budget runs down to nothing." The two are the same fact, told in different tones.

A separate point worth flagging because it is contested: the supply cap is enforced by *social consensus* among Bitcoin nodes, not by physics. If a future version of the Bitcoin client tried to raise the cap to 22 million, every node operator would have to either run that new version or stay on the old one, and the network would split. The historical answer to "can the cap be raised?" is "no, because the community would reject it and fork off." This answer is correct *as long as the community remains coordinated around the 21 million number*. The number is a Schelling point, and Schelling points are extraordinarily stable when everyone believes them — but they are not enforced by anything outside the social agreement. Most Bitcoiners find this scary to acknowledge and prefer to talk as if the cap is a law of nature. It is not. It is a very strongly enforced norm. There is a real distinction.

## Concrete example

Consider what happened around the April 2024 halving. The block subsidy dropped from 6.25 BTC to 3.125 BTC. In the weeks following:

- The total Bitcoin hash rate, which had been climbing, plateaued and slightly dipped as marginal miners (some older-generation ASICs in higher-electricity-cost regions) shut down.
- A small wave of mining-company bankruptcies followed, mostly companies that had over-leveraged on the assumption of stable BTC-denominated revenue.
- Transaction fees briefly spiked because of an unrelated phenomenon (Ordinals/inscriptions creating block-space competition), which temporarily compensated some miners. Whether this is a sustainable substitute for subsidy or a one-off remains unclear.
- The price of bitcoin rose somewhat over the following twelve months, but it had also risen before the halving, and disentangling cause from correlation is essentially impossible from a single data point.

Notice the structure of what we can and can't say. We can say that the halving had the predictable mechanical effects — subsidy cut, marginal miners squeezed, hash rate dipped and recovered. We *cannot* say with confidence that the halving caused the price action that followed. Halving narratives do real work in market behavior, but disentangling narrative-driven price moves from "would have happened anyway" is the kind of problem you should be suspicious of any confident answer to.

## Uncomfortable question

If you accept the security budget problem as real — and the math says you should — then you are accepting that Bitcoin's current security model is *not* its eventual security model. The system will, sometime in the next twenty years, have to transition from a subsidy-dominant regime to a fee-dominant regime. This transition has never been tested. It might work smoothly. It might force a difficult debate about whether to add tail emission (a small permanent issuance) the way Monero already has. That debate would split the community and would be the largest test of the "21 million is sacred" norm in Bitcoin's history. So the question is: what is the *strongest* case you can make that the fee-only future will work, and what is the *strongest* case you can make that it won't, and which side do you actually find more convincing? Be careful, because the temptation to give the maximalist answer because it's the comfortable one is very strong. Try the other answer first.
