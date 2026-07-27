from __future__ import annotations

import re

from charset_normalizer import from_bytes

from document.domain.models import DocumentFormat
from document.domain.ports import ExtractedText, TextExtractorPort


def decode_bytes(payload: bytes) -> tuple[str, list[str]]:
    try:
        return payload.decode("utf-8"), []
    except UnicodeDecodeError:
        best = from_bytes(payload).best()
        if best is None:
            return payload.decode("utf-8", errors="replace"), [
                "Encoding could not be determined; undecodable bytes were replaced."
            ]
        return str(best), [f"Decoded using detected encoding '{best.encoding}'."]


class PlainTextExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.TXT

    def extract(self, payload: bytes) -> ExtractedText:
        text, warnings = decode_bytes(payload)
        return ExtractedText(text=text, warnings=warnings)


_ATX_HEADING = re.compile(r"^#{1,6}\s+", re.MULTILINE)
_SETEXT_UNDERLINE = re.compile(r"^[=-]{3,}\s*$", re.MULTILINE)
_FENCE = re.compile(r"^```.*$", re.MULTILINE)
_INLINE_MARKS = re.compile(r"(\*\*|__|\*|_|`)")
_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_IMAGE = re.compile(r"!\[([^\]]*)\]\([^)]*\)")


class MarkdownExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.MARKDOWN

    def extract(self, payload: bytes) -> ExtractedText:
        raw, warnings = decode_bytes(payload)
        title = self._first_heading(raw)
        body = _IMAGE.sub(r"\1", raw)
        body = _LINK.sub(r"\1", body)
        body = _FENCE.sub("", body)
        body = _SETEXT_UNDERLINE.sub("", body)
        body = _ATX_HEADING.sub("", body)
        body = _INLINE_MARKS.sub("", body)
        return ExtractedText(text=body, title=title, warnings=warnings)

    def _first_heading(self, raw: str) -> str | None:
        for line in raw.splitlines():
            if line.startswith("#"):
                return line.lstrip("#").strip() or None
        return None


_RTF_CONTROL_WORD = re.compile(r"\\\*?[a-z]{1,32}(-?\d{1,10})?[ ]?", re.IGNORECASE)
_RTF_HEX_ESCAPE = re.compile(r"\\'([0-9a-fA-F]{2})")
_RTF_GROUPS = re.compile(r"[{}]")
_RTF_SKIP_GROUP = re.compile(
    r"\{\\\*?\\(?:fonttbl|colortbl|stylesheet|info|pict|header|footer)[^{}]*(?:\{[^{}]*\}[^{}]*)*\}",
    re.IGNORECASE,
)


def _decode_rtf_escape(match: re.Match[str]) -> str:
    return bytes.fromhex(match.group(1)).decode("cp1252", errors="replace")


class RtfExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.RTF

    def extract(self, payload: bytes) -> ExtractedText:
        raw, warnings = decode_bytes(payload)
        body = _RTF_SKIP_GROUP.sub("", raw)
        body = body.replace("\\par", "\n").replace("\\line", "\n").replace("\\tab", "\t")
        body = _RTF_HEX_ESCAPE.sub(_decode_rtf_escape, body)
        body = _RTF_CONTROL_WORD.sub("", body)
        body = _RTF_GROUPS.sub("", body)
        return ExtractedText(text=body, warnings=warnings)


_LATEX_COMMENT = re.compile(r"(?<!\\)%.*$", re.MULTILINE)
_LATEX_ENVIRONMENT = re.compile(
    r"\\begin\{(figure|table|tabular|equation|align|lstlisting|verbatim|thebibliography)\*?\}"
    r".*?\\end\{\1\*?\}",
    re.DOTALL,
)
_LATEX_TITLE = re.compile(r"\\title\{([^}]*)\}")
_LATEX_AUTHOR = re.compile(r"\\author\{([^}]*)\}")
_LATEX_SECTION = re.compile(r"\\(?:sub)*section\*?\{([^}]*)\}")
_LATEX_TEXT_COMMAND = re.compile(r"\\(?:textbf|textit|emph|underline|texttt)\{([^}]*)\}")
_LATEX_BARE_COMMAND = re.compile(r"\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?(?:\{[^{}]*\})?")


class LatexExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.LATEX

    def extract(self, payload: bytes) -> ExtractedText:
        raw, warnings = decode_bytes(payload)
        title_match = _LATEX_TITLE.search(raw)
        authors = [
            author.strip()
            for match in _LATEX_AUTHOR.finditer(raw)
            for author in match.group(1).split(r"\and")
            if author.strip()
        ]

        body = _LATEX_COMMENT.sub("", raw)
        body = _LATEX_ENVIRONMENT.sub("\n\n", body)
        body = _LATEX_SECTION.sub(r"\n\n\1\n\n", body)
        body = _LATEX_TEXT_COMMAND.sub(r"\1", body)
        body = _LATEX_BARE_COMMAND.sub("", body)
        body = body.replace("{", "").replace("}", "").replace("~", " ").replace("\\\\", "\n")

        return ExtractedText(
            text=body,
            title=title_match.group(1).strip() if title_match is not None else None,
            authors=authors,
            warnings=warnings,
        )
