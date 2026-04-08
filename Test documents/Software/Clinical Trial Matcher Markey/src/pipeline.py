"""
End-to-end five-stage clinical trial matching pipeline.
Orchestrates: extraction → retrieval → matching → ranking → report.
"""

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.extraction.patient_profile import PatientCase, build_patient_case
from src.retrieval.trial_fetcher import ClinicalTrial, ClinicalTrialsClient
from src.retrieval.hybrid_search import HybridTrialRetriever, generate_retrieval_keywords
from src.matching.criterion_matcher import TrialMatchResult, TrialMatcher
from src.matching.trial_ranker import RankedTrial, rank_trials
from src.output.report_generator import generate_text_report, generate_json_report
import config

logger = logging.getLogger(__name__)


def _normalize_condition_for_ctgov(raw_condition: Optional[str]) -> str:
    """Normalize extracted diagnosis text into a stable CT.gov condition query."""
    if not raw_condition:
        return "cancer"

    condition = raw_condition.strip()
    condition = re.sub(r"\([^)]*\)", "", condition)
    condition = re.sub(r"\bmetastatic to\b.*$", "", condition, flags=re.IGNORECASE)
    condition = re.sub(r"\bwith\b.*$", "", condition, flags=re.IGNORECASE)
    condition = re.sub(r"\bstage\s*[ivx0-9a-d\-]*\b.*$", "", condition, flags=re.IGNORECASE)
    condition = re.sub(r"\s+", " ", condition).strip(" ,;-")
    return condition or "cancer"


@dataclass
class PipelineResult:
    case: PatientCase
    retrieved_trials: list[ClinicalTrial] = field(default_factory=list)
    referral_candidates: list[ClinicalTrial] = field(default_factory=list)
    match_results: list[TrialMatchResult] = field(default_factory=list)
    referral_match_results: list[TrialMatchResult] = field(default_factory=list)
    ranked_trials: list[RankedTrial] = field(default_factory=list)
    referral_trials: list[RankedTrial] = field(default_factory=list)
    text_report: str = ""
    json_report: dict = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)


def run_pipeline(
    case_id: str,
    clinical_note_paths: list[str | Path] = None,
    genomic_report_paths: list[str | Path] = None,
    additional_context: str = "",
    max_retrieved_trials: int = config.MAX_TRIALS_RETRIEVAL,
    max_detailed_trials: int = config.MAX_TRIALS_DETAILED,
    max_matching_workers: int = 2,
    save_outputs: bool = True,
    progress_callback: Optional[Callable[[str, int, int], None]] = None,
) -> PipelineResult:
    """
    Run the complete five-stage matching pipeline for a patient case.

    Stage 1: Patient Profile Extraction
    Stage 2: Trial Retrieval (hybrid BM25 + dense)
    Stage 3: Criterion-by-Criterion Matching
    Stage 4: Trial Ranking with OncoKB annotation
    Stage 5: Explainable Report Generation

    Args:
        case_id: Unique identifier for this patient case
        clinical_note_paths: Paths to clinical note PDFs
        genomic_report_paths: Paths to genomic report PDFs
        additional_context: Free-text context (e.g. MTB case submission notes)
        max_retrieved_trials: Max trials from Stage 2 retrieval
        max_detailed_trials: Max trials for Stage 3 detailed matching
        save_outputs: Save JSON profile and reports to output/
        progress_callback: Optional callback(stage_name, completed, total)

    Returns:
        PipelineResult with all intermediate and final outputs
    """
    result = PipelineResult(case=PatientCase(case_id=case_id))
    output_dir = Path(config.OUTPUT_DIR) / case_id
    if save_outputs:
        output_dir.mkdir(parents=True, exist_ok=True)

    def _progress(stage: str, done: int = 0, total: int = 0):
        logger.info(f"[{stage}] {done}/{total}" if total else f"[{stage}]")
        if progress_callback:
            progress_callback(stage, done, total)

    # ── Stage 1: Patient Profile Extraction ────────────────────────────────
    try:
        result.case = build_patient_case(
            case_id=case_id,
            clinical_note_paths=clinical_note_paths or [],
            genomic_report_paths=genomic_report_paths or [],
            additional_context=additional_context,
            progress_callback=_progress,
        )
        if save_outputs:
            result.case.save(output_dir / "patient_profile.json")
        _progress("Stage 1: Patient profile complete")
        logger.info(f"Patient profile extracted. Biomarkers: {result.case.key_biomarkers}")
    except Exception as e:
        result.errors.append(f"Stage 1 failed: {e}")
        logger.error(f"Stage 1 extraction error: {e}", exc_info=True)
        return result

    # ── Stage 2: Trial Retrieval ────────────────────────────────────────────
    _progress("Stage 2: Searching ClinicalTrials.gov")
    try:
        cancer_type = (
            result.case.clinical.cancer_type if result.case.clinical else "cancer"
        ) or "cancer"
        search_condition = _normalize_condition_for_ctgov(cancer_type)
        if search_condition != cancer_type:
            logger.info(f"Normalized CT.gov condition '{cancer_type}' -> '{search_condition}'")

        # TrialGPT: LLM-generated keywords before retrieval gives ~40% recall improvement
        # over raw patient notes or biomarker strings alone.
        _progress("Stage 2: Generating AI search keywords from patient profile")
        try:
            keywords_query = generate_retrieval_keywords(
                result.case.compact_matching_profile,
                result.case.key_biomarkers,
            )
            # Use top keyword tokens to broaden the CT.gov query beyond raw biomarker names
            llm_keyword_tokens = keywords_query.split()[:15]
        except Exception as kw_err:
            logger.warning(f"Keyword generation failed, falling back to raw biomarkers: {kw_err}")
            keywords_query = " ".join(result.case.key_biomarkers)
            llm_keyword_tokens = result.case.key_biomarkers[:8]

        ct_client = ClinicalTrialsClient(use_cache=True)
        _progress(f"Stage 2: Searching ClinicalTrials.gov for '{search_condition}'")
        raw_trials = ct_client.search_trials(
            condition=search_condition,
            cancer_keywords=llm_keyword_tokens,
            max_results=max_retrieved_trials,
        )

        # Hybrid re-ranking over retrieved trials using the full LLM keyword query
        if raw_trials:
            _progress(f"Stage 2: Found {len(raw_trials)} trials — re-ranking by relevance")
            retriever = HybridTrialRetriever(raw_trials)
            ranked_retrieval = retriever.retrieve(keywords_query, top_k=max_retrieved_trials)
            result.retrieved_trials = [trial for trial, _ in ranked_retrieval]
        else:
            result.retrieved_trials = []

        logger.info(f"Retrieved {len(result.retrieved_trials)} trials for matching")

        # National referral search — finds relevant trials with no Markey site
        _progress("Stage 2: Searching nationally for referral candidates")
        try:
            local_ids = {t.nct_id for t in result.retrieved_trials}
            national_trials = ct_client.search_trials_national(
                condition=search_condition,
                cancer_keywords=llm_keyword_tokens,
                exclude_ids=local_ids,
                max_results=config.MAX_REFERRAL_RETRIEVAL,
            )
            if national_trials:
                national_retriever = HybridTrialRetriever(national_trials)
                national_ranked = national_retriever.retrieve(
                    keywords_query, top_k=config.MAX_REFERRAL_RETRIEVAL
                )
                # Keep only trials that are NOT at Markey (true referrals)
                result.referral_candidates = [
                    t for t, _ in national_ranked if not t.at_markey
                ][:config.MAX_REFERRAL_RETRIEVAL]
                logger.info(f"Found {len(result.referral_candidates)} national referral candidates")
        except Exception as ref_err:
            logger.warning(f"National referral search failed: {ref_err}")

    except Exception as e:
        result.errors.append(f"Stage 2 failed: {e}")
        logger.error(f"Stage 2 retrieval error: {e}", exc_info=True)
        # Continue to attempt matching with empty trial list
        result.retrieved_trials = []

    if not result.retrieved_trials and not result.referral_candidates:
        result.errors.append("No local or referral trials retrieved - cannot proceed with matching")
        return result

    # ── Stage 3: Criterion-by-Criterion Matching ────────────────────────────
    _progress("Stage 3: Running criterion matching", 0, min(max_detailed_trials, len(result.retrieved_trials)))
    try:
        matcher = TrialMatcher(max_workers=max_matching_workers)

        def match_progress(done, total):
            _progress("Stage 3: Criterion matching", done, total)

        # Use compact_matching_profile for cloud calls: dates stripped, ~60% smaller,
        # same eligibility signal. full_text_summary is preserved for reports and audit trail.
        matching_summary = result.case.compact_matching_profile
        if result.retrieved_trials:
            result.match_results = matcher.match_patient_to_trials(
                patient_summary=matching_summary,
                trials=result.retrieved_trials,
                max_trials=max_detailed_trials,
                progress_callback=match_progress,
            )
            logger.info(f"Criterion matching complete for {len(result.match_results)} trials")
        else:
            logger.info("No local trials retrieved; skipping local criterion matching")

        # Match referral candidates (smaller set, no progress callback needed)
        if result.referral_candidates:
            _progress("Stage 3: Matching referral candidates", 0, config.MAX_REFERRAL_DETAILED)
            try:
                result.referral_match_results = matcher.match_patient_to_trials(
                    patient_summary=matching_summary,
                    trials=result.referral_candidates,
                    max_trials=config.MAX_REFERRAL_DETAILED,
                    progress_callback=None,
                )
                logger.info(f"Referral matching complete for {len(result.referral_match_results)} candidates")
            except Exception as ref_err:
                logger.warning(f"Referral criterion matching failed: {ref_err}")

    except Exception as e:
        result.errors.append(f"Stage 3 failed: {e}")
        logger.error(f"Stage 3 matching error: {e}", exc_info=True)
        return result

    # ── Stage 4: Trial Ranking ──────────────────────────────────────────────
    try:
        trials_by_nct = {t.nct_id: t for t in result.retrieved_trials}
        tumor_type = result.case.clinical.cancer_type if result.case.clinical else None

        if result.case.genomics and config.ONCOKB_TOKEN:
            _progress("Stage 4: Querying OncoKB for variant actionability")
        _progress("Stage 4: Computing composite scores")

        result.ranked_trials = rank_trials(
            match_results=result.match_results,
            trials_by_nct=trials_by_nct,
            genomic_profiles=result.case.genomics,
            tumor_type=tumor_type,
        )
        logger.info(f"Trials ranked. Top trial: {result.ranked_trials[0].nct_id if result.ranked_trials else 'none'}")

        # Rank referral candidates separately
        if result.referral_match_results:
            referral_by_nct = {t.nct_id: t for t in result.referral_candidates}
            result.referral_trials = rank_trials(
                match_results=result.referral_match_results,
                trials_by_nct=referral_by_nct,
                genomic_profiles=result.case.genomics,
                tumor_type=tumor_type,
            )
            logger.info(f"Referral trials ranked: {len(result.referral_trials)}")
    except Exception as e:
        result.errors.append(f"Stage 4 failed: {e}")
        logger.error(f"Stage 4 ranking error: {e}", exc_info=True)
        return result

    # ── Stage 5: Report Generation ──────────────────────────────────────────
    _progress("Stage 5: Generating MTB report")
    try:
        report_path = output_dir / "match_report.txt" if save_outputs else None
        json_path = output_dir / "match_report.json" if save_outputs else None

        result.text_report = generate_text_report(
            case=result.case,
            ranked_trials=result.ranked_trials,
            top_n=10,
            referral_trials=result.referral_trials,
            output_path=report_path,
        )
        result.json_report = generate_json_report(
            case=result.case,
            ranked_trials=result.ranked_trials,
            referral_trials=result.referral_trials,
            output_path=json_path,
        )
        logger.info("Reports generated successfully")
    except Exception as e:
        result.errors.append(f"Stage 5 failed: {e}")
        logger.error(f"Stage 5 report error: {e}", exc_info=True)

    _progress("Complete")
    return result
