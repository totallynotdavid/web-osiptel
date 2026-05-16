import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibSQLDialect } from "kysely-turso/libsql";

import { createLogger } from "~/lib/observability/logger";
import type { Database } from "./types";

const logger = createLogger("db-client");

function normalizeDbUrl(input: string): string {
  if (
    input === ":memory:" ||
    input.startsWith("http://") ||
    input.startsWith("https://") ||
    input.startsWith("libsql://") ||
    input.startsWith("file:")
  ) {
    return input;
  }
  return `file:${input}`;
}

export function createDb(dbUrl: string): Kysely<Database> {
  const url = normalizeDbUrl(dbUrl);
  logger.info("db_init", { url });

  const client = createClient({ url, intMode: "number" });
  return new Kysely<Database>({ dialect: new LibSQLDialect({ client }) });
}
