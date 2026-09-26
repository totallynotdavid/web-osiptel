import { Client } from "pg";
import { z } from "zod";

import { db } from "~/lib/db/db";
import { env } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import { initChannels, notify } from "~/lib/notifications/service";

const logger = createLogger("notify-runner");

const UploadDonePayload = z.object({
  uploadJobId: z.string(),
  userId: z.string(),
  status: z.string(),
});

await initChannels();

const client = new Client({ connectionString: env.database.url });
await client.connect();
await client.query("LISTEN upload_done");

logger.info("notify_runner_ready");

client.on("notification", async (msg) => {
  try {
    const r = UploadDonePayload.safeParse(JSON.parse(msg.payload ?? "{}"));
    if (!r.success) return;
    const { uploadJobId, userId, status } = r.data;
    const event = status === "completed" ? "upload_completed" : "upload_failed";
    await notify(db, userId, event, { uploadJobId });
  } catch (err: unknown) {
    logger.error("notify_failed", { error: String(err) });
  }
});

client.on("error", (err) => {
  logger.error("pg_client_error", { error: String(err) });
});

async function shutdown() {
  logger.info("notify_runner_shutting_down");
  await client.end().catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
