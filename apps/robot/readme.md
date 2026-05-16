# robot

Python service runtime for OSIPTEL lookups.

API contract:

`GET /health`

- Response: `{ "status": "ok" }`

`POST /lookup`

- Body: `{ "ruc_list": string[], "proxy_user": string, "proxy_pass": string }`
- Response:
  `{ "results": [{ "ruc": string, "active": boolean, "carriers": object|null, "providers": string[]|null, "error": string|null }] }`

Install dependencies:

```bash
uv sync --all-groups
```

Run service:

```bash
uv run uvicorn robot.main:app --host 0.0.0.0 --port 8001
```

Run static checks:

```bash
uv run python -m mypy .
```
