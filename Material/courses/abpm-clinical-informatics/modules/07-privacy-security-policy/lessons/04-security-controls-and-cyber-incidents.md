---
id: 04-security-controls-and-cyber-incidents
title: Security Controls, the Four A's, and the Ransomware Era
order: 4
estimatedMinutes: 40
learningOutcomes:
  - Define authentication, authorization, audit, and accounting and apply each to an EHR scenario.
  - Describe role-based access control and contrast it with attribute-based and discretionary models.
  - Distinguish encryption at rest from encryption in transit and explain why both are required for a defensible posture.
  - Trace the response to a ransomware incident from initial detection through downtime operation and recovery.
concepts:
  - four-As
  - authentication
  - authorization
  - audit
  - accounting
  - rbac
  - abac
  - mfa
  - encryption-at-rest
  - encryption-in-transit
  - ransomware
  - change-healthcare-2024
  - downtime-planning
  - defense-in-depth
  - incident-response
---

## Reading

The previous three lessons covered the legal terrain. This lesson covers the security practice that the legal terrain assumes. The boards test both — they assume you know the law (HIPAA, HITECH, Cures) and they also expect you to know the security control vocabulary that the Security Rule's "technical safeguards" and "administrative safeguards" categories abstract over. The vocabulary is small. The discipline of using it correctly is what separates a privacy committee that produces useful analyses from one that produces compliance theater.

The frame to start with is **defense in depth** — the principle that no single control is adequate and that security has to be a posture composed of overlapping controls in different categories. A network firewall is necessary and not sufficient. Encryption is necessary and not sufficient. Workforce training is necessary and not sufficient. The right question is never "is this control in place" but "what is the layered set of controls that survives the failure of any single one of them." Defense in depth is the answer to the next-question-after-"is-the-firewall-up." It is also the answer to the boards' favorite stem of the form "the institution had a firewall — how did the breach happen anyway."

### The Four A's

The vocabulary the boards test directly is the **Four A's**: authentication, authorization, audit, accounting. They are easy to confuse and the boards make money on the confusion. Memorize the distinctions.

**Authentication** is the process of verifying that a person or system is who they claim to be. The username-and-password is the most common authentication factor. Multi-factor authentication adds a second factor — something you have (a token, a phone), something you are (a fingerprint, a face), or something you know (a PIN beyond the password). The discipline is to require at least two factors for any access that matters. Authentication answers the question "who is this?"

**Authorization** is the process of determining what an authenticated user is allowed to do. A nurse who has authenticated successfully is authorized to view the chart of any patient on her unit and not authorized to view the chart of an unrelated patient on a different unit. Authorization is *separate from* authentication. A common mistake is to conflate the two: "the user logged in" is authentication, not authorization. The Security Rule's access control specifications (unique user identification, emergency access procedure) are about authentication; the Privacy Rule's minimum necessary standard is about authorization. Authorization answers the question "what is this person allowed to do?"

**Audit** is the process of recording who did what, when, on what record, and from where. Audit logs are the backbone of every retrospective investigation of inappropriate access — the patient in the news whose chart was opened by 70 employees, the celebrity whose lab results leaked, the family member who was fired for snooping. Audit answers the question "what actually happened?" and it is only useful if (a) the logging is comprehensive, (b) the logs are tamper-resistant, and (c) someone actually reviews them. The boards test the third condition by asking what the appropriate response to a high-profile admission is — the answer always includes audit-log review.

**Accounting** in this context has two related meanings. The first is the HIPAA-specific patient right to an accounting of disclosures (introduced in lesson 1) — the patient's right to receive a list of disclosures of their PHI made over a defined period. The second is the broader information-security usage: the discipline of being able to account for all access, all use, and all transmission of protected data, so that any question about the data's history can be answered with documentation. The two meanings overlap and the boards have used both.

An older mnemonic version of the Four A's, sometimes encountered in the literature, uses **Identification, Authentication, Authorization, and Accountability** (IAAA). Some sources combine audit and accounting; some treat them separately. The boards have tested both naming conventions. Know both. The substance is the same: there is a name for each step, and the steps are not interchangeable.

### Role-based access control

**Role-based access control (RBAC)** is the dominant authorization model in healthcare information systems. Users are assigned to one or more roles (nurse, attending physician, resident, pharmacist, registration clerk, billing specialist), and roles are granted permissions to perform actions on resources. A user gains the permissions of the roles they hold; revoking access is a matter of removing a role from a user, not of editing thousands of individual permissions. RBAC is how every major EHR handles authorization at scale.

The boards test the term and expect you to understand the basic structure (users → roles → permissions → resources). The boards also test the limits of RBAC: an institution that has too many roles loses the simplicity that made RBAC attractive in the first place ("role explosion"), and an institution that has too few roles ends up granting the lowest-common-denominator user too much access. The right number is the smallest number of roles that captures the meaningful access patterns in the institution.

Two contrasting models the boards occasionally test:

**Discretionary access control (DAC).** The owner of a resource can grant access to other users at their discretion. Common in file systems; rare in clinical systems because the access pattern in healthcare is determined by clinical role and not by file ownership.

**Attribute-based access control (ABAC).** Access decisions are made based on attributes of the user (role, location, time of day, training status), the resource (sensitivity, ownership, status), and the environment (network, device posture). ABAC is more flexible than RBAC and can express policies that RBAC cannot ("a nurse can view this chart only when the patient is on the nurse's unit and only during the nurse's shift"). The trade-off is complexity: ABAC policies are harder to write, audit, and reason about. Most clinical systems use RBAC as the default with ABAC-style attributes layered on top for specific situations (break-the-glass access, after-hours restrictions, sensitive-record handling).

### Encryption at rest and in transit

The Security Rule names encryption as an addressable specification, but in operational practice encryption has become a near-requirement because of the breach notification safe harbor (lesson 2) and because it is the cheapest control with the highest expected value.

**Encryption at rest** protects data that is stored — on disk, on tape, on a USB drive, in a database, in a cloud storage bucket. The threat model is theft or loss of the storage medium. A laptop with an encrypted drive that is stolen from a car is not a reportable breach under HHS guidance. The same laptop without encryption is. The institutional decision to encrypt all laptops, all servers, all portable media, and all cloud storage is the single highest-leverage security investment most institutions make.

**Encryption in transit** protects data that is moving — across the network, over the internet, between systems. The dominant standard is **TLS (Transport Layer Security)**, the successor to SSL. The Security Rule's transmission security specification expects encryption of ePHI in transit across open networks. In modern practice this means TLS 1.2 or later for every clinical system that exchanges data over a network the institution does not fully control.

The boards test the at-rest / in-transit distinction directly. A common stem is to describe a control and ask whether it covers data at rest, data in transit, or both. Disk encryption is at rest. TLS is in transit. A VPN is in transit. A database column encryption is at rest. The distinction matters because the threats are different and the controls do not substitute for each other. An institution with full TLS and no disk encryption is exposed to physical theft. An institution with full disk encryption and no TLS is exposed to network interception. Both are required.

### The ransomware era

The threat landscape in healthcare changed materially around 2016 with the WannaCry attack on the UK's NHS, accelerated through the late 2010s as ransomware crews discovered that hospitals were both well-funded and uniquely unable to tolerate downtime, and reached its current intensity in 2024 with the Change Healthcare incident. The boards do not test specific incidents in detail, but they expect you to know the shape of the modern threat and to know how an institution should respond.

**What ransomware is.** A ransomware attack is one in which an attacker gains access to an institution's systems, deploys malware that encrypts the institution's data, and demands payment for the decryption key. Modern ransomware crews have added a "double extortion" pattern: in addition to encrypting the data, they also exfiltrate it and threaten to publish it if the ransom is not paid. The double extortion pattern means that paying the ransom does not necessarily resolve the breach notification obligation, because the data may still be in the attacker's hands.

**Why healthcare is a target.** Hospitals cannot afford extended downtime. Patient care depends on the EHR, on imaging systems, on lab systems, on pharmacy systems, on the medical record itself. An institution facing a multi-week outage has to choose between paying the ransom and accepting that patient care will be degraded for weeks. The economic and clinical asymmetry is what makes healthcare attractive to ransomware crews.

**The Change Healthcare 2024 incident.** Change Healthcare is a subsidiary of UnitedHealth Group's Optum and one of the largest claims processing intermediaries in U.S. healthcare. In February 2024 it was hit by a ransomware attack that disrupted claims processing nationwide for weeks, affected an enormous fraction of U.S. healthcare transactions, and produced one of the largest healthcare data breaches in history. The incident is now a routine reference in informatics and policy discussions because it illustrated several lessons at once: the systemic risk of concentration in healthcare infrastructure, the limits of HIPAA's actor-by-actor framing when a single vendor sits in the middle of a national flow, the inadequacy of the breach notification timeline for incidents of this scale, and the operational dependence of clinical care on infrastructure most clinicians had never heard of. The boards do not test the dollar amounts or the legal aftermath, but they expect you to know the name of the incident and the rough shape of what happened.

**The hospital ransomware pattern.** Throughout the early 2020s, dozens of U.S. hospital systems experienced ransomware attacks. The pattern is consistent: initial access through a phishing email or a vulnerable internet-facing service, lateral movement through the network using stolen credentials, eventual deployment of ransomware across servers and endpoints, multi-week downtime, and a multi-month recovery during which the institution is operating on paper backup procedures. Studies have linked ransomware attacks at hospitals to measurable increases in mortality during and after the attack — patient diversion to other hospitals, delayed lab results, missed orders, slower decision-making — and the boards have started testing the safety dimension of ransomware as much as the privacy dimension.

### Downtime as a security topic

This is where the cross-reference to **Module 5 SAFER downtime planning** matters. Downtime used to be treated as a contingency-planning topic — what do you do when the EHR is down for an hour because of a patch? In the ransomware era, downtime is a security topic, because the realistic worst case is no longer "an hour" but "two to four weeks." Institutions that have practiced downtime drills routinely, that have current paper backup procedures, that have downtime clinical content packets printed and stocked on units, and that have rehearsed the transition between EHR and downtime workflows recover faster and with less patient harm than institutions that have not. The SAFER High Priority Practices Guide treats downtime planning as one of the few must-do items, and the post-2020 update increased the emphasis on multi-week downtime scenarios specifically.

The boards test the downtime topic under both Module 5 (sociotechnical readiness) and Module 7 (security and incident response). The right disposition is that they are the same topic seen from two angles.

### Incident response

When a security incident occurs, the institution should have a documented incident response plan and should follow it. The standard reference structure (from NIST SP 800-61) divides incident response into four phases:

1. **Preparation.** The work done before any incident — policies, training, tabletop exercises, contact lists, runbooks, the technical capability to detect and respond.
2. **Detection and analysis.** Identifying that an incident is occurring, characterizing it, determining its scope, prioritizing the response.
3. **Containment, eradication, and recovery.** Stopping the spread, removing the attacker, restoring affected systems, returning to normal operation. Containment usually precedes eradication; eradication usually precedes recovery; the order matters and is testable.
4. **Post-incident activity.** Lessons learned, documentation, evidence preservation, regulatory notification, corrective action.

The boards test the phases by name and the relationship between them. They also test the principle that incident response is a *capability*, not a document — an institution with a beautiful written plan and no rehearsal will fail in the moment, and an institution with a thinner plan and regular tabletop exercises will succeed. The capability is the discipline of running through the plan often enough that the plan is in muscle memory, not in a binder on a shelf.

## Concrete example

A 350-bed regional hospital is hit by a ransomware attack that begins with a successful phishing email to a billing analyst on a Thursday afternoon. By Friday morning, the attacker has used the analyst's credentials to gain access to a file share, escalated privileges through an unpatched server, and deployed ransomware across most of the hospital's Windows systems. The EHR (cloud-hosted by a major vendor and not directly affected) is still up but cannot be reached from internal workstations because the network is segmented and the segmentation has been damaged. Lab and imaging systems on the local network are down. The clinical staff arrive Friday morning to discover that none of the workstations boot.

Walk the response.

**Detection.** The IT security team sees the ransomware notes and the encrypted files. They confirm the incident and escalate to leadership and to the on-call CMIO and CIO. Within hours, the institution has notified its cyber insurance carrier and engaged an external incident response firm. The detection-and-analysis phase is well underway by mid-morning Friday.

**Containment.** The institution disconnects affected segments from the network to stop lateral spread. It takes the cloud EHR offline for the institution by suspending the network paths between the hospital and the cloud vendor (because the institution cannot rule out that the attacker has credentials that would let them reach the EHR if connectivity is restored). The decision to take the EHR offline is the most consequential clinical decision of the incident — it saves the cloud-hosted data from the attacker but immediately puts the institution into full downtime.

**Downtime activation.** The hospital activates its downtime protocols. Paper order forms come out. Downtime medication administration records are pulled from the unit binders. Lab requisitions go to paper. The institution reroutes new admissions to other regional hospitals where possible. Clinical staff revert to the workflows they have practiced — and the institutions that have practiced them recently struggle less than the institutions that have not. The Sittig-Singh model from Module 5 is the lens here: the technical failure (dimension 1) interacts with workflow (dimension 5), people (dimension 4 — who has been trained on downtime?), policies (dimension 6 — what is the activation criterion?), and measurement (dimension 8 — how will the institution track patient safety during downtime?).

**Eradication and recovery.** Over the following days and weeks, the IT and incident response teams identify the attacker's foothold, remove it, rebuild affected servers from clean backups (which the institution had, and which had been air-gapped — a decision made years earlier that turns out to matter enormously), and progressively restore systems. Recovery to full normal operation takes three weeks.

**Notification.** The institution determines through its four-factor analysis that a breach has occurred (the attacker exfiltrated some data, per the double-extortion pattern). The breach affects more than 500 individuals. The institution notifies affected individuals, HHS, and prominent media within the 60-day window. The breach lands on the Wall of Shame. Cyber insurance covers part of the cost of the response; the institution pays the rest. There is no ransom payment because the institution had backups and could recover.

**Post-incident activity.** The institution conducts a formal lessons-learned process. The phishing email gets analyzed and the findings shared with workforce training. The unpatched server gets a remediation plan and a compensating control while patching cycles are reviewed. The downtime drills get an updated cadence. The board of directors is briefed and a corrective action plan is filed with HHS. The CMIO and CIO present at a regional health-IT forum about the lessons.

The lesson the example is meant to make concrete is that the response to a major incident is a *coordinated multi-disciplinary* effort that touches every Sittig-Singh dimension and that depends on preparation that happened months or years before the incident itself. The institution that responds well is the one that invested in defense-in-depth controls, in air-gapped backups, in downtime drills, in incident response capability, and in the cultural willingness to take painful actions (like disconnecting the EHR) early. None of those are visible during the incident; they all are decisive.

## Uncomfortable question

The Change Healthcare 2024 incident, the multi-week hospital ransomware events of the early 2020s, and the long trend of healthcare being one of the most attacked sectors in the U.S. all point to the same conclusion: the threat has outgrown the regulatory frame. HIPAA was designed for a world of lost laptops and snooping employees, not for the world of organized criminal ransomware crews exploiting a healthcare infrastructure that has consolidated faster than its security has matured. The structural fixes are not at the level of any individual institution — they involve workforce, the security maturity of vendors, the systemic risk of concentration, and federal investment of a magnitude that has not been politically possible. As an informaticist sitting on a security committee, your work is at the institutional level even though the problem is at the systemic level. Where do you spend your political capital — on the controls you can actually implement, on the advocacy that might change the systemic picture, or on the operational discipline that keeps your institution from being the next headline? The boards test the controls. The job tests the allocation of attention.

Hold your answer.
