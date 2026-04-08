"""
Unified patient profile combining clinical notes + genomic reports.
Serves as the single input artifact for all downstream matching stages.

Multi-timepoint reconciliation:
When a patient has multiple genomic reports (e.g. Caris at diagnosis,
Guardant360 liquid biopsy at progression), variants are reconciled across
reports. Variants confirmed in multiple assays are flagged as high-confidence;
discordances (present in one report, absent in another for the same gene)
are noted for coordinator review.
"""

import json
import logging
import re
import threading
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from src.extraction.clinical_note_parser import ClinicalProfile, parse_clinical_notes, clinical_profile_to_text_summary
from src.extraction.genomic_parser import GenomicProfile, Variant, parse_genomic_report, genomic_profile_to_text_summary

_logger = logging.getLogger(__name__)


@dataclass
class PatientCase:
    """Complete patient case for trial matching."""
    case_id: str
    clinical: Optional[ClinicalProfile] = None
    genomics: list[GenomicProfile] = field(default_factory=list)
    additional_context: str = ""

    @property
    def full_text_summary(self) -> str:
        """
        Generate a unified free-text patient summary for LLM-based matching.
        This is the primary input to TrialGPT-style criterion matching.
        """
        sections = [f"PATIENT CASE: {self.case_id}"]

        if self.clinical:
            sections.append("\n## CLINICAL PROFILE")
            sections.append(clinical_profile_to_text_summary(self.clinical))

            if self.clinical.prior_therapies:
                sections.append("\nPrior Therapies:")
                for t in self.clinical.prior_therapies:
                    line = f"  Line {t.line or '?'}: {t.regimen}"
                    if t.response:
                        line += f" → {t.response}"
                    if t.discontinuation_reason:
                        line += f" (stopped: {t.discontinuation_reason})"
                    sections.append(line)

            if self.clinical.labs:
                sections.append("\nKey Lab Values:")
                for lab in self.clinical.labs[:15]:  # Limit to 15 most recent
                    sections.append(f"  {lab.name}: {lab.value} {lab.unit or ''}")

            if self.clinical.comorbidities:
                sections.append(f"\nComorbidities: {', '.join(self.clinical.comorbidities)}")

            if self.clinical.autoimmune_conditions:
                sections.append(f"Autoimmune conditions: {', '.join(self.clinical.autoimmune_conditions)}")

            if self.clinical.brain_metastases:
                sections.append("Brain metastases: Present")

        for genomic in self.genomics:
            sections.append(f"\n## GENOMIC PROFILE ({genomic.vendor.upper()})")
            sections.append(genomic_profile_to_text_summary(genomic))

        if self.additional_context:
            sections.append(f"\n## ADDITIONAL CONTEXT\n{self.additional_context}")

        # Surface cross-report reconciliation notes if multiple reports
        if len(self.genomics) > 1:
            confirmed, discordant = _reconcile_genomic_reports(self.genomics)
            if confirmed:
                sections.append(
                    "\n## CROSS-REPORT CONFIRMED VARIANTS (high confidence)\n" +
                    ", ".join(confirmed)
                )
            if discordant:
                sections.append(
                    "\n## DISCORDANT FINDINGS (present in one report only — review)\n" +
                    "; ".join(f"{gene}: {detail}" for gene, detail in discordant.items())
                )

        return "\n".join(sections)

    @property
    def key_biomarkers(self) -> list[str]:
        """
        Return a list of key biomarker strings for keyword-based trial retrieval.
        e.g. ["KRAS G12C", "STK11", "TMB-High", "MSS"]
        """
        biomarkers = []
        for genomic in self.genomics:
            for v in genomic.variants:
                if not v.gene or not v.variant:
                    continue
                if str(v.gene).strip().lower() in {"null", "none", "unknown"}:
                    continue
                if str(v.variant).strip().lower() in {"null", "none", "unknown"}:
                    continue
                # Prioritise pathogenic/likely pathogenic variants (tier 4-5) by listing them first
                if v.pathogenicity_tier is not None and v.pathogenicity_tier >= 4:
                    biomarkers.insert(0, f"{v.gene} {v.variant}")
                else:
                    biomarkers.append(f"{v.gene} {v.variant}")
            for f in genomic.fusions:
                biomarkers.append(f"{f.gene1}::{f.gene2} fusion")
            for a in genomic.amplifications:
                biomarkers.append(f"{a.gene} amplification")
            for d in genomic.deletions:
                if d.get('gene'):
                    biomarkers.append(f"{d['gene']} deletion")
            if genomic.tmb_status == "High":
                biomarkers.append("TMB-High")
            if genomic.msi_status == "MSI-H":
                biomarkers.append("MSI-High")
            if genomic.hrd_status == "HRD-positive":
                biomarkers.append("HRD-positive")
        deduped = []
        seen = set()
        for biomarker in biomarkers:
            normalized = _normalize_biomarker_text(biomarker)
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(normalized)
        return deduped

    @property
    def compact_matching_profile(self) -> str:
        """
        Concise, date-stripped patient summary for criterion matching (Stage 3).

        Compared to full_text_summary:
        - Removes all dates (lab dates, therapy dates) — the primary PHI element
          in the structured profile when transmitted to cloud AI
        - Keeps only eligibility-relevant fields
        - ~60% smaller (~1500-2500 chars vs 5000-8000)

        Use this for all cloud API calls in Stages 2-3 instead of full_text_summary.
        """
        lines = [f"PATIENT MATCHING PROFILE: {self.case_id}"]

        if self.clinical:
            c = self.clinical
            demo = []
            if c.age:
                demo.append(f"Age: {c.age}")
            if c.sex:
                demo.append(f"Sex: {c.sex}")
            if c.ecog_ps is not None:
                demo.append(f"ECOG PS: {c.ecog_ps}")
            if c.smoking_status:
                demo.append(f"Smoking: {c.smoking_status}")
            if demo:
                lines.append("Demographics: " + " | ".join(demo))

            dx = []
            if c.cancer_type:
                dx.append(c.cancer_type)
            if c.histology:
                dx.append(c.histology)
            if c.stage:
                dx.append(f"Stage {c.stage}")
            if c.is_metastatic is not None:
                dx.append("metastatic" if c.is_metastatic else "non-metastatic")
            if dx:
                lines.append("Diagnosis: " + ", ".join(dx))

            if c.metastatic_sites:
                lines.append("Metastatic sites: " + ", ".join(c.metastatic_sites))
            if c.brain_metastases is not None:
                lines.append(f"Brain metastases: {'Yes' if c.brain_metastases else 'No'}")
            if c.leptomeningeal_disease:
                lines.append("Leptomeningeal disease: Yes")

            if c.prior_therapies:
                lines.append("Prior therapies:")
                for t in c.prior_therapies:
                    entry = f"  Line {t.line or '?'}: {t.regimen}"
                    if t.setting:
                        entry += f" ({t.setting})"
                    if t.response:
                        entry += f" → {t.response}"
                    if t.discontinuation_reason:
                        entry += f", stopped: {t.discontinuation_reason}"
                    lines.append(entry)

            if c.labs:
                # Date intentionally omitted — dates are PHI and not needed for eligibility
                lines.append("Key labs: " + "; ".join(
                    f"{lab.name} {lab.value}{' ' + lab.unit if lab.unit else ''}"
                    for lab in c.labs[:10]
                ))

            if c.comorbidities:
                lines.append("Comorbidities: " + ", ".join(c.comorbidities))
            if c.autoimmune_conditions:
                lines.append("Autoimmune conditions: " + ", ".join(c.autoimmune_conditions))
            if c.allergies:
                lines.append("Allergies: " + ", ".join(c.allergies))
            if c.current_medications:
                lines.append("Current medications: " + ", ".join(c.current_medications[:10]))

        for genomic in self.genomics:
            lines.append(f"Genomic ({genomic.vendor.upper()}):")
            if genomic.variants:
                lines.append("  Variants: " + ", ".join(
                    f"{v.gene} {v.variant}" + (f" ({v.variant_type})" if v.variant_type else "")
                    for v in genomic.variants
                ))
            if genomic.fusions:
                lines.append("  Fusions: " + ", ".join(f"{f.gene1}::{f.gene2}" for f in genomic.fusions))
            if genomic.amplifications:
                lines.append("  Amplifications: " + ", ".join(a.gene for a in genomic.amplifications))
            if genomic.deletions:
                lines.append("  Deletions: " + ", ".join(
                    d.get("gene", "") for d in genomic.deletions if d.get("gene")
                ))
            biomarkers = []
            if genomic.tmb is not None:
                biomarkers.append(f"TMB {genomic.tmb} mut/Mb ({genomic.tmb_status or ''})")
            if genomic.msi_status:
                biomarkers.append(f"MSI: {genomic.msi_status}")
            if genomic.pdl1_tps is not None:
                biomarkers.append(f"PD-L1 TPS {genomic.pdl1_tps}%")
            if genomic.hrd_status:
                biomarkers.append(f"HRD: {genomic.hrd_status}")
            if biomarkers:
                lines.append("  Biomarkers: " + " | ".join(biomarkers))

        if self.additional_context:
            lines.append(f"Additional context: {self.additional_context}")

        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "case_id": self.case_id,
            "clinical": self.clinical.model_dump() if self.clinical else None,
            "genomics": [g.model_dump() for g in self.genomics],
            "full_text_summary": self.full_text_summary,
            "key_biomarkers": self.key_biomarkers,
        }

    def save(self, output_path: str | Path):
        Path(output_path).write_text(
            json.dumps(self.to_dict(), indent=2, default=str),
            encoding="utf-8"
        )


def build_patient_case(
    case_id: str,
    clinical_note_paths: list[str | Path] = None,
    genomic_report_paths: list[str | Path] = None,
    additional_context: str = "",
    progress_callback=None,
) -> PatientCase:
    """
    Build a complete PatientCase by extracting data from all input documents.

    Args:
        case_id: Unique identifier for this case
        clinical_note_paths: Paths to clinical note PDFs
        genomic_report_paths: Paths to genomic report PDFs
        additional_context: Optional free-text context (e.g. MTB case submission)
        progress_callback: Optional callable(stage_str) for UI progress updates

    Returns:
        Populated PatientCase ready for trial matching
    """
    case = PatientCase(case_id=case_id, additional_context=additional_context)

    # Thread-safe wrapper so concurrent tasks don't interleave progress messages.
    # Silently swallows exceptions (e.g. Streamlit's NoSessionContext) so that
    # calling the UI callback from a background thread never kills the parse task.
    _cb_lock = threading.Lock()
    def _safe_progress(msg):
        if progress_callback:
            with _cb_lock:
                try:
                    progress_callback(msg)
                except Exception:
                    pass

    tasks: dict = {}
    genomic_paths = list(genomic_report_paths or [])
    total_genomic = len(genomic_paths)

    with ThreadPoolExecutor(max_workers=max(2, total_genomic + (1 if clinical_note_paths else 0))) as executor:
        if clinical_note_paths:
            tasks["clinical"] = executor.submit(
                parse_clinical_notes,
                clinical_note_paths,
                additional_context,
                _safe_progress,
            )
        for i, path in enumerate(genomic_paths):
            if total_genomic > 1:
                _safe_progress(f"Stage 1: Genomic report {i + 1} of {total_genomic} — reading PDF")
            tasks[f"genomic_{i}"] = executor.submit(
                lambda p=path: parse_genomic_report(p, progress_callback=_safe_progress)
            )
        # Context manager exit waits for all futures to complete

    # Collect results in original submission order
    if "clinical" in tasks:
        try:
            case.clinical = tasks["clinical"].result()
        except Exception as e:
            _logger.error(f"Failed to parse clinical notes: {e}")

    for i in range(total_genomic):
        try:
            profile = tasks[f"genomic_{i}"].result()
            if profile:
                case.genomics.append(profile)
        except Exception as e:
            _logger.error(f"Failed to parse genomic report {i}: {e}")

    if len(case.genomics) > 1:
        confirmed, discordant = _reconcile_genomic_reports(case.genomics)
        _logger.info(
            f"Multi-report reconciliation: {len(confirmed)} confirmed variants, "
            f"{len(discordant)} discordant genes"
        )

    return case


def _reconcile_genomic_reports(
    profiles: list[GenomicProfile],
) -> tuple[list[str], dict[str, str]]:
    """
    Reconcile variants across multiple genomic reports for the same patient.

    Identifies:
      - Confirmed variants: same gene+variant seen in ≥2 reports (high confidence)
      - Discordant genes: gene present in one report but absent in another
        (could be assay sensitivity, tumor heterogeneity, or clonal evolution)

    Returns:
        confirmed: list of "GENE variant" strings confirmed across reports
        discordant: dict of gene → description of the discordance
    """
    if len(profiles) < 2:
        return [], {}

    # Build gene→variant map per report
    report_variants: list[dict[str, set[str]]] = []
    for profile in profiles:
        gene_variants: dict[str, set[str]] = defaultdict(set)
        for v in profile.variants:
            gene_variants[v.gene.upper()].add(v.variant)
        for f in profile.fusions:
            key = f"{f.gene1}::{f.gene2}"
            gene_variants[key].add("fusion")
        report_variants.append(dict(gene_variants))

    all_genes = set()
    for rv in report_variants:
        all_genes.update(rv.keys())

    confirmed: list[str] = []
    discordant: dict[str, str] = {}

    for gene in sorted(all_genes):
        present_in = [i for i, rv in enumerate(report_variants) if gene in rv]
        absent_in = [i for i, rv in enumerate(report_variants) if gene not in rv]

        if len(present_in) >= 2:
            # Check if the same variant is in all reports that detected this gene
            all_variants = [report_variants[i][gene] for i in present_in]
            shared = set.intersection(*[set(v) for v in all_variants])
            for var in sorted(shared):
                confirmed.append(f"{gene} {var}")
            # Check for variant-level discordance within the gene (different variants per report)
            if len(set(frozenset(v) for v in all_variants)) > 1:
                discordant[gene] = (
                    f"detected in {len(present_in)} reports but with different variants: "
                    + " vs ".join(", ".join(sorted(v)) for v in all_variants)
                )
        elif absent_in:
            # Gene found in some reports but not others
            vendors_present = [profiles[i].vendor for i in present_in]
            vendors_absent = [profiles[i].vendor for i in absent_in]
            discordant[gene] = (
                f"found in {'/'.join(vendors_present)} "
                f"but not in {'/'.join(vendors_absent)}"
            )

    return confirmed, discordant


def _normalize_biomarker_text(text: str) -> str:
    text = (text or "").strip()
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text)
    text = text.replace(" -", "-").replace("- ", "-")
    text = re.sub(r"\bnull\b", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\(\s*\d+(\.\d+)?%\s*\)", "", text)
    text = re.sub(r"\s+", " ", text).strip(" :-")
    if not text:
        return ""

    fusion_match = re.search(r"([A-Z0-9]+)\s*(?:::|-)\s*([A-Z0-9]+)\s+fusion$", text, flags=re.IGNORECASE)
    if fusion_match:
        genes = sorted([fusion_match.group(1).upper(), fusion_match.group(2).upper()])
        return f"{genes[0]}::{genes[1]} fusion"

    text = re.sub(r"\bFusion\b", "fusion", text)
    return text
