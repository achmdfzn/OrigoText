# OrigoText

Academic integrity platform: evidence-first plagiarism detection, calibrated AI-text detection, and document parsing. Next.js App Router frontend, FastAPI backend.

Scope lives in [PRD.md](PRD.md), engineering rules in [CLAUDE.md](CLAUDE.md), the agent model in [AGENTS.md](AGENTS.md), and the visual system in [DESIGN.md](DESIGN.md).

## Running locally

Two processes, two terminals. Start the backend first — the frontend calls it.

### Backend (port 8000)

Python 3.11 or newer.

```bash
python -m venv .venv
source .venv/Scripts/activate    # Windows bash; use .venv/bin/activate on macOS/Linux
cd backend
python -m pip install -e ".[dev]"
python -m uvicorn main:app --reload --port 8000
```

With no configuration the backend runs in `development` mode and accepts requests without an API key. Interactive docs at `http://localhost:8000/docs`, liveness at `/healthz`.

### Frontend (port 3000)

```bash
bun install
bun dev
```

Open `http://localhost:3000`. It redirects to `/plagiarism`. Browser requests use the same-origin Next.js BFF under `/api`; the API key and FastAPI URL stay server-only.

The default BFF target is `http://localhost:8000`, so no env file is needed for the default development setup.

To override anything, copy the examples:

```bash
cp .env.example .env.local
cp backend/.env.example backend/.env
```

### Running with authentication enabled

Any environment other than `development` requires API keys, and the app refuses to start without them.

```bash
cd backend
export ORIGOTEXT_ENVIRONMENT=production
export ORIGOTEXT_API_KEYS=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
python -m uvicorn main:app --port 8000
```

Put the same key in `.env.local` as `ORIGOTEXT_API_KEY`, set `ORIGOTEXT_API_BASE_URL=http://localhost:8000`, and restart `bun dev`. The values are read only by Next.js Route Handlers and never enter the browser bundle. Without a matching key, FastAPI returns 401 through the BFF.

## Verification

```bash
cd backend && python -m pytest tests -q
cd backend && python -m ruff check . && python -m mypy --strict .
bun run typecheck && bun run lint && bun test && bun run build
```

After changing any request or response model, regenerate the committed spec:

```bash
cd backend && python scripts/export_openapi.py
```

## Layout

```
app/                 App Router routes; (dashboard) group wraps the four screens
app/api/              Next.js BFF; injects server-only backend credentials
components/          UI per feature, plus shared primitives in ui/
lib/                 Types, pure logic, browser API client, server proxy
backend/
  document/          upload, sanitization, parsing, chunking
  plagiarism/        lexical similarity against the licensed corpus
  ai_detection/      feature-based AI-likelihood estimation
  shared/            settings, auth, rate limiting, RFC 7807 problems, logging
  openapi.json       committed contract, generated from the app
```

Each backend context follows `domain ← application ← infrastructure/interface`. The domain layer imports nothing framework-specific.

`lib/api/wire.ts` holds the snake_case shapes FastAPI actually returns; `lib/api/mappers.ts` is the only place naming conventions cross. Nothing outside `lib/api` should import the wire types.

## API

The browser only ever calls the same-origin BFF. Each route forwards to FastAPI after attaching the server-only key.

| Browser calls                    | BFF forwards to                 | Purpose                                              |
| -------------------------------- | ------------------------------- | ---------------------------------------------------- |
| `POST /api/documents`            | `POST /v1/documents`            | Queue a document for parsing; returns 202 with a job |
| `GET /api/documents/{id}`        | `GET /v1/documents/{id}`        | Job status, plus the parse result once complete      |
| `GET /api/documents/{id}/stream` | `GET /v1/documents/{id}/stream` | Realtime parse progress as server-sent events        |
| `POST /api/plagiarism/checks`    | `POST /v1/plagiarism/checks`    | Similarity report with matched sources and spans     |
| `POST /api/ai-detection/analyze` | `POST /v1/ai-detection/analyze` | AI-likelihood estimate with per-sentence breakdown   |
| —                                | `GET /healthz`, `/readyz`       | Liveness and readiness                               |

FastAPI authenticates with `X-API-Key`. Errors stay `application/problem+json` end to end. Analysis endpoints allow 30 requests/minute per key, uploads 10/minute, surfaced to the browser through forwarded `X-RateLimit-*` headers and `Retry-After` on 429.

The proxy rejects wrong media types (415) and oversized bodies (413) before reaching FastAPI, and converts an unreachable or slow backend into 502 and 504 instead of leaking internal errors.

Uploads are asynchronous: `POST /api/documents` returns as soon as the job is queued, so a slow document never occupies a request handler. Progress streams over server-sent events, with polling as a fallback if the stream drops. Because the queueing request has already returned, parse failures land on the job itself (`status: "failed"` with a typed `failure`) rather than as a transport error.

Nine input formats parse: PDF, DOCX, ODT, EPUB, HTML, Markdown, LaTeX, RTF, TXT. Format is resolved from magic bytes, not from the client's declared content type. Scanned PDFs with no text layer fail the job with an OCR hint rather than returning empty output — OCR is not wired up yet.

## Known gaps

- Rate limit counters live in process memory, so they are per-instance. Horizontal scaling needs a Redis adapter.
- The BFF uses one deployment key for FastAPI. Per-user identity and quotas still need JWT/OAuth propagated through the proxy.
- With `ORIGOTEXT_DATABASE_URL`, jobs, parse results, and uploaded bytes persist in PostgreSQL and queued/running jobs resume after a single backend process restarts. The in-process queue has no distributed lease, so horizontal worker scaling still needs Redis/Celery or RabbitMQ.
- Without a database URL, jobs and uploaded bytes intentionally fall back to process memory for zero-config local development.
- Uploaded bytes currently live in PostgreSQL. Private object storage with signed access and retention controls should replace the interim `document_payloads` adapter before production.
- The citations and search screens render sample data; their backend contexts do not exist yet.
- OCR is not wired up, and plagiarism/AI-detection reports are not persisted yet.

## AI detection

Detection is probabilistic. Every result carries confidence and caveats, and the UI states that scores are not proof of authorship. False positives are known to affect non-native writers and heavily edited text. Do not use a score as sole evidence of misconduct.

## Data sources

Scholarly metadata comes only from officially licensed APIs, each record carrying its `source_provenance`. Sci-Hub and pirated corpora are prohibited.
