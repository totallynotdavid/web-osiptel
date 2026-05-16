"use server";

import { createHash } from "crypto";
import { getRequestEvent } from "solid-js/web";

import { db } from "~/lib/db/db";
import { notify } from "~/lib/notifications/service";

export type VerifyResult = { ok: true } | { ok: false; error: string };

const CODE_TTL_MS = 10 * 60 * 1000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function sendVerificationCode(): Promise<VerifyResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return { ok: false, error: "unauthorized" };

  const prefs = await db
    .selectFrom("notification_prefs")
    .select(["phone"])
    .where("user_id", "=", session.userId)
    .executeTakeFirst();

  if (!prefs?.phone) return { ok: false, error: "No phone number saved" };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = Date.now();

  await db
    .updateTable("notification_prefs")
    .set({
      phone_verification_code: hashCode(code),
      phone_verification_expires_at: now + CODE_TTL_MS,
      updated_at: now,
    })
    .where("user_id", "=", session.userId)
    .execute();

  await notify(db, session.userId, "phone_verification", { phone: prefs.phone, code });

  return { ok: true };
}

export async function confirmVerificationCode(formData: FormData): Promise<VerifyResult> {
  const event = getRequestEvent();
  const session = event?.locals?.session;
  if (!session) return { ok: false, error: "unauthorized" };

  const input = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(input)) return { ok: false, error: "Invalid code format" };

  const prefs = await db
    .selectFrom("notification_prefs")
    .select(["phone_verification_code", "phone_verification_expires_at"])
    .where("user_id", "=", session.userId)
    .executeTakeFirst();

  if (!prefs?.phone_verification_code || !prefs.phone_verification_expires_at) {
    return { ok: false, error: "No pending verification. Request a new code." };
  }

  const now = Date.now();
  if (now > prefs.phone_verification_expires_at) {
    await db
      .updateTable("notification_prefs")
      .set({ phone_verification_code: null, phone_verification_expires_at: null, updated_at: now })
      .where("user_id", "=", session.userId)
      .execute();
    return { ok: false, error: "Code expired. Request a new one." };
  }

  const match = hashCode(input) === prefs.phone_verification_code;

  await db
    .updateTable("notification_prefs")
    .set({
      ...(match && { phone_verified: 1 }),
      phone_verification_code: null,
      phone_verification_expires_at: null,
      updated_at: now,
    })
    .where("user_id", "=", session.userId)
    .execute();

  return match ? { ok: true } : { ok: false, error: "Incorrect code. Request a new one." };
}
