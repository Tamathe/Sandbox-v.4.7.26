---
id: 01-imaging-informatics-dicom-pacs-vna
title: Imaging Informatics — DICOM, PACS, VNA, and the IHE Profile Stack
order: 1
estimatedMinutes: 55
learningOutcomes:
  - Read a DICOM workflow at the level of modality worklist, C-STORE, query/retrieve, and explain where the PACS, VNA, and EHR each sit.
  - Distinguish PACS from RIS from VNA from universal viewer and defend the architectural role of each.
  - Name the IHE profiles that govern cross-enterprise imaging exchange (XDS-I, PIX, PDQ, ATNA, XUA) and explain what each one does.
  - Explain DICOMweb (WADO-RS, QIDO-RS, STOW-RS) and why it matters for modern viewers.
  - Recognize the architectural and de-identification gotchas the boards reuse.
concepts:
  - dicom-standard
  - dicom-information-object
  - dimse-services
  - dicom-modality-worklist
  - pacs
  - ris
  - vna
  - enterprise-imaging
  - ihe-profiles
  - ihe-xds-i
  - ihe-pix-pdq
  - ihe-atna
  - ihe-xua
  - wado-rs
---

## Reading

Imaging is the part of clinical informatics most people think they can skip until they cannot. The boards do not let you skip it. Imaging informatics has its own standard (DICOM, born in 1993 and effectively unchanged in its bones since), its own departmental systems (the PACS and the RIS), its own archive pattern (the VNA), its own profile family for interoperability (IHE), and its own modern web bridge (DICOMweb). It also has its own privacy gotchas, its own identity gotchas, and its own way of failing that is unlike anything else in the EHR. You will see all of this on the exam, and you will see it in real life the first time a CMIO is asked to defend an imaging strategy without knowing what a VNA is.

Start with **DICOM**. DICOM stands for Digital Imaging and Communications in Medicine, and it is two things at once. It is a *file format*: every CT slice, every MRI volume, every chest radiograph is a DICOM object whose header carries patient identifiers, study identifiers, series identifiers, modality, acquisition parameters, and a UID hierarchy that uniquely identifies the image across the universe. It is also a *network protocol*: the DIMSE services (C-STORE, C-FIND, C-MOVE, C-GET, and the storage commitment and modality worklist services) define how DICOM nodes talk to each other over TCP/IP. Every modality, every PACS, every viewer, every workstation in radiology — and increasingly in cardiology, ophthalmology, dermatology, pathology, and point-of-care ultrasound — speaks DICOM. If a stem describes any image being acquired, transmitted, stored, or retrieved in a hospital, DICOM is in the picture.

The four DIMSE services you should be able to walk through in order:

- **C-STORE** is the *push*. A modality acquires an image and pushes the DICOM object to the PACS. C-STORE is what happens at the end of every scan.
- **C-FIND** is a *query*. A workstation asks the PACS, "do you have any studies for patient X performed on date Y?" The PACS returns a list of matching studies as metadata.
- **C-MOVE** asks the PACS, "send the study you just told me about to *that other node*." The PACS then opens a separate association to the named third node and pushes the images there. C-MOVE is the most common retrieval pattern in classical PACS-to-workstation workflows.
- **C-GET** asks the PACS, "send the study back to *me* over this same connection." Less common historically because of firewall and association complexity, but conceptually cleaner. The boards test whether you can tell C-MOVE and C-GET apart from a stem that specifies who is supposed to receive the images.

The fifth DIMSE service that has its own board personality is **DICOM Modality Worklist (MWL)**. MWL is a query the modality makes to the RIS or EHR at the start of the day to retrieve the schedule of exams with patient demographics already populated, so the technologist does not have to retype the patient name, MRN, accession number, and exam description at the modality console. MWL is the single most important interoperability win in imaging. It is also the one that hospitals fail to implement and then cannot understand why their PACS is full of typo-mangled patient identifiers and orphaned studies. If a stem describes "technologists retyping at the modality console" or "studies cannot be auto-routed because of demographic mismatches," the answer is almost always missing or broken MWL.

Now the departmental systems. The **PACS** (Picture Archiving and Communication System) is the radiology system that stores images, indexes them, and serves them to radiologist workstations. The **RIS** (Radiology Information System) is the radiology workflow system — orders, scheduling, technologist assignments, dictation/reporting, and billing. PACS handles pixels; RIS handles paperwork. Many modern EHRs have absorbed the RIS function into the EHR's order entry and reporting modules, but the boards still expect you to know that historically these were separate systems and that "the radiology workflow lives in the RIS" was a true sentence for decades.

The PACS pattern, by itself, has a problem: it locks images into a vendor-proprietary database. Replacing a PACS used to require a multi-month image migration project, with risk of metadata loss and image-rendering differences, and the incumbent vendor knew this and priced their renewals accordingly. The architectural answer is the **VNA**, the Vendor-Neutral Archive. A VNA stores DICOM objects in a standards-based archive — DICOM-conformant storage with preserved metadata, and increasingly with extensions for non-DICOM imaging — independent of any one PACS. With a VNA in place, the PACS becomes a viewer-and-workflow layer sitting in front of a shared archive that the organization owns. The PACS can be swapped without re-migrating the underlying images, because the source of truth is the VNA. This is the architectural move that breaks PACS vendor lock-in, and it is the move you should be able to defend out loud as a CMIO.

The VNA matters for a second reason, which is **enterprise imaging**. Enterprise imaging is the discipline of governing all imaging across the organization — radiology, cardiology, dermatology, ophthalmology, endoscopy, pathology, point-of-care ultrasound, smartphone wound photography — under a unified strategy with shared identity, a shared archive (typically a VNA), and a shared universal viewer, instead of department-by-department silos. The hard problems in enterprise imaging are the non-radiology corners: dermatology and ophthalmology often live in departmental databases that the EHR cannot read, point-of-care ultrasound images may live on the SD cards in the probes themselves, smartphone wound photography is often not governed at all, and pathology slides are gigabyte-scale objects with their own viewer requirements. Bringing this long tail into a governed acquisition and storage workflow is the actual work; buying a VNA is the easy part.

Now the interoperability layer. **IHE — Integrating the Healthcare Enterprise** — is a profile organization, not a standards organization. IHE does not invent standards. IHE takes existing standards (DICOM, HL7, web services) and writes *implementation profiles* that constrain those standards to specific, testable interoperability use cases, so that two vendors who both implement a profile actually work together. IHE runs interoperability test events ("Connectathons") where vendors prove their profile conformance against each other. The boards test you on the names of the profiles and what each one does. For imaging the profiles you must know:

- **XDS-I.b** — Cross-Enterprise Document Sharing for Imaging. A registry/repository pattern that lets one organization publish imaging studies into a shared registry and another organization discover and retrieve them across enterprise boundaries. The closest thing to a real cross-enterprise imaging exchange standard. Pairs with the document-side XDS profile when the same infrastructure is reused for clinical documents.
- **PIX (Patient Identifier Cross-Reference)** — reconciles MRNs across institutions. Returns the set of identifiers that all refer to the same person.
- **PDQ (Patient Demographics Query)** — lets a system search for a patient by demographic fields rather than by MRN. Useful when the requesting system does not yet know the receiving system's MRN space.
- **ATNA (Audit Trail and Node Authentication)** — does two things, and you must know both. One: TLS authentication between every node, so that nodes are mutually authenticated. Two: standardized audit events for PHI access, written to a central audit record repository in a defined format (DICOM Supplement 95 / RFC 3881 syslog audit messages). ATNA is how IHE deployments operationalize the HIPAA Security Rule's audit-controls requirement. If a stem describes "TLS is enabled but audit logs are scattered across application logs in inconsistent formats," ATNA is incomplete on the audit half — and that is the failure mode the boards test.
- **XUA (Cross-Enterprise User Assertion)** — carries the *user's* identity (typically as a SAML token) across organizational boundaries, so that audit logs in the receiving system can attribute access to a real human at the sending organization. Distinct from PIX, which carries the *patient's* identity.

The boards reward you for keeping these profiles cleanly separated. PIX is patient identity. XUA is user identity. ATNA is audit and node authentication. XDS-I is the actual imaging exchange. A real cross-enterprise imaging deployment uses all four together, and a stem that describes one of them by symptom expects you to name it specifically.

Finally, the modern web bridge. **DICOMweb** is the web-services version of DICOM, designed so that browser-based viewers and modern applications can consume imaging without speaking the legacy DIMSE TCP protocol. The three DICOMweb verbs:

- **WADO-RS** (Web Access to DICOM Objects, RESTful) — retrieves images over HTTP.
- **QIDO-RS** (Query based on ID for DICOM Objects, RESTful) — queries for studies, series, and instances.
- **STOW-RS** (Store Over the Web, RESTful) — stores images.

DICOMweb is what makes a zero-footprint browser viewer possible on a tablet at the bedside. It is also the bridge by which FHIR's `ImagingStudy` resource references actual pixel data: `ImagingStudy` carries the metadata reference, but the pixels are retrieved through a WADO-RS URL. The boards expect you to know that FHIR `ImagingStudy` does not transport pixels — it points at DICOMweb endpoints — and that DICOMweb is the right answer when a stem describes browser-based viewing without legacy DIMSE.

A note on **DICOM de-identification**, because this is the imaging-specific privacy gotcha that the boards reuse. A DICOM object contains many identifier-bearing tags beyond the patient name: accession number, study date and time, institution name and address, device manufacturer and serial number, referring physician name, patient ID, and the entire study and series UID hierarchy. In addition, ultrasound, fluoroscopy, and many other modalities can burn patient identifiers directly into the pixel data as text overlays. Real DICOM de-identification follows the DICOM Supplement 142 / PS 3.15 Annex E profiles, which specify which tags must be removed, replaced, or pseudonymized, and may also require pixel-region blackout for burned-in text. Removing the patient name field is the beginning of the work, not the end. A research team that asks for "de-identified images" and receives a file with only the name removed has a privacy problem, not a research dataset.

## Concrete example

A regional health system has grown by acquisition into four hospitals, two PACS vendors, and a fifth imaging center it just bought. The CMIO inherits a complaint: a patient who gets a CT in the ED at one hospital and is transferred to another hospital in the same system has to be re-scanned, because the receiving hospital cannot retrieve the images. The CMIO's solution has three parts. First, deploy a VNA that stores DICOM objects from all four PACS in one standards-based archive, with shared patient identity reconciled using IHE PIX across the legacy MRN spaces of the acquired hospitals. Second, deploy a universal viewer that pulls from the VNA so any clinician at any hospital can see any patient's images in their EHR context, with audit events flowing through ATNA. Third, write a procurement clause that the next PACS replacement will sit in front of the VNA, not behind it, so the VNA — not the new PACS — owns the pixels.

A year later, the regional HIE asks the system to participate in cross-enterprise imaging exchange with a competing system across town. The VNA is already the right home for the published studies. The system layers in IHE XDS-I.b for the registry/repository pattern, PIX for cross-organizational identity, XUA for user identity assertion in the cross-system audit logs, and ATNA for the TLS plus audit-event requirements. Nothing about this architecture is new. All of it is profile-by-profile reuse of standards that have existed for two decades. The work is naming the profiles and wiring them together, and the boards expect you to be able to do exactly that on a stem.

## Uncomfortable question

If the technical pattern for cross-enterprise imaging — VNA plus XDS-I.b plus PIX plus ATNA plus XUA plus a universal viewer — has been available and proven for more than a decade, why is duplicate cross-system imaging still routine in 2026? Where is the gap, and is it a standards gap, an identity gap, an organizational gap, or an economic gap?

Hold your answer.
