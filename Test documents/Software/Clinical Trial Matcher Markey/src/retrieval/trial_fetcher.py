"""
ClinicalTrials.gov v2 API client with Markey-specific geographic filtering.
Handles trial retrieval, caching, and structured data extraction.
Rate limit: ~50 requests/minute per IP.
"""

import hashlib
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import requests
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

import config

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).parent.parent.parent / "output" / "trial_cache"
CACHE_TTL_HOURS = 24  # Refresh trial data daily


# ── Trial data schema ───────────────────────────────────────────────────────

class TrialLocation(BaseModel):
    facility: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    status: Optional[str] = None  # RECRUITING, NOT_YET_RECRUITING, etc.


class ClinicalTrial(BaseModel):
    nct_id: str
    title: str
    brief_title: str = ""
    status: str = ""
    phase: Optional[str] = None
    conditions: list[str] = Field(default_factory=list)
    interventions: list[str] = Field(default_factory=list)
    eligibility_criteria: str = ""  # Raw freetext
    inclusion_criteria: list[str] = Field(default_factory=list)
    exclusion_criteria: list[str] = Field(default_factory=list)
    minimum_age: Optional[str] = None
    maximum_age: Optional[str] = None
    sex: Optional[str] = None
    healthy_volunteers: Optional[str] = None
    locations: list[TrialLocation] = Field(default_factory=list)
    sponsor: Optional[str] = None
    brief_summary: str = ""
    start_date: Optional[str] = None
    primary_completion_date: Optional[str] = None
    url: str = ""

    @property
    def at_markey(self) -> bool:
        """Check if this trial is recruiting at UK Markey Cancer Center."""
        for loc in self.locations:
            if loc.facility and any(
                kw in loc.facility.lower()
                for kw in ["kentucky", "markey", "uk healthcare", "university of kentucky"]
            ):
                return True
        return False


# ── API client ─────────────────────────────────────────────────────────────

class ClinicalTrialsClient:
    BASE_URL = config.CLINICALTRIALS_BASE_URL
    REQUEST_DELAY = 0.5  # seconds between requests

    def __init__(self, use_cache: bool = True):
        self.use_cache = use_cache
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json"})
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def _get(self, endpoint: str, params: dict) -> dict:
        url = f"{self.BASE_URL}{endpoint}"
        time.sleep(self.REQUEST_DELAY)
        resp = self.session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()

    def search_trials(
        self,
        condition: str,
        cancer_keywords: list[str] = None,
        location: str = "University of Kentucky",
        geographic_radius_miles: int = config.MARKEY_SEARCH_RADIUS_MILES,
        status_filter: list[str] = None,
        max_results: int = config.MAX_TRIALS_RETRIEVAL,
    ) -> list[ClinicalTrial]:
        """
        Search ClinicalTrials.gov for recruiting trials matching a condition.

        Args:
            condition: Primary condition search term (e.g. "non-small cell lung cancer")
            cancer_keywords: Additional keyword terms (biomarkers, histology, etc.)
            location: Site location search string
            geographic_radius_miles: Search radius from Markey center
            status_filter: List of statuses (default: RECRUITING + NOT_YET_RECRUITING)
            max_results: Maximum trials to retrieve

        Returns:
            List of ClinicalTrial objects
        """
        if status_filter is None:
            status_filter = ["RECRUITING", "NOT_YET_RECRUITING"]

        keywords_str = "|".join(sorted(cancer_keywords or []))
        raw_key = f"{condition}|{location}|{max_results}|{'|'.join(status_filter)}|{keywords_str}"
        cache_key = hashlib.md5(raw_key.encode()).hexdigest()
        cache_path = CACHE_DIR / f"{cache_key}.json"

        if self.use_cache and cache_path.exists():
            age = datetime.now() - datetime.fromtimestamp(cache_path.stat().st_mtime)
            if age < timedelta(hours=CACHE_TTL_HOURS):
                logger.info(f"Loading trials from cache: {cache_path.name}")
                data = json.loads(cache_path.read_text())
                return [ClinicalTrial.model_validate(t) for t in data]

        trials = []
        page_token = None

        while len(trials) < max_results:
            params = {
                "query.cond": condition,
                "filter.overallStatus": "|".join(status_filter),
                "pageSize": min(100, max_results - len(trials)),
                "format": "json",
            }
            if cancer_keywords:
                params["query.term"] = " ".join(cancer_keywords[:5])

            # Geographic filter for Lexington, KY area
            params["filter.geo"] = (
                f"distance({config.MARKEY_LATITUDE},{config.MARKEY_LONGITUDE},{geographic_radius_miles}mi)"
            )

            if page_token:
                params["pageToken"] = page_token

            try:
                data = self._get("/studies", params)
            except Exception as e:
                logger.error(f"ClinicalTrials.gov API error: {e}")
                break

            studies = data.get("studies", [])
            if not studies:
                break

            for study in studies:
                trial = self._parse_study(study)
                trials.append(trial)

            page_token = data.get("nextPageToken")
            if not page_token:
                break

        # If geographic filter returns few results, also search without geo filter
        if len(trials) < 20:
            logger.info(f"Only {len(trials)} trials in {geographic_radius_miles}mi radius, expanding to all US sites")
            trials_expanded = self._search_without_geo(condition, status_filter, max_results - len(trials), cancer_keywords)
            existing_ids = {t.nct_id for t in trials}
            for t in trials_expanded:
                if t.nct_id not in existing_ids:
                    trials.append(t)

        if self.use_cache and trials:
            cache_path.write_text(
                json.dumps([t.model_dump() for t in trials], default=str),
                encoding="utf-8"
            )
            logger.info(f"Cached {len(trials)} trials to {cache_path.name}")

        logger.info(f"Retrieved {len(trials)} trials for '{condition}'")
        return trials[:max_results]

    def search_trials_national(
        self,
        condition: str,
        cancer_keywords: list[str] = None,
        exclude_ids: set[str] = None,
        max_results: int = config.MAX_REFERRAL_RETRIEVAL,
        status_filter: list[str] = None,
    ) -> list[ClinicalTrial]:
        """
        Search nationally (no geo filter) for referral candidates.
        Returns trials not already in the local (geo-filtered) result set.

        Args:
            condition: Primary condition search term
            cancer_keywords: Additional keyword terms for specificity
            exclude_ids: NCT IDs already retrieved locally (excluded from results)
            max_results: Max national trials to return
            status_filter: Status filter (default: RECRUITING + NOT_YET_RECRUITING)
        """
        if status_filter is None:
            status_filter = ["RECRUITING", "NOT_YET_RECRUITING"]

        keywords_str = "|".join(sorted(cancer_keywords or []))
        raw_key = f"national|{condition}|{max_results}|{'|'.join(status_filter)}|{keywords_str}"
        cache_key = hashlib.md5(raw_key.encode()).hexdigest()
        cache_path = CACHE_DIR / f"national_{cache_key}.json"

        if self.use_cache and cache_path.exists():
            age = datetime.now() - datetime.fromtimestamp(cache_path.stat().st_mtime)
            if age < timedelta(hours=CACHE_TTL_HOURS):
                logger.info(f"Loading national referral trials from cache: {cache_path.name}")
                data = json.loads(cache_path.read_text())
                trials = [ClinicalTrial.model_validate(t) for t in data]
                if exclude_ids:
                    trials = [t for t in trials if t.nct_id not in exclude_ids]
                return trials

        # Two complementary searches:
        # 1. Broad condition search — finds trials for this cancer type generally
        # 2. Intervention/target search — finds biomarker-targeted trials that may
        #    not rank highly in a generic condition search (e.g. ALK inhibitor trials)
        trials_by_id: dict[str, ClinicalTrial] = {}

        broad = self._search_without_geo(condition, status_filter, max_results, None)
        for t in broad:
            trials_by_id[t.nct_id] = t

        if cancer_keywords:
            targeted = self._search_by_intervention(cancer_keywords, status_filter, max_results)
            for t in targeted:
                if t.nct_id not in trials_by_id:
                    trials_by_id[t.nct_id] = t

        trials = list(trials_by_id.values())
        logger.info(f"National search: {len(trials)} unique trials (broad + targeted)")

        if self.use_cache and trials:
            cache_path.write_text(
                json.dumps([t.model_dump() for t in trials], default=str),
                encoding="utf-8",
            )
            logger.info(f"Cached {len(trials)} national trials to {cache_path.name}")

        if exclude_ids:
            trials = [t for t in trials if t.nct_id not in exclude_ids]
        return trials  # Caller does top-K selection via hybrid ranker

    def _search_without_geo(self, condition: str, status_filter: list[str], max_results: int, cancer_keywords: list[str] = None) -> list[ClinicalTrial]:
        """Search by condition without geographic filter."""
        try:
            params = {
                "query.cond": condition,
                "filter.overallStatus": "|".join(status_filter),
                "pageSize": min(100, max_results),
                "format": "json",
            }
            if cancer_keywords:
                params["query.term"] = " ".join(cancer_keywords[:5])
            data = self._get("/studies", params)
            return [self._parse_study(s) for s in data.get("studies", [])]
        except Exception as e:
            logger.error(f"Expanded search failed: {e}")
            return []

    def _search_by_intervention(self, cancer_keywords: list[str], status_filter: list[str], max_results: int) -> list[ClinicalTrial]:
        """
        Search by intervention/target keywords (query.intr) to surface
        biomarker-targeted trials that don't rank highly in condition-based searches.
        e.g. ALK inhibitors, KRAS G12C inhibitors, FGFR inhibitors.

        Searches individually for each gene name found in the keyword list —
        combining all terms into one query.intr call would require all terms
        to match simultaneously (too restrictive).
        """
        import re
        # Extract likely gene/target names: short uppercase tokens (ALK, KRAS, EML4, FGFR...)
        gene_pattern = re.compile(r'^[A-Z][A-Z0-9]{1,7}$')
        gene_names = [kw for kw in cancer_keywords if gene_pattern.match(kw)][:3]

        if not gene_names:
            return []

        seen: dict[str, ClinicalTrial] = {}
        for gene in gene_names:
            try:
                params = {
                    "query.intr": gene,
                    "filter.overallStatus": "|".join(status_filter),
                    "pageSize": 100,  # Always fetch 100 per gene; combined pool is capped later
                    "format": "json",
                }
                data = self._get("/studies", params)
                batch = [self._parse_study(s) for s in data.get("studies", [])]
                for t in batch:
                    if t.nct_id not in seen:
                        seen[t.nct_id] = t
                logger.info(f"Intervention search '{gene}': {len(batch)} trials")
            except Exception as e:
                logger.warning(f"Intervention search for '{gene}' failed: {e}")

        return list(seen.values())

    def get_trial_by_nct_id(self, nct_id: str) -> Optional[ClinicalTrial]:
        """Fetch a single trial by NCT ID."""
        try:
            data = self._get(f"/studies/{nct_id}", {"format": "json"})
            return self._parse_study(data)
        except Exception as e:
            logger.error(f"Failed to fetch {nct_id}: {e}")
            return None

    def _parse_study(self, study: dict) -> ClinicalTrial:
        """Parse a ClinicalTrials.gov v2 API study object into a ClinicalTrial."""
        proto = study.get("protocolSection", {})
        id_module = proto.get("identificationModule", {})
        status_module = proto.get("statusModule", {})
        desc_module = proto.get("descriptionModule", {})
        conditions_module = proto.get("conditionsModule", {})
        arms_module = proto.get("armsInterventionsModule", {})
        eligibility_module = proto.get("eligibilityModule", {})
        locations_module = proto.get("contactsLocationsModule", {})
        sponsor_module = proto.get("sponsorCollaboratorsModule", {})

        # Parse eligibility criteria into inclusion/exclusion lists
        raw_eligibility = eligibility_module.get("eligibilityCriteria", "")
        inclusion, exclusion = _split_eligibility_criteria(raw_eligibility)

        # Parse locations
        locations = []
        for loc in locations_module.get("locations", []):
            locations.append(TrialLocation(
                facility=loc.get("facility"),
                city=loc.get("city"),
                state=loc.get("state"),
                country=loc.get("country"),
                status=loc.get("status"),
            ))

        # Parse interventions
        interventions = [
            i.get("name", "") for i in arms_module.get("interventions", [])
            if i.get("name")
        ]

        nct_id = id_module.get("nctId", "")

        # healthyVolunteers can be bool (True/False) or string in the v2 API
        hv = eligibility_module.get("healthyVolunteers")
        if isinstance(hv, bool):
            hv = "Yes" if hv else "No"
        elif hv is not None:
            hv = str(hv)

        return ClinicalTrial(
            nct_id=nct_id,
            title=id_module.get("officialTitle", id_module.get("briefTitle", "")),
            brief_title=id_module.get("briefTitle", ""),
            status=status_module.get("overallStatus", ""),
            phase=_parse_phase(study.get("protocolSection", {}).get("designModule", {}).get("phases", [])),
            conditions=conditions_module.get("conditions", []),
            interventions=interventions,
            eligibility_criteria=raw_eligibility,
            inclusion_criteria=inclusion,
            exclusion_criteria=exclusion,
            minimum_age=eligibility_module.get("minimumAge"),
            maximum_age=eligibility_module.get("maximumAge"),
            sex=eligibility_module.get("sex"),
            healthy_volunteers=hv,
            locations=locations,
            sponsor=sponsor_module.get("leadSponsor", {}).get("name"),
            brief_summary=desc_module.get("briefSummary", ""),
            start_date=status_module.get("startDateStruct", {}).get("date"),
            primary_completion_date=status_module.get("primaryCompletionDateStruct", {}).get("date"),
            url=f"https://clinicaltrials.gov/study/{nct_id}",
        )


def _split_eligibility_criteria(raw: str) -> tuple[list[str], list[str]]:
    """
    Split freetext eligibility criteria into inclusion and exclusion lists.
    Handles common formatting patterns from ClinicalTrials.gov.
    """
    if not raw:
        return [], []

    inclusion, exclusion = [], []
    current_section = None
    current_item = []

    for line in raw.split("\n"):
        line = line.strip()
        if not line:
            if current_item and current_section:
                item_text = " ".join(current_item).strip()
                if item_text:
                    (inclusion if current_section == "inclusion" else exclusion).append(item_text)
                current_item = []
            continue

        line_lower = line.lower()
        if any(kw in line_lower for kw in ["inclusion criteria", "inclusion:"]):
            if current_item and current_section:
                item_text = " ".join(current_item).strip()
                if item_text:
                    (inclusion if current_section == "inclusion" else exclusion).append(item_text)
                current_item = []
            current_section = "inclusion"
            continue
        elif any(kw in line_lower for kw in ["exclusion criteria", "exclusion:"]):
            if current_item and current_section:
                item_text = " ".join(current_item).strip()
                if item_text:
                    (inclusion if current_section == "inclusion" else exclusion).append(item_text)
                current_item = []
            current_section = "exclusion"
            continue

        if current_section:
            # Detect numbered/bulleted items
            if line[:2] in ("- ", "* ") or (len(line) > 2 and line[0].isdigit() and line[1] in ".) "):
                if current_item:
                    item_text = " ".join(current_item).strip()
                    if item_text:
                        (inclusion if current_section == "inclusion" else exclusion).append(item_text)
                    current_item = []
                current_item = [line.lstrip("0123456789.-*) ")]
            else:
                current_item.append(line)

    # Flush remaining
    if current_item and current_section:
        item_text = " ".join(current_item).strip()
        if item_text:
            (inclusion if current_section == "inclusion" else exclusion).append(item_text)

    return inclusion, exclusion


def _parse_phase(phases: list) -> Optional[str]:
    if not phases:
        return None
    return "/".join(p.replace("PHASE", "Phase ") for p in phases)
