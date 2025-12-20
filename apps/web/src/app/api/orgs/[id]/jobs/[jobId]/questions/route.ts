/**
 * API for job custom questions CRUD
 * GET - Get all questions for a job
 * POST - Add a new question
 * PUT - Update question order OR bulk update all interview questions
 * DELETE - Delete a specific question
 *
 * Access: HR only (organization members)
 */

import type { NextRequest } from "next/server";
import { createdResponse, errors, successResponse } from "@/lib/api-response";
import { withOrgMembership } from "@/lib/auth-middleware";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const { id: organizationId, jobId } = await params;

    // Verify org membership
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const storage = getStorage();

    // Get job and verify it belongs to this org
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }
    if (job.organizationId !== organizationId) {
      return errors.forbidden("Job does not belong to this organization");
    }

    // Return job questions
    const questions = job.questions || [];

    return successResponse({ success: true, data: questions });
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/jobs/[jobId]/questions",
      operation: "get",
    });
    return errors.internal("Failed to retrieve questions");
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const { id: organizationId, jobId } = await params;

    // Verify org membership
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const body = await request.json();
    const storage = getStorage();

    const { type, content, order, required } = body;

    if (!type || !content) {
      return errors.badRequest("Missing required fields: type, content");
    }

    // Get existing job and verify it belongs to this org
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }
    if (job.organizationId !== organizationId) {
      return errors.forbidden("Job does not belong to this organization");
    }

    // Create new question
    const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newQuestion = {
      id: questionId,
      jobId,
      content,
      type:
        type === "video" ? ("LONG_ANSWER" as const) : ("SHORT_ANSWER" as const),
      options: [] as string[],
      duration: 2,
      category: null,
      required: required ?? false,
      order: order ?? job.questions?.length ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to job questions
    const updatedJob = {
      ...job,
      questions: [...(job.questions || []), newQuestion],
    };

    await storage.saveJob(jobId, updatedJob);

    return createdResponse({ success: true, data: newQuestion });
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/jobs/[jobId]/questions",
      operation: "create",
    });
    return errors.internal("Failed to create question");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const { id: organizationId, jobId } = await params;

    // Verify org membership
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const body = await request.json();
    const storage = getStorage();

    // Get existing job and verify it belongs to this org
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }
    if (job.organizationId !== organizationId) {
      return errors.forbidden("Job does not belong to this organization");
    }

    // Check if this is a bulk update (questions array provided)
    if (body.questions && Array.isArray(body.questions)) {
      // Update job with new questions
      const updatedJob = {
        ...job,
        questions: body.questions.map(
          (
            q: { id: string; text: string; type?: string; duration?: number },
            index: number,
          ) => ({
            id: q.id,
            jobId,
            content: q.text,
            type:
              q.type === "video"
                ? ("LONG_ANSWER" as const)
                : ("SHORT_ANSWER" as const),
            options: [] as string[],
            duration: q.duration || 2,
            category: null,
            required: true,
            order: index,
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ),
      };

      // Save updated job
      await storage.saveJob(jobId, updatedJob);

      return successResponse({
        success: true,
        data: {
          id: jobId,
          questionCount: body.questions.length,
        },
      });
    }

    // Single question update
    const { questionId, updates } = body;

    if (!questionId) {
      return errors.badRequest("Missing questionId or questions array");
    }

    // Find and update the question
    const questionIndex =
      job.questions?.findIndex((q) => q.id === questionId) ?? -1;
    if (questionIndex === -1) {
      return errors.notFound("Question");
    }

    const questions = job.questions ?? [];
    const existingQuestion = questions[questionIndex];
    const updatedQuestion = {
      ...existingQuestion,
      ...updates,
      updatedAt: new Date(),
    };

    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex] = updatedQuestion;

    await storage.saveJob(jobId, { ...job, questions: updatedQuestions });

    return successResponse({ success: true, data: updatedQuestion });
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/jobs/[jobId]/questions",
      operation: "update",
    });
    return errors.internal("Failed to update question");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> },
) {
  try {
    const { id: organizationId, jobId } = await params;

    // Verify org membership
    const { response } = await withOrgMembership(organizationId);
    if (response) {
      return response;
    }

    const body = await request.json();
    const { questionId } = body;
    const storage = getStorage();

    if (!questionId) {
      return errors.badRequest("Missing questionId");
    }

    // Get existing job and verify it belongs to this org
    const job = await storage.getJob(jobId);
    if (!job) {
      return errors.notFound("Job");
    }
    if (job.organizationId !== organizationId) {
      return errors.forbidden("Job does not belong to this organization");
    }

    // Filter out the deleted question
    const questionIndex =
      job.questions?.findIndex((q) => q.id === questionId) ?? -1;
    if (questionIndex === -1) {
      return errors.notFound("Question");
    }

    const updatedQuestions = (job.questions || []).filter(
      (q) => q.id !== questionId,
    );
    await storage.saveJob(jobId, { ...job, questions: updatedQuestions });

    return successResponse({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error(error, {
      api: "orgs/[id]/jobs/[jobId]/questions",
      operation: "delete",
    });
    return errors.internal("Failed to delete question");
  }
}
