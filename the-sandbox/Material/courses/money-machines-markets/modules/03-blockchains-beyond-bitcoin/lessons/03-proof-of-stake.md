---
id: 03-proof-of-stake
title: Proof-of-Stake vs Proof-of-Work, on Dimensions That Actually Matter
order: 3
estimatedMinutes: 26
learningOutcomes:
  - State the actual mechanism difference between PoW and PoS without resorting to slogans.
  - List at least four dimensions on which the two systems honestly differ, and identify which dimension matters most for which use case.
  - Defend a specific position on whether PoS is appropriate for a monetary base layer.
concepts:
  - proof-of-work
  - proof-of-stake
  - security-budget
  - long-range-attack
  - slashing
  - liveness-vs-safety
---

## Reading

The PoW-vs-PoS argument has been going on for over a decade and has produced more heat than light because both sides spend most of their time fighting about the wrong thing. The Bitcoiners say "PoS is for VCs" and "PoS is just a database with extra steps." The Ethereum people say "PoW boils oceans for no reason." Both slogans contain a kernel of truth and miss everything that actually matters. Let's restart from the mechanism and then look at the dimensions where the two systems honestly diverge.

**Proof of work** says: to add the next block, you must spend physical energy computing a hash that meets a difficulty target. The amount of energy you spend is your stake in the system's honesty, because if you cheat and your block is rejected, you have burned that energy for nothing. Security comes from the fact that an attacker would have to outspend the honest miners, in real-world energy and hardware, to control the chain. Bitcoin uses this. So did Ethereum until September 2022.

**Proof of stake** says: to add the next block, you must lock up an amount of the chain's native token as a deposit. If you cheat (sign two conflicting blocks, vote for an invalid state), the protocol *slashes* your deposit — you lose some or all of it. Security comes from the fact that an attacker has to put their own money on the line, and that money can be confiscated by the system. Ethereum uses this now. So do almost all chains launched after 2018.

The slogan-level argument compares the systems on the wrong axis. **Energy use** is not the dimension that matters most. It is a real and legitimate consideration, but it is downstream of a deeper question, which is: *what is your security budget paying for, and is it stable over time?* Let's walk through the dimensions that actually matter.

**Cost to attack.** In PoW, attacking a major chain requires acquiring or renting an enormous amount of specialized hardware (ASICs for Bitcoin) and the energy to run it. The cost is in the billions of dollars and in many cases is bottlenecked on physical supply chains. In PoS, attacking a chain requires acquiring 33% (for liveness attacks) or 67% (for safety attacks) of the staked supply. For Ethereum that is currently a very large dollar amount. In *both* cases the attack is expensive. In PoW, the attacker is buying scarce real-world goods. In PoS, the attacker is buying tokens that, by the act of buying, become more expensive — the asset prices its own attacker out. PoS proponents call this "the cost of attack increases with attack size." PoW proponents counter that this only works if there's a deep liquid market, which is fragile.

**Recovery from attack.** This is where PoS has a genuine and underappreciated advantage. In PoW, if an attacker successfully 51%s a chain, the only response is to wait for them to give up or to fork the chain in a way that retroactively orphans their blocks. The honest miners can't *punish* the attacker — they can only out-mine them. In PoS, the protocol can slash the attacker's stake. The economic penalty is built in. This makes attacks both more expensive in expectation and harder to repeat. The flip side is that slashing requires *social consensus* that something was an attack, which introduces a politics layer that PoW does not have.

**Security budget over time.** This is the dimension where I think PoS has the strongest case and PoW has its most serious unresolved problem. Bitcoin's security budget is paid out in newly issued BTC, which halves every four years and is supposed to be replaced eventually by transaction fees. Whether transaction fees will actually grow enough to replace the issuance is *the* open question for Bitcoin's long-run security model, and reasonable people disagree about it. PoS chains have much more flexibility here — they can adjust issuance as a parameter, and the security cost per dollar of value secured is generally much lower. The PoW counter is that this flexibility is itself a vulnerability ("a chain that can change its issuance schedule by social process is not really hard money") and that's a fair point. But if you grant that the goal is to keep the chain secure, PoS has an easier time financing security at scale.

**Liveness vs safety trade-off.** Distributed systems theory has a result called the FLP impossibility, which (informally) says you cannot have a system that is guaranteed to make progress *and* guaranteed to never make a mistake when the network is unreliable. You have to pick. PoW chains like Bitcoin pick **liveness** — they keep producing blocks even during bad network conditions and let safety be probabilistic ("wait six confirmations"). PoS chains like Ethereum mostly pick **safety** — they prefer to halt finality during bad conditions rather than finalize a wrong block. Neither choice is universally better. Bitcoin's choice is the right one for a global monetary base layer that should never go offline. Ethereum's choice is the right one for an application substrate where an inconsistent state would be more damaging than a temporary halt. The fact that both choices are defensible is itself the point: people who say "PoS is broken because it can halt" or "PoW is broken because it can fork" are asking the wrong question.

**Long-range attacks.** In PoS, a historical validator who has since unstaked could in principle sign an alternative history of the chain starting from when they were active. The protocol defends against this with "weak subjectivity" — new nodes need to bootstrap from a recent trusted checkpoint, not from genesis alone. Bitcoin doesn't have this problem; you can boot a Bitcoin node from genesis with no trusted source. This is a real philosophical difference. In practice, almost all real Bitcoin nodes also bootstrap from a trusted source (the software they downloaded, which contains hardcoded checkpoints), so the gap is smaller in practice than in theory. But it is real.

**Plutocracy concerns.** Both systems concentrate over time, and the concentrations look different. PoW concentrates around whoever has the cheapest energy and the best hardware supply chain — historically a few large pools and a few jurisdictions. PoS concentrates around whoever holds the most tokens, modulated by the existence of liquid staking protocols (which we will return to in Lesson 6). Neither is straightforwardly more centralized than the other. The question is which kind of centralization you find more objectionable, and that depends on what you think money is for.

So where does that leave us? Here is my take, and I'll defend it: **proof of stake is fine and probably superior for application substrates — the chains where the goal is to support a vibrant set of programmable assets and the security budget has to scale to billions of dollars without burning a small country's worth of electricity.** Ethereum's transition was, on balance, the right call for what Ethereum is trying to be. **Proof of work is, for now, still the right choice for a chain whose only job is to be an extremely credible monetary base layer that can be verified by anyone with a laptop.** Bitcoin's refusal to switch is, on balance, the right call for what Bitcoin is trying to be. The two chains have different jobs and the different consensus mechanisms reflect those different jobs, not a contest where one of them is wrong. People who insist there can be only one answer are usually selling something.

## Concrete example

In September 2022, Ethereum executed "the Merge" — the live transition from PoW to PoS, with no chain halt and no funds lost. This was, in pure engineering terms, one of the most impressive coordinated upgrades ever performed on a multi-hundred-billion-dollar production system. It also dropped Ethereum's energy consumption by about 99.95% overnight and reduced ETH issuance by roughly 90%. The Bitcoin community largely shrugged and pointed out, correctly, that these benefits came at the cost of complexity, of new attack surface (slashing, validator infrastructure, MEV), and of a less verifiable security model. The Ethereum community largely celebrated and pointed out, correctly, that the chain kept working, that the projected catastrophes did not materialize, and that the new system has held up under live conditions for years. Both communities are telling the truth about what they care about. The trick is to notice that they are not telling the truth about the same thing.

## Uncomfortable question

If you accept that PoW is appropriate for a monetary base layer and PoS is appropriate for an application substrate, what is your answer for a chain that wants to be *both* — a single chain that serves as global money *and* hosts arbitrary programmable applications? Either you have to pick one consensus mechanism and accept it's wrong for half your job, or you have to admit that "monetary base layer" and "application substrate" are two different jobs that probably shouldn't live on the same chain. Most multipurpose chains in the wild have not faced this question honestly. What would facing it honestly require them to give up?
