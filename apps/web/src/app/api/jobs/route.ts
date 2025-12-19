/**
 * GET /api/jobs
 *
 * Retrieves all active jobs for candidates to browse
 * For org-specific jobs, use /api/orgs/:id/jobs
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getAllActiveJobsData } from "@/lib/server-utils/get-jobs";

export async function GET() {
  try {
    const jobs = await getAllActiveJobsData();
    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(error, { api: "jobs", operation: "fetch-active" });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs",
      },
      { status: 500 },
    );
  }
}
