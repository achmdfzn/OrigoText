from __future__ import annotations

import re
import unicodedata

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_ZERO_WIDTH = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]")
_EXCESS_BLANK_LINES = re.compile(r"\n{3,}")
_TRAILING_SPACE = re.compile(r"[ \t]+(?=\n)")
_EXCESS_SPACES = re.compile(r"[ \t]{2,}")

_TOOL_CONTROL_TOKENS = re.compile(
    r"<\|[^|>\n]{0,64}\|>"
    r"|<\/?(?:system|assistant|human|user|tool_call|function_call)>"
    r"|\[(?:INST|\/INST)\]"
    r"|\u0011|\u0012",
    re.IGNORECASE,
)


def strip_tool_control_tokens(text: str) -> tuple[str, int]:
    """Neutralize chat-template and tool-control markers in untrusted text.

    Parsed documents are data, never instructions. Removing these markers stops a
    crafted upload from impersonating a role boundary in a downstream prompt.
    """
    stripped, count = _TOOL_CONTROL_TOKENS.subn(" ", text)
    return stripped, count


def normalize_whitespace(text: str) -> str:
    collapsed = text.replace("\r\n", "\n").replace("\r", "\n")
    collapsed = _EXCESS_SPACES.sub(" ", collapsed)
    collapsed = _TRAILING_SPACE.sub("", collapsed)
    collapsed = _EXCESS_BLANK_LINES.sub("\n\n", collapsed)
    return collapsed.strip()


def sanitize(text: str) -> tuple[str, list[str]]:
    """Return display-safe text plus warnings describing what was removed."""
    warnings: list[str] = []

    normalized = unicodedata.normalize("NFKC", text)
    without_zero_width = _ZERO_WIDTH.sub("", normalized)
    if without_zero_width != normalized:
        warnings.append("Removed zero-width or bidirectional control characters.")

    without_control = _CONTROL_CHARS.sub(" ", without_zero_width)
    if without_control != without_zero_width:
        warnings.append("Removed non-printable control characters.")

    without_tokens, token_count = strip_tool_control_tokens(without_control)
    if token_count > 0:
        warnings.append(f"Neutralized {token_count} tool-control token(s) in document text.")

    return normalize_whitespace(without_tokens), warnings
