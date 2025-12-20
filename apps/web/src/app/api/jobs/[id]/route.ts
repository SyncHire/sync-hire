/**
 * Job API endpoints
 * GET - Get single job by ID (public for candidates, limited fields)
 * PUT - Update job settings (aiMatchingEnabled, etc.) - requires HR access
 */

import { JobStatus, MatchingStatus } from "@sync-hire/database";
import type { NextRequest } from "next/server";
import { errors, successResponse } from "@/lib/api-response";
import { withJobAccess } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

/**
 * GET /api/jobs/[id]
 * Public endpoint for viewing job details (candidates need this).
 *
 * Security:
 * - Only returns ACTIVE jobs (DRAFT/CLOSED are hidden)
 * - Returns limited public fields (hides internal HR data)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;
    const storage = getStorage();

    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }

    // Only show ACTIVE jobs publicly
    if (job.status !== JobStatus.ACTIVE) {
      return errors.notFound("Job");
    }

    // Return only public fields (hide internal HR data)
    const publicJob = {
      id: job.id,
      title: job.title,
      department: job.department,
      location: job.location,
      employmentType: job.employmentType,
      workArrangement: job.workArrangement,
      salary: job.salary,
      description: job.description,
      requirements: job.requirements,
      postedAt: job.postedAt,
      // Include questions for interview prep (content only, no internal IDs)
      questions: job.questions?.map((q) => ({
        content: q.content,
        type: q.type,
        duration: q.duration,
        category: q.category,
      })),
    };

    return successResponse({ success: true, data: publicJob });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]", operation: "get" });
    return errors.internal("Failed to get job");
  }
}

/**
 * PUT /api/jobs/[id]
 * Update job settings - requires HR access (organization member)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;

    // Verify HR access (org member only)
    const { response } = await withJobAccess(jobId);
    if (response) {
      return response;
    }

    const body = await request.json();
    const storage = getStorage();

    // Get existing job (already verified to exist by withJobAccess)
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }

    // Update job with new settings
    const updatedJob = {
      ...job,
      ...(body.aiMatchingEnabled !== undefined && {
        aiMatchingEnabled: body.aiMatchingEnabled,
      }),
      ...(body.aiMatchingThreshold !== undefined && {
        aiMatchingThreshold: body.aiMatchingThreshold,
      }),
    };

    // If AI matching is being disabled, update status to DISABLED (stops scanning)
    if (body.aiMatchingEnabled === false) {
      updatedJob.aiMatchingStatus = MatchingStatus.DISABLED;
    }

    // Save updated job
    await storage.saveJob(jobId, updatedJob);

    return successResponse({
      success: true,
      data: {
        id: jobId,
        aiMatchingEnabled: updatedJob.aiMatchingEnabled,
        aiMatchingThreshold: updatedJob.aiMatchingThreshold,
        aiMatchingStatus: updatedJob.aiMatchingStatus,
      },
    });
  } catch (error) {
    logger.error(error, { api: "jobs/[id]", operation: "update" });
    return errors.internal("Failed to update job");
  }
}
