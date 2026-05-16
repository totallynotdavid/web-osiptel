export interface NotificationPrefsTable {
  id: string;
  user_id: string;
  email: string | null;
  phone: string | null;
  phone_verified: number;
  phone_verification_code: string | null;
  phone_verification_expires_at: number | null;
  notify_on_completion: number;
  notify_on_failure: number;
  created_at: number;
  updated_at: number;
}
