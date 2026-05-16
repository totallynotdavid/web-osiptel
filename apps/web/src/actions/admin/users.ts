"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import type { Role } from "~/lib/db/schema/modules/identity.types";
import { hashPassword } from "~/lib/auth/password";
import { createUsersRepo } from "~/server/auth/users-repo";

export type AdminUserResult = { ok: true } | { ok: false; error: string };

export async function createUserAction(formData: FormData): Promise<AdminUserResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return { ok: false, error: "unauthorized" };

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!email || !fullName || !password) {
    return { ok: false, error: "All fields are required" };
  }

  if (!["client", "sales_manager", "admin"].includes(role)) {
    return { ok: false, error: "Invalid role" };
  }

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }

  const users = createUsersRepo(db);
  const existing = await users.findByEmail(email);
  if (existing) {
    return { ok: false, error: "Email already in use" };
  }

  const passwordHash = await hashPassword(password);
  await users.create({ email, fullName, passwordHash, role });

  return { ok: true };
}

export async function toggleUserActiveAction(formData: FormData): Promise<AdminUserResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return { ok: false, error: "unauthorized" };

  const userId = String(formData.get("user_id") ?? "");
  const isActive = formData.get("is_active") === "1" ? 0 : 1; // toggle

  await db
    .updateTable("users")
    .set({ is_active: isActive, updated_at: Date.now() })
    .where("id", "=", userId)
    .execute();

  return { ok: true };
}
