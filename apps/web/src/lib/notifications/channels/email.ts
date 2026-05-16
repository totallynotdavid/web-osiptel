import { Resend } from "resend";

import { env } from "~/lib/env";
import { createLogger } from "~/lib/observability/logger";
import type { NotificationChannel, NotificationMessage } from "../types";

const logger = createLogger("notification:email");

export const emailChannel: NotificationChannel = {
  id: "email",
  contactField: "email",
  async send(to: string, message: NotificationMessage): Promise<void> {
    const client = new Resend(env.email.apiKey);
    const { error } = await client.emails.send({
      from: env.email.from,
      to,
      subject: message.subject,
      text: message.body,
    });
    if (error) {
      logger.error("email_send_failed", { to, error: error.message });
      throw new Error(`Resend error: ${error.message}`);
    }
    logger.info("email_sent", { to });
  },
};
