function require(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const env = {
  database: {
    get url() {
      return require("DATABASE_URL");
    },
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
    get apiKey() {
      return require("EMAIL_API_KEY");
    },
    get from() {
      return require("EMAIL_FROM");
    },
  },
  app: {
    get url() {
      return require("APP_URL");
    },
  },
} as const;
