import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { decrypt } from "~/lib/crypto/credentials";

export async function getProxyCredentials(
  db: Kysely<Database>,
  userId: string,
): Promise<{ username: string; password: string } | null> {
  const cred = await db
    .selectFrom("proxy_credentials")
    .select(["geonode_username", "geonode_password_enc"])
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!cred) return null;

  return {
    username: cred.geonode_username,
    password: decrypt(cred.geonode_password_enc),
  };
}
