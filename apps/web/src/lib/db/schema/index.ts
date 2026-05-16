import type { Kysely } from "kysely";

import * as auth from "./modules/auth";
import * as identity from "./modules/identity";
import * as notifications from "./modules/notifications";
import * as pipeline from "./modules/pipeline";

export interface SchemaModule {
  createTables(db: Kysely<any>): Promise<void>;
}

export const SCHEMA_MODULES: readonly SchemaModule[] = [
  identity,
  auth,
  pipeline,
  notifications,
] as const;
