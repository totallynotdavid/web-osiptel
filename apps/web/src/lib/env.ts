function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  database: {
    url: optional("DATABASE_URL", "file:vulf.db"),
  },
  redis: {
    url: optional("REDIS_URL", "redis://localhost:6379"),
  },
  robot: {
    url: optional("ROBOT_URL", "http://localhost:8001"),
  },
  auth: {
    get sessionSecret() {
      return require("SESSION_SECRET");
    },
    get seedPassword() {
      return require("SEED_PASSWORD");
    },
  },
  encryption: {
    get key() {
      return require("ENCRYPTION_KEY");
    },
  },
  email: {
    resendApiKey: process.env.RESEND_API_KEY ?? null,
    from: optional("RESEND_FROM", "noreply@example.test"),
  },
  app: {
    url: optional("APP_URL", "http://localhost:3000"),
  },
} as const;
