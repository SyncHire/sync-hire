import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import type { ExtractedJobData, NodeEvaluationOutput } from "@sync-hire/shared";

// Define strict result types with evaluation metric
export interface ExtractionResult<T> {
  data: T;
  evaluation: NodeEvaluationOutput;
  // If we have an error, we store it here to handle partial failures
  error?: string;
}

export type Skill = string;
export interface Requirements {
  required: string[];
  preferred: string[];
}

// Helper: Simple "last-write-wins" reducer for state updates
const lastValue = <T>() => ({
  value: (_prev: T, next: T) => next,
});

export const JDExtractionState = Annotation.Root({
  // Input
  filePath: Annotation<string>,
  fileType: Annotation<string>,
  
  // Guided Extraction Hints (User-provided)
  hints: Annotation<Record<string, string>>({
    reducer: (curr, next) => ({ ...curr, ...next }),
    default: () => ({}),
  }),

  // Parsing Meta
  documentInfo: Annotation<{
    pageCount: number;
    isReadable: boolean;
  }>({
    ...lastValue<{ pageCount: number; isReadable: boolean }>(),
    default: () => ({ pageCount: 0, isReadable: false }),
  }),

  // Parallel Results (Partial Success supported)
  metadataResult: Annotation<ExtractionResult<Partial<ExtractedJobData>> | null>({
    ...lastValue<ExtractionResult<Partial<ExtractedJobData>> | null>(),
    default: () => null,
  }),
  skillsResult: Annotation<ExtractionResult<Skill[]> | null>({
    ...lastValue<ExtractionResult<Skill[]> | null>(),
    default: () => null,
  }),
  requirementsResult: Annotation<ExtractionResult<Requirements> | null>({
    ...lastValue<ExtractionResult<Requirements> | null>(),
    default: () => null,
  }),

  // Final Output
  jobData: Annotation<ExtractedJobData | null>({
    ...lastValue<ExtractedJobData | null>(),
    default: () => null,
  }),

  // Validation
  validation: Annotation<{
    isValid: boolean;
    issues: string[];
  }>({
    ...lastValue<{ isValid: boolean; issues: string[] }>(),
    default: () => ({ isValid: false, issues: [] }),
  }),

  // Messages for conversation/debugging history
  ...MessagesAnnotation.spec,
});

export type JDExtractionStateType = typeof JDExtractionState.State;
