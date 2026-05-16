"use server";

import { redirect } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { getPhase1Queue, type Phase1JobData } from "~/lib/queue/queues";
import { createJobsRepo } from "~/server/pipeline/jobs-repo";

const RUC_RE = /^\d{11}$/;
const BATCH_SIZE = 30;
const MAX_PHASE1_BATCHES_IN_FLIGHT_PER_UPLOAD = 6;
const PHASE1_WAVE_DELAY_MS = 15_000;

function parseRucs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => RUC_RE.test(l));
}

export type UploadResult =
  | { ok: true; jobId: string }
  | { ok: false; error: "no_file" | "invalid_csv" | "empty" | "unauthorized" };

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

  // Create all items in DB first
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

  // Insert items in chunks to avoid hitting SQLite limits
  const DB_CHUNK = 500;
  for (let i = 0; i < items.length; i += DB_CHUNK) {
    await jobs.createItemsBatch(items.slice(i, i + DB_CHUNK));
  }

  const batches = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const slice = items.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);
    const wave = Math.floor(batchIndex / MAX_PHASE1_BATCHES_IN_FLIGHT_PER_UPLOAD);
    batches.push({
      name: "phase1_batch",
      data: {
        uploadJobId: jobId,
        userId: session.userId,
        itemIds: slice.map((x) => x.id),
        rucList: slice.map((x) => x.ruc),
      } satisfies Phase1JobData,
      opts: {
        delay: wave * PHASE1_WAVE_DELAY_MS,
        jobId: `${jobId}:phase1:${batchIndex}`,
      },
    });
  }

  await getPhase1Queue().addBulk(batches);

  await jobs.updateStatus(jobId, { phase: "phase1", status: "running" });

  throw redirect(`/jobs/${jobId}`);
}
