/**
 * POST /api/jobs/create
 *
 * Creates a new job posting with extracted data and custom questions
 */

import { type NextRequest, NextResponse } from "next/server";
import type { ExtractedJobData, Job } from "@/lib/mock-data";
import {
  createJob,
  createJobDescriptionVersion,
} from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";

interface CreateJobRequest {
  title: string;
  description: string;
  location: string;
  employmentType: string;
  workArrangement?: string;
  requirements: string[];
  responsibilities: string[];
  seniority: string;
  company?: string;
  department?: string;
  salary?: string;
  customQuestions?: Array<{
    text: string;
    type: "text" | "video" | "code";
    duration: number;
    order: number;
    source?: "ai" | "custom";
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
        {
          success: false,
          error: "Missing required fields: title, description, location",
        },
        { status: 400 },
      );
    }

    // Build questions array from customQuestions
    const questions = (body.customQuestions || []).map((q, index) => ({
      id: `q-${Date.now()}-${index}`,
      text: q.text,
      type: q.type || "text",
      duration: q.duration || 2,
    }));

    // Create the job with questions
    const job = createJob({
      title: body.title,
      description: body.description,
      location: body.location,
      type: body.employmentType || "Not specified",
      workArrangement: body.workArrangement || "Not specified",
      requirements: body.requirements || [],
      company: body.company || "Company",
      department: body.department || "Engineering",
      salary: body.salary || "",
      employerId: body.employerId || "employer-1",
      status: "ACTIVE",
      questions: questions,
    } as Partial<Job>);

    // Create JD version with extraction data
    if (body.originalJDText) {
      const extractedData: ExtractedJobData = {
        title: body.title,
        company: body.company || "Company",
        responsibilities: body.responsibilities || [],
        requirements: body.requirements || [],
        seniority: body.seniority || "",
        location: body.location,
        employmentType: (body.employmentType || "Not specified") as ExtractedJobData["employmentType"],
        workArrangement: (body.workArrangement || "Not specified") as ExtractedJobData["workArrangement"],
      };

      createJobDescriptionVersion(
        job.id,
        body.originalJDText,
        extractedData,
        undefined,
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
      { status: 201 },
    );
  } catch (error) {
    console.error("Create job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create job",
      },
      { status: 500 },
    );
  }
}
