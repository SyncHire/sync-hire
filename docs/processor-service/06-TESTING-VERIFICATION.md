# Phase 6: Testing & Verification

## Goal
Verify system stability, correctness, and performance before deployment. Focus on validating the parallel architecture, latency improvements, and overall system integration.

## Prerequisites
- Phase 1-5 completed (Shared, Skeleton, Pipeline, API, Next.js)

## Deliverables

### Test Suites
- **Unit Tests:** Nodes (Parser, Extractors, Aggregator)
- **Integration Tests:** API Endpoints, Webhook Delivery
- **E2E Tests:** Full upload-to-result flow

### Verification Reports
- **Latency Report:** Comparison against sequential baseline
- **Quality Report:** Relevancy score distribution
- **Stability Report:** Error handling and retry logic validation

---

## Tasks

### 1. Unit Testing (Nodes)
| Task | Status | Notes |
|------|--------|-------|
| Test DocumentParserNode | [ ] | Verify text extraction from PDF/TXT |
| Test MetadataExtractorNode | [ ] | Verify extraction + self-reflection loop |
| Test SkillExtractorNode | [ ] | Verify parallel execution independence |
| Test RequirementsClassifierNode | [ ] | Verify classification logic |
| Test AggregatorNode | [ ] | Verify cross-field validation & scoring |
| Test Self-Reflection Utility | [ ] | Verify retry triggers on low score |

### 2. Integration Testing (API & Webhooks)
| Task | Status | Notes |
|------|--------|-------|
| Test POST /process validation | [ ] | File types, sizes, config |
| Test Webhook Retry Logic | [ ] | Simulate receiver downtime/failure |
| Test Processing Store | [ ] | Verify status updates (queued->processing->completed) |
| Test Evaluation Endpoints | [ ] | Verify feedback storage/retrieval |

### 3. Performance & Latency Verification
| Task | Status | Notes |
|------|--------|-------|
| Verify Parallel Execution | [ ] | Confirm nodes run concurrently (logs/trace) |
| Measure End-to-End Latency | [ ] | Target: ~5 seconds for standard JD |
| Stress Test (Light) | [ ] | 5 concurrent requests |

### 4. End-to-End System Test
| Task | Status | Notes |
|------|--------|-------|
| Full Flow: Upload -> Webhook -> DB | [ ] | From Next.js UI or API client |
| Error Handling Scenario | [ ] | Malformed PDF, Gemini API failure |
| Human Review Trigger | [ ] | Upload ambiguous JD, verify "needs_review" status |

---

## Test Scenarios

### Scenario A: Happy Path
1. Upload `java-senior-dev.pdf`.
2. Processor accepts (202).
3. Pipeline runs: Parser -> (Metadata, Skills, Req) -> Aggregator.
4. Webhook sent with `status: completed`.
5. Frontend displays parsed data.

### Scenario B: Low Confidence / Retry
1. Upload `ambiguous-job.txt` (sparse info).
2. Extractor nodes return low relevance.
3. Self-reflection loop triggers retry (up to 2x).
4. If still low, Aggregator marks `needs_review`.
5. Webhook sent with `status: needs_review`.

### Scenario C: System Failure
1. Upload corrupted PDF.
2. Parser fails.
3. Error captured, job status updated to `failed`.
4. Webhook sent with `status: failed`.

---

## Environment Variables for Testing

**apps/processor/.env.test:**
```bash
PORT=3002
GEMINI_API_KEY=your-test-key
GEMINI_MODEL=gemini-2.5-flash
CONFIDENCE_THRESHOLD=0.75
WEBHOOK_TIMEOUT_MS=1000
```
