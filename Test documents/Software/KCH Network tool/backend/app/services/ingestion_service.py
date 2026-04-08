"""Document ingestion pipeline: parse → chunk → embed → store."""

import json
import uuid
import shutil
import logging
from pathlib import Path

import chromadb

from app.config import settings
from app.database import get_db
from app.utils.parsers import parse_document
from app.utils.chunking import chunk_document
from app.services.embedding_service import embed_texts

logger = logging.getLogger(__name__)

# ChromaDB client (persistent)
_chroma_client: chromadb.ClientAPI | None = None


def _get_chroma() -> chromadb.ClientAPI:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _chroma_client


def get_collection() -> chromadb.Collection:
    client = _get_chroma()
    return client.get_or_create_collection(
        name=settings.chroma_collection_name,
        metadata={"hnsw:space": "cosine"},
    )


def ingest_document(
    file_path: str,
    document_id: str,
    title: str,
    document_type: str | None = None,
    department: str | None = None,
    hospital_site: str | None = None,
    tags: list[str] | None = None,
    uploaded_by: str | None = None,
) -> dict:
    """Full ingestion pipeline for a single document.

    1. Parse the document
    2. Chunk with medical-aware strategy
    3. Generate embeddings
    4. Store in ChromaDB + update SQLite metadata

    Returns document metadata dict.
    """
    file_path_obj = Path(file_path)
    original_filename = file_path_obj.name

    try:
        # Update status to processing
        with get_db() as conn:
            conn.execute(
                "UPDATE documents SET status = 'processing' WHERE id = ?",
                (document_id,),
            )

        # 1. Parse
        logger.info(f"Parsing document: {original_filename}")
        parsed = parse_document(file_path)

        # 2. Chunk
        logger.info(f"Chunking document: {len(parsed.pages)} pages")
        chunks = chunk_document(parsed, document_id)
        logger.info(f"Created {len(chunks)} chunks")

        if not chunks:
            raise ValueError("Document produced no chunks after parsing")

        # 3. Embed
        logger.info(f"Generating embeddings for {len(chunks)} chunks")
        chunk_texts = [c.text for c in chunks]
        embeddings = embed_texts(chunk_texts)

        # 4. Store in ChromaDB
        logger.info("Storing in ChromaDB")
        collection = get_collection()

        ids = [f"{document_id}_chunk_{c.chunk_index}" for c in chunks]
        metadatas = [
            {
                "document_id": c.document_id,
                "page_number": c.page_number,
                "section_path": c.section_path,
                "chunk_index": c.chunk_index,
                "document_type": document_type or "",
                "department": department or "",
                "hospital_site": hospital_site or "",
            }
            for c in chunks
        ]

        # Upsert in batches (ChromaDB limit is ~5000 per batch)
        batch_size = 500
        for i in range(0, len(ids), batch_size):
            end = i + batch_size
            collection.upsert(
                ids=ids[i:end],
                embeddings=embeddings[i:end],
                documents=chunk_texts[i:end],
                metadatas=metadatas[i:end],
            )

        # 5. Update SQLite
        with get_db() as conn:
            conn.execute(
                """UPDATE documents
                   SET status = 'ready',
                       page_count = ?,
                       chunk_count = ?,
                       updated_at = datetime('now')
                   WHERE id = ?""",
                (parsed.total_pages, len(chunks), document_id),
            )

        logger.info(f"Document ingested successfully: {document_id}")
        return {
            "document_id": document_id,
            "pages": parsed.total_pages,
            "chunks": len(chunks),
            "status": "ready",
        }

    except Exception as e:
        logger.error(f"Ingestion failed for {document_id}: {e}")
        with get_db() as conn:
            conn.execute(
                "UPDATE documents SET status = 'error', updated_at = datetime('now') WHERE id = ?",
                (document_id,),
            )
        raise


def delete_document_chunks(document_id: str):
    """Remove all chunks for a document from ChromaDB."""
    collection = get_collection()
    # Get all chunk IDs for this document
    results = collection.get(
        where={"document_id": document_id},
    )
    if results["ids"]:
        collection.delete(ids=results["ids"])


def save_uploaded_file(file_content: bytes, original_filename: str) -> tuple[str, str]:
    """Save an uploaded file and return (document_id, file_path)."""
    document_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix.lower()
    filename = f"{document_id}{ext}"
    file_path = Path(settings.upload_dir) / filename

    file_path.write_bytes(file_content)

    return document_id, str(file_path), filename
