/**
 * POST /api/jobs/extract-jd
 *
 * Handles file upload and AI extraction with intelligent caching.
 * Requires organizationId from frontend, validates user membership.
 */

import { type NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { prisma } from "@sync-hire/database";
import { JobDescriptionProcessor } from "@/lib/backend/jd-processor";
import { getStorage } from "@/lib/storage/storage-factory";
import { getCloudStorageProvider } from "@/lib/storage/cloud/storage-provider-factory";
import { requireAuth } from "@/lib/auth-server";
import { withRateLimit } from "@/lib/rate-limiter";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = session.user.id;

    // Rate limit check (expensive tier - PDF processing + AI extraction)
    const rateLimitResponse = await withRateLimit(request, "expensive", "jobs/extract-jd", userId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const organizationId = formData.get("organizationId") as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Validate user is a member of the organization
    const membership = await prisma.member.findFirst({
      where: {
        userId,
        organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json(
        { success: false, error: "You are not a member of this organization" },
        { status: 403 },
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
    const cloudStorage = getCloudStorageProvider();
    const processor = new JobDescriptionProcessor(storage, cloudStorage);

    const { hash, extractedData, aiSuggestions, aiQuestions, cached } =
      await processor.processFile(buffer, file.name, organizationId, userId);

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
    logger.error(error, { api: "jobs/extract-jd", operation: "extract" });
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
