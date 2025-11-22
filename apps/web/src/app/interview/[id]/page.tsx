/**
 * Interview Room Page
 * Dynamic route for interview sessions: /interview/[id]
 */
import { StreamVideoProvider } from '@/components/StreamVideoProvider';
import { InterviewRoom } from '@/components/InterviewRoom';
import { mockInterviews, getDemoUser, getJobById } from '@/lib/mock-data';
import { notFound } from 'next/navigation';

interface InterviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params;

  // Get interview from mock data
  const interview = mockInterviews[id];

  if (!interview) {
    notFound();
  }

  // Use demo user for all interviews
  const demoUser = getDemoUser();

  // Get job details for the interview
  const job = getJobById(interview.jobId);

  if (!job) {
    notFound();
  }

  return (
    <StreamVideoProvider userId={demoUser.id} userName={demoUser.name}>
      <InterviewRoom
        interviewId={id}
        candidateId={demoUser.id}
        candidateName={demoUser.name}
        jobTitle={job.title}
        company={job.company}
        durationMinutes={interview.durationMinutes}
        questions={job.questions}
      />
    </StreamVideoProvider>
  );
}
