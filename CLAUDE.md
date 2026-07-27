@AGENTS.md

# OrigoText — Engineering Guide (CLAUDE.md)

> This document is the contract every contributor — human or AI agent — follows while building OrigoText. It defines how we write, review, test, secure, and ship code. When guidance here conflicts with habit or training defaults, **this document wins.** Product scope lives in `PRD.md`; the agent operating model in `AGENTS.md`; reusable workflows in `SKILL.md`; the visual system in `DESIGN.md`.

---

## 1. First principles

1. **Production-ready or not merged.** No placeholders, no mock implementations, no TODO stubs left in shipped code, no "AI slop" filler.
2. **No inline comments.** Code must be self-explanatory through naming and structure. Explanation belongs in docstrings/API contracts, tests, and docs — not scattered comments. (Docstrings for public interfaces are allowed and encouraged; narrative `//`/`#` comments are not.)
3. **Types are non-negotiable.** TypeScript `strict` and Python typed end-to-end. No `any`, no untyped `dict` boundaries.
4. **Every function** has input validation, error handling, structured logging, and observability where it crosses a boundary.
5. **Every module** is reusable, modular, testable, and independently deployable within its bounded context.
6. **Security and privacy are features**, designed in from the first line — not bolted on.
7. **Honesty in outputs.** Detection results carry confidence and caveats. We never ship absolute claims on probabilistic problems.

---

## 2. Architecture principles

We build on **Clean Architecture + Domain-Driven Design + Hexagonal (Ports & Adapters)**, with **SOLID**, **CQRS**, **Repository Pattern**, **Dependency Injection**, and **Event-Driven Architecture**.

- **Dependency rule.** Dependencies point inward: `domain` ← `application` ← `infrastructure`/`interface`. The domain layer imports nothing framework-specific.
- **Bounded contexts.** `plagiarism`, `ai-detection`, `search`, `citation`, `document`, `identity`, `billing`, `reporting` are separate contexts with their own models. Never share ORM entities across contexts; communicate via events or explicit contracts.
- **Ports & adapters.** Domain defines ports (interfaces); infrastructure provides adapters (Postgres repo, Elasticsearch client, AI Gateway client). Swapping an adapter must not touch domain code.
- **CQRS.** Separate write commands from read queries; read models may be denormalized (Elasticsearch/materialized views) for speed.
- **Events.** State changes emit domain events over RabbitMQ; consumers are idempotent and replay-safe.
- **AI Gateway.** All LLM/embedding calls go through the gateway abstraction — never call a provider SDK directly from a feature service.

---

## 3. Repository layout

```
/frontend            Next.js App Router app
/backend             FastAPI services (one package per bounded context)
/ai-services         model serving, ensembles, inference orchestration
/crawler             licensed-source metadata crawlers
/worker              Celery workers (parsing, embedding, indexing, reports)
/search-engine       Elasticsearch mappings, query builders, rerankers
/indexing-pipeline   document → index flows
/embedding-pipeline  chunking → vector generation → pgvector
/citation-engine     reference parsing, formatting, graph
/plagiarism-engine   lexical + semantic + RAG detection
/ai-detector         feature extractors + ensemble classifiers
/report-engine       PDF / HTML / JSON report generation
/document-parser     multi-format parsing + OCR
/monitoring          OpenTelemetry, dashboards, alert rules
/infrastructure      Docker, k8s, Helm, Terraform, Nginx
/deployment          environment configs, feature flags, blue-green
/testing             shared fixtures, contract tests, load tests
/documentation       ADRs, runbooks, API references
/assets              brand, icons, illustrations
/database            schema, migrations, seed
/automation          scripts, generators, CI helpers
PRD.md CLAUDE.md AGENTS.md SKILL.md DESIGN.md
```

---

## 4. Language & framework rules

### 4.1 TypeScript / Frontend
- Next.js App Router, React, TypeScript `strict`. **Read the guide in `node_modules/next/dist/docs/` before writing Next.js code** — this Next.js version has breaking changes vs. training data.
- State: TanStack Query for server state, Zustand for client state. Do not duplicate server state in Zustand.
- Forms: React Hook Form + Zod schemas. Validation schemas are shared between form and API boundary where possible.
- Styling: Tailwind + shadcn/ui, using tokens from `DESIGN.md`. No arbitrary magic values when a token exists.
- Motion: Framer Motion, respecting `prefers-reduced-motion`.
- No browser storage APIs in shared components unless explicitly required and abstracted.

### 4.2 Python / Backend
- Latest stable Python, FastAPI, fully type-annotated; `mypy --strict` (or `pyright`) clean.
- Pydantic v2 models at every boundary; never accept untyped payloads.
- Async-first I/O; blocking work runs in Celery workers, not request handlers.
- Repository interfaces in the domain; SQLAlchemy/Elasticsearch adapters in infrastructure.
- OpenAPI 3.1 generated and committed for every service.

---

## 5. Naming conventions

| Kind | Convention | Example |
|---|---|---|
| TS variables/functions | `camelCase` | `computeSimilarity` |
| TS types/components/classes | `PascalCase` | `PlagiarismReport` |
| TS constants | `SCREAMING_SNAKE_CASE` | `MAX_UPLOAD_BYTES` |
| Python functions/vars | `snake_case` | `compute_similarity` |
| Python classes | `PascalCase` | `PlagiarismCheck` |
| Files (TS components) | `PascalCase.tsx` | `SimilarityBar.tsx` |
| Files (TS utils/py) | `kebab-case.ts` / `snake_case.py` | `text-align.ts` |
| DB tables/columns | `snake_case`, plural tables | `plagiarism_checks` |
| Events | `context.aggregate.past_tense` | `plagiarism.check.completed` |
| API paths | lowercase, plural, versioned | `/v1/plagiarism/checks` |

Names describe intent, not implementation. Booleans read as predicates (`isCalibrated`, `hasEvidence`).

---

## 6. Coding style

- **No comments** (see §1.2). Prefer extracting a well-named function over commenting a block.
- Small functions, single responsibility, early returns over deep nesting.
- Pure functions in the domain; side effects at the edges.
- Errors are typed and meaningful; never swallow exceptions; never `except: pass`.
- Immutability by default; avoid shared mutable state.
- Formatting is automated: Prettier + ESLint (TS), Ruff + Black-compatible formatting (Python). CI rejects unformatted code.
- No dead code, no unused exports, no commented-out code.

---

## 7. Error handling, logging, observability

- **Errors.** REST returns RFC 7807 `application/problem+json`. Domain raises typed domain errors; adapters translate to transport errors at the edge.
- **Logging.** Structured JSON logs with correlation/trace IDs; never log secrets, tokens, full document bodies, or PII. Log levels used deliberately.
- **Tracing.** OpenTelemetry spans across service and queue boundaries; propagate trace context through events.
- **Metrics.** Prometheus counters/histograms for request latency, queue depth, model latency, cache hit rate, detection quality signals.
- **Health.** Every service exposes `/healthz` (liveness) and `/readyz` (readiness).

---

## 8. Testing standards

Coverage is a floor, not a goal — tests must be meaningful.

- **Unit** (domain + pure logic): ≥ 90% for engines (plagiarism, ai-detector, citation).
- **Integration**: adapters against real Postgres/Elasticsearch/Redis via containers.
- **Contract**: consumer-driven contracts between services and against OpenAPI specs.
- **End-to-end**: critical flows (upload → check → report) in CI.
- **Load**: k6/Locust against p95 targets in `PRD.md §7`.
- **Security**: SAST, dependency scanning, and the checks in §11.
- **Accessibility**: axe + keyboard-nav tests on key screens.
- **Snapshot / visual regression**: for design-system components.

No feature is "done" without tests. Detection engines additionally require evaluation against the benchmark corpus with reported precision/recall/AUC and calibration.

---

## 9. Git workflow

- **Branching (trunk-based with short-lived branches).** `main` is always releasable. Work on `feat/<context>-<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- **Commits — Conventional Commits.** `type(scope): summary` where type ∈ `feat|fix|docs|style|refactor|perf|test|build|ci|chore`. Example: `feat(plagiarism): add MinHash candidate retrieval`. Imperative mood, ≤ 72-char summary, body explains *why*.
- **No direct pushes to `main`.** Everything via PR.

---

## 10. Pull request guidelines

A PR must:
1. Be scoped to one logical change; small and reviewable.
2. Describe *what* and *why*, link the PRD/issue, and note the bounded context touched.
3. Pass all CI gates: type-check, lint, tests, contract tests, security scan, build.
4. Include/adjust tests and OpenAPI/docs.
5. Contain no secrets, no commented-out code, no comments in source.
6. Get at least one approving review (Security Engineer review required for auth, crypto, upload, or AI-Gateway changes).

PRs that add data sources must document `source_provenance` and confirm the source is officially licensed. **Any PR introducing Sci-Hub or pirated data is rejected automatically.**

---

## 11. Security standards

- **AuthN/Z.** JWT + OAuth2; RBAC + ABAC enforced in the application layer, never only in the UI. MFA for privileged roles.
- **Input.** Validate and sanitize everything; parameterized queries only (no string-built SQL); size/type-limited uploads with malware scanning and content-type verification.
- **Prompt-injection defense.** Treat all document/user text as untrusted; never let parsed content alter system instructions; strip/escape tool-control tokens; sandbox parsing; separate untrusted content from prompts with clear delimiters and role boundaries.
- **Secrets.** From a vault/secret manager only; never in code, env files committed to git, or logs. API keys rotate on a schedule.
- **Transport & storage.** TLS everywhere; encryption at rest for documents and DB; signed, expiring URLs for object storage.
- **Web.** CSP, CSRF tokens, XSS output-encoding, secure/httpOnly/SameSite cookies, per-key and per-IP rate limiting.
- **Compliance.** OWASP Top Ten and GDPR alignment; audit-log every privileged and data-access action.

---

## 12. Performance & optimization

- Cache aggressively and correctly: embeddings, metadata lookups, and reranking results are cached with explicit invalidation.
- Tiered model routing in the AI Gateway: cheapest capable model first, escalate only on ambiguity.
- Precompute embeddings and indexes offline; keep request paths thin.
- Stream long jobs over WebSocket/SSE; never block a request on a multi-second model call.
- Paginate with cursors; never unbounded queries.
- Measure before optimizing; every perf claim is backed by a benchmark.

---

## 13. Deployment rules

- Docker images per service; Helm charts; Terraform-managed infra; Nginx ingress.
- Environments strictly separated: `development`, `staging`, `production`, each with its own config and secrets.
- **Feature flags** gate incomplete features; **blue-green** deploys with automated health checks and instant rollback.
- Migrations are backward-compatible and run automatically in a controlled step; never destructive without an approved plan.
- No manual production changes; everything is Infrastructure-as-Code and reproducible.

---

## 14. AI-agent development lifecycle

Agents (see `AGENTS.md`) follow this loop for every task:

1. **Understand** — read `PRD.md` for scope, this file for rules, and the relevant `SKILL.md` workflow.
2. **Plan** — produce a task list; identify bounded context, contracts, and tests up front.
3. **Design contracts first** — types, OpenAPI, events, and test cases before implementation.
4. **Implement** — smallest correct change; no comments; typed; validated; observable.
5. **Verify** — run type-check, lint, tests; for engines, run evaluation and report metrics.
6. **Review** — self-review against the PR checklist (§10); hand off to Security Engineer agent when §10 requires.
7. **Document** — update OpenAPI, ADRs, and any affected doc.

**Context engineering.** Prompts to LLMs are structured, delimited, and role-separated; untrusted content is clearly fenced; outputs are schema-validated (Zod/Pydantic) before use.

---

## 15. Definition of Done

- Meets the requirement in `PRD.md`; contracts and OpenAPI committed.
- Typed, validated, observable, secure; no comments, no placeholders.
- Tests written and passing at the required tiers; engines report quality + calibration.
- CI green; PR checklist satisfied; docs updated.
- For data sources: provenance documented and licensing confirmed.

---

*If a rule here blocks you, do not silently work around it — raise it and update this document via a `docs(claude)` PR.*
