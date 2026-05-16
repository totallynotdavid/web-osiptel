import type { Kysely } from "kysely";

import { hashPassword } from "~/lib/auth/password";
import { env } from "~/lib/env";
import type { Database } from "../../../types";

export async function persistAdminUser(db: Kysely<Database>, nowMs: number): Promise<void> {
  const password = env.auth.seedPassword;
  const passwordHash = await hashPassword(password);

  await db
    .insertInto("users")
    .values({
      id: crypto.randomUUID(),
      email: "admin@example.test",
      password_hash: passwordHash,
      full_name: "Vulf Admin",
      role: "admin",
      is_active: 1,
      created_at: nowMs,
      updated_at: nowMs,
    })
    .onConflict((oc) => oc.column("email").doNothing())
    .execute();
}
