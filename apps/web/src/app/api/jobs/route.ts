/**
 * GET /api/jobs
 *
 * Retrieves all jobs from file storage and memory, merged together
 */

import { NextResponse } from "next/server";
import { getAllJobsData } from "@/lib/server-utils/get-jobs";

export async function GET() {
  try {
    const jobs = await getAllJobsData();
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
      { status: 500 }
    );
  }
}
