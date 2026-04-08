"""
Shared utilities used across the pipeline.
"""

import json
from enum import Enum


# ── Eligibility label constants ─────────────────────────────────────────────

class InclusionLabel(str, Enum):
    INCLUDED = "included"
    NOT_INCLUDED = "not_included"
    NOT_ENOUGH_INFO = "not_enough_information"
    NOT_APPLICABLE = "not_applicable"


class ExclusionLabel(str, Enum):
    EXCLUDED = "excluded"
    NOT_EXCLUDED = "not_excluded"
    NOT_ENOUGH_INFO = "not_enough_information"
    NOT_APPLICABLE = "not_applicable"


INCLUSION_LABELS = [e.value for e in InclusionLabel]
EXCLUSION_LABELS = [e.value for e in ExclusionLabel]


# ── JSON extraction ──────────────────────────────────────────────────────────

def extract_json(text: str) -> dict | list:
    """
    Extract JSON from an LLM response, stripping markdown code fences if present.
    Handles both ```json ... ``` and plain JSON responses.
    Falls back to partial recovery for truncated JSON arrays.
    """
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove opening fence (```json or ```) and closing fence (```)
        inner = lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
        text = "\n".join(inner)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return _repair_truncated_json(text)


def _repair_truncated_json(text: str) -> dict | list:
    """
    Recover complete JSON objects from a truncated JSON array.

    When Claude's response is cut off mid-array (e.g. max_tokens reached),
    this extracts all fully-formed objects that were parsed before the cutoff.
    Raises json.JSONDecodeError if nothing can be recovered.
    """
    stripped = text.strip()
    if stripped.startswith("{"):
        obj = _extract_first_json_object(stripped)
        if obj is not None:
            return obj
        raise json.JSONDecodeError("Not a complete JSON object and not repairable", text, 0)
    if not stripped.startswith("["):
        obj = _extract_first_json_object(stripped)
        if obj is not None:
            return obj
        raise json.JSONDecodeError("Not a JSON array and not repairable", text, 0)

    objects: list = []
    depth = 0
    start: int | None = None
    in_string = False
    escape_next = False

    for i, ch in enumerate(stripped):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    obj = json.loads(stripped[start : i + 1])
                    objects.append(obj)
                except json.JSONDecodeError:
                    pass
                start = None

    if objects:
        return objects

    raise json.JSONDecodeError("Could not recover any objects from truncated JSON", text, 0)


def _extract_first_json_object(text: str) -> dict | None:
    """Extract the first balanced JSON object from free text."""
    depth = 0
    start: int | None = None
    in_string = False
    escape_next = False

    for i, ch in enumerate(text):
        if escape_next:
            escape_next = False
            continue
        if ch == "\\" and in_string:
            escape_next = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                try:
                    return json.loads(text[start : i + 1])
                except json.JSONDecodeError:
                    return None
    return None
