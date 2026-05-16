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
const MAX_PHASE2_ITEMS_IN_FLIGHT_PER_UPLOAD = 30;
const PHASE2_WAVE_DELAY_MS = 5_000;

function buildItemIdBuckets(itemIds: string[], rucList: string[]): Map<string, string[]> {
  const buckets = new Map<string, string[]>();
  for (let i = 0; i < rucList.length; i += 1) {
    const ruc = rucList[i];
    const itemId = itemIds[i];
    if (!ruc || !itemId) continue;
    const queue = buckets.get(ruc);
    if (queue) {
      queue.push(itemId);
      continue;
    }
    buckets.set(ruc, [itemId]);
  }
  return buckets;
}

function popItemId(buckets: Map<string, string[]>, ruc: string): string | null {
  const queue = buckets.get(ruc);
  if (!queue || queue.length === 0) return null;
  const itemId = queue.shift() ?? null;
  if (queue.length === 0) buckets.delete(ruc);
  return itemId;
}

export async function processPhase1Batch(
  job: Job<Phase1JobData>,
  db: Kysely<Database>,
  signal: AbortSignal,
): Promise<Result<void, string>> {
  const { uploadJobId, userId, itemIds, rucList } = job.data;
  const itemIdBuckets = buildItemIdBuckets(itemIds, rucList);

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
  const activeWithItemIds: Array<{ itemId: string; ruc: string }> = [];

  // Persist results for each item
  for (const result of results) {
    const itemId = popItemId(itemIdBuckets, result.ruc);
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

    if (result.active) {
      activeWithItemIds.push({ itemId, ruc: result.ruc });
    }
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
  if (activeWithItemIds.length > 0) {
    const phase2Jobs = activeWithItemIds.map((entry, index) => {
      const wave = Math.floor(index / MAX_PHASE2_ITEMS_IN_FLIGHT_PER_UPLOAD);
      return {
        name: "phase2_item",
        data: {
          uploadJobId,
          userId,
          itemId: entry.itemId,
          ruc: entry.ruc,
        } satisfies Phase2JobData,
        queueName: QUEUE_PHASE2,
        opts: {
          delay: wave * PHASE2_WAVE_DELAY_MS,
          jobId: `${uploadJobId}:phase2:${entry.itemId}:${index}`,
        },
      };
    });

    await getPhase2Queue().addBulk(phase2Jobs);
  }

  await job.updateProgress(100);
  logger.info("phase1_batch_done", {
    uploadJobId,
    processed: results.length,
    active: activeWithItemIds.length,
  });
  return ok(undefined);
}
