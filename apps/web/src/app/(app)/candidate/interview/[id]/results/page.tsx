/**
 * Interview Results Page
 * Shows candidate's interview performance and feedback
 * Supports both interview IDs and application IDs
 * URL: /candidate/interview/[id]/results
 */

import { notFound, redirect } from "next/navigation";
import { getCompanyLogoUrl } from "@/lib/logo-utils";
import type { Interview, Job } from "@/lib/storage/storage-interface";
import { getStorage } from "@/lib/storage/storage-factory";
import { InterviewStatus } from "@sync-hire/database";
import { getServerSession } from "@/lib/auth-server";
import ResultsContent from "./ResultsContent";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ResultsPage({ params }: ResultsPageProps) {
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

  // If not found, try to parse as application ID (format: application-{jobId}-{userId})
  if (!interview && id.startsWith("application-")) {
    // Format: application-job-{timestamp}-{random}-{userId} -> jobId = job-{timestamp}-{random}
    const jobIdMatch = id.match(/^application-(job-\d+-[a-z0-9]+)-/);
    if (jobIdMatch) {
      const jobId = jobIdMatch[1];
      job = await storage.getJob(jobId);

      if (job) {
        // Create a synthetic completed interview object for results
        interview = {
          id,
          jobId,
          candidateId: user.id,
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

  const companyLogo = getCompanyLogoUrl(job.organization.name);

  return (
    <>
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)] pointer-events-none opacity-50 -z-10" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-green-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto pb-16">
        <ResultsContent
          interview={interview}
          job={job}
          companyLogo={companyLogo}
        />
      </div>
    </>
  );
}
