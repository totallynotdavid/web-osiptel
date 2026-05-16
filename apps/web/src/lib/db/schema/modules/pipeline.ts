import type { Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("upload_jobs")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("filename", "varchar(255)", (col) => col.notNull())
    .addColumn("total_rows", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("processed_rows", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("active_rows", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("phase", "varchar(20)", (col) => col.notNull().defaultTo("queued"))
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("bullmq_job_id", "text")
    .addColumn("error_message", "text")
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .addColumn("completed_at", "integer")
    .execute();

  await db.schema.createIndex("idx_upload_jobs_user").on("upload_jobs").column("user_id").execute();

  await db.schema
    .createIndex("idx_upload_jobs_status")
    .on("upload_jobs")
    .column("status")
    .execute();

  await db.schema
    .createTable("upload_job_items")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("upload_job_id", "text", (col) =>
      col.notNull().references("upload_jobs.id").onDelete("cascade"),
    )
    .addColumn("ruc", "varchar(11)", (col) => col.notNull())
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("is_active", "integer")
    .addColumn("carrier_counts_json", "text")
    .addColumn("providers_json", "text")
    .addColumn("error", "text")
    .addColumn("processed_at", "integer")
    .execute();

  await db.schema
    .createIndex("idx_items_job_status")
    .on("upload_job_items")
    .columns(["upload_job_id", "status"])
    .execute();

  await db.schema
    .createIndex("idx_items_job_active")
    .on("upload_job_items")
    .columns(["upload_job_id", "is_active"])
    .execute();

  await db.schema
    .createTable("proxy_credentials")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade").unique(),
    )
    .addColumn("geonode_username", "varchar(255)", (col) => col.notNull())
    .addColumn("geonode_password_enc", "text", (col) => col.notNull())
    .addColumn("created_at", "integer", (col) => col.notNull())
    .addColumn("updated_at", "integer", (col) => col.notNull())
    .execute();
}
