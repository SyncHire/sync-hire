/**
 * GET /api/orgs/:id/jobs
 *
 * Retrieves jobs for a specific organization.
 * Requires authentication and organization membership.
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@sync-hire/database";
import { requireAuth } from "@/lib/auth-server";
import { getAllJobsData } from "@/lib/server-utils/get-jobs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = session.user.id;

    const { id: organizationId } = await params;

    // Validate user is a member of the organization
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const jobs = await getAllJobsData(organizationId);
    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    logger.error(error, { api: "orgs/jobs", operation: "fetch" });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch jobs",
      },
      { status: 500 },
    );
  }
}
