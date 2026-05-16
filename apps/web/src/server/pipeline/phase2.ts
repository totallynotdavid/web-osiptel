import type { Job } from "bullmq";
import type { Kysely } from "kysely";

import type { Phase2JobData } from "~/lib/queue/queues";
import { createLogger } from "~/lib/observability/logger";
import type { Database } from "~/lib/db/types";
import { err, isErr, ok, type Result } from "~/lib/result";
import { robotLookup } from "~/server/robot/client";
import { getProxyCredentials } from "./credentials-repo";

const logger = createLogger("pipeline:phase2");

export async function processPhase2Item(
  job: Job<Phase2JobData>,
  db: Kysely<Database>,
  signal: AbortSignal,
): Promise<Result<void, string>> {
  const { uploadJobId, userId, itemId, ruc } = job.data;

  logger.info("phase2_item_start", { uploadJobId, ruc });

  const creds = await getProxyCredentials(db, userId);
  if (!creds) {
    return err("No proxy credentials configured for user");
  }

  const lookupResult = await robotLookup({
    rucList: [ruc],
    proxyUser: creds.username,
    proxyPass: creds.password,
    signal,
  });
  if (isErr(lookupResult)) return err(lookupResult.error);
  const [result] = lookupResult.value;

  if (!result) return err("No result from robot for RUC: " + ruc);

  const now = Date.now();

  await db
    .updateTable("upload_job_items")
    .set({
      providers_json: result.providers ? JSON.stringify(result.providers) : null,
      error: result.error ?? null,
      processed_at: now,
    })
    .where("id", "=", itemId)
    .execute();

  // Increment active_rows on the upload job
  await db
    .updateTable("upload_jobs")
    .set((eb) => ({
      active_rows: eb("active_rows", "+", 1),
      updated_at: now,
    }))
    .where("id", "=", uploadJobId)
    .execute();

  logger.info("phase2_item_done", { uploadJobId, ruc });
  return ok(undefined);
}
