"use server";

import { redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { createJobsRepo } from "~/server/pipeline/jobs-repo";

const RUC_RE = /^\d{11}$/;
const DB_CHUNK = 500;

function parseRucs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => RUC_RE.test(l));
}

export type UploadResult =
  | { ok: true; jobId: string }
  | { ok: false; error: "no_file" | "invalid_csv" | "empty" | "unauthorized" | "no_credentials" };

export async function uploadCsvAction(formData: FormData): Promise<UploadResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return { ok: false, error: "unauthorized" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "no_file" };
  }

  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, error: "invalid_csv" };
  }

  const text = await file.text();
  const rucs = parseRucs(text);

  if (rucs.length === 0) {
    return { ok: false, error: "empty" };
  }

  const jobId = crypto.randomUUID();
  const jobs = createJobsRepo(db);

  const items = rucs.map((ruc, i) => ({
    id: crypto.randomUUID(),
    uploadJobId: jobId,
    ruc,
    batchIndex: i,
  }));

  await jobs.create({
    id: jobId,
    userId: session.userId,
    filename: file.name,
    totalRows: rucs.length,
  });

  // Insert in chunks of 500
  // TODO: Investigate the limits of PostgreSQL's parameter limit
  for (let i = 0; i < items.length; i += DB_CHUNK) {
    await jobs.createItemsBatch(items.slice(i, i + DB_CHUNK));
  }
  // trg_notify_new_work fires on each INSERT, waking robot workers automatically

  await jobs.updateStatus(jobId, { status: "running" });
  throw redirect(`/jobs/${jobId}`);
}
