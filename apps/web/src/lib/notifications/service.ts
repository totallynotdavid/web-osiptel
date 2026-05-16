import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";
import { emailChannel } from "./channels/email";
import { whatsappChannel } from "./channels/whatsapp";
import { renderTemplate } from "./templates";
import type { NotificationChannel, NotificationEvent } from "./types";

const logger = createLogger("notification:service");

const CHANNELS: NotificationChannel[] = [emailChannel, whatsappChannel];

export async function initChannels(): Promise<void> {
  await Promise.all(CHANNELS.map((c) => c.init?.() ?? Promise.resolve()));
}

export async function notify(
  db: Kysely<Database>,
  userId: string,
  event: NotificationEvent,
  context: Record<string, unknown>,
): Promise<void> {
  if (event === "phone_verification") {
    const message = renderTemplate(event, context);
    await whatsappChannel.send(String(context.phone), message).catch((err: unknown) => {
      logger.error("whatsapp_verification_failed", { error: String(err) });
    });
    return;
  }

  const prefs = await db
    .selectFrom("notification_prefs")
    .select(["email", "phone", "phone_verified", "notify_on_completion", "notify_on_failure"])
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!prefs) return;

  const isFailure = event === "upload_failed";
  if (isFailure && !prefs.notify_on_failure) return;
  if (!isFailure && !prefs.notify_on_completion) return;

  const message = renderTemplate(event, context);

  await Promise.allSettled(
    CHANNELS.map((channel) => {
      const to =
        channel.id === "whatsapp"
          ? prefs.phone_verified
            ? prefs.phone
            : null
          : prefs[channel.contactField as "email"];
      if (!to) return Promise.resolve();
      return channel.send(to, message).catch((err: unknown) => {
        logger.error(`${channel.id}_send_failed`, { userId, error: String(err) });
      });
    }),
  );
}
