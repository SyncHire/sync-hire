/**
 * Interview Room Page
 * Dynamic route for interview sessions: /interview/[id]
 * Supports both mock interview IDs (interview-1) and application IDs (application-job-5-demo-user)
 */

import { notFound } from "next/navigation";
import { InterviewRoom } from "@/components/InterviewRoom";
import { StreamVideoProvider } from "@/components/StreamVideoProvider";
import {
  getDemoUser,
  getJobById,
  mockInterviews,
  type Question,
} from "@/lib/mock-data";
import { getStorage } from "@/lib/storage/storage-factory";
import { generateStringHash } from "@/lib/utils/hash-utils";

interface InterviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  const demoUser = getDemoUser();
  const storage = getStorage();

  // Try to get interview from mock data first
  let interview = mockInterviews[id];
  let job = interview ? getJobById(interview.jobId) : null;
  let generatedQuestions: Question[] = [];
  let jobId: string | null = null;

  // If not found, try to parse as application ID (format: application-{jobId}-{userId})
  if (!interview && id.startsWith("application-")) {
    // Format: application-job-5-demo-user -> jobId = job-5
    const jobIdMatch = id.match(/^application-(job-\d+)-/);
    if (jobIdMatch) {
      jobId = jobIdMatch[1];
      job = await storage.getJob(jobId);

      if (job) {
        // Create a synthetic interview object
        interview = {
          id,
          jobId,
          candidateId: demoUser.id,
          status: "PENDING" as const,
          durationMinutes: 30,
          createdAt: new Date(),
        };
      }
    }
  } else if (interview) {
    jobId = interview.jobId;
  }

  if (!interview || !job) {
    notFound();
  }

  // Try to load generated questions from storage
  if (jobId) {
    const userCvId = await storage.getUserCVId(demoUser.id);
    if (userCvId) {
      const combinedHash = generateStringHash(userCvId + jobId);
      const questionSet = await storage.getInterviewQuestions(combinedHash);

      if (questionSet && questionSet.suggestedQuestions.length > 0) {
        // Convert suggested questions to Question format
        generatedQuestions = questionSet.suggestedQuestions.map((q, index) => ({
          id: `gen-q-${index}`,
          text: q.content,
          type: "video" as const,
          duration: 3, // 3 minutes per question
          category: mapCategoryToStage(q.category),
          keyPoints: [q.reason],
        }));
      }
    }
  }

  // Use generated questions if available, otherwise fall back to job's default questions
  const questions =
    generatedQuestions.length > 0 ? generatedQuestions : job.questions;

  // Calculate duration: ~3 minutes per question, minimum 15 minutes
  const calculatedDuration = Math.max(15, Math.ceil(questions.length * 3));

  return (
    <StreamVideoProvider userId={demoUser.id} userName={demoUser.name}>
      <InterviewRoom
        interviewId={id}
        candidateId={demoUser.id}
        candidateName={demoUser.name}
        jobTitle={job.title}
        company={job.company}
        durationMinutes={calculatedDuration}
        questions={questions}
      />
    </StreamVideoProvider>
  );
}

// Helper to map question category to interview stage
function mapCategoryToStage(category?: string): Question["category"] {
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
