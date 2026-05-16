from __future__ import annotations

import asyncio
import logging
import os
import signal
from typing import cast

from dotenv import load_dotenv

import psycopg

from robot import db as rdb
from robot.crypto import decrypt
from robot.domain.types import RUC
from robot.obs.logging import configure_logging, new_run_id
from robot.pipeline.lookup_executor import execute_lookup
from robot.pool import SessionPool, Slot
from robot.providers.geonode import GeoNodeConfig, ProxyType, _GATEWAY_HOST_BY_NAME


load_dotenv(override=False)
logger = logging.getLogger(__name__)

DATABASE_URL = os.environ["DATABASE_URL"]
POOL_SIZE = int(os.getenv("ROBOT_POOL_SIZE", "10"))
CHROME_BINARY = os.getenv("CHROME_BINARY", "")
SESSION_BUDGET = int(os.getenv("ROBOT_SESSION_BUDGET", "10"))
WAIT_MIN_S = float(os.getenv("ROBOT_WAIT_MIN_S", "8"))
WAIT_MAX_S = float(os.getenv("ROBOT_WAIT_MAX_S", "12"))
BAN_COOLDOWN_S = float(os.getenv("ROBOT_BAN_COOLDOWN_S", "180"))
CAPTCHA_TIMEOUT_S = float(os.getenv("ROBOT_CAPTCHA_TIMEOUT_S", "30"))
CAPTCHA_TIMEOUT_FIRST_S = float(os.getenv("ROBOT_CAPTCHA_TIMEOUT_FIRST_S", "45"))
CAPTCHA_SAME_SESSION_RETRIES = int(os.getenv("ROBOT_CAPTCHA_SAME_SESSION_RETRIES", "1"))
CAPTCHA_FIRST_TOKEN_JITTER_MAX_S = float(os.getenv("ROBOT_CAPTCHA_FIRST_TOKEN_JITTER_MAX_S", "5"))
PAGE_SIZE = int(os.getenv("ROBOT_PAGE_SIZE", "100"))

configure_logging(debug=os.getenv("ROBOT_DEBUG", "").lower() in {"1", "true"})


def _make_geonode_config() -> GeoNodeConfig:
    proxy_type = cast("ProxyType", os.getenv("GEONODE_TYPE", "residential"))
    gateway = os.getenv("GEONODE_GATEWAY", "fr")
    lifetime = int(os.getenv("GEONODE_LIFETIME", "10"))
    if gateway not in _GATEWAY_HOST_BY_NAME:
        msg = "GEONODE_GATEWAY must be one of " + "|".join(sorted(_GATEWAY_HOST_BY_NAME))
        raise RuntimeError(msg)
    return GeoNodeConfig(
        user=os.environ["GEONODE_USER"],
        password=os.environ["GEONODE_PASS"],
        host=_GATEWAY_HOST_BY_NAME[gateway],
        proxy_type=proxy_type,
        country=os.getenv("GEONODE_COUNTRY", ""),
        state=os.getenv("GEONODE_STATE", ""),
        city=os.getenv("GEONODE_CITY", ""),
        asn=os.getenv("GEONODE_ASN", ""),
        strict_off=os.getenv("GEONODE_STRICT_OFF", "").lower() in {"1", "true"},
        lifetime=lifetime,
    )


async def _claim_with_wait(conn: psycopg.AsyncConnection, shutdown: asyncio.Event) -> dict | None:
    """Claim a job; if none available, block on NOTIFY new_work or shutdown."""
    notifies = conn.notifies()
    while not shutdown.is_set():
        job = await rdb.claim_next(conn)
        if job:
            return job
        notify_task = asyncio.ensure_future(notifies.__anext__())
        shutdown_task = asyncio.ensure_future(shutdown.wait())
        try:
            await asyncio.wait([notify_task, shutdown_task], return_when=asyncio.FIRST_COMPLETED)
        finally:
            for task in (notify_task, shutdown_task):
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except (asyncio.CancelledError, StopAsyncIteration):
                        pass
    return None


async def _run_slot(slot: Slot, shutdown: asyncio.Event) -> None:
    """One worker coroutine per session slot. Claims and processes jobs independently."""
    async with await psycopg.AsyncConnection.connect(DATABASE_URL, autocommit=True) as conn:
        await conn.execute("LISTEN new_work")

        while not shutdown.is_set():
            job = await _claim_with_wait(conn, shutdown)
            if job is None:
                break

            upload_job_id: str = job["upload_job_id"]
            item_id: str = job["id"]
            ruc_str: str = job["ruc"]

            user_id = await rdb.get_user_id(conn, upload_job_id)
            if not user_id:
                logger.error("upload_job_not_found upload_job_id=%s", upload_job_id)
                continue

            creds = await rdb.get_proxy_credentials(conn, user_id)
            if not creds:
                logger.error("no_credentials user_id=%s", user_id)
                continue

            proxy_pass = decrypt(creds["password_enc"])

            user_geonode = GeoNodeConfig(
                user=creds["username"],
                password=proxy_pass,
                host=slot.runtime._geonode.host,
                proxy_type=slot.runtime._geonode.proxy_type,
                country=slot.runtime._geonode.country,
                state=slot.runtime._geonode.state,
                city=slot.runtime._geonode.city,
                asn=slot.runtime._geonode.asn,
                strict_off=slot.runtime._geonode.strict_off,
                lifetime=slot.runtime._geonode.lifetime,
            )
            slot.runtime._geonode = user_geonode

            lookup = await asyncio.to_thread(
                execute_lookup,
                run_id=new_run_id(),
                worker_id=1,
                runtime=slot.runtime,
                ruc=RUC(ruc_str),
                page_size=PAGE_SIZE,
                ban_cooldown_s=BAN_COOLDOWN_S,
            )

            carriers = {r.carrier: r.lines for r in lookup.carrier_counts if r.lines > 0}
            is_active = lookup.total_lines > 0
            providers = sorted(carriers.keys()) if carriers else []
            error: str | None = None
            if lookup.status.value == "failed":
                parts = [lookup.error_code, lookup.error_detail]
                error = ": ".join(p for p in parts if p) or None

            wrote = await rdb.write_result(
                conn,
                item_id,
                upload_job_id,
                is_active=is_active,
                carrier_counts=carriers,
                providers=providers,
                error=error,
            )
            if wrote:
                await rdb.try_complete_upload(conn, upload_job_id)

    slot.runtime.close_active(cooldown_s=0.0)


async def main() -> None:
    geonode = _make_geonode_config()

    pool = SessionPool(
        size=POOL_SIZE,
        geonode=geonode,
        chrome_binary=CHROME_BINARY,
        session_budget=SESSION_BUDGET,
        wait_min_s=WAIT_MIN_S,
        wait_max_s=WAIT_MAX_S,
        captcha_timeout_s=CAPTCHA_TIMEOUT_S,
        captcha_timeout_first_s=CAPTCHA_TIMEOUT_FIRST_S,
        captcha_same_session_retries=CAPTCHA_SAME_SESSION_RETRIES,
        captcha_first_token_jitter_max_s=CAPTCHA_FIRST_TOKEN_JITTER_MAX_S,
    )

    async with await psycopg.AsyncConnection.connect(DATABASE_URL) as conn:
        await rdb.reset_stale_items(conn)

    shutdown = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, shutdown.set)

    logger.info("robot_worker_starting pool_size=%d", POOL_SIZE)
    tasks = [
        asyncio.create_task(_run_slot(pool.slot(i), shutdown))
        for i in range(POOL_SIZE)
    ]
    await asyncio.gather(*tasks)
    logger.info("robot_worker_stopped")


if __name__ == "__main__":
    asyncio.run(main())
