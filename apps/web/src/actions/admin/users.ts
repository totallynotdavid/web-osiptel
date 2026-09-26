"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { hashPassword } from "~/lib/auth/password";
import { CreateUserSchema, ToggleUserSchema, firstIssue } from "~/lib/validation/forms";
import { createUsersRepo } from "~/server/auth/users-repo";

export type AdminUserResult = { ok: true } | { ok: false; error: string };

export async function createUserAction(formData: FormData): Promise<AdminUserResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return { ok: false, error: "unauthorized" };

  const parsed = CreateUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { email, full_name: fullName, password, role } = parsed.data;

  const users = createUsersRepo(db);
  const existing = await users.findByEmail(email);
  if (existing) return { ok: false, error: "Email already in use" };

  const passwordHash = await hashPassword(password);
  await users.create({ email, fullName, passwordHash, role });

  return { ok: true };
}

export async function toggleUserActiveAction(formData: FormData): Promise<AdminUserResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return { ok: false, error: "unauthorized" };

  const parsed = ToggleUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { user_id: userId, is_active } = parsed.data;
  const isActive = is_active === "1" ? 0 : 1;

  await db
    .updateTable("users")
    .set({ is_active: isActive, updated_at: Date.now() })
    .where("id", "=", userId)
    .execute();

  return { ok: true };
}
