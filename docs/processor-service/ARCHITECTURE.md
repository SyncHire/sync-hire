# SyncHire Project Architecture

## 1. Project Objective
SyncHire is an intelligent recruitment platform that separates **Job Description (JD)** processing into a dedicated, scalable **Node.js/Express Microservice** (`apps/processor`). This service leverages **LangGraph** and **Google Gemini 2.5** to extract structured data with high accuracy and low latency.

> [!NOTE]
> **CV Pipeline (Future)**: The architecture is designed to support CV extraction when implemented. The shared types and abstractions are already in place.

## 2. System Architecture

The system follows a modern **microservices** pattern within a **monorepo**.

```
      [User]
        │
        │ Upload File
        ▼
 [apps/web (Next.js)]
        │
        │ POST /api/documents/process
        ▼
 [apps/processor (Express.js)] ─────────► [ProcessingStore (In-Memory)]
        │                                         ▲
        │ Async Job                               │ Status Updates
        ▼                                         │
 [LangGraph Pipeline] ◄───────────────► [Google Gemini 2.5 (LLM)]
        │
        │ Webhook POST /api/webhooks/document-processed
        ▼
 [apps/web (Next.js)] ──► [Database]
```

## 3. Key Components

### 3.1. apps/processor (Node.js/Express)
The core processing unit.
-   **API Layer**: REST endpoints for document upload (`POST /process`) and status polling (`GET /status`).
-   **Orchestration**: Uses **LangGraph** to manage complex extraction flows.
-   **Parallel Processing**: Implements a "Parallel Worker" pattern where independent extraction tasks (e.g., Skills, Metadata) run concurrently to minimize latency.
-   **Relevance Scoring**: Every node performs self-reflection, returning a `relevanceScore` (0-1) and `groundingEvidence` (source quotes) to ensure hallucination-free output.
-   **Communication**: Asynchronous processing with **Webhook** callbacks to the web app.

### 3.2. apps/web (Next.js)
The user-facing application.
-   **Upload UI**: Drag-and-drop interface for JDs (PDF/TXT).
-   **Forwarding**: Proxies requests to the processor service.
-   **Webhook Handler**: Receives processed results (`POST /api/webhooks/document-processed`) and updates the local database.
-   **Review Dashboard**: Human-in-the-loop interface for reviewing low-confidence extractions.

### 3.3. packages/shared
Shared type definitions and utilities.
-   **Zod Schemas**: Single source of truth for `ExtractedJobData` and `ExtractedCVData`.
-   **Types**: `NodeEvaluationOutput`, `WebhookPayload`, `ProcessingStatus`.
-   **Utils**: Hashing functions for correlation IDs.

## 4. Processing Pipelines (LangGraph)

We use a **Parallel Worker** pattern to reduce latency from ~15s (sequential) to ~5s (parallel).

### 4.1. JD Extraction Pipeline
Extracts structured data from Job Descriptions.

```
[Start]
  │
  ▼
[DocumentParserNode]
  │
  ├──► [MetadataExtractorNode] ──┐
  │                              │
  ├──► [SkillExtractorNode] ─────┼──► [AggregatorNode] ──► [End / Review]
  │                              │
  └──► [RequirementsClassifier] ─┘
          (Parallel Execution)
```

-   **Input**: PDF, Text, Markdown.
-   **Constraint**: Full text context passed to all nodes (no section slicing).
-   **Validation**: Per-node retry loop if `relevanceScore < 0.7`.


## 5. Data Flow (Upload to Result)

### Happy Path Sequence

1.  **Upload**: User uploads a file via `apps/web` UI.
2.  **Submission**: `apps/web` validates the file and sends `POST /api/documents/process` to `apps/processor`.
3.  **Queueing**: `apps/processor` creates a job ID, sets status to `queued`, and immediately returns `202 Accepted` to `apps/web`.
4.  **Processing** (Async):
    *   `apps/processor` starts the LangGraph pipeline.
    *   **Parser Node** extracts raw text.
    *   **Extractor Nodes** (Parallel) call Gemini LLM to extract specific fields and self-evaluate confidence.
    *   **Aggregator Node** compiles results and runs final sanity checks.
5.  **Completion**:
    *   Job status updated to `completed` (or `needs_review`).
    *   `apps/processor` sends a webhook `POST` request to `apps/web/api/webhooks/document-processed`.
6.  **Persistence**: `apps/web` receives the webhook, verifies the payload, and saves the structured data.
7.  **Notification**: User is notified via UI (polling or websocket) that results are ready.

## 6. Technology Stack

-   **Runtime**: Node.js 20+
-   **Monorepo**: Turborepo + pnpm
-   **Frameworks**: Express.js (Processor), Next.js (Web)
-   **AI/LLM**: Google Gemini 2.5 Flash (via `@google/genai` and LangChain)
-   **Orchestration**: LangGraph.js
-   **Validation**: Zod
-   **Deployment**: Docker + Docker Compose

## 7. Configuration & Environment

**apps/processor/.env**:
```bash
PORT=3001
GEMINI_MODEL=gemini-2.5-flash
CONFIDENCE_THRESHOLD=0.75
MAX_FILE_SIZE_MB=10
```

**apps/web/.env.local**:
```bash
PROCESSOR_SERVICE_URL=http://localhost:3001
# Public URL for webhook callbacks
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```
