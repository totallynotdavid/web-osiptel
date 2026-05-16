import type { Role } from "./identity.types";

export interface UserSessionsTable {
  id: string;
  user_id: string;
  role: Role;
  ip_address: string | null;
  user_agent: string | null;
  created_at: number;
  last_activity: number;
  expires_at: number;
}

export interface AuthThrottleCountersTable {
  id: number;
  scope: string;
  key_hash: string;
  window_started_at: number;
  failure_count: number;
  blocked_until: number | null;
  updated_at: number;
}
