---
id: 05-energy-and-moral-arithmetic
title: Energy and Moral Arithmetic
order: 5
estimatedMinutes: 25
learningOutcomes:
  - State the actual energy footprints of Bitcoin and frontier AI without inflating or deflating them.
  - Distinguish energy use from carbon emissions and explain why the distinction matters.
  - Apply a consistent moral framework to both technologies instead of cherry-picking.
concepts:
  - energy-mix
  - stranded-energy
  - marginal-emissions
  - whataboutism
  - opportunity-cost
---

## Reading

This is the lesson where most courses cheat. They cheat in one of two directions. Either they pick a number for Bitcoin's energy use that is technically true and rhetorically misleading ("Bitcoin uses more electricity than Argentina!"), or they pick a counter-number that is also technically true and rhetorically misleading ("Bitcoin runs on stranded renewables that would have been wasted!"). Both of those are commonly heard. Both contain a sliver of truth. Neither is the honest answer. The honest answer requires doing the arithmetic carefully and applying the same arithmetic to both Bitcoin and AI, which is the part nobody wants to do.

Let's start with the numbers.

**Bitcoin** in 2026 consumes roughly 150 TWh per year of electricity. For scale: that is about 0.6% of global electricity production, comparable to the residential electricity use of a mid-sized European country. Whether that is "a lot" depends entirely on what you compare it to. It is more than the global gold mining industry. It is less than the world's data centers in aggregate, less than residential air conditioning, less than residential dryers, less than the energy lost as waste heat in long-distance transmission.

**Frontier AI training and inference** in 2026 is harder to pin down, because the numbers change every six months and the largest labs do not publish full figures. Best public estimates put global AI compute electricity use at somewhere between 80 and 200 TWh per year, with inference (running models for users) now exceeding training (building them) by a wide margin. The growth rate is the more interesting number: AI electricity use is doubling roughly every 18 months. Bitcoin's electricity use grows much more slowly, because it is structurally bounded by the security budget, which is bounded by the block reward. AI has no such bound.

So in 2026, Bitcoin and AI are roughly the same order of magnitude in electricity. By 2028 they probably won't be.

Now the part that most people skip. **Energy use is not the same as carbon emissions.** A terawatt-hour of hydroelectric power and a terawatt-hour of coal are wildly different in climate impact. Bitcoin mining has one unusual property here: because it is location-flexible and price-sensitive, it gravitates to the cheapest available electricity, which is increasingly stranded renewables — flared natural gas in west Texas, hydropower in Sichuan during the wet season, geothermal in Iceland, wind that would otherwise be curtailed. Recent estimates put the renewable share of Bitcoin mining at somewhere between 50% and 60%, higher than the global grid average. AI compute, by contrast, runs in fixed-location data centers that draw from the local grid, which in most places is dirtier than Bitcoin's mix. AI's marginal emissions per kWh are usually higher.

That last sentence will surprise people who have absorbed the conventional wisdom that Bitcoin is a climate disaster and AI is just innovation. The conventional wisdom is wrong on both halves.

Now the harder part. **Marginal emissions** is the right unit, not average emissions. When you fire up a data center in Virginia, you don't run it on the average grid mix — you run it on whatever the grid had to spin up to meet the new load, which is almost always natural gas peakers, sometimes coal. The marginal carbon intensity of new electricity demand is much higher than the average. This applies to both Bitcoin and AI. It is one of the most important and least understood points in the whole energy debate.

And the *moral arithmetic* part. Even granting all the numbers above, the question of whether the energy is *worth it* depends on what the energy buys. Here is where I have to be honest about my own discomfort.

The Bitcoin energy use buys: a globally accessible, censorship-resistant, hard-money settlement layer with no central operator. Whether you value that depends on whether you think the world needs such a thing. Reasonable people disagree.

The AI energy use buys: a rapidly improving general-purpose intelligence layer that is being deployed across most of the economy. Whether you value that depends on whether you think the deployment is net positive. Reasonable people disagree.

The whataboutism trap is to defend either by attacking the other. *"Bitcoin uses electricity but so does AI."* Yes, and? Each technology has to justify its own footprint on its own terms. The fact that another technology is also energy-intensive is not a defense. Neither is the fact that other parts of the economy use more total energy. **Opportunity cost is real.** A terawatt-hour of electricity used by a Bitcoin mine is a terawatt-hour not used to electrify a building, decarbonize a steel mill, or run a hospital. The same is true of AI inference.

The honest framework I've landed on, and I am not certain it's right:

1. State the energy number accurately, in the right units, without rhetorical inflation or deflation.
2. Distinguish energy from emissions and use marginal emissions where possible.
3. Apply the same standard to every technology, including the ones you like.
4. Ask what the energy *buys*, name it specifically, and let the listener decide whether that purchase is worth its cost.
5. Refuse the whataboutism move in both directions.

If you do this, you will end up in a position where you can defend or attack either technology on the merits and you will lose the ability to wave your team's flag without thinking. That is the point. Energy debates are where epistemic discipline goes to die in this domain, and the only way out is to be more careful than the people on the side you agree with.

## Concrete example

In 2024, a Texas Bitcoin mine signed a deal with the local grid operator to act as a controllable load — running flat-out when there was excess wind generation overnight, throttling down or shutting off entirely when the grid was stressed and consumer demand spiked. During the February 2024 cold snap, that mine and several others curtailed close to 100% of their consumption for several days, freeing up gigawatts for residential heating. This is a real, documented, operational use case for Bitcoin mining as grid flexibility infrastructure. It is also not the dominant use case, and most mines do not operate this way. Both of those things are true. The lazy version of the Bitcoin energy debate ignores the example entirely. The hyped version pretends it is the whole picture. The honest version says: this is a real and underrated upside that exists alongside real and underrated costs, and the net depends on which mines you're counting and how the grid is structured wherever they are.

## Uncomfortable question

Without using the phrase "but what about" or naming the other technology, write three sentences defending the energy footprint of the technology in this lesson you feel more aligned with — *on its own terms*. Then write three sentences criticizing it. If your defense is longer or sharper than your criticism, you have not yet done the exercise honestly. Try again.
