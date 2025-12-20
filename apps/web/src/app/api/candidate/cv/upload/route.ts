/**
 * POST /api/candidate/cv/upload
 *
 * Handles CV file upload and AI extraction with intelligent caching.
 * Also links the CV to the current user for persistence.
 * Access: Authenticated candidates only
 */

import type { NextRequest } from "next/server";
import { errors, successResponse } from "@/lib/api-response";
import { getServerSession } from "@/lib/auth-server";
import { CVProcessor } from "@/lib/backend/cv-processor";
import { logger } from "@/lib/logger";
import { withRateLimit } from "@/lib/rate-limiter";
import { getCloudStorageProvider } from "@/lib/storage/cloud/storage-provider-factory";
import { getStorage } from "@/lib/storage/storage-factory";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession();
    if (!session?.user) {
      return errors.unauthorized();
    }

    // Rate limit check (expensive tier - PDF processing + AI extraction)
    const rateLimitResponse = await withRateLimit(
      request,
      "expensive",
      "candidate/cv/upload",
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return errors.badRequest("No file provided");
    }

    // Validate file type - only PDF is supported
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      return errors.validation("Unsupported file type", [
        { field: "file", message: "Only PDF files are accepted" },
      ]);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return errors.validation("File too large", [
        { field: "file", message: "File size exceeds 10MB limit" },
      ]);
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

    // Link CV to user if not already linked
    const existingCvId = await storage.getUserCVId(session.user.id);
    if (existingCvId !== hash) {
      await storage.saveUserCVId(session.user.id, hash);
      logger.info("CV linked to user", {
        api: "candidate/cv/upload",
        userId: session.user.id,
        cvId: hash,
      });
    }

    return successResponse({
      success: true,
      data: {
        id: hash,
        extractedData,
        cached,
      },
    });
  } catch (error) {
    logger.error(error, { api: "candidate/cv/upload", operation: "upload" });
    return errors.internal("Failed to extract CV data");
  }
}
