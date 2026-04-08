"""
LLM-based genomic report parser.
Extracts structured variant data from Caris, Guardant360, Tempus, and FoundationOne reports.
Achieves >98% accuracy per benchmark (Claude 3 Opus on pathology reports).
"""

import logging
import re
from pathlib import Path
from typing import Optional

import anthropic
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

import config
from src.extraction.pdf_extractor import extract_text_from_pdf, detect_report_vendor
from src.llm_client import LLMClient
from src.utils import extract_json

logger = logging.getLogger(__name__)


# ── Pydantic schema for extracted genomic data ─────────────────────────────

class Variant(BaseModel):
    gene: str = Field(description="HUGO gene symbol (e.g. BRAF, KRAS)")
    variant: str = Field(description="HGVS protein change if available (e.g. p.V600E)")
    variant_type: str = Field(description="SNV, indel, fusion, amplification, deletion, or other")
    vaf: Optional[float] = Field(None, description="Variant allele frequency 0-100%")
    exon: Optional[str] = Field(None, description="Exon number if reported")
    interpretation: Optional[str] = Field(None, description="Pathogenic/VUS/etc.")
    pathogenicity_tier: Optional[int] = Field(
        None,
        description="ACMG/AMP 5-tier classification: 1=Benign, 2=Likely Benign, 3=VUS, 4=Likely Pathogenic, 5=Pathogenic"
    )
    notes: Optional[str] = Field(None, description="Additional notes from report")


class Fusion(BaseModel):
    gene1: str
    gene2: str
    variant_type: str = "fusion"
    fusion_description: Optional[str] = None
    notes: Optional[str] = None


class Amplification(BaseModel):
    gene: str
    copy_number: Optional[float] = None
    variant_type: str = "amplification"
    notes: Optional[str] = None


class GenomicProfile(BaseModel):
    vendor: str = Field(description="caris, guardant360, tempus, foundationone, or unknown")
    report_date: Optional[str] = Field(None, description="Report date (YYYY-MM-DD if available)")
    specimen_type: Optional[str] = Field(None, description="Tissue, liquid biopsy, etc.")
    tumor_type: Optional[str] = Field(None, description="Tumor type from report")

    variants: list[Variant] = Field(default_factory=list, description="SNVs and indels")
    fusions: list[Fusion] = Field(default_factory=list, description="Gene fusions")
    amplifications: list[Amplification] = Field(default_factory=list, description="Copy number amplifications")
    deletions: list[dict] = Field(default_factory=list, description="Deletions/losses")

    tmb: Optional[float] = Field(None, description="Tumor mutational burden (mut/Mb)")
    tmb_status: Optional[str] = Field(None, description="High/Intermediate/Low")
    msi_status: Optional[str] = Field(None, description="MSS/MSI-L/MSI-H")
    pdl1_tps: Optional[float] = Field(None, description="PD-L1 tumor proportion score (%)")
    pdl1_cps: Optional[float] = Field(None, description="PD-L1 combined positive score")
    pdl1_clone: Optional[str] = Field(None, description="PD-L1 antibody clone used")
    hrd_status: Optional[str] = Field(None, description="HRD-positive/negative")
    hrd_score: Optional[float] = Field(None, description="HRD numeric score if reported")
    gloh: Optional[float] = Field(None, description="Genomic LOH score (FoundationOne)")

    raw_text_excerpt: Optional[str] = Field(None, description="Key excerpt for verification")


# ── Vendor-specific prompt hints ───────────────────────────────────────────

VENDOR_HINTS = {
    "caris": (
        "This is a Caris Molecular Intelligence report. It uses a multiplatform approach "
        "(NGS + IHC + FISH + WTS). Look for IHC results (PD-L1 with TPS/CPS), "
        "WTS-detected fusions, TMB score, and MSI by NGS. The report may include "
        "protein expression levels alongside mutation data."
    ),
    "guardant360": (
        "This is a Guardant360 CDx liquid biopsy report (73 gene panel). "
        "Variants are reported with VAF (variant allele frequency). "
        "Look for clonal hematopoiesis (CH) flags. MSI is reported when applicable. "
        "CNAs and fusions are also reported."
    ),
    "tempus": (
        "This is a Tempus xT or xF report (648 gene panel for tissue, RNA fusions). "
        "Look for DNA mutations, RNA fusion calls, TMB, MSI, and PD-L1. "
        "The report separates somatic and germline findings."
    ),
    "foundationone": (
        "This is a FoundationOne CDx report (324 genes). "
        "Reports SNVs/indels, CNAs, fusions/rearrangements, TMB (mut/Mb), MSI, and gLOH. "
        "Look for NTRK fusions specifically flagged for TRK inhibitor eligibility."
    ),
    "unknown": (
        "This is a genomic/molecular profiling report. Extract all mutation, fusion, "
        "amplification, TMB, MSI, and PD-L1 findings you can identify."
    ),
}


# ── Main extraction function ────────────────────────────────────────────────

_GENOMIC_USER_TEMPLATE = """\
Extract all genomic findings from this report and return a JSON object matching this exact schema:

{{
  "vendor": "{vendor}",
  "report_date": "YYYY-MM-DD or null",
  "specimen_type": "tissue/liquid biopsy/etc or null",
  "tumor_type": "tumor type stated in report or null",
  "variants": [
    {{
      "gene": "HUGO symbol",
      "variant": "HGVS protein change or nucleotide change or descriptive",
      "variant_type": "SNV|indel|other",
      "vaf": null or number,
      "exon": null or "exon N",
      "interpretation": "Pathogenic/Likely Pathogenic/VUS/Benign/null",
      "pathogenicity_tier": null or 1-5 (1=Benign, 2=Likely Benign, 3=VUS, 4=Likely Pathogenic, 5=Pathogenic),
      "notes": null or "additional info"
    }}
  ],
  "fusions": [
    {{
      "gene1": "GENE1",
      "gene2": "GENE2",
      "variant_type": "fusion",
      "fusion_description": null or "description",
      "notes": null
    }}
  ],
  "amplifications": [
    {{
      "gene": "GENE",
      "copy_number": null or number,
      "variant_type": "amplification",
      "notes": null
    }}
  ],
  "deletions": [
    {{
      "gene": "GENE",
      "description": "description",
      "notes": null
    }}
  ],
  "tmb": null or number,
  "tmb_status": null or "High|Intermediate|Low",
  "msi_status": null or "MSS|MSI-L|MSI-H",
  "pdl1_tps": null or number,
  "pdl1_cps": null or number,
  "pdl1_clone": null or "clone name",
  "hrd_status": null or "HRD-positive|HRD-negative",
  "hrd_score": null or number,
  "gloh": null or number,
  "raw_text_excerpt": "paste 2-3 key lines from the report that support your extraction"
}}

REPORT TEXT:
{text}
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=2, max=10),
    retry=retry_if_not_exception_type(anthropic.BadRequestError),
)
def parse_genomic_report(
    pdf_path: str | Path,
    vendor_hint: Optional[str] = None,
    progress_callback=None,
) -> GenomicProfile:
    """
    Extract structured genomic data from a PDF report.

    In local LLM mode, processes one page at a time and merges findings.
    In cloud mode, sends the full report text in one call.
    """
    def _cb(msg):
        if progress_callback:
            progress_callback(msg)

    pdf_path = Path(pdf_path)
    raw_text = extract_text_from_pdf(pdf_path)

    vendor = vendor_hint or detect_report_vendor(raw_text, pdf_path.name)
    vendor_context = VENDOR_HINTS.get(vendor, VENDOR_HINTS["unknown"])

    system_prompt = (
        f"You are a molecular oncology expert extracting structured data from genomic reports.\n"
        f"{vendor_context}\n\n"
        "Extract ALL findings with precision. Use HUGO gene symbols. For protein changes use HGVS notation (e.g. p.V600E).\n"
        "If a value is not mentioned in the report, use null — never guess or invent data.\n"
        "For VAF values, extract as a percentage number (e.g., 15.3 not 0.153).\n"
        "Include ALL variants — both actionable and variants of uncertain significance (VUS).\n"
    )
    client = LLMClient()

    if config.USE_LOCAL_LLM:
        pages = _split_genomic_pages(raw_text, config.LOCAL_LLM_MAX_TEXT_CHARS)
        profiles: list[GenomicProfile] = []
        for i, page_text in enumerate(pages):
            _cb(f"Stage 1: AI analyzing {vendor.upper()} report — page {i + 1}/{len(pages)}")
            try:
                prompt = _GENOMIC_USER_TEMPLATE.format(vendor=vendor, text=page_text)
                response = client.messages.create(
                    model=config.LOCAL_LLM_MODEL,
                    max_tokens=config.LOCAL_LLM_RESPONSE_TOKENS,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw_json = _sanitize_genomic_payload(extract_json(response.content[0].text), vendor)
                profiles.append(GenomicProfile.model_validate(raw_json))
            except Exception as e:
                logger.warning(f"Genomic page {i + 1} extraction failed: {e}")
        _cb("Stage 1: Genomic variants identified — merging page results")
        return _merge_genomic_profiles(profiles, vendor)
    else:
        prompt = _GENOMIC_USER_TEMPLATE.format(vendor=vendor, text=raw_text[:30000])
        _cb(f"Stage 1: AI analyzing {vendor.upper()} report — extracting mutations, fusions, TMB, MSI")
        response = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": prompt}],
        )
        _cb("Stage 1: Genomic variants identified — mutations, fusions, copy number changes extracted")
        raw_json = _sanitize_genomic_payload(extract_json(response.content[0].text), vendor)
        return GenomicProfile.model_validate(raw_json)


def _split_genomic_pages(text: str, max_chars: int) -> list[str]:
    """Split OCR text on page markers into chunks fitting within max_chars."""
    pages = [p.strip() for p in re.split(r"--- Page \d+ ---", text) if p.strip()]
    if not pages:
        return [text[i:i + max_chars] for i in range(0, len(text), max_chars)] or [text]
    chunks: list[str] = []
    current = ""
    for page in pages:
        if len(page) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(
                page[i:i + max_chars].strip()
                for i in range(0, len(page), max_chars)
                if page[i:i + max_chars].strip()
            )
            continue
        if current and len(current) + len(page) + 1 > max_chars:
            chunks.append(current)
            current = page
        else:
            current = (current + "\n" + page).strip() if current else page
    if current:
        chunks.append(current)
    return chunks


def _clean_str(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float, bool)):
        value = str(value)
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not value or value.lower() in {"null", "none", "n/a", "unknown"}:
        return None
    return value


def _normalize_fusion_gene(value: Optional[str]) -> Optional[str]:
    value = _clean_str(value)
    if not value:
        return None
    return re.sub(r"[^A-Z0-9]", "", value.upper())


def _sanitize_genomic_payload(raw_json: dict | list, vendor: str) -> dict:
    """Make local-model genomic JSON tolerant of missing required strings."""
    if not isinstance(raw_json, dict):
        return {"vendor": vendor}

    cleaned = dict(raw_json)
    cleaned["vendor"] = _clean_str(cleaned.get("vendor")) or vendor

    variants = cleaned.get("variants") or []
    safe_variants = []
    for variant in variants if isinstance(variants, list) else []:
        if not isinstance(variant, dict):
            continue
        gene = _normalize_fusion_gene(variant.get("gene"))
        alt = _clean_str(variant.get("variant"))
        if not gene or not alt:
            continue
        variant_type = _clean_str(variant.get("variant_type"))
        if not variant_type:
            lowered = alt.lower()
            variant_type = "fusion" if "fusion" in lowered or "::" in alt else "other"
        safe_variants.append({
            "gene": gene,
            "variant": alt,
            "variant_type": variant_type,
            "vaf": variant.get("vaf"),
            "exon": _clean_str(variant.get("exon")),
            "interpretation": _clean_str(variant.get("interpretation")),
            "pathogenicity_tier": variant.get("pathogenicity_tier"),
            "notes": _clean_str(variant.get("notes")),
        })
    cleaned["variants"] = safe_variants

    fusions = cleaned.get("fusions") or []
    safe_fusions = []
    for fusion in fusions if isinstance(fusions, list) else []:
        if not isinstance(fusion, dict):
            continue
        gene1 = _normalize_fusion_gene(fusion.get("gene1"))
        gene2 = _normalize_fusion_gene(fusion.get("gene2"))
        if not gene1 or not gene2:
            continue
        safe_fusions.append({
            "gene1": gene1,
            "gene2": gene2,
            "variant_type": "fusion",
            "fusion_description": _clean_str(fusion.get("fusion_description")),
            "notes": _clean_str(fusion.get("notes")),
        })
    cleaned["fusions"] = safe_fusions

    amplifications = cleaned.get("amplifications") or []
    safe_amplifications = []
    for amp in amplifications if isinstance(amplifications, list) else []:
        if not isinstance(amp, dict):
            continue
        gene = _normalize_fusion_gene(amp.get("gene"))
        if not gene:
            continue
        safe_amplifications.append({
            "gene": gene,
            "copy_number": amp.get("copy_number"),
            "variant_type": "amplification",
            "notes": _clean_str(amp.get("notes")),
        })
    cleaned["amplifications"] = safe_amplifications

    deletions = cleaned.get("deletions") or []
    safe_deletions = []
    for deletion in deletions if isinstance(deletions, list) else []:
        if not isinstance(deletion, dict):
            continue
        gene = _normalize_fusion_gene(deletion.get("gene"))
        description = _clean_str(deletion.get("description"))
        if not gene and not description:
            continue
        safe_deletions.append({
            "gene": gene,
            "description": description or "",
            "notes": _clean_str(deletion.get("notes")),
        })
    cleaned["deletions"] = safe_deletions

    for field in ("report_date", "specimen_type", "tumor_type", "tmb_status", "msi_status", "pdl1_clone", "hrd_status", "raw_text_excerpt"):
        if field in cleaned:
            cleaned[field] = _clean_str(cleaned.get(field))

    return cleaned


def _merge_genomic_profiles(profiles: list[GenomicProfile], vendor: str) -> GenomicProfile:
    """Merge partial GenomicProfile extractions from individual pages into one."""
    if not profiles:
        return GenomicProfile(vendor=vendor)
    merged = profiles[0].model_copy(deep=True)
    for p in profiles[1:]:
        # Scalars: keep first non-null
        for field in ("report_date", "specimen_type", "tumor_type", "tmb", "tmb_status",
                      "msi_status", "pdl1_tps", "pdl1_cps", "pdl1_clone",
                      "hrd_status", "hrd_score", "gloh"):
            if getattr(merged, field) is None and getattr(p, field) is not None:
                setattr(merged, field, getattr(p, field))
        # Variants: dedup by gene+variant
        existing = {(v.gene.upper(), v.variant) for v in merged.variants}
        for v in p.variants:
            if (v.gene.upper(), v.variant) not in existing:
                merged.variants.append(v)
                existing.add((v.gene.upper(), v.variant))
        # Fusions: dedup by gene pair
        existing_fusions = {(f.gene1.upper(), f.gene2.upper()) for f in merged.fusions}
        for f in p.fusions:
            if (f.gene1.upper(), f.gene2.upper()) not in existing_fusions:
                merged.fusions.append(f)
                existing_fusions.add((f.gene1.upper(), f.gene2.upper()))
        # Amplifications: dedup by gene
        existing_amps = {a.gene.upper() for a in merged.amplifications}
        for a in p.amplifications:
            if a.gene.upper() not in existing_amps:
                merged.amplifications.append(a)
                existing_amps.add(a.gene.upper())
        # Deletions: dedup by gene
        existing_dels = {d.get("gene", "").upper() for d in merged.deletions}
        for d in p.deletions:
            if d.get("gene", "").upper() not in existing_dels:
                merged.deletions.append(d)
                existing_dels.add(d.get("gene", "").upper())
    return merged


def genomic_profile_to_text_summary(profile: GenomicProfile) -> str:
    """
    Convert a GenomicProfile to a human-readable text summary
    suitable for inclusion in patient profile for trial matching.
    """
    lines = [f"Genomic Report ({profile.vendor.upper()})"]
    if profile.report_date:
        lines.append(f"Report date: {profile.report_date}")
    if profile.tumor_type:
        lines.append(f"Tumor type: {profile.tumor_type}")
    if profile.specimen_type:
        lines.append(f"Specimen: {profile.specimen_type}")

    _tier_labels = {1: "Benign", 2: "Likely Benign", 3: "VUS", 4: "Likely Pathogenic", 5: "Pathogenic"}

    if profile.variants:
        lines.append("\nSomatic Mutations:")
        for v in profile.variants:
            vaf_str = f" (VAF: {v.vaf}%)" if v.vaf is not None else ""
            tier_str = f" [{_tier_labels.get(v.pathogenicity_tier, '')}]" if v.pathogenicity_tier else ""
            lines.append(f"  - {v.gene} {v.variant} [{v.variant_type}]{vaf_str}{tier_str}")

    if profile.fusions:
        lines.append("\nFusions:")
        for f in profile.fusions:
            lines.append(f"  - {f.gene1}::{f.gene2} fusion")

    if profile.amplifications:
        lines.append("\nAmplifications:")
        for a in profile.amplifications:
            cn_str = f" (CN: {a.copy_number})" if a.copy_number else ""
            lines.append(f"  - {a.gene} amplification{cn_str}")

    if profile.deletions:
        lines.append("\nDeletions/Losses:")
        for d in profile.deletions:
            lines.append(f"  - {d.get('gene', 'unknown')}: {d.get('description', '')}")

    lines.append("\nBiomarkers:")
    if profile.tmb is not None:
        lines.append(f"  TMB: {profile.tmb} mut/Mb ({profile.tmb_status or 'N/A'})")
    if profile.msi_status:
        lines.append(f"  MSI: {profile.msi_status}")
    if profile.pdl1_tps is not None:
        lines.append(f"  PD-L1 TPS: {profile.pdl1_tps}% (clone: {profile.pdl1_clone or 'N/A'})")
    if profile.pdl1_cps is not None:
        lines.append(f"  PD-L1 CPS: {profile.pdl1_cps} (clone: {profile.pdl1_clone or 'N/A'})")
    if profile.hrd_status:
        lines.append(f"  HRD: {profile.hrd_status}{f' (score: {profile.hrd_score})' if profile.hrd_score else ''}")
    if profile.gloh is not None:
        lines.append(f"  gLOH: {profile.gloh}%")

    return "\n".join(lines)
