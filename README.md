# OrigoText

Academic integrity platform: evidence-first plagiarism detection, calibrated AI-text detection, and document parsing. Next.js App Router frontend, FastAPI backend.

Scope lives in [PRD.md](PRD.md), engineering rules in [CLAUDE.md](CLAUDE.md), the agent model in [AGENTS.md](AGENTS.md), and the visual system in [DESIGN.md](DESIGN.md).

## Running locally

Two processes, two terminals. Start the backend first — the frontend calls it.

### Backend (port 8000)

```bash
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
