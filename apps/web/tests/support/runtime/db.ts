import path from "node:path";
import { mkdir, rm } from "node:fs/promises";

import type { Kysely } from "kysely";

import { createDb } from "~/lib/db/client";
import { migrateToLatest } from "~/lib/db/migrate";
import type { Database } from "~/lib/db/types";

const DB_DIR = path.resolve(process.cwd(), ".vitest-db");

export interface TestDbContext {
  db: Kysely<Database>;
  filePath: string;
}

export async function createIsolatedTestDb(name: string): Promise<TestDbContext> {
  await mkdir(DB_DIR, { recursive: true });
  const filePath = path.join(DB_DIR, `${name}-${crypto.randomUUID()}.db`);
  const db = createDb(`file:${filePath}`);
  await migrateToLatest(db);
  return { db, filePath };
}

export async function cleanupTestDb(ctx: TestDbContext): Promise<void> {
  await ctx.db.destroy();
  await rm(ctx.filePath, { force: true });
}
