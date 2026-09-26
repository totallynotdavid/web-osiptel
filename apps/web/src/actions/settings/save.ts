"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { encrypt } from "~/lib/crypto/credentials";
import { NotifPrefsSchema, ProxyCredentialsSchema, firstIssue } from "~/lib/validation/forms";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveProxyCredentials(formData: FormData): Promise<SaveResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = ProxyCredentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const { username, password } = parsed.data;
  const encryptedPassword = encrypt(password);

  const existing = await db
    .selectFrom("proxy_credentials")
    .select("id")
    .where("user_id", "=", session.userId)
    .executeTakeFirst();

  const now = Date.now();

  if (existing) {
    await db
      .updateTable("proxy_credentials")
      .set({ geonode_username: username, geonode_password_enc: encryptedPassword, updated_at: now })
      .where("user_id", "=", session.userId)
      .execute();
  } else {
    await db
      .insertInto("proxy_credentials")
      .values({
        id: crypto.randomUUID(),
        user_id: session.userId,
        geonode_username: username,
        geonode_password_enc: encryptedPassword,
        created_at: now,
        updated_at: now,
      })
      .execute();
  }

  return { ok: true };
}

export async function saveNotificationPrefs(formData: FormData): Promise<SaveResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return { ok: false, error: "unauthorized" };

  const parsed = NotifPrefsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const {
    email,
    phone,
    notify_on_completion: notifyOnCompletion,
    notify_on_failure: notifyOnFailure,
  } = parsed.data;

  const existing = await db
    .selectFrom("notification_prefs")
    .select(["id", "phone"])
    .where("user_id", "=", session.userId)
    .executeTakeFirst();

  const now = Date.now();
  const phoneChanged = existing?.phone !== phone;

  if (existing) {
    await db
      .updateTable("notification_prefs")
      .set({
        email,
        phone,
        ...(phoneChanged && {
          phone_verified: 0,
          phone_verification_code: null,
          phone_verification_expires_at: null,
        }),
        notify_on_completion: notifyOnCompletion,
        notify_on_failure: notifyOnFailure,
        updated_at: now,
      })
      .where("user_id", "=", session.userId)
      .execute();
  } else {
    await db
      .insertInto("notification_prefs")
      .values({
        id: crypto.randomUUID(),
        user_id: session.userId,
        email,
        phone,
        phone_verified: 0,
        phone_verification_code: null,
        phone_verification_expires_at: null,
        notify_on_completion: notifyOnCompletion,
        notify_on_failure: notifyOnFailure,
        created_at: now,
        updated_at: now,
      })
      .execute();
  }

  return { ok: true };
}
