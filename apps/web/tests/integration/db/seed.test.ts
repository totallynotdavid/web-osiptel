import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { verifyPassword } from "~/lib/auth/password";
import { seedIfEmpty } from "~/lib/db/seed";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../../support/runtime/db";

describe("seed integration", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("seed");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("is idempotent and seeds only once", async () => {
    await seedIfEmpty(ctx.db);
    await seedIfEmpty(ctx.db);

    const users = await ctx.db
      .selectFrom("users")
      .select(["email", "full_name", "role", "is_active"])
      .execute();
    expect(users).toHaveLength(1);
    expect(users[0]).toEqual({
      email: "admin@example.test",
      full_name: "Vulf Admin",
      role: "admin",
      is_active: 1,
    });
  });

  it("seeds admin credentials that verify with configured seed password", async () => {
    await seedIfEmpty(ctx.db);

    const user = await ctx.db
      .selectFrom("users")
      .select(["email", "password_hash", "role"])
      .where("email", "=", "admin@example.test")
      .executeTakeFirstOrThrow();

    expect(user).toMatchObject({
      email: "admin@example.test",
      role: "admin",
      password_hash: expect.any(String),
    });
    await expect(
      verifyPassword(user.password_hash, process.env.SEED_PASSWORD ?? "missing-seed-password"),
    ).resolves.toBe(true);
    await expect(verifyPassword(user.password_hash, "wrong-password")).resolves.toBe(false);
  });
});
