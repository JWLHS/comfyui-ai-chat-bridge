"""
ComfyUI AI Chat Bridge
───────────────────────
Floating chat panel inside ComfyUI. Talks to any OpenAI-compatible API.
Supports workflow context, node inspection, canvas images, error logs,
streaming output, Markdown rendering, and <think> tag folding.

No extra server needed ─ routes are registered inside ComfyUI's aiohttp instance.
All API credentials stay in your browser's localStorage (base64-obfuscated key).
"""

import sys
import os
import subprocess
import logging

# ── Auto-install dependencies ────────────────────────────────
REQUIRED = ["openai>=1.0.0"]

def _ensure_dependencies():
    """Check and install missing packages using pip."""
    missing = []
    for pkg in REQUIRED:
        name = pkg.split(">=")[0].split("==")[0].split("<")[0].strip()
        try:
            __import__(name.replace("-", "_"))
        except ImportError:
            missing.append(pkg)

    if not missing:
        return

    log = logging.getLogger("ComfyUI-ChatBridge")
    log.warning(f"Missing packages: {missing}. Installing...")

    python_exe = sys.executable
    try:
        subprocess.check_call(
            [python_exe, "-m", "pip", "install", "--quiet", *missing],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        log.info(f"Installed: {', '.join(missing)}")
    except subprocess.CalledProcessError as e:
        log.error(f"Failed to install dependencies: {e}")
        log.error(
            "Please run manually:\n"
            f"  {python_exe} -m pip install {' '.join(missing)}"
        )

_ensure_dependencies()

# ── Normal imports ────────────────────────────────────────────
import json
import logging
from aiohttp import web
from server import PromptServer

from .chat_handler import ChatBridgeHandler

WEB_DIRECTORY = "js"
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

log = logging.getLogger("ComfyUI-ChatBridge")
handler = ChatBridgeHandler()

routes = PromptServer.instance.routes


@routes.post("/api/chat-bridge/chat")
async def chat_bridge_chat(request: web.Request):
    """Non-streaming chat — proxy to OpenAI-compatible API."""
    try:
        body = await request.json()
        result = await handler.handle_chat(body)
        return web.json_response(result)
    except Exception as e:
        log.error(f"Chat error: {e}")
        return web.json_response(
            {"reply": f"Error: {e}", "model": "", "error": str(e)}, status=500
        )


@routes.post("/api/chat-bridge/chat/stream")
async def chat_bridge_chat_stream(request: web.Request):
    """Streaming chat — SSE response, each chunk as JSON in 'data:' frame."""
    body = await request.json()

    response = web.StreamResponse(
        status=200,
        reason="OK",
        headers={
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
    await response.prepare(request)

    try:
        async for chunk in handler.handle_chat_stream(body):
            frame = f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
            await response.write(frame.encode("utf-8"))
    except Exception as e:
        log.error(f"Stream error: {e}")
        err_frame = f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
        await response.write(err_frame.encode("utf-8"))

    await response.write_eof()
    return response


@routes.post("/api/chat-bridge/models")
async def chat_bridge_models(request: web.Request):
    """Proxy /v1/models from any OpenAI-compatible endpoint."""
    try:
        body = await request.json()
        result = await handler.handle_models(body)
        return web.json_response(result)
    except Exception as e:
        log.error(f"Models error: {e}")
        return web.json_response({"models": [], "error": str(e)})


log.info(
    "AI Chat Bridge plugin loaded "
    "(routes: /api/chat-bridge/chat, /api/chat-bridge/chat/stream, /api/chat-bridge/models)"
)
