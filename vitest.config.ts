import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globals: false,
    env: {
      NODE_ENV: "test",
      DISCORD_TOKEN: "test-token",
      DISCORD_CLIENT_ID: "test-client-id",
      LOG_LEVEL: "silent",
    },
  },
});
