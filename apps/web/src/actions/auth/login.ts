"use server";

import { redirect } from "@solidjs/router";
import { setCookie } from "@solidjs/start/http";
import { getRequestEvent } from "solid-js/web";

import { verifyPassword } from "~/lib/auth/password";
import { SESSION_COOKIE, SESSION_TTL_MS } from "~/lib/auth/session";
import { db } from "~/lib/db/db";
import { createSessionRepo } from "~/server/auth/session-repo";
import { createUsersRepo } from "~/server/auth/users-repo";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalid_credentials" | "account_disabled" };

export async function loginAction(formData: FormData): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "invalid_credentials" };
  }

  const users = createUsersRepo(db);
  const sessions = createSessionRepo(db);

  const user = await users.findByEmail(email);
  if (!user) {
    // Constant-time-ish: always hash even if not found
    await verifyPassword("$argon2id$v=19$m=19456,t=2,p=1$placeholder", password).catch(() => false);
    return { ok: false, error: "invalid_credentials" };
  }

  if (!user.is_active) {
    return { ok: false, error: "account_disabled" };
  }

  const valid = await verifyPassword(user.password_hash, password);
  if (!valid) {
    return { ok: false, error: "invalid_credentials" };
  }

  const event = getRequestEvent();
  const req = event?.request;

  const session = await sessions.create({
    userId: user.id,
    role: user.role,
    ipAddress: req?.headers.get("x-forwarded-for") ?? null,
    userAgent: req?.headers.get("user-agent") ?? null,
  });

  setCookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });

  throw redirect("/dashboard");
}
