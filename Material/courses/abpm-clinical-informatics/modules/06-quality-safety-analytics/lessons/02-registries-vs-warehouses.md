---
id: 02-registries-vs-warehouses
title: Registries, Warehouses, Marts, and Lakes — When to Build Each
order: 2
estimatedMinutes: 35
learningOutcomes:
  - Define a clinical registry, a data warehouse, a data mart, and a data lake, and state when each is the right choice.
  - Distinguish a registry's purpose-built case-finding logic from a warehouse's general-purpose analytical store.
  - Identify the data governance, freshness, and fitness-for-use questions that determine whether an analytical store can answer a given question.
  - Trace the data flow from the clinical data repository (Module 3) into a downstream analytical environment.
concepts:
  - clinical-registry
  - data-warehouse
  - data-mart
  - data-lake
  - clinical-data-repository
  - data-governance
  - fitness-for-use
  - etl-vs-elt
---

## Reading

A theme that runs through this entire module: the boards do not test your ability to build a data warehouse. They test your ability to know what kind of analytical structure each clinical question requires, and to recognize when someone has reached for the wrong one. The four words **registry**, **warehouse**, **mart**, and **lake** are not interchangeable. Each names a specific architectural pattern with specific trade-offs, and the reason all four exist is that no single structure handles every analytical need well. The boards reward you for being able to pick the right one given a stem; the field rewards you for being able to push back when leadership has confused them.

Before any of the four make sense, you need to remember the **clinical data repository (CDR)** from Module 3. The CDR is the operational store that the EHR reads and writes during clinical care. It is normalized for transactional integrity, optimized for low-latency single-patient lookups, and designed so that every clinical action — order placement, result return, note signing — is fast. It is *not* designed for population queries. Asking the CDR "how many of our type 2 diabetics had a foot exam in the last year" is technically possible and operationally hostile: the query competes with clinical traffic, the schema is not optimized for the join, and the answer changes between the time you ask and the time you finish reading it. The four downstream structures exist to solve this problem in different ways for different audiences.

### Clinical registry

A **clinical registry** is a purpose-built database that identifies and tracks every patient with a specific condition, exposure, intervention, or device, for a specific analytic or operational purpose. The registry is defined by its **case-finding logic** — the rules that determine which patients belong in it — and by the structured data elements it captures about each enrolled patient.

Examples make the definition concrete:

- A **diabetes registry** captures every patient with diabetes in a defined population, along with their most recent HbA1c, blood pressure, LDL, foot exam date, eye exam date, and ACE/ARB medication status. It is used to drive panel management — identifying patients overdue for a measure, sending reminders, tracking improvement over time.
- A **cancer registry** captures every newly diagnosed cancer in a hospital or region, with stage, histology, treatment, and outcome. State and federal cancer registries (the SEER program, the National Cancer Database) aggregate hospital registries into large surveillance datasets.
- A **device registry** (for example, the ACC's TVT registry for transcatheter valve replacement) captures every patient who received a specific device or underwent a specific procedure, with structured outcomes for FDA post-market surveillance.

The defining features of a registry are: **purpose-built case-finding** (you decide who is in it based on a specific clinical definition), **structured data elements** (you capture a fixed set of variables, often with manual abstraction or curation on top of EHR-derived data), and a **defined operational or analytic purpose** (panel management, post-market surveillance, quality reporting, clinical research). A registry is not "all the data we have on these patients"; it is "the specific data we have decided to track on these patients for a specific reason."

Two failure modes the boards quietly test: a registry whose case-finding logic drifts out of sync with the rest of the institution (the registry says 4,000 diabetics; the EHR says 5,200; nobody knows which is right) and a registry whose data elements have decayed because nobody is curating them (the foot exam date is from 2019). Registries are high-maintenance assets and the maintenance is the part that fails first.

### Data warehouse

A **data warehouse** is a general-purpose analytical store, fed periodically from operational sources, modeled for analytical queries, and designed to answer questions that cross many patients, many encounters, and many data domains. It is the place where the population-level "how many of our type 2 diabetics" question lives, and where it can be answered without competing with clinical traffic.

The warehouse has three defining features. **It is fed from operational sources by an extract-transform-load (ETL) or extract-load-transform (ELT) pipeline.** Data flows out of the CDR (and out of the lab system, the billing system, the scheduling system, the pharmacy system) on a periodic schedule — nightly is common, hourly is increasingly common — and lands in the warehouse in a form that has been cleaned, conformed, and modeled for analysis. **It is dimensionally modeled** (typically using a Kimball-style star schema, with fact tables for measurable events like encounters and lab results and dimension tables for entities like patients, providers, and dates). **It supports a wide range of analytical questions** rather than being purpose-built for one.

The warehouse pays for its generality with **freshness lag**. The data in the warehouse is as fresh as the most recent ETL run. If the question is "how many beds are open right now," the warehouse is the wrong tool — that is a question for the operational system. If the question is "what was our inpatient occupancy by hour, day, and unit over the last twelve months," the warehouse is the right tool. Knowing which side of the freshness line a question falls on is part of the literacy.

The relationship between a CDR and a warehouse is the most-tested architecture diagram in this section. The CDR is operational, real-time, optimized for transactions. The warehouse is analytical, periodic, optimized for large queries. The same data exists in both, in different forms, for different purposes. An institution that tries to do warehouse-style queries against the CDR will hurt clinical performance. An institution that tries to do real-time clinical work against the warehouse will be making decisions on stale data. Both are common errors. The boards test the disambiguation.

### Data mart

A **data mart** is a subset of the warehouse, focused on a specific subject area or audience, modeled to answer the questions that audience cares about, and physically separated for performance and access control. Where the warehouse is the institution's general-purpose analytical store, the mart is the cardiology service line's view of the warehouse, or the population health team's view, or the finance team's view.

Marts exist for three reasons: **performance** (a focused mart is faster to query than the whole warehouse), **access control** (the cardiology team gets the cardiology mart, not the whole institution's data), and **modeling** (the mart can have its own dimensional model tuned to its specific questions, even if the underlying warehouse has a different one). Most large institutions have a warehouse plus a constellation of marts on top of it.

The boards test the warehouse-vs-mart distinction less often than the registry-vs-warehouse distinction, but they test it. Know that a mart is *derived from* the warehouse, not parallel to it; an institution that has marts feeding the warehouse instead of the warehouse feeding the marts has built itself an integration nightmare.

### Data lake

A **data lake** is a large, schema-on-read store of raw data — structured, semi-structured, and unstructured — kept in its native format and parsed only when queried. The lake's argument against the warehouse is: warehouses force you to decide the schema before you load the data, and that decision throws away information that turns out to matter later. The lake's argument is to load everything, decide later.

Lakes are the right tool when the data is genuinely heterogeneous and the analytic uses are not yet known. Imaging files. Clinical notes in raw text. Sensor streams from monitors. Genomic sequence data. The schema-on-read approach lets a data scientist load a Parquet file or a JSON document and write a query against it without first negotiating with the warehouse team about how the schema should change.

Lakes pay for that flexibility with **discipline cost**. A warehouse is curated, cleaned, governed, and predictable. A lake is raw and the consumer has to do the curation themselves at query time, every time. Without strong governance, a lake becomes a "data swamp" — everything is in there and nothing is findable, trustworthy, or reproducible. The phrase appears on the boards.

A common modern architecture is a **lakehouse** — a layered architecture where raw data lands in a lake-style storage layer and is then progressively curated into warehouse-style modeled tables for analytical use. The boards have started to test the term. Know it as a hybrid that tries to capture both flexibility and discipline.

## Governance, freshness, and fitness-for-use

The choice between these structures is not just architectural. It is governed by three operational questions that the boards reward you for asking before you commit to any of them.

**Governance.** Who decides what goes in, what comes out, who can read it, and how the definitions are maintained? A registry without governance becomes obsolete in eighteen months. A warehouse without governance accumulates conflicting definitions of "patient" and "encounter" until no number coming out of it can be trusted. The governance question is not optional and is the question that institutions most often skip.

**Freshness.** How recent does the data need to be for the question being asked? The CDR is real-time. The warehouse is hours-to-days behind. A registry's freshness depends on whether the case-finding pipeline runs nightly or quarterly. A lake's freshness depends on what landed in it most recently. Match the freshness to the question. A real-time bed-management dashboard cannot be built on a warehouse with a 24-hour ETL lag. A retrospective five-year readmission study should not be running against the CDR.

**Fitness-for-use.** Was the data captured for the purpose you are using it for, and if not, what does that mean for your conclusions? Most clinical data was captured for billing or for documentation, not for analytics. Diagnoses are coded for the encounter that maximizes reimbursement, not for population case-finding. Race and ethnicity are sometimes recorded by the registration clerk based on appearance. Smoking status was last updated at the visit three years ago. The phrase **fitness-for-use** is the formal name for the discipline of asking, for any data element, what its capture process was and what biases that capture process introduces. The boards test the term and the discipline. A data warehouse that has been validated against billing reconciliation is fit for the use of "what did we charge" and not necessarily fit for the use of "what did we do clinically." A registry whose foot-exam status is hand-abstracted by trained nurses is fit for one purpose; the same field auto-extracted by NLP from notes is fit for a different one.

## Concrete example

A health system has run a homegrown diabetes registry for six years. The registry was originally built by the chronic-care team for panel management — identify patients overdue for HbA1c, send outreach, track who closed care gaps. The case-finding logic is "any patient with two or more outpatient visits in the past two years and at least one ICD-10 code for diabetes." The registry runs as a SQL job against the CDR every Sunday night and updates a list of about 4,300 patients. The chronic-care team uses the list to drive monthly outreach.

The institution has also stood up an enterprise data warehouse over the last three years, with nightly ETL from the EHR, a Kimball-style star schema, and a small team of analysts who serve quality, finance, and population health. The warehouse identifies "diabetic patients" using a different definition — any patient with at least one diabetes ICD-10 code on a problem list or encounter diagnosis at any point in the past five years — and counts about 6,800.

A new VP of Population Health asks why the two numbers disagree, and which one is right.

The honest answer is: neither is wrong, and the question "how many diabetics do we have" does not have a single correct answer. The registry uses an *active-care* definition appropriate for outreach: the patient has to be coming to the institution and recently coded as diabetic. The warehouse uses a *historical-cohort* definition appropriate for population analytics: the patient has any record of diabetes at any time. Both definitions are defensible. The two structures exist because the two questions are different. The right operational fix is governance — write down the definitions, agree on which definition is used for which decision, and stop comparing the two numbers as if one of them must be wrong.

The wrong fix, which institutions reach for constantly, is to dissolve the registry into the warehouse on the rationale that the institution should have "one source of truth." The single-source-of-truth dream is the most common failure mode in this part of the field. There is no single source of truth because there is no single question. There is a clean conversation about which structure answers which question, and a governance discipline that keeps the conversations from collapsing into each other.

## Uncomfortable question

The argument for "one source of truth" is appealing because it promises to end exactly the kind of confusion described above — the diabetes count that means different things to different teams. The argument against it is the lesson of this entire chapter: different questions require different structures, and forcing a single structure to answer all questions produces an answer that is wrong for most of them. If you sit on a quality committee and your CIO has just announced a "one source of truth" initiative, what is your move? Do you support it (because the alternative is real chaos), oppose it (because you know how it ends), or try to redirect it toward governance instead of architecture? The boards do not test this question. The job does.

Hold your answer.
