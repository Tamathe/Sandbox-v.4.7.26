"""Claude LLM service for response generation."""

import anthropic

from app.config import settings

_client: anthropic.Anthropic | None = None

SYSTEM_PROMPT = """You are a medical information assistant for the Kentucky Children's Hospital (KCH) network. Your role is to help healthcare providers find information from KCH network documents, policies, procedures, and guidelines.

CRITICAL RULES:
1. ONLY answer based on the provided source documents. Never use external knowledge to answer clinical questions.
2. If the provided sources do not contain the information needed to answer the question, clearly state: "I could not find this information in the available KCH network documents."
3. ALWAYS cite your sources using [Source N] format, where N corresponds to the source number provided in the context.
4. When citing, be specific about which document and section the information comes from.
5. If information from multiple sources conflicts, note the discrepancy and cite both sources.
6. Never make clinical recommendations beyond what is explicitly stated in the source documents.

CONFIDENCE ASSESSMENT:
At the end of your response, assess your confidence:
- HIGH: The answer is directly and explicitly stated in the source documents
- MEDIUM: The answer is reasonably inferred from the source documents but not explicitly stated
- LOW: The sources are only partially relevant to the question

FORMAT:
- Provide a clear, concise answer first
- Use bullet points or numbered lists for multi-part information
- Include specific citations [Source N] inline with the relevant information
- End with: CONFIDENCE: HIGH/MEDIUM/LOW

IMPORTANT: This system is for informational purposes to assist healthcare providers. It does not replace clinical judgment, peer consultation, or established protocols."""


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def generate_response(
    query: str,
    context_chunks: list[dict],
    conversation_history: list[dict] | None = None,
) -> str:
    """Generate a response using Claude with RAG context.

    Args:
        query: The user's question
        context_chunks: List of dicts with keys: source_num, text, title, section, page
        conversation_history: Previous Q&A pairs for follow-up context

    Returns:
        Claude's response text
    """
    client = _get_client()

    # Build context section
    context_parts = []
    for chunk in context_chunks:
        source_label = f"[Source {chunk['source_num']}]"
        doc_info = f"Document: {chunk['title']}"
        if chunk.get("section"):
            doc_info += f" | Section: {chunk['section']}"
        if chunk.get("page"):
            doc_info += f" | Page: {chunk['page']}"

        context_parts.append(f"{source_label}\n{doc_info}\n---\n{chunk['text']}\n")

    context_text = "\n".join(context_parts)

    # Build messages
    messages = []

    # Add conversation history for follow-up context
    if conversation_history:
        for entry in conversation_history[-4:]:  # Last 4 exchanges max
            messages.append({"role": "user", "content": entry["query"]})
            messages.append({"role": "assistant", "content": entry["answer"]})

    # Current query with context
    user_message = f"""Based on the following source documents from the KCH network, please answer the question.

SOURCE DOCUMENTS:
{context_text}

QUESTION: {query}"""

    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model=settings.llm_model,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=messages,
    )

    return response.content[0].text


def generate_no_results_response(query: str) -> str:
    """Generate a response when no relevant documents were found."""
    return (
        "I could not find relevant information in the available KCH network documents "
        f"to answer your question about: \"{query}\"\n\n"
        "This could mean:\n"
        "- The topic may not be covered in the currently indexed documents\n"
        "- Try rephrasing your question with different terms\n"
        "- Contact your department administrator to check if relevant documents need to be added\n\n"
        "CONFIDENCE: LOW"
    )
