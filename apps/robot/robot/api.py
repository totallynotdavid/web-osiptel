from __future__ import annotations

import logging
import os

from dataclasses import dataclass

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from robot.domain.types import RUC, Status
from robot.obs.logging import configure_logging, new_run_id
from robot.pipeline.lookup_executor import execute_lookup
from robot.pipeline.session_runtime import SessionRuntime
from robot.providers.geonode import load_geonode_config


logger = logging.getLogger(__name__)


class LookupRequest(BaseModel):
    ruc_list: list[str] = Field(min_length=1, max_length=30)
    proxy_user: str = Field(min_length=1)
    proxy_pass: str = Field(min_length=1)


class LookupResultItem(BaseModel):
    ruc: str
    active: bool
    carriers: dict[str, int] | None
    providers: list[str] | None
    error: str | None


class LookupResponse(BaseModel):
    results: list[LookupResultItem]


@dataclass(frozen=True)
class ServiceConfig:
    env_file: str
    max_batch_size: int
    page_size: int
    session_budget: int
    wait_min_s: float
    wait_max_s: float
    ban_cooldown_s: float
    captcha_timeout_s: float
    captcha_timeout_first_s: float
    captcha_same_session_retries: int
    captcha_first_token_jitter_max_s: float
    chrome_binary: str
    auth_token: str


def _int_env(name: str, fallback: int, *, minimum: int) -> int:
    raw = os.getenv(name, "").strip()
    if raw == "":
        return fallback
    value = int(raw)
    if value < minimum:
        msg = f"{name} must be >= {minimum}"
        raise ValueError(msg)
    return value


def _float_env(name: str, fallback: float, *, minimum: float) -> float:
    raw = os.getenv(name, "").strip()
    if raw == "":
        return fallback
    value = float(raw)
    if value < minimum:
        msg = f"{name} must be >= {minimum}"
        raise ValueError(msg)
    return value


def load_service_config() -> ServiceConfig:
    wait_min_s = _float_env("ROBOT_WAIT_MIN_S", 10.0, minimum=0.0)
    wait_max_s = _float_env("ROBOT_WAIT_MAX_S", 15.0, minimum=0.0)
    if wait_max_s < wait_min_s:
        msg = "ROBOT_WAIT_MAX_S must be >= ROBOT_WAIT_MIN_S"
        raise ValueError(msg)

    return ServiceConfig(
        env_file=os.getenv("ROBOT_ENV_FILE", ".env"),
        max_batch_size=_int_env("ROBOT_MAX_BATCH_SIZE", 30, minimum=1),
        page_size=_int_env("ROBOT_PAGE_SIZE", 100, minimum=1),
        session_budget=_int_env("ROBOT_SESSION_BUDGET", 5, minimum=1),
        wait_min_s=wait_min_s,
        wait_max_s=wait_max_s,
        ban_cooldown_s=_float_env("ROBOT_BAN_COOLDOWN_S", 180.0, minimum=0.0),
        captcha_timeout_s=_float_env("ROBOT_CAPTCHA_TIMEOUT_S", 20.0, minimum=1.0),
        captcha_timeout_first_s=_float_env(
            "ROBOT_CAPTCHA_TIMEOUT_FIRST_S", 40.0, minimum=1.0
        ),
        captcha_same_session_retries=_int_env(
            "ROBOT_CAPTCHA_SAME_SESSION_RETRIES", 1, minimum=0
        ),
        captcha_first_token_jitter_max_s=_float_env(
            "ROBOT_CAPTCHA_FIRST_TOKEN_JITTER_MAX_S", 5.0, minimum=0.0
        ),
        chrome_binary=os.getenv("CHROME_BINARY", "").strip(),
        auth_token=os.getenv("ROBOT_API_TOKEN", "").strip(),
    )


CONFIG = load_service_config()
configure_logging(debug=os.getenv("ROBOT_DEBUG", "").lower() in {"1", "true", "yes"})
app = FastAPI(title="robot", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/lookup", response_model=LookupResponse)
def lookup(
    payload: LookupRequest, x_robot_token: str | None = Header(default=None)
) -> LookupResponse:
    if CONFIG.auth_token and x_robot_token != CONFIG.auth_token:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if len(payload.ruc_list) > CONFIG.max_batch_size:
        raise HTTPException(
            status_code=400,
            detail=f"ruc_list exceeds limit {CONFIG.max_batch_size}",
        )

    try:
        geonode = load_geonode_config(
            env_file=CONFIG.env_file,
            user=payload.proxy_user,
            password=payload.proxy_pass,
        )
    except Exception as exc:
        logger.warning("lookup_config_invalid error=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    runtime = SessionRuntime(
        run_id=new_run_id(),
        worker_id=1,
        slot_id=1,
        geonode=geonode,
        chrome_binary=CONFIG.chrome_binary,
        session_budget=CONFIG.session_budget,
        wait_min_s=CONFIG.wait_min_s,
        wait_max_s=CONFIG.wait_max_s,
        captcha_timeout_s=CONFIG.captcha_timeout_s,
        captcha_timeout_first_s=CONFIG.captcha_timeout_first_s,
        captcha_same_session_retries=CONFIG.captcha_same_session_retries,
        captcha_first_token_jitter_max_s=CONFIG.captcha_first_token_jitter_max_s,
    )
    try:
        results: list[LookupResultItem] = []
        for raw_ruc in payload.ruc_list:
            lookup_result = execute_lookup(
                run_id=new_run_id(),
                worker_id=1,
                runtime=runtime,
                ruc=RUC(raw_ruc),
                page_size=CONFIG.page_size,
                ban_cooldown_s=CONFIG.ban_cooldown_s,
            )
            carriers = {
                row.carrier: row.lines
                for row in lookup_result.carrier_counts
                if row.lines > 0
            }
            providers = sorted(carriers.keys())
            error = None
            if lookup_result.status == Status.FAILED:
                error = (
                    f"{lookup_result.error_code}: {lookup_result.error_detail}".strip(
                        ": "
                    ).strip()
                )
                if error == "":
                    error = "lookup_failed"
            results.append(
                LookupResultItem(
                    ruc=str(lookup_result.ruc),
                    active=lookup_result.status == Status.OK
                    and lookup_result.total_lines > 0,
                    carriers=carriers or None,
                    providers=providers or None,
                    error=error,
                )
            )
        return LookupResponse(results=results)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("lookup_unhandled_error")
        raise HTTPException(
            status_code=503, detail=f"Lookup execution failed: {exc}"
        ) from exc
    finally:
        runtime.close_active(cooldown_s=0.0)
