import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Environment for testing Next.js API routes
    environment: "node",

    // Include patterns
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],

    // Exclude patterns
    exclude: ["node_modules", ".next", "e2e"],

    // Setup files run before each test file
    setupFiles: ["./test/setup.ts"],

    // Single fork for database test isolation (Vitest 4 syntax)
    pool: "forks",
    isolate: false,

    // Timeout for database operations
    testTimeout: 10000,
    hookTimeout: 10000,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/app/api/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["**/*.test.ts", "**/mocks/**"],
    },
  },
});
