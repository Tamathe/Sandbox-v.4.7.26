"""
MTB report generator.
Produces explainable, criterion-by-criterion match reports in formats
suitable for Molecular Tumor Board review (HTML, PDF, structured text).
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from src.matching.trial_ranker import RankedTrial
from src.extraction.patient_profile import PatientCase

logger = logging.getLogger(__name__)

ELIGIBILITY_ICONS = {
    "eligible": "[ELIGIBLE]",
    "likely_eligible": "[LIKELY ELIGIBLE]",
    "uncertain": "[UNCERTAIN]",
    "likely_ineligible": "[LIKELY INELIGIBLE]",
    "ineligible": "[INELIGIBLE]",
}

CRITERION_ICONS = {
    "included": "[MET]",
    "not_included": "[NOT MET]",
    "excluded": "[EXCLUDED]",
    "not_excluded": "[CLEAR]",
    "not_enough_information": "[NEEDS REVIEW]",
    "not_applicable": "[N/A]",
}


def generate_text_report(
    case: PatientCase,
    ranked_trials: list[RankedTrial],
    top_n: int = 10,
    referral_trials: list[RankedTrial] = None,
    output_path: Optional[str | Path] = None,
) -> str:
    """
    Generate a plain-text MTB match report.

    Args:
        case: Patient case with clinical and genomic data
        ranked_trials: Ranked and scored trial matches
        top_n: Number of top trials to include in detailed report
        output_path: Optional path to save the report

    Returns:
        Report as string
    """
    lines = []
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")

    lines.append("=" * 80)
    lines.append("CLINICAL TRIAL MATCH REPORT")
    lines.append(f"UK Markey Cancer Center - Molecular Tumor Board")
    lines.append(f"Generated: {timestamp}")
    lines.append(f"Case ID: {case.case_id}")
    lines.append("=" * 80)

    # Patient summary
    lines.append("\nPATIENT SUMMARY")
    lines.append("-" * 40)
    lines.append(case.full_text_summary[:2000])

    if case.key_biomarkers:
        lines.append(f"\nKey biomarkers: {', '.join(case.key_biomarkers)}")

    # Summary table
    lines.append("\n" + "=" * 80)
    lines.append("TRIAL MATCH SUMMARY")
    lines.append("-" * 80)
    lines.append(f"{'Rank':<5} {'NCT ID':<15} {'Eligibility':<20} {'Score':<8} {'Phase':<10} {'At Markey':<12} {'Title'}")
    lines.append("-" * 80)

    for rt in ranked_trials[:top_n]:
        phase = rt.trial.phase or "N/A"
        at_markey = "Yes" if rt.at_markey else "No"
        eligibility = rt.display_eligibility
        title = (rt.match_result.trial_title or rt.nct_id)[:50]
        lines.append(
            f"{rt.rank:<5} {rt.nct_id:<15} {eligibility:<20} "
            f"{rt.composite_score:<8.1f} {phase:<10} {at_markey:<12} {title}"
        )

    lines.append("")

    # Detailed assessments
    lines.append("=" * 80)
    lines.append(f"DETAILED ASSESSMENTS (Top {min(top_n, len(ranked_trials))} trials)")
    lines.append("=" * 80)

    for rt in ranked_trials[:top_n]:
        result = rt.match_result
        trial = rt.trial

        lines.append(f"\n{'#' * 60}")
        lines.append(f"RANK #{rt.rank}: {result.trial_title}")
        lines.append(f"NCT ID: {rt.nct_id} | {trial.url}")
        lines.append(f"Status: {trial.status} | Phase: {trial.phase or 'N/A'}")
        lines.append(f"Sponsor: {trial.sponsor or 'N/A'}")

        # Eligibility status
        icon = ELIGIBILITY_ICONS.get(result.overall_eligibility, "[?]")
        lines.append(f"\nELIGIBILITY: {icon}")
        lines.append(f"Eligibility Score: {result.eligibility_score}/100")
        lines.append(f"Composite Score: {rt.composite_score:.1f}/100")

        if rt.oncokb_priority > 0:
            ann = rt.oncokb_annotations[0] if rt.oncokb_annotations else None
            if ann:
                lines.append(f"OncoKB Evidence: {ann.evidence_level or ann.highest_sensitive_level}")

        if rt.at_markey:
            lines.append(">> AVAILABLE AT UK MARKEY CANCER CENTER <<")

        lines.append(f"\nSummary: {result.summary}")

        # Hard exclusions first
        if result.hard_exclusions:
            lines.append("\nHARD EXCLUSIONS:")
            for excl in result.hard_exclusions[:3]:
                lines.append(f"  [EXCLUDED] {excl[:120]}")

        # Key met inclusions
        if result.key_inclusions_met:
            lines.append("\nKEY INCLUSION CRITERIA MET:")
            for incl in result.key_inclusions_met[:5]:
                lines.append(f"  [MET] {incl[:120]}")

        # Criteria needing review
        if result.uncertain_criteria:
            lines.append("\nCRITERIA REQUIRING COORDINATOR REVIEW:")
            for unc in result.uncertain_criteria[:5]:
                lines.append(f"  [NEEDS REVIEW] {unc[:120]}")

        # Detailed criterion breakdown
        if result.inclusion_assessments:
            lines.append("\nINCLUSION CRITERIA ASSESSMENT:")
            for a in result.inclusion_assessments[:15]:
                icon = CRITERION_ICONS.get(a.label, "[?]")
                lines.append(f"  {icon} {a.criterion_text[:80]}")
                lines.append(f"     -> {a.explanation[:150]}")
                if a.source_citations:
                    lines.append(f"     Source: \"{a.source_citations[0][:100]}\"")

        if result.exclusion_assessments:
            lines.append("\nEXCLUSION CRITERIA ASSESSMENT:")
            for a in result.exclusion_assessments[:15]:
                icon = CRITERION_ICONS.get(a.label, "[?]")
                lines.append(f"  {icon} {a.criterion_text[:80]}")
                lines.append(f"     -> {a.explanation[:150]}")

    # Referral candidates section
    if referral_trials:
        lines.append("\n" + "=" * 80)
        lines.append("REFERRAL CANDIDATES (National — No Markey Site)")
        lines.append(
            "These trials are recruiting nationally but have no UK Markey site.\n"
            "Patient referral to a participating institution may be appropriate."
        )
        lines.append("-" * 80)
        lines.append(f"{'Rank':<5} {'NCT ID':<15} {'Eligibility':<20} {'Score':<8} {'Phase':<10} {'Title'}")
        lines.append("-" * 80)

        for rt in referral_trials:
            phase = rt.trial.phase or "N/A"
            eligibility = rt.display_eligibility
            title = (rt.match_result.trial_title or rt.nct_id)[:55]
            lines.append(
                f"{rt.rank:<5} {rt.nct_id:<15} {eligibility:<20} "
                f"{rt.composite_score:<8.1f} {phase:<10} {title}"
            )

        lines.append("")
        lines.append("REFERRAL CANDIDATE DETAILS")
        lines.append("=" * 80)

        for rt in referral_trials:
            result = rt.match_result
            trial = rt.trial
            lines.append(f"\n{'#' * 60}")
            lines.append(f"REFERRAL #{rt.rank}: {result.trial_title}")
            lines.append(f"NCT ID: {rt.nct_id} | {trial.url}")
            lines.append(f"Status: {trial.status} | Phase: {trial.phase or 'N/A'} | Sponsor: {trial.sponsor or 'N/A'}")

            # Show available sites
            us_sites = [
                f"{loc.facility} ({loc.city}, {loc.state})"
                for loc in trial.locations
                if loc.country == "United States" and loc.facility
            ]
            if us_sites:
                lines.append(f"US Sites: {'; '.join(us_sites[:5])}")

            icon = ELIGIBILITY_ICONS.get(result.overall_eligibility, "[?]")
            lines.append(f"\nELIGIBILITY: {icon}  Score: {result.eligibility_score}")
            lines.append(f"Summary: {result.summary}")

            if result.hard_exclusions:
                lines.append("HARD EXCLUSIONS: " + " | ".join(result.hard_exclusions[:2]))
            if result.key_inclusions_met:
                lines.append("KEY INCLUSIONS MET: " + " | ".join(result.key_inclusions_met[:3]))

    report_text = "\n".join(lines)

    if output_path:
        Path(output_path).write_text(report_text, encoding="utf-8")
        logger.info(f"Report saved to {output_path}")

    return report_text


def generate_json_report(
    case: PatientCase,
    ranked_trials: list[RankedTrial],
    referral_trials: list[RankedTrial] = None,
    output_path: Optional[str | Path] = None,
) -> dict:
    """Generate a structured JSON report for programmatic use."""
    report = {
        "case_id": case.case_id,
        "generated_at": datetime.now().isoformat(),
        "patient_summary": case.full_text_summary,
        "key_biomarkers": case.key_biomarkers,
        "total_trials_evaluated": len(ranked_trials),
        "trials": [],
        "referral_trials": [],
    }

    for rt in ranked_trials:
        trial_entry = {
            "rank": rt.rank,
            "nct_id": rt.nct_id,
            "title": rt.match_result.trial_title,
            "url": rt.trial.url,
            "phase": rt.trial.phase,
            "status": rt.trial.status,
            "sponsor": rt.trial.sponsor,
            "at_markey": rt.at_markey,
            "overall_eligibility": rt.match_result.overall_eligibility,
            "eligibility_score": rt.match_result.eligibility_score,
            "relevance_score": rt.match_result.relevance_score,
            "composite_score": rt.composite_score,
            "summary": rt.match_result.summary,
            "hard_exclusions": rt.match_result.hard_exclusions,
            "key_inclusions_met": rt.match_result.key_inclusions_met,
            "uncertain_criteria": rt.match_result.uncertain_criteria,
            "oncokb_evidence": rt.oncokb_annotations[0].evidence_level if rt.oncokb_annotations else None,
        }
        report["trials"].append(trial_entry)

    for rt in (referral_trials or []):
        us_sites = [
            {"facility": loc.facility, "city": loc.city, "state": loc.state}
            for loc in rt.trial.locations
            if loc.country == "United States" and loc.facility
        ]
        report["referral_trials"].append({
            "rank": rt.rank,
            "nct_id": rt.nct_id,
            "title": rt.match_result.trial_title,
            "url": rt.trial.url,
            "phase": rt.trial.phase,
            "status": rt.trial.status,
            "sponsor": rt.trial.sponsor,
            "overall_eligibility": rt.match_result.overall_eligibility,
            "eligibility_score": rt.match_result.eligibility_score,
            "relevance_score": rt.match_result.relevance_score,
            "composite_score": rt.composite_score,
            "summary": rt.match_result.summary,
            "hard_exclusions": rt.match_result.hard_exclusions,
            "key_inclusions_met": rt.match_result.key_inclusions_met,
            "uncertain_criteria": rt.match_result.uncertain_criteria,
            "us_sites": us_sites[:10],
        })

    if output_path:
        Path(output_path).write_text(
            json.dumps(report, indent=2, default=str),
            encoding="utf-8"
        )

    return report
