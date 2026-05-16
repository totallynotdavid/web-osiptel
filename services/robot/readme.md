# robot

A small Python microservice wrapping the OSIPTEL lookup pipeline.

A rough draft of the API could look like:

```
POST /lookup
Body: { "ruc_list": ["20123456789", ...], "proxy_user": "...", "proxy_pass": "..." }
Response: { "results": [{ "ruc": "...", "active": true, "carriers": {...}, "error": null }] }

GET /health
Response: { "status": "ok" }
```

To run it, just do:

```bash
uv run uvicorn robot.main:app --port 8001
```
