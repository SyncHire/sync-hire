# Phase 5: Next.js Integration

## Goal
Connect the Next.js web app to the processor service via webhooks and update existing routes.

## Prerequisites
- Phase 1-4 completed (previous phases using new numbering)
- Processor service running on port 3001

## Deliverables

### New Files
```
apps/web/src/
├── app/api/
│   ├── webhooks/
│   │   └── document-processed/
│   │       └── route.ts            # Webhook handler
│   └── documents/
│       └── [id]/
│           └── status/
│               └── route.ts        # Status polling endpoint
└── lib/
    └── processor-client.ts         # Client for processor service
```

### Modified Files
```
apps/web/src/
├── app/api/
│   └── jobs/
│       └── extract-jd/
│           └── route.ts            # Forward to processor
└── lib/
    └── storage/
        ├── storage-interface.ts    # Add processing status methods
        └── file-storage.ts         # Implement new methods
```

> [!NOTE]
> **CV Extraction Route (Future)**: When CV pipeline is implemented, add a similar forwarding route at `app/api/cv/extract/route.ts`.

---

## Tasks

### 1. Add environment variable
**apps/web/.env.local:**
```bash
PROCESSOR_SERVICE_URL=http://localhost:3001
```

### 2. Create processor client
```typescript
// apps/web/src/lib/processor-client.ts
const PROCESSOR_URL = process.env.PROCESSOR_SERVICE_URL || "http://localhost:3001";

interface ProcessDocumentOptions {
  file: Buffer;
  fileName: string;
  mimeType: string;
  type: "jd" | "cv";
  correlationId?: string;
  disabledNodes?: string[];
}

interface ProcessDocumentResponse {
  success: boolean;
  processingId: string;
  status: string;
  message?: string;
}

export async function submitDocumentForProcessing(
  options: ProcessDocumentOptions
): Promise<ProcessDocumentResponse> {
  const formData = new FormData();

  // Convert Buffer to Blob for FormData
  const blob = new Blob([options.file], { type: options.mimeType });
  formData.append("file", blob, options.fileName);
  formData.append("type", options.type);

  // Use the app's public URL for webhook callback
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  formData.append("webhookUrl", `${baseUrl}/api/webhooks/document-processed`);

  if (options.correlationId) {
    formData.append("correlationId", options.correlationId);
  }

  if (options.disabledNodes) {
    formData.append("config", JSON.stringify({ disabledNodes: options.disabledNodes }));
  }

  const response = await fetch(`${PROCESSOR_URL}/api/documents/process`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to submit document");
  }

  return response.json();
}

export async function getProcessingStatus(processingId: string): Promise<{
  processingId: string;
  type: "jd" | "cv";
  status: string;
  progress?: {
    currentNode: string;
    completedNodes: string[];
    totalNodes: number;
  };
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
}> {
  const response = await fetch(`${PROCESSOR_URL}/api/documents/${processingId}/status`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "Failed to get status");
  }

  return response.json();
}
```

### 3. Update storage interface
```typescript
// apps/web/src/lib/storage/storage-interface.ts
// Add these methods to StorageInterface:

export interface ProcessingStatusRecord {
  processingId: string;
  type: "jd" | "cv";
  status: "queued" | "processing" | "completed" | "failed" | "needs_review";
  result?: unknown;
  error?: {
    code: string;
    message: string;
  };
  createdAt: string;
  completedAt?: string;
}

export interface StorageInterface {
  // ... existing methods ...

  /**
   * Get processing status by ID
   */
  getProcessingStatus(id: string): Promise<ProcessingStatusRecord | null>;

  /**
   * Save processing status
   */
  saveProcessingStatus(id: string, status: ProcessingStatusRecord): Promise<void>;

  /**
   * Get all processing jobs (for cleanup)
   */
  getAllProcessingStatuses(): Promise<ProcessingStatusRecord[]>;
}
```

### 4. Implement in FileStorage
```typescript
// apps/web/src/lib/storage/file-storage.ts
// Add to FileStorage class:

private readonly PROCESSING_DIR = path.join(DATA_DIR, "processing");

// In constructor, add:
await fs.mkdir(this.PROCESSING_DIR, { recursive: true });

async getProcessingStatus(id: string): Promise<ProcessingStatusRecord | null> {
  const filePath = path.join(this.PROCESSING_DIR, `${id}.json`);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async saveProcessingStatus(id: string, status: ProcessingStatusRecord): Promise<void> {
  const filePath = path.join(this.PROCESSING_DIR, `${id}.json`);
  await fs.writeFile(filePath, JSON.stringify(status, null, 2));
}

async getAllProcessingStatuses(): Promise<ProcessingStatusRecord[]> {
  try {
    const files = await fs.readdir(this.PROCESSING_DIR);
    const statuses: ProcessingStatusRecord[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await fs.readFile(path.join(this.PROCESSING_DIR, file), "utf-8");
        statuses.push(JSON.parse(content));
      }
    }

    return statuses;
  } catch {
    return [];
  }
}
```

### 5. Create webhook handler
```typescript
// apps/web/src/app/api/webhooks/document-processed/route.ts
import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";
import type { ExtractedJobData } from "@sync-hire/shared";
// Future: import type { ExtractedCVData } from "@sync-hire/shared";

interface WebhookPayload {
  processingId: string;
  correlationId?: string;
  type: "jd";  // Extensible: add "cv" when CV pipeline is implemented
  status: "completed" | "failed" | "needs_review";
  processedAt: string;
  processingDurationMs: number;
  result?: {
    hash: string;
    extractedData: ExtractedJobData;
    // Future: ExtractedJobData | ExtractedCVData when CV is added
    aiSuggestions?: Array<{ original: string; improved: string }>;
    aiQuestions?: Array<{ content: string; reason: string }>;
  };
  validation?: {
    isValid: boolean;
    overallConfidence: number;
    issues: string[];
    warnings: string[];
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export async function POST(request: Request) {
  try {
    const payload: WebhookPayload = await request.json();

    console.log("📥 Document processed webhook received:", {
      processingId: payload.processingId,
      type: payload.type,
      status: payload.status,
      durationMs: payload.processingDurationMs,
    });

    const storage = getStorage();

    // Save processing status for polling
    await storage.saveProcessingStatus(payload.processingId, {
      processingId: payload.processingId,
      type: payload.type,
      status: payload.status,
      result: payload.result,
      error: payload.error,
      createdAt: new Date().toISOString(),
      completedAt: payload.processedAt,
    });

    // If completed successfully, save extraction to main storage
    if (payload.status === "completed" && payload.result) {
      const { hash, extractedData } = payload.result;

      if (payload.type === "jd") {
        await storage.saveExtraction(hash, extractedData as ExtractedJobData);
        console.log("✅ JD extraction saved:", hash);
      }
      // Future: Add CV handling when CV pipeline is implemented
      // else if (payload.type === "cv") {
      //   await storage.saveCVExtraction(hash, extractedData as ExtractedCVData);
      // }
    }

    return NextResponse.json({
      received: true,
      processingId: payload.processingId,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
```

### 6. Create status polling endpoint
```typescript
// apps/web/src/app/api/documents/[id]/status/route.ts
import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage/storage-factory";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storage = getStorage();

    const status = await storage.getProcessingStatus(id);

    if (!status) {
      return NextResponse.json(
        { error: "Processing job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error getting processing status:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
```

### 7. Modify JD extraction route
```typescript
// apps/web/src/app/api/jobs/extract-jd/route.ts
import { NextResponse } from "next/server";
import { submitDocumentForProcessing } from "@/lib/processor-client";
import { getStorage } from "@/lib/storage/storage-factory";
import { generateFileHash } from "@sync-hire/shared";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "text/plain", "text/markdown"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: PDF, TXT, MD" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = generateFileHash(buffer);

    // Check cache first
    const storage = getStorage();
    const cached = await storage.getExtraction(hash);

    if (cached) {
      console.log("📦 Returning cached JD extraction:", hash);
      return NextResponse.json({
        id: hash,
        extractedData: cached,
        cached: true,
        status: "completed",
      });
    }

    // Submit to processor service
    const result = await submitDocumentForProcessing({
      file: buffer,
      fileName: file.name,
      mimeType: file.type,
      type: "jd",
      correlationId: hash,
    });

    // Save initial status for polling
    await storage.saveProcessingStatus(result.processingId, {
      processingId: result.processingId,
      type: "jd",
      status: "processing",
      createdAt: new Date().toISOString(),
    });

    // Return processing info for frontend to poll
    return NextResponse.json({
      id: hash,
      processingId: result.processingId,
      status: "processing",
      cached: false,
      message: "Document submitted for processing. Poll status endpoint for results.",
    });
  } catch (error) {
    console.error("Error in extract-jd:", error);
    return NextResponse.json(
      { error: "Failed to process job description" },
      { status: 500 }
    );
  }
}
```


> [!NOTE]
> **CV Extraction Route (Future)**: When CV pipeline is implemented, create a similar route at `apps/web/src/app/api/cv/extract/route.ts` following the same pattern as the JD extraction route above.

### 9. Update frontend to handle async processing

**Example hook for polling:**
```typescript
// apps/web/src/lib/hooks/use-document-processing.ts
import { useQuery } from "@tanstack/react-query";

interface ProcessingStatus {
  processingId: string;
  type: "jd" | "cv";
  status: "queued" | "processing" | "completed" | "failed" | "needs_review";
  result?: unknown;
  error?: { code: string; message: string };
}

export function useDocumentProcessing(processingId: string | null) {
  return useQuery<ProcessingStatus>({
    queryKey: ["/api/documents", processingId, "status"],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${processingId}/status`);
      if (!res.ok) throw new Error("Failed to get status");
      return res.json();
    },
    enabled: !!processingId,
    refetchInterval: (query) => {
      // Poll every 2 seconds while processing
      const status = query.state.data?.status;
      if (status === "processing" || status === "queued") {
        return 2000;
      }
      return false; // Stop polling when done
    },
  });
}
```

---

## Testing

```bash
# 1. Start processor service
cd apps/processor && pnpm dev

# 2. Start web app
cd apps/web && pnpm dev

# 3. Upload a JD file through the UI or API
curl -X POST http://localhost:3000/api/jobs/extract-jd \
  -F "file=@./sample-jd.pdf"

# Response will include processingId

# 4. Poll status
curl http://localhost:3000/api/documents/{processingId}/status

# 5. Check webhook was received (see web app logs)
```

---

## Success Criteria
- [ ] JD extraction forwards to processor service
- [ ] Webhook handler receives and saves results
- [ ] Status polling endpoint works
- [ ] Cached extractions return immediately
- [ ] Frontend can poll for async results
- [ ] Errors are handled gracefully
