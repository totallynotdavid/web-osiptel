import { createLogger } from "~/lib/observability/logger";
import { db } from "./db";
import { migrateToLatest } from "./migrate";

const logger = createLogger("migrate-cli");

async function run() {
  try {
    logger.info("migration_started");
    await migrateToLatest(db);
    logger.info("migration_completed");
    process.exit(0);
  } catch (err) {
    logger.error("migration_failed", { error: String(err) });
    process.exit(1);
  }
}

if (import.meta.main) {
  void run();
}
