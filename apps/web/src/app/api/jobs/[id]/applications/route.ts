/**
 * GET /api/jobs/[id]/applications
 *
 * Get all candidate applications for a specific job.
 */

import { type NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const storage = getStorage();

    // Get applications for this job (returns empty if job doesn't exist)
    const applications = await storage.getApplicationsForJob(jobId);

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        total: applications.length,
        applications: applications.map(app => ({
          id: app.id,
          cvId: app.cvUploadId,
          candidateName: app.candidateName,
          candidateEmail: app.candidateEmail,
          matchScore: app.matchScore,
          matchReasons: app.matchReasons,
          skillGaps: app.skillGaps,
          status: app.status,
          source: app.source,
          createdAt: app.createdAt,
        })),
      },
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { api: "jobs/[id]/applications", operation: "fetch" },
    });
    console.error("Get applications error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get applications" },
      { status: 500 }
    );
  }
}
