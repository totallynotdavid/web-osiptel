import type { Kysely } from "kysely";

import type { Session } from "~/lib/auth/session";
import { generateSessionId, SESSION_TTL_MS } from "~/lib/auth/session";
import type { Database, Role } from "~/lib/db/types";

export function createSessionRepo(db: Kysely<Database>) {
  return {
    async findValid(sessionId: string): Promise<Session | null> {
      const now = Date.now();
      const row = await db
        .selectFrom("user_sessions")
        .selectAll()
        .where("id", "=", sessionId)
        .where("expires_at", ">", now)
        .executeTakeFirst();

      if (!row) return null;

      await db
        .updateTable("user_sessions")
        .set({ last_activity: now })
        .where("id", "=", sessionId)
        .execute();

      return {
        id: row.id,
        userId: row.user_id,
        role: row.role as Role,
        expiresAt: row.expires_at,
      };
    },

    async create(input: {
      userId: string;
      role: Role;
      ipAddress: string | null;
      userAgent: string | null;
    }): Promise<Session> {
      const id = generateSessionId();
      const now = Date.now();
      const expiresAt = now + SESSION_TTL_MS;

      await db
        .insertInto("user_sessions")
        .values({
          id,
          user_id: input.userId,
          role: input.role,
          ip_address: input.ipAddress,
          user_agent: input.userAgent,
          created_at: now,
          last_activity: now,
          expires_at: expiresAt,
        })
        .execute();

      return { id, userId: input.userId, role: input.role, expiresAt };
    },

    async delete(sessionId: string): Promise<void> {
      await db.deleteFrom("user_sessions").where("id", "=", sessionId).execute();
    },

    async deleteExpired(): Promise<void> {
      await db.deleteFrom("user_sessions").where("expires_at", "<=", Date.now()).execute();
    },
  };
}
