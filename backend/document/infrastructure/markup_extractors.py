from __future__ import annotations

import zipfile
from io import BytesIO
from xml.etree import ElementTree

from bs4 import BeautifulSoup

from document.domain.errors import CorruptDocumentError
from document.domain.models import DocumentFormat
from document.domain.ports import ExtractedText, TextExtractorPort
from document.infrastructure.text_extractors import decode_bytes

_STRIPPED_TAGS = ("script", "style", "noscript", "template", "svg", "iframe", "object")
_BLOCK_TAGS = ("p", "div", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6", "li", "br")


def html_to_text(markup: str) -> tuple[str, str | None]:
    """Extract visible text from markup, dropping executable and styling nodes."""
    soup = BeautifulSoup(markup, "html.parser")
    for tag in soup(_STRIPPED_TAGS):
        tag.decompose()

    title = soup.title.string.strip() if soup.title is not None and soup.title.string else None
    if title is None and soup.h1 is not None:
        heading = soup.h1.get_text(strip=True)
        title = heading if heading else None

    return soup.get_text(separator="\n\n"), title


class HtmlExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.HTML

    def extract(self, payload: bytes) -> ExtractedText:
        raw, warnings = decode_bytes(payload)
        text, title = html_to_text(raw)
        return ExtractedText(text=text, title=title, warnings=warnings)


_ODT_TEXT_NS = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
_ODT_META_NS = "{urn:oasis:names:tc:opendocument:xmlns:meta:1.0}"
_DC_NS = "{http://purl.org/dc/elements/1.1/}"
_EPUB_CONTAINER_NS = "{urn:oasis:names:tc:opendocument:xmlns:container}"
_OPF_NS = "{http://www.idpf.org/2007/opf}"


def _read_zip_entry(archive: zipfile.ZipFile, name: str) -> bytes | None:
    try:
        return archive.read(name)
    except KeyError:
        return None


class OdtExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.ODT

    def extract(self, payload: bytes) -> ExtractedText:
        try:
            with zipfile.ZipFile(BytesIO(payload)) as archive:
                content = _read_zip_entry(archive, "content.xml")
                meta = _read_zip_entry(archive, "meta.xml")
        except (zipfile.BadZipFile, OSError) as error:
            raise CorruptDocumentError(DocumentFormat.ODT, str(error)) from error

        if content is None:
            raise CorruptDocumentError(DocumentFormat.ODT, "missing content.xml")

        try:
            root = ElementTree.fromstring(content)
        except ElementTree.ParseError as error:
            raise CorruptDocumentError(DocumentFormat.ODT, str(error)) from error

        paragraphs = [
            "".join(node.itertext()).strip()
            for node in root.iter()
            if node.tag in {f"{_ODT_TEXT_NS}p", f"{_ODT_TEXT_NS}h"}
        ]
        title, authors = self._metadata(meta)
        return ExtractedText(
            text="\n\n".join(p for p in paragraphs if p),
            title=title,
            authors=authors,
        )

    def _metadata(self, meta: bytes | None) -> tuple[str | None, list[str]]:
        if meta is None:
            return None, []
        try:
            root = ElementTree.fromstring(meta)
        except ElementTree.ParseError:
            return None, []
        title_node = root.find(f".//{_DC_NS}title")
        creator_nodes = root.findall(f".//{_DC_NS}creator") + root.findall(
            f".//{_ODT_META_NS}initial-creator"
        )
        title = title_node.text.strip() if title_node is not None and title_node.text else None
        authors = [node.text.strip() for node in creator_nodes if node.text and node.text.strip()]
        return title, authors


class EpubExtractor(TextExtractorPort):
    @property
    def document_format(self) -> DocumentFormat:
        return DocumentFormat.EPUB

    def extract(self, payload: bytes) -> ExtractedText:
        try:
            with zipfile.ZipFile(BytesIO(payload)) as archive:
                opf_path = self._opf_path(archive)
                title, authors, spine = self._package(archive, opf_path)
                documents = [
                    archive.read(name) for name in spine if name in set(archive.namelist())
                ]
        except (zipfile.BadZipFile, OSError) as error:
            raise CorruptDocumentError(DocumentFormat.EPUB, str(error)) from error

        fragments: list[str] = []
        for document in documents:
            markup, _ = decode_bytes(document)
            text, _ = html_to_text(markup)
            if text.strip():
                fragments.append(text.strip())

        return ExtractedText(
            text="\n\n".join(fragments),
            title=title,
            authors=authors,
            page_count=len(documents) if documents else None,
        )

    def _opf_path(self, archive: zipfile.ZipFile) -> str:
        container = _read_zip_entry(archive, "META-INF/container.xml")
        if container is None:
            raise CorruptDocumentError(DocumentFormat.EPUB, "missing META-INF/container.xml")
        try:
            root = ElementTree.fromstring(container)
        except ElementTree.ParseError as error:
            raise CorruptDocumentError(DocumentFormat.EPUB, str(error)) from error
        rootfile = root.find(f".//{_EPUB_CONTAINER_NS}rootfile")
        path = rootfile.get("full-path") if rootfile is not None else None
        if path is None:
            raise CorruptDocumentError(DocumentFormat.EPUB, "container.xml declares no rootfile")
        return path

    def _package(
        self, archive: zipfile.ZipFile, opf_path: str
    ) -> tuple[str | None, list[str], list[str]]:
        package = _read_zip_entry(archive, opf_path)
        if package is None:
            raise CorruptDocumentError(DocumentFormat.EPUB, f"missing package document {opf_path}")
        try:
            root = ElementTree.fromstring(package)
        except ElementTree.ParseError as error:
            raise CorruptDocumentError(DocumentFormat.EPUB, str(error)) from error

        title_node = root.find(f".//{_DC_NS}title")
        title = title_node.text.strip() if title_node is not None and title_node.text else None
        authors = [
            node.text.strip()
            for node in root.findall(f".//{_DC_NS}creator")
            if node.text and node.text.strip()
        ]

        base = opf_path.rpartition("/")[0]
        manifest = {
            item.get("id"): item.get("href")
            for item in root.iter(f"{_OPF_NS}item")
            if item.get("id") is not None and item.get("href") is not None
        }
        spine: list[str] = []
        for reference in root.iter(f"{_OPF_NS}itemref"):
            href = manifest.get(reference.get("idref"))
            if href is None:
                continue
            spine.append(f"{base}/{href}" if base else href)

        return title, authors, spine
