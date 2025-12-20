/**
 * Test script for Phase 4: API Endpoints
 * 
 * Tests the full HTTP API flow:
 * 1. POST /api/documents/process - Submit a file
 * 2. GET /api/documents/:id/status - Poll for completion
 * 
 * Usage:
 *   pnpm --filter @sync-hire/processor exec tsx scripts/test-api.ts [file-path]
 * 
 * Examples:
 *   pnpm --filter @sync-hire/processor exec tsx scripts/test-api.ts sample-jd/test-role.txt
 */

import path from "path";
import fs from "fs";

const API_BASE = "http://localhost:3001";
const WEBHOOK_URL = "https://httpbin.org/post"; // Echo service for testing

interface ProcessResponse {
  success: boolean;
  processingId: string;
  status: string;
  message: string;
}

interface StatusResponse {
  processingId: string;
  type: string;
  status: string;
  progress?: unknown;
  result?: unknown;
  error?: unknown;
  timestamps: {
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
  };
}

async function submitDocument(filePath: string): Promise<ProcessResponse> {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const fileName = path.basename(absolutePath);
  
  // Detect MIME type
  const ext = path.extname(absolutePath).toLowerCase();
  let mimeType = "application/pdf";
  if (ext === ".txt") mimeType = "text/plain";
  if (ext === ".md") mimeType = "text/markdown";
  if (ext === ".png") mimeType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";

  // Build FormData
  const formData = new FormData();
  formData.append("file", new Blob([fileBuffer], { type: mimeType }), fileName);
  formData.append("type", "jd");
  formData.append("webhookUrl", WEBHOOK_URL);
  formData.append("correlationId", `test-${Date.now()}`);

  console.log(`📤 Submitting: ${fileName} (${mimeType})`);
  
  const response = await fetch(`${API_BASE}/api/documents/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Submit failed: ${JSON.stringify(error)}`);
  }

  return response.json();
}

async function pollStatus(processingId: string, maxWaitMs = 60000): Promise<StatusResponse> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${API_BASE}/api/documents/${processingId}/status`);
    
    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    const status: StatusResponse = await response.json();
    
    console.log(`⏳ Status: ${status.status}`);
    
    if (status.status === "completed" || status.status === "failed" || status.status === "needs_review") {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for processing to complete`);
}

async function main() {
  const targetFile = process.argv[2] || "sample-jd/test-role.txt";

  console.log("\n🧪 Phase 4 API Test\n");
  console.log("=".repeat(50));

  try {
    // Step 1: Submit document
    console.log("\n📋 Step 1: Submit Document\n");
    const submitResult = await submitDocument(targetFile);
    console.log(`✅ Submitted! processingId: ${submitResult.processingId}`);
    console.log(`   Message: ${submitResult.message}\n`);

    // Step 2: Poll for completion
    console.log("📋 Step 2: Poll for Completion\n");
    const finalStatus = await pollStatus(submitResult.processingId);

    console.log("\n" + "=".repeat(50));
    console.log("\n📊 Final Result:\n");
    
    console.log(`Status: ${finalStatus.status}`);
    console.log(`Duration: ${
      finalStatus.timestamps.completedAt && finalStatus.timestamps.startedAt
        ? `${(new Date(finalStatus.timestamps.completedAt).getTime() - new Date(finalStatus.timestamps.startedAt).getTime())}ms`
        : "N/A"
    }`);

    if (finalStatus.result) {
      console.log("\n📄 Extracted Data:");
      console.log(JSON.stringify(finalStatus.result, null, 2));
    }

    if (finalStatus.error) {
      console.log("\n❌ Error:");
      console.log(JSON.stringify(finalStatus.error, null, 2));
    }

    console.log("\n✅ Phase 4 API Test Passed!\n");
  } catch (error) {
    console.error("\n❌ Test Failed:", error);
    process.exit(1);
  }
}

main();
