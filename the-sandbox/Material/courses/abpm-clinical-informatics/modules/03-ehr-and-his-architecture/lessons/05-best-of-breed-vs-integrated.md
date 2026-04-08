---
id: 05-best-of-breed-vs-integrated
title: Best-of-Breed vs Integrated — The Strategic Choice That Defines Your Architecture
order: 5
estimatedMinutes: 35
learningOutcomes:
  - Define best-of-breed and integrated EHR strategies precisely and identify each from a stem.
  - Articulate the trade-offs in cost, risk, clinician experience, and integration burden.
  - Explain why the U.S. market consolidated toward integrated platforms in the post-Meaningful-Use era and what that consolidation cost.
concepts:
  - best-of-breed
  - integrated-platform
  - vendor-consolidation
  - epic-cerner-duopoly
  - total-cost-of-ownership
  - vendor-lock-in
---

## Reading

The strategic question every health system has had to answer at least once in the last twenty years is: do we buy our EHR functions from a single vendor (an *integrated* strategy) or from many vendors, each chosen as the best in its category (a *best-of-breed* strategy)? The choice is the most consequential single architectural decision a health system makes and the one most likely to be revisited every five to ten years as the trade-offs shift. The boards test the trade-offs because the trade-offs are real and have not been settled.

## What each strategy is

**Best-of-breed** means buying each functional component from the vendor that is best at it. The hospital might use one vendor for the inpatient EHR, another for the laboratory information system, another for the radiology information system, another for the perioperative system, another for the ED, another for the pharmacy, another for the patient portal, another for the data warehouse. Each vendor is chosen because, at the moment of purchase, it had the strongest product in its category. The vendors are then connected through the integration engine.

**Integrated** (sometimes called *enterprise* or *single-vendor*) means buying as many functions as possible from a single vendor. The hospital uses Epic, or Cerner (now Oracle Health), or Meditech, or Allscripts, for the inpatient EHR, the outpatient EHR, the lab system, the radiology system, the pharmacy, the ED, the patient portal, the data warehouse, and increasingly the billing system. The integration burden is reduced because the components are designed to talk to each other; the trade-off is that no single vendor is the best at everything.

In practice, every hospital is somewhere on the spectrum. Even the most integrated Epic shop has at least a few non-Epic systems (specialty EHRs for ophthalmology, cardiology, dental, etc.; PACS for imaging; certain ancillary systems where the integrated module is too weak). Even the most diversified best-of-breed shop has at least one anchor system that handles most of the workflows. The strategic question is *where on the spectrum*, not whether to adopt a pure version of either extreme.

## The trade-offs the boards test

**Clinician experience.** Integrated systems offer a more consistent user experience — same login, same look and feel, same data visible across modules without switching applications. A clinician moving from the inpatient floor to the outpatient clinic in an integrated environment sees the same chart structure. A clinician in a best-of-breed environment may need to log into three or four different systems during a single shift, with different credentials, different navigation, and different display conventions. The cognitive cost of context-switching is real and is one of the main reasons the integrated strategy has won market share.

**Functional depth.** Best-of-breed systems are usually deeper in their specialty than the equivalent module in an integrated platform. A dedicated cardiology information system from a vendor that has been building cardiology workflows for twenty years will have features the integrated platform's cardiology module does not. The trade-off is that the depth comes at the cost of integration friction. Whether the depth is worth the friction depends on the specialty, the patient volume, and how much the clinicians have customized their workflow around the dedicated system's features.

**Integration burden.** A best-of-breed environment has more interfaces, more transformation work, more places for messages to be lost, and a larger interface team. An integrated environment has fewer interfaces (because more data flows through internal vendor APIs rather than HL7 v2 messages) but is not interface-free — there are always external systems. The integration burden of best-of-breed scales roughly with the number of systems; integrated environments have a smaller burden but are not zero.

**Total cost of ownership.** This one is contested. Vendors selling integrated platforms argue that the TCO is lower because integration costs are reduced and the organization needs only one set of training, support, and upgrade resources. Best-of-breed advocates argue that the TCO is lower because the organization avoids paying premium prices for modules where the integrated vendor is weak and where a free or cheap alternative would do. Both sides have a point. The honest answer for most large health systems is that integrated has lower TCO at scale because the integration costs of best-of-breed grow nonlinearly, but small hospitals and specialty practices may find the opposite.

**Vendor risk and lock-in.** An integrated strategy concentrates risk on a single vendor. If the vendor raises prices, declines in quality, or gets acquired by an entity the hospital does not trust, the hospital has limited options because the migration cost is enormous. A best-of-breed strategy distributes risk across multiple vendors but creates a different dependency on the integration layer and on the institutional knowledge of the interface team. Both strategies have lock-in; they just lock in different things. The boards have asked questions in which a stem describes a vendor acquisition (Cerner being acquired by Oracle in 2022 is the canonical recent example) and asks the implications for an integrated customer.

**Innovation pace.** Best-of-breed environments can adopt new specialty technology faster because the decision is local to one module. Integrated environments adopt new technology at the pace of the integrated vendor's release cycle, which is usually slower. The trade-off is that best-of-breed environments fragment when each specialty adopts on its own timeline, and the resulting architecture becomes harder to manage.

## Why the U.S. market consolidated

In the early 2000s, most U.S. hospitals had heavily best-of-breed environments, partly because no integrated vendor offered a credible product across all the necessary functions and partly because hospitals had built their IT environments incrementally over decades. By 2017 — eight years after HITECH and through Meaningful Use Stages 1, 2, and 3 — the market had consolidated dramatically toward integrated platforms, with **Epic** and **Cerner** (now **Oracle Health**) collectively dominating the large-hospital segment. Several factors drove the consolidation:

- **Meaningful Use certification was easier for integrated vendors.** The certification requirements were complex enough that achieving them across a best-of-breed environment, with each vendor having to certify independently and the ensemble having to function together, was harder than buying an already-certified integrated platform.
- **The interoperability promise didn't pan out.** Hospitals that bet on standards-based interoperability between best-of-breed components found, repeatedly, that the standards were not implemented uniformly and the result was integration projects that never finished. The integrated platforms offered a way out: pay one vendor and let them handle the integration internally.
- **Clinician burnout pressure favored consistency.** As clinician complaints about EHR-related burden mounted, the cognitive cost of context-switching across multiple systems became a visible target. Integrated platforms could promise (and partly deliver) a more uniform experience.
- **Capital concentration.** The integrated vendors had the capital and engineering resources to build features faster than smaller best-of-breed competitors, who often went out of business or were acquired.

The consolidation produced an effective duopoly in large U.S. hospitals — Epic dominant in academic medical centers and large integrated delivery networks, Cerner/Oracle Health dominant in community hospitals and the federal sector. The other vendors (Meditech, Allscripts, AthenaHealth, eClinicalWorks, and several specialty vendors) hold meaningful share in particular segments but are not the default choice for new large enterprise deals. The boards do not require you to know vendor market shares precisely but expect you to know that the U.S. large-hospital market is dominated by Epic and Oracle Health, that this is a recent (post-2010) phenomenon, and that the consolidation has both benefits and costs.

## What the consolidation cost

The consolidation produced real benefits — better integration, more consistent user experience, easier compliance with federal requirements, and a more reliable upgrade path. It also cost real things:

- **Innovation speed.** Specialty workflows that the dominant vendors deprioritize move slowly or not at all. The clinicians in those specialties often live with worse tools than their colleagues did under best-of-breed.
- **Vendor power.** A near-duopoly gives the dominant vendors enormous leverage over pricing, contract terms, and roadmap priorities. Health systems have less bargaining power than they had when the market was fragmented.
- **Geographic and political concentration.** Decisions about how clinical informatics evolves in the U.S. are now substantially made by two private companies' product teams. The field has not entirely come to terms with this.
- **Lock-in.** Migration costs from one integrated platform to another are now measured in hundreds of millions of dollars and multi-year projects. The barrier is not technical; it is the workflow re-engineering, the data migration, and the retraining.

A board move on this topic: when a stem describes a hospital evaluating a vendor change, the question is rarely "which is better" — it is "what are the trade-offs of the change," and the right answer engages the trade-offs honestly rather than picking a winner.

## Concrete example

In 2015, the U.S. Department of Defense awarded a roughly $4.3 billion contract to Cerner (and partners) to replace its multiple legacy EHRs with a single integrated platform (MHS GENESIS). The deployment has been ongoing for more than a decade, has hit numerous safety and usability problems, has required multiple program pauses for remediation, and has reshaped the federal health IT landscape. The Department of Veterans Affairs followed in 2018 with its own decision to migrate from VistA (the clinician-built system from Module 1) to Cerner; that deployment has been even more troubled, with multiple congressional hearings, IG reports, and pauses.

Both decisions are examples of the integrated-platform-replacing-best-of-breed strategy at scale. Both were defended on TCO and interoperability grounds. Both have struggled at the workflow and clinician-experience layers, in ways the textbook trade-off framing predicted but the procurement process did not weigh heavily enough. The boards do not ask about MHS GENESIS or VA Cerner directly, but they do ask about the *kinds* of failures that occur in integrated migrations, and the answer pattern (workflow, training, governance, sociotechnical fit) is the same one that comes back in Module 5.

## Uncomfortable question

If the U.S. market has consolidated to the point where two vendors effectively define what a clinical EHR is, and if the consolidation is unlikely to reverse on its own, what is the right *posture* for a clinical informaticist working inside a system dominated by one of those vendors? Is your job to make the dominant vendor's product work as well as possible, to push it toward improvements, to advocate for alternatives, or some combination — and how do you tell which posture the situation actually calls for?

Hold your answer.
