"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";

export async function getMySettings() {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return null;

  const [proxy, prefs] = await Promise.all([
    db
      .selectFrom("proxy_credentials")
      .select(["geonode_username"])
      .where("user_id", "=", session.userId)
      .executeTakeFirst(),
    db
      .selectFrom("notification_prefs")
      .select(["email", "phone", "phone_verified", "notify_on_completion", "notify_on_failure"])
      .where("user_id", "=", session.userId)
      .executeTakeFirst(),
  ]);

  return {
    proxyUsername: proxy?.geonode_username ?? null,
    notificationEmail: prefs?.email ?? null,
    whatsappPhone: prefs?.phone ?? null,
    phoneVerified: prefs?.phone_verified === 1,
    notifyOnCompletion: prefs?.notify_on_completion ?? 1,
    notifyOnFailure: prefs?.notify_on_failure ?? 1,
  };
}
