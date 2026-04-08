"""
LLM-based clinical note extractor.
Extracts structured oncology patient data from clinical notes, following
mCODE (minimal Common Oncology Data Elements) FHIR profiles.
Uses agentic multi-step approach per HARMON-E architecture (F1=0.93).
"""

import logging
import re
from pathlib import Path
from typing import Optional

import anthropic
from pydantic import BaseModel, Field
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

import config
from src.extraction.pdf_extractor import extract_text_from_pdf
from src.llm_client import LLMClient
from src.utils import extract_json

logger = logging.getLogger(__name__)


# ── mCODE-aligned patient profile schema ───────────────────────────────────

class PriorTherapy(BaseModel):
    regimen: str = Field(description="Drug name(s) or regimen name")
    start_date: Optional[str] = Field(None, description="Approximate start date")
    end_date: Optional[str] = Field(None, description="Approximate end date")
    line: Optional[int] = Field(None, description="Line of therapy (1=first-line, etc.)")
    response: Optional[str] = Field(None, description="PR/CR/SD/PD/NE")
    discontinuation_reason: Optional[str] = Field(None, description="Why stopped: progression/toxicity/completion/other")
    setting: Optional[str] = Field(None, description="adjuvant/neoadjuvant/metastatic/etc.")


class LabValue(BaseModel):
    name: str
    value: str
    unit: Optional[str] = None
    date: Optional[str] = None
    normal: Optional[bool] = None


class ClinicalProfile(BaseModel):
    # Demographics
    age: Optional[int] = None
    sex: Optional[str] = Field(None, description="Male/Female/Other")
    ecog_ps: Optional[int] = Field(None, description="ECOG performance status 0-4")

    # Diagnosis
    cancer_type: Optional[str] = Field(None, description="Primary cancer type (e.g. non-small cell lung cancer)")
    histology: Optional[str] = Field(None, description="Histologic subtype (e.g. adenocarcinoma)")
    stage: Optional[str] = Field(None, description="TNM stage at current presentation")
    diagnosis_date: Optional[str] = Field(None, description="Date of initial diagnosis")

    # Metastatic disease
    is_metastatic: Optional[bool] = None
    metastatic_sites: list[str] = Field(default_factory=list, description="Sites of metastatic disease")

    # Prior therapies (chronological order)
    prior_therapies: list[PriorTherapy] = Field(default_factory=list)

    # Organ function / labs
    labs: list[LabValue] = Field(default_factory=list, description="Relevant recent lab values")

    # Comorbidities
    comorbidities: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)

    # Other relevant clinical info
    current_medications: list[str] = Field(default_factory=list)
    recent_procedures: list[str] = Field(default_factory=list)
    smoking_status: Optional[str] = Field(None, description="Never/Former/Current smoker")
    brain_metastases: Optional[bool] = None
    leptomeningeal_disease: Optional[bool] = None
    autoimmune_conditions: list[str] = Field(default_factory=list, description="Relevant for IO eligibility")

    # Free-text clinical summary (for matching)
    clinical_summary: str = Field(default="", description="Concise narrative summary for trial matching")


# ── Main extraction function ────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an expert oncology data abstractor extracting structured patient information
from clinical notes for a Molecular Tumor Board (MTB) case review.

Rules:
- Extract ONLY information explicitly stated in the notes. Never infer or assume.
- Use null for missing information (do NOT guess)
- For dates, use YYYY-MM-DD format when the full date is available, or "YYYY-MM" or "YYYY" for partial dates
- For ECOG PS, extract the most recently documented score
- For lab values, extract the most recent results, noting the date
- List ALL prior lines of therapy in chronological order
- For clinical_summary: write a 3-5 sentence narrative summary covering diagnosis, genomics, prior treatments, and current status
"""

_USER_PROMPT_TEMPLATE = """\
Extract structured patient data from these clinical notes and return a JSON object:

{{
  "age": null or integer,
  "sex": null or "Male"/"Female"/"Other",
  "ecog_ps": null or 0-4,
  "cancer_type": null or "full cancer type name",
  "histology": null or "histologic subtype",
  "stage": null or "stage string",
  "diagnosis_date": null or "date",
  "is_metastatic": null or true/false,
  "metastatic_sites": ["site1", "site2"],
  "prior_therapies": [
    {{
      "regimen": "drug/regimen name",
      "start_date": null or "date",
      "end_date": null or "date",
      "line": null or integer,
      "response": null or "PR/CR/SD/PD/NE",
      "discontinuation_reason": null or "reason",
      "setting": null or "adjuvant/metastatic/etc."
    }}
  ],
  "labs": [
    {{"name": "lab name", "value": "value", "unit": "unit or null", "date": "date or null", "normal": null or true/false}}
  ],
  "comorbidities": ["condition1", "condition2"],
  "allergies": ["allergy1"],
  "current_medications": ["med1", "med2"],
  "recent_procedures": ["procedure1"],
  "smoking_status": null or "Never/Former/Current",
  "brain_metastases": null or true/false,
  "leptomeningeal_disease": null or true/false,
  "autoimmune_conditions": ["condition1"],
  "clinical_summary": "3-5 sentence narrative summary"
}}

{context_line}

CLINICAL NOTES:
{text}
"""


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(min=2, max=10),
    retry=retry_if_not_exception_type(anthropic.BadRequestError),
)
def parse_clinical_notes(
    note_paths: list[str | Path],
    context: str = "",
    progress_callback=None,
) -> ClinicalProfile:
    """
    Extract a structured patient profile from one or more clinical notes.

    In local LLM mode, processes each page individually (to stay within the model's
    context window) and merges the results. In cloud mode, sends the full text in one call.
    """
    def _cb(msg):
        if progress_callback:
            progress_callback(msg)

    _cb("Stage 1: PDF text loaded — preparing clinical notes for AI analysis")
    combined_text = _load_notes(note_paths)
    context_line = f"Additional context: {context}" if context else ""
    client = LLMClient()

    if config.USE_LOCAL_LLM:
        pages = _split_into_page_chunks(combined_text, config.LOCAL_LLM_MAX_TEXT_CHARS)
        profiles: list[ClinicalProfile] = []
        for i, page_text in enumerate(pages):
            _cb(f"Stage 1: AI reading clinical notes — page {i + 1}/{len(pages)}")
            try:
                prompt = _USER_PROMPT_TEMPLATE.format(context_line=context_line, text=page_text)
                response = client.messages.create(
                    model=config.LOCAL_LLM_MODEL,
                    max_tokens=config.LOCAL_LLM_RESPONSE_TOKENS,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": prompt}],
                )
                raw_json = _sanitize_clinical_payload(extract_json(response.content[0].text))
                profiles.append(ClinicalProfile.model_validate(raw_json))
            except Exception as e:
                logger.warning(f"Page {i + 1} extraction failed: {e}")
        _cb("Stage 1: Clinical note analysis complete — merging page results")
        return _merge_clinical_profiles(profiles)
    else:
        prompt = _USER_PROMPT_TEMPLATE.format(
            context_line=context_line,
            text=combined_text[:30000],
        )
        _cb("Stage 1: AI reading clinical notes — extracting diagnoses, prior therapies, lab values")
        response = client.messages.create(
            model=config.CLAUDE_MODEL,
            max_tokens=4096,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        _cb("Stage 1: Clinical note analysis complete — parsing structured fields")
        raw_json = _sanitize_clinical_payload(extract_json(response.content[0].text))
        return ClinicalProfile.model_validate(raw_json)


def _split_into_page_chunks(text: str, max_chars: int) -> list[str]:
    """
    Split OCR text on '--- Page N ---' markers into chunks that each fit within max_chars.
    Adjacent pages are grouped together when they fit. Guarantees at least one chunk.
    """
    pages = [p.strip() for p in re.split(r"--- Page \d+ ---", text) if p.strip()]
    if not pages:
        # No page markers — fall back to character-based splitting
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


def _sanitize_clinical_payload(raw_json: dict | list) -> dict:
    """Make local-model clinical JSON tolerant of nulls in required string fields."""
    if not isinstance(raw_json, dict):
        return {}

    cleaned = dict(raw_json)
    for field in (
        "metastatic_sites", "comorbidities", "allergies", "current_medications",
        "recent_procedures", "autoimmune_conditions"
    ):
        values = cleaned.get(field) or []
        if not isinstance(values, list):
            values = [values]
        cleaned[field] = [v for item in values if (v := _clean_str(item))]

    prior_therapies = cleaned.get("prior_therapies") or []
    safe_therapies = []
    for therapy in prior_therapies if isinstance(prior_therapies, list) else []:
        if not isinstance(therapy, dict):
            continue
        regimen = _clean_str(therapy.get("regimen"))
        if not regimen:
            continue
        safe_therapies.append({
            "regimen": regimen,
            "start_date": _clean_str(therapy.get("start_date")),
            "end_date": _clean_str(therapy.get("end_date")),
            "line": therapy.get("line"),
            "response": _clean_str(therapy.get("response")),
            "discontinuation_reason": _clean_str(therapy.get("discontinuation_reason")),
            "setting": _clean_str(therapy.get("setting")),
        })
    cleaned["prior_therapies"] = safe_therapies

    labs = cleaned.get("labs") or []
    safe_labs = []
    for lab in labs if isinstance(labs, list) else []:
        if not isinstance(lab, dict):
            continue
        name = _clean_str(lab.get("name"))
        value = _clean_str(lab.get("value"))
        if not name or not value:
            continue
        safe_labs.append({
            "name": name,
            "value": value,
            "unit": _clean_str(lab.get("unit")),
            "date": _clean_str(lab.get("date")),
            "normal": lab.get("normal"),
        })
    cleaned["labs"] = safe_labs

    for field in ("sex", "cancer_type", "histology", "stage", "diagnosis_date", "smoking_status", "clinical_summary"):
        if field in cleaned:
            cleaned[field] = _clean_str(cleaned.get(field)) or ("" if field == "clinical_summary" else None)

    return cleaned


def _merge_clinical_profiles(profiles: list[ClinicalProfile]) -> ClinicalProfile:
    """Merge partial ClinicalProfile extractions from individual pages into one."""
    if not profiles:
        return ClinicalProfile()
    merged = profiles[0].model_copy(deep=True)
    for p in profiles[1:]:
        # Scalars: keep first non-null value
        for field in ("age", "sex", "ecog_ps", "cancer_type", "histology", "stage",
                      "diagnosis_date", "is_metastatic", "smoking_status",
                      "brain_metastases", "leptomeningeal_disease"):
            if getattr(merged, field) is None and getattr(p, field) is not None:
                setattr(merged, field, getattr(p, field))
        # Simple string lists: union (case-insensitive dedup)
        for field in ("metastatic_sites", "comorbidities", "allergies",
                      "current_medications", "recent_procedures", "autoimmune_conditions"):
            existing = {x.lower() for x in (getattr(merged, field) or [])}
            for item in (getattr(p, field) or []):
                if item.lower() not in existing:
                    getattr(merged, field).append(item)
                    existing.add(item.lower())
        # Prior therapies: dedup by regimen name
        existing_regimens = {t.regimen.lower() for t in merged.prior_therapies}
        for t in p.prior_therapies:
            if t.regimen.lower() not in existing_regimens:
                merged.prior_therapies.append(t)
                existing_regimens.add(t.regimen.lower())
        # Labs: dedup by lab name
        existing_labs = {lab.name.lower() for lab in merged.labs}
        for lab in p.labs:
            if lab.name.lower() not in existing_labs:
                merged.labs.append(lab)
                existing_labs.add(lab.name.lower())
        # Clinical summary: keep the longest
        if p.clinical_summary and len(p.clinical_summary) > len(merged.clinical_summary):
            merged.clinical_summary = p.clinical_summary
    return merged


def _load_notes(paths: list[str | Path]) -> str:
    """Load and concatenate text from multiple note files (PDF or TXT)."""
    texts = []
    for path in paths:
        path = Path(path)
        if not path.exists():
            logger.warning(f"Note file not found: {path}")
            continue
        if path.suffix.lower() == ".pdf":
            texts.append(f"=== {path.name} ===\n{extract_text_from_pdf(path)}")
        else:
            texts.append(f"=== {path.name} ===\n{path.read_text(encoding='utf-8', errors='ignore')}")
    return "\n\n".join(texts)


def clinical_profile_to_text_summary(profile: ClinicalProfile) -> str:
    """
    Generate a text summary of the clinical profile for trial matching.
    Returns the clinical_summary if set, otherwise builds one from structured data.
    """
    if profile.clinical_summary:
        return profile.clinical_summary

    parts = []
    if profile.age and profile.sex:
        parts.append(f"{profile.age}-year-old {profile.sex.lower()}")
    if profile.cancer_type:
        stage_str = f", {profile.stage}" if profile.stage else ""
        parts.append(f"with {profile.cancer_type}{stage_str}")
    if profile.histology:
        parts.append(f"({profile.histology})")
    if profile.ecog_ps is not None:
        parts.append(f"ECOG PS {profile.ecog_ps}")
    if profile.metastatic_sites:
        parts.append(f"metastatic to {', '.join(profile.metastatic_sites)}")

    therapy_str = ""
    if profile.prior_therapies:
        regimens = [t.regimen for t in profile.prior_therapies]
        therapy_str = f"Prior therapies: {'; '.join(regimens)}."

    comorbidity_str = ""
    if profile.comorbidities:
        comorbidity_str = f"Comorbidities: {', '.join(profile.comorbidities)}."

    summary = " ".join(parts) + "."
    if therapy_str:
        summary += f" {therapy_str}"
    if comorbidity_str:
        summary += f" {comorbidity_str}"

    return summary
