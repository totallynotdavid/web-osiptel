import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": resolve(process.cwd(), "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
    globalSetup: "./tests/support/global-setup.ts",
    setupFiles: ["./tests/support/vitest-setup.ts"],
    provide: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://localhost:5433/vulf_test",
    },
    env: {
      SESSION_SECRET: "test-session-secret",
      SEED_PASSWORD: "TestPassword!123",
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
  },
});

declare module "vitest" {
  export interface ProvidedContext {
    DATABASE_URL: string;
  }
}
