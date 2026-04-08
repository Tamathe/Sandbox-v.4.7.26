# UK Markey Cancer Center — AI Clinical Trial Matcher

An AI-powered clinical trial matching tool for the Molecular Tumor Board (MTB). Upload clinical notes and genomic reports (Caris, Guardant360, Tempus, FoundationOne); the system extracts a structured patient profile, searches ClinicalTrials.gov, and ranks trials by eligibility using criterion-by-criterion AI matching.

---

## How it works (5-stage pipeline)

| Stage | What happens |
|-------|-------------|
| **1. Extract** | AI reads clinical note PDFs and genomic report PDFs, extracting diagnosis, prior therapies, lab values, mutations, fusions, TMB, MSI, etc. |
| **2. Retrieve** | Searches ClinicalTrials.gov for open/recruiting trials within 50 miles of Lexington, KY using the patient's biomarkers and cancer type |
| **3. Match** | Evaluates each trial's inclusion/exclusion criteria one-by-one against the patient profile (TrialGPT architecture, ~87% accuracy) |
| **4. Rank** | Scores trials by eligibility + OncoKB variant evidence level + Markey site availability |
| **5. Report** | Generates a text + JSON MTB report with downloadable files |

---

## Setup

### 1. Prerequisites

- Python 3.10 or later
- Windows, macOS, or Linux
- Internet connection (for ClinicalTrials.gov and Anthropic API)

### 2. Clone or download the project

If you have git:
```bash
git clone <repo-url>
cd "Clinical Trial Matcher Markey"
```

Or just open the folder in VS Code.

### 3. Create a virtual environment

```bash
python -m venv .venv
```

Activate it:

- **Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
- **Windows (Command Prompt):** `.venv\Scripts\activate.bat`
- **Mac/Linux:** `source .venv/bin/activate`

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

> **Note:** This installs PyTorch and sentence-transformers (~2 GB). First install takes 5–10 minutes.

### 5. Configure your API key

Copy the example env file and add your key:

```bash
copy .env.example .env
```

Open `.env` and fill in:

```
ANTHROPIC_API_KEY=sk-ant-...your key here...
```

Get a key at [console.anthropic.com](https://console.anthropic.com/). The API costs roughly $0.05–0.20 per case depending on note length.

**Optional additions to `.env`:**
```
# OncoKB token — free for academic use (oncokb.org/api-access)
# Adds variant actionability evidence levels (Level 1–4) to ranked trials
ONCOKB_TOKEN=your_token_here
```

### 6. Launch the app

```bash
.venv/Scripts/streamlit run app.py
```

The app opens at **http://localhost:8501** in your browser.

---

## Running a case

### Tab 1 — Input Documents

1. **Upload Clinical Notes** — MDM notes, clinic visit summaries, discharge summaries, radiology reports. Multiple PDFs are supported and will be combined.
2. **Upload Genomic Reports** — Caris, Guardant360, Tempus, or FoundationOne PDFs. Multiple reports (e.g. tissue + liquid biopsy) are supported and will be cross-referenced.
3. **Set a Case ID** — any label you want, e.g. `MTB-2026-001`.
4. *(Optional)* **Add context** — e.g. "Patient prefers oral therapy. Seeking Phase 2+ trials."
5. Click **Run Full Pipeline**.

Pipeline takes 2–5 minutes depending on the number of genomic reports and trials evaluated.

### Tab 2 — Patient Profile

Displays everything the AI extracted:
- Demographics, diagnosis, stage, ECOG PS
- Prior therapy lines with response and discontinuation reason
- Key lab values
- Genomic variants table (gene, variant type, VAF, interpretation)
- Fusions, amplifications
- TMB, MSI, PD-L1, HRD status
- IO/enrollment flags (brain mets, autoimmune conditions)

**Extraction Audit Trail** (bottom of tab) — shows:
- The exact biomarker keywords sent to ClinicalTrials.gov
- The full patient narrative sent to the AI criterion matcher

Use this to verify the AI read the documents correctly before relying on the results.

### Tab 3 — Trial Matches

Shows ranked trials with eligibility badges:

| Badge | Meaning |
|-------|---------|
| **ELIGIBLE** | All evaluated criteria met |
| **LIKELY ELIGIBLE** | Most criteria met; minor uncertainties |
| **UNCERTAIN** | Several criteria need coordinator review |
| **INELIGIBLE** | Hard exclusion criterion triggered |

Each trial card shows:
- Eligibility and composite score
- Key criteria met (green)
- Hard exclusions (red)
- Criteria needing manual review (yellow)
- "Show criterion-by-criterion breakdown" checkbox for full detail

**Referral Candidates** section at the bottom lists nationally recruiting trials with no Markey site — useful for identifying referral options.

Filters let you narrow by eligibility status, Markey-only, or top-N trials.

### Tab 4 — MTB Report

Download the final report in two formats:
- **Text (.txt)** — formatted narrative for the MTB letter
- **JSON (.json)** — structured data for integration or archiving

### Tab 5 — Case History

All completed cases are saved to `output/<case_id>/`. You can reload, filter, or delete past cases from this tab.

---

## HIPAA / Local LLM mode

If PHI cannot leave your network, toggle **"Use Local LLM (HIPAA mode)"** in the sidebar before running.

### Requirements

- [LM Studio](https://lmstudio.ai/) installed and running
- A model loaded in LM Studio (recommended: `qwen2.5-7b-instruct` or similar 7B instruction model)
- LM Studio server started (Server tab → Start Server, default port 1234)

### Settings

| Field | Default | Notes |
|-------|---------|-------|
| LM Studio URL | `http://localhost:1234/v1` | Change only if you moved the port |
| Model name | `qwen/qwen2.5-vl-7b` | Must match exactly what LM Studio shows |

### Performance in local mode

Local models are significantly less capable than Claude for complex clinical reasoning. Expect:
- More "uncertain" eligibility ratings
- Less precise criterion explanations
- Slower processing (especially on CPU)

For best local results:
- Use at least a 7B instruction-tuned model
- Set LM Studio context window to 8192+ tokens (Model Settings → n_ctx)
- Set `LOCAL_LLM_MAX_TEXT_CHARS=14000` in `.env` if using 8192 context

---

## Test cases

Eight real de-identified cases are in `OneDrive_1_3-5-2026/`:

| Case | Cancer type | Genomic vendor(s) |
|------|------------|------------------|
| Case 1 — Lung | NSCLC | Caris + Guardant360 (2 reports) |
| Case 2 — Serous endometrial | Uterine serous | Caris |
| Case 3 — GI | GI | Tempus |
| Cases 4–8 — Lung | NSCLC | Caris |

Each case has an `Input/` folder (PDFs to upload) and an `Output/` folder (reference MTB letters and presentations).

**To test Case 1:**
1. Upload all PDFs from `Case 1 - Lung/Input/` — the three clinical notes files AND both Guardant360 reports AND the Caris report
2. Set Case ID to `MTB-Case-1`
3. Run the pipeline
4. Compare results to `Case 1 - Lung/Output/1 - MTB Rec Ltr_Arnold_BR OUTPUT.pdf`

---

## Configuration reference

All settings live in `config.py` and can be overridden via `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | Required for cloud mode |
| `CLAUDE_MODEL` | `claude-sonnet-4-6` | Model for extraction and ranking |
| `CLAUDE_CRITERION_MODEL` | `claude-haiku-4-5-20251001` | Model for criterion matching (cheaper) |
| `USE_LOCAL_LLM` | `false` | Set `true` for HIPAA/local mode |
| `LOCAL_LLM_BASE_URL` | `http://localhost:1234/v1` | LM Studio or Ollama endpoint |
| `LOCAL_LLM_MODEL` | `qwen/qwen2.5-vl-7b` | Model name in LM Studio |
| `LOCAL_LLM_MAX_TEXT_CHARS` | `6000` | Max chars per LLM call in local mode |
| `ONCOKB_TOKEN` | — | Optional, free academic token |
| `MAX_TRIALS_RETRIEVAL` | `50` | Trials fetched from ClinicalTrials.gov |
| `MAX_TRIALS_DETAILED` | `10` | Trials run through criterion matching |
| `OUTPUT_DIR` | `output` | Where reports and cache are saved |

---

## Troubleshooting

**"No module named X"**
Run `pip install -r requirements.txt` inside your activated virtual environment.

**"Invalid API key" / authentication error**
Check that `.env` exists and `ANTHROPIC_API_KEY` starts with `sk-ant-`.

**LM Studio 400 Bad Request**
The model's context window is too small. In LM Studio: Model Settings → set n_ctx to 8192. Also increase `LOCAL_LLM_MAX_TEXT_CHARS=14000` in `.env`.

**All trials show "uncertain" in local mode**
Normal for smaller local models — they lack the clinical reasoning depth of Claude. The pre-screen and criteria still run; results just have lower confidence. Switch to cloud mode for production use.

**Sentence-transformers slow on first run**
The MedCPT embedding models (~500 MB each) download on first use and cache in `~/.cache/huggingface/`. Subsequent runs are fast.

**No trials found**
The 50-mile radius around Lexington, KY filters aggressively. Try increasing `MARKEY_SEARCH_RADIUS_MILES` in `config.py`, or check that the cancer type was extracted correctly in the Patient Profile tab.

---

## Project structure

```
├── app.py                          # Streamlit UI (4 tabs)
├── config.py                       # All configuration + env vars
├── requirements.txt
├── .env.example                    # Copy to .env and add your key
├── src/
│   ├── pipeline.py                 # Orchestrates all 5 stages
│   ├── llm_client.py               # Unified cloud/local LLM client
│   ├── utils.py                    # JSON extraction, shared constants
│   ├── extraction/
│   │   ├── clinical_note_parser.py # mCODE-aligned clinical note extraction
│   │   ├── genomic_parser.py       # Caris/Guardant/Tempus/FoundationOne parsing
│   │   ├── patient_profile.py      # Unified PatientCase + multi-report reconciliation
│   │   └── pdf_extractor.py        # PyMuPDF + pdfplumber PDF → text
│   ├── retrieval/
│   │   ├── trial_fetcher.py        # ClinicalTrials.gov v2 API client
│   │   └── hybrid_search.py        # BM25 + MedCPT dense embeddings + RRF
│   ├── matching/
│   │   ├── criterion_matcher.py    # TrialGPT criterion-by-criterion matching
│   │   └── trial_ranker.py         # Composite scoring + OncoKB integration
│   ├── annotation/
│   │   └── oncokb_client.py        # OncoKB v1 API client
│   └── output/
│       └── report_generator.py     # Text + JSON MTB report generation
└── output/                         # Generated reports and trial cache (git-ignored)
```

---

## Citation

This tool implements the TrialGPT architecture:
> Jin Q, et al. "Matching patients to clinical trials with large language models." *Nature Communications* 15, 9074 (2024).
