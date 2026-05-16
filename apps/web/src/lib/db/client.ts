import { Pool, types } from "pg";
import { Kysely, PostgresDialect } from "kysely";

import { createLogger } from "~/lib/observability/logger";
import type { Database } from "./types";

const logger = createLogger("db-client");

// bigint (OID 20) arrives as string by default; parse to number since
// epoch-ms timestamps are well within JS safe integer range.
types.setTypeParser(20, Number);

export function createDb(connectionString: string): Kysely<Database> {
  logger.info("db_init", { connectionString });
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString }),
    }),
  });
}
