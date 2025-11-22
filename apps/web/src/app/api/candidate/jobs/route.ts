/**
 * GET /api/candidate/jobs
 *
 * Retrieves all job applications for the current candidate
 * Returns jobs with candidate-specific application context
 */

import { NextResponse } from "next/server";
import { getCandidateJobApplications } from "@/lib/server-utils/get-candidate-jobs";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET() {
  try {
    const storage = getStorage();
    const user = await storage.getCurrentUser();
    const applications = await getCandidateJobApplications(user.id);

    return NextResponse.json({
      success: true,
      data: {
        user,
        applications,
      },
    });
  } catch (error) {
    console.error("Failed to fetch candidate job applications:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch job applications",
      },
      { status: 500 },
    );
  }
}
