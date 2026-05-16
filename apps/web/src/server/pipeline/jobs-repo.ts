import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { UploadJobStatus } from "~/lib/db/schema/modules/pipeline.types";

export function createJobsRepo(db: Kysely<Database>) {
  return {
    async listForUser(userId: string) {
      return db
        .selectFrom("upload_jobs")
        .selectAll()
        .where("user_id", "=", userId)
        .orderBy("created_at", "desc")
        .limit(50)
        .execute();
    },

    async listAll() {
      return db
        .selectFrom("upload_jobs")
        .selectAll()
        .orderBy("created_at", "desc")
        .limit(100)
        .execute();
    },

    async findById(id: string) {
      return db.selectFrom("upload_jobs").selectAll().where("id", "=", id).executeTakeFirst();
    },

    async findByIdForUser(id: string, userId: string) {
      return db
        .selectFrom("upload_jobs")
        .selectAll()
        .where("id", "=", id)
        .where("user_id", "=", userId)
        .executeTakeFirst();
    },

    async create(data: { id: string; userId: string; filename: string; totalRows: number }) {
      const now = Date.now();
      await db
        .insertInto("upload_jobs")
        .values({
          id: data.id,
          user_id: data.userId,
          filename: data.filename,
          total_rows: data.totalRows,
          processed_rows: 0,
          active_rows: 0,
          status: "pending",
          error_message: null,
          created_at: now,
          updated_at: now,
          completed_at: null,
        })
        .execute();
    },

    async updateStatus(id: string, patch: { status?: UploadJobStatus; errorMessage?: string }) {
      await db
        .updateTable("upload_jobs")
        .set({
          ...(patch.status ? { status: patch.status } : {}),
          ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
          updated_at: Date.now(),
        })
        .where("id", "=", id)
        .execute();
    },

    async getItemsForJob(uploadJobId: string) {
      return db
        .selectFrom("upload_job_items")
        .selectAll()
        .where("upload_job_id", "=", uploadJobId)
        .orderBy("batch_index", "asc")
        .execute();
    },

    async createItemsBatch(
      items: Array<{ id: string; uploadJobId: string; ruc: string; batchIndex: number }>,
    ) {
      if (items.length === 0) return;
      await db
        .insertInto("upload_job_items")
        .values(
          items.map((i) => ({
            id: i.id,
            upload_job_id: i.uploadJobId,
            ruc: i.ruc,
            batch_index: i.batchIndex,
            status: "pending" as const,
            is_active: null,
            carrier_counts_json: null,
            providers_json: null,
            error: null,
            processed_at: null,
            claimed_at: null,
          })),
        )
        .execute();
    },
  };
}
