/**
 * Interview Room Page
 * Dynamic route for interview sessions: /interview/[id]
 * Supports both interview IDs and application IDs
 */

import { notFound, redirect } from "next/navigation";
import { InterviewRoom } from "@/components/InterviewRoom";
import { StreamVideoProvider } from "@/components/StreamVideoProvider";
import type { Question } from "@/lib/types/interview-types";
import type { Job, Interview } from "@/lib/storage/storage-interface";
import { getStorage } from "@/lib/storage/storage-factory";
import { mergeInterviewQuestions } from "@/lib/utils/question-utils";
import { getServerSession } from "@/lib/auth-server";

interface InterviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;
  const session = await getServerSession();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;
  const storage = getStorage();

  // Try to get interview from database
  let interview: Interview | null = await storage.getInterview(id);
  let job: Job | null = interview ? await storage.getJob(interview.jobId) : null;
  let generatedQuestions: Question[] = [];
  let jobId: string | null = interview?.jobId ?? null;

  // If not found as interview, try as application ID
  if (!interview) {
    const application = await storage.getApplication(id);
    if (application) {
      jobId = application.jobId;
      job = await storage.getJob(jobId);

      if (job) {
        interview = {
          id,
          jobId,
          candidateId: application.userId,
          status: "PENDING" as const,
          durationMinutes: 30,
          createdAt: new Date(),
          completedAt: null,
          callId: null,
          transcript: null,
          score: null,
          aiEvaluation: null,
        };
      }
    }
  }

  if (!interview || !job) {
    notFound();
  }

  // Try to load generated questions from storage
  if (jobId) {
    const userCvId = await storage.getUserCVId(user.id);
    if (userCvId) {
      const questionSet = await storage.getInterviewQuestions(userCvId, jobId);

      if (questionSet) {
        // Use utility to merge custom questions (from JD) and AI-personalized questions
        generatedQuestions = mergeInterviewQuestions(questionSet);
      }
    }
  }

  // Use generated questions if available, otherwise map job's questions to Question format
  let questions: Question[] = generatedQuestions;
  if (questions.length === 0 && job.questions) {
    console.warn(`[interview-page] No personalized questions found for interviewId: ${id}, falling back to ${job.questions.length} job default questions`);
    // Map database JobQuestion to Question format
    questions = job.questions.map((q) => ({
      id: q.id,
      text: q.content,
      type: "video" as const,
      duration: q.duration,
      category: (q.category ?? "Technical Skills") as Question["category"],
    }));
  }

  // Calculate duration: ~3 minutes per question, minimum 15 minutes
  const calculatedDuration = Math.max(15, Math.ceil(questions.length * 3));

  return (
    <StreamVideoProvider userId={user.id} userName={user.name}>
      <InterviewRoom
        interviewId={id}
        candidateId={user.id}
        candidateName={user.name}
        jobTitle={job.title}
        company={job.organization.name}
        durationMinutes={calculatedDuration}
        questions={questions}
      />
    </StreamVideoProvider>
  );
}
