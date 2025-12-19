/**
 * Vitest Setup File
 *
 * Runs before each test file. Sets up mocks and environment.
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock Sentry to prevent external calls during tests
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((callback) =>
    callback({ setTag: vi.fn(), setExtra: vi.fn() })
  ),
  startSpan: vi.fn((_, callback) => callback({ setAttribute: vi.fn() })),
}));

// Mock the logger to prevent Sentry calls
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});
