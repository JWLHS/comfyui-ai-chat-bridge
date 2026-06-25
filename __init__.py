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
import traceback

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
from .error_collector import error_collector, install_execution_hook

WEB_DIRECTORY = "js"

# ── These MUST be named exactly NODE_CLASS_MAPPINGS / NODE_DISPLAY_NAME_MAPPINGS ──
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

log = logging.getLogger("ComfyUI-ChatBridge")

try:
    handler = ChatBridgeHandler()
except Exception as e:
    log.error(f"Failed to init ChatBridgeHandler: {e}")
    traceback.print_exc()

routes = PromptServer.instance.routes
install_execution_hook()


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


@routes.get("/api/chat-bridge/ping")
async def chat_bridge_ping(request: web.Request):
    """Health check — returns instantly, zero network call."""
    return web.json_response({"ok": True})


@routes.get("/api/chat-bridge/last-error")
async def chat_bridge_last_error(request: web.Request):
    """Return most recent execution error (consumed on read)."""
    err = error_collector.get_error(consume=True)
    return web.json_response({"error": err})


@routes.post("/api/chat-bridge/validate-workflow")
async def chat_bridge_validate_workflow(request: web.Request):
    """Validate workflow: check missing node types and missing model files."""
    try:
        body = await request.json()
        wf = body.get("workflow")
        if not wf:
            return web.json_response({"missing_nodes": [], "missing_models": []})

        if isinstance(wf, str):
            wf = json.loads(wf)

        node_list = wf.get("nodes", [])

        # ── Registered node types from ComfyUI itself ──
        import nodes as comfy_nodes
        known_types = set(comfy_nodes.NODE_CLASS_MAPPINGS.keys())

        # ── Available model files on disk ──
        from folder_paths import get_filename_list
        model_folders = [
            "checkpoints", "vae", "clip", "diffusion_models",
            "text_encoders", "unet", "loras", "controlnet",
            "upscale_models", "clip_vision", "gligen"
        ]
        known_models = set()
        for folder in model_folders:
            try:
                for f in get_filename_list(folder):
                    known_models.add(f)
            except Exception:
                pass

        missing_nodes = []
        missing_models = []

        for node in node_list:
            ntype = node.get("type", "")
            ntitle = node.get("title", "") or ntype

            # 1. Check node type exists
            if ntype and ntype not in known_types:
                label = "{} ({})".format(ntype, ntitle) if ntitle != ntype else ntype
                missing_nodes.append(label)

            # 2. Check model widget values
            wvals = node.get("widgets_values", [])
            inputs = node.get("inputs", [])
            widx = 0
            for inp in inputs:
                if inp.get("widget") and inp.get("link") is None:
                    wname = (inp.get("widget", {}) or {}).get("name", "")
                    has_model_keyword = any(kw in wname.lower() for kw in
                        ["name", "model", "unet", "vae", "clip", "checkpoint", "lora"])
                    if wname and has_model_keyword and widx < len(wvals):
                        val = str(wvals[widx]).strip()
                        if val and not val.startswith("http"):
                            is_model_ext = val.lower().endswith((".safetensors", ".ckpt", ".pt", ".pth", ".bin"))
                            if is_model_ext and val not in known_models:
                                missing_models.append("{} 缺少模型: {}".format(ntitle, val))
                    widx += 1

        return web.json_response({
            "missing_nodes": missing_nodes,
            "missing_models": missing_models
        })
    except Exception as e:
        log.error("Validate workflow error: {}".format(e))
        return web.json_response({"missing_nodes": [], "missing_models": [], "error": str(e)})


log.info(
    "AI Chat Bridge plugin loaded "
    "(routes: /api/chat-bridge/chat, /api/chat-bridge/chat/stream, /api/chat-bridge/models, "
    "/api/chat-bridge/ping, /api/chat-bridge/last-error, /api/chat-bridge/validate-workflow)"
)
