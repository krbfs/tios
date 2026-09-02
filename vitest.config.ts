import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
  },
  resolve: {
    alias: [
      {
        find: /^@\/test\/(.*)/,
        replacement: path.resolve(__dirname, "tests/$1"),
      },
      {
        find: /^@\/(.*)/,
        replacement: path.resolve(__dirname, "src/$1"),
      },
    ],
  },
});
