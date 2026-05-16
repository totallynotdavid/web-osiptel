import type { Job } from "bullmq";
import type { Kysely } from "kysely";

import type { Phase1JobData } from "~/lib/queue/queues";
import { QUEUE_PHASE2, getPhase2Queue, type Phase2JobData } from "~/lib/queue/queues";
import { createLogger } from "~/lib/observability/logger";
import type { Database } from "~/lib/db/types";
import { err, isErr, ok, type Result } from "~/lib/result";
import { robotLookup } from "~/server/robot/client";
import { getProxyCredentials } from "./credentials-repo";

const logger = createLogger("pipeline:phase1");

export async function processPhase1Batch(
  job: Job<Phase1JobData>,
  db: Kysely<Database>,
  signal: AbortSignal,
): Promise<Result<void, string>> {
  const { uploadJobId, userId, itemIds, rucList } = job.data;

  logger.info("phase1_batch_start", { uploadJobId, count: rucList.length });

  const creds = await getProxyCredentials(db, userId);
  if (!creds) {
    return err("No proxy credentials configured for user");
  }

  await job.updateProgress(10);

  const lookupResult = await robotLookup({
    rucList,
    proxyUser: creds.username,
    proxyPass: creds.password,
    signal,
  });
  if (isErr(lookupResult)) return err(lookupResult.error);
  const results = lookupResult.value;

  await job.updateProgress(70);

  const now = Date.now();

  // Persist results for each item
  for (const result of results) {
    const itemId = itemIds[rucList.indexOf(result.ruc)];
    if (!itemId) continue;

    await db
      .updateTable("upload_job_items")
      .set({
        status: "done",
        is_active: result.active ? 1 : 0,
        carrier_counts_json: result.carriers ? JSON.stringify(result.carriers) : null,
        error: result.error ?? null,
        processed_at: now,
      })
      .where("id", "=", itemId)
      .execute();
  }

  // Update processed_rows counter on the parent job
  await db
    .updateTable("upload_jobs")
    .set((eb) => ({
      processed_rows: eb("processed_rows", "+", itemIds.length),
      updated_at: now,
    }))
    .where("id", "=", uploadJobId)
    .execute();

  await job.updateProgress(90);

  // Enqueue phase2 for active orgs in this batch
  const activeItems = results.filter((r) => r.active);
  if (activeItems.length > 0) {
    const phase2Jobs = activeItems.map((r) => {
      const itemId = itemIds[rucList.indexOf(r.ruc)];
      return {
        name: "phase2_item",
        data: {
          uploadJobId,
          userId,
          itemId: itemId!,
          ruc: r.ruc,
        } satisfies Phase2JobData,
        queueName: QUEUE_PHASE2,
      };
    });

    await getPhase2Queue().addBulk(phase2Jobs);
  }

  await job.updateProgress(100);
  logger.info("phase1_batch_done", {
    uploadJobId,
    processed: results.length,
    active: activeItems.length,
  });
  return ok(undefined);
}
