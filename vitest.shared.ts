import { fileURLToPath } from "node:url"
import type { UserConfig } from "vitest/config"

export const vitestSharedConfig: UserConfig = {
  test: {
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "test/**/*.{test,spec}.{ts,tsx}",
    ],
    setupFiles: [fileURLToPath(new URL("./vitest.setup.ts", import.meta.url))],
    environment: "jsdom",
    coverage: {
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
    },
  },
}
