---
id: 05-lightning
title: Lightning — Why It Exists and What It Doesn't Solve
order: 5
estimatedMinutes: 26
learningOutcomes:
  - Explain the throughput problem Lightning is trying to solve and why on-chain scaling alone cannot solve it.
  - Describe a payment channel mechanically without hand-waving, including the role of HTLCs.
  - Articulate the costs and limits of Lightning that the marketing rarely mentions.
  - State the contested claim about Lightning's long-run trajectory and what would settle it.
concepts:
  - throughput-problem
  - payment-channel
  - htlc
  - routing
  - inbound-liquidity
  - layer-2
  - channel-balance
---

## Reading

Bitcoin's base layer can settle roughly seven transactions per second across the entire global network. That is not a misprint. Visa does several thousand. The local coffee shop's card terminal would saturate Bitcoin's throughput by itself if Bitcoin were the rails. This is not a bug — it is a deliberate trade-off in the design. Increasing the block size to handle more transactions per second has costs that fall on every full node operator everywhere, and the Bitcoin community fought a multi-year civil war over whether to make that trade-off. The "small blockers" won, on the grounds that keeping the base layer cheap and easy to validate matters more than making it cheap to transact on. (We will revisit the politics of that fight in Lesson 6.) Whatever you think of the choice, the fact is: Bitcoin's base layer is designed to be a *settlement* layer, not a payments layer.

This creates an obvious problem. If you want to use Bitcoin to buy coffee — which the white paper itself talks about, "peer-to-peer electronic cash" — you cannot do it on the base layer at any scale, because seven transactions per second cannot feed the world's coffee habits, and even if it could, the fees would be prohibitive at any meaningful adoption level. So either you give up the coffee use case (which most maximalists eventually did, in favor of "store of value"), or you build a second layer on top of Bitcoin that handles the high-frequency payments and only touches the base layer occasionally. Lightning is the most prominent attempt at the second option.

The core idea is the **payment channel**. Two parties — call them Alice and Bob — open a channel by jointly publishing one transaction on the Bitcoin base layer. This transaction locks up some bitcoin in a 2-of-2 multisignature output that requires both of them to sign for any future spend. The amount they put in is the channel's *capacity*. Once that on-chain transaction confirms, Alice and Bob can transact between themselves an unlimited number of times by exchanging signed updates of "this is the new balance of our shared 2-of-2 output: Alice has X, Bob has Y." None of these updates touch the base layer. They are just messages between the two parties. Whenever they want to settle, either of them can broadcast the latest signed update to the base layer, and the channel is closed: each of them gets their final balance back as ordinary on-chain UTXOs.

That is the simple version. The clever part is what stops Alice from cheating. Suppose Alice and Bob have transacted through the channel and the latest balance is "Alice 3, Bob 7." Alice would obviously prefer to publish an *earlier* state where she had 9 and Bob had 1. The channel construction prevents this through a punishment mechanism: every channel update produces a "revocation key" given to the other party. If Alice ever publishes an old state, Bob has a window of time to use his revocation key to claim the *entire* balance of the channel as a penalty. So the rational move is to always publish only the latest state. The mechanism is tighter than this description — there are timeouts, scripts, and signature swaps involved — but the principle is: cheating is detectable and the penalty is total.

That handles two parties. The hard part is letting *anyone* on the network pay anyone else without needing to open a channel directly with them. This is where Lightning becomes a network of channels. If Alice has a channel with Carol, and Carol has a channel with Bob, then Alice can pay Bob *through* Carol: Alice sends a payment to Carol contingent on Carol forwarding it to Bob, and the contingency is enforced cryptographically using something called a **Hashed Time-Locked Contract (HTLC)**. The trick is that Carol can only claim Alice's payment if she can produce a secret that only completes when Bob has accepted Carol's payment to him. The whole multi-hop payment either completes atomically (everyone forwards, everyone gets paid) or unwinds (nobody is out of pocket). This is genuinely beautiful engineering and it actually works.

Now: the costs and the catches that the maximalist Lightning pitch glosses over.

**Inbound liquidity is a real problem.** When you open a channel, *you* put bitcoin into it. That money is your *outbound* capacity — the maximum you can send. To *receive* payments, you need someone else to have outbound capacity *toward you*, which is your *inbound* capacity. New users routinely open a channel, fund it, try to receive a payment from a friend, and discover they cannot, because no one has any reason to push capacity in their direction. Solutions exist (paying for inbound liquidity, looping out, channel rebalancing) but they are not what you would call user-friendly. This is one of the main reasons mainstream Lightning adoption has been slower than the technology's promoters predicted.

**Liveness requirements.** To enforce the punishment mechanism, you (or a "watchtower" service you trust) need to be online and watching the chain. If your channel partner publishes an old state while you are offline for too long, the timeout window passes and they get away with it. This is fine for hot wallets and routing nodes but it is a real friction for the "hold your own keys, never online" use case.

**Routing is hard.** Finding a path from Alice to Bob that has enough capacity at every hop is a non-trivial problem and gets harder as payments get larger. Lightning works well for small payments and gets less reliable as the amount grows. The "everyone routes everything for everyone" picture is more aspirational than reality; in practice, most Lightning traffic flows through a small number of large routing nodes, which is a centralization vector that the marketing doesn't mention.

**Custodial Lightning is winning the user-experience battle.** Most actual end-users of Lightning today are using custodial services like Wallet of Satoshi, Strike, or Cash App's Lightning integration. These services hold the keys, run the channels, and present a normal payments interface. They are convenient. They are also, by Bitcoin's own logic, "not your keys, not your coins." This is not a hypothetical: Wallet of Satoshi shut down its US service in 2024 after regulatory pressure and many users had a few days to extract their funds. The Lightning maximalist will tell you "use a non-custodial wallet." The user with a normal life will tell you the non-custodial wallets are not yet good enough for ordinary people. Both are right. The gap is real and is where most of the actual usage lives.

**Lightning does not solve the security budget problem from Lesson 4.** This is critical and almost never discussed honestly. Lightning routes transactions off-chain. Off-chain transactions don't pay base-layer fees. So if Lightning eats most of the transaction volume, the base layer's fee revenue does *not* go up to compensate for the falling subsidy — it might even go down. The optimistic story is that Lightning will only handle small transactions and high-value settlements will still happen on-chain, generating large fees. The pessimistic story is that Lightning's success makes the base layer's long-run security problem worse. Both are coherent. Which one plays out is empirical and unresolved.

The honest summary of Lightning, then: it is a real technical achievement, it makes some kinds of Bitcoin payments possible that would otherwise be impossible, it has serious user-experience and centralization frictions that are not yet solved, and it does not by itself rescue Bitcoin's long-run security model. It is not magic. It is one engineering response to a hard problem, and it is worth understanding on its own terms rather than as a slogan.

## Concrete example

In El Salvador, when Bitcoin was made legal tender in 2021, the government rolled out a wallet (Chivo) that used Lightning to make small in-country payments work. For a brief period, you could buy a pupusa with Lightning at a roadside stand and the experience was, for the user, as fast as Apple Pay. This was held up as proof that Lightning could be the payments layer for an economy.

What actually happened over the following years is more instructive than the snapshot. Chivo had reliability problems. Many users had bad first experiences (failed payments, lost funds, support black holes) and went back to dollars. By 2024, Bitcoin's role in El Salvador's economy was much smaller than the announcements suggested, and most actual payments — including Bitcoin-denominated ones — were happening through custodial services rather than self-custodial Lightning. Some merchants kept accepting Bitcoin; many quietly stopped. The El Salvador experiment did not refute Lightning, but it also did not validate the strongest version of the Lightning pitch. It demonstrated that the technology *can* work for small payments, that custodial wrappers are what most users actually use, and that the gap between "demo works" and "national payments infrastructure" is larger than enthusiasts hoped. None of this should be surprising. All of it should be flagged when you see the next "country adopts Lightning" headline.

## Uncomfortable question

Lightning's pitch is "Bitcoin's settlement layer plus Lightning's payment layer = a complete monetary system." But most actual users of Lightning are using custodial wrappers, which means they are using a *payment service that is denominated in Bitcoin* — they are not using Bitcoin's own properties (self-custody, censorship resistance, no third-party trust) at all. They are using PayPal with a Bitcoin price tag. So here is the question: if the dominant end-user experience of Lightning is custodial, and custodial Lightning is operationally indistinguishable from a fintech wrapper around any other money, what actually makes Lightning *Bitcoin's* payments layer rather than just another payments layer that happens to settle in Bitcoin? Is the on-chain settlement enough to count? Is the option-value of being able to leave the custodian enough? Or does the gap between "self-custodial Lightning is technically possible" and "self-custodial Lightning is what most users use" eventually mean something? This is one of those questions where smart people genuinely disagree, and where the easy answers are usually wrong in both directions.
