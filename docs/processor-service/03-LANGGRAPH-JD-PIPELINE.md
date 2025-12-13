# Phase 3: LangGraph JD Pipeline (Redesigned - Parallel Worker Pattern)

## Goal
Implement a parallel worker LangGraph pipeline for JD extraction that addresses architecture critique concerns: eliminate sequential bottlenecks, remove harmful section slicing, add per-node self-validation, and achieve 60% latency reduction.

## Prerequisites
- Phase 1 (Shared Package) completed
- Phase 2 (Processor Skeleton) completed

## Architecture Critique Review

**Key Issues with Previous Design:**
- Sequential waterfall = 15s+ latency
- SectionDetector harmful = LLMs lose context
- End-of-pipeline validation = wastes compute on bad data
- 2023 mental model = doesn't leverage modern LLM capabilities

**This Design Fixes:**
- ✅ Parallel extraction nodes (latency = slowest node, ~5s)
- ✅ Full text context passed to all nodes
- ✅ Per-node self-validation with retry loops
- ✅ Merged validation into aggregator (fewer hops)
- ✅ Simplified state and graph

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                    LangGraph JD Pipeline (Parallel Worker)                    │
│                                                                                │
│                              ┌──────────────┐                                 │
│                              │   __START__  │                                 │
│                              └──────┬───────┘                                 │
│                                     │                                         │
│                                     ▼                                         │
│                    ┌────────────────────────────────────┐                     │
│                    │     DocumentParserNode             │                     │
│                    │  - Extract raw text from PDF/TXT   │                     │
│                    │  - Detect document type            │                     │
│                    │  - Assess text quality             │                     │
│                    └──────────┬────────────────────────┘                      │
│                               │                                               │
│         ┌─────────────────────┼─────────────────────┐                         │
│         │                     │                     │                         │
│         ▼                     ▼                     ▼                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                  │
│  │ Metadata       │  │ Skills         │  │ Requirements   │  ← PARALLEL       │
│  │ Extractor      │  │ Extractor      │  │ Classifier     │     (3 nodes)    │
│  │                │  │                │  │                │                  │
│  │ Input: rawText │  │ Input: rawText │  │ Input: rawText │  Full context    │
│  │                │  │                │  │                │  to each node    │
│  │ Self-Reflect:  │  │ Self-Reflect:  │  │ Self-Reflect:  │                  │
│  │ - LLM extracts │  │ - LLM extracts │  │ - LLM extracts │  Per-node        │
│  │ - Scores low?  │  │ - Scores low?  │  │ - Scores low?  │  validation      │
│  │ - Retry prompt │  │ - Retry prompt │  │ - Retry prompt │  + retry        │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘                  │
│           │                   │                   │                          │
│           └───────────────────┼───────────────────┘                          │
│                               │                                              │
│                               ▼                                              │
│              ┌────────────────────────────────────┐                          │
│              │      AggregatorNode                │                          │
│              │  - Merge all extractions           │                          │
│              │  - Cross-field validation          │                          │
│              │  - Consistency checks              │                          │
│              │  - Calculate overall confidence    │                          │
│              └──────────┬─────────────────────────┘                          │
│                         │                                                    │
│                    ┌────┴─────┐                                              │
│               Valid│           │Low Confidence / Issues                      │
│                    ▼           ▼                                             │
│             ┌──────────┐  ┌──────────────────┐                               │
│             │ __END__  │  │  __INTERRUPT__   │ → Human Review (HITL)        │
│             │ Success  │  │  (checkpoint)    │                              │
│             └──────────┘  └──────────────────┘                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Node Details

### Node 1: DocumentParserNode
**Purpose:** Extract text, detect format, assess quality

**Input:** `fileBuffer`, `mimeType`, `fileName`

**Output:** `rawText`, `documentType`, `pageCount`, `extractionConfidence`

**Key Logic:**
- Parse PDF/TXT/MD files
- Single extraction confidence score
- No section slicing

### Node 2: MetadataExtractorNode
**Purpose:** Extract job title, company, location, salary, employment type

**Input:** `rawText` (full document)

**Output:** `JobMetadata`, `relevanceScore`, `groundingEvidence`, `inferredFields`

**Self-Reflection Loop:**
```
1. Extract from full text
2. Score result (relevanceScore = 0.0 to 1.0)
3. If score < 0.7:
   - Retry with more specific prompting
   - Pick best attempt
4. Return with grounding evidence
```

**Executes in parallel with Skills and Requirements nodes**

### Node 3: SkillExtractorNode
**Purpose:** Extract technical, soft, and domain skills

**Input:** `rawText` (full document)

**Output:** `Skill[]`, `relevanceScore`, `groundingEvidence`, `inferredFields`

**Self-Reflection Loop:**
- Same as MetadataExtractor
- Identifies skill categories and proficiency levels
- Returns confidence scores per skill

**Executes in parallel with Metadata and Requirements nodes**

### Node 4: RequirementsClassifierNode
**Purpose:** Classify required vs preferred qualifications, education, certifications

**Input:** `rawText` (full document)

**Output:** `Requirements`, `relevanceScore`, `groundingEvidence`, `inferredFields`

**Self-Reflection Loop:**
- Same as MetadataExtractor
- Distinguishes required/preferred qualifications
- Infers experience requirements

**Executes in parallel with Metadata and Skills nodes**

### Node 5: AggregatorNode
**Purpose:** Merge results, validate consistency, calculate final confidence

**Input:** Results from all 3 parallel extractors

**Output:** Final `ExtractedJobData`, `validation`, `overallConfidence`

**Validation Logic:**
- Cross-field consistency (e.g., senior role should have experience requirement)
- Conflict detection (e.g., conflicting salary ranges)
- Overall confidence calculation
- Trigger human review if confidence < threshold

## Key Improvements Over Previous Design

| Aspect | Previous | New |
|--------|----------|-----|
| **Nodes** | 7 sequential | 5 total (3 parallel) |
| **Latency** | ~15s | ~5s (3x faster) |
| **Context** | Sliced (loses info) | Full text (complete context) |
| **Error Detection** | End-of-pipeline | Per-node immediate |
| **Failure Mode** | Cascading | Isolated, recoverable |

## Deliverables

### Directory Structure
```
apps/processor/src/langgraph/
├── state.ts                           # Updated JDExtractionState
├── config.ts                          # Pipeline configuration
├── graph-builder.ts                   # Parallel graph construction
├── nodes/
│   └── jd/
│       ├── index.ts                   # Node exports
│       ├── document-parser.ts          # Node 1: Parse document
│       ├── metadata-extractor.ts       # Node 2: Extract metadata (parallel)
│       ├── skill-extractor.ts          # Node 3: Extract skills (parallel)
│       ├── requirements-classifier.ts  # Node 4: Classify requirements (parallel)
│       └── aggregator.ts               # Node 5: Merge & validate
└── utils/
    ├── self-reflect.ts                # NEW: Self-reflection/retry utility
    ├── confidence-scoring.ts          # Confidence calculation
    └── text-quality.ts                # Text quality assessment
```

## Implementation Tasks

### 1. Update state.ts

**Remove:** `sections`, `sectionConfidence`

**Update:** State to track parallel results

```typescript
export const JDExtractionState = Annotation.Root({
  // Input
  fileBuffer: Annotation<Buffer>,
  fileName: Annotation<string>,
  mimeType: Annotation<string>,

  // Document parsing
  rawText: Annotation<string>({ default: () => "" }),
  documentType: Annotation<string>({ default: () => "" }),
  pageCount: Annotation<number>({ default: () => 1 }),
  extractionConfidence: Annotation<number>({ default: () => 0 }),

  // Parallel extraction results
  parallelResults: Annotation<{
    metadata?: { data: JobMetadata; evaluation: NodeEvaluationOutput };
    skills?: { data: Skill[]; evaluation: NodeEvaluationOutput };
    requirements?: { data: Requirements; evaluation: NodeEvaluationOutput };
  }>({ default: () => ({}) }),

  // Final aggregated result
  metadata: Annotation<JobMetadata>({ default: () => ({...}) }),
  skills: Annotation<Skill[]>({ default: () => [] }),
  requirements: Annotation<Requirements>({ default: () => ({...}) }),

  // Validation
  validation: Annotation<Validation>({ default: () => ({...}) }),
  overallConfidence: Annotation<number>({ default: () => 0 }),
  needsHumanReview: Annotation<boolean>({ default: () => false }),

  // Message history
  messages: Annotation<BaseMessage[]>({ reducer: messagesStateReducer, default: () => [] }),
});
```

### 2. Update config.ts

**Simplify:** Remove section detector option

```typescript
export interface PipelineConfig {
  nodes: {
    documentParser: boolean;      // Always true (required)
    metadataExtractor: boolean;   // Can disable
    skillExtractor: boolean;      // Can disable
    requirementsClassifier: boolean;  // Can disable
    aggregator: boolean;          // Always true (required)
  };
  confidenceThreshold: number;
  enableHumanReview: boolean;
}
```

### 3. Create self-reflect.ts utility

```typescript
// src/langgraph/utils/self-reflect.ts
export async function selfReflectAndRetry<T>(
  initialResult: {
    data: T;
    relevanceScore: number;
    groundingEvidence: string[];
    inferredFields: string[];
  },
  llm: ChatGoogleGenerativeAI,
  rawText: string,
  nodePrompt: string,
  maxRetries: number = 2
): Promise<typeof initialResult> {
  let currentResult = initialResult;
  let retryCount = 0;

  while (currentResult.relevanceScore < 0.7 && retryCount < maxRetries) {
    // Ask LLM to reconsider with feedback about low confidence
    const retryPrompt = `Previous extraction had low confidence (${currentResult.relevanceScore.toFixed(2)}).
Inferred fields: ${currentResult.inferredFields.join(", ")}

Please re-extract with these concerns in mind. Only include clearly visible information.

${nodePrompt}`;

    const retryResult = await llm.withStructuredOutput(/* schema */).invoke(retryPrompt);

    if (retryResult.relevanceScore > currentResult.relevanceScore) {
      currentResult = retryResult;
    }

    retryCount++;
  }

  return currentResult;
}
```

### 4. Update graph-builder.ts

```typescript
export function createJDExtractionGraph(config: PipelineConfig = defaultPipelineConfig) {
  const workflow = new StateGraph<JDExtractionStateType>({
    channels: JDExtractionState,
  });

  // Required nodes
  workflow.addNode("documentParser", nodes.documentParserNode);
  workflow.addNode("aggregator", nodes.aggregatorNode);

  // Optional parallel nodes
  if (config.nodes.metadataExtractor) {
    workflow.addNode("metadataExtractor", nodes.metadataExtractorNode);
  }
  if (config.nodes.skillExtractor) {
    workflow.addNode("skillExtractor", nodes.skillExtractorNode);
  }
  if (config.nodes.requirementsClassifier) {
    workflow.addNode("requirementsClassifier", nodes.requirementsClassifierNode);
  }

  // Serial: Parser → Parallel extractors
  workflow.addEdge("__start__", "documentParser");

  // Parallel fan-out
  if (config.nodes.metadataExtractor) {
    workflow.addEdge("documentParser", "metadataExtractor");
  }
  if (config.nodes.skillExtractor) {
    workflow.addEdge("documentParser", "skillExtractor");
  }
  if (config.nodes.requirementsClassifier) {
    workflow.addEdge("documentParser", "requirementsClassifier");
  }

  // Parallel fan-in to aggregator
  const extractorNodes = [
    config.nodes.metadataExtractor && "metadataExtractor",
    config.nodes.skillExtractor && "skillExtractor",
    config.nodes.requirementsClassifier && "requirementsClassifier",
  ].filter(Boolean);

  if (extractorNodes.length === 0) {
    workflow.addEdge("documentParser", "aggregator");
  } else {
    extractorNodes.forEach(node => {
      workflow.addEdge(node, "aggregator");
    });
  }

  // Aggregator → End or Interrupt
  workflow.addConditionalEdges(
    "aggregator",
    (state) => state.needsHumanReview && config.enableHumanReview ? "interrupt" : "end",
    { interrupt: END, end: END }
  );

  return workflow.compile({ checkpointer: new MemorySaver() });
}
```

### 5. Implement extraction nodes with self-reflection

Each node (metadata, skills, requirements) follows this pattern:

```typescript
export async function metadataExtractorNode(
  state: JDExtractionStateType,
  config?: RunnableConfig
): Promise<Partial<JDExtractionStateType>> {
  const { rawText } = state;

  // Initial extraction
  let result = await extractMetadata(rawText, llm);

  // Self-reflect and retry if needed
  result = await selfReflectAndRetry(result, llm, rawText, "Extract metadata...");

  // Create evaluation for tracking
  const nodeEval = createNodeEvaluation("metadata_extractor", "MetadataExtractor", result, metrics);

  return {
    parallelResults: {
      ...state.parallelResults,
      metadata: { data: result.data, evaluation: nodeEval },
    },
    metadata: result.data,
  };
}
```

### 6. Update AggregatorNode for cross-field validation

```typescript
export async function aggregatorNode(
  state: JDExtractionStateType
): Promise<Partial<JDExtractionStateType>> {
  const { metadata, skills, requirements, parallelResults } = state;

  // Merge results
  const merged = {
    metadata,
    skills,
    requirements,
  };

  // Cross-field validation
  const issues = validateConsistency(merged);
  const warnings = detectAnomalies(merged);

  // Calculate overall confidence
  const overallConfidence = calculateWeightedConfidence(
    parallelResults.metadata?.evaluation.confidenceScore || 0,
    parallelResults.skills?.evaluation.confidenceScore || 0,
    parallelResults.requirements?.evaluation.confidenceScore || 0
  );

  const needsReview = issues.length > 0 || overallConfidence < state.evaluationConfig.minRelevanceScore;

  return {
    validation: {
      isValid: issues.length === 0,
      issues,
      warnings,
      overallConfidence,
      fieldScores: {},
    },
    needsHumanReview: needsReview,
  };
}
```

## Performance Metrics

### Latency Comparison
- **Previous (Waterfall):** ~15 seconds (5 sequential calls @ ~3s each)
- **New (Parallel):** ~5 seconds (1 parser + 3 parallel @ ~3s each + 1 aggregator @ ~1s)
- **Improvement:** 3x faster ⚡

### Context Window Efficiency
- **Previous:** Documents sliced into sections → Information loss
- **New:** Full text to each node → Better accuracy

### Error Recovery
- **Previous:** Error at end of pipeline → Restart entire process
- **New:** Error caught immediately at node → Retry within node

## Testing

```typescript
describe("JD Extraction (Parallel)", () => {
  it("extracts metadata, skills, requirements in parallel", async () => {
    const result = await extractJobDescription(buffer, "sample.pdf", "application/pdf");
    expect(result.data.title).toBeTruthy();
    expect(result.data.requirements.length).toBeGreaterThan(0);
  });

  it("retries low-confidence extractions", async () => {
    // Test with ambiguous JD that triggers retry
    const result = await extractJobDescription(ambiguousBuffer, "ambiguous.pdf", "application/pdf");
    expect(result.validation.overallConfidence).toBeGreaterThan(0.5);
  });

  it("detects inconsistencies in aggregator", async () => {
    // Mock results with conflicting data
    const result = await extractJobDescription(conflictingBuffer, "conflicting.pdf", "application/pdf");
    expect(result.validation.issues.length).toBeGreaterThan(0);
  });
});
```

## Success Criteria
- [x] Architecture diagram updated (parallel design)
- [ ] SectionDetectorNode removed (no longer needed)
- [ ] ValidatorNode removed (merged into Aggregator)
- [ ] Parallel graph implemented in graph-builder.ts
- [ ] Self-reflection utility created
- [ ] Each extractor node has retry loop
- [ ] Full rawText passed to all extractors
- [ ] AggregatorNode implements cross-field validation
- [ ] Latency reduced to ~5 seconds
- [ ] Tests pass for parallel execution
- [ ] Human review triggers on low confidence
