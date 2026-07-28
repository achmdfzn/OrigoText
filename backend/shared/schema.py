from __future__ import annotations

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    MetaData,
    String,
    Table,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON

metadata = MetaData()

JSON_TYPE = JSON().with_variant(JSONB(), "postgresql")

JOB_STATUSES = ("queued", "running", "completed", "failed")
JOB_STAGES = (
    "queued",
    "detecting_format",
    "extracting_text",
    "sanitizing",
    "structuring",
    "done",
)


def _quoted(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{value}'" for value in values)


documents = Table(
    "documents",
    metadata,
    Column("id", String(64), primary_key=True),
    Column("filename", String(255), nullable=False),
    Column("byte_size", Integer, nullable=False),
    Column("content_sha256", String(64), nullable=False, index=True),
    Column("storage_key", String(512), nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("byte_size >= 0", name="ck_documents_byte_size_non_negative"),
)


parse_jobs = Table(
    "parse_jobs",
    metadata,
    Column("id", String(64), primary_key=True),
    Column(
        "document_id",
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=True,
    ),
    Column("filename", String(255), nullable=False),
    Column("byte_size", Integer, nullable=False),
    Column("status", String(16), nullable=False),
    Column("stage", String(32), nullable=False),
    Column("progress", Float, nullable=False),
    Column("submitted_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    Column("failure", JSON_TYPE, nullable=True),
    CheckConstraint("progress >= 0 and progress <= 1", name="ck_parse_jobs_progress_unit"),
    CheckConstraint(f"status in ({_quoted(JOB_STATUSES)})", name="ck_parse_jobs_status"),
    CheckConstraint(f"stage in ({_quoted(JOB_STAGES)})", name="ck_parse_jobs_stage"),
    Index("ix_parse_jobs_status_updated_at", "status", "updated_at"),
)

parse_results = Table(
    "parse_results",
    metadata,
    Column("id", String(64), primary_key=True),
    Column(
        "job_id",
        String(64),
        ForeignKey("parse_jobs.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    ),
    Column("filename", String(255), nullable=False),
    Column("document_format", String(16), nullable=False),
    Column("byte_size", Integer, nullable=False),
    Column("parsed_at", DateTime(timezone=True), nullable=False),
    Column("metadata_json", JSON_TYPE, nullable=False),
    Column("text", Text, nullable=False),
    Column("word_count", Integer, nullable=False),
    Column("character_count", Integer, nullable=False),
    Column("sections", JSON_TYPE, nullable=False),
    Column("chunks", JSON_TYPE, nullable=False),
    Column("truncated", Integer, nullable=False),
    Column("warnings", JSON_TYPE, nullable=False),
    CheckConstraint("word_count >= 0", name="ck_parse_results_word_count_non_negative"),
)


plagiarism_checks = Table(
    "plagiarism_checks",
    metadata,
    Column("id", String(64), primary_key=True),
    Column(
        "document_id",
        String(64),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("document_title", String(255), nullable=False),
    Column("word_count", Integer, nullable=False),
    Column("checked_at", DateTime(timezone=True), nullable=False),
    Column("overall_similarity", Float, nullable=False),
    Column("risk_level", String(16), nullable=False),
    Column("sources", JSON_TYPE, nullable=False),
    CheckConstraint(
        "overall_similarity >= 0 and overall_similarity <= 1",
        name="ck_plagiarism_checks_similarity_unit",
    ),
    Index("ix_plagiarism_checks_checked_at", "checked_at"),
)

ai_detection_results = Table(
    "ai_detection_results",
    metadata,
    Column("id", String(64), primary_key=True),
    Column(
        "document_id",
        String(64),
        ForeignKey("documents.id", ondelete="SET NULL"),
        nullable=True,
    ),
    Column("document_title", String(255), nullable=False),
    Column("word_count", Integer, nullable=False),
    Column("analyzed_at", DateTime(timezone=True), nullable=False),
    Column("ai_probability", Float, nullable=False),
    Column("confidence", Float, nullable=False),
    Column("verdict", String(16), nullable=False),
    Column("perplexity", Float, nullable=False),
    Column("burstiness", Float, nullable=False),
    Column("signals", JSON_TYPE, nullable=False),
    Column("sentences", JSON_TYPE, nullable=False),
    Column("suspected_models", JSON_TYPE, nullable=False),
    CheckConstraint(
        "ai_probability >= 0 and ai_probability <= 1",
        name="ck_ai_detection_probability_unit",
    ),
    Index("ix_ai_detection_results_analyzed_at", "analyzed_at"),
)

document_payloads = Table(
    "document_payloads",
    metadata,
    Column(
        "document_id",
        String(64),
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("payload", LargeBinary, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)
