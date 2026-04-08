"""ChromaDB vector search service."""

import logging
from dataclasses import dataclass

from app.services.ingestion_service import get_collection
from app.services.embedding_service import embed_query

logger = logging.getLogger(__name__)


@dataclass
class RetrievalResult:
    chunk_text: str
    document_id: str
    page_number: int
    section_path: str
    chunk_index: int
    distance: float  # Lower = more similar (cosine)
    relevance: float  # 0-1 score (1 = most relevant)


def search_documents(
    query: str,
    top_k: int = 10,
    document_type: str | None = None,
    hospital_site: str | None = None,
    department: str | None = None,
    min_relevance: float = 0.3,
) -> list[RetrievalResult]:
    """Search ChromaDB for relevant document chunks.

    Args:
        query: Natural language search query
        top_k: Maximum number of results to return
        document_type: Filter by document type
        hospital_site: Filter by hospital site
        department: Filter by department
        min_relevance: Minimum relevance score (0-1) to include

    Returns:
        List of RetrievalResult sorted by relevance (highest first)
    """
    collection = get_collection()

    # Check if collection has any documents
    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty — no documents indexed")
        return []

    # Build metadata filter
    where_filter = {}
    conditions = []
    if document_type:
        conditions.append({"document_type": document_type})
    if hospital_site:
        conditions.append({"hospital_site": hospital_site})
    if department:
        conditions.append({"department": department})

    if len(conditions) == 1:
        where_filter = conditions[0]
    elif len(conditions) > 1:
        where_filter = {"$and": conditions}

    # Generate query embedding
    query_embedding = embed_query(query)

    # Search ChromaDB
    query_params = {
        "query_embeddings": [query_embedding],
        "n_results": top_k,
        "include": ["documents", "metadatas", "distances"],
    }
    if where_filter:
        query_params["where"] = where_filter

    try:
        results = collection.query(**query_params)
    except Exception as e:
        logger.error(f"ChromaDB query failed: {e}")
        return []

    if not results["ids"] or not results["ids"][0]:
        return []

    # Convert to RetrievalResult objects
    retrieval_results = []
    for i, chunk_id in enumerate(results["ids"][0]):
        distance = results["distances"][0][i]
        # Convert cosine distance to relevance score (0-1)
        # Cosine distance: 0 = identical, 2 = opposite
        relevance = max(0.0, 1.0 - distance)

        if relevance < min_relevance:
            continue

        metadata = results["metadatas"][0][i]
        retrieval_results.append(RetrievalResult(
            chunk_text=results["documents"][0][i],
            document_id=metadata.get("document_id", ""),
            page_number=metadata.get("page_number", 1),
            section_path=metadata.get("section_path", ""),
            chunk_index=metadata.get("chunk_index", 0),
            distance=distance,
            relevance=relevance,
        ))

    # Sort by relevance (highest first)
    retrieval_results.sort(key=lambda r: r.relevance, reverse=True)

    return retrieval_results
