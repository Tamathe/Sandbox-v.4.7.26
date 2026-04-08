"""
UK Markey Cancer Center - AI-Powered Clinical Trial Matcher
Streamlit web application for the Molecular Tumor Board.

Five-stage pipeline:
  1. Patient profile extraction (clinical notes + genomic PDFs)
  2. Trial retrieval (ClinicalTrials.gov v2 API + hybrid search)
  3. Criterion-by-criterion matching (Claude)
  4. Trial ranking (eligibility + OncoKB + site availability)
  5. Explainable MTB report
"""

import json
import logging
import os
import shutil
import sys
import tempfile
import threading
import uuid
from pathlib import Path

import pandas as pd
import streamlit as st

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

sys.path.insert(0, str(Path(__file__).parent))

from src.pipeline import run_pipeline  # noqa: E402

st.set_page_config(
    page_title="Markey Cancer Center | Clinical Trial Matcher",
    page_icon="🔬",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS (only for elements config.toml can't reach) ───────────────────
st.markdown("""
<style>
/* Tighten top padding */
.main .block-container { padding-top: 0.75rem; max-width: 1400px; }

/* ── Branded page header banner ── */
.uk-header {
    background: linear-gradient(135deg, #002855 0%, #003F7F 60%, #005EB8 100%);
    color: white;
    padding: 18px 28px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    border-left: 6px solid #C7A900;
    box-shadow: 0 3px 14px rgba(0,40,85,0.22);
}
.uk-logo-box {
    background: white;
    color: #003F7F;
    font-size: 24px;
    font-weight: 900;
    width: 52px;
    height: 52px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: -2px;
    flex-shrink: 0;
    font-family: Georgia, serif;
    border: 2px solid #C7A900;
}
.uk-header-text { flex: 1; }
.uk-header-title {
    font-size: 21px;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
}
.uk-header-sub {
    font-size: 12px;
    opacity: 0.80;
    margin: 4px 0 0 0;
    letter-spacing: 0.6px;
    text-transform: uppercase;
}
.uk-header-badge {
    background: #C7A900;
    color: #002855;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    white-space: nowrap;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

/* ── Section headers inside tabs ── */
.section-header {
    background: linear-gradient(90deg, #003F7F, #0058A0);
    color: white;
    padding: 9px 16px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 15px;
    font-weight: 600;
    border-left: 4px solid #C7A900;
}

/* ── Eligibility pill badges ── */
.eligible-badge        { background:#1A7A40; color:white; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; }
.likely-eligible-badge { background:#2E9E5B; color:white; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; }
.uncertain-badge       { background:#C7A900; color:#002855; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; }
.ineligible-badge      { background:#C0392B; color:white; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:700; }

/* ── Markey site pill ── */
.markey-badge {
    background: #003F7F; color: white;
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
    border: 1px solid #C7A900;
}

/* ── Case history cards ── */
.case-card {
    border: 1px solid #dde3ec;
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 10px;
    background: #f8fafd;
    border-left: 4px solid #003F7F;
}
.case-card-active {
    border-left: 4px solid #C7A900;
    background: #fffdf0;
}
</style>
""", unsafe_allow_html=True)

if "pipeline_result" not in st.session_state:
    st.session_state.pipeline_result = None
if "active_case_id" not in st.session_state:
    st.session_state.active_case_id = None
if "draft_case_id" not in st.session_state:
    st.session_state.draft_case_id = f"MTB-{uuid.uuid4().hex[:8].upper()}"


# ── Shared case-loading logic ─────────────────────────────────────────────────

def load_case_from_json(case_id: str) -> bool:
    """
    Load a previously saved case from output/<case_id>/match_report.json.
    Populates st.session_state.pipeline_result.
    Returns True on success, False on error (also calls st.error).
    """
    import config as _cfg
    output_root = Path(_cfg.OUTPUT_DIR)
    report_path = output_root / case_id / "match_report.json"
    try:
        from src.pipeline import PipelineResult
        from src.extraction.patient_profile import PatientCase
        from src.extraction.clinical_note_parser import ClinicalProfile
        from src.extraction.genomic_parser import GenomicProfile
        from src.retrieval.trial_fetcher import ClinicalTrial, TrialLocation
        from src.matching.criterion_matcher import TrialMatchResult
        from src.matching.trial_ranker import RankedTrial

        saved = json.loads(report_path.read_text(encoding="utf-8"))
        profile_path = output_root / case_id / "patient_profile.json"
        case = PatientCase(case_id=case_id)
        if profile_path.exists():
            profile_data = json.loads(profile_path.read_text(encoding="utf-8"))
            case = PatientCase(
                case_id=profile_data.get("case_id", case_id),
                clinical=ClinicalProfile.model_validate(profile_data["clinical"])
                if profile_data.get("clinical") else None,
                genomics=[
                    GenomicProfile.model_validate(g)
                    for g in profile_data.get("genomics", [])
                ],
            )

        stub = PipelineResult(case=case)
        stub.json_report = saved
        txt_path = output_root / case_id / "match_report.txt"
        stub.text_report = txt_path.read_text(encoding="utf-8") if txt_path.exists() else ""

        def _make_ranked(t, at_markey=True, locations=None):
            trial_stub = ClinicalTrial(
                nct_id=t["nct_id"],
                title=t.get("title", ""),
                brief_title=t.get("title", ""),
                status=t.get("status", ""),
                phase=t.get("phase"),
                sponsor=t.get("sponsor"),
                locations=locations or [],
                url=t.get("url", f"https://clinicaltrials.gov/study/{t['nct_id']}"),
            )
            match_stub = TrialMatchResult(
                nct_id=t["nct_id"],
                trial_title=t.get("title", ""),
                overall_eligibility=t.get("overall_eligibility", "uncertain"),
                eligibility_score=t.get("eligibility_score", 0),
                relevance_score=t.get("relevance_score", 0),
                summary=t.get("summary", ""),
                hard_exclusions=t.get("hard_exclusions", []),
                key_inclusions_met=t.get("key_inclusions_met", []),
                uncertain_criteria=t.get("uncertain_criteria", []),
            )
            return RankedTrial(
                trial=trial_stub,
                match_result=match_stub,
                composite_score=t.get("composite_score", 0.0),
                at_markey=at_markey,
                rank=t.get("rank", 0),
            )

        stub.ranked_trials = [_make_ranked(t, at_markey=t.get("at_markey", False))
                              for t in saved.get("trials", [])]
        stub.referral_trials = [
            _make_ranked(
                t,
                at_markey=False,
                locations=[
                    TrialLocation.model_validate(site)
                    for site in t.get("us_sites", [])
                ],
            )
            for t in saved.get("referral_trials", [])
        ]

        st.session_state.pipeline_result = stub
        st.session_state.active_case_id = case_id
        return True
    except Exception as ex:
        st.error(f"Could not load case {case_id}: {ex}")
        logger.exception(f"Case load error: {case_id}")
        return False


def get_saved_cases() -> list[dict]:
    """
    Scan output/ for saved cases and return metadata list (newest first).
    Each dict: case_id, generated_at, key_biomarkers, top_trial, total_trials, has_referral.
    """
    import config as _cfg
    output_root = Path(_cfg.OUTPUT_DIR)
    if not output_root.exists():
        return []

    cases = []
    for d in sorted(output_root.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not d.is_dir():
            continue
        report_path = d / "match_report.json"
        if not report_path.exists():
            continue
        try:
            saved = json.loads(report_path.read_text(encoding="utf-8"))
            top = saved.get("trials", [{}])[0] if saved.get("trials") else {}
            cases.append({
                "case_id": saved.get("case_id", d.name),
                "generated_at": saved.get("generated_at", "")[:19].replace("T", " "),
                "key_biomarkers": saved.get("key_biomarkers", []),
                "total_trials": saved.get("total_trials_evaluated", len(saved.get("trials", []))),
                "top_nct": top.get("nct_id", ""),
                "top_title": (top.get("title") or "")[:55],
                "top_eligibility": top.get("overall_eligibility", ""),
                "top_score": top.get("composite_score", 0),
                "has_referral": len(saved.get("referral_trials", [])) > 0,
                "referral_count": len(saved.get("referral_trials", [])),
                "eligible_count": sum(
                    1 for t in saved.get("trials", [])
                    if t.get("overall_eligibility") in ("eligible", "likely_eligible")
                ),
            })
        except Exception:
            pass
    return cases


def delete_case(case_id: str) -> bool:
    """Delete the output folder for a case. Returns True on success."""
    import config as _cfg
    output_root = Path(_cfg.OUTPUT_DIR)
    case_dir = output_root / case_id
    try:
        shutil.rmtree(case_dir)
        if st.session_state.active_case_id == case_id:
            st.session_state.pipeline_result = None
            st.session_state.active_case_id = None
        return True
    except Exception as ex:
        st.error(f"Could not delete case {case_id}: {ex}")
        return False


# ── Helper functions (defined before UI renders them) ─────────────────────────

def run_pipeline_ui(
    case_id, clinical_files, genomic_files, additional_context,
    max_retrieved, max_detailed, max_workers, api_key, oncokb_token,
    use_local=False, local_url="", local_model="", cloud_for_matching=False,
    pasted_clinical_note="",
    progress_bar=None, stage_text=None,
):
    import config as cfg
    cfg.USE_LOCAL_LLM = use_local
    cfg.LOCAL_EXTRACTION_ONLY = use_local and cloud_for_matching
    cfg.LOCAL_LLM_BASE_URL = local_url
    cfg.LOCAL_LLM_MODEL = local_model
    if api_key:
        cfg.ANTHROPIC_API_KEY = api_key
        os.environ["ANTHROPIC_API_KEY"] = api_key
    if oncokb_token:
        cfg.ONCOKB_TOKEN = oncokb_token
        os.environ["ONCOKB_TOKEN"] = oncokb_token

    tmp_dir = tempfile.mkdtemp()
    clinical_paths, genomic_paths = [], []

    # Pasted text from Epic — save as a plain-text clinical note
    if pasted_clinical_note and pasted_clinical_note.strip():
        txt_path = Path(tmp_dir) / "clinical_note_pasted.txt"
        txt_path.write_text(pasted_clinical_note, encoding="utf-8")
        clinical_paths.append(txt_path)

    for f in (clinical_files or []):
        f.seek(0)
        p = Path(tmp_dir) / f.name
        p.write_bytes(f.read())
        clinical_paths.append(p)

    for f in (genomic_files or []):
        f.seek(0)
        p = Path(tmp_dir) / f.name
        p.write_bytes(f.read())
        genomic_paths.append(p)

    _owns_progress = progress_bar is None
    if _owns_progress:
        progress_bar = st.progress(0)
        stage_text = st.empty()

    STAGE_DISPLAY = [
        ("Stage 1: Reading clinical notes",            5,  "📄", "Reading clinical notes..."),
        ("Stage 1: Reading genomic reports",           8,  "🧬", "Reading genomic reports (Caris / Guardant / Tempus)..."),
        ("Stage 1: PDF text loaded",                  11,  "📑", "PDF text extracted — preparing documents for AI analysis..."),
        ("Stage 1: Extracting patient data",          13,  "🤖", "Starting AI extraction of patient data..."),
        ("Stage 1: OCR scanning",                     14,  "🖼️", "Scanned PDF detected — using AI Vision to read the document pages..."),
        ("Stage 1: AI reading clinical notes",        15,  "🧠", "AI reading clinical notes — extracting diagnoses, therapies, lab values..."),
        ("Stage 1: Clinical note analysis complete",  17,  "✓",  "Clinical notes analyzed — structured data extracted successfully..."),
        ("Stage 1: Genomic report",                   13,  "📋", None),
        ("Stage 1: AI analyzing",                     16,  "🧬", None),
        ("Stage 1: Genomic variants identified",      18,  "🔬", "Genomic variants extracted — mutations, fusions, TMB, MSI catalogued..."),
        ("Stage 1: Patient profile complete",         20,  "👤", "Patient profile built — key biomarkers identified for trial search..."),
        ("Stage 2: Searching ClinicalTrials.gov",     23,  "🔍", "Searching ClinicalTrials.gov for open, recruiting trials near Lexington, KY..."),
        ("Stage 2: Found",                            28,  "🎯", None),
        ("Stage 2: Ranking trials by relevance",      30,  "📊", "Re-ranking trials by relevance to this patient's specific biomarkers..."),
        ("Stage 3",                                   35,  "🔬", "Evaluating eligibility criteria trial by trial with AI..."),
        ("Stage 4: Querying OncoKB",                  85,  "💊", "Querying OncoKB database for variant actionability evidence levels..."),
        ("Stage 4: Computing composite scores",       88,  "🏆", "Computing final scores — eligibility, biomarker evidence, site, phase..."),
        ("Stage 5: Generating MTB report",            93,  "📋", "Generating the Molecular Tumor Board match report..."),
        ("Complete",                                 100,  "✅", "Analysis complete!"),
    ]

    def on_progress(stage, done=0, total=0):
        if threading.current_thread() is not threading.main_thread():
            return
        if "Stage 3" in stage and total > 0 and done > 0:
            pct = int(35 + (done / total) * 50)
            progress_bar.progress(min(pct, 85))
            stage_text.info(
                f"🔬 **Evaluating eligibility criteria** — "
                f"reviewed **{done}** of **{total}** trials with AI  "
                f"*(if this pauses, the API is rate-limiting and will auto-retry)*"
            )
            return
        for key, pct, icon, msg in STAGE_DISPLAY:
            if key in stage:
                progress_bar.progress(pct)
                if msg is None:
                    display = stage.replace("Stage 1: ", "").replace("Stage 2: ", "")
                    stage_text.info(f"{icon} {display}")
                else:
                    stage_text.info(f"{icon} {msg}")
                return
        stage_text.info(f"⏳ {stage}...")

    try:
        result = run_pipeline(
            case_id=case_id,
            clinical_note_paths=clinical_paths,
            genomic_report_paths=genomic_paths,
            additional_context=additional_context,
            max_retrieved_trials=max_retrieved,
            max_detailed_trials=max_detailed,
            max_matching_workers=max_workers,
            save_outputs=True,
            progress_callback=on_progress,
        )
        st.session_state.pipeline_result = result
        st.session_state.active_case_id = case_id
        progress_bar.progress(100)
        stage_text.markdown("**Pipeline complete!**")
        for err in result.errors:
            st.warning(f"Warning: {err}")
        top = result.ranked_trials[0].nct_id if result.ranked_trials else "None"
        st.success(
            f"Matched {len(result.ranked_trials)} trials. Top match: {top}. "
            f"Switch to the **MTB Report** tab to view results."
        )
        return result
    except Exception as e:
        st.error(f"Pipeline failed: {e}")
        logger.exception("Pipeline error")
        return None
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# ── Batch helpers ─────────────────────────────────────────────────────────────

# Filename keywords that identify a PDF as a genomic report
_GENOMIC_KEYWORDS = {
    "caris", "guardant", "tempus", "foundation", "foundationone",
    "ngs", "genomic", "molecular", "sequencing", "somatic", "nextseq",
}


def _is_genomic_pdf(filename: str) -> bool:
    name = filename.lower()
    return any(kw in name for kw in _GENOMIC_KEYWORDS)


def scan_batch_folder(folder_path: str) -> list[dict]:
    """
    Scan a folder for case subfolders and auto-classify PDFs.

    Supports both flat structures (all PDFs in subfolders) and the Markey
    convention of subfolder/Input/ (if an Input/ directory exists, it is used).

    Returns a list of dicts per case:
        folder_name, case_id (suggested), clinical_pdfs, genomic_pdfs, txt_files
    """
    root = Path(folder_path)
    if not root.exists() or not root.is_dir():
        return []

    subdirs = sorted([d for d in root.iterdir() if d.is_dir()])

    # No subdirectories — treat root itself as a single case
    if not subdirs:
        subdirs = [root]

    cases = []
    for subdir in subdirs:
        # Use Input/ subfolder if present (Markey batch convention)
        input_dir = subdir / "Input"
        scan_dir = input_dir if input_dir.exists() else subdir

        pdfs = sorted(scan_dir.glob("*.pdf"))
        txts = sorted(scan_dir.glob("*.txt"))

        clinical_pdfs = [p for p in pdfs if not _is_genomic_pdf(p.name)]
        genomic_pdfs  = [p for p in pdfs if _is_genomic_pdf(p.name)]

        if not pdfs and not txts:
            continue

        raw_name = subdir.name if subdir != root else root.name
        safe_name = "".join(c if c.isalnum() or c in "-_" else "-" for c in raw_name).strip("-")
        suggested_id = f"MTB-{safe_name}" if not safe_name.upper().startswith("MTB") else safe_name

        cases.append({
            "folder":       str(subdir),
            "folder_name":  subdir.name,
            "case_id":      suggested_id,
            "clinical_pdfs": [str(p) for p in clinical_pdfs],
            "genomic_pdfs":  [str(p) for p in genomic_pdfs],
            "txt_files":     [str(p) for p in txts],
            "total_files":   len(pdfs) + len(txts),
        })

    return cases


def render_criterion_details(result):
    icon_map = {
        "included": ("MET", "green"),
        "not_included": ("NOT MET", "red"),
        "excluded": ("EXCLUDED", "red"),
        "not_excluded": ("CLEAR", "green"),
        "not_enough_information": ("NEEDS REVIEW", "orange"),
        "not_applicable": ("N/A", "gray"),
    }
    if result.inclusion_assessments:
        st.markdown("**--- Inclusion Criteria ---**")
        for a in result.inclusion_assessments:
            label, color = icon_map.get(a.label, ("?", "gray"))
            st.markdown(
                f'<span style="color:{color};font-weight:bold">[{label}]</span> '
                f'*{a.criterion_text[:120]}*',
                unsafe_allow_html=True,
            )
            st.markdown(f"&nbsp;&nbsp;{a.explanation[:250]}")
            if a.source_citations:
                st.markdown(f'&nbsp;&nbsp;*Source: "{a.source_citations[0][:120]}"*')

    if result.exclusion_assessments:
        st.markdown("**--- Exclusion Criteria ---**")
        for a in result.exclusion_assessments:
            label, color = icon_map.get(a.label, ("?", "gray"))
            st.markdown(
                f'<span style="color:{color};font-weight:bold">[{label}]</span> '
                f'*{a.criterion_text[:120]}*',
                unsafe_allow_html=True,
            )
            st.markdown(f"&nbsp;&nbsp;{a.explanation[:250]}")


def render_trial_card(rt):
    result = rt.match_result
    badge_class = {
        "eligible": "eligible-badge",
        "likely_eligible": "likely-eligible-badge",
        "uncertain": "uncertain-badge",
        "likely_ineligible": "ineligible-badge",
        "ineligible": "ineligible-badge",
    }.get(result.overall_eligibility, "uncertain-badge")

    markey_str = '<span class="markey-badge">UK MARKEY</span> ' if rt.at_markey else ""
    oncokb_str = ""
    if rt.oncokb_annotations:
        ev = rt.oncokb_annotations[0].evidence_level or ""
        oncokb_str = f'<span style="color:#8B4513;font-size:11px">OncoKB: {ev}</span> '

    with st.expander(f"#{rt.rank} {result.trial_title[:70]} [{rt.nct_id}]"):
        st.markdown(
            f'<span class="{badge_class}">{rt.display_eligibility}</span> '
            f'{markey_str}{oncokb_str}',
            unsafe_allow_html=True,
        )
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Eligibility Score", f"{result.eligibility_score}/100")
        c2.metric("Composite Score", f"{rt.composite_score:.1f}/100")
        c3.metric("Phase", rt.trial.phase or "N/A")
        c4.metric("Status", (rt.trial.status or "N/A")[:15])

        st.markdown(f"**Summary:** {result.summary}")
        st.markdown(f"[View on ClinicalTrials.gov]({rt.trial.url})")
        if rt.trial.sponsor:
            st.caption(f"Sponsor: {rt.trial.sponsor}")

        if result.hard_exclusions:
            st.error("**Hard Exclusions:**")
            for e in result.hard_exclusions[:3]:
                st.markdown(f"- {e[:150]}")
        if result.key_inclusions_met:
            st.success("**Key Criteria Met:**")
            for i in result.key_inclusions_met[:5]:
                st.markdown(f"- {i[:150]}")
        if result.uncertain_criteria:
            st.warning("**Needs Coordinator Review:**")
            for u in result.uncertain_criteria[:5]:
                st.markdown(f"- {u[:150]}")

        if st.checkbox("Show criterion-by-criterion breakdown", key=f"details_{rt.nct_id}"):
            render_criterion_details(result)


# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("""
<div style="text-align:center; padding: 12px 0 6px 0;">
  <div style="display:inline-flex; align-items:center; gap:10px; justify-content:center;">
    <div style="background:white; color:#003F7F; font-family:Georgia,serif; font-weight:900;
                font-size:22px; width:46px; height:46px; border-radius:5px;
                display:flex; align-items:center; justify-content:center;
                border:2px solid #C7A900; letter-spacing:-2px;">UK</div>
    <div style="text-align:left; line-height:1.2;">
      <div style="font-size:13px; font-weight:700; letter-spacing:0.3px;">University of Kentucky</div>
      <div style="font-size:11px; opacity:0.8; font-weight:300;">Markey Cancer Center</div>
    </div>
  </div>
  <div style="margin-top:8px; background:#C7A900; color:#002855; font-size:10px; font-weight:700;
              padding:3px 10px; border-radius:20px; display:inline-block; letter-spacing:1px;">
    MOLECULAR TUMOR BOARD
  </div>
</div>
""", unsafe_allow_html=True)
    st.divider()

    if st.session_state.active_case_id:
        st.markdown(
            f'<div style="background:#003F7F;color:white;padding:6px 10px;border-radius:6px;'
            f'font-size:12px;border-left:3px solid #C7A900;">'
            f'📂 <b>Active case:</b><br>{st.session_state.active_case_id}</div>',
            unsafe_allow_html=True,
        )
        st.divider()

    st.markdown("**⚙️ API Configuration**")

    import config as _cfg
    use_local = st.toggle(
        "Use Local LLM (HIPAA mode)",
        value=_cfg.USE_LOCAL_LLM,
        help="Route all AI calls to a local LM Studio / Ollama server. No PHI leaves your machine.",
    )

    if use_local:
        st.markdown(
            '<div style="background:#1A7A40;color:white;padding:6px 10px;border-radius:6px;'
            'font-size:11px;margin-bottom:8px;">🔒 <b>Local mode — PHI stays on-device</b></div>',
            unsafe_allow_html=True,
        )
        local_url = st.text_input(
            "LM Studio URL",
            value=_cfg.LOCAL_LLM_BASE_URL,
            help="LM Studio default: http://localhost:1234/v1",
        )
        local_model = st.text_input(
            "Model name",
            value=_cfg.LOCAL_LLM_MODEL,
            help="Exact model name shown in LM Studio's model picker",
        )
        cloud_for_matching = st.toggle(
            "Cloud AI for matching (recommended)",
            value=_cfg.LOCAL_EXTRACTION_ONLY,
            help=(
                "Extract from PDFs locally (PHI stays on-device), then use Claude for "
                "trial search and criterion matching. Requires an Anthropic API key. "
                "Dramatically improves match quality over local models."
            ),
        )
        if cloud_for_matching:
            st.markdown(
                '<div style="background:#003F7F;color:white;padding:6px 10px;border-radius:6px;'
                'font-size:11px;margin-bottom:6px;">🔀 <b>Hybrid — extract locally, match with Claude</b></div>',
                unsafe_allow_html=True,
            )
            api_key = st.text_input(
                "Anthropic API Key (for matching)",
                value=os.getenv("ANTHROPIC_API_KEY", ""),
                type="password",
                help="Used only for Stages 2-5. No PHI is sent — only structured profile data.",
            )
        else:
            api_key = ""
    else:
        cloud_for_matching = False
        local_url = _cfg.LOCAL_LLM_BASE_URL
        local_model = _cfg.LOCAL_LLM_MODEL
        api_key = st.text_input(
            "Anthropic API Key *",
            value=os.getenv("ANTHROPIC_API_KEY", ""),
            type="password",
            help="Required. Get at console.anthropic.com",
        )

    oncokb_token = st.text_input(
        "OncoKB Token (optional)",
        value=os.getenv("ONCOKB_TOKEN", ""),
        type="password",
        help="Free for academic use at oncokb.org",
    )
    st.divider()
    st.markdown("**🔬 Pipeline Settings**")
    max_retrieved = st.slider("Max trials retrieved", 50, 500, 50, 50,
                              help="Stage 2: from ClinicalTrials.gov")
    max_detailed = st.slider("Max for detailed matching", 10, 100, 10, 5,
                             help="Stage 3: criterion-by-criterion matching")
    max_workers = st.slider("Parallel matching workers", 1, 4, 3, 1,
                            help="Stage 3: parallel trial evaluations. Keep at 2-3 to avoid API rate limits.")
    st.divider()
    if use_local and cloud_for_matching:
        st.markdown(f"""
<div style="font-size:11px; opacity:0.7; line-height:1.8;">
  🔀 Hybrid: extract local, match cloud<br>
  🏠 Extraction: {local_model}<br>
  🤖 Matching: Claude Haiku (Anthropic)<br>
  📍 Lexington, KY · 50-mile radius<br>
  🎯 ~87% criterion accuracy (TrialGPT)
</div>
""", unsafe_allow_html=True)
    elif use_local:
        st.markdown(f"""
<div style="font-size:11px; opacity:0.7; line-height:1.8;">
  🏠 Local LLM ({local_model})<br>
  📍 Lexington, KY · 50-mile radius<br>
  🎯 ~87% criterion accuracy (TrialGPT)<br>
  📄 TrialGPT · Nature Comms 2024
</div>
""", unsafe_allow_html=True)
    else:
        st.markdown("""
<div style="font-size:11px; opacity:0.7; line-height:1.8;">
  🤖 Claude Sonnet 4.6 (Anthropic)<br>
  📍 Lexington, KY · 50-mile radius<br>
  🎯 ~87% criterion accuracy (TrialGPT)<br>
  📄 TrialGPT · Nature Comms 2024
</div>
""", unsafe_allow_html=True)


# ── Main ─────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="uk-header">
  <div class="uk-logo-box">UK</div>
  <div class="uk-header-text">
    <p class="uk-header-title">Clinical Trial Matcher</p>
    <p class="uk-header-sub">Markey Cancer Center &nbsp;·&nbsp; Molecular Tumor Board &nbsp;·&nbsp; AI-Powered Precision Oncology</p>
  </div>
  <div class="uk-header-badge">🔬 AI-Powered</div>
</div>
""", unsafe_allow_html=True)

tab_input, tab_report, tab_profile, tab_results, tab_batch, tab_history = st.tabs([
    "📂  Input",
    "📋  MTB Report",
    "👤  Patient Profile",
    "🔬  Trial Matches",
    "⚡  Batch",
    "📚  History",
])


# ════════════════════════════════════════════════════════════════════════════
# TAB 1: Input
# ════════════════════════════════════════════════════════════════════════════
with tab_input:
    st.markdown('<div class="section-header">📂 &nbsp;Upload Patient Documents</div>', unsafe_allow_html=True)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Clinical Notes**")
        note_input_mode = st.radio(
            "Input method",
            ["Upload PDF", "Paste from Epic"],
            horizontal=True,
            label_visibility="collapsed",
            key="note_input_mode",
        )
        if note_input_mode == "Upload PDF":
            st.caption("Clinical notes, MDM notes, discharge summaries, radiology reports")
            clinical_files = st.file_uploader(
                "Clinical notes", type=["pdf"], accept_multiple_files=True,
                key="clinical_notes", label_visibility="collapsed",
            )
            pasted_clinical_note = ""
            for f in clinical_files:
                st.success(f"{f.name} ({f.size // 1024} KB)")
        else:
            st.caption("Paste the full note text from Epic — names/DOBs are auto-scrubbed before any cloud call.")
            pasted_clinical_note = st.text_area(
                "Paste clinical note text",
                placeholder="Copy and paste the clinic note, discharge summary, or MDM note directly from Epic here...",
                height=220,
                label_visibility="collapsed",
                key="pasted_note",
            )
            clinical_files = []
            if pasted_clinical_note.strip():
                word_count = len(pasted_clinical_note.split())
                st.success(f"Note pasted — {word_count:,} words")

    with col2:
        st.markdown("**Genomic Reports**")
        st.caption("Caris, Guardant360, Tempus, or FoundationOne PDFs")
        genomic_files = st.file_uploader(
            "Genomic reports", type=["pdf"], accept_multiple_files=True,
            key="genomic_reports", label_visibility="collapsed",
        )
        for f in genomic_files:
            st.success(f"{f.name} ({f.size // 1024} KB)")

    st.divider()
    case_col1, case_col2 = st.columns([5, 1])
    with case_col1:
        case_id = st.text_input("Case ID", key="draft_case_id")
    with case_col2:
        st.write("")
        if st.button("Randomize", key="randomize_case_id"):
            st.session_state.draft_case_id = f"MTB-{uuid.uuid4().hex[:8].upper()}"
            st.rerun()
    additional_context = st.text_area(
        "Additional Context (optional)",
        placeholder="E.g. Seeking Phase 2+ trials. Patient prefers oral therapy. No prior EGFR TKI.",
        height=80,
    )
    st.divider()

    if not use_local:
        if not api_key:
            st.warning("Enter your Anthropic API Key in the sidebar to run the pipeline.")
        elif not api_key.startswith("sk-ant-"):
            st.error("Invalid API key format. Anthropic keys begin with `sk-ant-`.")

    _pasted = pasted_clinical_note if note_input_mode == "Paste from Epic" else ""
    has_input = bool(clinical_files) or bool(_pasted.strip()) or bool(genomic_files)
    api_ready = use_local or (api_key and api_key.startswith("sk-ant-"))

    if st.button(
        "Run Full Pipeline",
        type="primary",
        disabled=(not api_ready or not has_input),
        use_container_width=True,
    ):
        run_pipeline_ui(
            case_id=case_id,
            clinical_files=clinical_files,
            genomic_files=genomic_files,
            additional_context=additional_context,
            max_retrieved=max_retrieved,
            max_detailed=max_detailed,
            max_workers=max_workers,
            api_key=api_key,
            oncokb_token=oncokb_token,
            use_local=use_local,
            local_url=local_url,
            local_model=local_model,
            cloud_for_matching=cloud_for_matching,
            pasted_clinical_note=_pasted,
        )


# ════════════════════════════════════════════════════════════════════════════
# TAB 2: MTB Report  (primary output — shown first after Input)
# ════════════════════════════════════════════════════════════════════════════
with tab_report:
    st.markdown('<div class="section-header">📋 &nbsp;MTB Match Report</div>', unsafe_allow_html=True)
    result = st.session_state.pipeline_result

    if result is None:
        st.info("Run the pipeline in the Input tab to generate the MTB report.")
    elif result.text_report:
        dl1, dl2 = st.columns(2)
        dl1.download_button(
            "Download Text Report (.txt)",
            data=result.text_report,
            file_name=f"{result.case.case_id}_trial_matches.txt",
            mime="text/plain",
            use_container_width=True,
        )
        dl2.download_button(
            "Download Structured Report (.json)",
            data=json.dumps(result.json_report, indent=2, default=str),
            file_name=f"{result.case.case_id}_trial_matches.json",
            mime="application/json",
            use_container_width=True,
        )
        st.divider()
        st.text_area(
            "MTB report",
            value=result.text_report,
            height=900,
            disabled=True,
            label_visibility="collapsed",
        )
    else:
        st.warning("Report not generated.")
        for err in (result.errors if result else []):
            st.error(err)


# ════════════════════════════════════════════════════════════════════════════
# TAB 3: Patient Profile
# ════════════════════════════════════════════════════════════════════════════
with tab_profile:
    st.markdown('<div class="section-header">👤 &nbsp;Extracted Patient Profile</div>', unsafe_allow_html=True)
    result = st.session_state.pipeline_result

    if result is None:
        st.info("Run the pipeline in the Input tab to see the extracted patient profile.")
    else:
        case = result.case
        if case.clinical:
            c = case.clinical
            r1c1, r1c2, r1c3 = st.columns(3)
            with r1c1:
                st.metric("Age", c.age if c.age is not None else "N/A")
                st.metric("Sex", c.sex or "N/A")
                st.metric("ECOG PS", c.ecog_ps if c.ecog_ps is not None else "N/A")
            with r1c2:
                st.metric("Cancer Type", (c.cancer_type or "N/A")[:35])
                st.metric("Histology", (c.histology or "N/A")[:35])
                st.metric("Stage", c.stage or "N/A")
            with r1c3:
                st.metric("Metastatic", "Yes" if c.is_metastatic else ("No" if c.is_metastatic is False else "N/A"))
                st.metric("Brain Mets", "Yes" if c.brain_metastases else ("No" if c.brain_metastases is False else "N/A"))
                st.metric("Prior Lines", len(c.prior_therapies))

            if c.clinical_summary:
                st.info(c.clinical_summary)

            if c.prior_therapies:
                st.markdown("**Prior Therapies**")
                st.dataframe(pd.DataFrame([{
                    "Line": str(t.line) if t.line is not None else "?", "Regimen": t.regimen,
                    "Setting": t.setting or "", "Response": t.response or "",
                    "Stopped": t.discontinuation_reason or "",
                } for t in c.prior_therapies]), use_container_width=True)

            flags = []
            if c.brain_metastases:
                flags.append("Brain metastases")
            if c.leptomeningeal_disease:
                flags.append("Leptomeningeal disease")
            if c.autoimmune_conditions:
                flags.append(f"Autoimmune: {', '.join(c.autoimmune_conditions)}")
            if flags:
                st.warning("IO/Enrollment Flags: " + " | ".join(flags))

        if case.genomics:
            st.divider()
            for genomic in case.genomics:
                with st.expander(f"Genomic: {genomic.vendor.upper()} — {genomic.report_date or 'N/A'}"):
                    gc1, gc2, gc3 = st.columns(3)
                    gc1.metric("TMB", f"{genomic.tmb} mut/Mb" if genomic.tmb is not None else "N/A")
                    gc1.metric("MSI", genomic.msi_status or "N/A")
                    gc2.metric("PD-L1 TPS", f"{genomic.pdl1_tps}%" if genomic.pdl1_tps is not None else "N/A")
                    gc2.metric("HRD", genomic.hrd_status or "N/A")
                    gc3.metric("Mutations", len(genomic.variants))
                    gc3.metric("Fusions", len(genomic.fusions))

                    if genomic.variants:
                        st.dataframe(pd.DataFrame([{
                            "Gene": v.gene, "Variant": v.variant, "Type": v.variant_type,
                            "VAF%": v.vaf, "Interpretation": v.interpretation or "",
                        } for v in genomic.variants]), use_container_width=True)

                    if genomic.fusions:
                        st.markdown("**Fusions:** " + ", ".join(f"{f.gene1}::{f.gene2}" for f in genomic.fusions))
                    if genomic.amplifications:
                        st.markdown("**Amplifications:** " + ", ".join(a.gene for a in genomic.amplifications))

        if case.key_biomarkers:
            st.divider()
            st.markdown("**Key Biomarkers for Matching:**")
            bm_cols = st.columns(min(5, len(case.key_biomarkers)))
            for i, bm in enumerate(case.key_biomarkers[:10]):
                bm_cols[i % 5].code(bm)

        st.divider()
        st.markdown("**🔍 Extraction Audit Trail**")
        st.caption(
            "Verify the AI extracted the correct information from the source documents. "
            "These are the exact inputs sent to the matching stage."
        )
        with st.expander("Stage 2 input — keywords sent to ClinicalTrials.gov search", expanded=False):
            if case.key_biomarkers:
                st.markdown("**Biomarker keywords used for trial retrieval:**")
                for bm in case.key_biomarkers:
                    st.markdown(f"- `{bm}`")
            if case.clinical and case.clinical.cancer_type:
                st.markdown(f"**Cancer type query:** `{case.clinical.cancer_type}`")
            if case.clinical and case.clinical.stage:
                st.markdown(f"**Stage:** `{case.clinical.stage}`")

        with st.expander("Stage 3 input — full patient summary sent to criterion matcher", expanded=False):
            st.caption(
                "This is the complete patient narrative the AI reads when evaluating "
                "each trial's inclusion/exclusion criteria."
            )
            summary = case.full_text_summary
            if summary:
                st.text_area(
                    "Patient summary (read-only)",
                    value=summary,
                    height=400,
                    disabled=True,
                    label_visibility="collapsed",
                )
                st.download_button(
                    "Download patient summary (.txt)",
                    data=summary,
                    file_name=f"{case.case_id}_patient_summary.txt",
                    mime="text/plain",
                )
            else:
                st.info("No summary available.")


# ════════════════════════════════════════════════════════════════════════════
# TAB 4: Trial Matches  (detailed card view — secondary to MTB Report)
# ════════════════════════════════════════════════════════════════════════════
with tab_results:
    st.markdown('<div class="section-header">🔬 &nbsp;Clinical Trial Matches</div>', unsafe_allow_html=True)
    result = st.session_state.pipeline_result

    if result is None:
        st.info("Run the pipeline in the Input tab to see trial matches.")
    elif not result.ranked_trials and not getattr(result, "referral_trials", []):
        st.warning("No trials matched.")
        for err in result.errors:
            st.error(err)
    else:
        ranked = result.ranked_trials
        referral = getattr(result, "referral_trials", [])

        if not ranked and referral:
            st.info("No local Markey-area trials matched. Showing national referral candidates.")

        eligible_n = sum(1 for r in ranked if r.match_result.overall_eligibility in ("eligible", "likely_eligible"))
        uncertain_n = sum(1 for r in ranked if r.match_result.overall_eligibility == "uncertain")
        markey_n = sum(1 for r in ranked if r.at_markey)

        m1, m2, m3, m4 = st.columns(4)
        m1.metric("Total Evaluated", len(ranked))
        m2.metric("Eligible / Likely", eligible_n)
        m3.metric("Uncertain (Review)", uncertain_n)
        m4.metric("At Markey", markey_n)

        st.divider()
        f1, f2, f3 = st.columns(3)
        status_filter = f1.multiselect(
            "Eligibility filter",
            ["eligible", "likely_eligible", "uncertain", "likely_ineligible", "ineligible"],
            default=["eligible", "likely_eligible", "uncertain"],
            key="results_status_filter",
        )
        markey_only = f2.checkbox("Markey sites only", key="results_markey_only")
        if ranked:
            show_n = f3.number_input(
                "Show top N",
                min_value=1,
                max_value=len(ranked),
                value=min(20, len(ranked)),
                key="results_show_n",
            )
            filtered = [
                r for r in ranked
                if r.match_result.overall_eligibility in status_filter
                and (not markey_only or r.at_markey)
            ][:show_n]

            st.caption(f"Showing {len(filtered)} of {len(ranked)} trials")
            for rt in filtered:
                render_trial_card(rt)

        if referral:
            st.divider()
            st.markdown("### 🌐 Referral Candidates — National (No Markey Site)")
            st.caption(
                "These trials are recruiting nationally but have no UK Markey Cancer Center site. "
                "Patient referral to a participating institution may be appropriate."
            )
            eligible_ref = sum(1 for r in referral if r.match_result.overall_eligibility in ("eligible", "likely_eligible"))
            st.info(f"{len(referral)} referral candidates evaluated — {eligible_ref} eligible/likely eligible")
            for rt in referral:
                with st.expander(
                    f"#{rt.rank} {rt.nct_id} · {rt.display_eligibility} · Score {rt.composite_score:.0f}  — {(rt.match_result.trial_title or '')[:70]}",
                    expanded=False,
                ):
                    render_trial_card(rt)
                    us_sites = [
                        f"{loc.facility} ({loc.city}, {loc.state})"
                        for loc in rt.trial.locations
                        if loc.country == "United States" and loc.facility
                    ]
                    if us_sites:
                        st.markdown("**US Sites:**")
                        for site in us_sites[:8]:
                            st.markdown(f"  - {site}")


# ════════════════════════════════════════════════════════════════════════════
# TAB 5: Batch Processing
# ════════════════════════════════════════════════════════════════════════════
with tab_batch:
    st.markdown('<div class="section-header">⚡ &nbsp;Batch Processing</div>', unsafe_allow_html=True)
    st.caption(
        "Point to a folder of case subfolders. The system will auto-detect genomic PDFs vs clinical notes "
        "in each subfolder, then run the full pipeline on every case sequentially. "
        "Results are saved to output/ and viewable in the History tab."
    )

    batch_folder = st.text_input(
        "Batch folder path",
        placeholder=r"e.g. C:\Users\you\OneDrive\MTB_Batch_305",
        help=(
            "Each subfolder = one case. If a subfolder contains an Input/ directory, "
            "that is used (Markey convention). Genomic PDFs are detected by filename keywords "
            "(caris, guardant, tempus, foundation, ngs, genomic); everything else is a clinical note."
        ),
        key="batch_folder_path",
    )

    detected_cases = []
    if batch_folder and Path(batch_folder).exists():
        detected_cases = scan_batch_folder(batch_folder)

        if not detected_cases:
            st.warning("No case subfolders with PDFs found in that folder.")
        else:
            est_minutes = len(detected_cases) * 5
            st.success(
                f"Found **{len(detected_cases)}** case(s) — "
                f"estimated **~{est_minutes} minutes** total at ~5 min/case"
            )

            # Editable case ID table
            st.markdown("**Detected cases — edit Case IDs before running if needed:**")
            case_id_overrides = {}
            for i, case in enumerate(detected_cases):
                c1, c2, c3 = st.columns([3, 3, 4])
                c1.markdown(f"**{case['folder_name']}**")
                override_id = c2.text_input(
                    "Case ID",
                    value=case["case_id"],
                    key=f"batch_case_id_{i}",
                    label_visibility="collapsed",
                )
                case_id_overrides[i] = override_id
                c3.caption(
                    f"{len(case['genomic_pdfs'])} genomic PDF{'s' if len(case['genomic_pdfs']) != 1 else ''}, "
                    f"{len(case['clinical_pdfs'])} clinical PDF{'s' if len(case['clinical_pdfs']) != 1 else ''}"
                    + (f", {len(case['txt_files'])} txt" if case["txt_files"] else "")
                )

            with st.expander("Review auto-detected file classification", expanded=False):
                st.caption(
                    "Files with 'caris', 'guardant', 'tempus', or 'foundation' in the filename are "
                    "classified as genomic reports. All other PDFs are clinical notes."
                )
                for case in detected_cases:
                    st.markdown(f"**{case['folder_name']}**")
                    for p in case["genomic_pdfs"]:
                        st.markdown(f"  - 🧬 `{Path(p).name}` (genomic)")
                    for p in case["clinical_pdfs"]:
                        st.markdown(f"  - 📄 `{Path(p).name}` (clinical note)")
                    for p in case["txt_files"]:
                        st.markdown(f"  - 📝 `{Path(p).name}` (text note)")

            st.divider()
            api_ready_batch = use_local or (api_key and api_key.startswith("sk-ant-"))
            if not api_ready_batch:
                st.warning("Configure your API key in the sidebar before running batch.")

            if st.button(
                f"Run All {len(detected_cases)} Cases",
                type="primary",
                disabled=not api_ready_batch,
                use_container_width=True,
                key="run_batch_btn",
            ):
                batch_progress = st.progress(0)
                batch_status = st.empty()
                results_log = []

                for i, case in enumerate(detected_cases):
                    case_id_to_use = case_id_overrides.get(i, case["case_id"])
                    batch_status.info(
                        f"⏳ Case **{i + 1}/{len(detected_cases)}**: `{case_id_to_use}` ({case['folder_name']})"
                    )

                    import config as cfg
                    cfg.USE_LOCAL_LLM = use_local
                    cfg.LOCAL_EXTRACTION_ONLY = use_local and cloud_for_matching
                    cfg.LOCAL_LLM_BASE_URL = local_url
                    cfg.LOCAL_LLM_MODEL = local_model
                    if api_key:
                        cfg.ANTHROPIC_API_KEY = api_key
                        os.environ["ANTHROPIC_API_KEY"] = api_key
                    if oncokb_token:
                        cfg.ONCOKB_TOKEN = oncokb_token
                        os.environ["ONCOKB_TOKEN"] = oncokb_token

                    try:
                        result = run_pipeline(
                            case_id=case_id_to_use,
                            clinical_note_paths=case["clinical_pdfs"] + case["txt_files"],
                            genomic_report_paths=case["genomic_pdfs"],
                            additional_context="",
                            max_retrieved_trials=max_retrieved,
                            max_detailed_trials=max_detailed,
                            max_matching_workers=max_workers,
                            save_outputs=True,
                            progress_callback=None,
                        )
                        top_nct = result.ranked_trials[0].nct_id if result.ranked_trials else "none"
                        eligible_count = sum(
                            1 for r in result.ranked_trials
                            if r.match_result.overall_eligibility in ("eligible", "likely_eligible")
                        )
                        results_log.append({
                            "Case ID": case_id_to_use,
                            "Folder": case["folder_name"],
                            "Status": "✅ Done",
                            "Trials": len(result.ranked_trials),
                            "Eligible / Likely": eligible_count,
                            "Top Match": top_nct,
                            "Errors": "; ".join(result.errors) if result.errors else "",
                        })
                    except Exception as e:
                        logger.exception(f"Batch case {case_id_to_use} failed")
                        results_log.append({
                            "Case ID": case_id_to_use,
                            "Folder": case["folder_name"],
                            "Status": "❌ Failed",
                            "Trials": 0,
                            "Eligible / Likely": 0,
                            "Top Match": "",
                            "Errors": str(e),
                        })

                    batch_progress.progress((i + 1) / len(detected_cases))

                batch_status.success(
                    f"Batch complete — {len(detected_cases)} cases processed. "
                    "View individual results in the **History** tab."
                )
                st.markdown("### Batch Results Summary")
                st.dataframe(pd.DataFrame(results_log), use_container_width=True)

    elif batch_folder and not Path(batch_folder).exists():
        st.error(f"Folder not found: `{batch_folder}`")


# ════════════════════════════════════════════════════════════════════════════
# TAB 6: Case History
# ════════════════════════════════════════════════════════════════════════════
with tab_history:
    st.markdown('<div class="section-header">📚 &nbsp;Case History</div>', unsafe_allow_html=True)

    if "history_refresh" not in st.session_state:
        st.session_state.history_refresh = 0

    saved_cases = get_saved_cases()

    if not saved_cases:
        st.info("No saved cases yet. Run the pipeline in the Input tab to create your first case.")
    else:
        hm1, hm2, hm3 = st.columns(3)
        hm1.metric("Total Cases", len(saved_cases))
        hm2.metric("Trials Evaluated", sum(c["total_trials"] for c in saved_cases))
        hm3.metric("With Referrals", sum(1 for c in saved_cases if c["has_referral"]))

        st.divider()

        search_query = st.text_input(
            "Search cases", placeholder="Filter by case ID or biomarker...",
            key="history_search",
        )
        if search_query:
            q = search_query.lower()
            saved_cases = [
                c for c in saved_cases
                if q in c["case_id"].lower()
                or any(q in bm.lower() for bm in c["key_biomarkers"])
            ]
            st.caption(f"{len(saved_cases)} case(s) matching '{search_query}'")

        st.markdown("---")

        eligibility_colors = {
            "eligible": "#1A7A40",
            "likely_eligible": "#2E9E5B",
            "uncertain": "#C7A900",
            "likely_ineligible": "#C0392B",
            "ineligible": "#C0392B",
        }

        for case_meta in saved_cases:
            cid = case_meta["case_id"]
            is_active = (st.session_state.active_case_id == cid)
            border_color = "#C7A900" if is_active else "#003F7F"
            bg_color = "#fffdf0" if is_active else "#f8fafd"

            top_elig_color = eligibility_colors.get(case_meta["top_eligibility"], "#888")
            biomarkers_str = " · ".join(case_meta["key_biomarkers"][:5]) or "—"
            referral_badge = (
                f' &nbsp;<span style="background:#005EB8;color:white;font-size:10px;'
                f'padding:2px 7px;border-radius:10px;">'
                f'+ {case_meta["referral_count"]} referral</span>'
                if case_meta["has_referral"] else ""
            )
            active_badge = (
                ' &nbsp;<span style="background:#C7A900;color:#002855;font-size:10px;'
                'font-weight:700;padding:2px 7px;border-radius:10px;">ACTIVE</span>'
                if is_active else ""
            )
            top_match_html = (
                f'<div style="margin-top:4px; font-size:12px; color:#003F7F;">'
                f'<b>Top match:</b> {case_meta["top_nct"]} — {case_meta["top_title"]}</div>'
                if case_meta["top_nct"] else ""
            )
            elig_label = case_meta["top_eligibility"].replace("_", " ").title() if case_meta["top_eligibility"] else "—"
            st.markdown(
                f'<div style="border:1px solid #dde3ec; border-left:4px solid {border_color}; '
                f'border-radius:8px; padding:14px 16px; margin-bottom:10px; background:{bg_color};">'
                f'<div style="display:flex; justify-content:space-between; align-items:flex-start;">'
                f'<div>'
                f'<span style="font-size:16px; font-weight:700; color:#002855;">{cid}</span>'
                f'{active_badge}{referral_badge}'
                f'<br><span style="font-size:12px; color:#666;">🕒 {case_meta["generated_at"]}</span>'
                f'</div>'
                f'<div style="text-align:right;">'
                f'<span style="font-size:13px; font-weight:600; color:{top_elig_color};">{elig_label}</span>'
                f'<br><span style="font-size:11px; color:#666;">{case_meta["total_trials"]} trials</span>'
                f'</div>'
                f'</div>'
                f'<div style="margin-top:8px; font-size:12px; color:#444;">'
                f'<b>Biomarkers:</b> {biomarkers_str}'
                f'</div>'
                f'{top_match_html}'
                f'</div>',
                unsafe_allow_html=True,
            )

            btn_col1, btn_col2, btn_col3 = st.columns([2, 2, 8])
            with btn_col1:
                if st.button(
                    "Load" if not is_active else "Reload",
                    key=f"load_{cid}",
                    type="primary" if not is_active else "secondary",
                ):
                    if load_case_from_json(cid):
                        st.success(f"Loaded case {cid} — switch to MTB Report tab to view results.")
                        st.rerun()

            with btn_col2:
                if st.button("Delete", key=f"del_{cid}", type="secondary"):
                    st.session_state[f"confirm_del_{cid}"] = True

            if st.session_state.get(f"confirm_del_{cid}"):
                st.warning(f"Are you sure you want to permanently delete case **{cid}**?")
                conf1, conf2 = st.columns(2)
                with conf1:
                    if st.button("Yes, delete", key=f"confirm_yes_{cid}", type="primary"):
                        delete_case(cid)
                        st.session_state.pop(f"confirm_del_{cid}", None)
                        st.session_state.history_refresh += 1
                        st.rerun()
                with conf2:
                    if st.button("Cancel", key=f"confirm_no_{cid}"):
                        st.session_state.pop(f"confirm_del_{cid}", None)
                        st.rerun()

            st.markdown("&nbsp;")
