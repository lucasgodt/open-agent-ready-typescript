import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**"],
      exclude: ["src/main/server.ts"],
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
    },
  },
});
