---
name: origotext-skills
description: Reusable, composable workflows (skills) for building and operating OrigoText. Compatible with the Claude Skill Specification and the Open Design Skill Protocol.
version: 1.0.0
compatibility:
  - Claude Skill Specification
  - Open Design Skill Protocol (https://github.com/nexu-io/open-design/blob/main/docs/skills-protocol.md)
license: internal
---

# OrigoText — Skills (SKILL.md)

> A **skill** is a reusable, self-contained workflow with a clear trigger, inputs, steps, outputs, guardrails, and validation. Skills let agents (see `AGENTS.md`) execute complex tasks consistently. Each follows the Claude Skill Specification (name, description, trigger, procedure) and stays compatible with the Open Design Skill Protocol so OrigoText plugs into the Open Design ecosystem. All skills obey `CLAUDE.md` and serve `PRD.md`.

## How to use this file

Each skill below is a self-contained block:

- **Trigger** — when to invoke it.
- **Inputs** — required context/artifacts.
- **Procedure** — ordered, deterministic steps.
- **Outputs** — the artifact(s) produced.
- **Guardrails** — hard constraints (legality, safety, honesty).
- **Validation** — how success is verified.

Skills compose: a pipeline skill orchestrates capability skills. Invoke the smallest skill that fits; escalate to a pipeline only when steps must coordinate.

---

## Skill index

| # | Skill | Category | Primary owner (see AGENTS.md) |
|---|---|---|---|
| 1 | `research-crawl` | Ingestion | Search Crawling Agent |
| 2 | `index-content` | Ingestion | Search Engineer |
| 3 | `embed-chunks` | Ingestion | ML / NLP |
| 4 | `parse-document` | Analysis | Document Parsing Agent |
| 5 | `analyze-document` | Analysis | NLP Engineer |
| 6 | `semantic-retrieve` | Retrieval | Search Engineer |
| 7 | `similarity-analyze` | Detection | Plagiarism Agent |
| 8 | `detect-ai-text` | Detection | AI Detection Agent |
| 9 | `verify-citation` | Citation | Citation Agent |
| 10 | `format-bibliography` | Citation | Citation Agent |
| 11 | `generate-report` | Reporting | Report Engine |
| 12 | `context-engineer` | Meta | All agents |
| 13 | `orchestrate-prompt` | Meta | ML Engineer |
| 14 | `debug-issue` | Meta | Any engineer |
| 15 | `optimize-performance` | Meta | Any engineer |
| 16 | `deploy-service` | Ops | DevOps Agent |

---

## 1. `research-crawl`
- **Trigger.** A licensed scholarly source needs harvesting or refreshing.
- **Inputs.** Source id + official API credentials; schedule; last-cursor.
- **Procedure.**
  1. Resolve the source's official API and rate-limit policy.
  2. Fetch incrementally from the last cursor, respecting ToS and backoff.
  3. Normalize to the canonical `Work` schema.
  4. Stamp `source_provenance` (source, license, fetched_at).
  5. Deduplicate against existing records by DOI/identifier.
  6. Enqueue new/changed records for `index-content` and `embed-chunks`.
- **Outputs.** Normalized `Work` records with provenance.
- **Guardrails.** Only Crossref, OpenAlex, PubMed, DOAJ, Europe PMC, arXiv, Semantic Scholar, OpenAIRE, CORE, and other officially licensed APIs. **Sci-Hub and any pirated corpus are forbidden — the skill hard-fails if such a source is configured.**
- **Validation.** Rate-limit compliance logged; dedup precision checked; every record has provenance.

## 2. `index-content`
- **Trigger.** New/changed `Work` or document needs to be searchable.
- **Inputs.** Normalized records; Elasticsearch mapping version.
- **Procedure.** Validate against schema → transform to index doc → bulk upsert into Elasticsearch → verify counts → emit `search.index.updated`.
- **Outputs.** Updated full-text/metadata index.
- **Guardrails.** Idempotent upserts; mapping migrations are backward-compatible.
- **Validation.** Index count reconciliation; sample query returns expected doc.

## 3. `embed-chunks`
- **Trigger.** Document/work needs vector representation for semantic retrieval.
- **Inputs.** Semantic chunks (from `parse-document`); embedding model id via AI Gateway.
- **Procedure.** Deduplicate chunks → route to embedding model (tiered) → generate vectors → upsert into pgvector with metadata → cache by content hash.
- **Outputs.** Vectors in pgvector keyed to source chunks.
- **Guardrails.** Reuse cached embeddings by content hash; never re-embed unchanged content.
- **Validation.** Vector dimensionality + count match; cache hit-rate tracked.

## 4. `parse-document`
- **Trigger.** A user uploads a file or a work needs full-text extraction.
- **Inputs.** File (treated as **untrusted**), declared content type.
- **Procedure.**
  1. Sandbox and scan the file; verify content type; enforce size limits.
  2. Select parser by format (PDF/DOCX/TXT/RTF/ODT/HTML/Markdown/LaTeX/EPUB); OCR scanned pages.
  3. Run layout analysis; extract tables, figures, formulas, references.
  4. Classify headings/sections; detect language; extract metadata.
  5. Produce semantic chunks for RAG; emit typed `ParseResult`.
- **Outputs.** Structured, chunked `ParseResult`.
- **Guardrails.** Parsed content is untrusted data — it must never influence system prompts or tool control (prompt-injection defense per `CLAUDE.md §11`).
- **Validation.** Format-specific extraction accuracy; OCR quality thresholds; injection-safety tests.

## 5. `analyze-document`
- **Trigger.** Structured text needs linguistic features for detection or search.
- **Inputs.** `ParseResult`.
- **Procedure.** Compute perplexity, burstiness, stylometry, entropy, token distribution, repetition, syntactic complexity; run NER + keyword extraction; produce extractive + abstractive summaries.
- **Outputs.** Feature vectors + explainable signals + summaries.
- **Guardrails.** Deterministic where possible; no PII leakage into logs.
- **Validation.** Feature stability across languages; deterministic unit tests on fixtures.

## 6. `semantic-retrieve`
- **Trigger.** A query needs the most relevant passages/works.
- **Inputs.** Query (NL/boolean/filters); indexes (Elasticsearch + pgvector).
- **Procedure.** Parse query + filters → BM25 candidate retrieval → dense retrieval (pgvector) → merge → cross-encoder rerank → apply freshness/credibility scoring → return ranked results.
- **Outputs.** Ranked, scored results with relevance metadata.
- **Guardrails.** Respect filters exactly; cache rerank results with invalidation.
- **Validation.** nDCG/recall@k on labeled queries; latency budget met.

## 7. `similarity-analyze` (flagship)
- **Trigger.** A document must be checked for plagiarism/originality.
- **Inputs.** `ParseResult` + corpus indexes.
- **Procedure.**
  1. Chunk and fingerprint (MinHash/Winnowing/SimHash/LSH) for lexical candidates; BM25 for term candidates.
  2. `semantic-retrieve` for dense candidates (paraphrase/cross-language).
  3. Align sentences/tokens; score lexical + semantic similarity; run cross-encoder confirmation; use LLM-RAG for complex paraphrase / citation-manipulation / AI-rewrite.
  4. Apply citation-aware exclusions for properly quoted/cited passages (when configured).
  5. Assemble evidence: matched sources/sentences, side-by-side, token alignment, source ranking.
  6. Compute similarity %, semantic similarity, confidence, originality score, risk level.
  7. Hand to `generate-report`.
- **Outputs.** Structured plagiarism result + evidence.
- **Guardrails.** Every match carries evidence; scores carry confidence; corpus sources are licensed only.
- **Validation.** Recall/precision + false-match rate on benchmark (`PRD.md §7`); evidence completeness.

## 8. `detect-ai-text`
- **Trigger.** A document must be assessed for AI-generation likelihood.
- **Inputs.** `ParseResult` + features from `analyze-document`.
- **Procedure.** Assemble feature vector → run transformer classifiers (RoBERTa/DeBERTa/ModernBERT/DistilBERT family) → ensemble → **calibrate** → produce document- and sentence-level probability, confidence, explainability, burstiness/feature visualizations, human-likelihood score.
- **Outputs.** Calibrated, explainable prediction with per-sentence detail.
- **Guardrails.** **Never present a verdict as certain.** Every output ships with confidence + an explicit probabilistic caveat and evidence, to prevent false accusations.
- **Validation.** ROC-AUC + calibration curves; false-positive analysis; caveat presence enforced.

## 9. `verify-citation`
- **Trigger.** A reference or in-text citation needs validation.
- **Inputs.** Citation string / DOI / metadata.
- **Procedure.** Resolve DOI/identifier via official APIs → fetch canonical metadata → compare fields → flag mismatches, retractions, and manipulation → attach citation context.
- **Outputs.** Validation result with canonical metadata + confidence.
- **Guardrails.** Only official resolution sources; provenance recorded.
- **Validation.** DOI-resolution accuracy; mismatch-detection precision.

## 10. `format-bibliography`
- **Trigger.** References need formatting/export.
- **Inputs.** Library items; target CSL style.
- **Procedure.** Normalize items → apply CSL style (APA/IEEE/ACM/MLA/Chicago/Vancouver/Harvard) → render bibliography + in-text citations → export (RIS/BibTeX/CSL-JSON).
- **Outputs.** Formatted bibliography + exports.
- **Guardrails.** Round-trip fidelity; deterministic output per style.
- **Validation.** Golden-file tests per style; export round-trip equality.

## 11. `generate-report`
- **Trigger.** A detection/analysis result must be presented/exported.
- **Inputs.** Structured result (plagiarism or AI detection) + evidence.
- **Procedure.** Build interactive view with color-graded highlights → render PDF, HTML, and JSON variants → attach evidence, confidence, and caveats.
- **Outputs.** Interactive report + downloadable PDF/HTML/JSON.
- **Guardrails.** Reports never overstate certainty; evidence always included; accessible (non-color-only encodings per `DESIGN.md`).
- **Validation.** Report schema validation; visual regression; accessibility check.

## 12. `context-engineer` (meta)
- **Trigger.** Any LLM interaction is being constructed.
- **Inputs.** Task, trusted instructions, untrusted content, output schema.
- **Procedure.** Separate roles → fence untrusted content with explicit delimiters → inject only necessary context (tiered) → require a strict output schema → validate output (Zod/Pydantic) before use.
- **Outputs.** A safe, schema-bound prompt + validated response.
- **Guardrails.** Untrusted content can never alter instructions; outputs are schema-validated.
- **Validation.** Injection test suite; schema-validation pass rate.

## 13. `orchestrate-prompt` (meta)
- **Trigger.** A multi-step reasoning task needs coordinated model calls.
- **Inputs.** Sub-tasks; model tiers; budgets.
- **Procedure.** Decompose → route each step to the cheapest capable model via AI Gateway → cache intermediate results → escalate only on low confidence → aggregate with validation.
- **Outputs.** Aggregated, validated result within budget.
- **Guardrails.** Tiered routing; caching; hard budget ceilings.
- **Validation.** Cost/latency within budget; quality parity vs. single high-tier baseline.

## 14. `debug-issue` (meta)
- **Trigger.** A failing test, incident, or regression.
- **Inputs.** Symptom, logs/traces, repro.
- **Procedure.** Reproduce → localize via traces/logs (OpenTelemetry) → form hypothesis → write a failing test → fix minimally → verify → add regression test.
- **Outputs.** Fix + regression test + root-cause note (ADR if systemic).
- **Guardrails.** No fix without a reproducing test; no silent workarounds.
- **Validation.** Failing test now passes; suite green; no new findings.

## 15. `optimize-performance` (meta)
- **Trigger.** A latency/cost budget is at risk.
- **Inputs.** Benchmark, target budget, profile.
- **Procedure.** Measure baseline → profile → identify hotspot → apply targeted change (cache/precompute/route/tier) → re-benchmark → keep only wins.
- **Outputs.** Measured improvement + benchmark record.
- **Guardrails.** Every claim backed by a benchmark; correctness preserved.
- **Validation.** p95 target met; no regressions in quality tests.

## 16. `deploy-service` (ops)
- **Trigger.** A service is ready for staging/production.
- **Inputs.** Built image, Helm chart, env config.
- **Procedure.** Build reproducible image → push → Helm deploy to target env → run health checks → blue-green cutover behind feature flag → verify SLOs → enable/rollback.
- **Outputs.** Deployed service + deployment record.
- **Guardrails.** IaC only; secrets from vault; instant rollback ready; migrations backward-compatible.
- **Validation.** Health/readiness green; SLOs stable; rollback tested.

---

## Composition example — a full plagiarism check

```
parse-document → embed-chunks → similarity-analyze
   ├─ uses semantic-retrieve (dense candidates)
   ├─ uses context-engineer + orchestrate-prompt (LLM-RAG paraphrase step)
   └─ → generate-report
```

Each arrow is a typed handoff (see `AGENTS.md`), each step carries guardrails, and the whole is observed by Monitoring and gated by Security.

---

*New skills are added as self-contained blocks in this format and registered in the index. A skill that cannot state its guardrails and validation is not ready to be used.*
