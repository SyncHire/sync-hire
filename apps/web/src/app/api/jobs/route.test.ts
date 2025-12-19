/**
 * Tests for GET /api/jobs
 *
 * Tests public jobs listing endpoint (no auth required).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// Mock the server-utils to avoid database dependency in unit test
vi.mock("@/lib/server-utils/get-jobs", () => ({
  getAllActiveJobsData: vi.fn(),
}));

describe("GET /api/jobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return list of active jobs", async () => {
    const { getAllActiveJobsData } = await import(
      "@/lib/server-utils/get-jobs"
    );

    vi.mocked(getAllActiveJobsData).mockResolvedValueOnce([
      {
        id: "job-1",
        title: "Software Engineer",
        location: "Remote",
        organizationName: "Test Corp",
      },
    ]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe("Software Engineer");
  });

  it("should return empty array when no jobs exist", async () => {
    const { getAllActiveJobsData } = await import(
      "@/lib/server-utils/get-jobs"
    );

    vi.mocked(getAllActiveJobsData).mockResolvedValueOnce([]);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(0);
  });

  it("should return 500 on error", async () => {
    const { getAllActiveJobsData } = await import(
      "@/lib/server-utils/get-jobs"
    );

    vi.mocked(getAllActiveJobsData).mockRejectedValueOnce(
      new Error("Database error")
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.success).toBe(false);
    expect(json.error).toBe("Database error");
  });
});
