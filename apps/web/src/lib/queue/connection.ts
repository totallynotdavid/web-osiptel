import IORedis from "ioredis";

import { env } from "~/lib/env";

let sharedConn: IORedis | null = null;

export function getQueueConnection(): IORedis {
  if (!sharedConn) {
    sharedConn = new IORedis(env.redis.url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return sharedConn;
}

export function createWorkerConnection(): IORedis {
  return new IORedis(env.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
