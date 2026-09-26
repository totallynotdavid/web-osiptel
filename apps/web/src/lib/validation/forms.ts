import { z } from "zod";

const REQUIRED = "All fields are required";
const PROXY_REQUIRED = "Username and password are required";

/** First issue message, which is the only one the UI shows. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

const email = z
  .string(REQUIRED)
  .trim()
  .min(1, REQUIRED)
  .transform((s) => s.toLowerCase())
  .pipe(z.email("Invalid email address"));

export const LoginSchema = z.object({
  email,
  password: z.string().min(1),
});

export const CreateUserSchema = z.object({
  email,
  full_name: z.string(REQUIRED).trim().min(1, REQUIRED),
  password: z.string(REQUIRED).min(1, REQUIRED).min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "sales_manager", "client"], "Invalid role"),
});

export const ToggleUserSchema = z.object({
  user_id: z.string().min(1),
  is_active: z.enum(["0", "1"]),
});

export const ProxyCredentialsSchema = z.object({
  username: z.string(PROXY_REQUIRED).trim().min(1, PROXY_REQUIRED),
  password: z.string(PROXY_REQUIRED).trim().min(1, PROXY_REQUIRED),
});

// A checked box sends "1"; an unchecked one sends nothing.
const checkbox = z
  .literal("1")
  .optional()
  .transform((v) => (v === "1" ? 1 : 0));

export const NotifPrefsSchema = z.object({
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || z.email().safeParse(v).success, "Invalid email address")
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{9}$/.test(v), "Phone must be 9 digits (e.g. 987654321)")
    .transform((v) => v || null),
  notify_on_completion: checkbox,
  notify_on_failure: checkbox,
});

export const VerifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Invalid code format"),
});
