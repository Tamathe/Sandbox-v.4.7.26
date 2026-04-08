---
id: assignment-07-privacy-security-policy
moduleId: 07-privacy-security-policy
title: Module 7 Capstone — Privacy and Security Incident Response Memo
rubric: written-thesis
estimatedHours: 3
---

# Capstone: Privacy and Security Incident Response Memo

## The scenario

You are the privacy and security officer (or the consulting clinical informaticist who has been pulled into the role) at a 280-bed regional hospital. On a Monday morning, the IT security team brings you the following facts:

- Late Friday afternoon, a billing analyst received a phishing email that appeared to come from the institution's HR department about a benefits enrollment deadline. The analyst clicked the link and entered her username and password on the spoofed page.
- Over the weekend, an attacker used the credentials to access a cloud-hosted file share that the billing department uses for working files. The share contains, among other things, a spreadsheet with names, dates of birth, medical record numbers, insurance information, and recent diagnoses for 3,400 patients — exported by the analyst three weeks ago for a denied-claims project. The spreadsheet was not encrypted at rest because the file share's encryption was not enabled for that folder.
- The IT security team's logging shows that the attacker downloaded the spreadsheet and approximately 40 other files from the share. The team cannot determine with certainty whether the downloaded files were viewed or further distributed, but the attacker's IP address is associated with a known credential-trading marketplace.
- There is no evidence that the attacker reached the EHR or the cloud-hosted clinical systems. The attack appears to be limited to the file share.
- The institution has cyber insurance, an incident response retainer with an external firm, and a documented incident response plan.

The CEO has asked you to write a memo to the executive leadership team — by tomorrow morning — covering the legal obligations, the immediate response steps, the longer-term remediation, and an honest assessment of the institution's exposure.

## What the memo must do

Write a **1,000–1,400 word memo** that addresses the following in order:

1. **What happened, in plain language.** Three to five sentences that the CEO can use verbatim in a board call.

2. **Regulatory analysis under HIPAA, HITECH, and the Cures Act.**
   - Apply the HIPAA breach four-factor risk assessment (nature/extent of PHI; the unauthorized person; whether the PHI was acquired or viewed; mitigation). Determine whether this incident is presumed to be a breach and explain why.
   - Identify the breach notification obligations: who must be notified, by when, and what the notices must include. Explicitly identify whether this incident crosses the 500-record threshold and what that triggers (HHS, prominent media, the Wall of Shame).
   - Identify the role of the CMP tier structure in the institution's exposure and what factors will determine which tier the case falls into.
   - Note whether the encryption safe harbor applies and why or why not.
   - Address whether any aspect of the institution's response could constitute information blocking under the Cures Act (it should not, but the analysis is part of the discipline of distinguishing security responses from access restrictions).

3. **Immediate response steps.** Containment, eradication, recovery — list the specific actions the institution should take in the first 72 hours, in order. Map each action to one of the four NIST incident response phases (preparation, detection and analysis, containment/eradication/recovery, post-incident activity) so leadership can see the framework you are working in.

4. **Longer-term remediation.** Identify the technical, administrative, and physical safeguards (Security Rule categories) that should be addressed to prevent recurrence. The phishing vector, the unencrypted file share, the export-and-store-locally pattern, the workforce training gap, and the access management gap each map to specific safeguards. Be concrete.

5. **Honest assessment of exposure.** Will the institution face civil monetary penalties? On what does the answer depend? What is the institution's strongest argument and what is its weakest? Be candid — leadership needs to know the bad news now, not later. The criterion is whether your assessment would survive a follow-up question from a board member who asks what could go wrong.

6. **Engage the strongest counter-argument.** The strongest counter-argument is some version of: "the IT team has been raising the unencrypted file share issue for months; the analyst was acting within her job and following normal practice; the institution's incident response is following the playbook; the consequences will be proportionate to the controls that were in place; this is an unfortunate incident, not a culpable failure." Steel-man it. Then respond.

## What the memo must NOT do

- Identify any actual patient or actual employee. The scenario above is fictional; do not embellish with real PHI. See the PHI Handling Policy.
- Identify a specific real institution by name in a way that would compromise confidentiality if you draw on real experience.
- Be drafted by an AI. See the AI Use Policy.
- Hide the bad news. A memo that protects the institution by softening the analysis is failing the institution.

## How it will be graded

By the **Written Analysis Rubric**. The "Use of frameworks and vocabulary" criterion is the heaviest hitter — graders are looking for the four-factor analysis, the safeguard categories, the CMP tiers, the NIST phases, and the encryption safe harbor doing real work, not a paragraph that names them and moves on. The "Engagement with the strongest counter-argument" criterion will weigh against you if you treat the institution as obviously culpable; the strongest analysis acknowledges that the controls in place were defensible at the time and that the failure is structural rather than individual.

## Submission

Paste the memo as a single discussion post in the Module 7 capstone thread. The instructor will review against the rubric within five days. You may revise once.

## A note on what this assignment is for

Most clinical informaticists will, at some point, be in a room where a real incident is unfolding and leadership is looking for someone who knows the law, knows the controls, and can write the memo that the institution will use to make decisions in the next 24 hours. That document is not the place to discover that you do not know the breach notification timeline or the difference between administrative and technical safeguards. The assignment is the rehearsal for that moment. The boards test the recognition. The job tests whether you can write the document under deadline pressure with the institution depending on you. Both matter. This is the assignment that simulates the second.
