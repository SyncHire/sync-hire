/**
 * GET /api/jobs
 *
 * Retrieves all active jobs for candidates to browse
 * For org-specific jobs, use /api/orgs/:id/jobs
 */

import { NextResponse } from "next/server";
import { getAllActiveJobsData } from "@/lib/server-utils/get-jobs";

export async function GET() {
  try {
    const jobs = await getAllActiveJobsData();
    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs",
      },
      { status: 500 },
    );
  }
}
