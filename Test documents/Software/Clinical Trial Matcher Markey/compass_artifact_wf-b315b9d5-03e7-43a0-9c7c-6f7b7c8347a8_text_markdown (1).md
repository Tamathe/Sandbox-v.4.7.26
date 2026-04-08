# AI-powered clinical trial matching for precision oncology: a technical blueprint

**Large language models can now match oncology patients to clinical trials with 87–93% criterion-level accuracy, cutting coordinator screening time by 60–85% and boosting trial accrual by 25–40%.** This report provides a comprehensive technical blueprint for building such a system at the University of Kentucky Markey Cancer Center's Molecular Tumor Board. The architecture follows a five-stage pipeline — patient profile extraction, trial retrieval, criterion-by-criterion matching, ranking, and explainable output — leveraging Claude or GPT-4 as the reasoning backbone, ClinicalTrials.gov's v2 API for trial data, and OncoKB/CIViC for variant actionability. Multiple peer institutions (MSK, Mount Sinai, MCW, City of Hope) have deployed similar systems in production, and the open-source TrialGPT codebase provides a validated starting point. The regulatory path is favorable: clinical trial matching tools qualify for the 21st Century Cures Act CDS exemption when designed with transparent reasoning and human-in-the-loop oversight.

---

## TrialGPT provides a validated three-module architecture

The TrialGPT system (Jin et al., *Nature Communications* 2024) remains the most thoroughly evaluated open-source framework for LLM-based trial matching. Its GitHub repository at `ncbi-nlp/TrialGPT` contains ~144 stars and 66 forks, runs on Python 3.9, and uses Azure OpenAI's GPT-4 as its default model with temperature set to 0.

**Module 1: TrialGPT-Retrieval** generates up to 32 ranked keywords from a patient summary using GPT-4, then performs hybrid-fusion retrieval combining BM25 (lexical) and MedCPT (semantic) scores via reciprocal rank fusion (RRF) with constant k=20. This narrows tens of thousands of trials to a shortlist while retaining **>90% recall using only 5.5% of the collection**. GPT-4-generated keywords outperform those from four human clinicians.

**Module 2: TrialGPT-Matching** evaluates each eligibility criterion independently against the patient summary. For every criterion, the LLM produces a natural-language explanation, relevant sentence locations from the patient note, and a four-class label: `included/not included/not enough information/not applicable` for inclusion criteria, with parallel labels for exclusion criteria. This achieves **87.3% criterion-level accuracy** (expert range: 88.7–90.0%), with explanation correctness at 87.8% and sentence-location F1 at 88.6%.

**Module 3: TrialGPT-Ranking** aggregates criterion-level predictions using both linear feature combinations (six percentage-based features) and LLM-generated scores (a 0–100 relevance score and a −100 to +100 eligibility score). The combined GPT-4 ranking outperforms the best baseline by **43.8%** on NDCG@10 (0.7275 vs. 0.4797).

The codebase relies on `openai`, `rank_bm25`, and the MedCPT embedding model. A practical limitation is its exclusive testing on synthetic patient summaries — real EHR notes are longer, noisier, and require preprocessing. Error analysis reveals four failure modes: incorrect reasoning about implicit information (30.7%), medical knowledge gaps like missed synonyms (15.4%), ambiguous label boundaries (26.9%), and miscellaneous errors (26.9%).

---

## The ClinicalTrials.gov v2 API enables structured trial retrieval

ClinicalTrials.gov migrated to its **v2 REST API** in March 2024, retiring the legacy API in June 2024. The API requires no authentication, returns JSON by default, and covers **400,000+ studies** from 220+ countries with weekday data refreshes.

The primary endpoint `GET /api/v2/studies` supports powerful filtering for oncology trial matching. Key parameters include `query.cond` for disease search, `query.locn` for site-specific queries, `filter.overallStatus` for recruitment status (pipe-separated values like `RECRUITING|NOT_YET_RECRUITING`), and `filter.geo` for geographic radius search using the format `distance(38.0406,-84.5037,50mi)` — directly applicable for Lexington, KY. A typical query for recruiting NSCLC trials at UK Markey would be:

```
GET /api/v2/studies?query.cond=non-small+cell+lung+cancer
  &query.locn=University+of+Kentucky
  &filter.overallStatus=RECRUITING
  &pageSize=100&format=json
```

Eligibility criteria reside in `protocolSection.eligibilityModule.eligibilityCriteria` as **unstructured freetext** — the core parsing challenge for any matching system. Structured fields include `minimumAge`, `maximumAge`, `sex`, and `healthyVolunteers`. Locations include facility names, geographic coordinates, and site-level recruitment status. Pagination uses token-based cursors with a maximum page size of 1,000. Conservative rate limits are ~50 requests/minute per IP.

For oncology specifically, the **NCI Clinical Trials Search API** (`clinicaltrialsapi.cancer.gov/api/v2`) offers cancer-specific structured fields including biomarker eligibility and disease ontology terms, though it requires an API key. The **AACT database** provides a PostgreSQL mirror for bulk analytics.

---

## Genomic PDF extraction demands an LLM-first approach

No open-source parsers exist for FoundationOne, Guardant360, Tempus, or Caris report PDFs — this is a significant ecosystem gap requiring custom development. Each vendor produces reports with distinct layouts, data organization, and terminology:

- **FoundationOne CDx**: 324 genes, reports SNVs/indels, CNAs, fusions, TMB, MSI, gLOH; structured XML/HL7 available for institutional customers but PDF is the common clinical format
- **Guardant360 CDx**: 73 genes (liquid biopsy), prominently features VAF; flags clonal hematopoiesis
- **Tempus xT/xF**: 648 genes (tissue), RNA fusions; provides a clinical portal alongside PDFs
- **Caris Molecular Intelligence**: Multiplatform (NGS + IHC + FISH + WTS); combines molecular and protein-level data

The recommended pipeline is: (1) extract raw text with **PyMuPDF** (fastest, handles most digital PDFs) with pdfplumber as fallback for table-heavy sections, (2) use an **LLM with structured output** to parse into a defined JSON schema, and (3) validate and normalize output. Recent benchmarks show Claude 3 Opus, GPT-4, and Llama 3 70B all achieve **>98% accuracy** on medical record extraction, with GPT-4 producing correct JSON in 100% of cases for pathology reports. Vision-capable LLMs (Claude 3.5) can process PDF reports directly, avoiding lossy text conversion.

The target extraction schema should capture: gene (HUGO symbol), variant (HGVS protein change), variant type, VAF, fusions (gene partners), amplifications (with copy number), TMB score (mut/Mb), MSI status, PD-L1 (TPS/CPS with clone used), and HRD status. Post-extraction normalization using the `hgvs` Python package ensures valid variant nomenclature before querying knowledge bases. Vendor identification can be automated from report metadata or text patterns, routing to vendor-specific prompts.

---

## OncoKB and CIViC provide complementary variant actionability

**OncoKB** (`oncokb.org/api/v1/`) is MSK's FDA-recognized precision oncology knowledge base covering >7,500 alterations across ~820 genes. It provides therapeutic evidence levels from **Level 1** (FDA-approved biomarker in-indication) through **Level 4** (biological rationale only), plus resistance levels R1/R2. The API supports annotation by protein change, HGVSg, genomic coordinates, copy number alterations, and structural variants. Batch annotation accepts 100 variants per POST request. Academic use is free; clinical/commercial use requires licensing. Bearer token authentication is required.

A practical query for a common oncology variant:
```
GET /api/v1/annotate/mutations/byProteinChange
  ?hugoSymbol=BRAF&alteration=V600E&tumorType=Melanoma
```

**CIViC** (`civicdb.org`) complements OncoKB with fully open-access (CC0 license), community-curated evidence covering therapeutic, prognostic, diagnostic, and predisposing interpretations. Its GraphQL API requires no authentication. Evidence levels range from A (validated) through E (inferential). The official Python SDK `civicpy` simplifies programmatic access, and nightly TSV dumps enable local caching.

**Genome Nexus** (`genomenexus.org`) is the recommended aggregation layer — it integrates OncoKB, CIViC, ClinVar, COSMIC, cancer hotspots, dbSNP, gnomAD, and Ensembl VEP into a single REST API. Other valuable resources include **PCGR** (Personal Cancer Genome Reporter), an open-source tool that generates tiered HTML reports implementing AMP/ASCO/CAP variant classification guidelines, and **DGIdb** for drug-gene interactions.

---

## MEREDITH demonstrates the power of curated RAG

The MEREDITH system (Lammert et al., *JCO Precision Oncology* 2024) used Gemini Pro with RAG and chain-of-thought reasoning to support MTB treatment recommendations. Its key architectural lesson: **curated, domain-specific knowledge dramatically outperforms indiscriminate document retrieval**. The enhanced system incorporating PubMed literature, trial databases, drug approval status, and oncologic guidelines achieved **94.7% concordance** with expert MTB recommendations, up from the draft system's lower performance using PubMed alone. Semantic similarity scores increased significantly (0.71 → 0.76, p=0.01).

MEREDITH uses the NCT/DKTK molecular evidence levels (mEL): **m1A** (FDA/EMA-approved, same tumor type) through **m4** (indirect biological rationale). These map to the AMP/ASCO/CAP tier system where Tier I represents strong clinical significance and Tier III represents unknown significance. Real-world data shows 63.2% of patients benefiting from MTB therapies had m1A evidence.

For building a RAG system, several best practices emerge from the literature:

- **Embedding models**: PubMedBERT-based sentence transformers perform best for medical literature retrieval, while generalist models (e5-large, all-MiniLM-L12-v2) are competitive for eligibility criteria matching. The training paradigm matters more than domain-specific pretraining.
- **Vector databases**: **pgvector** with pgvectorscale is ideal for trial data because it unifies relational metadata and vector embeddings in one database with full SQL. Weaviate excels if native hybrid search is the priority.
- **Chunking strategy**: Decompose eligibility criteria to the individual criterion level, tagged with metadata (NCT ID, criterion type, category, condition, phase).
- **Retrieval**: Hybrid search combining BM25 and dense embeddings via RRF consistently outperforms either alone. Quality over quantity — curated knowledge bases outperform larger, noisier ones.

---

## Patient extraction benefits from agentic, multi-step pipelines

The state of the art for extracting structured data from clinical notes is the **agentic multi-step approach** demonstrated by HARMON-E (Triomics, December 2025), which achieved **F1=0.93** across 103 oncology variables from 400,000+ clinical notes spanning 2,250 patients. Biomarker and medication extraction exceeded 0.95 F1, and 94% of extracted data points were accepted by oncology abstractors without modification.

HARMON-E's architecture comprises three components: **Retrievers** (extract relevant segments from the document collection for each entity type using vector search), **LLM Synthesizers** (transform segments into structured attribute-value pairs), and **Collators** (validate, resolve dependencies, reconcile conflicts, normalize temporal references). This outperforms single-pass extraction because long context windows do not automatically improve clinical reasoning — particularly for temporal sequences.

The recommended patient profile JSON schema should align with **mCODE (minimal Common Oncology Data Elements)** FHIR profiles, covering: demographics, diagnosis (cancer type/histology/subtype), TNM staging, biomarkers (mutations/fusions/expression/TMB/MSI), prior therapies (with dates, lines, responses, discontinuation reasons), ECOG performance status, lab values, comorbidities, organ function assessment, disease status, and metastatic sites. Both a structured JSON and a natural-language summary should be maintained, since TrialGPT demonstrates that criterion matching works effectively on free-text summaries (87.3% accuracy) without requiring rigid structurization.

Key prompting principles validated in the literature include: one-note-one-prompt (never batch multiple patients), explicit variable definitions with enumerated possible values, mandatory source-text citations for each extracted field, explicit `null` for missing information (distinguishing "not mentioned" from "explicitly negative"), and constrained output via JSON schema/function calling.

---

## The five-stage architecture with cost and latency estimates

The recommended end-to-end system follows a five-stage pipeline:

**Stage 1 — Patient Profile Extraction**: Ingest clinical notes and genomic PDFs; use Claude/GPT-4 with structured output to extract a comprehensive patient profile. For genomic PDFs, use vision-capable LLMs directly or PyMuPDF → LLM extraction. Cost: ~$0.04 per patient, latency: 5–10 seconds.

**Stage 2 — Trial Retrieval**: Generate keywords from the patient profile, then perform hybrid BM25 + dense embedding search over a locally indexed trial database. Pre-filter by cancer type, recruitment status, and geography. Target: reduce from thousands of trials to 50–200 candidates with >90% recall. This is the cheapest stage.

**Stage 3 — Criterion-by-Criterion Matching**: For each candidate trial, independently evaluate every eligibility criterion against the patient profile. Use structured prompts requesting explanation, source evidence, and classification. This is the most expensive stage: **~$6–10 per patient** for 100 trials × 15 criteria average with Claude 3.5 Sonnet, taking 5–15 minutes parallelized.

**Stage 4 — Trial-Level Ranking**: Aggregate criterion predictions using both linear feature combinations and LLM-generated relevance/eligibility scores. Weight hard exclusions heavily, flag uncertain criteria for human review, and incorporate OncoKB evidence levels to prioritize biomarker-driven matches.

**Stage 5 — Explainable Output**: Generate structured match reports showing criterion-by-criterion assessments with ✅/❌/⚠️ indicators, source citations, confidence scores, and evidence levels. Present in a format optimized for MTB review.

**Cost optimization strategies** can reduce the per-patient cost significantly: aggressive pre-filtering to reduce candidates from 100 to 20–30 trials (~70% cost reduction), batch criterion processing (5–10 criteria per LLM call), caching common criterion assessments, and using Claude Haiku for initial relevance screening with Sonnet/Opus reserved for detailed matching. The Medical College of Wisconsin deployment achieved **97% monthly patient coverage** using a similar architecture.

| Component | Recommended Technology | Alternative |
|-----------|----------------------|-------------|
| Primary LLM | Claude 3.5 Sonnet (200K context) | GPT-4o, Gemini Pro |
| Embeddings | PubMedBERT sentence transformer | text-embedding-3-small |
| Vector DB | pgvector (PostgreSQL) | Weaviate |
| Keyword search | PostgreSQL full-text or Elasticsearch | Weaviate hybrid |
| PDF processing | Claude 3.5 Vision | PyMuPDF + LLM |
| Orchestration | LangGraph or custom Python | Temporal |
| Trial data | ClinicalTrials.gov API v2 + periodic bulk | AACT database |
| Knowledge bases | OncoKB + CIViC + Genome Nexus | PCGR |

---

## Eight open-source systems offer reusable components

Beyond TrialGPT, the ecosystem of open-source and published systems has expanded rapidly:

**MatchMiner** (Dana-Farber) uses a rule-based approach with Clinical Trial Markup Language (CTML) for structured eligibility criteria. Deployed at DFCI, MSK, and Princess Margaret, it facilitated 166 trial consents and **22% faster enrollment** (55 days earlier). Its successor **MatchMiner-AI** uses Llama trained on synthetic EHR data, achieving AUROC 0.94–0.98 with 90% of top-20 recommended trials being relevant.

**LLM-Match** (March 2025) uses fine-tuned open-source LLMs with a classification head, claiming to outperform TrialGPT on n2c2, SIGIR, and TREC benchmarks. **TrialMatchAI** (May 2025) offers fully local, privacy-compliant deployment with fine-tuned open-source models and medical chain-of-thought reasoning, reporting 92% of oncology patients had ≥1 relevant trial in the top 20.

**MSK-MATCH** (2025) combines an LLM with a curated oncology trial knowledge base and RAG, achieving **98.6% accuracy** with 98.4% sensitivity across 88,518 documents and 731 patients, auto-resolving 61.9% of cases while triaging 38.1% for human review. **ClinTrialFinder** on GitHub provides a lightweight implementation supporting both min-aggregation and TrialGPT-style evaluation.

**PRISM/OncoLLM** (Nature, 2024) converts criteria to questions in disjunctive normal form and uses a custom 14B-parameter fine-tuned model that outperforms GPT-3.5 but approaches GPT-4. **RECTIFIER** (Mass General Brigham) uses RAG to prevent token limit overflow, achieving 93.6% accuracy versus 85.9% for human study staff.

---

## Evaluation requires multi-level benchmarking across three public datasets

Three primary benchmark datasets exist for clinical trial matching evaluation:

The **SIGIR 2016 cohort** (Koopman & Zuccon, hosted at CSIRO: `data.csiro.au/collection/csiro:17152`) contains 58 synthetic patients and 3,621 trials with three-level relevance labels (irrelevant/potential/eligible). It is already included in the TrialGPT repository. The **TREC Clinical Trials 2021** (75 patients, 26,149 trials) and **2022** (50 patients, 26,581 trials) tracks provide synthetic patient descriptions with three-level labels (irrelevant/excluded/eligible), judged by physicians. The **n2c2 2018** cohort offers ~300 patients with 13 binary inclusion criteria using real MIMIC clinical notes.

Standard metrics operate at three levels: **retrieval** (Recall@K to ensure relevant trials aren't missed), **ranking** (NDCG@10 as the primary TREC metric, Precision@10, AUROC for binary exclusion), and **matching** (criterion-level accuracy across four classes, explanation correctness via manual evaluation, sentence-location F1). The `pytrec_eval` library provides standard evaluation tooling.

For real-world deployment evaluation, the MCW implementation provides practical benchmarks: **>97% monthly patient coverage**, coordinator review time reduction from 20–25 to 3–12 minutes, and **27–39% increase in trial accruals**. The ASCO 2025 randomized study by Parikh et al. demonstrated that human + AI review achieved **76.1% accuracy** versus 71.5% for either alone (P<.001).

---

## Regulatory path favors CDS exemption with QI-based deployment

A clinical trial matching system at an academic medical center occupies a favorable regulatory position. Under the **21st Century Cures Act (Section 3060)**, CDS software is exempt from FDA device regulation when it meets four criteria: does not analyze images/IVD signals, displays/analyzes patient information, provides recommendations to healthcare professionals, and enables independent review of the reasoning basis. A trial matching tool designed with transparent criterion-by-criterion explanations, source citations, and mandatory clinician review satisfies all four criteria. The **January 2026 FDA revised CDS guidance** further clarifies that CDS functions providing recommendations for provider review based on medical records and clinical guidelines may remain outside FDA regulation.

No commercial trial matching system (Triomics, Tempus, Deep 6 AI) has sought FDA clearance — all operate as decision support tools. The recommended **IRB strategy** is to deploy initially as a quality improvement initiative using the RE-AIM framework (as MCW did with Triomics), obtain a Non-Human Subjects Research determination from the IRB, and prepare a separate protocol if research analysis is planned. The **MRCT Center/WCG Framework** (June 2025) provides structured decision trees for IRB review of AI in clinical research.

For **HIPAA compliance**, three architecture options exist: HIPAA-eligible cloud APIs (AWS Bedrock with Claude under BAA, or Azure OpenAI) for production deployment; on-premise deployment of open-source models (Llama 3, Mistral) for maximum data control; or a hybrid approach routing PHI-containing tasks to secure infrastructure while using cloud LLMs for non-PHI tasks like guideline parsing. UK CAAI already operates NIST-compliant infrastructure, providing a strong foundation. Business Associate Agreements with explicit opt-out from training data use are non-negotiable for any cloud LLM deployment handling PHI.

---

## Conclusion: a clear path from prototype to production

The technical feasibility of AI-powered clinical trial matching for precision oncology is now well-established, with criterion-level accuracy approaching expert performance and real-world deployments demonstrating measurable improvements in enrollment at peer institutions. **The core insight from every successful deployment is that curated, domain-specific knowledge dramatically outperforms raw LLM capability** — MEREDITH's curated medical dataset, MSK-MATCH's oncology trial knowledge base, and TrialGPT's hybrid retrieval all demonstrate this principle.

For UK Markey Cancer Center, the recommended path is: (1) build the genomic PDF extraction pipeline first, since no existing tools handle Caris/Guardant/Tempus/FoundationOne reports — this provides immediate MTB value; (2) implement the TrialGPT-style three-module pipeline using Claude on AWS Bedrock (HIPAA-compliant, BAA-covered) with UK's NIST infrastructure for PHI processing; (3) integrate ClinicalTrials.gov v2 API with geographic filtering for Lexington, KY and NCI's cancer-specific API for enhanced oncology metadata; (4) layer OncoKB + CIViC annotation to prioritize biomarker-driven trial matches by evidence level; and (5) deploy as a QI initiative with NHSR determination, targeting coordinator screening time reduction of 60%+ within three months.

The system that no one has built yet — and where UK Markey can differentiate — is one that tightly integrates the genomic report extraction, variant annotation with evidence levels, and trial matching into a single workflow optimized for the molecular tumor board's decision-making process, rather than treating these as separate tools.