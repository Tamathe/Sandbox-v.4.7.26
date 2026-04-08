"""
Unified LLM client — routes to Anthropic API or a local LM Studio / Ollama server.

Set USE_LOCAL_LLM=true in .env to keep all PHI on-device (HIPAA mode).
The LLMClient class is a drop-in replacement for anthropic.Anthropic():
    - Same .messages.create() call signature
    - Same .content[0].text response access
So existing call sites only need to change one line (the client constructor).

Image blocks for Vision OCR differ between backends; use make_image_block()
to get the right format automatically.
"""

import logging
import time
import config

logger = logging.getLogger(__name__)


class _ContentBlock:
    __slots__ = ("text",)
    def __init__(self, text: str):
        self.text = text


class _Response:
    __slots__ = ("content",)
    def __init__(self, text: str):
        self.content = [_ContentBlock(text)]


class _MessagesAPI:
    """Mimics anthropic.Anthropic().messages — routes to local or cloud backend."""

    def __init__(self, force_cloud: bool = False):
        self._force_cloud = force_cloud

    def create(
        self,
        model: str,
        max_tokens: int,
        messages: list[dict],
        system: str = None,
        **kwargs,
    ) -> _Response:
        use_local = config.USE_LOCAL_LLM and not self._force_cloud
        if use_local:
            return _Response(_call_local(model, max_tokens, messages, system))
        else:
            return _Response(_call_anthropic(model, max_tokens, messages, system))


class LLMClient:
    """
    Drop-in replacement for anthropic.Anthropic().
    Instantiate once per module; it reads USE_LOCAL_LLM at call time.

    Args:
        force_cloud: If True, always use the Anthropic cloud API even when
                     USE_LOCAL_LLM=True. Used for post-extraction stages in
                     hybrid (LOCAL_EXTRACTION_ONLY) mode.
    """
    def __init__(self, force_cloud: bool = False):
        self.messages = _MessagesAPI(force_cloud=force_cloud)


# ── Backend implementations ───────────────────────────────────────────────────

def _call_anthropic(model: str, max_tokens: int, messages: list[dict], system: str = None) -> str:
    import anthropic
    from src.phi_scrubber import scrub, scrub_messages

    # ── PHI scrubbing ── strip identifiers before any text leaves the device
    if system:
        system = scrub(system, context="system-prompt").text
    messages, _ = scrub_messages(messages, context="user-messages")

    # timeout=120: prevents threads from hanging indefinitely on slow API responses
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, timeout=120.0)
    kwargs = dict(model=model, max_tokens=max_tokens, messages=messages)
    if system:
        kwargs["system"] = system
    response = client.messages.create(**kwargs)
    # 300ms rate limit between Anthropic calls — prevents burst overload on the
    # criterion matching stage which fires 40+ calls per case.
    time.sleep(0.3)
    return response.content[0].text


def _call_local(model: str, max_tokens: int, messages: list[dict], system: str = None) -> str:
    from openai import OpenAI
    client = OpenAI(base_url=config.LOCAL_LLM_BASE_URL, api_key="lm-studio")

    # OpenAI-compatible APIs use a system role message instead of a separate param
    all_messages = []
    if system:
        all_messages.append({"role": "system", "content": system})
    all_messages.extend(messages)

    # Use configured model; LM Studio also accepts the loaded model's identifier
    local_model = config.LOCAL_LLM_MODEL
    response = client.chat.completions.create(
        model=local_model,
        max_tokens=max_tokens,
        messages=all_messages,
    )
    return response.choices[0].message.content


# ── Vision helper ─────────────────────────────────────────────────────────────

def make_image_block(img_b64: str) -> dict:
    """
    Return the correct image content block for the active backend.
    Anthropic and OpenAI use different image formats in their message content arrays.
    """
    if config.USE_LOCAL_LLM:
        return {
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{img_b64}"},
        }
    else:
        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": img_b64,
            },
        }


def get_vision_model() -> str:
    """Return the model to use for Vision OCR tasks."""
    if config.USE_LOCAL_LLM:
        return config.LOCAL_LLM_MODEL
    return config.CLAUDE_HAIKU_MODEL
