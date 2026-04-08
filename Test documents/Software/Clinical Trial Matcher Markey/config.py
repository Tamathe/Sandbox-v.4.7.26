import os
from dotenv import load_dotenv

load_dotenv()

# Anthropic / Claude
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
CLAUDE_HAIKU_MODEL = os.getenv("CLAUDE_HAIKU_MODEL", "claude-haiku-4-5-20251001")
# Criterion matching uses Haiku for cost efficiency (~75% cheaper than Sonnet).
# Switch back to CLAUDE_MODEL for highest accuracy in production.
CLAUDE_CRITERION_MODEL = os.getenv("CLAUDE_CRITERION_MODEL", "claude-haiku-4-5-20251001")

# Local LLM (LM Studio / Ollama) — set USE_LOCAL_LLM=true to keep all PHI on-device.
# LM Studio default: http://localhost:1234/v1
# Ollama default:    http://localhost:11434/v1
USE_LOCAL_LLM = os.getenv("USE_LOCAL_LLM", "false").lower() == "true"
# Hybrid mode: use local LLM only for PDF extraction (Stage 1), then cloud Claude for matching.
# The extracted profile contains no raw note text, so cloud matching is safe.
# Requires ANTHROPIC_API_KEY even when USE_LOCAL_LLM=true.
LOCAL_EXTRACTION_ONLY = os.getenv("LOCAL_EXTRACTION_ONLY", "false").lower() == "true"
LOCAL_LLM_BASE_URL = os.getenv("LOCAL_LLM_BASE_URL", "http://localhost:1234/v1")
# Set to the exact model name shown in LM Studio's model picker.
# When using LM Studio, this can also be left blank — it uses whatever is loaded.
LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "qwen/qwen2.5-vl-7b")
# Max characters of clinical/genomic text sent per LLM call in local mode.
# 4096-token context ≈ 10k chars total; leaving room for schema + response → 6000 chars of text.
# Increase if you set a larger n_ctx in LM Studio (8192 ctx → ~14000 chars).
LOCAL_LLM_MAX_TEXT_CHARS = int(os.getenv("LOCAL_LLM_MAX_TEXT_CHARS", "2500"))
# Local extraction needs a smaller response budget so prompt + completion stays
# within LM Studio's typical 4k context window.
LOCAL_LLM_RESPONSE_TOKENS = int(os.getenv("LOCAL_LLM_RESPONSE_TOKENS", "900"))

# OncoKB
ONCOKB_TOKEN = os.getenv("ONCOKB_TOKEN", "")
ONCOKB_BASE_URL = "https://www.oncokb.org/api/v1"

# ClinicalTrials.gov v2
CLINICALTRIALS_BASE_URL = "https://clinicaltrials.gov/api/v2"
CLINICALTRIALS_NCI_BASE_URL = "https://clinicaltrialsapi.cancer.gov/api/v2"
NCI_API_KEY = os.getenv("NCI_API_KEY", "")

# Markey Cancer Center geographic parameters (Lexington, KY)
MARKEY_LATITUDE = 38.0406
MARKEY_LONGITUDE = -84.5037
MARKEY_SEARCH_RADIUS_MILES = 50

# Pipeline settings
MAX_TRIALS_RETRIEVAL = 50       # Trials to retrieve before detailed matching
MAX_TRIALS_DETAILED = 10        # Trials to run criterion-by-criterion matching
MAX_CRITERIA_PER_BATCH = 10     # Criteria to evaluate per LLM call
MAX_REFERRAL_RETRIEVAL = 100    # National trials fetched as referral candidates
MAX_REFERRAL_DETAILED = 5       # Referral candidates run through criterion matching
BM25_WEIGHT = 0.5               # Weight for BM25 in hybrid search
DENSE_WEIGHT = 0.5              # Weight for dense embeddings in hybrid search
RRF_K = 20                      # Reciprocal rank fusion constant

# Embedding models — MedCPT bi-encoder trained on biomedical text (TrialGPT recommendation)
# Query encoder embeds patient summaries; Article encoder embeds trial texts.
# Both are ~768-dim BERT models. Set to same value to use a single encoder.
# Override via env vars to revert to the lightweight general model if needed.
QUERY_EMBEDDING_MODEL = os.getenv("QUERY_EMBEDDING_MODEL", "ncbi/MedCPT-Query-Encoder")
ARTICLE_EMBEDDING_MODEL = os.getenv("ARTICLE_EMBEDDING_MODEL", "ncbi/MedCPT-Article-Encoder")
EMBEDDING_MODEL = QUERY_EMBEDDING_MODEL  # Backwards-compatible alias

# Output
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "output")
