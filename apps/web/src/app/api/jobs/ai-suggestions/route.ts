/**
 * POST /api/jobs/ai-suggestions
 *
 * Generates AI-powered suggestions for improving job descriptions
 */

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";
import { SuggestionProcessor } from "@/lib/backend/suggestion-processor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobDescription } = body;

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json(
        { success: false, error: "Job description text is required" },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const processor = new SuggestionProcessor(storage);

    const response = await processor.generateSuggestions(jobDescription);

    return NextResponse.json(
      { success: true, data: response },
      { status: 200 }
    );
  } catch (error) {
    console.error("AI suggestions error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate suggestions",
      },
      { status: 500 }
    );
  }
}
