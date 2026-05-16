import type { Job } from "bullmq";
import type { Kysely } from "kysely";

import type { NotifyJobData, ScanJobData } from "~/lib/queue/queues";
import { getNotifyQueue } from "~/lib/queue/queues";
import type { Database } from "~/lib/db/types";
import { err, isErr, ok, type Result } from "~/lib/result";
import { robotLookup } from "~/server/robot/client";

const FETCH_TIMEOUT_MS = 90_000;

export async function processScanBatch(
  job: Job<ScanJobData>,
  db: Kysely<Database>,
  signal: AbortSignal,
): Promise<Result<void, string>> {
  const { uploadJobId, userId, itemIds, rucList, proxyUser, proxyPass } = job.data;

  const lookupResult = await robotLookup({
    rucList,
    proxyUser,
    proxyPass,
    signal,
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (isErr(lookupResult)) return err(lookupResult.error);

  const byRuc = new Map(lookupResult.value.map((r) => [r.ruc, r]));

  const now = Date.now();
  let activeCount = 0;

  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i];
    const ruc = rucList[i];
    const r = byRuc.get(ruc) ?? null;
    const carriers = r?.carriers ?? null;
    const providers = carriers ? Object.keys(carriers).toSorted() : null;
    if (r?.active) activeCount++;

    await db
      .updateTable("upload_job_items")
      .set({
        status: "done",
        is_active: r?.active ? 1 : 0,
        carrier_counts_json: carriers ? JSON.stringify(carriers) : null,
        providers_json: providers ? JSON.stringify(providers) : null,
        error: r?.error ?? null,
        processed_at: now,
      })
      .where("id", "=", itemId)
      .execute();
  }

  await db
    .updateTable("upload_jobs")
    .set((eb) => ({
      phase: "scanning" as const,
      processed_rows: eb("processed_rows", "+", itemIds.length),
      active_rows: eb("active_rows", "+", activeCount),
      updated_at: now,
    }))
    .where("id", "=", uploadJobId)
    .execute();

  // Atomically mark completed: only the batch that pushes processed_rows >= total_rows wins
  const completion = await db
    .updateTable("upload_jobs")
    .set({ phase: "completed", status: "completed", completed_at: now, updated_at: now })
    .where("id", "=", uploadJobId)
    .where("status", "=", "running")
    .whereRef("processed_rows", ">=", "total_rows")
    .executeTakeFirst();

  if (completion.numUpdatedRows > 0n) {
    await getNotifyQueue().add("upload_completed", {
      userId,
      uploadJobId,
      event: "upload_completed",
      context: {},
    } satisfies NotifyJobData);
  }

  return ok(undefined);
}
