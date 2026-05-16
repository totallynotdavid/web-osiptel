import type { Role } from "~/lib/db/types";

const ROLE_LEVEL: Record<Role, number> = {
  client: 0,
  sales_manager: 1,
  admin: 2,
};

export function hasRole(userRole: Role, required: Role): boolean {
  return (ROLE_LEVEL[userRole] ?? -1) >= (ROLE_LEVEL[required] ?? 99);
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_") ||
    pathname.includes(".")
  );
}

export function isManagerPath(pathname: string): boolean {
  return pathname.startsWith("/manager");
}

export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

export function defaultPathForRole(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "sales_manager") return "/manager";
  return "/dashboard";
}
