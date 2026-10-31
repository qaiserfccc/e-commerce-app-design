# FastAPI starter

This is a small, independent FastAPI foundation for quickly starting future services. The live storefront and commerce APIs remain in Next.js and Neon; this starter intentionally does not duplicate their business logic or connect to production data.

Use Python 3.10 or later.

## Run locally

```bash
cd services/fastapi
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

On Windows PowerShell:

```powershell
cd services/fastapi
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

Open the generated interactive API docs at `http://127.0.0.1:8000/docs` and the schema at `http://127.0.0.1:8000/openapi.json`. The starter includes `/health`, `/api/v1`, and a validated example route. Configure browser CORS origins as a comma-separated `API_CORS_ORIGINS` value; leave it empty when only native or server-to-server clients need access.

## Test

```bash
pip install -r requirements-dev.txt
pytest
```

Before adding a production feature, define its request/response models, authentication and authorization, rate limits, persistence/migrations, and tests. Do not copy production secrets into this service. If connecting it to the store later, reuse the documented API contract or deliberately migrate shared business logic instead of maintaining a second implementation.
