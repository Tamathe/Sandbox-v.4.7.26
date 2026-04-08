---
id: 06-what-we-dont-know
title: Five Things We Genuinely Don't Know
order: 6
estimatedMinutes: 26
learningOutcomes:
  - State five specific open questions in this domain in language a smart non-expert can understand.
  - Distinguish "we don't know" from "experts disagree" and from "I haven't read enough."
  - Resist the social pressure to fake certainty in either direction.
concepts:
  - calibration
  - epistemic-humility
  - knightian-uncertainty
  - base-rate
  - unknown-unknown
---

## Reading

Most courses end with answers. This one ends — for the substantive content, before the synthesis module — with five questions I do not know the answer to. If you have been paying attention, you should not know the answer either. If you think you do, that is a sign you have absorbed someone's narrative more deeply than you have absorbed the underlying uncertainty. The point of this lesson is to inoculate against that.

A note on vocabulary first. There are three different things people mean when they say "I don't know."

- **"Experts disagree"**: there is a structured debate, the positions are known, the evidence is partially in. You can read the literature and form a view.
- **"I haven't read enough"**: the answer might be known by others, you just haven't done the work. Fixable.
- **Knightian uncertainty**: nobody knows, the data is genuinely insufficient, and any confident prediction is bluffing. Not fixable by reading more.

The five questions below are mostly the third kind, with some of the first mixed in. None of them are the second.

---

**1. Does Bitcoin survive the security-budget transition?**

Bitcoin's security comes from the block reward, which halves every four years and asymptotes to zero by around 2140. After the reward goes to (effectively) zero, the network has to be paid for entirely by transaction fees. Whether transaction fees alone will be enough to fund a level of hashpower that resists state-level attackers is an empirical question with no precedent. There are scenarios in which fee markets become rich enough (settlement of high-value transactions, second-layer batching, institutional flows) to sustain security. There are scenarios in which they don't, and the network's hashpower drifts down to a level where a determined adversary could rewrite history. Both scenarios are taken seriously by people who know what they are talking about. Anyone who tells you confidently that Bitcoin will or will not survive this transition is performing certainty they don't have. The real answer is: ask again in 2050.

---

**2. Do current language model architectures scale to anything we'd recognize as general intelligence?**

The empirical scaling laws of the 2020s held for several orders of magnitude and produced startling capability gains. They have shown signs of bending — not breaking, *bending* — in the most recent generation. We do not know whether the next two orders of magnitude of scale will continue the trend, plateau, or produce qualitatively different behavior. We also do not know whether the limits we are seeing are limits of the architecture (transformer-based, autoregressive, next-token-prediction) or limits of the data, the training objective, the compute, or some combination. The disagreement among serious researchers at the frontier is wider than the public debate suggests. People who say "it's a stochastic parrot" and people who say "AGI by 2027" are both vastly more confident than the evidence allows. The honest position is something like: capability gains will continue for a while, the form they take will surprise us in both directions, and any timeline forecast more than three years out is mostly vibes.

---

**3. What does an economy look like when most cognitive work is automated and most physical work is not?**

We have models of economies where capital substitutes for labor in some sectors. We have models of economies where physical automation displaces manufacturing jobs. We do not have working models — empirical or theoretical — of an economy where the *cognitive* tasks of doctors, lawyers, analysts, and writers can be done at near-zero marginal cost by machines, while plumbing, elder care, and construction cannot. This is a configuration the economy has never been in. It might compress labor share to historic lows, redistribute it in ways nobody predicts, produce a Baumol-style inflation in the remaining human-only sectors, or do something else entirely. Anyone who tells you they know how this plays out is selling a book.

---

**4. Is the current monetary system actually breaking, or are the doomsayers wrong?**

The hard-money case rests on a claim that debt-to-GDP, asset price inflation, currency debasement, and the loss of the dollar's reserve role are converging on a crisis. The opposite case rests on the observation that the same predictions have been made every decade for sixty years, the system has absorbed every shock so far, and the institutions are more resilient than their critics give them credit for. The honest answer is that *both* observations are true, and the question of which side is right reduces to: is the current trajectory a mean-reverting cycle (bull case for the status quo) or a path-dependent slow accumulation of fragility (bull case for hard money). The data does not yet distinguish these two cleanly. It might in five years. It might not.

---

**5. What is the relationship between machine intelligence and human values, and is "alignment" a coherent technical problem?**

This is the deepest and the worst-defined question on the list. The field of AI alignment treats the problem as a technical one: how do you specify, train, or constrain a system so that its behavior tracks human values. The trouble is that "human values" is not a thing — humans disagree, contradict themselves, change their minds, and the values we say we have are different from the values we act on. Any technically rigorous formulation of alignment has to make assumptions about whose values, in what aggregation, on what time scale. Those assumptions are doing all the work. Some serious researchers think this whole framing is broken and the right move is to think about *capability constraints* rather than *value alignment*. Others think alignment is the only thing that matters and everyone else is missing the point. I do not know who is right. Neither do you. Be wary of anyone who is sure.

---

If this list is unsatisfying, good. The point of the entire course up to here was to give you sharp tools. The point of this lesson is to remind you that sharp tools are only as good as the humility with which you wield them. The biggest mistakes in this domain over the next decade will not be made by people with no opinions. They will be made by people whose opinions exceeded the evidence and whose social environment rewarded the excess.

## Concrete example

In December 2022, the phrase "AGI in 18 months" was being said out loud by senior people at major labs. By April 2026, it has not arrived. The phrase has been quietly dropped, the timeline has shifted, the same people are making the same kind of predictions about a different horizon. Notice: neither the original prediction nor its quiet retraction was followed by anyone publicly saying "I was overconfident, here is what I learned about my own forecasting process." This is not because those people are dishonest — it is because the social and financial incentives reward confident prediction in either direction and punish the boring middle. The middle is where the truth usually lives, and it is the unsexiest place to be on a podcast.

## Uncomfortable question

Pick one of the five open questions above. Write the most confident answer you would give to that question if a smart friend asked you over dinner tonight. Then write down the *base rate* you should use for predictions of that kind — how often have similar predictions made by similar people about similar timeframes turned out to be right? If you cannot estimate the base rate, your confidence is unsupported. If you can estimate it and your stated confidence is much higher than the base rate, ask yourself why. The answer is almost never "I have private information." The answer is almost always "I want to feel like I know."
