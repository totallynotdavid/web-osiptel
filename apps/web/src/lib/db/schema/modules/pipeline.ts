import { sql, type Kysely } from "kysely";

export async function createTables<T>(db: Kysely<T>): Promise<void> {
  await db.schema
    .createTable("upload_jobs")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) => col.notNull().references("users.id").onDelete("cascade"))
    .addColumn("filename", "varchar(255)", (col) => col.notNull())
    .addColumn("total_rows", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("processed_rows", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("active_rows", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("error_message", "text")
    .addColumn("created_at", "bigint", (col) => col.notNull())
    .addColumn("updated_at", "bigint", (col) => col.notNull())
    .addColumn("completed_at", "bigint")
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
    .addColumn("batch_index", "integer", (col) => col.notNull().defaultTo(0))
    .addColumn("status", "varchar(20)", (col) => col.notNull().defaultTo("pending"))
    .addColumn("is_active", "integer")
    .addColumn("carrier_counts_json", "text")
    .addColumn("providers_json", "text")
    .addColumn("error", "text")
    .addColumn("processed_at", "bigint")
    .addColumn("claimed_at", "bigint")
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

  // Index for the robot's claim query: WHERE status='pending' ORDER BY batch_index, upload_job_id
  await db.schema
    .createIndex("idx_items_claim")
    .on("upload_job_items")
    .columns(["status", "batch_index", "upload_job_id"])
    .execute();

  await db.schema
    .createTable("proxy_credentials")
    .addColumn("id", "text", (col) => col.primaryKey())
    .addColumn("user_id", "text", (col) =>
      col.notNull().references("users.id").onDelete("cascade").unique(),
    )
    .addColumn("geonode_username", "varchar(255)", (col) => col.notNull())
    .addColumn("geonode_password_enc", "text", (col) => col.notNull())
    .addColumn("created_at", "bigint", (col) => col.notNull())
    .addColumn("updated_at", "bigint", (col) => col.notNull())
    .execute();

  // Wake robot workers when new items arrive
  await sql`
    CREATE OR REPLACE FUNCTION fn_notify_new_work()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      PERFORM pg_notify('new_work', NEW.upload_job_id);
      RETURN NEW;
    END;
    $$
  `.execute(db);

  await sql`
    CREATE TRIGGER trg_notify_new_work
      AFTER INSERT ON upload_job_items
      FOR EACH ROW EXECUTE FUNCTION fn_notify_new_work()
  `.execute(db);

  // Push per-item progress to SSE clients
  await sql`
    CREATE OR REPLACE FUNCTION fn_notify_item_done()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status IN ('done', 'failed') THEN
        PERFORM pg_notify('progress', json_build_object(
          'uploadJobId', NEW.upload_job_id,
          'status',      NEW.status,
          'isActive',    NEW.is_active
        )::text);
      END IF;
      RETURN NEW;
    END;
    $$
  `.execute(db);

  await sql`
    CREATE TRIGGER trg_notify_item_done
      AFTER UPDATE OF status ON upload_job_items
      FOR EACH ROW EXECUTE FUNCTION fn_notify_item_done()
  `.execute(db);

  // Signal upload completion or failure to the web notify runner
  await sql`
    CREATE OR REPLACE FUNCTION fn_notify_upload_done()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status IN ('completed', 'failed') THEN
        PERFORM pg_notify('upload_done', json_build_object(
          'uploadJobId', NEW.id,
          'userId',      NEW.user_id,
          'status',      NEW.status
        )::text);
      END IF;
      RETURN NEW;
    END;
    $$
  `.execute(db);

  await sql`
    CREATE TRIGGER trg_notify_upload_done
      AFTER UPDATE OF status ON upload_jobs
      FOR EACH ROW EXECUTE FUNCTION fn_notify_upload_done()
  `.execute(db);
}
