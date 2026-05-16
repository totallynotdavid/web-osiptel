"use server";

import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { encrypt } from "~/lib/crypto/credentials";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveProxyCredentials(formData: FormData): Promise<SaveResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return { ok: false, error: "unauthorized" };

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) {
    return { ok: false, error: "Username and password are required" };
  }

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

  const email = String(formData.get("email") ?? "").trim() || null;
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const notifyOnCompletion = formData.get("notify_on_completion") === "1" ? 1 : 0;
  const notifyOnFailure = formData.get("notify_on_failure") === "1" ? 1 : 0;

  if (rawPhone && !/^\d{9}$/.test(rawPhone)) {
    return { ok: false, error: "Phone must be 9 digits (e.g. 987654321)" };
  }
  const phone = rawPhone || null;

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
