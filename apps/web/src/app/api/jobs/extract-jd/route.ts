/**
 * POST /api/jobs/extract-jd
 *
 * Handles file upload and AI extraction with intelligent caching.
 */

import { type NextRequest, NextResponse } from "next/server";
import { JobDescriptionProcessor } from "@/lib/backend/jd-processor";
import { getStorage } from "@/lib/storage/storage-factory";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type - PDF and Markdown are supported
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isMarkdown = file.type === "text/markdown" || file.name.endsWith(".md");
    const isText = file.type === "text/plain" || file.name.endsWith(".txt");

    if (!isPdf && !isMarkdown && !isText) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. PDF, Markdown, and TXT files are accepted",
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Process file with extraction and caching
    const storage = getStorage();
    const processor = new JobDescriptionProcessor(storage);

    const { hash, extractedData, aiSuggestions, aiQuestions, cached } =
      await processor.processFile(buffer, file.name);

    return NextResponse.json(
      {
        success: true,
        data: {
          id: hash,
          extractedData,
          aiSuggestions,
          aiQuestions,
          cached,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Extract JD error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to extract job description",
      },
      { status: 500 },
    );
  }
}
