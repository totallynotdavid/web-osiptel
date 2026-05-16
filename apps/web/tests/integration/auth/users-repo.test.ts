import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createUsersRepo } from "~/server/auth/users-repo";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../../support/runtime/db";

describe("users repo integration", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("users-repo");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("normalizes email and can query by normalized value", async () => {
    const users = createUsersRepo(ctx.db);
    const created = await users.create({
      email: " Admin@Example.test ",
      fullName: "Vulf Admin",
      passwordHash: "hash",
      role: "admin",
    });

    expect(created).toMatchObject({
      id: expect.any(String),
      email: "admin@example.test",
      full_name: "Vulf Admin",
      password_hash: "hash",
      role: "admin",
      is_active: 1,
    });

    const fetched = await users.findByEmail("ADMIN@EXAMPLE.TEST");
    expect(fetched).toEqual(created);
  });

  it("enforces unique user emails at persistence boundary", async () => {
    const users = createUsersRepo(ctx.db);
    await users.create({
      email: "admin@example.test",
      fullName: "First",
      passwordHash: "hash-1",
      role: "admin",
    });

    await expect(
      users.create({
        email: "ADMIN@EXAMPLE.TEST",
        fullName: "Second",
        passwordHash: "hash-2",
        role: "client",
      }),
    ).rejects.toThrow("UNIQUE constraint failed: users.email");

    const rows = await ctx.db
      .selectFrom("users")
      .select(["email", "full_name", "role"])
      .orderBy("created_at", "asc")
      .execute();
    expect(rows).toEqual([
      {
        email: "admin@example.test",
        full_name: "First",
        role: "admin",
      },
    ]);
  });
});
