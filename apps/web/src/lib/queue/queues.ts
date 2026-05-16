import { Queue } from "bullmq";

import { getQueueConnection } from "./connection";

export const QUEUE_PHASE1 = "vulf:phase1";
export const QUEUE_PHASE2 = "vulf:phase2";
export const QUEUE_NOTIFY = "vulf:notifications";

export type Phase1JobData = {
  uploadJobId: string;
  userId: string;
  itemIds: string[];
  rucList: string[];
};

export type Phase2JobData = {
  uploadJobId: string;
  userId: string;
  itemId: string;
  ruc: string;
};

export type NotifyJobData = {
  userId: string;
  uploadJobId: string;
  event: "upload_completed" | "upload_failed" | "phase1_complete" | "phone_verification";
  context: Record<string, unknown>;
};

let phase1Queue: Queue<Phase1JobData> | null = null;
let phase2Queue: Queue<Phase2JobData> | null = null;
let notifyQueue: Queue<NotifyJobData> | null = null;

export function getPhase1Queue(): Queue<Phase1JobData> {
  if (!phase1Queue) {
    phase1Queue = new Queue<Phase1JobData>(QUEUE_PHASE1, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return phase1Queue;
}

export function getPhase2Queue(): Queue<Phase2JobData> {
  if (!phase2Queue) {
    phase2Queue = new Queue<Phase2JobData>(QUEUE_PHASE2, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return phase2Queue;
}

export function getNotifyQueue(): Queue<NotifyJobData> {
  if (!notifyQueue) {
    notifyQueue = new Queue<NotifyJobData>(QUEUE_NOTIFY, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 200 },
        removeOnFail: { count: 100 },
      },
    });
  }
  return notifyQueue;
}
