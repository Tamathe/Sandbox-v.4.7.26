"""
PHI (Protected Health Information) scrubber.

Redacts common HIPAA identifiers from text before it is transmitted to any
cloud LLM API.  Targets the 18 PHI categories defined in HIPAA Safe Harbor
de-identification (45 CFR § 164.514(b)):

  Names, geographic data, dates (except year), phone/fax numbers, email
  addresses, SSNs, MRNs, health-plan numbers, account numbers, certificate/
  license numbers, URLs, IP addresses, device identifiers, and any unique
  identifying numbers or codes.

Pattern-based redaction is reliable for structured identifiers (SSN, phone,
email, MRN). Patient names are handled by matching text that follows common
clinical label prefixes (e.g. "Patient:", "Name:") — this context-anchored
approach minimises false positives on clinical abbreviations.

Called automatically by _call_anthropic() in llm_client.py so that every
outbound Anthropic API call is scrubbed, regardless of which pipeline stage
generated it.
"""

import logging
import re
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# ── Replacement tokens ────────────────────────────────────────────────────────
# Each token names the PHI category that was removed, making prompts still
# parseable by the model while giving auditors a clear redaction trail.

_TOKEN = {
    "ssn":     "[REDACTED-SSN]",
    "phone":   "[REDACTED-PHONE]",
    "email":   "[REDACTED-EMAIL]",
    "mrn":     "[REDACTED-MRN]",
    "dob":     "[REDACTED-DOB]",
    "name":    "[REDACTED-NAME]",
    "zip":     "[REDACTED-ZIP]",
    "account": "[REDACTED-ACCT]",
    "ip":      "[REDACTED-IP]",
    "url":     "[REDACTED-URL]",
}


# ── Regex patterns ────────────────────────────────────────────────────────────

# Social Security Numbers: 123-45-6789
_SSN = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

# US phone / fax numbers in common formats
_PHONE = re.compile(
    r"(\+?1[\s.\-]?)?"           # optional country code
    r"(\(?\d{3}\)?[\s.\-]?)"    # area code
    r"\d{3}[\s.\-]?\d{4}\b"
)

# Email addresses
_EMAIL = re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b")

# MRN / Medical Record Number — labeled only to avoid matching clinical values
_MRN = re.compile(
    r"(?:MRN|Medical\s+Record(?:\s+Number|\s+No\.?)?|MR\s*#|Patient\s+ID)"
    r"[\s:.\-#]*\d{4,12}",
    re.IGNORECASE,
)

# Date of birth — labeled; clinical treatment dates are left intact because
# they are not PHI and are needed for eligibility assessment
_DATE_VALUE = (
    r"(?:"
    r"\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}"            # 01/15/1980
    r"|\d{4}[/\-]\d{1,2}[/\-]\d{1,2}"             # 1980-01-15
    r"|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
    r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\.?\s+\d{1,2},?\s+\d{4}"                     # January 15, 1980
    r"|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
    r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\.?\s+\d{4}"                                  # 15 January 1980
    r")"
)
_DOB = re.compile(
    r"(?:DOB|Date\s+of\s+Birth|Birth(?:date|day)?|Born(?:\s+on)?)"
    r"[\s:.\-]*" + _DATE_VALUE,
    re.IGNORECASE,
)

# Patient name after common clinical label prefixes.
# Requires ≥2 capitalised words to reduce false positives on single-word
# clinical terms (e.g. "Patient: Stable").
_NAME_LABEL = re.compile(
    r"(?:Patient(?:\s+Name)?|Pt\.?|Name)\s*[:.\-]\s*"
    r"([A-Z][a-zA-Z\-']+(?:\s+[A-Z][a-zA-Z\-']+){1,2})",
)

# ZIP codes — labeled
_ZIP = re.compile(
    r"(?:ZIP|Zip\s*Code|Postal\s*Code)\s*[:.\-]?\s*\d{5}(?:-\d{4})?",
    re.IGNORECASE,
)

# Account / insurance / policy numbers — labeled
_ACCOUNT = re.compile(
    r"(?:Account|Policy|Insurance|Member|Subscriber|Group)\s*"
    r"(?:No\.?|Number|#|ID)?\s*[:.\-#]?\s*\d{5,15}",
    re.IGNORECASE,
)

# IP addresses
_IP = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")

# URLs containing patient-identifying paths (conservative: only http/https)
_URL = re.compile(r"https?://[^\s\"'>]+", re.IGNORECASE)


# ── Core scrubbing logic ──────────────────────────────────────────────────────

@dataclass
class ScrubResult:
    text: str
    redactions: dict = field(default_factory=dict)  # category -> count

    @property
    def total(self) -> int:
        return sum(self.redactions.values())

    def log_summary(self, context: str = "") -> None:
        if not self.redactions:
            return
        ctx = f" [{context}]" if context else ""
        summary = ", ".join(f"{k}: {v}" for k, v in sorted(self.redactions.items()))
        logger.warning(
            f"PHI scrubber{ctx}: redacted {self.total} item(s) before cloud transmission — {summary}"
        )


def _apply(text: str, pattern: re.Pattern, token: str, counts: dict, key: str) -> str:
    """Apply one pattern, count matches, return scrubbed text."""
    matches = pattern.findall(text)
    if matches:
        counts[key] = counts.get(key, 0) + len(matches)
        text = pattern.sub(token, text)
    return text


def scrub(text: str, context: str = "") -> ScrubResult:
    """
    Scrub PHI from a single text string.

    Returns a ScrubResult whose `.text` is safe to transmit and whose
    `.redactions` dict maps category names to counts of items removed.
    """
    counts: dict = {}
    t = text
    t = _apply(t, _SSN,        _TOKEN["ssn"],     counts, "SSN")
    t = _apply(t, _PHONE,      _TOKEN["phone"],   counts, "phone")
    t = _apply(t, _EMAIL,      _TOKEN["email"],   counts, "email")
    t = _apply(t, _MRN,        _TOKEN["mrn"],     counts, "MRN")
    t = _apply(t, _DOB,        _TOKEN["dob"],     counts, "DOB")
    t = _apply(t, _NAME_LABEL, _TOKEN["name"],    counts, "name")
    t = _apply(t, _ZIP,        _TOKEN["zip"],     counts, "ZIP")
    t = _apply(t, _ACCOUNT,    _TOKEN["account"], counts, "account")
    t = _apply(t, _IP,         _TOKEN["ip"],      counts, "IP")
    t = _apply(t, _URL,        _TOKEN["url"],     counts, "URL")

    result = ScrubResult(text=t, redactions=counts)
    result.log_summary(context)
    return result


def scrub_messages(messages: list[dict], context: str = "") -> tuple[list[dict], int]:
    """
    Scrub PHI from all outbound message content blocks.

    Handles both string content and structured content arrays (text + image
    blocks).  Image blocks are left untouched — Vision OCR images of patient
    documents should only be sent in local LLM mode, never to the cloud.

    Returns (scrubbed_messages, total_items_redacted).
    """
    total = 0
    scrubbed = []
    for msg in messages:
        content = msg.get("content")
        if isinstance(content, str):
            r = scrub(content, context)
            total += r.total
            scrubbed.append({**msg, "content": r.text})
        elif isinstance(content, list):
            new_blocks = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    r = scrub(block["text"], context)
                    total += r.total
                    new_blocks.append({**block, "text": r.text})
                else:
                    new_blocks.append(block)
            scrubbed.append({**msg, "content": new_blocks})
        else:
            scrubbed.append(msg)
    return scrubbed, total
