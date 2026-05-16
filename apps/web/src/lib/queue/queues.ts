import { Queue } from "bullmq";

import { getQueueConnection } from "./connection";

export const QUEUE_FILTER = "vulf:filter";
export const QUEUE_SCAN = "vulf:scan";
export const QUEUE_NOTIFY = "vulf:notifications";

export type FilterJobData = {
  uploadJobId: string;
  userId: string;
  batchIndex: number;
  totalBatches: number;
  itemIds: string[];
  rucList: string[];
  proxyUser: string;
  proxyPass: string;
};

export type ScanJobData = {
  uploadJobId: string;
  userId: string;
  batchIndex: number;
  totalBatches: number;
  itemIds: string[];
  rucList: string[];
  proxyUser: string;
  proxyPass: string;
};

export type NotifyJobData = {
  userId: string;
  uploadJobId: string;
  event: "upload_completed" | "upload_failed" | "phone_verification";
  context: Record<string, unknown>;
};

let filterQueue: Queue<FilterJobData> | null = null;
let scanQueue: Queue<ScanJobData> | null = null;
let notifyQueue: Queue<NotifyJobData> | null = null;

export function getFilterQueue(): Queue<FilterJobData> {
  if (!filterQueue) {
    filterQueue = new Queue<FilterJobData>(QUEUE_FILTER, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return filterQueue;
}

export function getScanQueue(): Queue<ScanJobData> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobData>(QUEUE_SCAN, {
      connection: getQueueConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "fixed", delay: 30_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
  }
  return scanQueue;
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
