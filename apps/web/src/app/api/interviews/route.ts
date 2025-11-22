/**
 * GET /api/interviews
 *
 * Retrieves all interviews from storage (file + mock data merged)
 * Optional query param: userId - filter interviews for a specific user
 */

import { type NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(request: NextRequest) {
  try {
    const storage = getStorage();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    let interviews;
    if (userId) {
      interviews = await storage.getInterviewsForUser(userId);
    } else {
      interviews = await storage.getAllInterviews();
    }

    return NextResponse.json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    console.error("Failed to fetch interviews:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch interviews",
      },
      { status: 500 },
    );
  }
}
