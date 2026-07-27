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

Open `http://localhost:3000`. It redirects to `/plagiarism`. `NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:8000`, so no env file is needed for the default setup.

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

Put the same key in `.env.local` as `NEXT_PUBLIC_API_KEY` and restart `bun dev`. Without it every request returns 401.

## Verification

```bash
cd backend && python -m pytest tests -q
cd backend && python -m ruff check . && python -m mypy --strict .
bun run typecheck && bun run lint && bun run build
```

After changing any request or response model, regenerate the committed spec:

```bash
cd backend && python scripts/export_openapi.py
```

## Layout

```
app/                 App Router routes; (dashboard) group wraps the four screens
components/          UI per feature, plus shared primitives in ui/
lib/                 Types, pure logic, and the API boundary in lib/api/
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

| Method | Path                       | Purpose                                                  |
| ------ | -------------------------- | -------------------------------------------------------- |
| `POST` | `/v1/documents`            | Upload and parse a document into sanitized, chunked text |
| `POST` | `/v1/plagiarism/checks`    | Similarity report with matched sources and spans         |
| `POST` | `/v1/ai-detection/analyze` | AI-likelihood estimate with per-sentence breakdown       |
| `GET`  | `/healthz`, `/readyz`      | Liveness and readiness                                   |

Authenticate with `X-API-Key`. Errors are `application/problem+json`. Analysis endpoints allow 30 requests/minute per key, uploads 10/minute, both reported via `X-RateLimit-*` headers and `Retry-After` on 429.

Nine input formats parse: PDF, DOCX, ODT, EPUB, HTML, Markdown, LaTeX, RTF, TXT. Format is resolved from magic bytes, not from the client's declared content type. Scanned PDFs with no text layer return 422 rather than empty output — OCR is not wired up yet.

## Known gaps

- Rate limit counters live in process memory, so they are per-instance. Horizontal scaling needs a Redis adapter.
- `NEXT_PUBLIC_API_KEY` ships to the browser. It gates the deployment, not individual users; per-user auth needs a server-side proxy plus JWT/OAuth.
- Parsing runs in a worker thread inside the request. Large files should move to a queue, and `POST /v1/documents` should return a job id as described in `PRD.md §11`.
- The citations and search screens render sample data; their backend contexts do not exist yet.
- No OCR, no persistence — the corpus is in-memory and results are not stored.

## AI detection

Detection is probabilistic. Every result carries confidence and caveats, and the UI states that scores are not proof of authorship. False positives are known to affect non-native writers and heavily edited text. Do not use a score as sole evidence of misconduct.

## Data sources

Scholarly metadata comes only from officially licensed APIs, each record carrying its `source_provenance`. Sci-Hub and pirated corpora are prohibited.
