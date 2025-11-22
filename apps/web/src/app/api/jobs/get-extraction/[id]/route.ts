/**
 * GET /api/jobs/get-extraction/[id]
 *
 * Retrieves cached extraction data by hash ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "No ID provided" },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const extractedData = await storage.getExtraction(id);

    if (!extractedData) {
      return NextResponse.json(
        { success: false, error: "Extraction not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: extractedData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get extraction error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve extraction" },
      { status: 500 }
    );
  }
}
