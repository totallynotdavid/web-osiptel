import type { Job } from "bullmq";
import type { Kysely } from "kysely";

import type { FilterJobData, ScanJobData } from "~/lib/queue/queues";
import { getScanQueue } from "~/lib/queue/queues";
import type { Database } from "~/lib/db/types";
import { ok, type Result } from "~/lib/result";

export async function processFilterBatch(
  job: Job<FilterJobData>,
  _db: Kysely<Database>,
  _signal: AbortSignal,
): Promise<Result<void, string>> {
  const { uploadJobId, userId, batchIndex, totalBatches, itemIds, rucList, proxyUser, proxyPass } =
    job.data;

  // TODO: when filter logic lands, check which RUCs are stale or unknown and
  // pass only those forward. Update itemIds/rucList to the filtered subset.
  await getScanQueue().add(
    "scan_batch",
    {
      uploadJobId,
      userId,
      batchIndex,
      totalBatches,
      itemIds,
      rucList,
      proxyUser,
      proxyPass,
    } satisfies ScanJobData,
    { jobId: `${uploadJobId}:scan:${batchIndex}` },
  );

  return ok(undefined);
}
