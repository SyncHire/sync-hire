/**
 * POST /api/cv/extract
 *
 * Handles CV file upload and AI extraction with intelligent caching.
 * Also links the CV to the current user for persistence.
 */

import { type NextRequest, NextResponse } from "next/server";
import { CVProcessor } from "@/lib/backend/cv-processor";
import { getStorage } from "@/lib/storage/storage-factory";
import { getCloudStorageProvider } from "@/lib/storage/cloud/storage-provider-factory";

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

    // Validate file type - only PDF is supported
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unsupported file type. Only PDF files are accepted",
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
    const cloudStorage = getCloudStorageProvider();
    const processor = new CVProcessor(storage, cloudStorage);

    const { hash, extractedData, cached } = await processor.processFile(
      buffer,
      file.name,
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          id: hash,
          extractedData,
          cached,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Extract CV error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to extract CV data",
      },
      { status: 500 },
    );
  }
}
