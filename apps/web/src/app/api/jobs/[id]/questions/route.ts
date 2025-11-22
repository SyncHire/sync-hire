/**
 * API for job custom questions CRUD
 * GET - Get all questions for a job
 * POST - Add a new question
 * PUT - Update question order OR bulk update all interview questions
 * DELETE - Delete a specific question
 */

import { type NextRequest, NextResponse } from "next/server";
import type { QuestionType } from "@/lib/mock-data";
import {
  createCustomQuestion,
  deleteCustomQuestion,
  getCustomQuestionsByJobId,
  updateCustomQuestion,
} from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const questions = getCustomQuestionsByJobId(id);

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
    const { id } = await params;
    const body = await request.json();

    const { type, content, order, required, options, scoringConfig } = body;

    if (!type || !content) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: type, content" },
        { status: 400 },
      );
    }

    const question = createCustomQuestion(
      id,
      type as QuestionType,
      content,
      order || 0,
      required || false,
      options,
      scoringConfig,
    );

    return NextResponse.json(
      { success: true, data: question },
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

    // Check if this is a bulk update (questions array provided)
    if (body.questions && Array.isArray(body.questions)) {
      const storage = getStorage();

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
        questions: body.questions.map((q: { id: string; text: string; type?: string; duration?: number }) => ({
          id: q.id,
          text: q.text,
          type: q.type || "text",
          duration: q.duration || 2,
          category: "Technical Skills" as const,
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

    // Single question update (legacy behavior)
    const { questionId, updates } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId or questions array" },
        { status: 400 },
      );
    }

    const updated = updateCustomQuestion(questionId, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
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
    const body = await request.json();
    const { questionId } = body;

    if (!questionId) {
      return NextResponse.json(
        { success: false, error: "Missing questionId" },
        { status: 400 },
      );
    }

    const deleted = deleteCustomQuestion(questionId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Question not found" },
        { status: 404 },
      );
    }

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
