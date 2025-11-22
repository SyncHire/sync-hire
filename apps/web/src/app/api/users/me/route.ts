/**
 * GET /api/users/me
 *
 * Retrieves the current user (demo user for now)
 * In future: integrate with authentication system
 */

import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET() {
  try {
    const storage = getStorage();
    const user = await storage.getCurrentUser();

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch user",
      },
      { status: 500 },
    );
  }
}
