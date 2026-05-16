import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("users")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("email", "varchar(255)", (col) => col.notNull().unique())
    .addColumn("password_hash", "varchar(255)", (col) => col.notNull())
    .addColumn("full_name", "varchar(255)", (col) => col.notNull())
    .addColumn("role", "varchar(20)", (col) => col.notNull())
    .addColumn("is_active", "integer", (col) => col.notNull().defaultTo(1))
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();

  await db.schema.createIndex("idx_users_email").on("users").column("email").execute();
}
