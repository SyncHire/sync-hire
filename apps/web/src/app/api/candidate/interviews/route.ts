/**
 * GET /api/candidate/interviews
 * Returns all interviews for the authenticated user
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const storage = getStorage();
    const interviews = await storage.getInterviewsForUser(session.user.id);

    return NextResponse.json({
      success: true,
      data: interviews,
    });
  } catch (error) {
    logger.error(error, { api: "candidate/interviews", operation: "GET" });
    return NextResponse.json(
      { success: false, error: "Failed to fetch interviews" },
      { status: 500 }
    );
  }
}
