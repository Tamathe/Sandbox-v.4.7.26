---
id: 07-umls-and-the-meta-vocabulary
title: UMLS — The Meta-Vocabulary the Boards Expect You to Name
order: 7
estimatedMinutes: 35
learningOutcomes:
  - Explain what the UMLS Metathesaurus is, what a CUI is, and what problem UMLS solves that no individual vocabulary solves.
  - Distinguish the three UMLS knowledge sources (Metathesaurus, Semantic Network, SPECIALIST Lexicon) and what each is used for.
  - Recognize when an application is using UMLS vs using a single source vocabulary like SNOMED or LOINC.
  - Name cTAKES and MetaMap as the canonical UMLS-based clinical NLP tools.
  - Articulate the licensing nuance — UMLS is free under an NLM license but contains proprietary source vocabularies.
concepts:
  - umls-metathesaurus
  - umls-cui
  - umls-semantic-network
  - umls-specialist-lexicon
  - umls-license
  - ctakes-metamap
---

## Reading

The previous lessons in this module gave you SNOMED CT for clinical findings, LOINC for what was measured, RxNorm for medications, ICD-10 for billing, and UCUM for units. Each of those is a *source* vocabulary. Each was built by a different organization for a different purpose under a different release cycle, and each uses its own identifiers. SNOMED calls myocardial infarction `22298006`. ICD-10-CM calls it `I21.9`. MeSH calls it `D009203`. RxNorm has nothing to say about it because RxNorm is a medication vocabulary. The same clinical idea has many names, and any application that needs to consume coded data from more than one source has to reconcile them. The reconciliation problem is older than any one of these vocabularies and has its own answer.

The answer is **UMLS — the Unified Medical Language System** — built and maintained by the U.S. National Library of Medicine since 1986. UMLS is not another vocabulary. UMLS is a *meta-vocabulary*: a unifying database that ingests more than 200 source vocabularies, identifies which terms across them refer to the same underlying concept, and assigns each concept a stable **Concept Unique Identifier (CUI)**. The CUI for myocardial infarction is `C0027051`, and that single identifier links the SNOMED code, the ICD-10 code, the MeSH heading, the ICD-9 code, the older Read codes, the local hospital dictionary entries, and the foreign-language equivalents — all to the same concept. UMLS is what you reach for when an application needs to normalize coded data that arrives in many vocabularies into a shared concept space.

UMLS is the answer to a board question of the form: "An application receives clinical data from multiple source systems coded in different vocabularies and needs to treat semantically equivalent codes as equivalent. Which resource is most appropriate?" The answer is UMLS. Not SNOMED, not LOINC, not ICD — those are the things UMLS is reconciling.

UMLS has three parts, and the boards test whether you know all three.

The first part is the **Metathesaurus**. The Metathesaurus is the actual concept database — the thing that holds the CUIs and the source-vocabulary mappings. It is large (more than four million concepts when you count all source vocabularies) and is released by the NLM twice a year. Most "UMLS-powered" applications you will encounter are talking about the Metathesaurus when they say UMLS. If the boards say "UMLS" without further qualification, they probably mean the Metathesaurus.

The second part is the **Semantic Network**. The Semantic Network sits *above* the Metathesaurus. It is a typed graph of about 130 **semantic types** (Disease or Syndrome, Pharmacologic Substance, Sign or Symptom, Body Part, Anatomical Structure, Therapeutic or Preventive Procedure, and so on) and a set of allowed **semantic relations** between those types (treats, causes, location_of, part_of, manifestation_of, etc.). Every concept in the Metathesaurus is assigned one or more semantic types, so an application can reason about *what kind of thing* a concept is even if it has never seen that specific concept before. The Semantic Network is what lets a clinical NLP system know that "lisinopril" is a Pharmacologic Substance and "hypertension" is a Disease or Syndrome and that the relation "treats" is plausible between them. The Network is small (the 130 types and the relation set), highly stable, and a frequent board question because it is the part of UMLS most people forget.

The third part is the **SPECIALIST Lexicon**. SPECIALIST is a large biomedical English lexicon used for natural-language processing of clinical text. It powers stemming, lemmatization, part-of-speech tagging, and morphological analysis in tools that map free-text clinical narrative to UMLS concepts. SPECIALIST is the part of UMLS most directly useful for clinical NLP pipelines, which is why the canonical UMLS-based NLP tools depend on it.

Those tools — and you should know their names — are **cTAKES** and **MetaMap**. cTAKES (clinical Text Analysis and Knowledge Extraction System) is an open-source NLP pipeline from the Mayo Clinic, built on Apache UIMA, that extracts UMLS concepts from clinical notes. MetaMap is the NLM's own tool for mapping biomedical text to the Metathesaurus. Both are board-named: when a stem describes "extracting structured concepts from a free-text discharge summary" or "mapping clinical narrative to UMLS CUIs," cTAKES and MetaMap are the answers the boards reach for. Modern transformer-based clinical NLP is rapidly displacing these tools in research practice, but their *names* are still the board answer because the exam reflects established curricula, not last year's papers.

Two more things about UMLS the boards test, and one thing they do not.

The thing they test, first: **licensing**. UMLS is free for use under a National Library of Medicine UMLS Metathesaurus License. The license is free in the sense of "no money," but it imposes use restrictions, because some source vocabularies inside the Metathesaurus are themselves proprietary. CPT, for example, is licensed by the AMA, and an application that uses CPT through UMLS still has to comply with the AMA's terms. Some sources are restricted to research, some to specific countries, some to specific use cases. The practical implication: a startup that trains a model on UMLS-derived data and then ships it to customers needs a lawyer to read the source-by-source license matrix, not just a casual reading of "UMLS is free." The boards expect you to know that "free under UMLS" is not the same as "free of all licensing constraints," and to flag the CPT case specifically.

The thing they test, second: **the difference between UMLS and a single source vocabulary**. SNOMED CT is large and clinically expressive, and it is tempting to treat SNOMED as if it were UMLS. It is not. SNOMED is one of the source vocabularies UMLS ingests. If your application only ever needs to deal with SNOMED-coded data, you do not need UMLS — you need a SNOMED license and a SNOMED browser. The moment your application needs to consume codes from more than one vocabulary and treat them as equivalent when they refer to the same concept, you need UMLS, because reconciling across vocabularies is the problem UMLS exists to solve. The boards write stems that describe a multi-vocabulary reconciliation problem and reward you for naming UMLS rather than SNOMED.

The thing they do *not* test heavily: the internal structure of the Metathesaurus tables (MRCONSO, MRREL, MRSTY, etc.). That level of detail is for someone who is going to write code against UMLS directly, and it is not in the ABPM blueprint. Know that UMLS is a database, know what a CUI is, know the three knowledge sources, know cTAKES and MetaMap, know the licensing nuance. Stop there.

## Concrete example

A research team is building a phenotyping pipeline to identify patients with heart failure across five hospitals in a regional consortium. Three of the hospitals send problem-list data coded in SNOMED CT. One sends ICD-10-CM only because it never implemented a structured problem list. One sends a mix of SNOMED, ICD-9 (legacy data still in the warehouse), and free-text problem entries from a custom local dictionary. The team's first move is to normalize everything into a shared concept space. They use UMLS: every SNOMED code is mapped to its CUI, every ICD-10 and ICD-9 code is mapped to its CUI, the local dictionary terms are mapped through MetaMap to the Metathesaurus, and the free-text fields are run through cTAKES to extract additional CUIs. After normalization, the team queries on a small set of CUIs that capture heart failure and its subtypes. The query is hospital-agnostic and vocabulary-agnostic, and it works for all five sites because UMLS has done the reconciliation.

Note what UMLS did not do. It did not write the phenotype definition. It did not decide which CUIs constitute "heart failure" — that is a clinical judgment the team made, often with help from validated phenotype libraries like eMERGE or PheKB. UMLS only solved the vocabulary-reconciliation step. The clinical case definition is still the team's problem, and the boards will sometimes test whether you can articulate that distinction: UMLS reconciles vocabularies; phenotype libraries define clinical cases; the two are different layers of the stack.

## Uncomfortable question

If UMLS has solved cross-vocabulary reconciliation since the late 1980s, and if the major U.S. clinical vocabularies have all been ingested into UMLS for decades, why do most U.S. health systems still struggle to do basic cross-vocabulary phenotyping at scale? Where is the friction — is it the tooling, the licensing, the data hygiene at the source, or the fact that most clinical applications were never built to consume CUIs in the first place?

Hold your answer.
