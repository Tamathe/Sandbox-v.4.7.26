"""Analytics endpoints for usage tracking and insights."""

import json

from fastapi import APIRouter, Depends

from app.schemas import QueryAnalytics, DocumentAnalytics, UsageAnalytics
from app.dependencies import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/queries", response_model=QueryAnalytics)
async def get_query_analytics(user: dict = Depends(get_current_user)):
    """Get query usage analytics."""
    with get_db() as conn:
        # Total queries
        total = conn.execute("SELECT COUNT(*) as cnt FROM query_log").fetchone()["cnt"]

        # Queries today
        today = conn.execute(
            "SELECT COUNT(*) as cnt FROM query_log WHERE date(created_at) = date('now')"
        ).fetchone()["cnt"]

        # Average confidence
        avg_conf = conn.execute(
            "SELECT AVG(confidence_score) as avg FROM query_log WHERE confidence_score IS NOT NULL"
        ).fetchone()["avg"]

        # Top queries (most common)
        top_rows = conn.execute(
            """SELECT query_text, COUNT(*) as cnt
               FROM query_log
               GROUP BY query_text
               ORDER BY cnt DESC
               LIMIT 10"""
        ).fetchall()
        top_queries = [{"query": r["query_text"], "count": r["cnt"]} for r in top_rows]

        # Low confidence queries (potential documentation gaps)
        low_conf_rows = conn.execute(
            """SELECT query_text, confidence_score, created_at
               FROM query_log
               WHERE confidence_score < 0.5
               ORDER BY created_at DESC
               LIMIT 10"""
        ).fetchall()
        low_confidence = [
            {
                "query": r["query_text"],
                "confidence": r["confidence_score"],
                "date": r["created_at"],
            }
            for r in low_conf_rows
        ]

    return QueryAnalytics(
        total_queries=total,
        queries_today=today,
        avg_confidence=round(avg_conf, 2) if avg_conf else None,
        top_queries=top_queries,
        low_confidence_queries=low_confidence,
    )


@router.get("/documents", response_model=DocumentAnalytics)
async def get_document_analytics(user: dict = Depends(get_current_user)):
    """Get document usage analytics."""
    with get_db() as conn:
        # Total documents
        total = conn.execute(
            "SELECT COUNT(*) as cnt FROM documents WHERE status != 'archived'"
        ).fetchone()["cnt"]

        # By type
        type_rows = conn.execute(
            """SELECT COALESCE(document_type, 'unspecified') as dtype, COUNT(*) as cnt
               FROM documents
               WHERE status != 'archived'
               GROUP BY document_type"""
        ).fetchall()
        by_type = {r["dtype"]: r["cnt"] for r in type_rows}

        # Most cited documents (from query logs)
        cited_rows = conn.execute(
            """SELECT source_document_ids
               FROM query_log
               WHERE source_document_ids IS NOT NULL"""
        ).fetchall()

        # Count citations per document
        citation_counts: dict[str, int] = {}
        for row in cited_rows:
            try:
                doc_ids = json.loads(row["source_document_ids"])
                for doc_id in doc_ids:
                    citation_counts[doc_id] = citation_counts.get(doc_id, 0) + 1
            except (json.JSONDecodeError, TypeError):
                pass

        # Get top cited with titles
        most_cited = []
        sorted_citations = sorted(citation_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        for doc_id, count in sorted_citations:
            doc_row = conn.execute(
                "SELECT title FROM documents WHERE id = ?", (doc_id,)
            ).fetchone()
            if doc_row:
                most_cited.append({
                    "document_id": doc_id,
                    "title": doc_row["title"],
                    "citation_count": count,
                })

        # Recent uploads
        recent_rows = conn.execute(
            """SELECT id, title, document_type, created_at, status
               FROM documents
               ORDER BY created_at DESC
               LIMIT 10"""
        ).fetchall()
        recent = [
            {
                "id": r["id"],
                "title": r["title"],
                "type": r["document_type"],
                "date": r["created_at"],
                "status": r["status"],
            }
            for r in recent_rows
        ]

    return DocumentAnalytics(
        total_documents=total,
        documents_by_type=by_type,
        most_cited=most_cited,
        recent_uploads=recent,
    )


@router.get("/users", response_model=UsageAnalytics)
async def get_usage_analytics(user: dict = Depends(get_current_user)):
    """Get user usage analytics."""
    with get_db() as conn:
        total_users = conn.execute("SELECT COUNT(*) as cnt FROM users").fetchone()["cnt"]

        active_today = conn.execute(
            """SELECT COUNT(DISTINCT user_id) as cnt
               FROM query_log
               WHERE date(created_at) = date('now')"""
        ).fetchone()["cnt"]

        # Queries by hospital site
        site_rows = conn.execute(
            """SELECT COALESCE(u.hospital_site, 'unspecified') as site, COUNT(q.id) as cnt
               FROM query_log q
               JOIN users u ON u.id = q.user_id
               GROUP BY u.hospital_site"""
        ).fetchall()
        by_site = {r["site"]: r["cnt"] for r in site_rows}

    return UsageAnalytics(
        total_users=total_users,
        active_users_today=active_today,
        queries_by_site=by_site,
    )
