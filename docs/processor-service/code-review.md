# Code Review: Processor Service - Phase 3 Implementation

## Files Reviewed
- `apps/processor/src/langgraph/utils/gemini.ts` (new)
- `apps/processor/src/langgraph/nodes/aggregator.ts` (new)
- `apps/processor/src/langgraph/nodes/extractors/metadata.ts` (new)
- `apps/processor/src/langgraph/nodes/extractors/skills.ts` (new)
- `apps/processor/src/langgraph/nodes/extractors/requirements.ts` (new)
- `apps/processor/src/langgraph/nodes/extractors/index.ts` (new)
- `apps/processor/scripts/test-extractor.ts` (new)
- `apps/processor/src/langgraph/state.ts` (existing)
- `apps/processor/src/langgraph/utils/file-utils.ts` (existing)

---

## Critical Issues

### 1. Unsafe JSON Parsing Without Validation
**Files:** `metadata.ts:82`, `skills.ts:62`, `requirements.ts:59`

LLM responses are parsed with raw `JSON.parse()` without schema validation:
```typescript
const parsed = JSON.parse(responseText) as { ... };
```

**Risk:** LLM responses can be malformed, contain unexpected fields, or deviate from expected structure.

**Fix:** Use Zod schemas from `@sync-hire/shared` to validate:
```typescript
import { NodeEvaluationOutputSchema, ExtractedJobDataSchema } from "@sync-hire/shared";

const rawParsed = JSON.parse(responseText);
const parsed = z.object({
  data: ExtractedJobDataSchema.partial(),
  evaluation: NodeEvaluationOutputSchema,
}).parse(rawParsed);
```

---

### 2. LangChain Multimodal Message Format Incorrect
**Files:** `metadata.ts:63-70`, `skills.ts:45-52`, `requirements.ts:46-53`

The `image_url` format used:
```typescript
{
  type: "image_url",
  image_url: `data:${fileType};base64,${documentPart.inlineData.data}`,
}
```

**Issue:** `@langchain/google-genai` expects a different structure for inline data. The format `image_url: string` may not work correctly.

**Fix:** Use LangChain's proper format for Gemini multimodal:
```typescript
{
  type: "media",
  mimeType: fileType,
  data: documentPart.inlineData.data,
}
```
Or use the native Gemini SDK directly since `fileToGeminiPart` already produces the correct format.

---

### 3. Type Mismatch: Validation State Missing Fields
**File:** `aggregator.ts:72-78` and `state.ts:64-70`

The aggregator computes `overallConfidence` and `warnings` but the state type only stores:
```typescript
validation: Annotation<{
  isValid: boolean;
  issues: string[];
}>
```

**Fix:** Update state to match computed values:
```typescript
validation: Annotation<{
  isValid: boolean;
  overallConfidence: number;
  issues: string[];
  warnings: string[];
}>
```

---

## Medium Issues

### 4. Missing Self-Reflect Retry Loop
**Files:** All extractors

Per Phase 3 documentation:
> "Implement MetadataExtractorNode (with self-reflect loop)"
> "Validation: Per-node retry loop if relevanceScore < 0.7"

Current implementation has no retry logic for low-confidence extractions.

**Recommendation:** Add retry utility as specified in docs:
```typescript
// utils/self-reflect.ts
export async function withRetry<T>(
  extractFn: () => Promise<T>,
  getScore: (result: T) => number,
  maxRetries = 2,
  minScore = 0.7
): Promise<T> { ... }
```

---

### 5. Inconsistent Error Type Access
**Files:** `metadata.ts:108`, `skills.ts:88`, `requirements.ts:88`

```typescript
issues: [(error as Error).message],
error: (error as Error).message,
```

**Issue:** If `error` is not an `Error` instance (e.g., string thrown), this fails.

**Fix:** Use safe error extraction:
```typescript
const errorMessage = error instanceof Error ? error.message : String(error);
```

---

### 6. Skills Type Mismatch
**File:** `skills.ts:2`, `state.ts:12`

State defines `Skill = string`, but prompt asks for skill objects with metadata. The prompt requests:
```
"data": ["skill1", "skill2", ...]
```

This is correct, but the type aliasing is confusing. Consider using `string[]` directly or documenting the intent.

---

### 7. Aggregator Skills Mapping Logic
**File:** `aggregator.ts:36-42`

The experience/education extraction logic uses naive string matching:
```typescript
experience: requirementsResult?.data?.required?.find(r =>
  r.toLowerCase().includes("year") || r.toLowerCase().includes("experience")
),
```

**Issue:** Fragile pattern matching that may miss variations or match incorrectly.

**Recommendation:** Add fallback or improve matching logic. Consider extracting these as separate fields in the requirements prompt.

---

## Minor Issues

### 8. Test Script Type Coercion
**File:** `test-extractor.ts:33`

```typescript
const state = { ... } as unknown as JDExtractionStateType;
```

**Issue:** Unsafe double cast bypasses type checking.

**Fix:** Create a proper minimal state factory:
```typescript
function createMinimalState(filePath: string, fileType: string): JDExtractionStateType {
  return {
    filePath,
    fileType,
    hints: {},
    documentInfo: { pageCount: 0, isReadable: false },
    metadataResult: null,
    skillsResult: null,
    requirementsResult: null,
    jobData: null,
    validation: { isValid: false, issues: [] },
    messages: [],
  };
}
```

---

### 9. Missing Type Annotation in file-utils.ts
**File:** `file-utils.ts:26`

```typescript
if (!SUPPORTED_MIME_TYPES.includes(mimeType as any)) {
```

**Issue:** `as any` cast hides type safety.

**Fix:** Use proper type guard:
```typescript
function isSupportedMimeType(mime: string): mime is typeof SUPPORTED_MIME_TYPES[number] {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mime);
}
```

---

### 10. Logger Import Path Inconsistency
**Files:** Extractors use `../../../utils/logger.js`, aggregator uses `../../utils/logger.js`

This is correct given the directory structure, but could be fragile. Consider using path aliases.

---

## Positive Observations

1. **Clean separation of concerns**: Each extractor is focused on its task
2. **Partial failure support**: Error results allow pipeline to continue
3. **Temperature tuning per node**: Strict vs creative LLM modes per documentation
4. **Singleton pattern for LLM clients**: Efficient resource usage
5. **User hints support**: Implements "Guided Retry" from architecture

---

## Summary

| Severity | Count | Action Required |
|----------|-------|-----------------|
| Critical | 3 | Must fix before production |
| Medium | 4 | Should fix for reliability |
| Minor | 4 | Nice to have |

**Priority fixes:**
1. Add Zod validation after JSON.parse
2. Fix LangChain multimodal message format
3. Update validation state type to include all computed fields
