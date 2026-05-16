"use server";

import { redirect } from "@solidjs/router";
import { deleteCookie, getCookie } from "@solidjs/start/http";

import { SESSION_COOKIE } from "~/lib/auth/session";
import { db } from "~/lib/db/db";
import { createSessionRepo } from "~/server/auth/session-repo";

export async function logoutAction(): Promise<void> {
  const sessionId = getCookie(SESSION_COOKIE);

  if (sessionId) {
    const sessions = createSessionRepo(db);
    await sessions.delete(sessionId);
  }

  deleteCookie(SESSION_COOKIE, { path: "/" });
  throw redirect("/login");
}
