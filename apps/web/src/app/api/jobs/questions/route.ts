/**
 * POST /api/jobs/questions
 *
 * Checks which jobs have pre-generated interview questions for a given CV.
 * Returns array of jobs with their question availability status.
 */

import { type NextRequest, NextResponse } from "next/server";
import { getAllActiveJobsData } from "@/lib/server-utils/get-jobs";
import { getStorage } from "@/lib/storage/storage-factory";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cvId } = body;

    // Validate cvId
    if (!cvId || typeof cvId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Missing or invalid cvId",
        },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const allJobs = await getAllActiveJobsData();

    // Check which jobs have questions for this CV
    const questionsStatus = await Promise.all(
      allJobs.map(async (job) => {
        const hasQuestions = await storage.hasInterviewQuestions(cvId, job.id);

        return {
          jobId: job.id,
          hasQuestions,
        };
      }),
    );

    return NextResponse.json(
      {
        success: true,
        data: questionsStatus,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Check questions error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to check questions",
      },
      { status: 500 },
    );
  }
}
