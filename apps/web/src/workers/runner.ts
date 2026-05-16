import { Worker } from "bullmq";

import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import { initChannels, notify } from "~/lib/notifications/service";
import { isErr } from "~/lib/result";
import {
  QUEUE_FILTER,
  QUEUE_NOTIFY,
  QUEUE_SCAN,
  type FilterJobData,
  type NotifyJobData,
  type ScanJobData,
} from "~/lib/queue/queues";
import { createWorkerConnection } from "~/lib/queue/connection";
import { processFilterBatch } from "~/server/pipeline/filter";
import { processScanBatch } from "~/server/pipeline/scan";

const WORKER_ID = `worker-${process.pid}`;
const logger = createLogger("bg-runner", { workerId: WORKER_ID });

logger.info("worker_starting");

await initChannels();

const filterWorker = new Worker<FilterJobData>(
  QUEUE_FILTER,
  async (job) => {
    const controller = new AbortController();
    try {
      const result = await processFilterBatch(job, db, controller.signal);
      if (isErr(result)) throw new Error(result.error);
    } catch (err) {
      controller.abort();
      throw err;
    }
  },
  {
    connection: createWorkerConnection(),
    concurrency: 6,
  },
);

const scanWorker = new Worker<ScanJobData>(
  QUEUE_SCAN,
  async (job) => {
    const controller = new AbortController();
    try {
      const result = await processScanBatch(job, db, controller.signal);
      if (isErr(result)) throw new Error(result.error);
    } catch (err) {
      controller.abort();
      throw err;
    }
  },
  {
    connection: createWorkerConnection(),
    concurrency: 4,
  },
);

const notifyWorker = new Worker<NotifyJobData>(
  QUEUE_NOTIFY,
  async (job) => {
    const { userId, uploadJobId, event, context } = job.data;
    await notify(db, userId, event, { ...context, uploadJobId });
  },
  {
    connection: createWorkerConnection(),
    concurrency: 5,
  },
);

for (const worker of [filterWorker, scanWorker, notifyWorker]) {
  worker.on("completed", (job) => {
    logger.info("job_completed", { queue: job.queueName, jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error("job_failed", {
      queue: job?.queueName,
      jobId: job?.id,
      error: String(err),
    });
  });

  worker.on("error", (err) => {
    logger.error("worker_error", { error: String(err) });
  });
}

logger.info("worker_ready", {
  queues: [QUEUE_FILTER, QUEUE_SCAN, QUEUE_NOTIFY],
});

async function shutdown() {
  logger.info("worker_shutting_down");
  await Promise.all([filterWorker.close(), scanWorker.close(), notifyWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
