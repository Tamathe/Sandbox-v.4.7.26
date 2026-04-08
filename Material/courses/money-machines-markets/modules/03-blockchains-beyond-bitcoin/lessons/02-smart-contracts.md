---
id: 02-smart-contracts
title: Smart Contracts — What They Are, What They Do Well, Where They Detonate
order: 2
estimatedMinutes: 26
learningOutcomes:
  - Define a smart contract precisely without hand-waving about "trustlessness."
  - Name the categories of problem that smart contracts genuinely solve and the categories they cannot solve.
  - Explain the DAO hack, reentrancy, and the oracle problem in plain language and say what each one teaches.
concepts:
  - smart-contract
  - reentrancy
  - oracle-problem
  - immutability-trade
  - the-dao
---

## Reading

The phrase "smart contract" is a marketing disaster. The thing it names is neither smart nor a contract. It is a **piece of code that runs deterministically on a blockchain, with state changes recorded on that blockchain, and that anyone can call by sending a transaction**. That's it. No intelligence. No legal force. It is closer to a vending machine than to a contract: you put in the inputs, it gives you the deterministic output, and if you didn't read the source code carefully, that's your problem.

Nick Szabo coined the term in the 1990s, before Bitcoin existed, with vending machines as his motivating example. The vending machine enforces a rule ("coin in, candy out") without needing a human in the loop and without giving either party the ability to renege after the fact. Szabo's insight was that lots of agreements have this structure, and that if you could express them as code and run that code on a substrate nobody controlled, you would get something genuinely new — agreements whose execution did not depend on either party's continued willingness or any third party's enforcement.

Ethereum was the first system that actually implemented this at scale. Smart contracts on Ethereum are programs written in Solidity (or one of a few other languages), compiled to bytecode, deployed to an address on the chain, and then callable forever (or until everyone forgets they exist). Once deployed, the code is immutable by default. You can build in admin keys and upgrade mechanisms, and most production contracts do, but the *baseline* is: deploy and live with what you wrote.

**What smart contracts do well, genuinely:**

1. **Atomic financial primitives.** A swap of one token for another, where either both legs happen or neither does, with no possibility of one party walking away mid-trade. This is the technical foundation of every DEX and is something that traditional finance pays large amounts of money to approximate with clearinghouses.
2. **Programmable money flows.** A vesting schedule that releases tokens monthly, an escrow that releases on a deadline, a DAO treasury that can only spend on approved proposals. None of these need a human in the loop once configured.
3. **Trust-minimized lending.** Overcollateralized loans where the collateral is liquidated automatically if the price moves. Aave and Compound have processed hundreds of billions of dollars in such loans, with vanishingly few losses from the *smart-contract side* of the system. Almost all of the catastrophes in DeFi lending have come from somewhere else (oracle manipulation, governance attacks, related-party exposure), not from the contract code failing to do what it said.
4. **Composable financial Lego.** Because every contract is callable by every other contract, you can stack primitives in ways that were impossible in traditional finance without weeks of legal negotiation. The cost is that the failure modes also stack.

**Where they detonate:**

The first famous detonation was **The DAO** in 2016. The DAO was an Ethereum-based investment fund whose rules were entirely smart-contract code; it raised about $150M in ETH, which was an enormous amount of money in 2016. A few weeks later, an attacker used a **reentrancy** vulnerability to drain about a third of the funds. The attack worked like this: when the DAO's withdrawal function sent ETH to the attacker's address, the attacker's address was *itself* a contract, which immediately called the withdrawal function *again* before the DAO had updated its internal balance. The DAO obediently sent more ETH. The attacker repeated the trick. The whole thing happened in a single transaction, and by the time anyone saw it, ~$60M was gone.

The Ethereum community responded by hard-forking the chain to claw the funds back, which is why Ethereum Classic exists as the chain that *didn't* do the rollback. The forking decision was, depending on who you ask, either an emergency rescue of a young ecosystem from a fatal disaster, or a fundamental betrayal of the "code is law" promise the system had been sold on. Both readings are defensible. The honest version is that the rollback worked, and that the same kind of rollback would *not* work today because the ecosystem is too large to coordinate around — which means The DAO bailout bought time for an ecosystem that has since become un-bailable. The lesson is uncomfortable: the property the maximalists wanted (immutability) was sacrificed early *and that sacrifice was load-bearing for everything that came after*.

Reentrancy is now a well-understood class of bug and is generally caught by static analyzers and audits. But the broader pattern — *a property of the contract that was not visible from reading the source code in the way the author read it* — keeps showing up in new forms. Flash-loan attacks. Oracle manipulation. Governance attacks where someone borrows enough tokens to vote through a malicious upgrade. The problem is not that any one bug class is unsolvable. The problem is that **the attack surface is the entire combined behavior of every contract that interacts with yours**, and that surface is unbounded.

The deepest failure mode is the **oracle problem**, and it deserves its own paragraph because it is the thing most people don't see coming. Smart contracts can only access data that lives on the chain. They cannot natively look up the price of ETH in dollars, the score of a soccer match, the temperature in Lagos, or anything else from the off-chain world. Anything you want to bring into a contract has to be put there by a transaction, which means *some entity* is the source of that data, which means **the trustlessness of your contract is bounded by the trustworthiness of your oracle**. You can build elaborate decentralized oracle networks (Chainlink, Pyth, etc.) and they help, but the fundamental gap remains: a smart contract that depends on real-world data inherits the trust assumptions of whoever provides that data. Vast amounts of "trustless DeFi" are actually trust-shifted DeFi — the trust moved from a custodian to an oracle network, which is better in some ways and worse in others, but is *not* the absence of trust the marketing promises.

Putting it together: smart contracts are an extraordinary tool for building financial primitives that do what they say, *as long as* what they say is fully expressible on-chain. The further you get from purely on-chain logic, the more your trustlessness leaks out through the oracle layer, the upgrade keys, the multisigs, and the governance process. The honest framing is not "trustless" but "trust-minimized in ways you can audit." That is still a real and valuable thing. It is just a smaller thing than the marketing.

## Concrete example

In 2022, the lending protocol Mango Markets on Solana was drained of about $114M in a single attack that used no exploit in the contract code at all. The attacker borrowed a large position in MNGO tokens, used their own capital to push the price of MNGO up sharply on the spot markets that the protocol used as oracles, watched the protocol revalue their MNGO collateral upward, and then borrowed against the inflated collateral and walked away with the borrowed assets. Every step of this was *exactly what the contract was written to allow*. The contract did not have a bug. The system as a whole had a bug, which was that its oracle was manipulable by anyone with enough capital. The attacker even returned to negotiate with the protocol and got to keep tens of millions in a "settlement." Notice that "the code worked correctly" and "the protocol lost nine figures" can both be true at the same time. That gap is where most of the real risk in smart-contract systems lives.

## Uncomfortable question

If you grant that smart contracts are excellent at on-chain financial logic but leak trust badly anywhere off-chain data is involved, what is the *correct* set of applications for them? Be specific. Name three categories of application where you think the trust profile is favorable enough that smart contracts are clearly the right tool, and three categories where you think the trust profile is so unfavorable that smart contracts are theater. If your six examples are all in finance, what does that tell you about the world-computer thesis from Lesson 1?
