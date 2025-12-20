# Document Processor Service - Progress Tracker

## Overview
Separating JD processor from `apps/web/` into a dedicated Node.js API server with webhook communication and LangGraph-based extraction.

**Note:** This plan consolidates and supersedes the following files in the project root:
- `APPROACH_LANGGRAPH_STATE_MACHINE.md` - Architectural design (now integrated into phase docs)
- `LANGGRAPH_TYPESCRIPT_NODES.md` - Implementation reference (now integrated into Phase 3)
- `JD-PROCESSING.md` - Current state analysis (context captured in planning)

These files can be archived or removed once the implementation is complete.

> [!NOTE]
> **CV Pipeline (Future)**: The CV extraction pipeline is planned for future integration. The shared types and schemas are preserved in Phase 1 to facilitate reintegration with minimal changes.

## Quick Links
| Phase | Document | Status |
|-------|----------|--------|
| 1 | [Shared Package](./01-SHARED-PACKAGE.md) | ✅ Completed |
| 2 | [Processor Skeleton](./02-PROCESSOR-SKELETON.md) | ✅ Completed |
| 3 | [LangGraph JD Pipeline](./03-LANGGRAPH-JD-PIPELINE.md) | ✅ Completed |
| 4 | [API Endpoints](./04-API-ENDPOINTS.md) | ✅ Completed |
| 5 | [Next.js Integration](./05-NEXTJS-INTEGRATION.md) | Not Started |
| 6 | [Testing & Verification](./06-TESTING-VERIFICATION.md) | Not Started |
| 7 | [Docker & Deploy](./07-DOCKER-DEPLOY.md) | Not Started |

---

## Phase 1: Shared Package
**Goal:** Create `packages/shared/` with types, schemas, and utilities

### Base Tasks
| Task | Status | Notes |
|------|--------|-------|
| Create package structure | [x] | |
| Move ExtractedJobData type | [x] | |
| Move ExtractedCVData type | [x] | |
| Move enums (EmploymentType, WorkArrangement) | [x] | |
| Create Zod schemas for JD | [x] | |
| Create Zod schemas for CV | [x] | |
| Create webhook payload types | [x] | |
| Move hash-utils.ts | [x] | |
| Update pnpm-workspace.yaml | [x] | |
| Update apps/web imports | [x] | |

### Relevance Scoring Enhancements
| Task | Status | Notes |
|------|--------|-------|
| Add NodeEvaluationOutput type | [x] | Node output with relevance scores |
| Add UserFeedback type | [x] | Approve/edit/reject signals |
| Add NodeCalibration type | [x] | Feedback aggregation for calibration |
| Add CalibrationStorageInterface | [x] | Abstract for future DB migration |
| Create node-evaluation-schemas.ts | [x] | Merged into schemas.ts |
| Update index.ts exports | [x] | Export new types |

---

## Phase 2: Processor Skeleton
**Goal:** Create `apps/processor/` Express.js server structure

| Task | Status | Notes |
|------|--------|-------|
| Initialize package.json | [x] | |
| Create tsconfig.json | [x] | |
| Set up Express server | [x] | |
| Create config.ts | [x] | |
| Create health endpoint | [x] | |
| Set up multer for uploads | [x] | |
| Create error handler middleware | [x] | |
| Create logger utility | [x] | |
| Add to turbo.json | [x] | |
| Test server starts | [x] | |

---

## Phase 3: LangGraph JD Pipeline (Parallel Worker Pattern)
**Goal:** Implement parallel worker LangGraph pipeline for JD extraction (redesigned per architecture critique to eliminate sequential bottlenecks, remove harmful section slicing, add per-node self-validation, and achieve 60% latency reduction)

### Core Pipeline Implementation
| Task | Status | Notes |
|------|--------|-------|
| Update JDExtractionState (remove sections, add parallelResults) | [x] | Simplified state for parallel execution |
| Simplify pipeline config (remove section detector option) | [x] | DocumentParser, MetadataExtractor, SkillExtractor, RequirementsClassifier, Aggregator |
| Implement DocumentParserNode | [x] | Parse PDF/TXT, no section slicing |
| Implement MetadataExtractorNode (with self-reflect loop) | [x] | Full rawText input, inline validation + retry |
| Implement SkillExtractorNode (with self-reflect loop) | [x] | Full rawText input, inline validation + retry |
| Implement RequirementsClassifierNode (with self-reflect loop) | [x] | Full rawText input, inline validation + retry |
| Implement AggregatorNode with cross-field validation | [x] | Merge results, consistency checks, overall confidence |
| Create self-reflect.ts utility | [x] | NEW: Retry logic for low-confidence extractions |
| Update graph-builder.ts for parallel execution | [x] | Fan-out after Parser, fan-in before Aggregator |
| Test parallel execution | [x] | Verify metadata/skills/requirements run concurrently |
| Test end-to-end latency | [x] | Target ~5 seconds (3x improvement) |

### Relevance Scoring Enhancements
| Task | Status | Notes |
|------|--------|-------|
| Create node-evaluator.ts utility | [x] | Implemented as `self-reflect.ts` with `withRetry` |
| Add evaluationConfig to state | [ ] | Deferred: using hardcoded 0.7 threshold |
| Update all extractor nodes | [x] | All return `NodeEvaluationOutput` with 4 scores |
| Add groundingEvidence prompting | [x] | Prompts ask LLM to quote source text |
| Add inferredFields detection | [~] | Partial: LLM prompted but not stored separately |
| Implement confidence scoring | [x] | Aggregator calculates `overallConfidence` |
| Add node evaluation tests | [ ] | Deferred: no dedicated unit tests |

---

## Phase 4: API Endpoints
**Goal:** Implement REST API for document processing with evaluation & feedback

### Base Endpoints
| Task | Status | Notes |
|------|--------|-------|
| POST /api/documents/process | [x] | |
| GET /api/documents/:id/status | [x] | |
| Implement ProcessingJob Prisma model | [x] | PostgreSQL storage via Prisma |
| Implement webhook.service.ts | [x] | |
| Add retry logic for webhooks | [x] | |
| Add request validation | [x] | |
| Test with sample files | [x] | |

### Evaluation & Feedback Endpoints
> **Deferred to Phase 5:** These endpoints require the Review Dashboard (Phase 5) as consumer. Building API before UI risks premature design. Node evaluations are computed but not yet exposed via API.

| Task | Status | Notes |
|------|--------|-------|
| GET /api/documents/:id/nodes | [ ] | Deferred: needs dashboard consumer |
| POST /api/documents/:id/nodes/:nodeId/evaluate | [ ] | Deferred: needs feedback UI |
| GET /api/documents/:id/review-queue | [ ] | Deferred: needs dashboard |
| Create CalibrationService | [ ] | Deferred: needs feedback storage |
| Implement PrismaCalibrationStorage | [ ] | Deferred: schema not designed |
| Add calibration factory | [ ] | Deferred |
| Test evaluation endpoints | [ ] | Deferred |

---

## Phase 5: Next.js Integration
**Goal:** Connect Next.js app to processor service via webhooks with review dashboard

### Base Webhook Integration
| Task | Status | Notes |
|------|--------|-------|
| Create /api/webhooks/document-processed | [ ] | |
| Add processing status Prisma queries | [ ] | Use existing `Job.jdExtraction` |
| Implement via @sync-hire/database | [ ] | Prisma client integration |
| Modify /api/jobs/extract-jd | [ ] | |
| Modify /api/cv/extract | [ ] | |
| Add frontend polling logic | [ ] | |
| Test full flow | [ ] | |

### Review Dashboard & Feedback
| Task | Status | Notes |
|------|--------|-------|
| Update webhook payload | [ ] | Include nodeEvaluations + reviewRequired |
| Add feedback storage via Prisma | [ ] | UserFeedback model |
| Create review-queue endpoint | [ ] | Dashboard data source |
| Update webhook handler | [ ] | Store evaluations in PostgreSQL |
| Add getNodeFeedback method | [ ] | Retrieve user feedback |
| Add updateNodeCalibration method | [ ] | Store calibration data |
| Create review dashboard component | [ ] | Frontend UI |
| Add feedback submission | [ ] | Post feedback to API |

---

## Phase 6: Testing & Verification
**Goal:** Verify system stability, correctness, and performance

See [Testing & Verification Plan](./06-TESTING-VERIFICATION.md) for details.

---

## Phase 7: Docker & Deploy
**Goal:** Containerize and configure deployment

See [Docker & Deploy Plan](./07-DOCKER-DEPLOY.md) for details.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        apps/processor/                           │
│                     (Express.js + LangGraph)                     │
│                                                                  │
│  POST /api/documents/process  ──►  LangGraph Pipeline            │
│  GET  /api/documents/:id/status                                  │
│  GET  /health                                                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Webhook POST
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                          apps/web/                               │
│  POST /api/webhooks/document-processed  ◄── Receives results     │
│  POST /api/jobs/extract-jd  ──► Forwards to processor            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       packages/shared/                           │
│  Types, Zod schemas, Webhook payloads, hash-utils                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Decisions
- **Scope:** JD extraction only (CV pipeline planned for future)
- **Processing:** Direct (no queue), webhook callback
- **LangGraph:** Full 7-node pipeline with configurable node disabling
- **Types:** Shared package for type safety

---

## Environment Variables

**apps/processor/.env:**
```bash
PORT=3001
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
DATABASE_URL=postgresql://user:pass@localhost:5432/synchire
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=
CONFIDENCE_THRESHOLD=0.75
WEBHOOK_TIMEOUT_MS=30000
WEBHOOK_RETRY_ATTEMPTS=3
```

**apps/web/.env.local:**
```bash
PROCESSOR_SERVICE_URL=http://localhost:3001
```
