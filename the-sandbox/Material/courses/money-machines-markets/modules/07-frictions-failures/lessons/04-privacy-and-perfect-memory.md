---
id: 04-privacy-and-perfect-memory
title: Privacy and Perfect Memory
order: 4
estimatedMinutes: 24
learningOutcomes:
  - Explain why "privacy" in 2026 is a different concept than it was in 1996.
  - Describe how blockchains and AI training corpora both undermine forgetting in different ways.
  - Distinguish privacy-as-secrecy from privacy-as-contextual-integrity.
concepts:
  - contextual-integrity
  - right-to-be-forgotten
  - chain-analysis
  - training-corpus-leakage
  - zero-knowledge
---

## Reading

The way we talk about privacy is twenty years out of date. The folk model is that privacy means *secrecy*: there is information about me, I have a fence around it, anyone who breaches the fence violates my privacy. Under that model, privacy is about controlling access to the fence. You can argue about how high the fence should be, who's allowed in, what counts as breach, but the basic shape is access control.

That model is wrong for the world we now live in, and it has been wrong for at least a decade. The reason is that almost everything about us is already on the other side of *somebody's* fence, and the harms we actually care about don't come from the breach. They come from **recontextualization** — information that was given freely in one setting being used in another setting it was never meant for.

The philosopher Helen Nissenbaum gave this idea its sharpest formulation: **contextual integrity**. Information has *norms of flow* attached to the context in which it was shared. You tell your doctor things you would not tell your boss. You tell your therapist things you would not tell your doctor. You post things on a fishing forum at 2 AM that you would not put on your LinkedIn. The privacy violation isn't somebody finding out — it's information leaking *across contexts* in a way that violates the implicit norms of the original context. Your boss reading your fishing-forum post isn't a hack. The post was public. But it's a privacy violation in the sense that matters, because it broke the contextual norm.

Now apply this to two technologies in this course: blockchains and AI.

**Blockchains** are public, permanent ledgers. Every transaction you make on Bitcoin or Ethereum is visible forever to anyone who looks. Early in the crypto story this was sold as a feature — *transparency*, *auditability*, *trustlessness*. All of those are real. But the consequence is that any link between an on-chain identity and a real-world identity, once made, is permanent and retroactive. **Chain-analysis** firms exist for exactly this reason. They specialize in clustering addresses, linking them to known exchanges, and selling the resulting dossiers to law enforcement, tax authorities, and increasingly to private companies. The bezzle of crypto privacy in the early years was that people thought pseudonymity was anonymity. It isn't. It's worse than no privacy at all in some ways, because it gives you false confidence to do things you wouldn't have done if you knew it would all be visible in 2026.

There are real cryptographic answers to this — **zero-knowledge proofs**, mixing protocols, privacy coins like Monero — and they work, mostly. But every one of them is under sustained regulatory pressure, because the same property that protects a dissident's donations also protects a money launderer's transfers. There is no clean technical fix for that trade-off. There is only the political question of which failure mode you want to default to, and that question is being decided right now, mostly by people who don't understand the math.

**AI** is the other side of the same coin. A frontier model trained on the open web has, in a meaningful sense, *memorized* portions of its training corpus. Sometimes the memorization is verbatim — there are documented cases of models reciting copyrighted text, personal information, even API keys, when prompted in the right way. More often the memorization is *statistical* — the model can be coaxed into producing text that probabilistically reveals what was in its training data without quoting it directly. The European "right to be forgotten" assumed that information could be deleted from a database. A trained model is not a database. You cannot reach into a 700-billion-parameter weight matrix and find the row corresponding to "embarrassing 2009 forum post" and delete it. The information is *distributed* across the weights, blended with everything else, in a way that may or may not be retrievable by clever prompting. We don't fully know.

This produces a strange new thing: **information that has been forgotten by its author, by the platform that hosted it, and by Google's index, but not by the model**. The model knows things about you that no living person remembers. The model can be queried. The model can be jailbroken. The model can be subpoenaed.

The combined picture is that we are living through the *end of forgetting*. Blockchains make financial actions permanent. AI models make written and spoken artifacts permanent in a deeper way — they don't just store, they *learn from* what existed. The traditional privacy regime assumed forgetting as the default. Forgetting is no longer the default. Privacy in 2026 has to be reconstructed on a different foundation, and we have not yet reconstructed it.

A few honest observations:

- The people who say "privacy is dead, get over it" are wrong, but they are wrong in a less dumb way than they were ten years ago.
- The people who say "we need stronger privacy laws" are right but mostly proposing 2003-shaped laws for a 2026-shaped problem.
- Cryptography (zero-knowledge proofs in particular) is one of the few genuinely promising technical answers, and almost nobody outside the crypto community is paying attention to it. The crypto community, meanwhile, is mostly arguing about token prices and not building the privacy infrastructure that justifies its existence.
- The hardest case is the dissident in an authoritarian country, and the second hardest is the abuse victim trying to leave a relationship. Any privacy framework that does not work for those two cases is a framework for the comfortable, not for the people who need it.

## Concrete example

In 2024, a researcher demonstrated that a major frontier language model could be prompted, with a carefully constructed query, to reproduce verbatim the text of a personal blog post that had been deleted from the internet two years earlier. The blog's author had deleted it intentionally, the platform had honored the deletion, the Internet Archive had eventually pruned it. But the model had been trained on a snapshot from before the deletion, and the post lived on inside the weights, retrievable to anyone who knew how to ask. The author, when contacted, was upset in a way that is hard to file under any existing privacy framework. Nothing was hacked. No fence was breached. The information was, at one time, public. And yet the harm was real and the existing law had nothing to say about it.

## Uncomfortable question

Make a list of three things you have written or said online — even briefly, in passing — that you would not want a future employer, partner, or government to read in context. Now ask: do you actually believe those things have been forgotten? If your answer is "probably yes," what are you basing that on? If your answer is "I'm not sure," what would you do differently *today* if you took seriously the idea that a sufficiently motivated party in 2030 could probably retrieve any of them? Most people, when they sit with this honestly, find that they live as if forgetting still works. It mostly doesn't. The question is whether you want to keep living that way or change your behavior, and there is no right answer — but the unexamined version is not a position, it's just inertia.
