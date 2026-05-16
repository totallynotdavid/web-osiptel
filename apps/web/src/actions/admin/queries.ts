"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { createUsersRepo } from "~/server/auth/users-repo";

export async function getAdminStats() {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return null;

  const [userCount, jobCount] = await Promise.all([
    db
      .selectFrom("users")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
    db
      .selectFrom("upload_jobs")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .executeTakeFirst(),
  ]);

  return {
    totalUsers: Number(userCount?.count ?? 0),
    totalJobs: Number(jobCount?.count ?? 0),
  };
}

export async function getAdminUsers() {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return [];

  const users = createUsersRepo(db);
  return users.list();
}
