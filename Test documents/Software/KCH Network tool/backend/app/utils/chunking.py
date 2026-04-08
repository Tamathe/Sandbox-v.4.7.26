"""Medical-aware document chunking.

Strategy:
1. Split by section headers (medical document patterns)
2. Within sections, split by paragraphs
3. Merge small chunks, split large ones at sentence boundaries
4. Prepend section hierarchy to each chunk for context
5. Maintain overlap between chunks for retrieval continuity
"""

import re
from dataclasses import dataclass, field

import tiktoken

from app.utils.parsers import ParsedDocument, ParsedPage

# Target chunk size in tokens
TARGET_TOKENS = 512
MAX_TOKENS = 700
MIN_TOKENS = 100
OVERLAP_TOKENS = 50

# Tokenizer for counting
_enc = tiktoken.get_encoding("cl100k_base")


def count_tokens(text: str) -> int:
    return len(_enc.encode(text))


@dataclass
class DocumentChunk:
    text: str
    document_id: str
    page_number: int
    section_path: str
    chunk_index: int
    token_count: int = 0

    def __post_init__(self):
        if not self.token_count:
            self.token_count = count_tokens(self.text)


# Patterns for medical document section headers
SECTION_PATTERNS = [
    # Roman numerals
    r"^(?:I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\.\s+\S",
    # Numbered sections
    r"^\d{1,2}\.\d{0,2}\.?\s+[A-Z]",
    # Common medical policy headers (ALL CAPS)
    r"^(?:PURPOSE|SCOPE|POLICY|PROCEDURE|DEFINITIONS|REFERENCES|"
    r"RESPONSIBILITIES|EQUIPMENT|DOCUMENTATION|ASSESSMENT|"
    r"DIAGNOSIS|TREATMENT|MONITORING|DISCHARGE|INDICATIONS|"
    r"CONTRAINDICATIONS|PRECAUTIONS|COMPLICATIONS|FOLLOW[- ]UP|"
    r"ELIGIBILITY|CRITERIA|OVERVIEW|BACKGROUND|INTRODUCTION|"
    r"APPENDIX|ATTACHMENT|REVISION HISTORY)\s*:?\s*$",
    # Title case headers on their own line
    r"^(?:Purpose|Scope|Policy Statement|Procedure|Definitions|"
    r"Assessment|Treatment Plan|Clinical Guidelines|"
    r"Patient Safety|Quality Measures)\s*:?\s*$",
    # Step-based protocols
    r"^Step\s+\d+[:.]\s+",
    # Letter-based sections
    r"^[A-Z]\.\s+[A-Z]",
]
SECTION_RE = re.compile("|".join(SECTION_PATTERNS), re.MULTILINE)


def _detect_sections(text: str) -> list[tuple[str, str]]:
    """Split text into (header, body) tuples by section headers."""
    matches = list(SECTION_RE.finditer(text))

    if not matches:
        return [("", text)]

    sections = []
    # Text before first section header
    if matches[0].start() > 0:
        preamble = text[: matches[0].start()].strip()
        if preamble:
            sections.append(("", preamble))

    for i, match in enumerate(matches):
        header_line = match.group().strip()
        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start + len(header_line) : end].strip()

        # Clean header
        header = header_line.rstrip(":").strip()
        sections.append((header, body))

    return sections


def _split_by_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs."""
    paragraphs = re.split(r"\n\s*\n", text)
    return [p.strip() for p in paragraphs if p.strip()]


def _split_by_sentences(text: str) -> list[str]:
    """Split text into sentences, handling medical abbreviations."""
    # Protect common abbreviations from splitting
    protected = text
    abbreviations = ["Dr.", "Mr.", "Mrs.", "Ms.", "Jr.", "Sr.", "vs.", "etc.",
                     "i.e.", "e.g.", "Vol.", "No.", "Fig.", "pt.", "mg.",
                     "mL.", "kg.", "hr.", "min.", "sec.", "approx."]
    for abbr in abbreviations:
        protected = protected.replace(abbr, abbr.replace(".", "<DOT>"))

    sentences = re.split(r"(?<=[.!?])\s+", protected)
    return [s.replace("<DOT>", ".").strip() for s in sentences if s.strip()]


def _merge_small_chunks(chunks: list[str]) -> list[str]:
    """Merge chunks that are too small."""
    merged = []
    buffer = ""

    for chunk in chunks:
        if not buffer:
            buffer = chunk
        elif count_tokens(buffer + "\n\n" + chunk) <= TARGET_TOKENS:
            buffer = buffer + "\n\n" + chunk
        else:
            merged.append(buffer)
            buffer = chunk

    if buffer:
        merged.append(buffer)

    return merged


def _split_large_chunk(text: str) -> list[str]:
    """Split a chunk that exceeds MAX_TOKENS at sentence boundaries."""
    if count_tokens(text) <= MAX_TOKENS:
        return [text]

    sentences = _split_by_sentences(text)
    chunks = []
    current = ""

    for sentence in sentences:
        candidate = (current + " " + sentence).strip() if current else sentence
        if count_tokens(candidate) <= TARGET_TOKENS:
            current = candidate
        else:
            if current:
                chunks.append(current)
            current = sentence

    if current:
        chunks.append(current)

    return chunks


def _add_overlap(chunks: list[str]) -> list[str]:
    """Add overlapping text between consecutive chunks."""
    if len(chunks) <= 1:
        return chunks

    result = [chunks[0]]
    for i in range(1, len(chunks)):
        prev_sentences = _split_by_sentences(chunks[i - 1])
        overlap_text = ""

        # Take sentences from end of previous chunk until we hit OVERLAP_TOKENS
        for sent in reversed(prev_sentences):
            candidate = (sent + " " + overlap_text).strip() if overlap_text else sent
            if count_tokens(candidate) > OVERLAP_TOKENS:
                break
            overlap_text = candidate

        if overlap_text:
            result.append(overlap_text + "\n\n" + chunks[i])
        else:
            result.append(chunks[i])

    return result


def chunk_document(
    doc: ParsedDocument,
    document_id: str,
) -> list[DocumentChunk]:
    """Chunk a parsed document using medical-aware strategy.

    Pipeline:
    1. Build page-to-text mapping for page number tracking
    2. Detect sections in full text
    3. Split each section into paragraph-level chunks
    4. Merge small chunks, split large ones
    5. Add overlap between consecutive chunks
    6. Prepend section path as context prefix
    """
    chunks: list[DocumentChunk] = []
    chunk_index = 0

    # Build a mapping of text positions to page numbers
    page_map: list[tuple[int, int, int]] = []  # (start, end, page_num)
    offset = 0
    full_text_parts = []
    for page in doc.pages:
        start = offset
        full_text_parts.append(page.text)
        offset += len(page.text) + 2  # +2 for "\n\n" join
        page_map.append((start, offset, page.page_number))

    full_text = "\n\n".join(full_text_parts)

    def _get_page_number(chunk_text: str) -> int:
        """Find which page a chunk most likely belongs to."""
        pos = full_text.find(chunk_text[:100])
        if pos == -1:
            return 1
        for start, end, page_num in page_map:
            if start <= pos < end:
                return page_num
        return 1

    # Detect sections
    sections = _detect_sections(full_text)

    for section_header, section_body in sections:
        if not section_body.strip():
            continue

        # Split into paragraphs
        paragraphs = _split_by_paragraphs(section_body)

        # Merge small paragraphs
        merged = _merge_small_chunks(paragraphs)

        # Split large chunks
        split_chunks = []
        for chunk_text in merged:
            split_chunks.extend(_split_large_chunk(chunk_text))

        # Add overlap
        overlapped = _add_overlap(split_chunks)

        # Create chunk objects with section context
        for text in overlapped:
            if not text.strip():
                continue

            # Prepend section path for context
            prefix = f"[Section: {section_header}]\n" if section_header else ""
            full_chunk_text = prefix + text

            page_num = _get_page_number(text)

            chunks.append(DocumentChunk(
                text=full_chunk_text,
                document_id=document_id,
                page_number=page_num,
                section_path=section_header,
                chunk_index=chunk_index,
            ))
            chunk_index += 1

    # Fallback: if no chunks were created, chunk the raw text
    if not chunks:
        paragraphs = _split_by_paragraphs(full_text)
        merged = _merge_small_chunks(paragraphs)
        for text in merged:
            for part in _split_large_chunk(text):
                if part.strip():
                    chunks.append(DocumentChunk(
                        text=part,
                        document_id=document_id,
                        page_number=_get_page_number(part),
                        section_path="",
                        chunk_index=chunk_index,
                    ))
                    chunk_index += 1

    return chunks
