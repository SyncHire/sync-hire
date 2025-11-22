/**
 * POST /api/jobs/create
 *
 * Creates a new job posting with extracted data and custom questions
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createJob,
  createCustomQuestion,
  createJobDescriptionVersion,
} from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";
import type { Job, CustomQuestion, ExtractedJobData } from "@/lib/mock-data";

interface CreateJobRequest {
  title: string;
  description: string;
  location: string;
  employmentType: string;
  requirements: string[];
  responsibilities: string[];
  seniority: string;
  company?: string;
  department?: string;
  salary?: string;
  customQuestions?: Array<{
    type: "SHORT_ANSWER" | "LONG_ANSWER" | "MULTIPLE_CHOICE" | "SCORED";
    content: string;
    required: boolean;
    order: number;
    options?: string[];
    scoringConfig?: { type: string; min: number; max: number };
  }>;
  extractionHash?: string;
  originalJDText?: string;
  employerId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateJobRequest;

    // Validate required fields
    if (!body.title || !body.description || !body.location) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, description, location" },
        { status: 400 }
      );
    }

    // Create the job
    const job = createJob({
      title: body.title,
      description: body.description,
      location: body.location,
      type: body.employmentType || "Full-time",
      requirements: body.requirements || [],
      company: body.company || "Company",
      department: body.department || "Engineering",
      salary: body.salary || "",
      employerId: body.employerId || "employer-1",
      status: "ACTIVE",
    } as Partial<Job>);

    // Create custom questions if provided
    const questions: CustomQuestion[] = [];
    if (body.customQuestions && body.customQuestions.length > 0) {
      for (const q of body.customQuestions) {
        const question = createCustomQuestion(
          job.id,
          q.type,
          q.content,
          q.order,
          q.required,
          q.options,
          q.scoringConfig
        );
        questions.push(question);
      }
    }

    // Create JD version with extraction data
    if (body.originalJDText) {
      const extractedData: ExtractedJobData = {
        title: body.title,
        company: body.company || "Company",
        responsibilities: body.responsibilities || [],
        requirements: body.requirements || [],
        seniority: body.seniority || "",
        location: body.location,
        employmentType: body.employmentType || "Full-time",
      };

      createJobDescriptionVersion(
        job.id,
        body.originalJDText,
        extractedData,
        undefined
      );
    }

    // Persist job to file storage
    const storage = getStorage();
    await storage.saveJob(job.id, job);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: job.id,
          title: job.title,
          location: job.location,
          customQuestionsCount: questions.length,
          status: job.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create job",
      },
      { status: 500 }
    );
  }
}
