---
id: 03-utxos-and-keys
title: UTXOs, Keys, and What "Self-Custody" Actually Means
order: 3
estimatedMinutes: 27
learningOutcomes:
  - Explain the UTXO model in plain language and contrast it with an account-balance model.
  - Articulate the trade-offs of UTXOs versus accounts (parallelism, privacy, complexity, fees).
  - Describe what a private key is, what it controls, and what "your keys, your coins" actually means in practice.
  - State the honest case for and against self-custody for an ordinary user.
concepts:
  - utxo
  - account-model
  - private-key
  - public-key
  - address
  - self-custody
  - seed-phrase
  - coin-selection
---

## Reading

There are basically two ways to keep track of who owns what in a digital money system. The first is the way you probably think it works: there is a list of accounts, each account has a balance, and when you pay someone the balance in your account goes down and theirs goes up. This is the **account model**. It is how your bank works, how PayPal works, and how Ethereum (which we will get to in Module 3) works.

Bitcoin does not work this way.

Bitcoin uses the **UTXO model**, which stands for "unspent transaction output." Instead of accounts with balances, the system tracks discrete chunks of bitcoin, each of which has come into existence as the output of some previous transaction and has not yet been spent. Your "balance" is not stored anywhere. It is the sum of all the unspent transaction outputs your wallet can prove it controls.

Here is an analogy that helps. Imagine your wallet contains physical bills of arbitrary denominations — a $7.43 bill, a $0.18 bill, a $112 bill. To pay someone $20, you cannot just hand over $20 worth of "balance." You have to give them one or more whole bills whose total is at least $20, and you might receive a smaller bill back as change. The $20 you sent is no longer yours; the change is a *new* bill that did not exist before. Old bills are destroyed in the act of spending, and new bills are minted as outputs.

That is exactly how a Bitcoin transaction works. A transaction takes one or more existing UTXOs as **inputs**, references them by the transaction that created them, signs them with the appropriate private keys, and produces one or more new UTXOs as **outputs**. The inputs are *consumed* — they no longer exist as spendable units. The outputs sit there until they are themselves consumed by some future transaction. Each UTXO is, in effect, a tiny bearer instrument with its own spending conditions.

Why do it this way?

**Parallelism.** UTXOs are independent. Two transactions that don't share any inputs can be validated in parallel without coordination. In an account model, every transaction touching the same account has to be ordered, which becomes a bottleneck.

**Auditability.** Every UTXO traces unambiguously back to the coinbase transaction (the special block-reward transaction) that created its lineage. There is no ambiguity about provenance.

**Statelessness in validation.** A node doesn't need to know "what is Alice's balance" to validate Alice's transaction; it only needs to know "do these specific UTXOs exist and are they unspent." This is a small thing that makes the system more robust in distributed settings.

The cost is real. UTXOs are clunkier from a user-experience perspective. **Coin selection** — picking which UTXOs to combine to form a payment — is a non-trivial optimization that has to balance fee minimization, change minimization, and privacy. (If your wallet always uses your largest UTXO first, an observer can learn things about your holdings.) The UTXO model is also worse for expressive smart contracts; this is part of why Ethereum chose accounts.

Now: keys.

A Bitcoin **private key** is, in essence, a 256-bit random number. From that number, you can derive a **public key** through elliptic curve math (specifically, the secp256k1 curve), and from the public key you can derive an **address**, which is a hashed and encoded form that's safe to share. The math is one-way: given an address, you cannot recover the public key (until the address is used). Given a public key, you cannot recover the private key. But given the private key, you can produce signatures that prove control of the corresponding address, and anyone can verify those signatures without learning the private key itself.

When a UTXO is created, its spending condition is usually "whoever can produce a valid signature for this address can spend this." So the private key isn't a password to your account in some database. It is the *only* thing in the world that can produce signatures the network will accept as authorization to spend the UTXOs locked to your address. There is no customer support. There is no recovery flow. There is no central party that "has" your bitcoin and gives it to you when you log in. The bitcoin exists as entries on the ledger; the key is the only mechanism by which those entries can be moved.

This is what people mean by **"your keys, your coins"** (and its inverse, "not your keys, not your coins"). If you keep your bitcoin on an exchange, the exchange holds the keys. You hold a *claim* against the exchange — an IOU, in effect — and that claim is only as good as the exchange's solvency. The history of Bitcoin is littered with exchanges that failed, were hacked, or turned out to be running fractional reserves: Mt. Gox, QuadrigaCX, FTX, and many smaller ones. In each case, customers who held their coins on the exchange lost some or all of them. Customers who held their own keys did not.

This is also the case where the maximalist line ("never trust a custodian") is mostly right but not unconditionally right. Self-custody is not free. The risks just move. Instead of "the exchange might fail," you now have "I might lose my seed phrase," "I might be coerced into revealing it," "my heirs might not know how to access it," "I might fall for a phishing site," "my hardware wallet might have a firmware bug." These are not theoretical. The Bitcoin community has lost an estimated 3-4 million coins to forgotten passwords, lost drives, and similar self-custody mishaps over the years. Those coins are not coming back. They are simply locked forever, which is why the *effective* circulating supply is meaningfully smaller than the nominal one.

The honest framing: self-custody is the right choice for someone who has the technical literacy to do it correctly *and* the discipline to maintain it over decades, *and* who is holding enough that the loss-from-custodian-failure risk outweighs the loss-from-self-mistake risk. For most people in stable jurisdictions holding small amounts, a reputable custodian is probably fine, especially if their threat model is "the exchange might get hacked" rather than "the government might seize my assets." The maximalist position assumes everyone has the same threat model and the same competence. They do not. Pick honestly.

A **seed phrase** (or "mnemonic") is a human-readable encoding of your private key — usually 12 or 24 words drawn from a standardized list. The point of the words is that humans can write them down accurately and copy them across mediums. The seed phrase *is* the key, not a recovery code for the key. Anyone who has those words has full control of the funds, immediately and irrevocably. This is why "send me your seed phrase to verify your wallet" is the most common Bitcoin scam, and why no legitimate service will ever ask for it.

## Concrete example

Suppose you receive 0.3 BTC from one source and 0.5 BTC from another source. Your wallet now has two UTXOs: one for 0.3 BTC and one for 0.5 BTC. Your wallet shows your balance as 0.8 BTC. So far, so normal.

Now you want to send 0.4 BTC to someone. Your wallet cannot just "deduct 0.4 from your balance." It has to construct a transaction that consumes one or more existing UTXOs as inputs, sums to at least 0.4 (plus a fee), and produces outputs. There are several options:

- Use the 0.5 BTC UTXO. Output 0.4 to the recipient, output ~0.0995 back to yourself as change (the rest goes to the miner as fee). The 0.5 UTXO is destroyed; the 0.3 UTXO sits untouched.
- Use the 0.3 BTC UTXO and the 0.5 BTC UTXO together. Output 0.4 to the recipient, output ~0.3995 back to yourself. Both old UTXOs destroyed; one new change UTXO created. This is more expensive in fees because the transaction is bigger (more inputs = more bytes).

Your wallet picks one of these strategies on your behalf. After the transaction, your "balance" is the same number it would be in an account-model system, but the underlying state is different: in the first option, you now have a 0.3 UTXO and a 0.0995 UTXO. In the second, you have a single 0.3995 UTXO. These are not interchangeable from a privacy standpoint — they reveal different things about you to chain analysts — but they spend the same. This is the kind of thing the UTXO model forces you to think about and the account model hides.

## Uncomfortable question

You can recite "not your keys, not your coins" as a slogan, but consider this honestly: if you held your life savings in self-custody, on a hardware wallet, with a seed phrase written on paper and stored somewhere safe — could you confidently say what would happen to that bitcoin if you died tomorrow, in a way that your spouse, kids, or executor could actually act on? Most people who hold their own keys cannot. Their plan is implicitly "I will outlive any need for a contingency plan." This is the same kind of magical thinking they criticize fiat-holders for, just pointed in a different direction. So either build the inheritance plan, or admit that "self-custody" in your case is really "self-custody during my lifetime, and a coin flip after." Both are fine. Just be honest about which one you actually have.
