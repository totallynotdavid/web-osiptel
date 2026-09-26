import { Client } from "pg";
import type { APIEvent } from "@solidjs/start/server";
import { z } from "zod";

import { SESSION_COOKIE } from "~/lib/auth/session";
import { db } from "~/lib/db/db";
import { env } from "~/lib/env";
import { createSessionRepo } from "~/server/auth/session-repo";
import { createJobsRepo } from "~/server/pipeline/jobs-repo";

const NotifyPayload = z.object({ uploadJobId: z.string() });

function parseCookie(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === name) return v;
  }
  return undefined;
}

export async function GET(event: APIEvent): Promise<Response> {
  const cookieHeader = event.request.headers.get("cookie") ?? "";
  const sessionId = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!sessionId) return new Response("Unauthorized", { status: 401 });

  const sessions = createSessionRepo(db);
  const session = await sessions.findValid(sessionId);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const jobId = event.params.id;
  const jobs = createJobsRepo(db);
  const isAdmin = session.role === "admin";
  const job = isAdmin
    ? await jobs.findById(jobId)
    : await jobs.findByIdForUser(jobId, session.userId);

  if (!job) return new Response("Not found", { status: 404 });

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));

      const client = new Client({ connectionString: env.database.url });
      await client.connect();
      await client.query("LISTEN progress");
      await client.query("LISTEN upload_done");

      const current = await jobs.findById(jobId);
      if (current) {
        encode({
          processed: current.processed_rows,
          total: current.total_rows,
          active: current.active_rows,
          status: current.status,
        });
        if (current.status === "completed" || current.status === "failed") {
          await client.end();
          controller.close();
          return;
        }
      }

      async function cleanup() {
        await client.end().catch(() => {});
        controller.close();
      }

      client.on("notification", async (msg) => {
        try {
          const r = NotifyPayload.safeParse(JSON.parse(msg.payload ?? "{}"));
          if (!r.success) return;
          const { uploadJobId } = r.data;
          if (uploadJobId !== jobId) return;

          const updated = await jobs.findById(jobId);
          if (updated) {
            encode({
              processed: updated.processed_rows,
              total: updated.total_rows,
              active: updated.active_rows,
              status: updated.status,
            });
          }

          if (msg.channel === "upload_done") {
            await cleanup();
          }
        } catch {
          // ignore notification parse errors
        }
      });

      event.request.signal.addEventListener("abort", cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
