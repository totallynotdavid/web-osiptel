import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createSessionRepo } from "~/server/auth/session-repo";
import { createUsersRepo } from "~/server/auth/users-repo";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../../support/runtime/db";

describe("session repo integration", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("session-repo");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("returns valid session and updates last_activity", async () => {
    const users = createUsersRepo(ctx.db);
    const user = await users.create({
      email: "user@example.test",
      fullName: "User",
      passwordHash: "hash",
      role: "sales_manager",
    });
    const sessions = createSessionRepo(ctx.db);
    const session = await sessions.create({
      userId: user.id,
      role: user.role,
      ipAddress: "127.0.0.1",
      userAgent: "vitest",
    });
    expect(session).toMatchObject({
      id: expect.any(String),
      userId: user.id,
      role: "sales_manager",
      expiresAt: expect.any(Number),
    });
    expect(session.expiresAt).toBeGreaterThan(Date.now());

    await ctx.db
      .updateTable("user_sessions")
      .set({ last_activity: 1 })
      .where("id", "=", session.id)
      .execute();

    const valid = await sessions.findValid(session.id);
    expect(valid).toEqual(session);

    const after = await ctx.db
      .selectFrom("user_sessions")
      .select("last_activity")
      .where("id", "=", session.id)
      .executeTakeFirstOrThrow();

    expect(after.last_activity).toBeGreaterThan(1);
  });

  it("rejects expired sessions and deleteExpired clears them", async () => {
    const users = createUsersRepo(ctx.db);
    const user = await users.create({
      email: "expired@example.test",
      fullName: "Expired",
      passwordHash: "hash",
      role: "client",
    });
    const sessions = createSessionRepo(ctx.db);
    const session = await sessions.create({
      userId: user.id,
      role: user.role,
      ipAddress: null,
      userAgent: null,
    });

    await ctx.db
      .updateTable("user_sessions")
      .set({ expires_at: Date.now() - 1 })
      .where("id", "=", session.id)
      .execute();

    await expect(sessions.findValid(session.id)).resolves.toBeNull();
    await sessions.deleteExpired();

    const row = await ctx.db
      .selectFrom("user_sessions")
      .select("id")
      .where("id", "=", session.id)
      .executeTakeFirst();
    expect(row).toBeUndefined();
  });
});
