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
| 1 | [Shared Package](./01-SHARED-PACKAGE.md) | Completed |
| 2 | [Processor Skeleton](./02-PROCESSOR-SKELETON.md) | Not Started |
| 3 | [LangGraph JD Pipeline](./03-LANGGRAPH-JD-PIPELINE.md) | Not Started |
| 4 | [API Endpoints](./04-API-ENDPOINTS.md) | Not Started |
| 5 | [Next.js Integration](./05-NEXTJS-INTEGRATION.md) | Not Started |
| 6 | [Testing & Verification](./06-TESTING-VERIFICATION.md) | Not Started |
| 7 | [Docker & Deploy](./07-DOCKER-DEPLOY.md) | Not Started |

---

## Phase 1: Shared Package
**Goal:** Create `packages/shared/` with types, schemas, and utilities

### Base Tasks
| Task | Status | Notes |
|------|--------|-------|
| Create package structure | [ ] | |
| Move ExtractedJobData type | [ ] | |
| Move ExtractedCVData type | [ ] | |
| Move enums (EmploymentType, WorkArrangement) | [ ] | |
| Create Zod schemas for JD | [ ] | |
| Create Zod schemas for CV | [ ] | |
| Create webhook payload types | [ ] | |
| Move hash-utils.ts | [ ] | |
| Update pnpm-workspace.yaml | [ ] | |
| Update apps/web imports | [ ] | |

### Relevance Scoring Enhancements
| Task | Status | Notes |
|------|--------|-------|
| Add NodeEvaluationOutput type | [ ] | Node output with relevance scores |
| Add UserFeedback type | [ ] | Approve/edit/reject signals |
| Add NodeCalibration type | [ ] | Feedback aggregation for calibration |
| Add CalibrationStorageInterface | [ ] | Abstract for future DB migration |
| Create node-evaluation-schemas.ts | [ ] | Zod validation schemas |
| Update index.ts exports | [ ] | Export new types |

---

## Phase 2: Processor Skeleton
**Goal:** Create `apps/processor/` Express.js server structure

| Task | Status | Notes |
|------|--------|-------|
| Initialize package.json | [ ] | |
| Create tsconfig.json | [ ] | |
| Set up Express server | [ ] | |
| Create config.ts | [ ] | |
| Create health endpoint | [ ] | |
| Set up multer for uploads | [ ] | |
| Create error handler middleware | [ ] | |
| Create logger utility | [ ] | |
| Add to turbo.json | [ ] | |
| Test server starts | [ ] | |

---

## Phase 3: LangGraph JD Pipeline (Parallel Worker Pattern)
**Goal:** Implement parallel worker LangGraph pipeline for JD extraction (redesigned per architecture critique to eliminate sequential bottlenecks, remove harmful section slicing, add per-node self-validation, and achieve 60% latency reduction)

### Core Pipeline Implementation
| Task | Status | Notes |
|------|--------|-------|
| Update JDExtractionState (remove sections, add parallelResults) | [ ] | Simplified state for parallel execution |
| Simplify pipeline config (remove section detector option) | [ ] | DocumentParser, MetadataExtractor, SkillExtractor, RequirementsClassifier, Aggregator |
| Implement DocumentParserNode | [ ] | Parse PDF/TXT, no section slicing |
| Implement MetadataExtractorNode (with self-reflect loop) | [ ] | Full rawText input, inline validation + retry |
| Implement SkillExtractorNode (with self-reflect loop) | [ ] | Full rawText input, inline validation + retry |
| Implement RequirementsClassifierNode (with self-reflect loop) | [ ] | Full rawText input, inline validation + retry |
| Implement AggregatorNode with cross-field validation | [ ] | Merge results, consistency checks, overall confidence |
| Create self-reflect.ts utility | [ ] | NEW: Retry logic for low-confidence extractions |
| Update graph-builder.ts for parallel execution | [ ] | Fan-out after Parser, fan-in before Aggregator |
| Test parallel execution | [ ] | Verify metadata/skills/requirements run concurrently |
| Test end-to-end latency | [ ] | Target ~5 seconds (3x improvement) |

### Relevance Scoring Enhancements
| Task | Status | Notes |
|------|--------|-------|
| Create node-evaluator.ts utility | [ ] | Standardized evaluation formatting |
| Add evaluationConfig to state | [ ] | Min relevance score threshold |
| Update all extractor nodes | [ ] | Add relevanceScore to LLM schema |
| Add groundingEvidence prompting | [ ] | Quote extraction from source |
| Add inferredFields detection | [ ] | Track guessed vs extracted fields |
| Implement confidence scoring | [ ] | Weighted aggregate calculation |
| Add node evaluation tests | [ ] | Test relevance score output |

---

## Phase 4: API Endpoints
**Goal:** Implement REST API for document processing with evaluation & feedback

### Base Endpoints
| Task | Status | Notes |
|------|--------|-------|
| POST /api/documents/process | [ ] | |
| GET /api/documents/:id/status | [ ] | |
| Create in-memory status store | [ ] | |
| Implement webhook.service.ts | [ ] | |
| Add retry logic for webhooks | [ ] | |
| Add request validation | [ ] | |
| Test with sample files | [ ] | |

### Evaluation & Feedback Endpoints
| Task | Status | Notes |
|------|--------|-------|
| GET /api/documents/:id/nodes | [ ] | Return all node evaluations |
| POST /api/documents/:id/nodes/:nodeId/evaluate | [ ] | Accept user feedback |
| GET /api/documents/:id/review-queue | [ ] | List nodes needing review |
| Create CalibrationService | [ ] | Handle feedback + calibration |
| Implement FileCalibrationStorage | [ ] | File-based storage for calibration |
| Add calibration factory | [ ] | Allow future DB migration |
| Test evaluation endpoints | [ ] | Verify feedback storage |

---

## Phase 5: Next.js Integration
**Goal:** Connect Next.js app to processor service via webhooks with review dashboard

### Base Webhook Integration
| Task | Status | Notes |
|------|--------|-------|
| Create /api/webhooks/document-processed | [ ] | |
| Add processing status to StorageInterface | [ ] | |
| Implement in FileStorage | [ ] | |
| Modify /api/jobs/extract-jd | [ ] | |
| Modify /api/cv/extract | [ ] | |
| Add frontend polling logic | [ ] | |
| Test full flow | [ ] | |

### Review Dashboard & Feedback
| Task | Status | Notes |
|------|--------|-------|
| Update webhook payload | [ ] | Include nodeEvaluations + reviewRequired |
| Add feedback storage methods | [ ] | StorageInterface updates |
| Create review-queue endpoint | [ ] | Dashboard data source |
| Update webhook handler | [ ] | Store node evaluations + status |
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
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=
CONFIDENCE_THRESHOLD=0.75
```

**apps/web/.env.local:**
```bash
PROCESSOR_SERVICE_URL=http://localhost:3001
```
