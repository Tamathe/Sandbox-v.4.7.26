---
id: 03-cures-act-information-blocking
title: The 21st Century Cures Act and the Information Blocking Rule
order: 3
estimatedMinutes: 40
learningOutcomes:
  - State what the 21st Century Cures Act is, when it was enacted, and what its information blocking rule prohibits.
  - Recite the eight information blocking exceptions by name and apply each to a scenario.
  - Distinguish information blocking from a HIPAA disclosure refusal — they are different rules with different defaults.
  - Connect the Cures Act information blocking rule to TEFCA, the FHIR API requirements, and the trajectory of patient access rights.
concepts:
  - cures-act
  - information-blocking
  - eight-exceptions
  - preventing-harm-exception
  - privacy-exception
  - security-exception
  - infeasibility-exception
  - health-it-performance-exception
  - content-and-manner-exception
  - fees-exception
  - licensing-exception
  - tefca
  - fhir-api-requirement
  - cures-act-history
---

## Reading

The **21st Century Cures Act** was enacted in December 2016. The law is large and covers many things — accelerated drug approval pathways, mental health funding, the BRAIN initiative, opioid response funding — but the part that matters for clinical informatics is Title IV, the section on health information technology. Title IV does several things, but the part that the boards test most directly is the **information blocking rule**, finalized by the Office of the National Coordinator (ONC) in 2020 with enforcement that took effect in stages from April 2021 onward.

The information blocking rule is the single biggest change in U.S. health information policy since HITECH. Where HIPAA's default is "PHI is restricted; here are the permitted uses," the Cures Act's default is reversed: PHI must be shared with patients and with other authorized parties unless one of a small set of specific exceptions applies. The flip in default is the structural fact to internalize. HIPAA tells you when you *may* disclose; the information blocking rule tells you that you *must* facilitate access unless you can name an exception that justifies not doing so. The two regimes coexist and are not in conflict, but they pull in different directions, and the cultural transition from "default no" to "default yes" has been the hardest part of operationalizing the rule.

### What information blocking is

ONC's regulatory definition: **information blocking** is a practice by an actor (a healthcare provider, a health IT developer of certified health IT, a health information network, or a health information exchange) that, except as required by law or covered by an exception, is likely to interfere with, prevent, or materially discourage access, exchange, or use of electronic health information.

Three things to memorize from the definition.

**Who the actors are.** Information blocking applies to four categories of actors: healthcare providers, certified health IT developers, health information networks, and health information exchanges. The list does not include patients, payers (in their payer capacity), or business associates as such. The actor list is testable.

**What "electronic health information" means.** EHI is defined by reference to the HIPAA designated record set. In practice, after October 6, 2022, "electronic health information" for information blocking purposes means the full electronic designated record set — essentially the full electronic chart, not just the limited data set defined by the United States Core Data for Interoperability (USCDI). Before October 2022, the rule applied only to USCDI. The expansion is the part most institutions are still catching up with.

**The intent standard varies by actor.** For healthcare providers, the standard is that the practice is likely to interfere with access *and* the provider knew that the practice was unreasonable and likely to interfere. For health IT developers, exchanges, and networks, the standard is that the practice is likely to interfere *and* the actor knew or should have known that the practice was likely to interfere. The "knew or should have known" standard is harder to defend than the provider's "knew" standard, which is one reason vendors have driven the operational compliance more aggressively than providers.

### The eight exceptions — memorize the names

The information blocking rule is structured as a default ("you must not interfere with access") plus a list of specific exceptions that, if met, take a practice out of the information blocking definition. There are **eight exceptions**, organized into two categories: five that involve *not fulfilling requests* and three that involve *procedures for fulfilling requests*. The boards test the eight directly. Memorize the names. You will see questions of the form "in the described scenario, the practice may qualify under which exception?" and the answer requires recall of the list.

The eight, with the canonical brief description:

#### Exceptions for not fulfilling requests (5)

1. **Preventing Harm Exception.** A practice that is reasonable and necessary to prevent harm to a patient or another person, where the actor has a reasonable belief that the practice will substantially reduce a risk of harm and meets specific conditions about the type of risk and the type of harm. The most common example: a clinician determines that releasing a particular test result without prior counseling would cause substantial harm to the patient, and delays release pending counseling. The exception is narrower than it sounds — the harm must be substantial and the practice must be reasonable and necessary, and the exception is reviewed retrospectively against the specific conditions in the rule.

2. **Privacy Exception.** A practice that is required to protect an individual's privacy in specific listed ways — for example, when a state law requires a particular consent before disclosure, when an individual has requested a restriction the actor is honoring, or when the disclosure would be prohibited by federal or state law. The privacy exception is the bridge between information blocking and HIPAA: a disclosure that HIPAA prohibits is not information blocking under the privacy exception.

3. **Security Exception.** A practice that is directly related to safeguarding the confidentiality, integrity, and availability of EHI, that is tailored to the specific security risk, and that is implemented in a consistent and non-discriminatory manner. Limiting access via insecure channels, requiring multi-factor authentication, refusing connections from networks with known malware — all candidates for this exception.

4. **Infeasibility Exception.** A practice in response to a request that the actor cannot fulfill because of one of three sub-conditions: an uncontrollable event (a natural disaster, a public emergency), a segmentation problem (the requested EHI cannot be segmented from other EHI that cannot lawfully be released), or infeasibility under the circumstances (the actor demonstrates through a written analysis that fulfilling the request is infeasible). The infeasibility exception requires the actor to provide a written explanation to the requestor within 10 business days.

5. **Health IT Performance Exception.** A practice that is reasonable and necessary to maintain or improve health IT performance — taking the system down for maintenance, applying patches, addressing performance issues. The exception requires the practice to be limited to the time reasonably necessary, applied in a consistent and non-discriminatory manner, and done through agreements that are reasonable.

#### Exceptions for procedures used in fulfilling requests (3)

6. **Content and Manner Exception.** An actor may limit the content of its response to a request (the EHI it provides) or the manner in which it fulfills the request (the format, the channel) under specified conditions. The exception lets an actor satisfy a request in a different form than requested (e.g., providing a CCDA instead of a custom export) if the actor cannot reasonably provide the form requested and follows the rule's order of precedence.

7. **Fees Exception.** An actor may charge fees for fulfilling requests for EHI under specified conditions — fees must be based on objective and verifiable criteria, must be reasonably related to the costs of providing the EHI, and must not be based on factors like whether the requestor is a competitor. The fees exception does *not* permit charging patients for access to their own EHI through patient-facing apps; that practice is generally information blocking.

8. **Licensing Exception.** An actor may license interoperability elements (APIs, value sets, terminology, etc.) under reasonable and non-discriminatory terms. The exception is the response to the practice of using restrictive licensing as a barrier to interoperability — the actor may charge royalties under specified conditions but may not use licensing to entrench market position.

**Memorize the eight names.** The boards test the list directly with questions of the form "which of the following is NOT an information blocking exception?" and "in the scenario, the practice would be most likely to qualify under which exception?" The mnemonic that works for most candidates is to group them by category: five exceptions for not fulfilling (Harm, Privacy, Security, Infeasibility, Health IT Performance) and three for procedures in fulfilling (Content and Manner, Fees, Licensing). The boards reuse the eight names verbatim, so memorize them as the rule lists them.

### What information blocking is *not*

A few common confusions the boards test by exclusion.

**Compliance with HIPAA is not information blocking.** A disclosure that HIPAA prohibits is not information blocking under the Privacy Exception. The two regimes are designed to be complementary: HIPAA tells you when you may not disclose; the information blocking rule tells you that, when HIPAA permits or requires disclosure, you must facilitate it.

**Following a patient's expressed wishes is not information blocking.** If a patient has restricted access to their own data (within the limits of what HIPAA permits), honoring the restriction is not information blocking.

**Charging a reasonable fee under the Fees Exception is not information blocking.** Charging an unreasonable fee is. The line is the rule's specific criteria for what counts as reasonable.

**A delay that is reasonable and necessary is not information blocking.** A delay that is longer than necessary is.

**Information blocking does not require intent to harm.** The "knew or should have known" standard for vendors and exchanges, and the "knew" standard for providers, are about knowledge that the practice was likely to interfere, not about intent to cause harm. Many institutional practices that were not designed to block information turn out to be information blocking under the rule because the actor knew or should have known the practice would interfere.

### The cross-references

**TEFCA (Module 3).** The Cures Act also authorized the Trusted Exchange Framework and Common Agreement, the federal effort to create a national-scale network-of-networks for health information exchange. TEFCA and the information blocking rule are complementary: TEFCA provides the technical and governance scaffolding for nationwide exchange, and the information blocking rule provides the legal pressure that makes participation worth it. Cross-reference Module 3's TEFCA discussion.

**FHIR API requirements (Module 2).** The Cures Act directed ONC to require certified EHRs to support standardized APIs, and ONC's implementing rules specified FHIR as the API standard. The certified EHR API requirements (the "patient access API," the "provider access API," the "bulk data API") are the technical surface through which the information blocking rule's "must facilitate access" obligation is operationalized. A vendor whose certified EHR cannot support the required FHIR APIs is in violation of certification, and a provider whose configuration of a certified EHR prevents patients from using those APIs is at risk for information blocking. Cross-reference Module 2 lesson 4 (FHIR) for the technical layer.

**The patient access trajectory (Module 7 lesson 1).** Read the timeline as a single sweep. HIPAA 1996: patients may request a paper copy of their PHI. HITECH 2009: patients may request an electronic copy of ePHI maintained electronically. Cures Act 2016 / ONC enforcement 2020+: obstructing access is itself a federal violation. Each step expanded the right and made obstruction harder. The cultural transition from "default no" to "default yes" is the work the field is still doing.

### Enforcement

Enforcement of information blocking is split. The HHS Office of Inspector General (OIG) has authority to impose civil monetary penalties on health IT developers, networks, and exchanges that engage in information blocking, with maximum penalties of up to $1 million per violation. The penalty structure for healthcare providers is different and has been the subject of separate rulemaking — providers face "appropriate disincentives" rather than direct CMPs, with the disincentives administered through CMS programs such as Medicare reimbursement and Promoting Interoperability. The exact provider disincentive structure was finalized in 2024 and is still being operationalized.

The boards do not test the exact enforcement amounts (they have changed and will change again). The boards test the structure: OIG penalizes vendors and exchanges with CMPs; CMS administers disincentives for providers through reimbursement programs; the two together create the legal pressure that backs the rule.

## Concrete example

A patient sends a message through her health system's patient portal requesting that her recent imaging studies — a full MRI brain study with contrast — be released to her so she can share them with a second-opinion neurologist at another health system. The radiology department's standard practice is to require patients to come in person and sign a release form, then to provide the images on a CD that takes 3–5 business days to produce, with a $25 fee for the CD.

Walk the analysis under the information blocking rule.

**Is this information blocking?** Probably yes, on multiple grounds.

- The requirement to come in person is a barrier that is unlikely to qualify under any exception. The patient has authenticated through the portal; requiring an additional in-person visit is a delay and discouragement that is not "reasonable and necessary" under any of the eight exceptions.
- The 3–5 business day delay is longer than necessary if the imaging is already in PACS and could be released through a portal-integrated mechanism. A delay that is "reasonable and necessary" to operations might fit the Health IT Performance exception, but the 3–5 days for CD burning does not — the underlying images are already accessible.
- The $25 fee, charged to the patient for access to her own EHI, is generally not permitted under the Fees Exception. The Fees Exception explicitly does not permit charging individuals for access to their own EHI through patient-facing means.
- The CD-only delivery is a Content and Manner problem. If the patient requested electronic delivery (which a portal request implicitly does) and the institution can reasonably provide it electronically, providing CD-only is an unreasonable manner restriction.

**What is the right operational response?** The health system should provide the images electronically — through the portal, through a FHIR-based imaging API if available, or through a secure file transfer mechanism — without an in-person visit, without a fee, and within a reasonable time frame. The CD-on-paper-form workflow is a legacy of the pre-Cures era and is now actively non-compliant.

**What if the radiologist is concerned about the patient receiving the images without a clinician explaining them?** The Preventing Harm Exception could apply *if* the radiologist has a reasonable belief that releasing the images without prior counseling would substantially reduce a risk of harm and the practice meets the specific conditions. For most imaging this will not meet the bar. For a finding of metastatic cancer in a patient who has not been told the diagnosis, it might. The exception is narrower than clinicians often think it is, and the boards test the boundary.

**What if the second-opinion neurologist requests the images directly?** A request from another provider for treatment purposes is permitted under HIPAA's TPO without authorization, and the information blocking rule's default is that such requests must be facilitated. The same exceptions apply, but the bar for refusing is the same — there must be a recognized exception. "We do not share with that other system because we are competitors" is exactly the kind of practice the rule was designed to prohibit and would not qualify under any exception.

## Uncomfortable question

The information blocking rule's premise is that patients and clinicians should have unobstructed access to electronic health information, and that the historical patterns of restriction were rooted in market self-interest rather than in clinical or privacy concerns. The premise is largely correct. It is also true that the specific implementation — the eight exceptions, the enforcement structure, the post-2022 expansion to the full designated record set — has produced a meaningful workload of compliance interpretation, has surfaced genuine tensions in cases where clinicians feel that immediate release of test results harms patients (the BRCA result that hits the portal before the genetic counselor can call), and has not been accompanied by the operational infrastructure to support the cultural transition. As an informaticist on the access committee, you will be asked to draw lines between "the clinician is reasonably worried about harm" and "the clinician is uncomfortable with the new default and is reaching for the Preventing Harm exception to restore the old workflow." Those two cases look identical from outside and very different from inside. How do you tell them apart, and what is your obligation when you suspect the clinician is in the second case but cannot prove it? The boards test the eight exceptions. The job tests the discernment.

Hold your answer.
