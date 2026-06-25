"""
error_collector.py — Thread-safe execution error storage.
Monkey-patches execution.execute() to capture all node errors.
"""
import threading
import logging

log = logging.getLogger("ComfyUI-ChatBridge")


class ErrorCollector:
    def __init__(self):
        self._lock = threading.Lock()
        self._error = None
        self._has_new = False

    def set_error(self, msg):
        with self._lock:
            self._error = msg[:8000]
            self._has_new = True

    def get_error(self, consume=False):
        with self._lock:
            err = self._error
            if consume:
                self._has_new = False
            return err

    def has_new_error(self):
        with self._lock:
            return self._has_new


error_collector = ErrorCollector()


def install_execution_hook():
    try:
        import execution

        _orig = execution.execute

        async def _patched(*args, **kwargs):
            try:
                return await _orig(*args, **kwargs)
            except Exception as e:
                import traceback
                msg = "{}\n{}".format(e, traceback.format_exc())
                error_collector.set_error(msg)
                raise

        execution.execute = _patched
        log.info("[ChatBridge] Execution hook installed.")
    except Exception as e:
        log.error("[ChatBridge] Hook install failed: {}".format(e))
