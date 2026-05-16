import type { Kysely } from "kysely";

import type { Database } from "../../types";
import { buildBootstrapScenario } from "./scenario";
import { persistAdminUser } from "./persist/admin-user";

export async function runBootstrapSeed(db: Kysely<Database>, nowMs: number): Promise<void> {
  buildBootstrapScenario(nowMs);
  await persistAdminUser(db, nowMs);
}
