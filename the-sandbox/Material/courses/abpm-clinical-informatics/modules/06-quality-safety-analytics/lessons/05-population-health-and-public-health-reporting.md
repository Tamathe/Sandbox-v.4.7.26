---
id: 05-population-health-and-public-health-reporting
title: Population Health Management and Public Health Reporting
order: 5
estimatedMinutes: 35
learningOutcomes:
  - Define population health management and distinguish it from individual care management.
  - Apply risk stratification, case identification, and panel management to a defined population.
  - Identify the major public health reporting flows: syndromic surveillance, electronic case reporting (eCR), reportable conditions, immunization information systems.
  - Explain the Cures-Act-era push toward standardized public health reporting via FHIR.
concepts:
  - population-health
  - risk-stratification
  - case-identification
  - panel-management
  - public-health-informatics
  - syndromic-surveillance
  - electronic-case-reporting
  - reportable-conditions
  - immunization-information-systems
  - fhir-public-health
---

## Reading

Population health is the half of clinical informatics that lives outside the individual encounter. Where most of this course has focused on what happens when one clinician sees one patient, this lesson is about what happens when an institution decides it is responsible for a defined group of people whether or not those people walk in the door, and about what happens when the data the institution collects flows out to public health authorities who are responsible for groups much larger than any one institution.

The two halves of the lesson — population health management inside the institution and public health reporting outside it — share a structural feature. Both depend on the institution's ability to identify a population, characterize it, and act on the characterization in a way that is operationally sustainable. The boards test both halves with the same vocabulary, and the right disposition is to see them as two applications of the same machinery.

### Population health management

**Population health management** is the operational discipline of taking responsibility for outcomes across a defined population, not just for the patients who happen to show up. The defined population might be a primary care practice's empaneled patients, an ACO's attributed lives, an insurance plan's members, or a community the institution has decided to serve. The defining feature is that the population is fixed in advance and the institution's goal is to improve outcomes across the whole population, including the people who do not voluntarily seek care.

Three operational sub-disciplines make population health work, and the boards test the vocabulary of each.

**Risk stratification** is the process of dividing the population into tiers by predicted need or predicted bad outcome. The classic stratification is the Kaiser pyramid: a small high-risk tier (often the top 1–5%) who account for a disproportionate share of cost and bad outcomes, a moderate-risk tier (the next 15–20%) who would benefit from active management, and a low-risk tier (the bulk of the population) for whom the right intervention is preventive and self-service. Stratification can be done with a simple rule (any patient with three or more chronic conditions), with a published score (LACE for readmission, ACG for general predicted utilization), or with a custom predictive model. The choice depends on data availability, governance, and what action will follow. Remember the lesson from Module 6 lesson 4: a working classifier is necessary but not sufficient — stratification only matters if the action that follows actually changes outcomes for the stratified group.

**Case identification** is the process of finding the specific patients in the high-risk tier who should receive a specific intervention. It overlaps with the registry concept from lesson 2. A diabetes registry is one form of case identification. A "frequent ED user" worklist is another. A "rising-risk" cohort built from a predictive model is another. The case identification logic is the operational instantiation of the stratification model.

**Panel management** is the day-to-day work of acting on the case identification — closing care gaps, sending outreach, coordinating across teams, tracking who has been touched and who has not. Panel management is where most institutions fail at population health, not because the analytics are wrong, but because the operational work to act on the analytics is not staffed, governed, or measured. The boards test the term and the concept; the field tests whether you have ever actually run a panel.

The honest assessment of population health in 2025 is that the analytics have run far ahead of the operational discipline. Most institutions have stratification models. Most have case identification logic. Few have panel management at the depth required for the stratification to actually move outcomes. The structural lesson is the same one from Module 5: the technology is necessary and the human-and-workflow layer is where the work mostly is.

### Public health informatics — the cross-reference to Module 1

Public health informatics is the application of informatics to populations defined by *public health authorities*, not by individual institutions. The audience is local health departments, state health departments, the CDC, and global health agencies. The information flows are bidirectional: institutions report cases and exposures to public health, and public health pushes back guidance, case investigations, and population-level signals.

Module 1 introduced public health informatics as one of the field's four major sub-domains. This lesson is the operational continuation. The structure to know cold is the set of major reporting flows that institutions are required (or strongly encouraged) to participate in.

### Syndromic surveillance

**Syndromic surveillance** is the near-real-time monitoring of clinical activity for early signals of population-level disease patterns. Hospitals and EDs send aggregated, de-identified or limited-identifier data — chief complaints, ICD codes, patient demographics — to a state or local public health system on a daily or sub-daily cadence. The public health system aggregates the feeds across institutions and looks for unusual patterns that might indicate an outbreak, a bioterrorism event, or an emerging public health concern.

The defining example is the **BioSense / National Syndromic Surveillance Program (NSSP)** at the CDC, which receives feeds from thousands of hospitals nationwide and runs real-time aggregation. State health departments operate their own syndromic systems on top of NSSP. The signals that matter are not individual cases; they are deviations from baseline — a sudden spike in respiratory ED visits in one ZIP code, a rise in specific chief complaints in a region.

The boards test syndromic surveillance under the heading of public health reporting and as a contrast with case-by-case reporting. The defining feature is **near-real-time aggregation across institutions**, with limited identifiers, for population-level signal detection.

### Electronic case reporting (eCR)

**Electronic case reporting** is the automated reporting of individual reportable conditions from the EHR to public health, replacing the manual paper-based reporting that was the norm before. When a patient is diagnosed with a reportable condition (tuberculosis, certain STIs, vaccine-preventable diseases, certain foodborne illnesses, in many states some cancers), the institution is legally required to report the case to the local or state health department. The traditional process was a public health nurse filling out a form and faxing it. The eCR process is an automated message generated by the EHR when the reportable condition is identified.

The technical stack matters and the boards test it. The eCR architecture (developed by CDC, AIMS Platform, APHL, and HL7) uses an **electronic initial case report (eICR)** message, structured as a CDA document or — increasingly — as a FHIR bundle, sent from the EHR to a routing service (often the AIMS Platform) which delivers it to the appropriate jurisdictional public health agency. The trigger codes that initiate eCR are maintained as a public value set (the **Reportable Condition Trigger Codes** or RCTC) so that EHRs can use a single standardized list rather than maintaining their own. ONC has incorporated eCR support into the EHR certification criteria.

The boards reward you for knowing eCR by name, knowing it is automated case-by-case reporting (contrast with syndromic surveillance, which is aggregated near-real-time monitoring), and knowing it uses a value-set-driven trigger and a CDA-or-FHIR transport.

### Reportable conditions

**Reportable conditions** are the individual diseases and exposures that institutions are legally required to report to public health authorities. The list varies by state — each state's health department maintains its own list — but a core set is consistent across the country: tuberculosis, syphilis, gonorrhea, HIV (in most states), measles, mumps, rubella, pertussis, vaccine-preventable diseases generally, foodborne illnesses, certain cancers (in most states), occupational exposures, and certain injuries. The CDC publishes a list of nationally notifiable conditions that aggregates state reports into national surveillance.

The boards test the concept and the structure (it is a state-level legal requirement with federal aggregation), not the specific lists, which vary too much to memorize.

### Immunization information systems (IIS)

**Immunization information systems**, formerly known as immunization registries, are state-level databases that aggregate immunization records across providers so that any provider in the state can see a patient's full vaccination history regardless of where the doses were given. They are operated by state health departments and connected to most clinical sites via HL7 v2 messages or, increasingly, FHIR.

IIS are a recurring board topic because they touch interoperability, public health reporting, and pediatric care. The defining features: state-operated, bidirectional (you can both report and query), legally distinct from the EHR, and the closest thing in American healthcare to a true longitudinal record across providers. The operational reality is that IIS data quality varies by state, the bidirectional flows are often configured one-way only, and reconciliation between EHR and IIS records is a nontrivial workflow problem.

### The Cures-Act-era push toward FHIR public health reporting

The 21st Century Cures Act (Module 7 will cover this in depth) and ONC's implementing rules required certified EHRs to support standardized APIs for data exchange. The same requirement and the same technical stack (FHIR — see Module 2 lesson 4) is increasingly being applied to public health reporting. Where eCR began as a CDA-document flow, it is now moving to FHIR-based messaging. Where IIS used HL7 v2 for immunization reporting, the federal direction is FHIR-based APIs for both reporting and querying. The CDC's **Data Modernization Initiative**, accelerated after the COVID-19 pandemic exposed the shortcomings of the existing public health data infrastructure, is driving this transition.

The boards test the direction more than the specifics. Know that public health reporting is moving toward standardized FHIR-based flows, that the same FHIR infrastructure used for clinical data exchange is being repurposed for public health reporting, and that the alignment is deliberate. The operational implication for institutions is that the public health reporting work that used to be a side project for the integration team is becoming part of the same FHIR API surface that drives every other interoperability effort.

## Concrete example

A community hospital ED sees a patient with fever, cough, and a positive measles IgM result. Walk through what should happen next from a population-health and public-health-reporting standpoint.

**Within the institution.** The patient is identified clinically and isolated. The infection control team is notified. The ED's EHR triggers an alert to the inpatient bed management team about isolation requirements. So far this is individual care.

**Public health reporting (eCR).** Measles is on the Reportable Condition Trigger Code list. When the diagnosis code or the positive IgM result is entered into the EHR, the eCR process automatically generates an eICR message and sends it to the AIMS Platform, which routes it to the state and local health departments. A public health nurse at the local health department receives the case within hours instead of days. The state's notifiable disease database is updated. The CDC's national measles surveillance is updated through the state's roll-up.

**Public health response.** The local health department initiates contact tracing — identifying everyone the patient was in contact with during the infectious period, checking their immunization status against the state IIS, and offering post-exposure prophylaxis where appropriate. The IIS query is the part that depends on cross-institutional data that the local health department could not get from the hospital alone.

**Syndromic surveillance.** The hospital's daily ED feed to the state syndromic system has been reporting "fever and rash" chief complaints all along. If this measles case is the first of several, the syndromic system will detect a cluster sooner than the case-by-case eCR reports would individually. The combination of eCR (for individual confirmed cases) and syndromic surveillance (for early aggregate signals) is the design intent.

**Population health management within the institution.** The hospital's pediatric primary care practice runs a population health workflow that identifies under-immunized children in its panel. After the measles case, the practice escalates outreach to under-immunized families in the affected ZIP code. This is panel management acting on a public-health signal.

The end-to-end workflow is the lesson. The same patient touches individual care, eCR, syndromic surveillance, IIS, contact tracing, and population health panel management — six different informatics surfaces using the same underlying clinical event. None of the six on its own is sufficient. The integration is the work.

## Uncomfortable question

The COVID-19 pandemic exposed the public health data infrastructure as roughly a decade behind the clinical data infrastructure. Case reporting was manual. Death reporting was delayed. Vaccine administration data lived in dozens of incompatible state systems. The Cures Act, the Data Modernization Initiative, and the FHIR-based reporting push are the explicit response. Five years later, the question is whether the institutional incentives have actually changed. Hospitals are paid for clinical care. Public health reporting is an unfunded mandate. The technical infrastructure is improving. The operational discipline to maintain it is not, in most places, being newly funded. As an informaticist sitting on the integration committee, what is your move when leadership asks you whether to invest in upgrading the eCR pipeline before the federal deadline forces you to? Do you push for proactive investment (because the public health work is part of why you got into this), defer (because the budget will not support it without a regulatory hammer), or try to bundle it with another project that has clinical justification? The boards do not test this question. The infrastructure decisions of the next decade depend on the answer.

Hold your answer.
