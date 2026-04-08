"""
Trial ranking module.
Aggregates criterion-level predictions and OncoKB annotations into a final
prioritized list of clinical trials for MTB review.

Ranking factors:
  1. Eligibility score (-100 to +100)
  2. OncoKB evidence level (prioritizes biomarker-driven trials)
  3. Markey site availability
  4. Trial phase
  5. Relevance score
"""

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.matching.criterion_matcher import TrialMatchResult
from src.retrieval.trial_fetcher import ClinicalTrial
from src.annotation.oncokb_client import OncoKBAnnotation, OncoKBClient, get_oncokb_evidence_priority
from src.extraction.genomic_parser import GenomicProfile

logger = logging.getLogger(__name__)


@dataclass
class RankedTrial:
    """A trial with its match result and final composite ranking score."""
    trial: ClinicalTrial
    match_result: TrialMatchResult
    composite_score: float = 0.0
    oncokb_annotations: list[OncoKBAnnotation] = field(default_factory=list)
    oncokb_priority: int = 0  # 0-6, higher is more actionable
    at_markey: bool = False
    rank: int = 0

    @property
    def nct_id(self) -> str:
        return self.trial.nct_id

    @property
    def display_eligibility(self) -> str:
        """Human-readable eligibility status with emoji indicator."""
        status_map = {
            "eligible": "Eligible",
            "likely_eligible": "Likely Eligible",
            "uncertain": "Uncertain",
            "likely_ineligible": "Likely Ineligible",
            "ineligible": "Ineligible",
        }
        return status_map.get(self.match_result.overall_eligibility, "Unknown")

    @property
    def eligibility_color(self) -> str:
        """Streamlit-compatible color for eligibility status."""
        color_map = {
            "eligible": "green",
            "likely_eligible": "green",
            "uncertain": "orange",
            "likely_ineligible": "red",
            "ineligible": "red",
        }
        return color_map.get(self.match_result.overall_eligibility, "gray")


def rank_trials(
    match_results: list[TrialMatchResult],
    trials_by_nct: dict[str, ClinicalTrial],
    genomic_profiles: list[GenomicProfile] = None,
    tumor_type: str = None,
) -> list[RankedTrial]:
    """
    Rank matched trials by composite score incorporating eligibility,
    biomarker actionability, and site availability.

    Args:
        match_results: Criterion-level match results
        trials_by_nct: Dict mapping NCT ID -> ClinicalTrial
        genomic_profiles: Patient genomic profiles for OncoKB annotation
        tumor_type: Patient's tumor type for OncoKB queries

    Returns:
        List of RankedTrial objects sorted by composite_score descending
    """
    # Annotate key variants with OncoKB if available
    oncokb_cache: dict[str, OncoKBAnnotation] = {}
    if genomic_profiles:
        oncokb_cache = _annotate_variants(genomic_profiles, tumor_type)

    ranked = []
    for result in match_results:
        trial = trials_by_nct.get(result.nct_id)
        if not trial:
            continue

        # Find relevant OncoKB annotations for this trial
        trial_annotations = _match_oncokb_to_trial(trial, oncokb_cache)
        oncokb_priority = max(
            (get_oncokb_evidence_priority(a) for a in trial_annotations),
            default=0
        )

        # Composite scoring
        composite = _compute_composite_score(
            result, trial, oncokb_priority
        )

        ranked.append(RankedTrial(
            trial=trial,
            match_result=result,
            composite_score=composite,
            oncokb_annotations=trial_annotations,
            oncokb_priority=oncokb_priority,
            at_markey=trial.at_markey,
        ))

    # Sort by composite score
    ranked.sort(key=lambda r: r.composite_score, reverse=True)

    # Assign ranks
    for i, rt in enumerate(ranked):
        rt.rank = i + 1

    # Surface Markey trials in top positions when tied
    ranked = _boost_markey_trials(ranked)

    return ranked


def _compute_composite_score(
    result: TrialMatchResult,
    trial: ClinicalTrial,
    oncokb_priority: int,
) -> float:
    """
    Compute composite ranking score.
    Weights: eligibility (50%), relevance (20%), OncoKB (20%), phase/site (10%)
    """
    # Eligibility: -100 to +100 → normalize to 0-1
    eligibility_norm = (result.eligibility_score + 100) / 200.0

    # Relevance: 0-100 → 0-1
    relevance_norm = result.relevance_score / 100.0

    # OncoKB evidence level: 0-6 → 0-1
    oncokb_norm = oncokb_priority / 6.0

    # Phase bonus (Phase 2/3 preferred for MTB) — normalized 0-1
    phase_bonus = 0.0
    if trial.phase:
        if "3" in trial.phase:
            phase_bonus = 1.0
        elif "2" in trial.phase:
            phase_bonus = 0.7
        elif "1" in trial.phase:
            phase_bonus = 0.3

    # Site bonus — normalized 0-1
    site_bonus = 1.0 if trial.at_markey else 0.0

    composite = (
        0.50 * eligibility_norm +
        0.20 * relevance_norm +
        0.20 * oncokb_norm +
        0.05 * phase_bonus +
        0.05 * site_bonus
    )

    # Apply hard exclusion penalty
    if result.hard_exclusions:
        composite *= 0.1

    return round(composite * 100, 2)  # Scale to 0-100


def _boost_markey_trials(ranked: list[RankedTrial]) -> list[RankedTrial]:
    """
    Ensure Markey trials appear prominently when their scores are competitive.
    Within 20% of top score, Markey trials are promoted above non-Markey.
    """
    if not ranked:
        return ranked

    top_score = ranked[0].composite_score
    threshold = top_score * 0.80

    markey = [r for r in ranked if r.at_markey and r.composite_score >= threshold]
    others = [r for r in ranked if not (r.at_markey and r.composite_score >= threshold)]

    reranked = markey + others
    for i, rt in enumerate(reranked):
        rt.rank = i + 1

    return reranked


def _annotate_variants(
    genomic_profiles: list[GenomicProfile],
    tumor_type: Optional[str],
) -> dict[str, OncoKBAnnotation]:
    """Annotate patient variants with OncoKB and cache by gene:variant key."""
    client = OncoKBClient()
    cache = {}

    mutations = []
    for profile in genomic_profiles:
        for variant in profile.variants:
            mutations.append({
                "hugoSymbol": variant.gene,
                "alteration": variant.variant,
            })

    if mutations:
        annotations = client.annotate_batch(mutations, tumor_type)
        for ann in annotations:
            key = f"{ann.gene}:{ann.variant}"
            cache[key] = ann

    return cache


def _match_oncokb_to_trial(
    trial: ClinicalTrial,
    oncokb_cache: dict[str, OncoKBAnnotation],
) -> list[OncoKBAnnotation]:
    """Find OncoKB-annotated variants that are relevant to a given trial."""
    relevant = []
    trial_text = (
        " ".join(trial.conditions) + " " +
        " ".join(trial.inclusion_criteria[:5]) + " " +
        trial.brief_summary
    ).lower()

    for key, annotation in oncokb_cache.items():
        gene = annotation.gene.lower()
        if gene in trial_text and annotation.is_actionable:
            relevant.append(annotation)

    return relevant
