"""Full RAG orchestration pipeline."""

import json
import re
import time
import uuid
import logging

from app.database import get_db
from app.services.retrieval_service import search_documents, RetrievalResult
from app.services.llm_service import generate_response, generate_no_results_response
from app.schemas import SearchRequest, SearchResponse, SourceReference

logger = logging.getLogger(__name__)


def _get_document_title(document_id: str) -> str:
    """Look up document title from SQLite."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT title FROM documents WHERE id = ?", (document_id,)
        ).fetchone()
        return row["title"] if row else "Unknown Document"


def _extract_confidence(response_text: str) -> str:
    """Extract confidence level from Claude's response."""
    match = re.search(r"CONFIDENCE:\s*(HIGH|MEDIUM|LOW)", response_text, re.IGNORECASE)
    if match:
        return match.group(1).upper()
    return "MEDIUM"


def _clean_response(response_text: str) -> str:
    """Remove the CONFIDENCE line from the displayed response."""
    return re.sub(r"\n*CONFIDENCE:\s*(HIGH|MEDIUM|LOW)\s*$", "", response_text, flags=re.IGNORECASE).strip()


def _build_context_chunks(results: list[RetrievalResult]) -> list[dict]:
    """Build context chunks with source numbering and document titles."""
    seen_docs: dict[str, str] = {}  # doc_id -> title
    chunks = []

    for i, result in enumerate(results):
        # Look up title if not cached
        if result.document_id not in seen_docs:
            seen_docs[result.document_id] = _get_document_title(result.document_id)

        chunks.append({
            "source_num": i + 1,
            "text": result.chunk_text,
            "title": seen_docs[result.document_id],
            "section": result.section_path,
            "page": result.page_number,
            "document_id": result.document_id,
            "relevance": result.relevance,
        })

    return chunks


def _get_conversation_history(conversation_id: str) -> list[dict]:
    """Load previous messages in a conversation."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT query_text, response_text
               FROM query_log
               WHERE conversation_id = ?
               ORDER BY created_at ASC
               LIMIT 10""",
            (conversation_id,),
        ).fetchall()

        return [
            {"query": row["query_text"], "answer": row["response_text"]}
            for row in rows
        ]


def execute_search(request: SearchRequest, user_id: str) -> SearchResponse:
    """Execute the full RAG pipeline.

    1. Create/load conversation
    2. Retrieve relevant chunks from ChromaDB
    3. Build context with source attribution
    4. Generate response via Claude
    5. Parse confidence and citations
    6. Log query and return response
    """
    start_time = time.time()

    # 1. Handle conversation
    conversation_id = request.conversation_id
    if not conversation_id:
        conversation_id = str(uuid.uuid4())
        with get_db() as conn:
            conn.execute(
                "INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                (conversation_id, user_id, request.query[:100]),
            )
    else:
        with get_db() as conn:
            conn.execute(
                "UPDATE conversations SET updated_at = datetime('now') WHERE id = ?",
                (conversation_id,),
            )

    # 2. Retrieve relevant chunks
    filters = request.filters
    results = search_documents(
        query=request.query,
        top_k=10,
        document_type=filters.document_type if filters else None,
        hospital_site=filters.hospital_site if filters else None,
        department=filters.department if filters else None,
        min_relevance=0.3,
    )

    # 3. Handle no results
    if not results:
        response_text = generate_no_results_response(request.query)
        elapsed_ms = int((time.time() - start_time) * 1000)

        # Log query
        _log_query(
            user_id=user_id,
            query=request.query,
            response=response_text,
            confidence=0.0,
            source_ids=[],
            elapsed_ms=elapsed_ms,
            conversation_id=conversation_id,
        )

        return SearchResponse(
            answer=response_text,
            confidence="LOW",
            sources=[],
            conversation_id=conversation_id,
            response_time_ms=elapsed_ms,
        )

    # Take top 8 results for context
    top_results = results[:8]

    # 4. Build context
    context_chunks = _build_context_chunks(top_results)

    # Load conversation history for follow-ups
    conversation_history = []
    if request.conversation_id:
        conversation_history = _get_conversation_history(conversation_id)

    # 5. Generate response
    response_text = generate_response(
        query=request.query,
        context_chunks=context_chunks,
        conversation_history=conversation_history if conversation_history else None,
    )

    # 6. Parse confidence
    confidence = _extract_confidence(response_text)
    clean_answer = _clean_response(response_text)

    # Build source references
    sources = []
    seen_doc_ids = set()
    for chunk in context_chunks:
        # Deduplicate by document - keep highest relevance per doc
        if chunk["document_id"] in seen_doc_ids:
            continue
        seen_doc_ids.add(chunk["document_id"])

        # Extract a clean snippet (first 200 chars of chunk text)
        snippet = chunk["text"][:200].strip()
        if len(chunk["text"]) > 200:
            snippet += "..."

        sources.append(SourceReference(
            document_id=chunk["document_id"],
            title=chunk["title"],
            section=chunk["section"] if chunk["section"] else None,
            page=chunk["page"],
            snippet=snippet,
            relevance=round(chunk["relevance"], 3),
        ))

    elapsed_ms = int((time.time() - start_time) * 1000)

    # 7. Log query
    source_doc_ids = [s.document_id for s in sources]
    confidence_score = {"HIGH": 0.9, "MEDIUM": 0.6, "LOW": 0.3}.get(confidence, 0.5)
    _log_query(
        user_id=user_id,
        query=request.query,
        response=clean_answer,
        confidence=confidence_score,
        source_ids=source_doc_ids,
        elapsed_ms=elapsed_ms,
        conversation_id=conversation_id,
    )

    return SearchResponse(
        answer=clean_answer,
        confidence=confidence,
        sources=sources,
        conversation_id=conversation_id,
        response_time_ms=elapsed_ms,
    )


def _log_query(
    user_id: str,
    query: str,
    response: str,
    confidence: float,
    source_ids: list[str],
    elapsed_ms: int,
    conversation_id: str,
):
    """Log a query to the audit trail."""
    with get_db() as conn:
        conn.execute(
            """INSERT INTO query_log
               (id, user_id, query_text, response_text, confidence_score,
                source_document_ids, response_time_ms, conversation_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                str(uuid.uuid4()),
                user_id,
                query,
                response,
                confidence,
                json.dumps(source_ids),
                elapsed_ms,
                conversation_id,
            ),
        )
