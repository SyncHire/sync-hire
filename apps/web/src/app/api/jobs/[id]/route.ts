/**
 * Job API endpoints
 * PUT - Update job settings (aiMatchingEnabled, etc.)
 * GET - Get single job by ID
 */

import { type NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const storage = getStorage();

    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json({ success: true, data: null });
    }

    // Compute accurate applicant count from interviews
    const allInterviews = await storage.getAllInterviews();
    const jobInterviews = allInterviews.filter((i) => i.jobId === jobId);
    const jobWithCount = {
      ...job,
      applicantsCount: jobInterviews.length,
    };

    return NextResponse.json({ success: true, data: jobWithCount });
  } catch (error) {
    console.error("Get job error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get job" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const storage = getStorage();

    // Get existing job
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json({ success: true, data: null });
    }

    // Update job with new settings
    const updatedJob = {
      ...job,
      ...(body.aiMatchingEnabled !== undefined && { aiMatchingEnabled: body.aiMatchingEnabled }),
      ...(body.aiMatchingThreshold !== undefined && { aiMatchingThreshold: body.aiMatchingThreshold }),
    };

    // Save updated job
    await storage.saveJob(jobId, updatedJob);

    return NextResponse.json({
      success: true,
      data: {
        id: jobId,
        aiMatchingEnabled: updatedJob.aiMatchingEnabled,
        aiMatchingThreshold: updatedJob.aiMatchingThreshold,
      },
    });
  } catch (error) {
    console.error("Update job error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update job" },
      { status: 500 }
    );
  }
}
