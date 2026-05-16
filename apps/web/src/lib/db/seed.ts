import type { Kysely } from "kysely";

import { createLogger } from "~/lib/observability/logger";
import { db as globalDb } from "./db";
import { runBootstrapSeed } from "./seeds/bootstrap";
import type { Database } from "./types";

const logger = createLogger("db-seed");

export async function seedIfEmpty(db: Kysely<Database>): Promise<void> {
  const userCount = await db
    .selectFrom("users")
    .select(db.fn.countAll().as("count"))
    .executeTakeFirst();

  if (userCount && Number(userCount.count) > 0) {
    logger.info("seed_skipped_already_initialized");
    return;
  }

  logger.info("seed_started");
  const nowMs = Date.now();

  await db.transaction().execute(async (trx) => {
    await runBootstrapSeed(trx, nowMs);
  });

  logger.info("seed_completed");
}

async function seed() {
  try {
    await seedIfEmpty(globalDb);
    process.exit(0);
  } catch (err) {
    logger.error("seed_failed", { error: String(err) });
    process.exit(1);
  }
}

if (import.meta.main) {
  void seed();
}
