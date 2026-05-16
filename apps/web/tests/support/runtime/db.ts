import { Pool } from "pg";
import { Kysely, PostgresDialect } from "kysely";

import { migrateToLatest } from "~/lib/db/migrate";
import type { Database } from "~/lib/db/types";

export interface TestDbContext {
  db: Kysely<Database>;
  schema: string;
}

export async function createIsolatedTestDb(name: string): Promise<TestDbContext> {
  const url = process.env.DATABASE_URL!;
  const safeName = name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const schema = `t_${safeName}_${crypto.randomUUID().replace(/-/g, "")}`;

  const adminPool = new Pool({ connectionString: url });
  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  await adminPool.end();

  const pool = new Pool({ connectionString: url, options: `-c search_path=${schema}` });
  const db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });

  await migrateToLatest(db);
  return { db, schema };
}

export async function cleanupTestDb(ctx: TestDbContext): Promise<void> {
  await ctx.db.destroy();
  const adminPool = new Pool({ connectionString: process.env.DATABASE_URL! });
  await adminPool.query(`DROP SCHEMA IF EXISTS "${ctx.schema}" CASCADE`);
  await adminPool.end();
}
