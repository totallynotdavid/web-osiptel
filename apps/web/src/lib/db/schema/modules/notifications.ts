import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("notification_prefs")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade").unique(),
    )
    .addColumn("email", "varchar(255)")
    .addColumn("phone", "varchar(9)")
    .addColumn("phone_verified", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("phone_verification_code", "text")
    .addColumn("phone_verification_expires_at", "bigint")
    .addColumn("notify_on_completion", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("notify_on_failure", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "bigint", (col) => col.notNull())
    .addColumn("updated_at", "bigint", (col) => col.notNull())
    .execute();
}
