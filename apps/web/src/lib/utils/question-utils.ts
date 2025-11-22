/**
 * Utility functions for handling interview questions
 */

import type { Question, InterviewStage } from "@/lib/mock-data";
import type { InterviewQuestions } from "@/lib/storage/storage-interface";

/**
 * Map question category to interview stage
 */
function mapCategoryToStage(category?: string): InterviewStage {
  switch (category) {
    case "technical":
      return "Technical Skills";
    case "behavioral":
      return "Behavioral";
    case "problem-solving":
      return "Problem Solving";
    case "experience":
      return "Introduction";
    default:
      return "Technical Skills";
  }
}

/**
 * Merge interview questions from storage format to UI format
 * Combines customQuestions (from JD) and suggestedQuestions (AI-personalized)
 * Sorts custom questions by their order field
 *
 * @param questionSet - InterviewQuestions from storage
 * @returns Question[] - Merged and formatted questions for UI
 */
export function mergeInterviewQuestions(
  questionSet: InterviewQuestions,
): Question[] {
  // Custom questions from job description (kept from JD)
  // Sort by order field, then convert to UI format
  const sortedCustomQuestions = [...(questionSet.customQuestions || [])].sort(
    (a, b) => a.order - b.order,
  );

  const customQs = sortedCustomQuestions.map((q, index) => ({
    id: q.id || `custom-q-${index}`,
    text: q.content,
    type: "video" as const,
    duration: 3,
    category: "Technical Skills" as InterviewStage,
    keyPoints: [] as string[],
  }));

  // AI-suggested questions (personalized based on CV gaps)
  const suggestedQs = (questionSet.suggestedQuestions || []).map((q, index) => ({
    id: `suggested-q-${index}`,
    text: q.content,
    type: "video" as const,
    duration: 3,
    category: mapCategoryToStage(q.category),
    keyPoints: q.reason ? [q.reason] : [],
  }));

  // Merge: custom questions first (from job), then AI-personalized questions
  return [...customQs, ...suggestedQs];
}
