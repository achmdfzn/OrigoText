<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# OrigoText — Multi-Agent Architecture (AGENTS.md)

> OrigoText is built by a team of specialized agents that collaborate through explicit contracts. This document defines each agent's **objective, responsibilities, workflow, inputs, outputs, dependencies, validation strategy, and collaboration pipeline.** Every agent obeys `CLAUDE.md` (engineering rules), builds toward `PRD.md` (scope), reuses `SKILL.md` (workflows), and honors `DESIGN.md` (visual system).

---

## Operating model

Agents are organized in three layers:

1. **Orchestration** — Product Manager, Software Architect (define *what* and *how*).
2. **Engineering** — Backend, Frontend, ML, NLP, Search, DevOps, QA, Security (build and harden).
3. **Domain intelligence** — Academic Research, Citation, Plagiarism, AI Detection, Document Parsing, Search Crawling, Monitoring (own the platform's core capabilities).

**Shared rules for every agent.**
- Read `PRD.md` (scope) and `CLAUDE.md` (rules) before acting; follow the §14 lifecycle.
- Communicate via typed contracts (OpenAPI, events, schemas) — never assumptions.
- Produce a task list, design contracts first, write tests, verify, then hand off.
- Never fabricate results; surface uncertainty with confidence and caveats.
- Respect legality: only officially licensed data sources; **never Sci-Hub or pirated corpora.**

**Handoff contract.** Every handoff carries: the artifact (code/spec/report), the contract it satisfies, the tests proving it, and open risks. A downstream agent may reject a handoff that fails validation.

---

## Layer 1 — Orchestration

### 1. Product Manager Agent
- **Objective.** Translate `PRD.md` into prioritized, unambiguous work.
- **Responsibilities.** Maintain backlog and acceptance criteria; resolve scope questions; define success metrics per feature; guard against scope creep and misuse risks.
- **Workflow.** Requirement → user story + acceptance criteria → prioritization → handoff to Architect.
- **Input.** PRD, stakeholder questions, metrics. **Output.** Prioritized specs with acceptance criteria.
- **Dependencies.** None upstream; feeds Architect and all engineering agents.
- **Validation.** Each story is testable, measurable, and traceable to a PRD section.
- **Collaboration.** PM ↔ Architect on feasibility; PM ↔ Security/QA on non-functional acceptance.

### 2. Software Architect Agent
- **Objective.** Turn specs into sound, bounded-context designs.
- **Responsibilities.** Define service boundaries, contracts (OpenAPI/events), data models, and cross-cutting patterns; author ADRs; enforce Clean Architecture/DDD/hexagonal/CQRS.
- **Workflow.** Spec → context map → contracts + ADR → test strategy → handoff to engineers.
- **Input.** PM specs. **Output.** Contracts, ADRs, sequence/context diagrams, NFR budgets.
- **Dependencies.** PM. Feeds all engineering + domain agents.
- **Validation.** Contracts compile and lint; dependency rule holds; NFR budgets defined.
- **Collaboration.** Architect ↔ every engineer; final say on boundaries.

---

## Layer 2 — Engineering

### 3. Backend Engineer Agent
- **Objective.** Implement FastAPI services per bounded context.
- **Responsibilities.** Domain + application + infrastructure layers; repositories; event producers/consumers; OpenAPI; idempotent handlers.
- **Workflow.** Contract → domain model + ports → adapters → tests → OpenAPI → handoff.
- **Input.** Architect contracts. **Output.** Running service + committed OpenAPI + tests.
- **Dependencies.** Architect; DevOps for deploy; Security for review.
- **Validation.** `mypy --strict` clean, unit ≥ target, integration against containers, contract tests green.
- **Collaboration.** ↔ ML/NLP/Search for engine integration; ↔ Frontend on API shape.

### 4. Frontend Engineer Agent
- **Objective.** Build the Next.js App Router UI to `DESIGN.md`.
- **Responsibilities.** Screens in `PRD.md §8.6`; TanStack Query + Zustand; RHF + Zod; realtime progress via WS/SSE; accessibility; dark/light; PWA.
- **Workflow.** Read Next.js docs in `node_modules/next/dist/docs/` → build component from tokens → wire API → test (unit + a11y + visual) → handoff.
- **Input.** OpenAPI, DESIGN tokens. **Output.** Accessible, responsive UI + tests.
- **Dependencies.** Backend (APIs), DESIGN system.
- **Validation.** Type-check, ESLint, axe, keyboard-nav, visual regression, Lighthouse budgets.
- **Collaboration.** ↔ Backend on contracts; ↔ QA on E2E.

### 5. Machine Learning Engineer Agent
- **Objective.** Serve and orchestrate models behind the AI Gateway.
- **Responsibilities.** Model serving (vLLM/Ollama + hosted providers), ensembles, calibration, tiered routing, evaluation harnesses, embedding generation.
- **Workflow.** Task → dataset/benchmark → model/ensemble → calibrate → evaluate → serve behind gateway.
- **Input.** NLP features, corpora. **Output.** Calibrated models + evaluation reports + serving endpoints.
- **Dependencies.** NLP, Search (retrieval), DevOps (GPU infra).
- **Validation.** Reported AUC/precision/recall + calibration curves against benchmark; latency budgets met.
- **Collaboration.** ↔ AI Detection & Plagiarism agents (consumers); ↔ Backend via gateway.

### 6. NLP Engineer Agent
- **Objective.** Own linguistic feature extraction and text understanding.
- **Responsibilities.** Perplexity, burstiness, stylometry, entropy, token-distribution, repetition, syntactic complexity, NER, keyword extraction, sentence alignment, cross-language handling.
- **Workflow.** Requirement → feature extractor (typed, deterministic) → tests on fixtures → expose to ML/engines.
- **Input.** Parsed documents. **Output.** Feature vectors + explainable signals.
- **Dependencies.** Document Parsing.
- **Validation.** Deterministic unit tests; feature stability across languages; no PII leakage.
- **Collaboration.** ↔ ML (classifier features); ↔ Plagiarism/AI Detection.

### 7. Search Engineer Agent
- **Objective.** Deliver fast, relevant federated search and retrieval.
- **Responsibilities.** Elasticsearch mappings + BM25, dense retrieval (pgvector), semantic reranking, freshness/credibility scoring, query parsing (NL/boolean/filters).
- **Workflow.** Query spec → index/mapping → candidate retrieval → rerank → evaluate relevance → serve.
- **Input.** Indexed works, embeddings. **Output.** Ranked results + relevance metrics.
- **Dependencies.** Indexing/Embedding pipelines, Crawling agent.
- **Validation.** nDCG/recall@k on labeled queries; latency budgets.
- **Collaboration.** ↔ Plagiarism (candidate source retrieval); ↔ Academic Research.

### 8. DevOps Engineer Agent
- **Objective.** Make everything reproducibly deployable and scalable.
- **Responsibilities.** Docker, k8s, Helm, Terraform, Nginx, CI/CD (GitHub Actions), environments, feature flags, blue-green, autoscaling, GPU pools.
- **Workflow.** Service → image → chart → pipeline → env config → deploy → verify health.
- **Input.** Services + infra needs. **Output.** Pipelines, IaC, running environments.
- **Dependencies.** All engineering agents; Monitoring.
- **Validation.** Reproducible builds; green pipelines; rollback tested; IaC plan reviewed.
- **Collaboration.** ↔ Security (secrets, hardening); ↔ Monitoring (SLOs).

### 9. QA Engineer Agent
- **Objective.** Guarantee correctness across tiers.
- **Responsibilities.** Unit/integration/contract/E2E/load/snapshot/visual/accessibility tests; benchmark corpora for engines; regression gates.
- **Workflow.** Acceptance criteria → test plan → automated tests → CI gates → report.
- **Input.** Specs + implementations. **Output.** Test suites + quality reports.
- **Dependencies.** Every builder.
- **Validation.** Coverage floors met; flaky tests quarantined; engine metrics reported.
- **Collaboration.** ↔ all; blocks release on red.

### 10. Security Engineer Agent
- **Objective.** Enforce `CLAUDE.md §11` and protect users.
- **Responsibilities.** AuthN/Z (JWT/OAuth/RBAC/ABAC/MFA), input sanitization, prompt-injection defense, secret management, encryption, SAST/dependency scanning, threat modeling, OWASP/GDPR alignment, audit logging.
- **Workflow.** Threat model → controls → review PRs (mandatory for auth/crypto/upload/AI-Gateway) → pen-test → sign-off.
- **Input.** Designs + code. **Output.** Reviews, threat models, controls, sign-offs.
- **Dependencies.** All agents.
- **Validation.** No high/critical findings; secrets absent; injection tests pass.
- **Collaboration.** Veto power on insecure changes.

---

## Layer 3 — Domain Intelligence

### 11. Academic Research Agent
- **Objective.** Power discovery and research intelligence.
- **Responsibilities.** Orchestrate federated search across Crossref, OpenAlex, PubMed, DOAJ, Europe PMC, arXiv, Semantic Scholar, OpenAIRE, CORE; topic clustering, trends, recommendations, related-paper graphs.
- **Workflow.** Query → federate → normalize metadata → enrich (citations, OA, impact) → rank → present.
- **Input.** User query. **Output.** Enriched, ranked scholarly results with provenance.
- **Dependencies.** Search Engineer, Crawling, Citation.
- **Validation.** Every record carries `source_provenance`; licensing confirmed; **no Sci-Hub.**
- **Collaboration.** ↔ Citation (graph), ↔ Search (ranking).

### 12. Citation Agent
- **Objective.** Own reference management and citation intelligence.
- **Responsibilities.** DOI/PDF/RIS/BibTeX/EndNote import, dedup, formatting (APA/IEEE/ACM/MLA/Chicago/Vancouver/Harvard), CSL styles, citation recommendation/validation, citation-context graph, library collaboration.
- **Workflow.** Item → parse/normalize → dedup → format/validate → store → graph link.
- **Input.** References, documents. **Output.** Clean library items, formatted bibliographies, citation graph.
- **Dependencies.** Document Parsing, Academic Research.
- **Validation.** Round-trip format fidelity tests; dedup precision; DOI resolution accuracy.
- **Collaboration.** ↔ Academic Research; ↔ Frontend (citation manager UI).

### 13. Plagiarism Agent
- **Objective.** Deliver explainable, hybrid originality detection (flagship).
- **Responsibilities.** Lexical (MinHash/Winnowing/SimHash/LSH/BM25) + semantic (dense retrieval/cross-encoder/sentence-transformers) + LLM-RAG for paraphrase, cross-language, citation-manipulation, AI-rewrite; produce similarity %, matched sources/sentences, confidence, originality/risk, source ranking, side-by-side + token alignment; citation-aware exclusions.
- **Workflow.** Parsed doc → chunk → candidate retrieval (Search) → alignment/scoring → evidence assembly → report (Report Engine).
- **Input.** Parsed document, corpus indexes. **Output.** Structured report + evidence.
- **Dependencies.** Document Parsing, Embedding/Indexing, Search, ML, Report Engine.
- **Validation.** Recall/precision + false-match rate on benchmark (`PRD.md §7`); evidence completeness; citation-aware correctness.
- **Collaboration.** ↔ Search (candidates), ↔ AI Detection (rewrite signals), ↔ Report.

### 14. AI Detection Agent
- **Objective.** Estimate AI-generation likelihood — honestly and probabilistically.
- **Responsibilities.** Ensemble over NLP features + transformer classifiers (RoBERTa/DeBERTa/ModernBERT/DistilBERT family); document- and sentence-level probability, confidence, explainability, burstiness/feature visualizations, human-likelihood score.
- **Workflow.** Parsed doc → features (NLP) → classifiers (ML) → ensemble + calibrate → explainable output with caveats.
- **Input.** Parsed document + features. **Output.** Calibrated, explainable predictions — **never absolute.**
- **Dependencies.** NLP, ML, Document Parsing.
- **Validation.** ROC-AUC + calibration curves; false-positive analysis; mandatory caveat present in every output.
- **Collaboration.** ↔ NLP/ML; ↔ Plagiarism (rewrite detection); ↔ Frontend (evidence UI).

### 15. Document Parsing Agent
- **Objective.** Turn any document into clean, structured text.
- **Responsibilities.** Parse PDF/DOCX/TXT/RTF/ODT/HTML/Markdown/LaTeX/EPUB; OCR (Tesseract/vision); layout, table/figure/formula/reference extraction; heading/section classification; language detection; metadata; semantic chunking for RAG.
- **Workflow.** File → sanitize (untrusted!) → parse → structure → chunk → emit `ParseResult`.
- **Input.** Uploaded file (untrusted). **Output.** Structured, chunked, typed parse result.
- **Dependencies.** Security (sandboxing), Embedding pipeline (consumer).
- **Validation.** Extraction accuracy per format; OCR quality; injection-safe parsing.
- **Collaboration.** Feeds Plagiarism, AI Detection, Citation, Embedding.

### 16. Search Crawling Agent
- **Objective.** Ingest scholarly metadata from licensed sources only.
- **Responsibilities.** Poll/harvest official APIs (Crossref/OpenAlex/PubMed/DOAJ/Europe PMC/arXiv/Semantic Scholar/OpenAIRE/CORE); rate-limit-respectful; normalize + dedup; record provenance; hand to Indexing/Embedding pipelines.
- **Workflow.** Source schedule → fetch (respecting ToS/rate limits) → normalize → provenance-stamp → enqueue for indexing.
- **Input.** Source API credentials + schedules. **Output.** Normalized works with `source_provenance`.
- **Dependencies.** Indexing/Embedding pipelines, Security (secrets).
- **Validation.** ToS/rate-limit compliance; dedup accuracy; **hard block on Sci-Hub/pirated sources.**
- **Collaboration.** Feeds Search, Academic Research, Plagiarism corpus.

### 17. Monitoring Agent
- **Objective.** Keep the platform observable and healthy at scale.
- **Responsibilities.** OpenTelemetry tracing, Prometheus metrics, Grafana dashboards, Loki logs, Jaeger traces, alerting, SLO/error-budget tracking, circuit breakers, queue monitoring, load-test analysis.
- **Workflow.** Instrument → collect → dashboard → alert → report SLOs → recommend scaling.
- **Input.** Telemetry from all services. **Output.** Dashboards, alerts, SLO reports.
- **Dependencies.** DevOps, every service.
- **Validation.** Alert coverage on golden signals; SLOs defined and tracked; no blind spots.
- **Collaboration.** ↔ DevOps (autoscaling), ↔ QA (load tests), ↔ Security (anomaly signals).

---

## Collaboration pipelines (end-to-end)

**Plagiarism check.**
`Frontend upload → Document Parsing → Embedding/Indexing → Plagiarism (candidates via Search, scoring via ML) → Report Engine → Frontend`, observed by Monitoring, gated by Security.

**AI detection.**
`Frontend → Document Parsing → NLP features → ML classifiers → AI Detection ensemble/calibration → Frontend (explainable, caveated)`.

**Literature discovery.**
`Frontend query → Academic Research → Search Engineer (federate + rerank) ← Crawling-fed indexes → Citation enrichment → Frontend`.

**Every pipeline** is defined by contracts authored by the Architect, tested by QA, secured by Security, deployed by DevOps, and watched by Monitoring.

---

*Agents are collaborators, not silos. When in doubt about a boundary or contract, escalate to the Software Architect Agent; when in doubt about scope, escalate to the Product Manager Agent.*
