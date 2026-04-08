---
id: 01-hipaa-privacy-and-security-rules
title: HIPAA — The Privacy Rule and the Security Rule
order: 1
estimatedMinutes: 45
learningOutcomes:
  - State who is a covered entity and who is a business associate under HIPAA, and explain why the distinction matters operationally.
  - Recite the 18 HIPAA identifiers and apply the minimum necessary standard.
  - Distinguish permitted uses and disclosures (TPO) from disclosures that require authorization.
  - Name the three Security Rule safeguard categories and the difference between required and addressable specifications.
concepts:
  - hipaa-privacy-rule
  - hipaa-security-rule
  - covered-entity
  - business-associate
  - phi-eighteen-identifiers
  - minimum-necessary
  - tpo-treatment-payment-operations
  - administrative-safeguards
  - physical-safeguards
  - technical-safeguards
  - required-vs-addressable
  - phi-handling
---

## Reading

HIPAA is the **Health Insurance Portability and Accountability Act of 1996**. The name is misleading — most of what people mean by "HIPAA" is the Privacy Rule and the Security Rule, which were not in the 1996 law itself but in regulations the Department of Health and Human Services published over the following several years (Privacy Rule final 2000, Security Rule final 2003, both amended repeatedly since). The portability half of HIPAA — the part about insurance continuity when you change jobs — is the part the law was originally about, and the part nobody on the boards is going to ask you about. The privacy and security halves are the part that defines the legal terrain you work in every day, and the part the boards test directly.

The structure to memorize is small enough to hold in your head and big enough that most clinicians have never actually held it. There is a Privacy Rule that governs *what you can do with PHI*, a Security Rule that governs *how you must protect electronic PHI*, a category of covered entities the rules apply to, a category of business associates the rules extend to through contracts, a definition of what counts as PHI in the first place, a set of permitted uses, a set of patient rights, and three safeguard categories. Eight chunks. Memorize them as a unit. The boards reuse the structure constantly.

### Who the rules apply to: covered entities and business associates

A **covered entity** under HIPAA is one of three things:

1. A **health plan** (an insurance company, HMO, Medicare, Medicaid, employer-sponsored health plan).
2. A **healthcare clearinghouse** (an organization that processes or facilitates the processing of health information from one format to another, e.g., translating non-standard claims into HIPAA-standard formats).
3. A **healthcare provider** that transmits any health information electronically in connection with a HIPAA-standard transaction (essentially every hospital, clinic, pharmacy, and most physician practices in the United States today).

The "transmits electronically in a standard transaction" qualifier on healthcare providers is technically important and rarely tested. In practice, every healthcare provider you will encounter on the boards is a covered entity.

A **business associate** is a person or organization that performs functions or activities on behalf of, or provides services to, a covered entity that involve the use or disclosure of PHI, but that is not itself a member of the covered entity's workforce. The classic examples: a billing company, a transcription service, a cloud EHR vendor, a data analytics vendor, a law firm with access to PHI, a shredding company. The arrangement is governed by a **business associate agreement (BAA)** — a contract that obligates the business associate to comply with the relevant HIPAA provisions and that creates direct legal liability for the business associate if it does not.

The boards test the covered entity / business associate distinction directly. Two patterns recur:

- A covered entity using a vendor that handles PHI must have a BAA in place. Disclosing PHI to a vendor without a BAA is itself a HIPAA violation. The boards love this fact pattern.
- After HITECH (lesson 2), business associates have direct HIPAA liability and can be penalized directly by HHS, not just sued by the covered entity for breach of contract. Pre-HITECH this was not true. The change matters and is testable.

The third category, sometimes confused with business associate, is the **subcontractor** that a business associate engages — for example, a cloud-storage provider used by an EHR vendor. After HITECH, subcontractors are also subject to HIPAA, and the BAA must flow downstream. The chain extends as far as PHI does.

### What is PHI: the 18 identifiers

**Protected health information (PHI)** is individually identifiable health information held or transmitted by a covered entity or its business associate, in any form or medium. The "individually identifiable" part is operationalized by the **18 HIPAA identifiers** — a list HHS published as part of the Privacy Rule's de-identification standard. If a record contains any of the 18 identifiers along with health information, it is PHI; if it has been stripped of all 18 identifiers (and the covered entity has no actual knowledge that the information could still identify the individual), it qualifies as de-identified under the Safe Harbor method.

Memorize the list. The boards test it directly and reward you for being able to spot the less obvious entries.

1. Names
2. Geographic subdivisions smaller than a state (street address, city, county, ZIP code — though the first three digits of the ZIP can be retained under specific population conditions)
3. All elements of dates (except year) directly related to an individual — birth date, admission date, discharge date, date of death — and all ages over 89 (with ages over 89 aggregated into a single category)
4. Telephone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate or license numbers
12. Vehicle identifiers and serial numbers, including license plate numbers
13. Device identifiers and serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers, including finger and voice prints
17. Full-face photographs and any comparable images
18. Any other unique identifying number, characteristic, or code

The catch-all in #18 is the part that produces nuance. A combination of attributes that does not include any of the first 17 identifiers but that could reasonably identify a specific individual still counts as PHI. The classic example is a small town with one cardiothoracic surgeon: the phrase "the cardiothoracic surgeon at General Hospital" is a unique identifying characteristic even though it does not include a name, address, or any of the other items on the list. The boards test this with a stem describing a small population and a "de-identified" dataset that is in fact still identifiable.

The Safe Harbor method (strip all 18) is one way to de-identify. The other way is the **expert determination method**, in which a qualified statistician applies generally accepted statistical and scientific principles to determine that the risk of re-identification is very small and documents the analysis. Safe Harbor is more common because it is rule-based; expert determination is used when an institution wants to retain more granular data for research and is willing to do the statistical work.

### Minimum necessary

The **minimum necessary standard** says that, for most uses and disclosures of PHI, the covered entity must make reasonable efforts to use, disclose, and request only the minimum amount of PHI needed to accomplish the intended purpose. The standard applies to internal access (the registration clerk does not need to see the operative note) and to external disclosures (the disclosure for payment purposes should include only the data the payer needs to adjudicate the claim).

The minimum necessary standard does *not* apply to:

- Disclosures to or requests by a healthcare provider for treatment purposes.
- Disclosures to the patient (or to a personal representative of the patient) of their own information.
- Uses or disclosures pursuant to an authorization signed by the patient.
- Disclosures required by law.
- Disclosures to HHS for compliance purposes.

The treatment exception is the most important and the most testable. When a covered entity discloses PHI to another provider for treatment purposes — sending the discharge summary to the primary care physician, faxing records to the consulting cardiologist, sharing information at a multidisciplinary tumor board — the minimum necessary standard does not constrain the disclosure. The clinical judgment about what the receiving provider needs is left to the disclosing provider. The boards test this exception under the heading "treatment is not minimum-necessary-bound."

### Permitted uses and disclosures: TPO

The Privacy Rule permits — without patient authorization — uses and disclosures of PHI for the covered entity's own **treatment, payment, and healthcare operations**, abbreviated **TPO**. Memorize the abbreviation; the boards use it.

- **Treatment** is the provision, coordination, or management of healthcare. Includes consultations, referrals, and the disclosure of PHI from one provider to another for treatment purposes.
- **Payment** is the activities a health plan undertakes to obtain premiums or determine responsibility for coverage and benefits, and the activities a covered entity undertakes to obtain payment for healthcare. Includes billing, claims submission, eligibility determination, utilization review, and collection.
- **Healthcare operations** is the broadest of the three. Includes quality assessment and improvement activities, care coordination, training of healthcare students, accreditation, certification, business planning, customer service, fundraising under specific conditions, and similar administrative functions.

Disclosures *outside* TPO generally require patient **authorization** — a signed, dated, specific document that meets the Privacy Rule's content requirements. Marketing, sale of PHI, psychotherapy notes, and most research disclosures require authorization. The boards test the boundary: a disclosure that looks like marketing but fits inside operations may not require authorization, and a disclosure that looks like operations but is actually marketing does.

A handful of categories are permitted *without authorization* and *without TPO* — disclosures required by law, public health activities (the cross-reference to Module 6 lesson 5 reportable conditions), health oversight, judicial proceedings, law enforcement under specific conditions, organ procurement, research under an IRB waiver, and several others. The Privacy Rule's structure is "TPO is permitted, listed exceptions are permitted, everything else needs authorization." The boards test the structure more than the exhaustive exception list.

### Patient rights

The Privacy Rule grants patients a defined set of rights with respect to their own PHI. Memorize the names; they appear directly on board exams.

- **Right of access**: the patient has the right to inspect and obtain a copy of their PHI in the designated record set. Subject to limited exceptions (psychotherapy notes, information compiled for litigation). The Cures Act information blocking rule (lesson 3) builds on this right and extends it.
- **Right to request amendment**: the patient may request that the covered entity amend their PHI; the covered entity may deny the request under specified conditions and must allow the patient to file a statement of disagreement.
- **Right to an accounting of disclosures**: the patient may request a list of disclosures of their PHI made by the covered entity in the past six years, with several exclusions (TPO disclosures, disclosures pursuant to authorization, disclosures to the individual themselves).
- **Right to request restrictions** on uses and disclosures: the patient may request that the covered entity limit certain uses and disclosures; the covered entity is generally not required to agree, with one exception added by HITECH — a request to restrict disclosure to a health plan for items the patient paid for out of pocket in full must be honored.
- **Right to request confidential communications**: the patient may request that communications be made by alternative means or at alternative locations (e.g., "do not call my home, only my cell").
- **Right to a notice of privacy practices**: the patient is entitled to a written notice describing how the covered entity uses and discloses PHI and the patient's rights.

The right of access is the one that has changed the most over the last decade. HITECH added the right to receive an electronic copy in electronic form when records are maintained electronically. The Cures Act and ONC's information blocking rule (lesson 3) made obstructing access actionable in a way it had not been before. Read this row of the table as a single trajectory: from *patients can request a paper copy* (HIPAA 1996) to *patients can demand an electronic copy* (HITECH 2009) to *obstructing access is itself a federal violation* (Cures 2016, enforcement 2020+).

### The Security Rule: three safeguard categories

The Security Rule applies specifically to **electronic PHI (ePHI)** — PHI that is created, received, maintained, or transmitted in electronic form. It does not govern paper records (those are covered by the Privacy Rule but not the Security Rule). It requires covered entities and business associates to implement safeguards in three categories:

1. **Administrative safeguards** — the people, policies, processes, and management practices that protect ePHI. Includes security management process (risk analysis, risk management), assigned security responsibility, workforce security (authorization, clearance, termination procedures), information access management, security awareness and training, security incident procedures, contingency planning (data backup, disaster recovery, emergency mode operation), evaluation, and BAAs with business associates.

2. **Physical safeguards** — the physical measures, policies, and procedures to protect electronic information systems and the buildings and equipment from natural and environmental hazards and unauthorized intrusion. Includes facility access controls, workstation use policies, workstation security, and device and media controls (disposal, re-use, accountability, data backup and storage).

3. **Technical safeguards** — the technology and policies that protect ePHI and control access to it. Includes access control (unique user identification, emergency access procedure, automatic logoff, encryption and decryption), audit controls, integrity controls, person or entity authentication, and transmission security (integrity controls and encryption for ePHI in transit).

**Memorize the three categories.** The boards test the categories directly with stems of the form "which safeguard category does [described control] fall into?" The right answer requires you to map the control to the right bucket. Encryption is technical. Workforce training is administrative. Locked server rooms are physical. The boards reuse this question form constantly.

Within each category, the regulation distinguishes **required** specifications (the covered entity must implement the specification) from **addressable** specifications (the covered entity must assess whether the specification is reasonable and appropriate given its environment, and either implement it, implement an equivalent alternative, or document why neither is reasonable). Addressable does not mean optional. The most-cited example is encryption of ePHI at rest, which is *addressable*, not required — but a covered entity that decides not to encrypt and cannot document a defensible alternative is in a very weak position when a breach occurs. After HITECH, encryption became something close to a de facto requirement because encrypted breached data is exempt from the breach notification rule (lesson 2).

The boards test the required-versus-addressable distinction with stems that ask whether the covered entity is in compliance with an addressable specification it has not implemented. The right answer is usually "it depends on whether the covered entity has documented its analysis" — addressable demands a written justification, not a free pass.

## Concrete example

A 240-bed community hospital uses an EHR hosted by a national vendor. The hospital's billing function is outsourced to a regional billing company. The hospital sends weekly extracts of patient demographics, diagnoses, and procedures to a population health analytics startup that the institution is piloting for a chronic-disease management program. The hospital's marketing team wants to send a postcard to all patients diagnosed with diabetes in the last year, advertising a new diabetes education class.

Walk the HIPAA analysis.

**Covered entity / business associate.** The hospital is a covered entity. The EHR vendor is a business associate (BAA required). The billing company is a business associate (BAA required). The population health analytics startup is a business associate (BAA required). All three need BAAs in place before any PHI is shared. The boards reward you for catching that the analytics startup is just as much a business associate as the EHR vendor, even though the relationship is newer and informal.

**The weekly extracts.** The hospital is disclosing PHI to the analytics vendor for purposes that fall under healthcare operations (chronic disease management is operations). The disclosure is permitted under TPO without patient authorization. Minimum necessary applies — the hospital should not be sending the entire chart, only the data elements the analytics vendor actually needs. If the extract contains the entire problem list and clinical notes when the vendor only needs diagnoses and demographics, the minimum necessary standard has been violated even though TPO permits the underlying disclosure.

**The marketing postcard.** This one is the test. Marketing under HIPAA generally requires patient authorization unless one of two narrow exceptions applies: (1) a face-to-face communication with the patient, or (2) a promotional gift of nominal value. A postcard advertising a class is neither. Even though the class is for the patient's own benefit and the institution is the provider, sending an unsolicited postcard to all diabetic patients is marketing under HIPAA and requires authorization. The standard wrong answer the boards use is "this is healthcare operations because it is education." It is not. The Privacy Rule's marketing definition specifically includes "communications about a product or service that encourages recipients to purchase or use the product or service" with carve-outs that do not include this scenario. The right move is either to require patients to opt in (authorization) or to use a different communication method (in-clinic discussion, message through the patient portal that the patient initiated).

**A printer left in the waiting room with PHI on it.** Now imagine the hospital's printer in the registration area is loaded with a stack of pages containing recent patients' names and appointment details, visible to anyone walking past. This is a Security Rule and Privacy Rule problem. Security Rule: physical safeguards (workstation security, facility access controls). Privacy Rule: minimum necessary, plus a use-and-disclosure problem because PHI is being incidentally disclosed to anyone in the waiting room. The fix is physical (move the printer behind the counter, secure the output tray) and administrative (workforce training on PHI handling). The boards reward you for naming both categories.

## Uncomfortable question

HIPAA's structure is twenty-five years old. It was designed for a world in which electronic PHI was a small fraction of all PHI, in which most providers used paper records, and in which the threat models were dominated by snooping employees and lost laptops. The world is now one of cloud-hosted EHRs, ransomware crews, third-party AI vendors processing clinical notes, patient-facing apps reading FHIR APIs, and breach disclosures measured in millions of records at a time. The structure of the Privacy Rule and Security Rule has not been fundamentally rewritten to match. As an informaticist sitting on a privacy committee, your job is partly to apply HIPAA as it is written and partly to recognize where it is silent or wrong about the actual threats. Where does the framework still hold and where does it leak? The boards test the framework as written. The job tests the gap.

Hold your answer.
