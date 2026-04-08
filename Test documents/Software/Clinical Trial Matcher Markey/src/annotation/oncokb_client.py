"""
OncoKB API client for variant actionability annotation.
OncoKB v1 API - FDA-recognized precision oncology knowledge base.
Academic use free; clinical/commercial use requires licensing.
"""

import logging
import time
from pathlib import Path
from typing import Optional

import requests
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config

logger = logging.getLogger(__name__)


class OncoKBAnnotation(BaseModel):
    gene: str
    variant: str
    tumor_type: Optional[str] = None
    oncogenicity: Optional[str] = None  # Oncogenic, Likely Oncogenic, VUS, etc.
    mutation_effect: Optional[str] = None
    highest_sensitive_level: Optional[str] = None  # LEVEL_1, LEVEL_2, etc.
    highest_resistance_level: Optional[str] = None
    treatments: list[dict] = Field(default_factory=list)
    citations: list[str] = Field(default_factory=list)
    is_actionable: bool = False
    evidence_level: Optional[str] = None  # Simplified: "FDA-approved", "Clinical evidence", etc.


# Evidence level descriptions for MTB reports
EVIDENCE_LEVEL_DESCRIPTIONS = {
    "LEVEL_1": "FDA-approved biomarker in this tumor type",
    "LEVEL_2": "Standard care biomarker in this tumor type (guidelines)",
    "LEVEL_3A": "Clinical evidence in this tumor type",
    "LEVEL_3B": "Clinical evidence in another tumor type",
    "LEVEL_4": "Biological evidence only",
    "LEVEL_R1": "Standard care resistance biomarker",
    "LEVEL_R2": "Emerging resistance biomarker",
}


class OncoKBClient:
    """Client for OncoKB variant annotation API."""

    def __init__(self):
        if not config.ONCOKB_TOKEN:
            logger.warning("ONCOKB_TOKEN not set. OncoKB annotations will be unavailable.")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {config.ONCOKB_TOKEN}",
            "Accept": "application/json",
        })
        self._request_delay = 0.2  # 5 req/sec to stay well under limits

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    def annotate_mutation(
        self,
        hugo_symbol: str,
        alteration: str,
        tumor_type: Optional[str] = None,
    ) -> Optional[OncoKBAnnotation]:
        """
        Annotate a single mutation via OncoKB.

        Args:
            hugo_symbol: HUGO gene symbol (e.g. BRAF)
            alteration: Protein change (e.g. V600E) or variant description
            tumor_type: OncoKB tumor type (optional, improves evidence level)

        Returns:
            OncoKBAnnotation or None if API unavailable/not found
        """
        if not config.ONCOKB_TOKEN:
            return None

        params = {
            "hugoSymbol": hugo_symbol,
            "alteration": alteration,
        }
        if tumor_type:
            params["tumorType"] = tumor_type

        try:
            time.sleep(self._request_delay)
            resp = self.session.get(
                f"{config.ONCOKB_BASE_URL}/annotate/mutations/byProteinChange",
                params=params,
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()
            return self._parse_annotation(hugo_symbol, alteration, data)
        except requests.HTTPError as e:
            if e.response.status_code == 404:
                return None
            logger.warning(f"OncoKB HTTP error for {hugo_symbol} {alteration}: {e}")
            return None
        except Exception as e:
            logger.warning(f"OncoKB annotation failed for {hugo_symbol} {alteration}: {e}")
            return None

    def annotate_batch(
        self,
        mutations: list[dict],
        tumor_type: Optional[str] = None,
    ) -> list[OncoKBAnnotation]:
        """
        Batch annotate up to 100 mutations.

        Args:
            mutations: List of dicts with 'hugoSymbol' and 'alteration' keys
            tumor_type: Common tumor type for all mutations

        Returns:
            List of OncoKBAnnotations
        """
        if not config.ONCOKB_TOKEN:
            return []

        # OncoKB accepts 100 per batch
        results = []
        for i in range(0, len(mutations), 100):
            batch = mutations[i:i + 100]
            payload = [
                {
                    "hugoSymbol": m.get("hugoSymbol", ""),
                    "alteration": m.get("alteration", ""),
                    "tumorType": tumor_type or "",
                }
                for m in batch
            ]

            try:
                time.sleep(self._request_delay)
                resp = self.session.post(
                    f"{config.ONCOKB_BASE_URL}/annotate/mutations/byProteinChange",
                    json=payload,
                    timeout=30,
                )
                resp.raise_for_status()
                data = resp.json()
                for item, mut in zip(data, batch):
                    results.append(self._parse_annotation(
                        mut.get("hugoSymbol", ""), mut.get("alteration", ""), item
                    ))
            except Exception as e:
                logger.warning(f"OncoKB batch annotation failed: {e}")

        return results

    def _parse_annotation(self, gene: str, variant: str, data: dict) -> OncoKBAnnotation:
        query = data.get("query", {})
        oncogenicity = data.get("oncogenic", "")
        treatments = data.get("treatments", [])

        sensitive_level = data.get("highestSensitiveLevel")
        resistance_level = data.get("highestResistanceLevel")

        is_actionable = bool(sensitive_level and sensitive_level != "LEVEL_4")
        evidence_level = EVIDENCE_LEVEL_DESCRIPTIONS.get(sensitive_level, sensitive_level)

        return OncoKBAnnotation(
            gene=gene,
            variant=variant,
            tumor_type=query.get("tumorType"),
            oncogenicity=oncogenicity,
            mutation_effect=data.get("mutationEffect", {}).get("knownEffect"),
            highest_sensitive_level=sensitive_level,
            highest_resistance_level=resistance_level,
            treatments=treatments[:5] if treatments else [],
            is_actionable=is_actionable,
            evidence_level=evidence_level,
        )


def get_oncokb_evidence_priority(annotation: Optional[OncoKBAnnotation]) -> int:
    """
    Return priority score (higher = more actionable) for trial ranking.
    Maps OncoKB evidence levels to m1A-m4 / AMP Tier I-III hierarchy.
    """
    if not annotation or not annotation.highest_sensitive_level:
        return 0

    priority_map = {
        "LEVEL_1": 6,  # m1A equivalent - FDA-approved same tumor type
        "LEVEL_2": 5,  # m1B - Standard care guidelines
        "LEVEL_3A": 4,  # m2 - Clinical trial evidence same tumor type
        "LEVEL_3B": 3,  # m3 - Clinical trial evidence different tumor type
        "LEVEL_4": 2,  # m4 - Biological rationale
    }
    return priority_map.get(annotation.highest_sensitive_level, 1)
