/**
 * GET /api/jobs
 *
 * Retrieves jobs for the active organization
 */

import { NextResponse } from "next/server";
import { getActiveOrganizationId } from "@/lib/auth-server";
import { getAllJobsData } from "@/lib/server-utils/get-jobs";

export async function GET() {
  try {
    const organizationId = await getActiveOrganizationId();

    if (!organizationId) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

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
