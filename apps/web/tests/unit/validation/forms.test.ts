import { describe, expect, it } from "vitest";
import type { z } from "zod";

import {
  CreateUserSchema,
  LoginSchema,
  NotifPrefsSchema,
  ProxyCredentialsSchema,
  ToggleUserSchema,
  VerifyCodeSchema,
  firstIssue,
} from "~/lib/validation/forms";

function messageFor(schema: z.ZodType, input: object): string {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("expected input to be rejected");
  return firstIssue(parsed.error);
}

const validUser = {
  email: "Ana@Example.com ",
  full_name: "Ana",
  password: "12345678",
  role: "client",
};

describe("notification preferences", () => {
  const valid = { email: "", phone: "987654321" };

  it("rejects a phone of 8 digits with the message the settings page shows", () => {
    expect(messageFor(NotifPrefsSchema, { ...valid, phone: "98765432" })).toBe(
      "Phone must be 9 digits (e.g. 987654321)",
    );
  });

  it("normalizes empty strings to null and checkboxes to 0 or 1", () => {
    const parsed = NotifPrefsSchema.parse({ email: " ", phone: "", notify_on_failure: "1" });
    expect(parsed).toEqual({
      email: null,
      phone: null,
      notify_on_completion: 0,
      notify_on_failure: 1,
    });
  });

  it("rejects a malformed email and a checkbox value the form never sends", () => {
    expect(messageFor(NotifPrefsSchema, { ...valid, email: "not-an-email" })).toBe(
      "Invalid email address",
    );
    expect(NotifPrefsSchema.safeParse({ ...valid, notify_on_failure: "yes" }).success).toBe(false);
  });
});

describe("toggle user", () => {
  it("accepts only the 0 or 1 the admin page sends", () => {
    expect(ToggleUserSchema.safeParse({ user_id: "u1", is_active: "0" }).success).toBe(true);
    expect(ToggleUserSchema.safeParse({ user_id: "u1", is_active: "unexpected" }).success).toBe(
      false,
    );
  });
});

describe("create user", () => {
  it("rejects a password of 7 characters with the message the admin form shows", () => {
    expect(messageFor(CreateUserSchema, { ...validUser, password: "1234567" })).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("reports empty fields before anything else", () => {
    expect(messageFor(CreateUserSchema, { ...validUser, full_name: " ", password: "" })).toBe(
      "All fields are required",
    );
    expect(messageFor(CreateUserSchema, { ...validUser, password: "" })).toBe(
      "All fields are required",
    );
  });

  it("rejects an unknown role", () => {
    expect(messageFor(CreateUserSchema, { ...validUser, role: "root" })).toBe("Invalid role");
  });

  it("trims and lowercases the email", () => {
    expect(CreateUserSchema.parse(validUser).email).toBe("ana@example.com");
  });
});

describe("login", () => {
  it("rejects a malformed email and an empty password", () => {
    expect(LoginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(LoginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("proxy credentials", () => {
  it("requires both fields", () => {
    expect(messageFor(ProxyCredentialsSchema, { username: "u", password: "  " })).toBe(
      "Username and password are required",
    );
  });
});

describe("phone verification code", () => {
  it("accepts exactly six digits", () => {
    expect(VerifyCodeSchema.parse({ code: " 123456 " }).code).toBe("123456");
    expect(messageFor(VerifyCodeSchema, { code: "12345" })).toBe("Invalid code format");
  });
});
