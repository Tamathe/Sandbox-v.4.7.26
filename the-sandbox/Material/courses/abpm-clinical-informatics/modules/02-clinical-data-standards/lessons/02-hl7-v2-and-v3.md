---
id: 02-hl7-v2-and-v3
title: HL7 v2 and v3 — The Old Workhorse and the Failed Successor
order: 2
estimatedMinutes: 40
learningOutcomes:
  - Read an HL7 v2 message and identify the message type, segments, fields, and key data.
  - Name the HL7 v2 message types the boards test (ADT, ORM, ORU, MDM, SIU, DFT) and what each is for.
  - Explain why HL7 v3 was attempted, what it tried to fix, and why it lost to FHIR in plain language.
concepts:
  - hl7-v2
  - hl7-v3
  - rim-reference-information-model
  - mllp-transport
  - adt-orm-oru
  - mdm-siu-dft
  - delimiters-pipe-hat
---

## Reading

If you walked into any U.S. hospital today and asked the integration team what protocol most of their interfaces use, the answer would still be HL7 v2 — a standard whose first version was published in 1987 and which has not had a major architectural change in over twenty years. FHIR is growing fast, the press writes about it weekly, and yet the workhorse that moves admissions, orders, results, and documents around inside the average hospital is HL7 v2. The boards know this and will test you on v2 specifically because it is what you will actually encounter, and because the candidates who skipped it because it "felt old" tend to lose easy points.

HL7 v2 is a message-based standard. A v2 message is a sequence of *segments*, each segment is a sequence of *fields*, fields are separated by pipes (`|`), and a small set of subsidiary delimiters handle further nesting. The famous opening segment of every v2 message is `MSH` — the Message Header — which begins with the literal characters `MSH|^~\&|`, where the characters after `MSH|` define the delimiters used in the rest of the message: `|` for field separator, `^` for component, `~` for repetition, `\` for escape, `&` for sub-component. You will see this on the boards. If you can read `MSH|^~\&|` and explain what each character does, you have already done more than half the work of v2 literacy.

Here is a stripped-down ADT message for a patient admission:

```
MSH|^~\&|EPIC|HOSPITAL|LAB|HOSPITAL|202604061200||ADT^A01|MSG00001|P|2.5
EVN|A01|202604061200
PID|1||MRN12345^^^HOSPITAL^MR||DOE^JANE^^^^||19750815|F
PV1|1|I|MED^210^A|||||||MED|||||||V|MRN12345
```

Read it slowly. Line by line:

- `MSH` — message header. Sender (`EPIC|HOSPITAL`), receiver (`LAB|HOSPITAL`), timestamp, message type (`ADT^A01` — an admit/visit notification, trigger event A01 = admit), control ID, processing ID (P = production), version (2.5).
- `EVN` — event type. Confirms `A01` and gives the recorded event time.
- `PID` — patient identification. Patient ID (`MRN12345`), name (`DOE^JANE`), date of birth, sex.
- `PV1` — patient visit. Inpatient (`I`), location (`MED` ward, room `210`, bed `A`), service.

That is the entire message. There is no XML, no JSON, no schema file you have to download. The receiving system parses the pipes, recognizes the segment headers, and writes the data into its own database. The format is ugly, the documentation is dense, and it has been holding the U.S. health system together for nearly forty years.

The **message types** you need to recognize on sight are these:

- **ADT** (Admit, Discharge, Transfer): patient movement events. Triggered by A01 (admit), A02 (transfer), A03 (discharge), A04 (register outpatient), A08 (update), A11 (cancel admit). Almost every other system in the hospital subscribes to ADT to keep its patient list in sync with the EHR. If a board question describes a system "out of sync with the patient census," ADT is almost always the answer.
- **ORM** (Order Message): orders being placed. Sent from a CPOE system to an ancillary (lab, radiology, pharmacy). The ORM family is being slowly replaced by OML and other newer order messages, but ORM is still the term the boards use.
- **ORU** (Observational Result Unsolicited): results coming back. Lab values, radiology reports, anything an ancillary system needs to push to the EHR. ORU is the most common message type by volume in most hospitals.
- **MDM** (Medical Document Management): clinical documents — discharge summaries, transcribed notes, scanned PDFs. The MDM message wraps the document and tells the receiving system where to file it.
- **SIU** (Scheduling Information Unsolicited): scheduling events. Appointments, cancellations, reschedules. SIU is to scheduling what ADT is to admissions.
- **DFT** (Detailed Financial Transaction): charges. Sent from clinical systems to billing.

If you can recognize ADT/ORM/ORU/MDM/SIU/DFT from a board stem and say what each is for, you have the v2 message-type question covered. The exam writers occasionally throw in a more obscure type (BAR for billing account, RAS for pharmacy administration, VXU for immunizations) but those are bonus rather than core.

Now the transport. HL7 v2 messages are typically moved over **MLLP** (Minimal Lower Layer Protocol), which is a thin wrapper that frames a message inside a TCP connection with start and end markers (a vertical-tab character to start, a file-separator + carriage-return to end). MLLP is older than the modern web, has no built-in encryption, and is usually run inside the hospital network or over a VPN. When a board question asks how v2 messages move between systems and the answer choices include MLLP, that is almost always the answer for intra-hospital traffic. Inter-hospital traffic uses richer transport (HIE platforms, Direct, FHIR) on top of which v2 messages may or may not still be flowing.

So that is HL7 v2: a delimited, segment-based, message-driven content standard with a primitive transport, dating from the 1980s, still running most of the country's clinical interfaces. It works because everyone knows it and because the implementation cost has been amortized for decades. It fails because every interface is slightly different — the standard is *flexible*, vendors *use* the flexibility, and so connecting two systems still requires a custom mapping project rather than a plug-and-play. The flexibility was originally a feature; it has become the field's main complaint about the standard.

Now the failed successor.

**HL7 v3** was the standard HL7 designed in the late 1990s and 2000s to fix what was wrong with v2. It was built on a single underlying object model called the **Reference Information Model (RIM)**, which tried to express every clinical concept in terms of a small set of primitive classes (Act, Entity, Role, Participation, etc.). The idea was beautiful: instead of every interface being a custom mapping, every message would be a serialization of the same underlying model, and tools could be built that operated on the model rather than on the wire format. v3 messages were XML, the data types were rigorous, and the documentation was exhaustive.

v3 lost. It lost for several reasons that you should be able to articulate, because the field treats the loss as a cautionary tale and the boards will give you a question about it.

It lost because the **learning curve was vertical**. You could not write a v3 message without internalizing the RIM, and the RIM took weeks of study to use correctly. Most implementers gave up.

It lost because the **specification was enormous**. The standard was so big and so detailed that no two implementations interpreted it identically, which defeated the entire purpose of having one model.

It lost because **the tooling never caught up**. v3 needed sophisticated tools to be usable, and the tools that existed were expensive, fragile, and required RIM expertise to operate.

It lost because **vendors had no incentive to migrate**. v2 worked, the interfaces existed, and there was no Meaningful Use requirement for v3 specifically. The migration cost was enormous and the benefit was theoretical.

The one piece of v3 that survived is **CDA** (Clinical Document Architecture), which was Meaningful-Use-relevant for document exchange (the C-CDA, Consolidated CDA, was the format hospitals had to produce for the patient summary). CDA documents are XML, derived from the RIM, and are still in production use, though FHIR's Document profile is increasingly preferred for new work.

The lesson HL7 took from v3 is the lesson that produced FHIR: standards have to be *easy to implement with normal tools*, not theoretically beautiful. FHIR is built on REST and JSON, has a learning curve a competent web developer can climb in a week, and has an active reference implementation. It is what v3 failed to be, and we will spend the next lesson on it.

## Concrete example

A 2010-era project at a large academic medical center attempted to migrate the entire interface engine from HL7 v2 to v3 over three years. The team hired RIM specialists, built a v3 mapping for every existing interface, and ran v2 and v3 in parallel for testing. After eighteen months, the v3 messages were technically valid, the mappings were complete, and not a single downstream system could consume them — because none of the lab systems, radiology systems, or pharmacy systems the hospital connected to had any v3 implementation. The project quietly reverted to v2, repurposed the v3 work as documentation, and ended.

The team was not bad. The standard was not bad in the abstract. The standard required the entire ecosystem to migrate at once, and the ecosystem had no reason to. This is what happens when a standard is correct in theory and unanchored in deployment incentives. It is also exactly what FHIR set out to avoid.

## Uncomfortable question

HL7 v2 has been "about to be replaced" for nearly twenty years. It will probably still be running the country's clinical interfaces in 2035. If that's true, what does it tell you about how to evaluate any new standard's chances of replacing an entrenched one — and how should it shape your reaction the next time someone tells you a new standard is going to fix interoperability?

Hold your answer.
