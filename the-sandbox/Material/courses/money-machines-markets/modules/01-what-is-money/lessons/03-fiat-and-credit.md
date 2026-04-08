---
id: 03-fiat-and-credit
title: Fiat, Credit, and the Modern Banking Stack
order: 3
estimatedMinutes: 30
learningOutcomes:
  - Explain that most "money" is bank credit, not cash.
  - Describe fractional reserve banking accurately, without the conspiratorial framing.
  - Sketch the central bank → commercial bank → you stack and identify where money is actually created.
  - Define M0, M1, M2 well enough to use them in an argument.
concepts:
  - fiat
  - fractional-reserve
  - central-bank
  - money-creation
  - m0-m1-m2
  - credit
---

## Reading

Here is a thing that almost nobody is taught in school and that almost everyone gets wrong on first hearing: **most of what you call "money" is not cash, and was not printed by the government. It was created by a private bank when somebody took out a loan.**

Read that twice. Then let's slow it down.

When you go to a commercial bank — JPMorgan, Wells Fargo, your local credit union — and you take out a $300,000 mortgage, the bank does not go to a vault and remove $300,000 in physical cash to hand to the seller. It does not even take $300,000 from another customer's deposit account and route it to the seller. What it does is much stranger and much more important: **the bank creates the $300,000 by typing it into existence in your account, and balances the books by recording your loan as an asset on its side of the ledger.** New money, where there was none, conjured by an accounting entry. The Bank of England published a famous paper in 2014 saying exactly this in plain English, and it shocked a lot of people who had been confidently teaching otherwise for decades.

This is what *fiat money in a credit-based banking system* actually means. The currency unit is the dollar. The dollar is a debt instrument issued by the Federal Reserve (look at a physical bill — it literally says "Federal Reserve Note" on it). But the *vast majority* of dollars in existence at any moment are not Federal Reserve Notes. They are commercial bank deposits — entries in the databases of commercial banks — created by lending.

The categories economists use to describe this:

- **M0** (sometimes called the *monetary base*): physical cash in circulation plus commercial bank reserves held at the central bank. This is the only money the central bank actually creates directly.
- **M1**: M0 plus checkable deposits at commercial banks. This is what you'd think of as "money in your checking account."
- **M2**: M1 plus savings deposits, money market funds, and other near-cash. This is the broadest commonly-used measure.

In the US in 2026, M0 is roughly an order of magnitude smaller than M2. The "money supply" you hear about in the news is mostly bank credit, not central bank cash.

This has consequences that take a while to sink in.

**First**, the central bank does not directly control how much money exists. It controls the *base*, and it sets *interest rates* and *reserve and capital requirements* that influence how aggressively commercial banks lend. But the actual expansion or contraction of the broad money supply happens at the commercial banks, in the form of loans. When loans are made, money is created. When loans are paid off or written off, money is destroyed. The system is more decentralized than the cartoon ("the Fed prints money") suggests, and also more fragile, because if banks stop lending — for whatever reason — the money supply *contracts* even if the central bank is doing nothing.

**Second**, "fractional reserve" is a slightly misleading name. The textbook story is: a bank takes in $100 in deposits, is required to hold (say) 10% in reserve, and lends out the other $90, which gets re-deposited at another bank, which lends out 90% of *that*, and so on. This is the "money multiplier" model. It is taught in high school economics and is basically wrong as a description of how modern banks work. Real banks don't lend out deposits. They make loans first (creating new deposits in the process) and then *find* the reserves they need afterward, often by borrowing from the central bank or from each other. The reserve constraint is real but it operates differently than the textbook implies.

**Third**, this means inflation is not just "the government printing money." Inflation in a credit-based system is a function of (a) base money creation, (b) the willingness of commercial banks to extend credit, and (c) the willingness of borrowers to take credit. All three knobs matter. When central banks did massive *quantitative easing* (QE) after 2008, they expanded the base by trillions of dollars and a lot of people predicted hyperinflation. It didn't come — at least not for over a decade — because commercial bank lending didn't expand proportionally and a lot of the new base money sat as bank reserves rather than entering the broader economy. The 2020 round of stimulus *did* produce significant inflation, partly because that round bypassed banks and put money directly in people's accounts.

**Fourth**, and this is the part that actually matters for the rest of the course: **a credit-based fiat system is structurally biased toward expansion**. Loans create money. Loans pay interest. Interest has to come from somewhere. The system runs as long as new credit is being created somewhere to service old credit. When credit creation slows, the system starts to seize up — and the central bank's response, every time, has been to make more credit cheaper or more available. This is not a conspiracy. It is the logic of the system. It is also why the long-term direction of fiat currency purchasing power is *down*, slowly, with occasional sharp moves.

None of this is a moral argument. It is not "fiat bad, gold good" or "fiat bad, Bitcoin good." It is just how the system works. Whether that system is the best available arrangement is exactly the question Bitcoin and stablecoins and CBDCs all attempt, in different ways, to re-open.

## Concrete example

In March 2023, Silicon Valley Bank failed. The official narrative was about interest rate risk and a tech-industry deposit run, which is true as far as it goes. But the more interesting layer is what happened next: the Federal Reserve created a new lending facility (the BTFP) within days that allowed banks to borrow against their bond portfolios *at par* — that is, at face value — even though those bonds had lost market value. In effect, the Fed stepped in and said: we will treat your underwater assets as if they were fully valued, so that you don't have to sell them and crystallize losses, which would have triggered more bank failures.

The size of this facility eventually grew into the hundreds of billions of dollars. The point is not whether it was the right call. The point is that the credit system, when stressed, gets backstopped by *new base money creation* by the central bank, every single time. This is the structural bias toward expansion in action. Anyone who tells you the Fed just sits and watches is not paying attention.

## Uncomfortable question

If most "money" is bank credit created by lending, and if the system structurally requires credit expansion to keep functioning, then "store of value" is a function the unit cannot really perform over very long horizons. You can hold dollars and they will mostly hold their value year-to-year. You cannot hold dollars over forty years and expect them to buy what they buy today. Knowing this, what is the actual mechanism by which a normal middle-class person is supposed to save for a 40-year retirement? And: is the answer they are usually given (stocks, bonds, real estate) actually a savings strategy, or is it a forced-investment strategy disguised as one?

This is the question people get most defensive about. It's worth sitting with.
