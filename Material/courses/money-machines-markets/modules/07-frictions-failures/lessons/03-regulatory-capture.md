---
id: 03-regulatory-capture
title: Regulatory Capture in Emerging Tech
order: 3
estimatedMinutes: 23
learningOutcomes:
  - Define regulatory capture and distinguish the cynical and honest versions.
  - Explain why incumbents often welcome regulation that they appear to oppose in public.
  - Recognize the patterns in current AI and crypto policy debates.
concepts:
  - regulatory-capture
  - moat-by-compliance
  - safety-washing
  - revolving-door
  - rent-seeking
---

## Reading

**Regulatory capture** is the term George Stigler gave, in 1971, to a pattern that everyone in policy already knew but nobody had named cleanly: the agency created to police an industry tends, over time, to be staffed by, funded around, and intellectually shaped by that industry. Not because regulators are corrupt — most are not — but because the only people with deep domain expertise are the people who came from the industry, and the only people who care about a regulation enough to lobby it line by line are the people it affects most. The result is that rules get written in language that the largest incumbents can comply with cheaply and that smaller competitors and new entrants cannot.

This is not a conspiracy theory. It is the modal outcome whenever a complicated industry intersects with a small understaffed agency. It happens in pharmaceuticals, in nuclear power, in finance, in telecoms, and now, predictably, in crypto and in AI.

The cynical version of capture is straightforward bribery and revolving doors. It exists, but it is not the interesting case. The honest version is what Stigler was actually describing: a slow, structural drift in which incentives align without anyone consciously choosing them. An incumbent firm has every reason to ask for *more* regulation, *not less*, as long as the regulation is shaped in a way it can absorb. Compliance becomes a moat. Twenty pages of paperwork is a rounding error for a $10B firm and an extinction event for a three-person startup. The $10B firm will publicly complain about the paperwork while quietly lobbying for it. Watch what they do, not what they say.

You can see this playing out in two domains right now.

**Crypto.** The post-FTX policy environment in the US, EU, and UK has produced a wave of new licensing regimes, capital requirements, and KYC/AML rules. The ostensible target is fraud. The actual effect is to push self-custody, peer-to-peer, and small-exchange activity into a compliance burden that only large, well-capitalized entities can carry. The largest US exchanges have testified in favor of much of this regulation, sometimes in language indistinguishable from their critics'. Smaller competitors and open-source protocols have been pushed offshore, into legal limbo, or out of business. Whether this is a good or bad outcome depends on what you weight more — fraud reduction or open access — but the *political economy* of the outcome is unambiguous: the rules favor incumbents, and the incumbents helped write them.

**Frontier AI.** Even more clearly. By 2026, every major AI policy proposal in the US, EU, and UK includes some version of: training-run reporting requirements above a compute threshold, mandatory safety evaluations, licensing for frontier deployment, liability for "high-risk" applications. Each of these sounds reasonable in isolation. Each of them is also exactly the kind of rule that a five-person open-source team cannot comply with and that a $100B lab can comply with using a dedicated policy team it already employs. The largest labs have publicly *asked for* this regulation, framed as a safety move. Some of it genuinely is a safety move — there are real risks worth thinking about. Some of it is also a moat. Both of those things can be true at once, and pretending otherwise is being naive in one direction or paranoid in the other.

The cleanest tell is **language alignment between regulators and the regulated**. When a senator's speech on AI risk uses the same metaphors, the same examples, and the same proposed thresholds as the policy white paper a major lab released six months earlier, you don't need a smoking gun. You're looking at the smoke.

A few things to keep in mind so you don't go too far in the cynical direction:

1. **Regulation is sometimes good.** The fact that incumbents profit from a rule doesn't mean the rule is wrong. The FDA is captured in many ways and also genuinely prevents some thalidomide reruns. The trade-off is real.
2. **Capture is not corruption.** Most captured regulators are honest people working hard inside an information environment dominated by the industry they are trying to regulate. Calling it corruption is both unfair and analytically lazy.
3. **The right question is not "is this captured?"** It is "who benefits and who pays, in dollars and in optionality, and is that distribution defensible on the merits?" Sometimes the answer is yes. Often it isn't.
4. **Beware safety-washing.** In AI specifically, "safety" has become a word that can mean anything from "don't let the model help build bioweapons" (a real concern) to "make sure no competitor under $50M can train a frontier model" (a moat dressed as a concern). The same word covers both. That ambiguity is convenient for some parties.

If you want to read the political economy of any new regulation in this space, there is a single question that filters most of the noise: **who gets a compliance team, and who doesn't?** If a rule applies to a fifty-person nonprofit and a fifty-thousand-person corporation in the same way, it applies to the nonprofit much harder, because the corporation already has the team. This is the entire mechanism. Once you see it, you can't unsee it.

## Concrete example

In 2023 and 2024, the CEO of a major AI lab toured the world's capitals advocating for international AI governance, including licensing of frontier training runs and mandatory disclosure to a new international body. The proposal was presented as a safety measure. It was, simultaneously, a proposal that would have erected the highest possible barrier to any competitor without an existing seat at the international table. The CEO may have sincerely believed both things. The two beliefs are not contradictory. But the press coverage almost universally took the safety framing at face value and did not ask who would be locked out of the room. That is what capture looks like in real time — not bribery, not corruption, just an ambient drift in which the loudest voice in the room shapes the conversation and almost nobody notices because the loudest voice is also saying things that sound true.

## Uncomfortable question

Pick a regulation in crypto or AI that you currently support. Now, without changing the rule itself, write down the list of firms and individuals it would *prevent from operating*. Be specific. Names if you know them, types if you don't. Then ask: is the set of firms and individuals it prevents the set you actually wanted to prevent, or has the rule selected for size rather than for the behavior you cared about? If the answer is "size, not behavior," and you still support the rule, you should at least be honest with yourself that the cost is being paid by people you weren't trying to hit.
