/**
 * Interview Room Page
 * Dynamic route for interview sessions: /interview/[id]
 */
import { StreamVideoProvider } from '@/components/StreamVideoProvider';
import { InterviewRoom } from '@/components/InterviewRoom';
import { mockInterviews, mockUsers, getJobById } from '@/lib/mock-data';
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

  const candidate = mockUsers[interview.candidateId];

  if (!candidate) {
    notFound();
  }

  // Get job details for the interview
  const job = getJobById(interview.jobId);

  return (
    <StreamVideoProvider userId={candidate.id} userName={candidate.name}>
      <InterviewRoom
        callId={`interview-${id}`}
        interviewId={id}
        candidateId={candidate.id}
        candidateName={candidate.name}
        jobTitle={job?.title}
      />
    </StreamVideoProvider>
  );
}
