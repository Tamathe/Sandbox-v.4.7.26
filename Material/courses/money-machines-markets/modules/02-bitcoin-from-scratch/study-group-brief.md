---
moduleId: 02-bitcoin-from-scratch
type: study-group
format: trace-a-transaction
durationMinutes: 60
---

# Module 2 — Study Group: Trace a Transaction End to End

## Format

Groups of three. You will pick a single real Bitcoin transaction from a public block explorer and trace it through every concept the module introduced. The output is a one-page annotated walk-through that you submit jointly to the discussion thread. The point is not to find an "interesting" transaction. The point is to find a *boring* one and discover that nothing about it is actually boring once you look closely.

## What you'll need

- A laptop with a browser per group (one is enough; people can crowd around).
- Access to any public Bitcoin block explorer. Suggested: `mempool.space` or `blockstream.info`. Both are free, both show real-time data, neither requires an account.
- A shared document (Google Doc, HackMD, Notion — any of them) for the group's annotated walkthrough.

## Structure (60 minutes total)

1. **Pick the transaction (5 min)** — Open the block explorer. Click on the most recently confirmed block. Pick *any* transaction in it that has at least two inputs and at least two outputs. Do not pick the coinbase transaction (the special miner-reward transaction at the top of the block). Copy the transaction ID into your shared document.

2. **Annotate the structure (15 min)** — Together, identify and label:
   - The transaction ID and the block it landed in.
   - Each input: which prior transaction's output is being consumed, and what its value was.
   - Each output: the address it pays to and the value paid.
   - The fee paid (sum of inputs minus sum of outputs).
   - The fee rate in sats/vByte.
   - Whether you can identify which output is "change" and which is the "real" payment, and what hint you used (often the change goes back to an address that looks like the input addresses; this is the same heuristic chain analysts use).

3. **Trace one input back two hops (10 min)** — Pick *one* of the inputs. Click through to the transaction that created it. Now look at *that* transaction's inputs. Where did the funds in that one come from? Note: at some point, if you keep going, you will eventually reach a coinbase transaction — that is the moment those particular bitcoin came into existence. You don't have to go that far; two hops is enough to internalize the lesson that every UTXO has a traceable lineage.

4. **The thought experiment (10 min)** — Without looking it up, the group discusses and writes down: *if Alice (the sender) had wanted to combine three smaller UTXOs instead of the ones she actually used, how would that have changed the transaction's size, fee, change output, and what an observer could infer about her wallet?* You don't need to be precise. You need to think through what the UTXO model forces a wallet to decide on every transaction.

5. **The uncomfortable observation (10 min)** — Together, discuss and write down: looking at this real transaction on a public block explorer, what could a sufficiently motivated chain analyst learn about its participants — their wallet structure, their approximate net worth, their transaction patterns — that the participants probably didn't consciously consent to leaking? Do not get into "is this good or bad." Just enumerate. The point is to feel the gap between "Bitcoin is private" (a slogan many beginners absorb) and "Bitcoin is pseudonymous and the public ledger reveals more than people realize" (the actual situation).

6. **Submit (10 min)** — Polish the shared document into a one-page annotated walkthrough. Include: the transaction ID, the labeled inputs and outputs, the two-hop trace, the thought experiment paragraph, and the chain analysis paragraph. Post it to the module discussion thread tagged `#study-group-mod2`.

## Rules

- Do not look up "how to read a Bitcoin transaction" guides during the session. Use the lessons. If you get stuck, the right move is to look at the explorer fields more carefully, not to find a tutorial that does the work for you.
- The chain analysis paragraph (step 5) is *not* an opportunity to perform either Bitcoin maximalism or Bitcoin skepticism. It is an opportunity to enumerate what is actually visible. Stick to "an observer could see X, which implies Y" rather than commentary about whether that's good or bad.
- Disagreements within the group about what an output represents are *expected and welcome*. If everyone agrees on first reading, you have probably picked a transaction that's too simple. Try a more complex one.

## Why this format

The fastest way to convert "I read the lessons" into "I actually understand the system" is to put your finger on a real artifact and discover how much of what you read is sitting right there in the explorer view. Most students go through this exercise and have at least one moment where they say "oh — *that's* what a UTXO is." That moment is the point. It is also the moment where the privacy reality of Bitcoin (as opposed to the privacy *story*) becomes physical instead of abstract, and that conversion is one of the most useful things you can do before Module 3.
