from __future__ import annotations

import json

import psycopg


async def reset_stale_items(conn: psycopg.AsyncConnection) -> None:
    """On startup: reset items stuck in 'processing' for >5 min back to pending."""
    await conn.execute("""
        UPDATE upload_job_items
        SET    status = 'pending', claimed_at = NULL
        WHERE  status = 'processing'
        AND    claimed_at < EXTRACT(EPOCH FROM NOW()) * 1000 - 300000
    """)


async def claim_next(conn: psycopg.AsyncConnection) -> dict | None:
    """Atomically claim the next pending item. Returns None if queue is empty."""
    async with conn.transaction():
        rows = await conn.execute("""
            WITH claimed AS (
                SELECT i.id
                FROM   upload_job_items i
                WHERE  i.status = 'pending'
                ORDER  BY i.batch_index, i.upload_job_id
                FOR UPDATE SKIP LOCKED
                LIMIT  1
            )
            UPDATE upload_job_items
            SET    status     = 'processing',
                   claimed_at = EXTRACT(EPOCH FROM NOW()) * 1000
            WHERE  id = (SELECT id FROM claimed)
            RETURNING id, upload_job_id, ruc
        """)
        row = await rows.fetchone()
        return dict(row) if row else None


async def get_user_id(conn: psycopg.AsyncConnection, upload_job_id: str) -> str | None:
    rows = await conn.execute(
        "SELECT user_id FROM upload_jobs WHERE id = %s",
        (upload_job_id,),
    )
    row = await rows.fetchone()
    return row[0] if row else None


async def get_proxy_credentials(conn: psycopg.AsyncConnection, user_id: str) -> dict | None:
    rows = await conn.execute(
        "SELECT geonode_username, geonode_password_enc FROM proxy_credentials WHERE user_id = %s",
        (user_id,),
    )
    row = await rows.fetchone()
    if not row:
        return None
    return {"username": row[0], "password_enc": row[1]}


async def write_result(
    conn: psycopg.AsyncConnection,
    item_id: str,
    upload_job_id: str,
    *,
    is_active: bool,
    carrier_counts: dict,
    providers: list[str],
    error: str | None,
) -> bool:
    """Write lookup result. Returns True on a real transition (not a retry replay)."""
    result = await conn.execute(
        """
        UPDATE upload_job_items
        SET    status              = CASE WHEN $1::text IS NULL THEN 'done' ELSE 'failed' END,
               is_active           = $2,
               carrier_counts_json = $3,
               providers_json      = $4,
               error               = $1,
               processed_at        = EXTRACT(EPOCH FROM NOW()) * 1000
        WHERE  id = $5 AND status = 'processing'
        RETURNING id
        """,
        (
            error,
            1 if is_active else 0,
            json.dumps(carrier_counts) if carrier_counts else None,
            json.dumps(providers) if providers else None,
            item_id,
        ),
    )
    row = await result.fetchone()
    if not row:
        return False  # already processed (retry replay)

    active_inc = 1 if is_active else 0
    await conn.execute(
        """
        UPDATE upload_jobs
        SET    processed_rows = processed_rows + 1,
               active_rows    = active_rows + $1,
               updated_at     = EXTRACT(EPOCH FROM NOW()) * 1000
        WHERE  id = $2
        """,
        (active_inc, upload_job_id),
    )
    return True


async def try_complete_upload(conn: psycopg.AsyncConnection, upload_job_id: str) -> bool:
    """Mark upload completed if all items are done. Returns True if this call triggered it."""
    result = await conn.execute(
        """
        UPDATE upload_jobs
        SET    status       = 'completed',
               completed_at = EXTRACT(EPOCH FROM NOW()) * 1000,
               updated_at   = EXTRACT(EPOCH FROM NOW()) * 1000
        WHERE  id = $1
        AND    status = 'running'
        AND    processed_rows >= total_rows
        RETURNING id
        """,
        (upload_job_id,),
    )
    # fn_notify_upload_done trigger fires automatically on this UPDATE
    return (await result.fetchone()) is not None
