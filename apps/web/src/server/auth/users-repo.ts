import type { Kysely } from "kysely";

import type { Database, Role } from "~/lib/db/types";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  is_active: number;
}

export function createUsersRepo(db: Kysely<Database>) {
  return {
    async findByEmail(email: string): Promise<UserRecord | null> {
      const row = await db
        .selectFrom("users")
        .select(["id", "email", "password_hash", "full_name", "role", "is_active"])
        .where("email", "=", email.toLowerCase().trim())
        .executeTakeFirst();

      return (row as UserRecord | undefined) ?? null;
    },

    async findById(id: string): Promise<UserRecord | null> {
      const row = await db
        .selectFrom("users")
        .select(["id", "email", "password_hash", "full_name", "role", "is_active"])
        .where("id", "=", id)
        .executeTakeFirst();

      return (row as UserRecord | undefined) ?? null;
    },

    async create(input: {
      email: string;
      passwordHash: string;
      fullName: string;
      role: Role;
    }): Promise<UserRecord> {
      const id = crypto.randomUUID();
      const now = Date.now();

      await db
        .insertInto("users")
        .values({
          id,
          email: input.email.toLowerCase().trim(),
          password_hash: input.passwordHash,
          full_name: input.fullName,
          role: input.role,
          is_active: 1,
          created_at: now,
          updated_at: now,
        })
        .execute();

      return {
        id,
        email: input.email.toLowerCase().trim(),
        password_hash: input.passwordHash,
        full_name: input.fullName,
        role: input.role,
        is_active: 1,
      };
    },

    async list(): Promise<UserRecord[]> {
      return db
        .selectFrom("users")
        .select(["id", "email", "password_hash", "full_name", "role", "is_active"])
        .orderBy("created_at", "desc")
        .execute() as Promise<UserRecord[]>;
    },
  };
}
