/**
 * JSON Type Namespace for prisma-json-types-generator
 *
 * This file declares the types used in JSON fields in the Prisma schema.
 */

import type {
  AIEvaluation,
  ExtractedCVData,
  ExtractedJobData,
  InterviewQuestions,
} from '../src/json-types';

declare global {
  namespace PrismaJson {
    export type { AIEvaluation, ExtractedCVData, ExtractedJobData, InterviewQuestions };
  }
}
