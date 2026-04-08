"""Search and conversation endpoints."""

import json

from fastapi import APIRouter, Depends

from app.schemas import (
    SearchRequest,
    SearchResponse,
    ConversationResponse,
    ConversationListItem,
    ConversationMessage,
    SourceReference,
)
from app.dependencies import get_current_user
from app.database import get_db
from app.services.rag_service import execute_search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest, user: dict = Depends(get_current_user)):
    """Execute a RAG search query."""
    return execute_search(request, user["id"])


@router.get("/history", response_model=list[ConversationListItem])
async def get_search_history(
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    """Get user's recent conversations."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT c.id, c.title, c.created_at, c.updated_at,
                      COUNT(q.id) as message_count
               FROM conversations c
               LEFT JOIN query_log q ON q.conversation_id = c.id
               WHERE c.user_id = ?
               GROUP BY c.id
               ORDER BY COALESCE(c.updated_at, c.created_at) DESC
               LIMIT ?""",
            (user["id"], limit),
        ).fetchall()

        return [
            ConversationListItem(
                id=row["id"],
                title=row["title"],
                message_count=row["message_count"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            )
            for row in rows
        ]


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Get all messages in a conversation."""
    with get_db() as conn:
        conv_row = conn.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
            (conversation_id, user["id"]),
        ).fetchone()

        if not conv_row:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages_rows = conn.execute(
            """SELECT id, query_text, response_text, confidence_score,
                      source_document_ids, created_at
               FROM query_log
               WHERE conversation_id = ?
               ORDER BY created_at ASC""",
            (conversation_id,),
        ).fetchall()

        messages = []
        for row in messages_rows:
            # Parse source document IDs and build source references
            sources = []
            source_ids = []
            if row["source_document_ids"]:
                try:
                    source_ids = json.loads(row["source_document_ids"])
                except (json.JSONDecodeError, TypeError):
                    pass

            for doc_id in source_ids:
                doc_row = conn.execute(
                    "SELECT title FROM documents WHERE id = ?", (doc_id,)
                ).fetchone()
                if doc_row:
                    sources.append(SourceReference(
                        document_id=doc_id,
                        title=doc_row["title"],
                        section=None,
                        page=None,
                        snippet="",
                        relevance=0.0,
                    ))

            confidence = "MEDIUM"
            if row["confidence_score"]:
                if row["confidence_score"] >= 0.8:
                    confidence = "HIGH"
                elif row["confidence_score"] >= 0.5:
                    confidence = "MEDIUM"
                else:
                    confidence = "LOW"

            messages.append(ConversationMessage(
                id=row["id"],
                query=row["query_text"],
                answer=row["response_text"] or "",
                confidence=confidence,
                sources=sources,
                created_at=row["created_at"],
            ))

        return ConversationResponse(
            id=conv_row["id"],
            title=conv_row["title"],
            messages=messages,
            created_at=conv_row["created_at"],
        )
