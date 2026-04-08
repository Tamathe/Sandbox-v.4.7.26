"""Document parsers for PDF, DOCX, TXT, and MD files."""

import base64
import logging
import re
from pathlib import Path
from dataclasses import dataclass, field

import fitz  # PyMuPDF
from docx import Document as DocxDocument
import chardet
from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)

# Minimum characters of extracted text before we consider a page "text-light"
_MIN_TEXT_CHARS = 50

_VISION_PROMPT = """Extract ALL text and information from this medical document page image.

If this is a flowchart or algorithm:
- Describe the complete decision flow from start to end
- For each decision node, state the condition and both YES/NO paths
- Preserve all criteria, thresholds, dosages, and clinical values exactly
- Use arrow notation (→) to show flow direction

If this is a table:
- Reproduce the table content with clear headers and rows

If this is a diagram or illustration:
- Describe all labeled components and relationships

Output the extracted content as plain text, preserving the logical structure.
Do NOT add interpretation — just extract what is written/shown."""


def _extract_page_image_text(page: fitz.Page) -> str:
    """Render a PDF page to an image and extract text via OpenAI Vision."""
    try:
        client = OpenAI(api_key=settings.openai_api_key)

        # Render page at 2x resolution for clarity
        pix = page.get_pixmap(dpi=200)
        img_bytes = pix.tobytes("png")
        b64_image = base64.b64encode(img_bytes).decode("utf-8")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": _VISION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{b64_image}",
                                "detail": "high",
                            },
                        },
                    ],
                }
            ],
            max_tokens=4096,
        )

        extracted = response.choices[0].message.content or ""
        logger.info(f"  Vision OCR extracted {len(extracted)} chars from page {page.number + 1}")
        return extracted.strip()

    except Exception as e:
        logger.warning(f"  Vision OCR failed for page {page.number + 1}: {e}")
        return ""


@dataclass
class ParsedPage:
    page_number: int
    text: str
    headings: list[str] = field(default_factory=list)


@dataclass
class ParsedDocument:
    pages: list[ParsedPage]
    total_pages: int
    title: str = ""
    metadata: dict = field(default_factory=dict)

    @property
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages)


def parse_pdf(file_path: str) -> ParsedDocument:
    """Extract text from PDF, preserving page numbers and structure.

    Pages with little/no extractable text (e.g. flowchart images) are sent
    to GPT-4o-mini vision for OCR extraction.
    """
    doc = fitz.open(file_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text").strip()

        # Detect headings by looking at larger font sizes
        headings = []
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    if span["size"] > 12 and span["text"].strip():
                        headings.append(span["text"].strip())

        # If page has very little text, try vision OCR
        if len(text) < _MIN_TEXT_CHARS:
            logger.info(f"Page {page_num + 1}: only {len(text)} chars of text, attempting vision OCR...")
            vision_text = _extract_page_image_text(page)
            if vision_text:
                text = f"[Extracted from image/flowchart]\n{vision_text}"
                # Try to pull headings from the extracted text
                header_lines = [
                    line.strip()
                    for line in vision_text.split("\n")[:3]
                    if line.strip() and len(line.strip()) < 100
                ]
                if header_lines:
                    headings = header_lines[:1]

        pages.append(ParsedPage(
            page_number=page_num + 1,
            text=text,
            headings=headings,
        ))

    title = doc.metadata.get("title", "") if doc.metadata else ""
    doc.close()

    return ParsedDocument(
        pages=pages,
        total_pages=len(pages),
        title=title,
        metadata=dict(doc.metadata) if doc.metadata else {},
    )


def _extract_docx_image_text(file_path: str) -> list[ParsedPage]:
    """Extract text from images embedded in a DOCX via OpenAI Vision."""
    import io
    import zipfile
    from PIL import Image

    pages = []
    try:
        client = OpenAI(api_key=settings.openai_api_key)
        z = zipfile.ZipFile(file_path)
        image_files = sorted(f for f in z.namelist() if f.startswith("word/media/"))

        for i, img_path in enumerate(image_files):
            try:
                img_data = z.read(img_path)
                img = Image.open(io.BytesIO(img_data))
                # Convert to PNG for the API
                buf = io.BytesIO()
                img.convert("RGB").save(buf, format="PNG")
                b64_image = base64.b64encode(buf.getvalue()).decode("utf-8")

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": _VISION_PROMPT},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/png;base64,{b64_image}",
                                        "detail": "high",
                                    },
                                },
                            ],
                        }
                    ],
                    max_tokens=4096,
                )

                extracted = response.choices[0].message.content or ""
                if extracted.strip():
                    logger.info(f"  DOCX image {i + 1}: Vision OCR extracted {len(extracted)} chars")
                    header_lines = [
                        line.strip()
                        for line in extracted.split("\n")[:3]
                        if line.strip() and len(line.strip()) < 100
                    ]
                    pages.append(ParsedPage(
                        page_number=i + 1,
                        text=f"[Extracted from image/flowchart]\n{extracted.strip()}",
                        headings=header_lines[:1],
                    ))
            except Exception as e:
                logger.warning(f"  DOCX image {i + 1} extraction failed: {e}")

    except Exception as e:
        logger.warning(f"  DOCX image extraction failed: {e}")

    return pages


def parse_docx(file_path: str) -> ParsedDocument:
    """Extract text from DOCX, preserving headings and structure.

    If the document has no text but contains images, uses vision OCR.
    """
    doc = DocxDocument(file_path)
    pages = []
    current_page_text = []
    current_headings = []
    page_num = 1

    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            current_page_text.append("")
            continue

        # Detect headings
        if para.style and para.style.name and para.style.name.startswith("Heading"):
            current_headings.append(text)

        current_page_text.append(text)

        # DOCX doesn't have true page breaks easily accessible,
        # so we treat the whole document as logical pages by section
        # Using paragraph count as rough page estimate (40 paragraphs ~ 1 page)
        if len(current_page_text) >= 40:
            pages.append(ParsedPage(
                page_number=page_num,
                text="\n".join(current_page_text),
                headings=current_headings,
            ))
            current_page_text = []
            current_headings = []
            page_num += 1

    # Add remaining content
    if current_page_text:
        pages.append(ParsedPage(
            page_number=page_num,
            text="\n".join(current_page_text),
            headings=current_headings,
        ))

    # If no meaningful text was extracted, try vision OCR on embedded images
    total_text = "".join(p.text for p in pages).strip()
    if len(total_text) < _MIN_TEXT_CHARS:
        logger.info(f"DOCX has only {len(total_text)} chars of text, attempting vision OCR on embedded images...")
        ocr_pages = _extract_docx_image_text(file_path)
        if ocr_pages:
            pages = ocr_pages

    title = doc.core_properties.title or ""

    return ParsedDocument(
        pages=pages,
        total_pages=len(pages),
        title=title,
    )


def parse_text(file_path: str) -> ParsedDocument:
    """Parse plain text or markdown files."""
    path = Path(file_path)

    # Detect encoding
    raw = path.read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    text = raw.decode(encoding, errors="replace")

    # Split into pages by double newlines or markdown headers
    sections = re.split(r"\n#{1,3}\s+", text)
    pages = []

    for i, section in enumerate(sections):
        section = section.strip()
        if not section:
            continue

        # Extract headings (lines starting with # in markdown)
        headings = re.findall(r"^#{1,6}\s+(.+)$", section, re.MULTILINE)

        pages.append(ParsedPage(
            page_number=i + 1,
            text=section,
            headings=headings,
        ))

    if not pages:
        pages.append(ParsedPage(page_number=1, text=text))

    return ParsedDocument(
        pages=pages,
        total_pages=len(pages),
    )


def parse_document(file_path: str) -> ParsedDocument:
    """Parse a document based on its file extension."""
    ext = Path(file_path).suffix.lower()

    parsers = {
        ".pdf": parse_pdf,
        ".docx": parse_docx,
        ".txt": parse_text,
        ".md": parse_text,
    }

    parser = parsers.get(ext)
    if parser is None:
        raise ValueError(f"Unsupported file format: {ext}")

    return parser(file_path)
