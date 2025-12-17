/**
 * API for job custom questions CRUD
 * GET - Get all questions for a job
 * POST - Add a new question
 * PUT - Update question order OR bulk update all interview questions
 * DELETE - Delete a specific question
 */

import { type NextRequest, NextResponse } from "next/server";
import type { QuestionType } from "@/lib/types/interview-types";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const storage = getStorage();

    // Get job from storage
    const job = await storage.getJob(id);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    // Return job questions
    const questions = job.questions || [];

    return NextResponse.json(
      { success: true, data: questions },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get questions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve questions" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const storage = getStorage();

    const { type, content, order, required } = body;

    if (!type || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: type, content" },
        { status: 400 },
      );
    }

    // Get existing job
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    // Create new question
    const questionId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newQuestion = {
      id: questionId,
      jobId,
      content,
      type: type === "video" ? "LONG_ANSWER" as const : "SHORT_ANSWER" as const,
      options: [] as string[],
      duration: 2,
      category: null,
      required: required ?? false,
      order: order ?? (job.questions?.length ?? 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to job questions
    const updatedJob = {
      ...job,
      questions: [...(job.questions || []), newQuestion],
    };

    await storage.saveJob(jobId, updatedJob);

    return NextResponse.json(
      { success: true, data: newQuestion },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create question" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const storage = getStorage();

    // Check if this is a bulk update (questions array provided)
    if (body.questions && Array.isArray(body.questions)) {
      // Get existing job
      const job = await storage.getJob(jobId);
      if (!job) {
        return NextResponse.json(
          { success: false, error: `Job not found: ${jobId}` },
          { status: 404 },
        );
      }

      // Update job with new questions
      const updatedJob = {
        ...job,
        questions: body.questions.map((q: { id: string; text: string; type?: string; duration?: number }, index: number) => ({
          id: q.id,
          jobId,
          content: q.text,
          type: q.type === "video" ? "LONG_ANSWER" as const : "SHORT_ANSWER" as const,
          options: [] as string[],
          duration: q.duration || 2,
          category: null,
          required: true,
          order: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      // Save updated job
      await storage.saveJob(jobId, updatedJob);

      return NextResponse.json(
        {
          success: true,
          data: {
            id: jobId,
            questionCount: body.questions.length,
          },
        },
        { status: 200 },
      );
    }

    // Single question update
    const { questionId, updates } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId or questions array" },
        { status: 400 },
      );
    }

    // Get existing job
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    // Find and update the question
    const questionIndex = job.questions?.findIndex(q => q.id === questionId) ?? -1;
    if (questionIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

    const existingQuestion = job.questions![questionIndex];
    const updatedQuestion = {
      ...existingQuestion,
      ...updates,
      updatedAt: new Date(),
    };

    const updatedQuestions = [...(job.questions || [])];
    updatedQuestions[questionIndex] = updatedQuestion;

    await storage.saveJob(jobId, { ...job, questions: updatedQuestions });

    return NextResponse.json({ success: true, data: updatedQuestion }, { status: 200 });
  } catch (error) {
    console.error("Update question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update question" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { questionId } = body;
    const storage = getStorage();

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId" },
        { status: 400 },
      );
    }

    // Get existing job
    const job = await storage.getJob(jobId);
    if (!job) {
      return NextResponse.json(
        { success: false, error: "Job not found" },
        { status: 404 },
      );
    }

    // Filter out the deleted question
    const questionIndex = job.questions?.findIndex(q => q.id === questionId) ?? -1;
    if (questionIndex === -1) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

    const updatedQuestions = (job.questions || []).filter(q => q.id !== questionId);
    await storage.saveJob(jobId, { ...job, questions: updatedQuestions });

    return NextResponse.json(
      { success: true, data: { deleted: true } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete question error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete question" },
      { status: 500 },
    );
  }
}
