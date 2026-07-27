# OrigoText — Product Requirement Document (PRD)

> **Status:** Draft v1.0 · **Owner:** Product · **Last updated:** 2026-07-27
> **Document type:** Product Requirement Document — the single source of truth for what OrigoText is, who it serves, and what "done" means.

---

## 1. Executive Summary

OrigoText is a next-generation **Academic Intelligence Platform** that unifies plagiarism detection, AI-generated-text detection, academic search, semantic citation intelligence, literature discovery, writing assistance, and research analytics into one modern, modular, and transparent ecosystem.

Where today's researcher juggles Turnitin for originality, GPTZero for AI detection, Semantic Scholar and Google Scholar for discovery, Zotero for references, and Scite for citation context, OrigoText delivers all of these as a single coherent workspace — faster, more explainable, more accurate, and more respectful of academic integrity and data licensing.

The platform is built for scale (millions of documents), engineered to enterprise standards (security, observability, testability), and designed to feel calm, precise, and professional.

---

## 2. Vision & Mission

**Vision.** A world where academic integrity, discovery, and writing are supported by transparent, trustworthy intelligence — not opaque black boxes that researchers must simply trust.

**Mission.** To give students, researchers, educators, reviewers, and institutions a single, honest, and explainable platform for understanding text: where it came from, whether it is original, whether it was machine-generated, and how it connects to the broader body of knowledge.

**Guiding principles.**

1. **Transparency over verdicts.** Every score is accompanied by evidence, confidence, and explanation. We never claim certainty where the science is probabilistic.
2. **Legality and licensing first.** We only ingest data from sources with legitimate access and official APIs. We do not, and will not, integrate Sci-Hub or any pirated corpus.
3. **Researcher dignity.** Detection tools inform human judgment; they do not replace it. We design against false accusations.
4. **Speed as a feature.** Sub-second interactions wherever possible; long jobs stream progress in real time.
5. **Modularity.** Every capability is an independent, composable service with a clean contract.

---

## 3. Problem Statement

Academic knowledge work is fragmented across single-purpose tools that do not share context, are frequently expensive, and are often opaque:

- **Originality checking** (Turnitin, Crossref Similarity Check) is institutionally gated, slow, and offers limited explainability into *why* something matched.
- **AI-text detection** (GPTZero, ZeroGPT) produces confident-sounding verdicts on a fundamentally probabilistic problem, leading to false accusations and student harm.
- **Discovery** (Google Scholar, Semantic Scholar, Connected Papers, Elicit) is split across products with inconsistent metadata and citation semantics.
- **Reference management** (Zotero, Mendeley, EndNote) lives in yet another silo, disconnected from the writing and checking workflow.
- **Citation intelligence** (Scite) is a separate paid layer.

The result: researchers pay for and context-switch between five to eight tools, none of which explain themselves well, and some of which actively cause harm through overconfident automation.

**OrigoText collapses this fragmentation into one explainable, licensed, scalable platform.**

---

## 4. Target Market & Segments

| Segment | Description | Primary jobs-to-be-done |
|---|---|---|
| **Higher education institutions** | Universities, colleges, graduate schools | Institution-wide integrity checking, LMS integration, seat management, compliance reporting |
| **Academic journals & publishers** | Editorial offices, peer-review platforms | Submission screening, reviewer support, citation validation |
| **Individual researchers & faculty** | Professors, postdocs, PhD candidates | Literature discovery, reference management, pre-submission self-checks |
| **Students** | Undergraduate and graduate | Originality self-checks, citation formatting, writing support |
| **Research organizations & R&D labs** | Corporate research, think tanks, NGOs | Knowledge discovery, internal document originality, IP hygiene |
| **EdTech & integrity resellers** | Platforms embedding integrity features | API/white-label access to detection engines |

**Serviceable market focus (v1):** English-first, expanding to Indonesian, Spanish, Arabic, and CJK languages in later phases, prioritizing institutions with existing digital-submission workflows.

---

## 5. User Personas

**Dr. Amelia — Journal Editor.** Screens 40+ submissions/week. Needs a fast originality + AI-likelihood pass with defensible evidence she can attach to editorial decisions. Values explainability and export.

**Rafi — PhD Candidate.** Writing a dissertation, drowning in PDFs. Needs discovery, a reference library that formats citations correctly, and a self-check before submitting chapters. Cost-sensitive.

**Prof. Chen — Faculty Reviewer.** Teaches 120 students. Needs to check assignments at scale without accusing innocent students. Deeply skeptical of AI-detector overconfidence; wants sentence-level evidence, not a single number.

**Sari — Integrity Officer (Institution Admin).** Manages seats, policies, and audit trails for 12,000 students. Needs RBAC, SSO, retention controls, and compliance reporting.

**Malik — Independent Researcher.** No institutional access. Needs legal, open-access-aware discovery and affordable pay-as-you-go checking.

---

## 6. Competitive Analysis

| Capability | Turnitin | GPTZero / ZeroGPT | Semantic Scholar | Scite | Zotero / Mendeley | **OrigoText** |
|---|---|---|---|---|---|---|
| Plagiarism detection | ✅ (gated) | ❌ | ❌ | ❌ | ❌ | ✅ hybrid + explainable |
| AI-text detection | partial | ✅ (opaque) | ❌ | ❌ | ❌ | ✅ ensemble + calibrated |
| Academic search | ❌ | ❌ | ✅ | partial | ❌ | ✅ federated, licensed |
| Smart citation context | ❌ | ❌ | partial | ✅ | ❌ | ✅ (where licensed) |
| Reference manager | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ web-native |
| Explainability | low | low | n/a | medium | n/a | **high (first-class)** |
| Open API / white-label | limited | limited | ✅ | limited | limited | ✅ |
| Transparent, licensed data | ✅ | unclear | ✅ | ✅ | n/a | ✅ (audited) |

**Differentiators.** (1) One workspace instead of five tools. (2) Evidence-first, calibrated outputs that resist misuse. (3) Strictly licensed data provenance. (4) Modular engines available via API. (5) Modern, fast, accessible UX.

---

## 7. Success Metrics

**North-star metric:** Weekly active *verified checks* (documents checked + literature sessions) per active seat.

**Product KPIs.**

- Time-to-first-result: plagiarism report p95 < 60s for a 20-page document; AI-detection p95 < 8s for 3,000 words.
- Detection quality: plagiarism recall ≥ 0.92 on benchmark corpus at ≤ 0.03 false-match rate; AI-detector ROC-AUC ≥ 0.95 with published calibration curves.
- Explainability adoption: ≥ 70% of report views open the evidence/comparison panel.
- Reliability: 99.9% API availability; error budget tracked monthly.
- Retention: ≥ 80% institutional seat retention quarter-over-quarter.
- Trust: false-accusation complaint rate trending to zero; every AI verdict shipped with confidence + caveat.

**Business KPIs.** Net revenue retention ≥ 120%; CAC payback < 12 months; gross margin ≥ 75%.

---

## 8. Functional Requirements

### 8.1 Plagiarism Engine
- Hybrid detection: lexical (MinHash, Winnowing, SimHash, LSH, BM25), semantic (dense retrieval, cross-encoder, sentence transformers), and LLM-assisted RAG for paraphrase, cross-language, citation-manipulation, and AI-rewrite detection.
- Outputs: similarity %, matched sources, matched sentences, semantic similarity, confidence, originality score, risk level, source ranking, side-by-side evidence, paragraph & token alignment.
- Reports: interactive UI with color-graded highlights, plus downloadable PDF / HTML / JSON.
- Citation-aware: excludes properly quoted/cited passages from originality penalties when configured.

### 8.2 AI-Generated-Text Detector
- Ensemble of perplexity, burstiness, stylometry, entropy, token-distribution, repetition, semantic-consistency, syntactic-complexity, watermark-signal, embedding-anomaly, and authorship-verification features, plus transformer classifiers (RoBERTa/DeBERTa/ModernBERT/DistilBERT family).
- Targets: ChatGPT, Claude, Gemini, DeepSeek, Llama, Qwen, Mistral, and generic open-source generations.
- Outputs: document- and sentence-level probability, confidence, explainability, feature distributions, burstiness visualization, human-likelihood score — **always framed as probabilistic, never absolute.**

### 8.3 Academic Search Engine
- Federated, licensed metadata search over Crossref, OpenAlex, PubMed, DOAJ, Europe PMC, arXiv, Semantic Scholar, OpenAIRE, CORE, and other official APIs.
- Displays DOI, abstract, authors, affiliations, venue, publisher, year, keywords, references, citation graph, topic clusters, trends, h-index/impact signals, quartile, and open-access status.
- Query: natural language, boolean, and advanced filters (year, author, venue, affiliation, type, OA, language); result export.
- **Sci-Hub and any pirated corpus are explicitly prohibited as sources.**

### 8.4 Citation Intelligence Engine
- Web-native reference manager: import via DOI/PDF/RIS/BibTeX/EndNote XML, dedup, tagging, smart folders, annotations, collaborative libraries, notes.
- Formatting: APA, IEEE, ACM, MLA, Chicago, Vancouver, Harvard; export RIS/BibTeX/CSL-JSON.
- Intelligence: citation recommendation, auto-completion, semantic citation suggestion, literature-review assistant, citation-context and relationship graph, citation validation.
- Integrations (where official APIs exist): browser extension, Word, Google Docs, Markdown editors.

### 8.5 Document Processing Pipeline
- Ingest PDF, DOCX, TXT, RTF, ODT, HTML, Markdown, LaTeX, EPUB; OCR scanned docs (Tesseract / modern vision models).
- Layout analysis, table/figure/formula/reference extraction, heading & section classification, language detection, metadata extraction, NER, keyword extraction, extractive + abstractive summaries, semantic chunking for RAG.

### 8.6 Workspace & Dashboard
- Landing, dashboard, workspace, upload, recent activity, literature search, citation manager, AI detector, plagiarism checker, research assistant, knowledge graph, analytics, administration, user management, organization, billing, API management, monitoring, audit log, settings, profile, collaboration.
- Dark/light mode, keyboard shortcuts, drag-and-drop upload, realtime progress via WebSocket, optimistic updates, offline support/PWA, mobile responsive.

### 8.7 Platform & Admin
- Organizations, teams, seat management, RBAC/ABAC, SSO, billing, API keys, usage metering, audit logs, data-retention controls.

---

## 9. Non-Functional Requirements

- **Performance.** p95 targets per §7; horizontal scale to millions of documents; streaming for long jobs.
- **Scalability.** Stateless services, queue-backed workers (Celery/RabbitMQ/Redis), vector search (pgvector) + Elasticsearch, object storage (MinIO), Kubernetes autoscaling.
- **Reliability.** 99.9% availability, circuit breakers, retries with backoff, idempotent jobs, graceful degradation.
- **Security.** See §13. OWASP Top Ten, GDPR alignment, encryption in transit and at rest.
- **Observability.** OpenTelemetry tracing, Prometheus metrics, Grafana dashboards, Loki logs, Jaeger traces, health checks, alerting.
- **Maintainability.** Clean Architecture, DDD, SOLID, CQRS, repository pattern, DI, event-driven, hexagonal boundaries; typed end-to-end; OpenAPI contracts.
- **Accessibility.** WCAG 2.2 AA (see §14).
- **Privacy.** Configurable no-retention mode; documents never sold or used to train third-party models without explicit consent.

---

## 10. Architecture Overview

**Frontend.** Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod, Framer Motion.

**Backend & services.** Python FastAPI, Celery, Redis, PostgreSQL + pgvector, Elasticsearch, MinIO, RabbitMQ. AI Gateway abstracts OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Ollama, vLLM.

**Communication.** REST + GraphQL + WebSocket + Server-Sent Events.

**Infrastructure.** Docker, Kubernetes, Helm, Nginx, Terraform; environments split dev/staging/prod; feature flags; blue-green deployment.

**Service map (high level).**

```
frontend ─▶ api-gateway ─▶ { auth, search, citation, plagiarism, ai-detector,
                             document-parser, report-engine, research-intel }
                              │            │
                        embedding-pipeline indexing-pipeline
                              │            │
        crawler/workers ─▶ Elasticsearch + pgvector + MinIO + PostgreSQL
                              │
                        AI Gateway ─▶ {OpenAI, Anthropic, Gemini, DeepSeek,
                                       OpenRouter, Ollama, vLLM}
observability: OpenTelemetry → Prometheus/Grafana/Loki/Jaeger
```

---

## 11. API Contract (Overview)

All services expose OpenAPI 3.1 specs. Representative endpoints (v1):

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/documents` | Upload + parse a document (returns job id) |
| `GET` | `/v1/documents/{id}` | Document metadata + parse status |
| `POST` | `/v1/plagiarism/checks` | Start a plagiarism check |
| `GET` | `/v1/plagiarism/checks/{id}` | Report (JSON) + evidence |
| `POST` | `/v1/ai-detection/analyze` | AI-likelihood analysis (streamed) |
| `GET` | `/v1/search` | Federated academic search |
| `GET` | `/v1/works/{doi}` | Work metadata + citation graph |
| `POST` | `/v1/citations/format` | Format references in a given CSL style |
| `POST` | `/v1/library/items` | Add reference to a library |
| `WS` | `/v1/jobs/{id}/stream` | Realtime job progress |

Conventions: cursor pagination, RFC 7807 problem+json errors, idempotency keys on POST, versioned under `/v1`, per-key rate limits.

---

## 12. Data Model Overview

Core aggregates: `Organization`, `User`, `Membership`, `Document`, `ParseResult`, `PlagiarismCheck`, `MatchEvidence`, `AiDetectionResult`, `Work` (scholarly record), `CitationEdge`, `LibraryItem`, `Annotation`, `ApiKey`, `AuditEvent`, `UsageRecord`.

Storage strategy: transactional data in PostgreSQL; vector embeddings in pgvector; full-text and metadata search in Elasticsearch; original files and generated reports in MinIO; ephemeral job state and rate-limit counters in Redis. Every scholarly record retains a `source_provenance` field documenting which licensed API supplied it.

---

## 13. Security Requirements

JWT + OAuth2, RBAC + ABAC, MFA, session management, API-key rotation, rate limiting, CSP, CSRF/XSS/SQL-injection protection, prompt-injection defense, secret management (vault), audit logging, encryption at rest and in transit, malware/file scanning, signed URLs, secure upload. Compliance alignment: OWASP Top Ten, GDPR. Detailed standards live in `CLAUDE.md`.

---

## 14. Accessibility Requirements

Target WCAG 2.2 AA: full keyboard operability, visible focus, ARIA semantics, color-contrast ≥ 4.5:1 (text), reduced-motion support, screen-reader-tested flows, captions/alt text, and accessible data-visualizations with non-color-dependent encodings. Detailed tokens and patterns live in `DESIGN.md`.

---

## 15. Scalability Strategy

Stateless services behind an autoscaling gateway; CPU/GPU worker pools sized independently (embedding and cross-encoder inference on GPU nodes); queue-based backpressure; sharded Elasticsearch and partitioned pgvector indexes; read replicas for PostgreSQL; CDN for static assets; multi-tenant isolation via row-level security and per-org namespaces; cost controls via tiered model routing in the AI Gateway (cheap models first, escalate on ambiguity).

---

## 16. Business Model & Monetization

- **Free / student tier.** Limited monthly checks, basic search, single-user library.
- **Pro (individual).** Higher quotas, full AI detector, advanced citation intelligence, export.
- **Team / department.** Shared libraries, collaboration, seat pooling, analytics.
- **Institution / enterprise.** SSO, RBAC/ABAC, LMS integration, audit + compliance, retention controls, SLA.
- **API / white-label.** Metered access to plagiarism, AI-detection, search, and citation engines.

Pricing levers: seats, check volume, model tier, and API throughput. Margin protected by tiered model routing and aggressive caching of embeddings and metadata.

---

## 17. Roadmap (MVP → Enterprise)

**Phase 0 — Foundations (this repo).** PRD, CLAUDE, AGENTS, SKILL, DESIGN; monorepo scaffold; design system; CI/CD skeleton.

**Phase 1 — MVP.** Document upload + parsing, plagiarism checker (flagship UI first), basic AI detector, JSON/PDF report, single-user auth.

**Phase 2 — Discovery & citations.** Federated academic search, citation manager + formatter, library.

**Phase 3 — Intelligence.** Semantic reranking, citation graph, research assistant, knowledge graph, analytics.

**Phase 4 — Scale & enterprise.** Orgs/RBAC/SSO, billing, API/white-label, observability hardening, k8s autoscaling, blue-green.

**Phase 5 — Ecosystem.** Browser extension, Word/Docs integrations, additional languages, marketplace of skills.

---

## 18. Risk Analysis

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| AI-detector false accusations | High (harm + reputational) | Medium | Calibrated outputs, confidence + caveats, sentence-level evidence, human-in-the-loop framing, no absolute verdicts |
| Data-licensing violation | High (legal) | Low | Only official APIs; audited `source_provenance`; explicit Sci-Hub prohibition |
| Model/API cost overrun | Medium | Medium | Tiered routing, caching, self-hosted vLLM/Ollama for bulk work |
| Latency at scale | Medium | Medium | Queue backpressure, GPU pools, precomputed embeddings |
| Prompt injection via documents | Medium | Medium | Input sanitization, sandboxed parsing, injection defenses (see CLAUDE.md) |
| Vendor lock-in (LLM) | Medium | Low | AI Gateway abstraction across 7 providers |
| Privacy/compliance breach | High | Low | Encryption, RBAC/ABAC, audit logs, GDPR alignment, no-retention mode |

---

## 19. Ethical & Legal Commitments

1. **No pirated data.** Sci-Hub and equivalent sources are never ingested or linked.
2. **Probabilistic honesty.** AI-detection results are never presented as certain.
3. **Anti-misuse design.** Evidence-first reporting to prevent false accusations.
4. **Data dignity.** User documents are not sold or used to train third-party models without explicit, revocable consent.
5. **Licensing provenance.** Every scholarly record is traceable to a legitimate source.

---

## 20. Open Questions

- Which institutions pilot Phase 1, and what LMS integrations do they require first?
- Default retention policy per tier?
- Which languages beyond English are prioritized for Phase 2 vs Phase 5?
- Licensing terms available from Scite-style smart-citation providers?

---

*This PRD governs scope. Engineering conventions live in `CLAUDE.md`, the agent operating model in `AGENTS.md`, reusable workflows in `SKILL.md`, and the visual system in `DESIGN.md`.*
