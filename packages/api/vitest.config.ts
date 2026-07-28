import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5432/unified_attendance_test",
      BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-better-auth",
      BETTER_AUTH_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3000",
    },
    include: ["test/**/*.test.ts"],
  },
});
