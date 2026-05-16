import type { Kysely } from "kysely";

import { SCHEMA_MODULES } from "./schema";
import { computeHash, readStoredHash, writeStoredHash } from "./migration-hash";

export async function migrateToLatest(db: Kysely<any>): Promise<void> {
  const hash = await computeHash(SCHEMA_MODULES);
  const stored = await readStoredHash(db);

  if (stored === hash) return;
  if (stored !== null) {
    throw new Error(
      "Schema changed since DB was built.\n  ⇢ Drop and recreate the database, then re-run migrate",
    );
  }

  await db.transaction().execute(async (trx) => {
    for (const module of SCHEMA_MODULES) {
      // eslint-disable-next-line no-await-in-loop
      await module.createTables(trx);
    }
    await writeStoredHash(trx, hash);
  });
}
