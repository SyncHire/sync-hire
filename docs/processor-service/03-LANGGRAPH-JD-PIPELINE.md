# Phase 3: LangGraph JD Pipeline (Decomposed Parallel Architecture)

## Goal
Implement a **production-ready, battle-tested** JD extraction pipeline using **LangGraph** and **Gemini Multimodal**. This design prioritizes reliability, partial failure handling, and observability over simplest-possible implementation.

## Prerequisites
- Phase 1 (Shared Package) completed
- Phase 2 (Processor Skeleton) completed

## Architecture Decisions (Post-Critique)

### 1. Decomposed Parallel Extraction
Instead of a "Master Node" (Monolith), we use **3 Specialized Nodes** in parallel.
- **Why:**
    - **Isolation:** If `SkillsExtractor` fails (timeout/safety), `Metadata` and `Requirements` still succeed.
    - **Tuning:** `Metadata` needs strictness (`temperature: 0`), `Skills` needs inference (`temperature: 0.4`).
    - **context:** Each node receives the **full document** (no slicing).

### 2. Direct Multimodal Input
- No `pdf-parse`.
- **Flow:** `File Path` → `DocumentLoader` → `Gemini Part` → `Extractor`.
- **State Optimization:** We store the **File Path** in the state, NOT the binary buffer. Nodes load the file on-demand. This prevents massive database bloat during checkpointing.

## Architecture Diagram

```
┌───────────────────────────────────────────────────────────────────────────────┐
│              LangGraph JD Pipeline (Decomposed Parallel)                      │
│                                                                               │
│                              ┌──────────────┐                                 │
│                              │   __START__  │                                 │
│                              └──────┬───────┘                                 │
│                                     │(filePath)                               │
│                                     ▼                                         │
│                    ┌────────────────────────────────────┐                     │
│                    │      DocumentLoaderNode            │                     │
│                    │  - Read file from disk             │                     │
│                    │  - Validate MIME / Sanitization    │                     │
│                    │  - Output: meta (page count, type) │                     │
│                    └──────────┬─────────────────────────┘                     │
│                               │                                               │
│         ┌─────────────────────┼─────────────────────┐                         │
│         │                     │                     │                         │
│         ▼                     ▼                     ▼                         │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                   │
│  │ Metadata       │  │ Skills         │  │ Requirements   │  ← PARALLEL       │
│  │ Extractor      │  │ Extractor      │  │ Classifier     │     (3 nodes)     │
│  │                │  │                │  │                │                   │
│  │ Temp: 0.0      │  │ Temp: 0.4      │  │ Temp: 0.0      │  Independent      │
│  │ Strict Schema  │  │ Inference      │  │ Classification │  Tuning           │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘                   │
│           │                   │                   │                           │
│           └───────────────────┼───────────────────┘                           │
│                               │                                               │
│                               ▼                                               │
│              ┌────────────────────────────────────┐                           │
│              │      AggregatorNode                │                           │
│              │  - Merge partial results           │                           │
│              │  - Cross-field validation          │                           │
│              │  - Calculate confidence            │                           │
│              └──────────┬─────────────────────────┘                           │
│                         │                                                     │
│                    ┌────┴─────┐                                               │
│               Valid│          │Low Confidence / Issues                        │
│                    ▼          ▼                                               │
│             ┌──────────┐  ┌──────────────────┐                                │
│             │ __END__  │  │  __INTERRUPT__   │ → Human Review (HITL)          │
│             │ Success  │  │  (checkpoint)    │                                │
│             └──────────┘  └──────────────────┘                                │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow & State

**Key Change:** State stores `filePath`, not `Buffer`.

```typescript
export const JDExtractionState = Annotation.Root({
  // Input (Reference only)
  filePath: Annotation<string>,
  fileType: Annotation<string>, // mime type

  // Parsing Meta
  documentInfo: Annotation<{
    pageCount: number;
    isReadable: boolean;
  }>({ default: () => ({ pageCount: 0, isReadable: false }) }),

  // Parallel Results (Partial Success supported)
  metadataResult: Annotation<ResultOrError<JobMetadata>>({ default: () => null }),
  skillsResult: Annotation<ResultOrError<Skill[]>>({ default: () => null }),
  requirementsResult: Annotation<ResultOrError<Requirements>>({ default: () => null }),

  // Final Output
  jobData: Annotation<ExtractedJobData>({ default: () => ({...}) }),
  
  // Validation
  validation: Annotation<ValidationStats>({ default: () => ({...}) }),
});
```

## Graph Logic: Idempotent Fan-Out

**The "Smart Router" Pattern:**
To support efficient retries (Partial Re-runs), the fan-out from `DocumentLoader` is **Conditional**.

```typescript
// Router Logic
(state) => {
  const nextNodes = [];
  
  // Only route to extractors that haven't produced a success result yet
  if (!state.metadataResult) nextNodes.push("metadataExtractor");
  if (!state.skillsResult) nextNodes.push("skillsExtractor");
  if (!state.requirementsResult) nextNodes.push("requirementsExtractor");
  
  // If e.g. only Skills is missing, we ONLY run Skills.
  return nextNodes.length > 0 ? nextNodes : ["aggregator"];
}
```

This allows the UI to:
1.  Pause at HITL.
2.  User sees: "Metadata OK, Skills BAD".
3.  User Action: "Retry Skills".
4.  Frontend: Clears `skillsResult` in state -> Resumes Graph.
5.  Graph: Router sees `skillsResult` is null, runs *only* `skillsExtractor`.

## Node Details

### 1. DocumentLoaderNode
**Input:** `filePath`
**Action:**
- Checks file existence/permissions.
- Reads first 1kb to validate MIME (don't rely on user input).
- **Does NOT** load full file into state.

### 2. Extractor Nodes (Metadata, Skills, Requirements)
**Input:** `filePath`, `userHints` (Optional)
**Action:**
- Reads file from disk.
- Converts to Gemini `Part` object.
- **Prompt:** "Extract... [User Hint: ${state.hints.skills}]"
- **Calls Gemini:** `generateContent([filePart, prompt])`.
- **Retry Logic:** Internal loop (simple) or Subgraph (complex).

### 5. AggregatorNode
**Action:**
- Checks `metadataResult`, `skillsResult`, `requirementsResult`.
- **Partial Failure Handling:** If `skillsResult` is Error, log warning but proceed with `jobData` (skills = []).
- Validates consistency.

## UX & API Patterns

### 1. Granular Progress Streaming
Since nodes run in parallel, the frontend can subscribe to graph events.
- **Event:** `on_node_start: "skillsExtractor"` -> UI shows "Extracting Skills..." spinner.
- **Event:** `on_node_end: "skillsExtractor"` -> UI shows "Skills Complete (Confidence 0.8)".

### 2. Confidence Heatmaps
The `NoteEvaluationOutput` is passed to the frontend.
- **Structure:** `{ score: 0.4, reasoning: "Job title mentions 'React' but requirements only list 'Angular'" }`.
- **UI:** Render a warning banner next to the specific field group explaining *why* confidence is low.

### 3. "Guided Retry" (User Hints)
If strict extraction fails, allow the user to provide a hint.
- **User Action:** Clicks "Retry" on Skills box, types: "It's in the 'Technical Stack' table".
- **Backend:** Injects `hints: { skills: "It's in the Technical Stack table" }` into state.
- **Effect:** The `SkillsExtractor` adds this hint to the system prompt, dramatically increasing success rate for edge cases.

## Deliverables

### Directory Structure
```
apps/processor/src/langgraph/
├── nodes/
│   ├── document-loader.ts
│   ├── extractors/
│   │   ├── metadata.ts
│   │   ├── skills.ts
│   │   └── requirements.ts
│   └── aggregator.ts
├── utils/
│   ├── gemini.ts           # Centralized Gemini client
│   └── file-utils.ts       # Helpers for file->Part conversion
├── state.ts
└── graph.ts
```

## Implementation Breakdown (Sub-Phases)

To ensure stability and testability, implementation is split into 3 logical layers.

### Phase 3.1: Foundation (Input Layer)
**Goal:** Establish state management and reliable file loading.
1.  **Dependencies:** Install `@langchain/langgraph`, `@langchain/core`, `@google/genai`.
2.  **State Schema:** Implement `JDExtractionState` in `state.ts` (with `hints` and Result fields).
3.  **File Utils:** Implement `fileToGeminiPart` in `utils/file-utils.ts`.
4.  **Loader Node:** Implement `documentLoaderNode` in `nodes/document-loader.ts`.
5.  **Verification:** Script to load a file and log the resulting Gemini Part stats.

### Phase 3.2: Intelligence (Compute Layer)
**Goal:** Implement specialized logic for all extraction aspects.
1.  **Gemini Client:** Centralize `callGemini` logic (retry/config) in `utils/gemini.ts`.
2.  **Node: Metadata:** Strict extraction (Temp 0).
3.  **Node: Skills:** Inference/Creative (Temp 0.4).
4.  **Node: Requirements:** Classification (Temp 0).
5.  **Node: Aggregator:** Logic to merge results and handle partials.
6.  **Verification:** Script to invoke each extractor independently.

### Phase 3.3: Orchestration (Control Layer)
**Goal:** Wire it all together with efficient routing.
1.  **Graph Builder:** Implement `graph.ts` with StateGraph and Checkpointer.
2.  **Idempotent Router:** Implement conditional edges for partial retries.
3.  **Index:** Export the runnable graph.
4.  **Verification:** Full pipeline test (Happy Path + Partial Failure + Retry).
