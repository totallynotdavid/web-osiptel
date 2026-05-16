"use server";

import { redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { getFilterQueue, type FilterJobData } from "~/lib/queue/queues";
import { createJobsRepo } from "~/server/pipeline/jobs-repo";
import { getProxyCredentials } from "~/server/pipeline/credentials-repo";

const RUC_RE = /^\d{11}$/;
const BATCH_SIZE = 30;

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

  const creds = await getProxyCredentials(db, session.userId);
  if (!creds) return { ok: false, error: "no_credentials" };

  const jobId = crypto.randomUUID();
  const jobs = createJobsRepo(db);

  const items: Array<{ id: string; uploadJobId: string; ruc: string }> = rucs.map((ruc) => ({
    id: crypto.randomUUID(),
    uploadJobId: jobId,
    ruc,
  }));

  await jobs.create({
    id: jobId,
    userId: session.userId,
    filename: file.name,
    totalRows: rucs.length,
  });

  // Insert items in chunks to avoid SQLite parameter limits
  const DB_CHUNK = 500;
  for (let i = 0; i < items.length; i += DB_CHUNK) {
    await jobs.createItemsBatch(items.slice(i, i + DB_CHUNK));
  }

  const totalBatches = Math.ceil(items.length / BATCH_SIZE);
  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);
    batches.push({
      name: "filter_batch",
      data: {
        uploadJobId: jobId,
        userId: session.userId,
        batchIndex,
        totalBatches,
        itemIds: slice.map((x) => x.id),
        rucList: slice.map((x) => x.ruc),
        proxyUser: creds.username,
        proxyPass: creds.password,
      } satisfies FilterJobData,
      opts: {
        jobId: `${jobId}:filter:${batchIndex}`,
      },
    });
  }

  await getFilterQueue().addBulk(batches);
  await jobs.updateStatus(jobId, { phase: "filtering", status: "running" });

  throw redirect(`/jobs/${jobId}`);
}
