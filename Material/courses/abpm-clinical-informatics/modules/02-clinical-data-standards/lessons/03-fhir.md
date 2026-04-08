---
id: 03-fhir
title: FHIR — REST, JSON, Resources, and Why It Won
order: 3
estimatedMinutes: 45
learningOutcomes:
  - Read a FHIR resource (Patient, Observation, MedicationRequest) and explain what each element does.
  - Name the FHIR resource categories and the most board-tested resources in each.
  - Explain SMART on FHIR, CDS Hooks, and US Core at the level a CMIO would need to defend a procurement decision.
concepts:
  - fhir
  - fhir-resources
  - fhir-rest-api
  - smart-on-fhir
  - cds-hooks
  - us-core
  - profiles-and-extensions
---

## Reading

FHIR — Fast Healthcare Interoperability Resources, pronounced "fire" — is the HL7 standard that has eaten the modern interoperability conversation. It is also the standard that the 21st Century Cures Act effectively mandated by name when it required certified EHRs to expose a standardized API for patient and population data access. FHIR is now the answer to most board questions of the form "which standard would you use to..." for any new development, and the answer to many board questions about how a third-party app reaches data inside an EHR. It is not the answer for legacy interfaces (which are still HL7 v2) or for older document exchange (which is still C-CDA), and the boards expect you to know the difference.

Start with the architectural shift FHIR makes relative to HL7 v3, because the shift is the whole point.

HL7 v3 was message-based, model-driven, XML, and required learning a large information model before you could write anything. FHIR is **resource-based**, **REST-driven**, defaults to **JSON or XML**, and can be learned by a competent web developer in days because it reuses the same conventions that the rest of the web uses. A FHIR server exposes clinical data as a set of *resources* — a Patient resource, an Observation resource, a MedicationRequest resource — each with a stable URL, fetched and modified with the standard HTTP verbs (GET, POST, PUT, DELETE). If you have ever worked with a REST API for any other domain, you already understand 80% of FHIR's mechanics. The remaining 20% is healthcare-specific.

Here is a stripped-down FHIR Patient resource in JSON:

```json
{
  "resourceType": "Patient",
  "id": "example-001",
  "identifier": [{
    "system": "http://hospital.example.org/mrn",
    "value": "MRN12345"
  }],
  "name": [{
    "family": "Doe",
    "given": ["Jane"]
  }],
  "gender": "female",
  "birthDate": "1975-08-15"
}
```

To fetch this patient, a client makes an HTTP request: `GET https://fhir.hospital.example.org/Patient/example-001`. To search for all female patients born in 1975: `GET /Patient?gender=female&birthdate=1975`. To create a new patient: `POST /Patient` with the JSON body. To update one: `PUT /Patient/example-001` with the new body. The mechanics are the mechanics of any REST API. The healthcare-specific part is the *shape of the resources*.

FHIR organizes its resources into categories. The categories you should be able to recognize:

- **Foundation** — infrastructure resources (Bundle, OperationOutcome, CapabilityStatement). Not clinically interesting; necessary for the API to function.
- **Base** — administrative resources that almost every clinical use case touches (Patient, Practitioner, Organization, Location, Encounter).
- **Clinical** — the resources that carry clinical information (Observation, Condition, Procedure, AllergyIntolerance, Immunization, DiagnosticReport, MedicationRequest, MedicationAdministration).
- **Financial** — billing and claims (Coverage, Claim, ExplanationOfBenefit).
- **Specialized** — research, public health, genomics, workflow.

The **Observation** resource is the one the boards test most often, because it is the most overloaded — it carries lab results, vital signs, social history items, and most other things that have a value attached to a patient and a time. A FHIR Observation pulls a LOINC code for *what was measured*, a value with UCUM units for *what the measurement was*, an effective time, a status, and a reference to the Patient. Three vocabularies (LOINC, UCUM, and the FHIR-specific status code system) all live inside one resource. This is the moment where the four-kind-of-standards taxonomy from lesson 1 becomes operational: FHIR is the content standard, REST is the transport, LOINC and UCUM are vocabularies, and a profile (covered below) is what holds them together for a specific use case.

Now the three concepts that distinguish FHIR-the-standard from FHIR-the-deployment.

**Profiles and extensions.** Plain FHIR is deliberately permissive. The Observation resource lets you put almost anything in almost any field. That is useful for flexibility and disastrous for interoperability. A *profile* is a constrained version of a resource — a definition that says "for this use case, the Observation must have a LOINC code from this value set, must have a UCUM unit, must have a subject reference, and may not have these optional fields." Profiles are how FHIR turns its flexibility into actual interoperability. **Extensions** are the structured way to add fields the base resource does not define, while remaining compatible with parsers that don't know about the extension. The boards will test whether you understand that an unprofiled FHIR API and a profiled FHIR API are functionally different things.

**US Core.** The US Core Implementation Guide is the profile set the U.S. has standardized on for the most common clinical data classes — what ONC calls USCDI (United States Core Data for Interoperability). When the Cures Act requires certified EHRs to expose a FHIR API, the implementation contract is US Core. If a board question mentions a U.S. clinical FHIR deployment and asks which profile set applies, the answer is US Core unless the stem specifies otherwise. Knowing the *name* US Core is most of the question.

**SMART on FHIR.** SMART (Substitutable Medical Apps, Reusable Technologies) is a set of conventions on top of FHIR that defines how third-party apps authenticate, request scopes, and launch from inside an EHR. SMART uses OAuth 2.0 and OpenID Connect — the same authorization standards the rest of the web uses. The point of SMART is that an app written once should be able to launch inside any SMART-compliant EHR with the same code. The Cures Act API requirements bake SMART in. If a stem describes "a third-party app that launches from within the EHR with the user's credentials and accesses patient data," the standard being described is SMART on FHIR. There is no other right answer.

**CDS Hooks.** CDS Hooks is a different specification, also built on FHIR, that defines how an EHR can call out to an external CDS service at specific workflow points (a hook fires when the user opens a patient chart, or starts a medication order, or signs an order). The CDS service receives a small bundle of FHIR data, returns *cards* (suggestions, links, app launches), and the EHR renders them in the workflow. CDS Hooks is the modern alternative to encoding all CDS rules inside the EHR — it lets external services contribute decision support without being part of the EHR build. We will spend more time on CDS Hooks in Module 4. For now, internalize that it is FHIR-based, that it is the modern path for externalized CDS, and that the boards distinguish it carefully from older approaches like Arden Syntax.

A note on what FHIR is *not*. FHIR is not a database schema. Real EHR vendors store their data in their own internal formats and expose FHIR as a translation layer. The FHIR view of a patient is often a derived projection, computed on the fly from the underlying database, and may be incomplete or lag behind the source of truth. This matters operationally — a third-party app reading via FHIR may not see data that exists in the EHR — and the boards occasionally test it as a "limitations of FHIR" question.

FHIR is also not a vocabulary. It defers entirely to existing vocabularies (SNOMED, LOINC, RxNorm, ICD, UCUM) and defines code system bindings rather than inventing new codes. If a FHIR resource encodes a problem as a SNOMED code, the standard governing the *code* is SNOMED, not FHIR. The boards will sometimes test whether you separate the content standard from the vocabulary cleanly.

And FHIR is not yet, in 2026, the dominant standard by message volume inside hospitals. Most internal traffic is still HL7 v2. FHIR dominates *external* traffic — patient apps, third-party CDS, public health reporting under newer ONC requirements, payer/provider data exchange — and it is growing fast. The internal v2 base is likely to persist for many years because the migration cost is enormous and the existing v2 infrastructure works. Knowing this is what separates an exam answer from a board-level answer: the right answer to "what is the dominant clinical interface standard" depends on whether the question is about new development (FHIR) or existing operations (v2).

## Concrete example

A patient downloads a third-party app that lets them aggregate their health records from multiple hospitals. The app is built on SMART on FHIR. When the patient adds Hospital A, the app launches a SMART authorization flow — the patient logs into Hospital A's patient portal, consents to the scopes the app is requesting (`patient/Patient.read`, `patient/Observation.read`, `patient/Condition.read`, `patient/MedicationRequest.read`), and the EHR returns an OAuth access token. The app then makes FHIR API calls against Hospital A's FHIR endpoint, using the access token, retrieving the patient's resources as JSON. The patient adds Hospital B and Hospital C the same way. Each hospital exposes US Core profiles, so the resources have predictable shapes, predictable code systems, and predictable required fields, and the app can merge them without writing custom parsers per hospital.

This entire workflow — patient-mediated, app-launched, OAuth-authorized, US-Core-conformant, FHIR-API-driven — is what the Cures Act API rule made legally required for certified EHRs in the U.S. It did not exist as a workable pattern fifteen years ago. It is now, in the right circumstances, routine. The boards will test the components by name and expect you to assemble them without prompting.

## Uncomfortable question

If FHIR plus US Core plus SMART now make patient-mediated record aggregation technically straightforward, why is it still rare in 2026 for patients to actually have a usable, complete, longitudinal view of their own medical records across institutions? Where is the gap, and is it a technical gap, an organizational gap, or a market gap?

Hold your answer.
