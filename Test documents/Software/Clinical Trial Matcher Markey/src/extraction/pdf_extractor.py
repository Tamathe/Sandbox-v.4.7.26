"""
Raw PDF text extraction using PyMuPDF with pdfplumber fallback.
For scanned/image-only PDFs, falls back to Claude Vision OCR.
Handles digital and scanned PDFs from any source.
"""

import base64
import hashlib
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Cache directory for extracted PDF text (persists across sessions)
_CACHE_DIR = Path(__file__).parent.parent.parent / "output" / "pdf_text_cache"


def _pdf_cache_path(pdf_path: Path) -> Path:
    """Return cache file path based on SHA-256 of the PDF's content."""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()[:16]
    safe_stem = pdf_path.stem[:40].replace(" ", "_")
    return _CACHE_DIR / f"{safe_stem}_{digest}.txt"


def extract_text_from_pdf(pdf_path: str | Path) -> str:
    """
    Extract text from a PDF file.

    Strategy (fastest → slowest):
    1. Disk cache — returns instantly if this exact PDF was processed before
    2. PyMuPDF native text extraction — works for digital/searchable PDFs
    3. pdfplumber fallback — better table handling for some PDFs
    4. Vision OCR — last resort for scanned/image-only PDFs where text extraction
       returns nothing meaningful. In local mode, sends pages to the local LLM
       (LM Studio); in cloud mode, sends to Anthropic Claude Vision.

    Results are cached to disk by file content hash so re-uploading the same PDF
    skips all extraction and loads instantly.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    cache_path = _pdf_cache_path(pdf_path)
    if cache_path.exists():
        logger.info(f"Loading cached text for {pdf_path.name} ({cache_path.name})")
        return cache_path.read_text(encoding="utf-8")

    # Try native text extraction first (no API call, no PHI transmitted)
    text = _extract_with_pymupdf(pdf_path)
    if len(text.strip()) < 100:
        text = _extract_with_pdfplumber(pdf_path)

    if len(text.strip()) >= 100:
        logger.info(f"Native text extraction succeeded for {pdf_path.name} ({len(text)} chars)")
    else:
        # PDF is scanned/image-only — fall back to Vision OCR
        logger.info(f"Native extraction insufficient for {pdf_path.name} — using Vision OCR")
        text = _extract_with_claude_vision(pdf_path)

    if not text or len(text.strip()) < 50:
        logger.warning(
            f"Vision OCR found no content in {pdf_path.name}. "
            "The file may be corrupted or an unsupported format."
        )
    else:
        cache_path.write_text(text, encoding="utf-8")
        logger.info(f"Cached extracted text for {pdf_path.name} → {cache_path.name}")

    return text


def _extract_with_pymupdf(pdf_path: Path) -> str:
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(str(pdf_path))
        pages = []
        for page in doc:
            pages.append(page.get_text("text"))
        doc.close()
        return "\n".join(pages)
    except Exception as e:
        logger.warning(f"PyMuPDF failed on {pdf_path.name}: {e}")
        return ""


def _extract_with_pdfplumber(pdf_path: Path) -> str:
    try:
        import pdfplumber
        pages = []
        with pdfplumber.open(str(pdf_path)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text() or ""
                # Extract tables as delimited text
                for table in page.extract_tables():
                    rows = []
                    for row in table:
                        rows.append(" | ".join(cell or "" for cell in row))
                    page_text += "\n" + "\n".join(rows)
                pages.append(page_text)
        return "\n".join(pages)
    except Exception as e:
        logger.warning(f"pdfplumber failed on {pdf_path.name}: {e}")
        return ""


def _extract_with_claude_vision(pdf_path: Path, max_pages: int = 12) -> str:
    """
    OCR a scanned PDF by rendering each page to an image and sending it to
    Claude Vision. Pages are batched (up to 5 per API call) to minimise
    round-trips while staying within Claude's image limits.
    """
    try:
        import fitz  # PyMuPDF — used only for rendering, not text extraction

        doc = fitz.open(str(pdf_path))
        total_pages = min(len(doc), max_pages)
        logger.info(f"Claude Vision OCR: rendering {total_pages} pages from {pdf_path.name}")

        # Render all pages to base64-encoded PNG images
        page_images: list[str] = []
        mat = fitz.Matrix(1.5, 1.5)  # 108 DPI — good balance of quality vs token size
        for i in range(total_pages):
            pix = doc[i].get_pixmap(matrix=mat)
            page_images.append(base64.b64encode(pix.tobytes("png")).decode())
        doc.close()

        import config as _cfg
        from src.llm_client import LLMClient, make_image_block, get_vision_model
        client = LLMClient()
        all_text: list[str] = []
        # Local LLM context is 4096 tokens total; one page image uses ~1400 tokens,
        # leaving ~1200 for the prompt text + ~1500 for the transcription response.
        # Cloud Claude supports up to 20 images per call — use 5 for a good balance.
        batch_size = 1 if _cfg.USE_LOCAL_LLM else 5

        for batch_start in range(0, len(page_images), batch_size):
            batch = page_images[batch_start: batch_start + batch_size]
            batch_end = batch_start + len(batch)

            content = []
            for idx, img_b64 in enumerate(batch):
                page_num = batch_start + idx + 1
                content.append({"type": "text", "text": f"--- Page {page_num} ---"})
                content.append(make_image_block(img_b64))

            content.append({
                "type": "text",
                "text": (
                    "Transcribe all text from each page above exactly as it appears. "
                    "Preserve medical data, dates, values, headings, and structure. "
                    "Label each page's text with '--- Page N ---'. "
                    "Output transcribed text only — no commentary."
                ),
            })

            logger.info(
                f"Vision OCR: sending pages {batch_start + 1}–{batch_end} "
                f"of {total_pages}"
            )
            # In local mode, cap response tokens so input + output fits in 4096-token context.
            # One page image ≈ 1400 tokens + prompt ≈ 100 tokens → ~1500 tokens for output.
            max_response_tokens = 1500 if _cfg.USE_LOCAL_LLM else 4096
            response = client.messages.create(
                model=get_vision_model(),
                max_tokens=max_response_tokens,
                messages=[{"role": "user", "content": content}],
            )
            all_text.append(response.content[0].text)

        result = "\n\n".join(all_text)
        logger.info(
            f"Claude Vision OCR complete for {pdf_path.name}: "
            f"{len(result)} chars extracted"
        )
        return result

    except Exception as e:
        logger.warning(f"Claude Vision OCR failed for {pdf_path.name}: {e}")
        return ""


def detect_report_vendor(text: str, filename: str = "") -> str:
    """
    Identify the genomic report vendor from text content or filename.
    Returns: 'caris', 'guardant360', 'tempus', 'foundationone', or 'unknown'
    """
    filename_lower = filename.lower()
    text_lower = text.lower()[:2000]  # Check first 2000 chars

    if "caris" in filename_lower or "caris" in text_lower:
        return "caris"
    if "guardant" in filename_lower or "guardant" in text_lower:
        return "guardant360"
    if "tempus" in filename_lower or "tempus" in text_lower:
        return "tempus"
    if "foundationone" in filename_lower or "foundation medicine" in text_lower or "foundationone" in text_lower:
        return "foundationone"
    return "unknown"
