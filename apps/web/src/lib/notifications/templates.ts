import type { NotificationEvent, NotificationMessage } from "./types";

type Context = Record<string, unknown>;

function str(ctx: Context, key: string): string {
  return String(ctx[key] ?? "");
}

const templates: Record<NotificationEvent, (ctx: Context) => NotificationMessage> = {
  upload_queued: (ctx) => ({
    subject: "Your upload is being processed - Vulf",
    body: `Your file "${str(ctx, "filename")}" has been queued for processing.\nWe'll notify you when it's done.`,
  }),
  phase1_complete: (ctx) => ({
    subject: "Phase 1 complete - Vulf",
    body: `Filtering complete for "${str(ctx, "filename")}".\n${str(ctx, "activeCount")} active organizations found out of ${str(ctx, "totalCount")}.\nFetching provider details now.`,
  }),
  upload_completed: (ctx) => ({
    subject: "Processing complete - Vulf",
    body: `Your upload "${str(ctx, "filename")}" has been fully processed.\n${str(ctx, "activeCount")} active organizations with provider data are ready.`,
  }),
  upload_failed: (ctx) => ({
    subject: "Processing failed - Vulf",
    body: `Your upload "${str(ctx, "filename")}" encountered an error: ${str(ctx, "error")}.\nPlease retry or contact support.`,
  }),
  phone_verification: (ctx) => ({
    subject: "Verification code - Vulf",
    body: `Your Vulf verification code is: ${str(ctx, "code")}\nThis code expires in 10 minutes.`,
  }),
};

export function renderTemplate(event: NotificationEvent, ctx: Context): NotificationMessage {
  return templates[event](ctx);
}
