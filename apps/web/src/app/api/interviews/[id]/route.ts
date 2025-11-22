/**
 * GET /api/interviews/[id]
 *
 * Retrieves a single interview with full details including AI evaluation
 */

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storage = getStorage();

    const interview = await storage.getInterview(id);

    if (!interview) {
      return NextResponse.json(
        { success: false, message: "Interview not found" },
        { status: 404 },
      );
    }

    // Get associated job details
    const job = await storage.getJob(interview.jobId);

    // Get candidate info if available
    const user = await storage.getUser(interview.candidateId);

    return NextResponse.json({
      success: true,
      data: {
        interview,
        job: job
          ? {
              id: job.id,
              title: job.title,
              company: job.company,
            }
          : null,
        candidate: user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Failed to fetch interview:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch interview" },
      { status: 500 },
    );
  }
}
