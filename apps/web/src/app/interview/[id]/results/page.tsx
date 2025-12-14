/**
 * Interview Results Page
 * Shows candidate's interview performance and feedback
 * Supports both mock interview IDs and application IDs
 */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import {
  getDemoUser,
  mockInterviews,
} from "@/lib/mock-data";
import type { Interview, Job } from "@/lib/storage/storage-interface";
import { getStorage } from "@/lib/storage/storage-factory";
import { mockInterviewToInterview } from "@/lib/utils/type-adapters";
import { InterviewStatus } from "@sync-hire/database";
import ResultsContent from "./ResultsContent";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const storage = getStorage();
  const demoUser = getDemoUser();

  // Try to get interview from file storage first (real completed interviews)
  let interview: Interview | null = await storage.getInterview(id);
  let job: Job | null = interview ? await storage.getJob(interview.jobId) : null;

  // If not found in storage, try mock data and convert to database type
  if (!interview) {
    const mockInterview = mockInterviews[id];
    if (mockInterview) {
      interview = mockInterviewToInterview(mockInterview);
      job = await storage.getJob(interview.jobId);
    }
  }

  // If still not found, try to parse as application ID (format: application-{jobId}-{userId})
  if (!interview && id.startsWith("application-")) {
    const jobIdMatch = id.match(/^application-(job-\d+)-/);
    if (jobIdMatch) {
      const jobId = jobIdMatch[1];
      job = await storage.getJob(jobId);

      if (job) {
        // Create a synthetic completed interview object for results
        interview = {
          id,
          jobId,
          candidateId: demoUser.id,
          status: InterviewStatus.COMPLETED,
          callId: null,
          transcript: null,
          score: 87,
          durationMinutes: 30,
          aiEvaluation: null,
          createdAt: new Date(),
          completedAt: new Date(),
        };
      }
    }
  }

  if (!interview || !job) {
    notFound();
  }

  // For non-completed interviews, redirect (unless it's a synthetic one)
  if (interview.status !== InterviewStatus.COMPLETED && !id.startsWith("application-")) {
    notFound();
  }

  const companyLogo = getCompanyLogoUrl(job.company);

  return (
    <div className="min-h-screen bg-background overflow-y-auto">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)] pointer-events-none opacity-50" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 py-12 pb-24">
        {/* Back Button */}
        <Link
          href="/candidate/history"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          To Interview History
        </Link>

        {/* Client component handles the rest with polling */}
        <ResultsContent
          interview={interview}
          job={job}
          companyLogo={companyLogo}
        />
      </div>
    </div>
  );
}
