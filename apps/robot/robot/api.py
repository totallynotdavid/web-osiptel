from __future__ import annotations

import asyncio
import logging
import os

from dataclasses import dataclass
from typing import cast

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from robot.domain.types import RUC, Status
from robot.obs.logging import configure_logging, new_run_id
from robot.pipeline.lookup_executor import execute_lookup
from robot.pipeline.session_runtime import SessionRuntime
from robot.providers.geonode import GeoNodeConfig, ProxyType, make_geonode_config


logger = logging.getLogger(__name__)

# Operational constants
MAX_BATCH_SIZE = 30
MAX_CONCURRENT = 4
SESSION_BUDGET = 10
WAIT_MIN_S = 8.0
WAIT_MAX_S = 12.0
BAN_COOLDOWN_S = 180.0
CAPTCHA_TIMEOUT_S = 30.0
CAPTCHA_TIMEOUT_FIRST_S = 45.0
CAPTCHA_SAME_SESSION_RETRIES = 1
CAPTCHA_FIRST_TOKEN_JITTER_MAX_S = 5.0
PAGE_SIZE = 100

_semaphore = asyncio.Semaphore(MAX_CONCURRENT)


class LookupRequest(BaseModel):
    ruc_list: list[str] = Field(min_length=1, max_length=MAX_BATCH_SIZE)
    proxy_user: str = Field(min_length=1)
    proxy_pass: str = Field(min_length=1)


class LookupResultItem(BaseModel):
    ruc: str
    active: bool
    carriers: dict[str, int] | None
    error: str | None


class LookupResponse(BaseModel):
    results: list[LookupResultItem]


@dataclass(frozen=True)
class ServiceConfig:
    chrome_binary: str
    auth_token: str
    geonode_gateway: str
    geonode_type: ProxyType
    geonode_country: str
    geonode_state: str
    geonode_city: str
    geonode_asn: str
    geonode_strict_off: bool
    geonode_lifetime: int
    debug: bool


def _load_service_config() -> ServiceConfig:
    load_dotenv(override=False)
    lifetime_raw = os.getenv("GEONODE_LIFETIME", "").strip()
    lifetime = int(lifetime_raw) if lifetime_raw else 10
    proxy_type_raw = os.getenv("GEONODE_TYPE", "residential")
    if proxy_type_raw not in {"residential", "datacenter", "mix"}:
        msg = "GEONODE_TYPE must be one of residential|datacenter|mix"
        raise ValueError(msg)
    return ServiceConfig(
        chrome_binary=os.getenv("CHROME_BINARY", "").strip(),
        auth_token=os.getenv("ROBOT_API_TOKEN", "").strip(),
        geonode_gateway=os.getenv("GEONODE_GATEWAY", "fr"),
        geonode_type=cast("ProxyType", proxy_type_raw),
        geonode_country=os.getenv("GEONODE_COUNTRY", ""),
        geonode_state=os.getenv("GEONODE_STATE", ""),
        geonode_city=os.getenv("GEONODE_CITY", ""),
        geonode_asn=os.getenv("GEONODE_ASN", ""),
        geonode_strict_off=os.getenv("GEONODE_STRICT_OFF", "").lower()
        in {"1", "true", "yes"},
        geonode_lifetime=lifetime,
        debug=os.getenv("ROBOT_DEBUG", "").lower() in {"1", "true", "yes"},
    )


CONFIG = _load_service_config()
configure_logging(debug=CONFIG.debug)
app = FastAPI(title="robot", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/lookup", response_model=LookupResponse)
async def lookup(
    payload: LookupRequest, x_robot_token: str | None = Header(default=None)
) -> LookupResponse:
    if CONFIG.auth_token and x_robot_token != CONFIG.auth_token:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        geonode = make_geonode_config(
            config=CONFIG,
            user=payload.proxy_user,
            password=payload.proxy_pass,
        )
    except (ValueError, RuntimeError) as exc:
        logger.warning("lookup_config_invalid error=%s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    async with _semaphore:
        return await asyncio.to_thread(_execute_lookup, payload.ruc_list, geonode)


def _execute_lookup(ruc_list: list[str], geonode: GeoNodeConfig) -> LookupResponse:
    runtime = SessionRuntime(
        run_id=new_run_id(),
        worker_id=1,
        slot_id=1,
        geonode=geonode,
        chrome_binary=CONFIG.chrome_binary,
        session_budget=SESSION_BUDGET,
        wait_min_s=WAIT_MIN_S,
        wait_max_s=WAIT_MAX_S,
        captcha_timeout_s=CAPTCHA_TIMEOUT_S,
        captcha_timeout_first_s=CAPTCHA_TIMEOUT_FIRST_S,
        captcha_same_session_retries=CAPTCHA_SAME_SESSION_RETRIES,
        captcha_first_token_jitter_max_s=CAPTCHA_FIRST_TOKEN_JITTER_MAX_S,
    )
    try:
        results: list[LookupResultItem] = []
        for raw_ruc in ruc_list:
            lookup_result = execute_lookup(
                run_id=new_run_id(),
                worker_id=1,
                runtime=runtime,
                ruc=RUC(raw_ruc),
                page_size=PAGE_SIZE,
                ban_cooldown_s=BAN_COOLDOWN_S,
            )
            carriers = {
                row.carrier: row.lines
                for row in lookup_result.carrier_counts
                if row.lines > 0
            }
            error = None
            if lookup_result.status == Status.FAILED:
                raw_error = (
                    f"{lookup_result.error_code}: {lookup_result.error_detail}".strip(
                        ": "
                    ).strip()
                )
                error = raw_error or "lookup_failed"
            results.append(
                LookupResultItem(
                    ruc=str(lookup_result.ruc),
                    active=lookup_result.status == Status.OK
                    and lookup_result.total_lines > 0,
                    carriers=carriers or None,
                    error=error,
                )
            )
        return LookupResponse(results=results)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        runtime.close_active(cooldown_s=0.0)
