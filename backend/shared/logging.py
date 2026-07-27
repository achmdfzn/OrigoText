from __future__ import annotations

import json
import logging
import sys
from typing import Any

_LOGGER_NAME = "origotext"


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname.lower(),
            "event": record.getMessage(),
            "logger": record.name,
        }
        context = getattr(record, "context", None)
        if isinstance(context, dict):
            payload.update(context)
        return json.dumps(payload, separators=(",", ":"))


def _configure() -> logging.Logger:
    logger = logging.getLogger(_LOGGER_NAME)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


_logger = _configure()


def log_event(event: str, **context: Any) -> None:
    """Emits a structured event.

    Callers pass identifiers and counts only. Document text, API keys, and raw
    client addresses must never be included; principals are already identified
    by fingerprint rather than by key material.
    """
    _logger.info(event, extra={"context": context})
