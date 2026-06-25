"""
chat_handler.py — OpenAI-compatible API proxy for ComfyUI Chat Bridge.
Handles non-streaming chat, streaming chat (SSE), and model listing.
"""

import logging
from openai import OpenAI

log = logging.getLogger("ComfyUI-ChatBridge")


class ChatBridgeHandler:
    def __init__(self):
        self._clients: dict[str, OpenAI] = {}

    def _get_client(self, base_url: str, api_key: str) -> OpenAI:
        cache_key = f"{base_url}||{api_key}"
        if cache_key not in self._clients:
            self._clients[cache_key] = OpenAI(
                api_key=api_key if api_key else "not-needed",
                base_url=base_url,
                timeout=120.0,
            )
        return self._clients[cache_key]

    # ── Model listing ─────────────────────────────────────────────

    async def handle_models(self, body: dict) -> dict:
        """Fetch model list from a remote /v1/models endpoint."""
        base_url = (body.get("base_url") or "").strip()
        api_key = (body.get("api_key") or "not-needed").strip()

        if not base_url:
            return {"models": [], "error": "Missing base_url"}

        try:
            client = self._get_client(base_url, api_key)
            resp = client.models.list()
            models = [m.id for m in resp.data]
            return {"models": sorted(models), "error": None}
        except Exception as e:
            log.warning(f"Failed to list models from {base_url}: {e}")
            return {"models": [], "error": str(e)}

    # ── Shared message builder ────────────────────────────────────

    def _build_context(self, body: dict) -> str:
        """Build system context from optional payloads."""
        parts = []
        sys_prompt = (body.get("system_prompt") or "").strip()
        workflow_json = body.get("workflow_json") or None

        if workflow_json:
            parts.append(
                "The user's current ComfyUI workflow JSON is:\n```json\n"
                + workflow_json[:200000]
                + "\n```\n"
            )
        if body.get("selected_nodes"):
            parts.append(
                "The user selected these nodes:\n```json\n"
                + body["selected_nodes"][:50000]
                + "\n```\n"
            )
        if body.get("recent_error"):
            parts.append(
                "The user recently saw this error in ComfyUI:\n```\n"
                + body["recent_error"][:4000]
                + "\n```\n"
            )

        context_text = "\n".join(parts)

        if sys_prompt:
            context_text = sys_prompt + "\n\n" + context_text if context_text else sys_prompt
        if not context_text:
            context_text = "You are a helpful AI assistant inside ComfyUI."
        return context_text

    def _build_messages(self, body: dict, context_text: str) -> list[dict]:
        """Build the messages array including history and optional images."""
        messages = [{"role": "system", "content": context_text}]

        history = body.get("history") or []
        for h in history:
            role = h.get("role", "user")
            content = h.get("content", "")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

        message = (body.get("message") or "").strip()
        images = body.get("images") or None

        if images and len(images) > 0:
            content = []
            text_prefix = message
            if body.get("context_summary"):
                text_prefix = f"[Context: {body['context_summary']}]\n\n{message}"
            content.append({"type": "text", "text": text_prefix})
            for img in images[:10]:
                if isinstance(img, str) and img.startswith("data:"):
                    content.append({"type": "image_url", "image_url": {"url": img}})
                elif isinstance(img, str):
                    content.append(
                        {"type": "image_url", "image_url": {"url": img, "detail": "low"}}
                    )
            messages.append({"role": "user", "content": content})
        else:
            messages.append({"role": "user", "content": message})

        return messages

    def _build_api_params(self, body: dict, messages: list[dict], stream: bool = False) -> dict:
        """Build the OpenAI API parameters dict."""
        model = (body.get("model") or "").strip() or "auto"
        api_params: dict = {
            "model": model,
            "messages": messages,
            "temperature": body.get("temperature", 0.3),
            "max_tokens": body.get("max_tokens", 4096),
            "stream": stream,
        }

        extra: dict = {}
        top_k = body.get("top_k")
        top_p = body.get("top_p")
        if top_k is not None:
            extra["top_k"] = top_k
        if top_p is not None:
            extra["top_p"] = top_p
        if extra:
            api_params["extra_body"] = extra

        return api_params

    # ── Non-streaming chat ────────────────────────────────────────

    async def handle_chat(self, body: dict) -> dict:
        """Handle a non-streaming chat completion request."""
        base_url = (body.get("base_url") or "").strip()
        api_key = (body.get("api_key") or "not-needed").strip()
        model = (body.get("model") or "").strip() or "auto"

        if not base_url:
            return {"reply": "Error: Please configure an API URL in the panel.", "model": ""}
        if not (body.get("message") or "").strip():
            return {"reply": "Error: Empty message.", "model": ""}

        context_text = self._build_context(body)
        messages = self._build_messages(body, context_text)
        api_params = self._build_api_params(body, messages, stream=False)

        try:
            client = self._get_client(base_url, api_key)
            response = client.chat.completions.create(**api_params)
            reply = response.choices[0].message.content or ""
            images_sent = len(body.get("images") or [])
            return {"reply": reply, "model": model, "images_sent": images_sent, "error": None}
        except Exception as e:
            log.error(f"API call failed ({base_url}): {e}")
            return {
                "reply": f"Error calling API: {e}",
                "model": model,
                "images_sent": 0,
                "error": str(e),
            }

    # ── Streaming chat ────────────────────────────────────────────

    async def handle_chat_stream(self, body: dict):
        """
        Async generator yielding SSE frames for a streaming chat completion.
        Each yield is a dict: {"text": "..."} or {"done": True} or {"error": "..."}
        """
        base_url = (body.get("base_url") or "").strip()
        api_key = (body.get("api_key") or "not-needed").strip()

        if not base_url:
            yield {"error": "Please configure an API URL in the panel."}
            yield {"done": True}
            return
        if not (body.get("message") or "").strip():
            yield {"error": "Empty message."}
            yield {"done": True}
            return

        context_text = self._build_context(body)
        messages = self._build_messages(body, context_text)
        api_params = self._build_api_params(body, messages, stream=True)

        try:
            client = self._get_client(base_url, api_key)
            stream = client.chat.completions.create(**api_params)
            for chunk in stream:
                delta = chunk.choices[0].delta.content if chunk.choices else None
                if delta:
                    yield {"text": delta}
            yield {"done": True}
        except Exception as e:
            log.error(f"Stream API call failed ({base_url}): {e}")
            yield {"error": str(e)}
            yield {"done": True}
