/**
 * GET /api/jobs/get-extraction/[id]
 *
 * Retrieves cached extraction data by hash ID
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "No ID provided" },
        { status: 400 },
      );
    }

    const storage = getStorage();
    const extractedData = await storage.getExtraction(id);

    if (!extractedData) {
      return NextResponse.json(
        { success: false, error: "Extraction not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: extractedData },
      { status: 200 },
    );
  } catch (error) {
    logger.error(error, { api: "jobs/get-extraction/[id]", operation: "get" });
    return NextResponse.json(
      { success: false, error: "Failed to retrieve extraction" },
      { status: 500 },
    );
  }
}
