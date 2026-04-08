---
id: 02-hitech-and-breach-notification
title: HITECH and the Breach Notification Rule
order: 2
estimatedMinutes: 35
learningOutcomes:
  - Explain HITECH's additions on top of HIPAA, including breach notification, business associate liability, and the civil monetary penalty tiers.
  - Apply the Breach Notification Rule to a scenario — what counts as a breach, who must be notified, by when, and what the notice must include.
  - Identify the 500-record threshold and its consequences (HHS, prominent media, the "Wall of Shame").
  - Connect HITECH to Meaningful Use as the same statute and explain why the cross-reference matters.
concepts:
  - hitech-act
  - hitech-breach-notification
  - breach-definition
  - notification-timing
  - five-hundred-record-threshold
  - wall-of-shame
  - cmp-tiers
  - business-associate-direct-liability
  - meaningful-use
  - encryption-safe-harbor
---

## Reading

The **Health Information Technology for Economic and Clinical Health Act (HITECH)** was enacted in February 2009 as part of the American Recovery and Reinvestment Act. HITECH did two things that mattered enormously and that the boards expect you to know cold. First, it created the Meaningful Use program — the financial incentives that drove EHR adoption from a minority of U.S. providers in 2008 to near-universal by 2015 (cross-reference Module 1, where Meaningful Use was introduced as the lever that produced the modern EHR landscape). Second, it strengthened HIPAA in several specific ways: it created the Breach Notification Rule, it gave business associates direct HIPAA liability, it raised civil monetary penalties dramatically and structured them into tiers, and it added several new patient rights.

Memorize the cross-reference. **HITECH and Meaningful Use are the same statute.** The boards quietly test whether you know this. A stem that asks about "the law that established the Meaningful Use incentive program" and a stem that asks about "the law that established the breach notification rule" have the same answer. The fact that the same statute did both is not a coincidence — HITECH's incentives for EHR adoption came bundled with the privacy and security strengthening that the architects of the law thought was necessary to make patients comfortable with the resulting digitization. The two halves were politically and substantively linked.

### What HITECH added on top of HIPAA

**Breach notification.** Before HITECH, HIPAA had no federal breach notification requirement. Several states had their own breach notification laws (California's was the most influential), but at the federal level, a covered entity that lost PHI was not required to tell anyone. HITECH closed that gap with the **Breach Notification Rule**, finalized by HHS in 2009 and amended in 2013. Details below.

**Business associate direct liability.** Before HITECH, HIPAA's obligations on business associates flowed entirely through the BAA — the contract between the covered entity and the business associate. If a business associate violated HIPAA, the covered entity could sue for breach of contract, but HHS could not penalize the business associate directly. HITECH changed this. After HITECH, business associates are directly liable to HHS for HIPAA violations and can be assessed civil monetary penalties on the same scale as covered entities. The 2013 Omnibus Rule (the regulation that finalized HITECH's HIPAA changes) extended direct liability to subcontractors of business associates as well, and required BAAs to be updated to reflect the new structure.

**Civil monetary penalty tiers.** HITECH replaced HIPAA's flat penalty structure with a four-tier system based on the level of culpability. The exact dollar amounts are adjusted annually for inflation and have changed several times since HITECH was passed. The structure to memorize is the *tiers*, not the dollar amounts:

1. **Tier 1** — the covered entity did not know and, by exercising reasonable diligence, would not have known of the violation. Lowest per-violation penalty range.
2. **Tier 2** — the violation was due to reasonable cause and not to willful neglect. Moderate per-violation penalty range.
3. **Tier 3** — the violation was due to willful neglect, but the covered entity corrected the violation within 30 days of discovery. Higher per-violation penalty range.
4. **Tier 4** — the violation was due to willful neglect and was not corrected within 30 days. Highest per-violation penalty range.

There is also an annual cap on penalties for identical violations, which was clarified and (effectively) reduced by HHS in 2019 in response to a 2014 federal court ruling about how the statutory caps should be read. The boards do not test the dollar caps; they test the tier structure and the principle that willful neglect is the worst case and that prompt correction matters.

**New patient rights.** HITECH added several rights, most notably the right to receive an electronic copy of ePHI maintained electronically and the right to restrict disclosure to a health plan for items the patient paid out of pocket in full. Both of these built on existing HIPAA rights.

**Encryption safe harbor.** HITECH established that PHI encrypted in accordance with HHS guidance is *not* considered "unsecured PHI" and is therefore exempt from the breach notification requirement. This is the regulatory carrot that drove encryption from "addressable" in the Security Rule to a near-universal practice. A laptop containing encrypted PHI that is lost or stolen does not trigger breach notification; an unencrypted laptop with the same PHI does. The financial and reputational consequences of this difference are large, and they are why every major institution has standardized on disk encryption for portable devices.

### The Breach Notification Rule

A **breach** is defined as the acquisition, access, use, or disclosure of PHI in a manner not permitted by the Privacy Rule that compromises the security or privacy of the PHI. The 2013 Omnibus Rule changed the standard. Before 2013, a breach was only reportable if it posed a "significant risk of harm" to the individual — a standard that was easy for institutions to use to argue away most incidents. After 2013, the standard is reversed: an impermissible use or disclosure is *presumed* to be a breach unless the covered entity demonstrates, through a four-factor risk assessment, that there is a low probability that the PHI has been compromised. The four factors are:

1. The nature and extent of the PHI involved (the types of identifiers and the likelihood of re-identification).
2. The unauthorized person who used the PHI or to whom the disclosure was made.
3. Whether the PHI was actually acquired or viewed.
4. The extent to which the risk to the PHI has been mitigated.

The shift in the burden of proof matters. Pre-2013, an institution could keep an incident off the books by arguing it did not pose a significant risk. Post-2013, the institution has to do the four-factor analysis and document a low probability of compromise to keep the incident off the books, and the analysis is reviewable by HHS. The boards test the four factors and the post-2013 burden shift.

There are three exceptions where an impermissible use or disclosure does not count as a breach at all:

1. **Unintentional acquisition by a workforce member acting in good faith** within the scope of their authority and not further used or disclosed (the wrong patient's chart accidentally opened by a nurse who immediately closes it).
2. **Inadvertent disclosure between two authorized workforce members** at the same covered entity (a clinician sends a fax to the wrong colleague at the same hospital).
3. **Disclosure where the receiving person would not reasonably have been able to retain the PHI** (a piece of paper handed to the wrong patient who returns it without reading).

These three exceptions are favorites of the boards because they require nuanced application. Memorize them.

### Notification timing and recipients

When a breach occurs, the covered entity must provide notice to several parties on different schedules.

**Notice to affected individuals.** The covered entity must notify each individual whose PHI was breached, by first-class mail (or electronic notice if the individual has agreed) **without unreasonable delay** and in no case later than **60 calendar days** from the discovery of the breach. The 60-day clock is the most-tested deadline in this lesson. Discovery means the date the covered entity knew or, by exercising reasonable diligence, should have known of the breach.

The notice must include: a description of what happened, including the date of the breach and the date of discovery; the types of PHI involved; the steps the affected individuals should take to protect themselves; what the covered entity is doing to investigate, mitigate harm, and prevent recurrence; and contact information.

**Notice to HHS.** All breaches must be reported to HHS. The timing depends on the size:

- For a breach affecting **fewer than 500 individuals**, the covered entity must report to HHS no later than **60 days after the end of the calendar year** in which the breach was discovered. Smaller breaches are batched annually.
- For a breach affecting **500 or more individuals**, the covered entity must report to HHS contemporaneously — at the same time it notifies the affected individuals, no later than **60 days after discovery**.

**Notice to prominent media.** For a breach affecting **500 or more residents of a state or jurisdiction**, the covered entity must notify prominent media outlets serving that state or jurisdiction, again within 60 days of discovery. This is the requirement that produces the news stories.

**The 500-record threshold and the "Wall of Shame."** Breaches affecting 500 or more individuals are publicly listed on HHS's breach reporting website. The site is officially called the Breach Portal and unofficially the "HIPAA Wall of Shame" or "Wall of Shame." Once a breach lands on the Wall of Shame it is searchable by name forever, and the reputational consequences are part of why the 500-record threshold is the inflection point in institutional response. The boards test the threshold (500), the consequence (HHS public listing plus media notice), and the informal name.

**Notice by a business associate.** If a breach occurs at a business associate, the business associate must notify the covered entity (not directly notify the affected individuals) without unreasonable delay and in no case later than 60 days from discovery. The covered entity then triggers its own notification process. A well-drafted BAA will require a much faster internal notification — most institutions require their business associates to notify them within a small number of days, sometimes within 24 hours, so that the covered entity has time to investigate and meet its own deadlines. The boards test the legal floor (60 days) and reward you for knowing that operational practice should be much tighter.

## Concrete example

A 240-bed community hospital discovers on October 5 that a USB drive containing an unencrypted spreadsheet with names, dates of birth, medical record numbers, and recent diagnoses for 1,200 patients was left in the cafeteria the previous Friday and is missing. The IT team confirms the drive was used by an analyst on Wednesday for a quality improvement project and was not encrypted because the analyst's laptop policy required encryption only for laptops and not for USB drives.

Walk the analysis.

**Is it a breach?** Yes. The acquisition status of the drive is unknown — it might have been thrown away, or it might have been picked up by someone who has the data. The four-factor analysis weighs against the institution: PHI was identifiable (names, DOB, MRN, diagnoses are all on the 18-identifier list); the unauthorized person who may have acquired the PHI is unknown; whether the PHI was viewed is unknown; mitigation is impossible because the drive cannot be retrieved. The institution cannot demonstrate a low probability of compromise. The presumption of breach stands.

**Does the encryption safe harbor apply?** No. The drive was unencrypted. If it had been encrypted to HHS guidance, the breach notification rule would not have been triggered at all. This single design decision — encrypt USB drives, not just laptops — would have eliminated the entire incident. The boards reward you for naming the safe harbor and naming the design choice.

**Who must be notified, and by when?**

- The 1,200 affected individuals, by first-class mail, no later than 60 days from discovery (December 4). The notice must include the standard required content.
- HHS, no later than December 4, contemporaneously with individual notice, because the breach affects 500 or more individuals.
- Prominent media outlets serving the state/jurisdiction, no later than December 4, because the breach affects 500 or more residents.
- The breach will be listed on the HHS breach reporting website (the Wall of Shame).

**What is the institution's exposure?** Civil monetary penalties depend on the tier. The initial assessment will look at whether the institution exercised reasonable diligence. The encryption decision is the focus: if the institution had a documented policy that addressable encryption was assessed and rejected for USB drives because of an asserted alternative, the case sits in tier 1 or tier 2. If the institution had no such documentation — if it simply never thought about USB drives — the case slides toward tier 3 or tier 4 depending on whether the gap is characterized as reasonable cause or willful neglect. The presence or absence of a written risk analysis is what determines which tier the case lands in. The boards do not test the dollar amounts, but they reward you for knowing that the documented analysis is what saves the institution from the higher tiers.

**What does the response look like operationally?** The institution must investigate the incident, document the four-factor analysis and the conclusion that it is a breach, draft and send the individual notices, draft and send the HHS notice, draft and send the media notice, document the corrective action (almost certainly: encrypt all USB drives, retire unencrypted media, retrain workforce, audit), and prepare for the HHS investigation that often follows a 500-plus breach. The corrective action is the part that determines whether the institution looks like it has internalized the lesson or whether it does not.

## Uncomfortable question

The HIPAA breach notification regime is the most successful piece of federal health privacy enforcement in the law's history, and it is also the source of an enormous amount of compliance theater. Hospitals send breach notification letters that the recipients do not read. The Wall of Shame lists thousands of breaches and the public attention it generates is concentrated on the largest few. Civil monetary penalties for individual breaches are usually small compared to the cost of the response, and the institutions that face the largest penalties are often the ones whose underlying security postures were already known to be weak. The Change Healthcare ransomware breach of 2024 affected something close to a third of the U.S. population and was, by any measure, one of the largest healthcare data breaches in history, and the institutional consequences are still being worked out. Has the breach notification regime accomplished what it was designed to do — meaningful improvement in health data security — or has it produced a paper-and-postage industry around incidents the regulatory structure cannot actually prevent? The honest answer matters because it determines whether your institution should focus on improving the *response* to breaches (faster notification, better letters, cleaner four-factor analyses) or on the *prevention* (encryption discipline, network segmentation, ransomware preparedness) that the regime measures only indirectly.

Hold your answer.
