"""Document management endpoints."""

import json
import uuid
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse

from app.config import settings
from app.schemas import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUpdate,
)
from app.dependencies import get_current_user, require_admin
from app.database import get_db
from app.services.ingestion_service import (
    ingest_document,
    delete_document_chunks,
    save_uploaded_file,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


def _row_to_response(row: dict) -> DocumentResponse:
    tags = None
    if row.get("tags"):
        try:
            tags = json.loads(row["tags"])
        except (json.JSONDecodeError, TypeError):
            tags = None

    return DocumentResponse(
        id=row["id"],
        filename=row["filename"],
        original_filename=row["original_filename"],
        title=row["title"],
        document_type=row.get("document_type"),
        department=row.get("department"),
        hospital_site=row.get("hospital_site"),
        version=row.get("version", "1.0"),
        tags=tags,
        uploaded_by=row.get("uploaded_by"),
        file_size=row.get("file_size"),
        page_count=row.get("page_count"),
        chunk_count=row.get("chunk_count"),
        status=row["status"],
        created_at=row["created_at"],
        updated_at=row.get("updated_at"),
    )


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(...),
    document_type: str = Form(None),
    department: str = Form(None),
    hospital_site: str = Form(None),
    tags: str = Form(None),  # JSON array string
    user: dict = Depends(require_admin),
):
    """Upload and ingest a document (admin only)."""
    # Validate file extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Validate file size
    content = await file.read()
    if len(content) > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {settings.max_file_size_mb}MB",
        )

    # Parse tags
    tag_list = None
    if tags:
        try:
            tag_list = json.loads(tags)
        except json.JSONDecodeError:
            tag_list = [t.strip() for t in tags.split(",") if t.strip()]

    # Save file
    document_id, file_path, filename = save_uploaded_file(content, file.filename)

    # Create document record
    with get_db() as conn:
        conn.execute(
            """INSERT INTO documents
               (id, filename, original_filename, title, document_type, department,
                hospital_site, tags, uploaded_by, file_size, status)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing')""",
            (
                document_id,
                filename,
                file.filename,
                title,
                document_type,
                department,
                hospital_site,
                json.dumps(tag_list) if tag_list else None,
                user["id"],
                len(content),
            ),
        )

        # Log access
        conn.execute(
            "INSERT INTO access_log (id, user_id, document_id, action) VALUES (?, ?, ?, 'upload')",
            (str(uuid.uuid4()), user["id"], document_id),
        )

    # Run ingestion in background
    background_tasks.add_task(
        ingest_document,
        file_path=file_path,
        document_id=document_id,
        title=title,
        document_type=document_type,
        department=department,
        hospital_site=hospital_site,
        tags=tag_list,
        uploaded_by=user["id"],
    )

    # Return immediately with processing status
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        return _row_to_response(dict(row))


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    status: str | None = None,
    document_type: str | None = None,
    hospital_site: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
    user: dict = Depends(get_current_user),
):
    """List documents with optional filters."""
    conditions = ["1=1"]
    params: list = []

    if status:
        conditions.append("status = ?")
        params.append(status)
    if document_type:
        conditions.append("document_type = ?")
        params.append(document_type)
    if hospital_site:
        conditions.append("hospital_site = ?")
        params.append(hospital_site)
    if search:
        conditions.append("(title LIKE ? OR original_filename LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])

    where = " AND ".join(conditions)

    with get_db() as conn:
        # Get total count
        count_row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM documents WHERE {where}", params
        ).fetchone()
        total = count_row["cnt"]

        # Get page
        rows = conn.execute(
            f"SELECT * FROM documents WHERE {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ).fetchall()

        documents = [_row_to_response(dict(r)) for r in rows]
        return DocumentListResponse(documents=documents, total=total)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: str, user: dict = Depends(get_current_user)):
    """Get document details."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        # Log access
        conn.execute(
            "INSERT INTO access_log (id, user_id, document_id, action) VALUES (?, ?, ?, 'view')",
            (str(uuid.uuid4()), user["id"], document_id),
        )

        return _row_to_response(dict(row))


@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    data: DocumentUpdate,
    user: dict = Depends(require_admin),
):
    """Update document metadata (admin only)."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        updates = []
        params = []
        if data.title is not None:
            updates.append("title = ?")
            params.append(data.title)
        if data.document_type is not None:
            updates.append("document_type = ?")
            params.append(data.document_type)
        if data.department is not None:
            updates.append("department = ?")
            params.append(data.department)
        if data.hospital_site is not None:
            updates.append("hospital_site = ?")
            params.append(data.hospital_site)
        if data.tags is not None:
            updates.append("tags = ?")
            params.append(json.dumps(data.tags))

        if updates:
            updates.append("updated_at = datetime('now')")
            params.append(document_id)
            conn.execute(
                f"UPDATE documents SET {', '.join(updates)} WHERE id = ?",
                params,
            )

        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        return _row_to_response(dict(row))


@router.delete("/{document_id}")
async def delete_document(document_id: str, user: dict = Depends(require_admin)):
    """Delete a document and its chunks (admin only)."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        doc = dict(row)

        # Delete from ChromaDB
        try:
            delete_document_chunks(document_id)
        except Exception as e:
            logger.warning(f"Error deleting chunks from ChromaDB: {e}")

        # Delete file
        file_path = Path(settings.upload_dir) / doc["filename"]
        if file_path.exists():
            file_path.unlink()

        # Delete from SQLite
        conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))

        # Log
        conn.execute(
            "INSERT INTO access_log (id, user_id, document_id, action) VALUES (?, ?, ?, 'delete')",
            (str(uuid.uuid4()), user["id"], document_id),
        )

    return {"message": "Document deleted"}


MIME_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".md": "text/markdown",
}


@router.get("/{document_id}/download")
async def download_document(document_id: str, user: dict = Depends(get_current_user)):
    """Download the original document file. Accepts auth via header or ?token= query param."""
    with get_db() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")

        doc = dict(row)
        file_path = Path(settings.upload_dir) / doc["filename"]
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File not found on disk")

        # Log access
        conn.execute(
            "INSERT INTO access_log (id, user_id, document_id, action) VALUES (?, ?, ?, 'download')",
            (str(uuid.uuid4()), user["id"], document_id),
        )

    ext = Path(doc["original_filename"]).suffix.lower()
    media_type = MIME_TYPES.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        filename=doc["original_filename"],
        media_type=media_type,
        content_disposition_type="inline",
    )
