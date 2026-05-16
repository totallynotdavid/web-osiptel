"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { createJobsRepo } from "~/server/pipeline/jobs-repo";

export async function getMyJobs() {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return [];

  const jobs = createJobsRepo(db);
  return jobs.listForUser(session.userId);
}

export async function getJobDetail(id: string) {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return null;

  const jobs = createJobsRepo(db);

  const isAdmin = session.role === "admin";
  const job = isAdmin ? await jobs.findById(id) : await jobs.findByIdForUser(id, session.userId);

  if (!job) return null;

  const items = await jobs.getItemsForJob(id);
  return { job, items };
}

export async function getAllJobs() {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (session?.role !== "admin") return [];

  const jobs = createJobsRepo(db);
  return jobs.listAll();
}
