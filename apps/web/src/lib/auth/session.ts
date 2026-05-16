import type { Role } from "~/lib/db/types";

export interface Session {
  id: string;
  userId: string;
  role: Role;
  expiresAt: number;
}

export const SESSION_COOKIE = "vulf_sid";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionId(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
