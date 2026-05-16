import { Worker } from "bullmq";

import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import { initChannels, notify } from "~/lib/notifications/service";
import { isErr } from "~/lib/result";
import {
  QUEUE_NOTIFY,
  QUEUE_PHASE1,
  QUEUE_PHASE2,
  type NotifyJobData,
  type Phase1JobData,
  type Phase2JobData,
} from "~/lib/queue/queues";
import { createWorkerConnection } from "~/lib/queue/connection";
import { processPhase1Batch } from "~/server/pipeline/phase1";
import { processPhase2Item } from "~/server/pipeline/phase2";

const WORKER_ID = `worker-${process.pid}`;
const logger = createLogger("bg-runner", { workerId: WORKER_ID });

logger.info("worker_starting");

await initChannels();

// Phase 1 worker - filter orgs via robot (batches of 30)
const phase1Worker = new Worker<Phase1JobData>(
  QUEUE_PHASE1,
  async (job, _token) => {
    const controller = new AbortController();
    try {
      const result = await processPhase1Batch(job, db, controller.signal);
      if (isErr(result)) throw new Error(result.error);
    } catch (err) {
      controller.abort();
      throw err;
    }
  },
  {
    connection: createWorkerConnection(),
    concurrency: 3,
  },
);

// Phase 2 worker - get provider details, parallelized per org
const phase2Worker = new Worker<Phase2JobData>(
  QUEUE_PHASE2,
  async (job) => {
    const controller = new AbortController();
    try {
      const result = await processPhase2Item(job, db, controller.signal);
      if (isErr(result)) throw new Error(result.error);
    } catch (err) {
      controller.abort();
      throw err;
    }
  },
  {
    connection: createWorkerConnection(),
    concurrency: 10,
  },
);

// Notification worker
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

for (const worker of [phase1Worker, phase2Worker, notifyWorker]) {
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
  queues: [QUEUE_PHASE1, QUEUE_PHASE2, QUEUE_NOTIFY],
});

async function shutdown() {
  logger.info("worker_shutting_down");
  await Promise.all([phase1Worker.close(), phase2Worker.close(), notifyWorker.close()]);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
