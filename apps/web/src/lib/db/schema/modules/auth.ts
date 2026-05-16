import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("user_sessions")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("role", "varchar(20)", (col) => col.notNull())
    .addColumn("ip_address", "text")
    .addColumn("user_agent", "text")
    .addColumn("created_at", "bigint", (col) => col.notNull())
    .addColumn("last_activity", "bigint", (col) => col.notNull())
    .addColumn("expires_at", "bigint", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_user_sessions_user")
    .on("user_sessions")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_user_sessions_expires")
    .on("user_sessions")
    .column("expires_at")
    .execute();

  await db.schema
    .createTable("auth_throttle_counters")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("scope", "varchar(20)", (col) => col.notNull())
    .addColumn("key_hash", "varchar(64)", (col) => col.notNull())
    .addColumn("window_started_at", "bigint", (col) => col.notNull())
    .addColumn("failure_count", "integer", (col) => col.notNull())
    .addColumn("blocked_until", "bigint")
    .addColumn("updated_at", "bigint", (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex("idx_auth_throttle_scope_key")
    .on("auth_throttle_counters")
    .columns(["scope", "key_hash"])
    .unique()
    .execute();
}
