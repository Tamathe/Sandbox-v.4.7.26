"""Bulk-ingest all PDFs from source/downloads/ into the RAG system.

Run from the backend/ directory:
    python bulk_ingest.py

Requires:
    - .env file with OPENAI_API_KEY set (for embeddings)
    - Python venv activated with all dependencies installed
"""

import json
import os
import shutil
import sys
import uuid
from pathlib import Path

# Ensure app package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import settings
from app.database import init_db, get_db
from app.services.ingestion_service import ingest_document

# ── Paths ──
SOURCE_DIR = Path(__file__).resolve().parent.parent / "source" / "downloads"
UPLOAD_DIR = Path(settings.upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Supported extensions
SUPPORTED = {".pdf", ".docx", ".doc", ".txt", ".md"}


def title_from_filename(filename: str) -> str:
    """Derive a document title from the filename (strip extension)."""
    return Path(filename).stem


def guess_document_type(title: str) -> str:
    """Guess the document_type from the title."""
    lower = title.lower()
    if any(kw in lower for kw in ["protocol", "algorithm", "pathway"]):
        return "protocol"
    if any(kw in lower for kw in ["guideline", "criteria", "indications"]):
        return "guideline"
    if any(kw in lower for kw in ["policy", "order template"]):
        return "policy"
    if any(kw in lower for kw in ["handout", "info for families", "discharge"]):
        return "admin"
    return "other"


def main():
    # Verify API key is set
    if not settings.openai_api_key or settings.openai_api_key == "sk-your-key-here":
        print("ERROR: Set your OPENAI_API_KEY in backend/.env before running.")
        print("       Embeddings require a valid OpenAI API key.")
        sys.exit(1)

    # Initialize database tables
    print("Initializing database...")
    init_db()

    # Gather files
    files = sorted(
        f for f in SOURCE_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED
    )

    if not files:
        print(f"No supported files found in {SOURCE_DIR}")
        print(f"Supported extensions: {', '.join(SUPPORTED)}")
        sys.exit(1)

    print(f"Found {len(files)} files to ingest from {SOURCE_DIR}\n")

    # Check which are already ingested (by original_filename)
    with get_db() as conn:
        existing = {
            row["original_filename"]
            for row in conn.execute(
                "SELECT original_filename FROM documents WHERE status != 'error'"
            ).fetchall()
        }

    success = 0
    skipped = 0
    failed = []

    for i, file_path in enumerate(files, 1):
        title = title_from_filename(file_path.name)
        print(f"[{i}/{len(files)}] {title}")

        # Skip if already ingested
        if file_path.name in existing:
            print(f"  -> Already ingested, skipping")
            skipped += 1
            continue

        # Generate document ID and copy to uploads dir
        document_id = str(uuid.uuid4())
        ext = file_path.suffix.lower()
        dest_filename = f"{document_id}{ext}"
        dest_path = UPLOAD_DIR / dest_filename

        try:
            shutil.copy2(file_path, dest_path)
        except Exception as e:
            print(f"  -> COPY ERROR: {e}")
            failed.append((title, str(e)))
            continue

        # Insert document record into SQLite
        doc_type = guess_document_type(title)
        file_size = file_path.stat().st_size

        with get_db() as conn:
            conn.execute(
                """INSERT INTO documents
                   (id, filename, original_filename, title, document_type,
                    department, hospital_site, tags, file_size, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')""",
                (
                    document_id,
                    dest_filename,
                    file_path.name,
                    title,
                    doc_type,
                    "Pediatric Emergency Medicine",
                    "Kentucky Children's Hospital",
                    json.dumps(["PEM Handbook", "auto-imported"]),
                    file_size,
                ),
            )

        # Run ingestion pipeline
        try:
            result = ingest_document(
                file_path=str(dest_path),
                document_id=document_id,
                title=title,
                document_type=doc_type,
                department="Pediatric Emergency Medicine",
                hospital_site="Kentucky Children's Hospital",
                tags=["PEM Handbook", "auto-imported"],
            )
            pages = result.get("pages", "?")
            chunks = result.get("chunks", "?")
            print(f"  -> OK: {pages} pages, {chunks} chunks")
            success += 1

        except Exception as e:
            print(f"  -> INGEST ERROR: {e}")
            failed.append((title, str(e)))

    # Summary
    print(f"\n{'=' * 60}")
    print(f"DONE: {success} ingested, {skipped} skipped, {len(failed)} failed")
    print(f"Total documents in database: {success + skipped}")

    if failed:
        print(f"\nFailed:")
        for title, err in failed:
            print(f"  - {title}: {err}")

    # Show ChromaDB stats
    try:
        from app.services.ingestion_service import get_collection
        collection = get_collection()
        print(f"\nChromaDB collection '{settings.chroma_collection_name}': {collection.count()} vectors")
    except Exception:
        pass


if __name__ == "__main__":
    main()
