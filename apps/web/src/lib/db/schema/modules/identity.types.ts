export type Role = "admin" | "sales_manager" | "client";

export interface UsersTable {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: Role;
  is_active: number;
  created_at: number;
  updated_at: number;
}
