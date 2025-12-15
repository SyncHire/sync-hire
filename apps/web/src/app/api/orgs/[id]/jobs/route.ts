/**
 * GET /api/orgs/:id/jobs
 *
 * Retrieves jobs for a specific organization
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAllJobsData } from "@/lib/server-utils/get-jobs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: organizationId } = await params;

    const jobs = await getAllJobsData(organizationId);
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
