"""OpenAI embedding service for document vectorization."""

from openai import OpenAI

from app.config import settings

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts using OpenAI.

    Batches automatically to stay within API limits.
    Returns list of embedding vectors (3072 dimensions).
    """
    client = _get_client()
    embeddings = []

    # OpenAI allows up to 2048 texts per batch
    batch_size = 512
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(
            model=settings.embedding_model,
            input=batch,
            dimensions=settings.embedding_dimensions,
        )
        for item in response.data:
            embeddings.append(item.embedding)

    return embeddings


def embed_query(query: str) -> list[float]:
    """Generate embedding for a single search query."""
    client = _get_client()
    response = client.embeddings.create(
        model=settings.embedding_model,
        input=query,
        dimensions=settings.embedding_dimensions,
    )
    return response.data[0].embedding
