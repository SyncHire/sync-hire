/**
 * GET /api/candidate/cv
 *
 * Returns the current user's saved CV data if available.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET() {
  try {
    const storage = getStorage();
    const user = await storage.getCurrentUser();

    // Get user's linked CV ID
    const cvId = await storage.getUserCVId(user.id);

    if (!cvId) {
      return NextResponse.json(
        {
          success: true,
          data: null,
        },
        { status: 200 },
      );
    }

    // Get the CV extraction data
    const extractedData = await storage.getCVExtraction(cvId);

    if (!extractedData) {
      return NextResponse.json(
        {
          success: true,
          data: null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: cvId,
          extractedData,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(error, { api: "candidate/cv", operation: "get" });
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get user CV",
      },
      { status: 500 },
    );
  }
}
