"""
Hybrid BM25 + dense embedding retrieval for clinical trials.
Implements Reciprocal Rank Fusion (RRF) per TrialGPT architecture.

Uses MedCPT bi-encoder (TrialGPT recommendation):
  - Query encoder (ncbi/MedCPT-Query-Encoder): embeds patient summaries
  - Article encoder (ncbi/MedCPT-Article-Encoder): embeds trial text

Falls back to a single general-purpose encoder if MedCPT cannot be loaded.
Targets >90% recall while reducing candidate set from thousands to 50-200 trials.
"""

import logging
import threading
from typing import Optional

import numpy as np
from rank_bm25 import BM25Okapi

import config
from src.retrieval.trial_fetcher import ClinicalTrial

logger = logging.getLogger(__name__)


def _load_medcpt_encoder(model_name: str):
    """
    Load a MedCPT-style HuggingFace model via sentence-transformers composition.
    Returns a callable encode(texts) -> np.ndarray, or None on failure.
    """
    try:
        from sentence_transformers import SentenceTransformer, models as st_models
        word_model = st_models.Transformer(model_name, max_seq_length=512)
        pooling = st_models.Pooling(
            word_model.get_word_embedding_dimension(),
            pooling_mode_mean_tokens=True,
        )
        encoder = SentenceTransformer(modules=[word_model, pooling])
        logger.info(f"Loaded MedCPT encoder: {model_name}")
        return encoder
    except Exception as e:
        logger.warning(f"Could not load {model_name}: {e}")
        return None


class HybridTrialRetriever:
    """
    Hybrid retrieval combining BM25 (lexical) and dense embeddings (semantic)
    via Reciprocal Rank Fusion.

    Uses a MedCPT bi-encoder:
      - Trial texts are encoded with the Article encoder at index build time.
      - Patient query is encoded with the Query encoder at retrieval time.
    """

    def __init__(self, trials: list[ClinicalTrial]):
        self.trials = trials
        self._query_encoder = None   # Encodes patient summaries / search queries
        self._article_encoder = None  # Encodes trial text corpus
        self._trial_embeddings = None
        self._encoder_lock = threading.Lock()
        self._corpus = self._build_corpus()
        self._build_bm25()

    def _build_corpus(self) -> list[str]:
        """Build text corpus for each trial (title + conditions + criteria)."""
        corpus = []
        for trial in self.trials:
            text_parts = [
                trial.brief_title,
                trial.title,
                " ".join(trial.conditions),
                " ".join(trial.interventions),
                trial.brief_summary[:500],
                " ".join(trial.inclusion_criteria[:10]),
            ]
            corpus.append(" ".join(p for p in text_parts if p).lower())
        return corpus

    def _build_bm25(self):
        """Build BM25 index from corpus."""
        tokenized = [doc.split() for doc in self._corpus]
        self._bm25 = BM25Okapi(tokenized)
        logger.info(f"Built BM25 index over {len(self.trials)} trials")

    def _load_encoders(self):
        """
        Lazily load MedCPT bi-encoder. Thread-safe via double-checked locking.
        Falls back to a single general encoder if bi-encoder loading fails.
        """
        if self._query_encoder is not None:
            return
        with self._encoder_lock:
            if self._query_encoder is not None:
                return
            try:
                use_biencoder = (
                    config.QUERY_EMBEDDING_MODEL != config.ARTICLE_EMBEDDING_MODEL
                )
                if use_biencoder:
                    query_enc = _load_medcpt_encoder(config.QUERY_EMBEDDING_MODEL)
                    article_enc = _load_medcpt_encoder(config.ARTICLE_EMBEDDING_MODEL)
                    if query_enc and article_enc:
                        self._query_encoder = query_enc
                        self._article_encoder = article_enc
                        logger.info("Using MedCPT bi-encoder for retrieval")
                    else:
                        raise RuntimeError("One or both MedCPT encoders failed to load")
                else:
                    # Single encoder mode (both point to same model)
                    from sentence_transformers import SentenceTransformer
                    enc = SentenceTransformer(config.QUERY_EMBEDDING_MODEL)
                    self._query_encoder = enc
                    self._article_encoder = enc
                    logger.info(f"Using single encoder: {config.QUERY_EMBEDDING_MODEL}")

                # Build trial embeddings using the article encoder
                self._trial_embeddings = self._article_encoder.encode(
                    self._corpus, show_progress_bar=False, batch_size=32,
                    normalize_embeddings=True,
                )
                logger.info(f"Built dense index for {len(self.trials)} trials")

            except Exception as e:
                logger.warning(
                    f"Dense encoder loading failed: {e}. Falling back to BM25-only."
                )
                self._query_encoder = None
                self._article_encoder = None

    def retrieve(
        self,
        query: str,
        top_k: int = config.MAX_TRIALS_RETRIEVAL,
        use_dense: bool = True,
    ) -> list[tuple[ClinicalTrial, float]]:
        """
        Retrieve top-k trials using hybrid BM25 + dense RRF.

        Args:
            query: Patient summary or LLM-generated keyword string
            top_k: Number of trials to return
            use_dense: Whether to use dense embeddings (requires sentence_transformers)

        Returns:
            List of (trial, rrf_score) tuples sorted by relevance descending
        """
        query_lower = query.lower()
        n = len(self.trials)

        # BM25 ranking
        bm25_scores = self._bm25.get_scores(query_lower.split())
        bm25_ranks = np.argsort(bm25_scores)[::-1]

        if use_dense:
            self._load_encoders()

        if self._query_encoder is not None and self._trial_embeddings is not None:
            # Dense ranking — query encoder encodes the patient query
            query_embedding = self._query_encoder.encode(
                [query_lower], normalize_embeddings=True
            )
            similarities = np.dot(self._trial_embeddings, query_embedding.T).flatten()
            dense_ranks = np.argsort(similarities)[::-1]

            # Reciprocal Rank Fusion
            rrf_scores = np.zeros(n)
            for rank_i, idx in enumerate(bm25_ranks):
                rrf_scores[idx] += config.BM25_WEIGHT / (config.RRF_K + rank_i + 1)
            for rank_i, idx in enumerate(dense_ranks):
                rrf_scores[idx] += config.DENSE_WEIGHT / (config.RRF_K + rank_i + 1)

            final_ranks = np.argsort(rrf_scores)[::-1]
            result = [(self.trials[i], float(rrf_scores[i])) for i in final_ranks[:top_k]]
        else:
            # BM25 only
            result = [(self.trials[i], float(bm25_scores[i])) for i in bm25_ranks[:top_k]]

        return result


def generate_retrieval_keywords(patient_summary: str, key_biomarkers: list[str]) -> str:
    """
    Generate a combined search query for trial retrieval.
    Per TrialGPT: LLM-generated keywords outperform human clinician queries by ~40%.
    Keywords are generated before the CT.gov search, not just for re-ranking.
    Uses Claude Haiku for cost efficiency.
    """
    from src.llm_client import LLMClient
    import config as _cfg
    client = LLMClient(force_cloud=_cfg.LOCAL_EXTRACTION_ONLY)

    biomarker_context = ""
    if key_biomarkers:
        biomarker_context = f"\nKey biomarkers: {', '.join(key_biomarkers[:10])}"

    response = client.messages.create(
        model=config.CLAUDE_HAIKU_MODEL,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": f"""Generate up to 32 search keywords for finding relevant clinical trials for this oncology patient.
Include: cancer type, histology, biomarkers/mutations, treatment targets, relevant tumor characteristics.
Return ONLY a space-separated list of keywords, ordered by importance.
Do NOT include common words like "cancer", "treatment", "patient".

Patient Summary:{biomarker_context}
{patient_summary[:3000]}

Keywords:"""
        }]
    )

    keywords = response.content[0].text.strip()
    # Prepend key biomarkers so they always appear first
    if key_biomarkers:
        keywords = " ".join(key_biomarkers[:5]) + " " + keywords
    return keywords
